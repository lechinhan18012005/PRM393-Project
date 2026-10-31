package com.prm393.floodrescue.features.rescue;

import com.prm393.floodrescue.common.exception.BadRequestException;
import com.prm393.floodrescue.features.auth.entity.Role;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.garage.entity.*;
import com.prm393.floodrescue.features.garage.repository.GarageBranchRepository;
import com.prm393.floodrescue.features.garage.repository.GarageRepository;
import com.prm393.floodrescue.features.garage.repository.ServiceItemRepository;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStaff;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStatus;
import com.prm393.floodrescue.features.mechanic.repository.MechanicStaffRepository;
import com.prm393.floodrescue.features.rescue.dto.*;
import com.prm393.floodrescue.features.rescue.entity.*;
import com.prm393.floodrescue.features.rescue.repository.RescueOfferRepository;
import com.prm393.floodrescue.features.rescue.repository.RescueOrderAuditRepository;
import com.prm393.floodrescue.features.rescue.repository.RescueOrderEvidenceRepository;
import com.prm393.floodrescue.features.rescue.repository.RescueOrderRepository;
import com.prm393.floodrescue.features.rescue.service.MechanicEligibilityChecker;
import com.prm393.floodrescue.features.rescue.service.RescueDispatchService;
import com.prm393.floodrescue.features.rescue.service.RescueExecutionService;
import com.prm393.floodrescue.features.rescue.service.MechanicAssignmentLifecycleService;
import com.prm393.floodrescue.features.rescue.service.RescuePricingService;
import com.prm393.floodrescue.features.rescue.service.RescueTrackingService;
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
class RescueSingleCrossingWorkflowTest {

    @Mock private RescueOrderRepository rescueOrderRepository;
    @Mock private RescueOfferRepository rescueOfferRepository;
    @Mock private RescueOrderAuditRepository auditRepository;
    @Mock private MechanicStaffRepository mechanicRepository;
    @Mock private GarageRepository garageRepository;
    @Mock private GarageBranchRepository branchRepository;
    @Mock private ServiceItemRepository serviceItemRepository;
    @Mock private VehicleLookupService vehicleLookupService;
    @Mock private SimpMessagingTemplate messagingTemplate;
    @Mock private com.prm393.floodrescue.features.auth.repository.UserRepository userRepository;
    @Mock private RescueOrderEvidenceRepository evidenceRepository;
    @Mock private com.prm393.floodrescue.common.service.CloudinaryService cloudinaryService;

    private MechanicEligibilityChecker eligibilityChecker;
    private RescuePricingService pricingService;
    private RescueDispatchService dispatchService;
    private MechanicAssignmentLifecycleService mechanicLifecycle;
    private RescueTrackingService trackingService;
    private RescueExecutionService executionService;

    private User sampleCustomer;
    private User sampleMechanicUser;
    private Garage sampleGarage;
    private GarageBranch sampleBranch;
    private ServiceItem sampleCrossingService;
    private MechanicStaff sampleMechanic;

    @BeforeEach
    void setUp() {
        eligibilityChecker = new MechanicEligibilityChecker(rescueOrderRepository);
        pricingService = new RescuePricingService(garageRepository, branchRepository, serviceItemRepository, mechanicRepository, eligibilityChecker);
        ReflectionTestUtils.setField(pricingService, "configuredBookingFee", 30000L);
        ReflectionTestUtils.setField(pricingService, "configuredHotline", "1900-6868");
        ReflectionTestUtils.setField(pricingService, "heartbeatValidMinutes", 5);

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

        trackingService = new RescueTrackingService(rescueOrderRepository, mechanicRepository, messagingTemplate);

        mechanicLifecycle = new MechanicAssignmentLifecycleService(rescueOrderRepository, mechanicRepository);
        ReflectionTestUtils.setField(mechanicLifecycle, "heartbeatValidMinutes", 5);
        executionService = new RescueExecutionService(rescueOrderRepository, mechanicRepository, evidenceRepository,
                cloudinaryService, dispatchService, mechanicLifecycle);
        ReflectionTestUtils.setField(executionService, "arrivalThresholdMeters", 30.0);

        sampleCustomer = User.builder().id(10L).username("customer_hoang").role(Role.CUSTOMER).fullName("Hoàng Khách").active(true).build();
        sampleMechanicUser = User.builder().id(20L).username("mechanic_tuan").role(Role.FIELD_MECHANIC).fullName("Tuấn Thợ").active(true).build();
        lenient().when(userRepository.findByIdWithLock(anyLong())).thenReturn(Optional.of(sampleCustomer));

        sampleGarage = Garage.builder().id(1L).garageName("Gara Sài Gòn Rescue").status(GarageStatus.APPROVED).build();
        sampleBranch = GarageBranch.builder().id(101L).garage(sampleGarage).branchName("Chi nhánh Q7").operatingStatus(BranchStatus.OPEN).latitude(10.7400).longitude(106.7100).build();

        sampleCrossingService = ServiceItem.builder()
                .id(501L)
                .garage(sampleGarage)
                .serviceName("Chở xe qua ngập (Chuyến riêng)")
                .serviceType(ServiceType.CROSSING)
                .standardPrice(new BigDecimal("120000"))
                .active(true)
                .build();

        sampleMechanic = MechanicStaff.builder()
                .id(301L)
                .user(sampleMechanicUser)
                .garage(sampleGarage)
                .branch(sampleBranch)
                .workingStatus(MechanicStatus.AVAILABLE)
                .hasCrossingCapability(true)
                .currentLatitude(10.7410)
                .currentLongitude(106.7110)
                .lastHeartbeatAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("Giá dịch vụ snapshot = serviceBasePrice + bookingFee đúng chuẩn BigDecimal")
    void pricingService_Calculation() {
        BigDecimal total = pricingService.calculateTotalAmount(new BigDecimal("120000"));
        assertEquals(new BigDecimal("150000"), total);
        assertEquals(new BigDecimal("30000"), pricingService.getBookingFee());
        assertEquals("1900-6868", pricingService.getHotline());
    }

    @Test
    @DisplayName("Tạo đơn: Chặn khi khách đang có đơn cứu hộ active")
    void createOrder_BlockedWhenActiveOrderExists() {
        when(rescueOrderRepository.existsByCustomerIdAndStatusIn(eq(10L), anyList())).thenReturn(true);

        CreateRescueOrderRequest req = CreateRescueOrderRequest.builder()
                .garageId(1L).serviceItemId(501L).vehicleId(1L)
                .pickupAddress("Huỳnh Tấn Phát").pickupLatitude(10.74).pickupLongitude(106.71)
                .dropoffAddress("Nguyễn Văn Linh").dropoffLatitude(10.75).dropoffLongitude(106.72)
                .build();

        assertThrows(BadRequestException.class, () -> dispatchService.createSingleCrossingOrder(sampleCustomer, req));
    }

    @Test
    @DisplayName("Đơn gom chưa tham gia chuyến tự hết hạn sau 10 phút")
    void staleUnjoinedBatchOrderIsClosedWhenCustomerRefreshes() {
        RescueOrder staleOrder = RescueOrder.builder()
                .id(1001L)
                .orderCode("SOS-BATCH-OLD")
                .customer(sampleCustomer)
                .garage(sampleGarage)
                .serviceItem(sampleCrossingService)
                .orderType(OrderType.BATCH_CROSSING)
                .status(RescueOrderStatus.REQUESTED)
                .requestedAt(LocalDateTime.now().minusMinutes(11))
                .transportStage(TransportStage.NONE)
                .build();
        when(rescueOrderRepository.findFirstByCustomerIdAndStatusInOrderByCreatedAtDesc(
                eq(10L), anyList())).thenReturn(Optional.of(staleOrder));
        when(rescueOrderRepository.save(staleOrder)).thenReturn(staleOrder);

        var active = dispatchService.getActiveOrderByUser(sampleCustomer);

        assertNull(active);
        assertEquals(RescueOrderStatus.CANCELLED, staleOrder.getStatus());
        assertEquals("Hết thời gian chờ tham gia chuyến gom", staleOrder.getCancelReason());
        verify(auditRepository).save(any(RescueOrderAudit.class));
    }

    @Test
    @DisplayName("Tạo đơn: Chặn khi xe không thuộc quyền sở hữu của khách")
    void createOrder_BlockedWhenVehicleNotOwned() {
        when(rescueOrderRepository.existsByCustomerIdAndStatusIn(eq(10L), anyList())).thenReturn(false);
        when(vehicleLookupService.getVehicleByIdAndCustomer(eq(999L), eq(10L))).thenReturn(Optional.empty());

        CreateRescueOrderRequest req = CreateRescueOrderRequest.builder()
                .garageId(1L).serviceItemId(501L).vehicleId(999L)
                .pickupAddress("Huỳnh Tấn Phát").pickupLatitude(10.74).pickupLongitude(106.71)
                .dropoffAddress("Nguyễn Văn Linh").dropoffLatitude(10.75).dropoffLongitude(106.72)
                .build();

        assertThrows(BadRequestException.class, () -> dispatchService.createSingleCrossingOrder(sampleCustomer, req));
    }

    @Test
    @DisplayName("Tạo đơn thành công: Snapshot giá niêm yết, tạo đơn REQUESTED và offer tuần tự 45s")
    void createOrder_SuccessAndOffersNextCandidate() {
        VehicleDto myVehicle = VehicleDto.builder().id(1L).customerId(10L).licensePlate("59-B1 892.44").brand("Honda").model("SH 150i").vehicleType("SCOOTER").build();
        when(rescueOrderRepository.existsByCustomerIdAndStatusIn(eq(10L), anyList())).thenReturn(false);
        when(vehicleLookupService.getVehicleByIdAndCustomer(1L, 10L)).thenReturn(Optional.of(myVehicle));
        when(garageRepository.findById(1L)).thenReturn(Optional.of(sampleGarage));
        when(serviceItemRepository.findById(501L)).thenReturn(Optional.of(sampleCrossingService));
        when(rescueOrderRepository.save(any(RescueOrder.class))).thenAnswer(i -> {
            RescueOrder o = i.getArgument(0);
            o.setId(1001L);
            return o;
        });

        when(rescueOfferRepository.findByRescueOrderIdOrderByCreatedAtAsc(1001L)).thenReturn(List.of());
        when(mechanicRepository.findByGarageIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(sampleMechanic));
        when(rescueOfferRepository.save(any(RescueOffer.class))).thenAnswer(i -> {
            RescueOffer off = i.getArgument(0);
            off.setId(5001L);
            return off;
        });

        CreateRescueOrderRequest req = CreateRescueOrderRequest.builder()
                .garageId(1L).serviceItemId(501L).vehicleId(1L)
                .pickupAddress("Huỳnh Tấn Phát, Q7").pickupLatitude(10.7410).pickupLongitude(106.7110)
                .dropoffAddress("Nguyễn Thị Thập, Q7").dropoffLatitude(10.7450).dropoffLongitude(106.7150)
                .build();

        RescueOrderResponse response = dispatchService.createSingleCrossingOrder(sampleCustomer, req);

        assertNotNull(response);
        assertEquals(RescueOrderStatus.REQUESTED, response.getStatus());
        assertEquals(new BigDecimal("120000"), response.getServiceBasePrice());
        assertEquals(new BigDecimal("30000"), response.getBookingFee());
        assertEquals(new BigDecimal("150000"), response.getTotalAmount());
        assertEquals("59-B1 892.44", response.getVehiclePlate());
    }

    @Test
    @DisplayName("Luồng 4: Tạo trực tiếp đơn sửa tại chỗ và điều phối thợ không cần năng lực chở xe")
    void createOnsiteRepairOrder_Success() {
        VehicleDto myVehicle = VehicleDto.builder().id(1L).customerId(10L).licensePlate("59-B1 892.44")
                .brand("Honda").model("SH 150i").vehicleType("SCOOTER").build();
        ServiceItem onsiteService = ServiceItem.builder()
                .id(502L).garage(sampleGarage).serviceName("Sửa xe tại chỗ")
                .serviceType(ServiceType.REPAIR_ONSITE).standardPrice(new BigDecimal("80000"))
                .active(true).build();
        sampleMechanic.setHasCrossingCapability(false);

        when(rescueOrderRepository.existsByCustomerIdAndStatusIn(eq(10L), anyList())).thenReturn(false);
        when(vehicleLookupService.getVehicleByIdAndCustomer(1L, 10L)).thenReturn(Optional.of(myVehicle));
        when(garageRepository.findById(1L)).thenReturn(Optional.of(sampleGarage));
        when(serviceItemRepository.findById(502L)).thenReturn(Optional.of(onsiteService));
        when(rescueOrderRepository.save(any(RescueOrder.class))).thenAnswer(i -> {
            RescueOrder order = i.getArgument(0);
            order.setId(1002L);
            return order;
        });
        when(rescueOfferRepository.findByRescueOrderIdOrderByCreatedAtAsc(1002L)).thenReturn(List.of());
        when(mechanicRepository.findByGarageIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(sampleMechanic));
        when(rescueOfferRepository.save(any(RescueOffer.class))).thenAnswer(i -> i.getArgument(0));

        CreateRescueOrderRequest request = CreateRescueOrderRequest.builder()
                .orderType(OrderType.ONSITE_REPAIR)
                .garageId(1L).serviceItemId(502L).vehicleId(1L)
                .pickupAddress("Huỳnh Tấn Phát, Q7").pickupLatitude(10.7410).pickupLongitude(106.7110)
                .dropoffAddress("Huỳnh Tấn Phát, Q7").dropoffLatitude(10.7410).dropoffLongitude(106.7110)
                .build();

        RescueOrderResponse response = dispatchService.createSingleCrossingOrder(sampleCustomer, request);

        assertEquals(OrderType.ONSITE_REPAIR, response.getOrderType());
        assertEquals(new BigDecimal("110000"), response.getTotalAmount());
        verify(rescueOfferRepository).save(any(RescueOffer.class));
    }

    @Test
    @DisplayName("Thợ nhận đơn: Chuyển đơn sang DISPATCHED và thợ sang BUSY trong cùng giao dịch")
    void acceptOffer_Success() {
        RescueOrder order = RescueOrder.builder()
                .id(1001L).orderCode("SOS-261022-8924").customer(sampleCustomer).garage(sampleGarage)
                .serviceItem(sampleCrossingService).status(RescueOrderStatus.REQUESTED)
                .serviceBasePrice(new BigDecimal("120000")).bookingFee(new BigDecimal("30000")).totalAmount(new BigDecimal("150000"))
                .vehiclePlate("59-B1 892.44").pickupAddress("A").pickupLatitude(10.74).pickupLongitude(106.71)
                .dropoffAddress("B").dropoffLatitude(10.75).dropoffLongitude(106.72)
                .build();

        RescueOffer offer = RescueOffer.builder()
                .id(5001L).rescueOrder(order).mechanicStaff(sampleMechanic).status(RescueOfferStatus.PENDING)
                .offeredAt(LocalDateTime.now()).expiresAt(LocalDateTime.now().plusSeconds(40))
                .build();

        when(mechanicRepository.findByUserIdWithLock(20L)).thenReturn(Optional.of(sampleMechanic));
        when(rescueOfferRepository.findByIdWithLock(5001L)).thenReturn(Optional.of(offer));
        when(rescueOrderRepository.findByIdWithLock(1001L)).thenReturn(Optional.of(order));
        when(rescueOrderRepository.findByIdWithLock(1001L)).thenReturn(Optional.of(order));
        when(rescueOrderRepository.existsByMechanicStaffIdAndStatusIn(eq(301L), anyList())).thenReturn(false);
        when(rescueOrderRepository.save(any(RescueOrder.class))).thenAnswer(i -> i.getArgument(0));

        RescueOrderResponse response = dispatchService.acceptOffer(sampleMechanicUser, 5001L);

        assertEquals(RescueOrderStatus.DISPATCHED, response.getStatus());
        assertEquals(RescueOfferStatus.ACCEPTED, offer.getStatus());
        assertEquals(MechanicStatus.BUSY, sampleMechanic.getWorkingStatus());
    }

    @Test
    @DisplayName("Thợ nhận đơn: Chặn khi offer đã hết hạn (quá 45s)")
    void acceptOffer_ExpiredBlocked() {
        RescueOrder order = RescueOrder.builder().id(1001L).status(RescueOrderStatus.REQUESTED).build();
        RescueOffer offer = RescueOffer.builder()
                .id(5001L).rescueOrder(order).mechanicStaff(sampleMechanic).status(RescueOfferStatus.PENDING)
                .offeredAt(LocalDateTime.now().minusSeconds(50))
                .expiresAt(LocalDateTime.now().minusSeconds(5)) // Đã hết hạn
                .build();

        when(mechanicRepository.findByUserIdWithLock(20L)).thenReturn(Optional.of(sampleMechanic));
        when(rescueOfferRepository.findByIdWithLock(5001L)).thenReturn(Optional.of(offer));
        when(rescueOrderRepository.findByIdWithLock(1001L)).thenReturn(Optional.of(order));

        assertThrows(BadRequestException.class, () -> dispatchService.acceptOffer(sampleMechanicUser, 5001L));
        assertEquals(RescueOfferStatus.EXPIRED, offer.getStatus());
    }

    @Test
    @DisplayName("Hủy đơn: Khách được hủy khi REQUESTED; chặn khi thợ đã nhận (DISPATCHED)")
    void cancelOrder_Rules() {
        RescueOrder requestedOrder = RescueOrder.builder()
                .id(1001L).orderCode("SOS-1001").customer(sampleCustomer).garage(sampleGarage)
                .serviceItem(sampleCrossingService).status(RescueOrderStatus.REQUESTED)
                .serviceBasePrice(new BigDecimal("120000")).bookingFee(new BigDecimal("30000")).totalAmount(new BigDecimal("150000"))
                .vehiclePlate("59-B1 892.44").pickupAddress("A").pickupLatitude(10.74).pickupLongitude(106.71)
                .dropoffAddress("B").dropoffLatitude(10.75).dropoffLongitude(106.72)
                .build();

        when(rescueOrderRepository.findByIdWithLock(1001L)).thenReturn(Optional.of(requestedOrder));
        when(rescueOrderRepository.save(any(RescueOrder.class))).thenAnswer(i -> i.getArgument(0));

        RescueOrderResponse cancelRes = dispatchService.cancelOrder(sampleCustomer, 1001L, new CancelOrderRequest("Đổi ý"));
        assertEquals(RescueOrderStatus.CANCELLED, cancelRes.getStatus());

        // Kiểm tra khi đã DISPATCHED
        RescueOrder dispatchedOrder = RescueOrder.builder()
                .id(1002L).customer(sampleCustomer).status(RescueOrderStatus.DISPATCHED).build();
        when(rescueOrderRepository.findByIdWithLock(1002L)).thenReturn(Optional.of(dispatchedOrder));

        assertThrows(BadRequestException.class, () -> dispatchService.cancelOrder(sampleCustomer, 1002L, null));
    }

    @Test
    @DisplayName("Xác nhận đến nơi: Khoảng cách > 30m bị từ chối; khoảng cách <= 30m chấp nhận")
    void confirmArrival_DistanceCheck() {
        RescueOrder order = RescueOrder.builder()
                .id(1001L).orderCode("SOS-1001").customer(sampleCustomer).mechanicStaff(sampleMechanic)
                .garage(sampleGarage).serviceItem(sampleCrossingService).status(RescueOrderStatus.DISPATCHED)
                .serviceBasePrice(new BigDecimal("120000")).bookingFee(new BigDecimal("30000")).totalAmount(new BigDecimal("150000"))
                .vehiclePlate("59-B1 892.44")
                .pickupAddress("Điểm đón").pickupLatitude(10.74000).pickupLongitude(106.71000)
                .dropoffAddress("Điểm trả").dropoffLatitude(10.75000).dropoffLongitude(106.72000)
                .build();

        when(rescueOrderRepository.findByIdWithLock(1001L)).thenReturn(Optional.of(order));

        // Cách ~500 mét -> Bị từ chối
        ConfirmArrivalRequest farReq = new ConfirmArrivalRequest(10.74500, 106.71000);
        assertThrows(BadRequestException.class, () -> executionService.confirmArrival(sampleMechanicUser, 1001L, farReq));

        // Cách ~15 mét -> Thành công chuyển sang ARRIVED
        when(rescueOrderRepository.save(any(RescueOrder.class))).thenAnswer(i -> i.getArgument(0));
        ConfirmArrivalRequest closeReq = new ConfirmArrivalRequest(10.74010, 106.71005);
        RescueOrderResponse res = executionService.confirmArrival(sampleMechanicUser, 1001L, closeReq);

        assertEquals(RescueOrderStatus.ARRIVED, res.getStatus());
        assertNotNull(order.getArrivedAt());
    }

    @Test
    @DisplayName("Nghiệm thu hoàn tất: Bắt buộc có ảnh thật; chuyển PAYMENT_PENDING và giải phóng thợ")
    void completeOrder_RequiresPhotoAndReleasesMechanic() {
        RescueOrder order = RescueOrder.builder()
                .id(1001L).orderCode("SOS-1001").customer(sampleCustomer).mechanicStaff(sampleMechanic)
                .garage(sampleGarage).serviceItem(sampleCrossingService).status(RescueOrderStatus.IN_PROGRESS)
                .transportStage(TransportStage.HANDED_OVER)
                .serviceBasePrice(new BigDecimal("120000")).bookingFee(new BigDecimal("30000")).totalAmount(new BigDecimal("150000"))
                .vehiclePlate("59-B1 892.44").pickupAddress("A").pickupLatitude(10.74).pickupLongitude(106.71)
                .dropoffAddress("B").dropoffLatitude(10.75).dropoffLongitude(106.72)
                .build();

        sampleMechanic.setWorkingStatus(MechanicStatus.BUSY);
        when(rescueOrderRepository.findByIdWithLock(1001L)).thenReturn(Optional.of(order));

        // Thiếu ảnh nghiệm thu -> Báo lỗi
        CompleteOrderRequest missingPhotoReq = new CompleteOrderRequest("", null, "Hoàn tất");
        assertThrows(BadRequestException.class, () -> executionService.completeOrder(sampleMechanicUser, 1001L, missingPhotoReq));

        // Ảnh nghiệm thu chưa upload lên hệ thống cho đơn này -> Báo lỗi
        CompleteOrderRequest unverifiedPhotoReq = new CompleteOrderRequest("https://example.com/unverified.jpg", null, "Chưa upload");
        when(evidenceRepository.existsByRescueOrderIdAndUploadedByIdAndFileUrl(1001L, 20L, "https://example.com/unverified.jpg")).thenReturn(false);
        assertThrows(BadRequestException.class, () -> executionService.completeOrder(sampleMechanicUser, 1001L, unverifiedPhotoReq));

        // Có ảnh nghiệm thu thật đã upload chính thức -> Chuyển sang PAYMENT_PENDING và giải phóng thợ về AVAILABLE
        when(rescueOrderRepository.save(any(RescueOrder.class))).thenAnswer(i -> i.getArgument(0));
        when(evidenceRepository.existsByRescueOrderIdAndUploadedByIdAndFileUrl(1001L, 20L, "https://res.cloudinary.com/demo/completed_handover.jpg")).thenReturn(true);
        CompleteOrderRequest validReq = new CompleteOrderRequest("https://res.cloudinary.com/demo/completed_handover.jpg", null, "Đã giao xe an toàn");
        RescueOrderResponse res = executionService.completeOrder(sampleMechanicUser, 1001L, validReq);

        assertEquals(RescueOrderStatus.PAYMENT_PENDING, res.getStatus());
        assertEquals("https://res.cloudinary.com/demo/completed_handover.jpg", res.getCompletionPhotoUrl());
        assertEquals(MechanicStatus.AVAILABLE, sampleMechanic.getWorkingStatus()); // Giải phóng thợ
        assertNotNull(order.getServiceCompletedAt());

        // Idempotent check: gọi lại complete khi đã PAYMENT_PENDING
        RescueOrderResponse secondCall = executionService.completeOrder(sampleMechanicUser, 1001L, validReq);
        assertEquals(RescueOrderStatus.PAYMENT_PENDING, secondCall.getStatus());
    }

    @Test
    @DisplayName("Tracking: Cảnh báo mất tín hiệu GPS (isStale = true) khi quá 30 giây")
    void tracking_StaleGpsDetection() {
        sampleMechanic.setLastHeartbeatAt(LocalDateTime.now().minusSeconds(45)); // Quá 30s
        RescueOrder order = RescueOrder.builder()
                .id(1001L).customer(sampleCustomer).mechanicStaff(sampleMechanic).status(RescueOrderStatus.DISPATCHED)
                .pickupAddress("A").pickupLatitude(10.74).pickupLongitude(106.71)
                .dropoffAddress("B").dropoffLatitude(10.75).dropoffLongitude(106.72)
                .build();

        when(rescueOrderRepository.findById(1001L)).thenReturn(Optional.of(order));

        TrackingSnapshotDto snapshot = trackingService.getTrackingSnapshot(sampleCustomer, 1001L);

        assertNotNull(snapshot);
        assertTrue(snapshot.isStale());
        assertTrue(snapshot.getStatusMessage().contains("Mất tín hiệu GPS"));
    }
}
