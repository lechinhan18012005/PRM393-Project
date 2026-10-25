package com.prm393.floodrescue.features.rescue;

import com.prm393.floodrescue.config.JwtService;
import com.prm393.floodrescue.config.WebSocketAuthInterceptor;
import com.prm393.floodrescue.common.exception.BadRequestException;
import com.prm393.floodrescue.features.auth.entity.*;
import com.prm393.floodrescue.features.auth.repository.UserRepository;
import com.prm393.floodrescue.features.garage.entity.*;
import com.prm393.floodrescue.features.garage.repository.*;
import com.prm393.floodrescue.features.mechanic.entity.*;
import com.prm393.floodrescue.features.mechanic.repository.MechanicStaffRepository;
import com.prm393.floodrescue.features.rescue.dto.*;
import com.prm393.floodrescue.features.rescue.entity.*;
import com.prm393.floodrescue.features.rescue.repository.RescueOrderRepository;
import com.prm393.floodrescue.features.rescue.repository.RescueOfferRepository;
import com.prm393.floodrescue.features.rescue.repository.RescueOrderEvidenceRepository;
import com.prm393.floodrescue.features.rescue.service.RescueDispatchService;
import com.prm393.floodrescue.features.rescue.service.RescueExecutionService;
import com.prm393.floodrescue.features.rescue.service.RescueTrackingService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RescueCodexFollowupVerificationTest {

    @Autowired private UserRepository users;
    @Autowired private GarageRepository garages;
    @Autowired private ServiceItemRepository services;
    @Autowired private MechanicStaffRepository mechanics;
    @Autowired private RescueOrderRepository orders;
    @Autowired private RescueOfferRepository offers;
    @Autowired private RescueOrderEvidenceRepository evidences;
    @Autowired private TransactionTemplate tx;
    @Autowired private RescueExecutionService execution;
    @Autowired private RescueDispatchService dispatch;
    @Autowired private RescueTrackingService tracking;
    @Autowired private WebSocketAuthInterceptor interceptor;

    User user(Role role) {
        String n = "test_" + UUID.randomUUID().toString().substring(0, 8);
        return users.save(User.builder().username(n).email(n + "@example.com").password("unused").fullName(n).active(true).role(role).build());
    }

    record Fixture(User customer, User stranger, User mechanicUser, MechanicStaff mechanicStaff, Long orderId) {}

    Fixture fixture() {
        return tx.execute(s -> {
            User c = user(Role.CUSTOMER);
            User stranger = user(Role.CUSTOMER);
            User owner = user(Role.GARAGE_OWNER);
            User m = user(Role.FIELD_MECHANIC);
            Garage g = garages.save(Garage.builder().owner(owner).garageName("Test Gara").status(GarageStatus.APPROVED).build());
            ServiceItem service = services.save(ServiceItem.builder().garage(g).serviceName("Crossing").serviceType(ServiceType.CROSSING).standardPrice(new BigDecimal("120000")).build());
            MechanicStaff mech = mechanics.save(MechanicStaff.builder().user(m).garage(g).workingStatus(MechanicStatus.BUSY).currentLatitude(10.74).currentLongitude(106.72).build());
            RescueOrder order = orders.save(RescueOrder.builder()
                    .orderCode(UUID.randomUUID().toString())
                    .customer(c)
                    .garage(g)
                    .serviceItem(service)
                    .mechanicStaff(mech)
                    .status(RescueOrderStatus.ARRIVED)
                    .vehiclePlate("VERIFY-PLATE")
                    .pickupAddress("Pickup Point")
                    .pickupLatitude(10.74005)
                    .pickupLongitude(106.72005)
                    .dropoffAddress("Dropoff Safe Point")
                    .dropoffLatitude(10.80)
                    .dropoffLongitude(106.80)
                    .serviceBasePrice(new BigDecimal("120000"))
                    .bookingFee(new BigDecimal("30000"))
                    .totalAmount(new BigDecimal("150000"))
                    .build());
            return new Fixture(c, stranger, m, mech, order.getId());
        });
    }

    @Test
    @DisplayName("Fix 3: Arbitrary unuploaded HTTPS URL is rejected; registered evidence is accepted")
    void arbitraryHttpsPhotoIsRejected() {
        Fixture f = fixture();
        tx.executeWithoutResult(s -> {
            var o = orders.findById(f.orderId()).orElseThrow();
            o.setStatus(RescueOrderStatus.IN_PROGRESS);
            o.setTransportStage(TransportStage.HANDED_OVER);
            orders.save(o);
        });

        // 1. Arbitrary URL -> Bị chặn
        assertThrows(BadRequestException.class, () ->
                execution.completeOrder(f.mechanicUser(), f.orderId(),
                        CompleteOrderRequest.builder().completionPhotoUrl("https://example.com/this-was-never-uploaded.jpg").build()));

        // 2. Uploaded evidence for this order -> Hợp lệ và chuyển PAYMENT_PENDING
        tx.executeWithoutResult(s -> {
            var o = orders.findById(f.orderId()).orElseThrow();
            evidences.save(RescueOrderEvidence.builder()
                    .rescueOrder(o)
                    .uploadedBy(f.mechanicUser())
                    .fileUrl("https://res.cloudinary.com/floodrescue/evidence_test_123.jpg")
                    .evidenceType("COMPLETION")
                    .build());
        });

        var r = execution.completeOrder(f.mechanicUser(), f.orderId(),
                CompleteOrderRequest.builder().completionPhotoUrl("https://res.cloudinary.com/floodrescue/evidence_test_123.jpg").build());
        assertEquals(RescueOrderStatus.PAYMENT_PENDING, r.getStatus());
    }

    @Test
    @DisplayName("Fix 4: Completed order does NOT expose new mechanic coordinates")
    void completedOrderDoesNotExposeNewCoordinates() {
        Fixture f = fixture();
        tx.executeWithoutResult(s -> {
            var o = orders.findById(f.orderId()).orElseThrow();
            o.setStatus(RescueOrderStatus.PAYMENT_PENDING);
            o.setFinalMechanicLatitude(10.80);
            o.setFinalMechanicLongitude(106.80);
            orders.save(o);

            // Thợ di chuyển sang vị trí hoàn toàn mới (ví dụ ca mới ở Hà Nội)
            var m = o.getMechanicStaff();
            m.setCurrentLatitude(21.123);
            m.setCurrentLongitude(105.123);
            m.setLastGpsUpdatedAt(LocalDateTime.now());
            mechanics.save(m);
        });

        var r = tracking.getTrackingSnapshot(f.customer(), f.orderId());
        assertFalse(r.isTrackingActive());
        // Trả về snapshot lúc hoàn tất (10.80), tuyệt đối không để lộ tọa độ sống (21.123)
        assertNotEquals(21.123, r.getMechanicLatitude());
        assertEquals(10.80, r.getMechanicLatitude());
        assertEquals(106.80, r.getMechanicLongitude());
    }

    @Test
    @DisplayName("Fix 6: Rejected former candidate CANNOT read full assigned order details")
    void rejectedMechanicCannotReadNewAssignmentDetails() {
        Fixture f = fixture();
        tx.executeWithoutResult(s -> {
            var o = orders.findById(f.orderId()).orElseThrow();
            var old = o.getMechanicStaff();
            offers.save(RescueOffer.builder()
                    .rescueOrder(o)
                    .mechanicStaff(old)
                    .status(RescueOfferStatus.REJECTED)
                    .offeredAt(LocalDateTime.now().minusMinutes(1))
                    .expiresAt(LocalDateTime.now().minusSeconds(15))
                    .build());
            var replacement = mechanics.save(MechanicStaff.builder()
                    .user(user(Role.FIELD_MECHANIC))
                    .garage(o.getGarage())
                    .workingStatus(MechanicStatus.BUSY)
                    .build());
            o.setMechanicStaff(replacement);
            orders.save(o);
        });

        // Thợ cũ có offer bị REJECTED không còn quyền đọc chi tiết đơn
        assertThrows(AccessDeniedException.class, () ->
                dispatch.getOrderById(f.mechanicUser(), f.orderId()));
    }

    @Test
    @DisplayName("Fix 5: Legitimate assigned mechanic subscription succeeds without lazy error")
    void legitimateMechanicSubscriptionSucceeds() {
        Fixture f = fixture();
        var a = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        a.setDestination("/topic/orders/" + f.orderId() + "/tracking");
        a.setUser(new UsernamePasswordAuthenticationToken(f.mechanicUser(), null, f.mechanicUser().getAuthorities()));
        var message = MessageBuilder.createMessage(new byte[0], a.getMessageHeaders());

        assertDoesNotThrow(() -> interceptor.preSend(message, null));
    }
}
