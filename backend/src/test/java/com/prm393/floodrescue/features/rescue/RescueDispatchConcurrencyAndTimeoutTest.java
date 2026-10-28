package com.prm393.floodrescue.features.rescue;

import com.prm393.floodrescue.common.exception.BadRequestException;
import com.prm393.floodrescue.features.auth.entity.Role;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.auth.repository.UserRepository;
import com.prm393.floodrescue.features.garage.entity.BranchStatus;
import com.prm393.floodrescue.features.garage.entity.Garage;
import com.prm393.floodrescue.features.garage.entity.GarageBranch;
import com.prm393.floodrescue.features.garage.entity.GarageStatus;
import com.prm393.floodrescue.features.garage.entity.ServiceItem;
import com.prm393.floodrescue.features.garage.entity.ServiceType;
import com.prm393.floodrescue.features.garage.repository.GarageRepository;
import com.prm393.floodrescue.features.garage.repository.ServiceItemRepository;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStaff;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStatus;
import com.prm393.floodrescue.features.mechanic.repository.MechanicStaffRepository;
import com.prm393.floodrescue.features.rescue.dto.CreateRescueOrderRequest;
import com.prm393.floodrescue.features.rescue.dto.RescueOrderResponse;
import com.prm393.floodrescue.features.rescue.entity.*;
import com.prm393.floodrescue.features.rescue.repository.RescueOfferRepository;
import com.prm393.floodrescue.features.rescue.repository.RescueOrderAuditRepository;
import com.prm393.floodrescue.features.rescue.repository.RescueOrderRepository;
import com.prm393.floodrescue.features.rescue.service.MechanicEligibilityChecker;
import com.prm393.floodrescue.features.rescue.service.RescueDispatchService;
import com.prm393.floodrescue.features.rescue.service.RescuePricingService;
import com.prm393.floodrescue.features.vehicle.dto.VehicleDto;
import com.prm393.floodrescue.features.vehicle.service.VehicleLookupService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RescueDispatchConcurrencyAndTimeoutTest {

    @Mock private RescueOrderRepository rescueOrderRepository;
    @Mock private RescueOfferRepository rescueOfferRepository;
    @Mock private RescueOrderAuditRepository auditRepository;
    @Mock private MechanicStaffRepository mechanicRepository;
    @Mock private GarageRepository garageRepository;
    @Mock private ServiceItemRepository serviceItemRepository;
    @Mock private VehicleLookupService vehicleLookupService;
    @Mock private RescuePricingService pricingService;
    @Mock private SimpMessagingTemplate messagingTemplate;
    @Mock private UserRepository userRepository;

    private MechanicEligibilityChecker eligibilityChecker;
    private RescueDispatchService dispatchService;

    private User customer;
    private Garage garage;
    private GarageBranch branch;
    private ServiceItem serviceItem;

    @BeforeEach
    void setUp() {
        eligibilityChecker = new MechanicEligibilityChecker(rescueOrderRepository);
        dispatchService = new RescueDispatchService(
                rescueOrderRepository, rescueOfferRepository, auditRepository,
                mechanicRepository, garageRepository, serviceItemRepository,
                vehicleLookupService, pricingService, messagingTemplate,
                userRepository, eligibilityChecker
        );
        ReflectionTestUtils.setField(dispatchService, "offerTimeoutSeconds", 45);
        ReflectionTestUtils.setField(dispatchService, "defaultRadiusKm", 5.0);
        ReflectionTestUtils.setField(dispatchService, "maxRadiusKm", 7.0);
        ReflectionTestUtils.setField(dispatchService, "heartbeatValidMinutes", 5);

        customer = User.builder().id(100L).username("khach_hang").fullName("Khách").role(Role.CUSTOMER).active(true).build();
        garage = Garage.builder().id(1L).garageName("Gara Thần Tốc").status(GarageStatus.APPROVED).build();
        branch = GarageBranch.builder().id(10L).garage(garage).operatingStatus(BranchStatus.OPEN).latitude(10.74).longitude(106.71).build();
        serviceItem = ServiceItem.builder().id(20L).garage(garage).serviceType(ServiceType.CROSSING).standardPrice(new BigDecimal("120000")).active(true).build();

        lenient().when(userRepository.findByIdWithLock(customer.getId())).thenReturn(Optional.of(customer));
        lenient().when(garageRepository.findById(1L)).thenReturn(Optional.of(garage));
        lenient().when(serviceItemRepository.findById(20L)).thenReturn(Optional.of(serviceItem));
        lenient().when(pricingService.getBookingFee()).thenReturn(new BigDecimal("30000"));
        lenient().when(vehicleLookupService.getVehicleByIdAndCustomer(eq(99L), eq(customer.getId())))
                .thenReturn(Optional.of(VehicleDto.builder().id(99L).licensePlate("59-A1 12345").brand("Honda").model("Vision").vehicleType("Xe ga").build()));
    }

    @Test
    @DisplayName("B01: Thợ thiếu năng lực (capability=false) hoặc OFFLINE bị loại, không nhận được offer")
    void dispatchCandidate_IneligibleMechanicExcluded() {
        User mechanicUser = User.builder().id(201L).username("tho_kem").role(Role.FIELD_MECHANIC).active(true).build();
        MechanicStaff incapableStaff = MechanicStaff.builder()
                .id(301L).user(mechanicUser).garage(garage).branch(branch)
                .workingStatus(MechanicStatus.AVAILABLE)
                .hasCrossingCapability(false) // Không có khả năng chở xe
                .currentLatitude(10.7410).currentLongitude(106.7110)
                .lastHeartbeatAt(LocalDateTime.now())
                .build();

        RescueOrder order = RescueOrder.builder()
                .id(1L).orderCode("SOS-TEST01").customer(customer).garage(garage)
                .pickupLatitude(10.7400).pickupLongitude(106.7100)
                .status(RescueOrderStatus.REQUESTED)
                .build();

        when(mechanicRepository.findByGarageIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(incapableStaff));
        when(rescueOrderRepository.save(any(RescueOrder.class))).thenAnswer(i -> i.getArgument(0));

        dispatchService.dispatchNextCandidate(order);

        // Vì không có thợ nào đủ điều kiện (capability=false), hệ thống phải chuyển sang DISPATCH_FAILED
        assertEquals(RescueOrderStatus.DISPATCH_FAILED, order.getStatus());
        verify(rescueOfferRepository, never()).save(any(RescueOffer.class));
    }

    @Test
    @DisplayName("B02: Idempotent createSingleCrossingOrder với cùng clientRequestId và payload")
    void createSingleCrossingOrder_IdempotentReplay() {
        CreateRescueOrderRequest req = CreateRescueOrderRequest.builder()
                .garageId(1L).serviceItemId(20L).vehicleId(99L)
                .pickupAddress("A").pickupLatitude(10.74).pickupLongitude(106.71)
                .dropoffAddress("B").dropoffLatitude(10.75).dropoffLongitude(106.72)
                .clientRequestId("REQ-KEY-12345")
                .build();

        // Lần đầu tạo đơn thành công
        String expectedHash = RescueDispatchService.computePayloadHash(req);

        RescueOrder existing = RescueOrder.builder()
                .id(888L).orderCode("SOS-ORIGINAL-888").customer(customer).garage(garage).serviceItem(serviceItem)
                .clientRequestId("REQ-KEY-12345").requestPayloadHash(expectedHash)
                .status(RescueOrderStatus.REQUESTED)
                .pickupAddress("A").pickupLatitude(10.74).pickupLongitude(106.71)
                .dropoffAddress("B").dropoffLatitude(10.75).dropoffLongitude(106.72)
                .serviceBasePrice(new BigDecimal("120000")).bookingFee(new BigDecimal("30000")).totalAmount(new BigDecimal("150000"))
                .vehiclePlate("59-A1 12345")
                .build();

        when(rescueOrderRepository.findByCustomerIdAndClientRequestId(customer.getId(), "REQ-KEY-12345"))
                .thenReturn(Optional.of(existing));

        // Gọi lại lần 2 với cùng key và payload
        RescueOrderResponse response = dispatchService.createSingleCrossingOrder(customer, req);

        assertEquals("SOS-ORIGINAL-888", response.getOrderCode());
        verify(rescueOrderRepository, never()).save(any(RescueOrder.class));
    }

    @Test
    @DisplayName("B03: Worker timeout tự động chuyển EXPIRED và điều phối ứng viên tiếp theo")
    void handleOfferTimeout_ExpiresAndDispatchesNext() {
        RescueOrder order = RescueOrder.builder()
                .id(50L).orderCode("SOS-TIMEOUT-01").customer(customer).garage(garage)
                .pickupLatitude(10.74).pickupLongitude(106.71)
                .status(RescueOrderStatus.REQUESTED)
                .build();

        User mechUser = User.builder().id(202L).username("tho_ngu").role(Role.FIELD_MECHANIC).active(true).build();
        MechanicStaff staff = MechanicStaff.builder()
                .id(302L).user(mechUser).garage(garage).branch(branch)
                .workingStatus(MechanicStatus.AVAILABLE).hasCrossingCapability(true)
                .currentLatitude(10.7410).currentLongitude(106.7110).lastHeartbeatAt(LocalDateTime.now())
                .build();

        RescueOffer expiredOffer = RescueOffer.builder()
                .id(777L).rescueOrder(order).mechanicStaff(staff)
                .status(RescueOfferStatus.PENDING)
                .offeredAt(LocalDateTime.now().minusSeconds(50))
                .expiresAt(LocalDateTime.now().minusSeconds(5)) // Đã quá hạn
                .build();

        when(rescueOfferRepository.findByIdWithLock(777L)).thenReturn(Optional.of(expiredOffer));
        when(rescueOrderRepository.findByIdWithLock(50L)).thenReturn(Optional.of(order));
        when(mechanicRepository.findByGarageIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(staff));
        when(rescueOfferRepository.findByRescueOrderIdOrderByCreatedAtAsc(50L)).thenReturn(List.of(expiredOffer));

        dispatchService.handleOfferTimeout(777L);

        // Offer 777 phải chuyển sang EXPIRED
        assertEquals(RescueOfferStatus.EXPIRED, expiredOffer.getStatus());
        // Vì thợ 302 đã nằm trong danh sách offeredMechanicIds và không còn thợ nào khác -> DISPATCH_FAILED
        assertEquals(RescueOrderStatus.DISPATCH_FAILED, order.getStatus());
    }
}
