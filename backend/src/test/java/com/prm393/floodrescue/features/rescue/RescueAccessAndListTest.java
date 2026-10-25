package com.prm393.floodrescue.features.rescue;

import com.prm393.floodrescue.config.JwtService;
import com.prm393.floodrescue.config.WebSocketAuthInterceptor;
import com.prm393.floodrescue.features.auth.entity.Role;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.auth.repository.UserRepository;
import com.prm393.floodrescue.features.garage.entity.Garage;
import com.prm393.floodrescue.features.garage.entity.GarageStatus;
import com.prm393.floodrescue.features.garage.entity.ServiceItem;
import com.prm393.floodrescue.features.garage.entity.ServiceType;
import com.prm393.floodrescue.features.garage.repository.GarageRepository;
import com.prm393.floodrescue.features.garage.repository.ServiceItemRepository;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStaff;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStatus;
import com.prm393.floodrescue.features.mechanic.repository.MechanicStaffRepository;
import com.prm393.floodrescue.features.rescue.entity.RescueOrder;
import com.prm393.floodrescue.features.rescue.entity.RescueOrderStatus;
import com.prm393.floodrescue.features.rescue.repository.RescueOrderRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class RescueAccessAndListTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private JwtService jwt;

    @Autowired
    private UserRepository users;

    @Autowired
    private GarageRepository garages;

    @Autowired
    private ServiceItemRepository services;

    @Autowired
    private MechanicStaffRepository mechanics;

    @Autowired
    private RescueOrderRepository orders;

    @Autowired
    private TransactionTemplate tx;

    @Autowired
    private WebSocketAuthInterceptor interceptor;

    private User createUser(Role role) {
        String n = "reg_" + UUID.randomUUID().toString().substring(0, 8);
        return users.save(User.builder()
                .username(n)
                .email(n + "@example.com")
                .password("unused")
                .fullName(n)
                .active(true)
                .role(role)
                .build());
    }

    record TestFixture(User customer, User stranger, User staff, User mechanic, Garage garage, Long orderId) {}

    private TestFixture createFixture() {
        return tx.execute(s -> {
            User customer = createUser(Role.CUSTOMER);
            User stranger = createUser(Role.CUSTOMER);
            User staff = createUser(Role.STAFF);
            User owner = createUser(Role.GARAGE_OWNER);
            User mechanicUser = createUser(Role.FIELD_MECHANIC);

            Garage garage = garages.save(Garage.builder()
                    .owner(owner)
                    .garageName("Gara Test Reg A")
                    .status(GarageStatus.APPROVED)
                    .build());

            ServiceItem service = services.save(ServiceItem.builder()
                    .garage(garage)
                    .serviceName("Chở xe qua ngập")
                    .serviceType(ServiceType.CROSSING)
                    .standardPrice(new BigDecimal("120000"))
                    .build());

            MechanicStaff mechanicStaff = mechanics.save(MechanicStaff.builder()
                    .user(mechanicUser)
                    .garage(garage)
                    .workingStatus(MechanicStatus.AVAILABLE)
                    .hasCrossingCapability(true)
                    .build());

            RescueOrder order = orders.save(RescueOrder.builder()
                    .orderCode("RO-TEST-" + UUID.randomUUID().toString().substring(0, 6))
                    .customer(customer)
                    .garage(garage)
                    .serviceItem(service)
                    .mechanicStaff(mechanicStaff)
                    .status(RescueOrderStatus.ARRIVED)
                    .vehiclePlate("59-TEST-SECRET")
                    .pickupAddress("85 Huỳnh Tấn Phát, Q7")
                    .pickupLatitude(10.7380)
                    .pickupLongitude(106.7210)
                    .dropoffAddress("Cầu Phú Mỹ, Q7")
                    .dropoffLatitude(10.7490)
                    .dropoffLongitude(106.7290)
                    .serviceBasePrice(new BigDecimal("120000"))
                    .bookingFee(new BigDecimal("30000"))
                    .totalAmount(new BigDecimal("150000"))
                    .currency("VND")
                    .build());

            return new TestFixture(customer, stranger, staff, mechanicUser, garage, order.getId());
        });
    }

    @Test
    @DisplayName("A01: Khách hàng lạ không được xem chi tiết đơn của khách khác (Phải trả 403 Forbidden)")
    void testForeignCustomerCannotReadOrder() throws Exception {
        TestFixture f = createFixture();

        // 1. Khách hàng chính chủ đọc được 200
        var ownerResp = mvc.perform(get("/api/v1/rescue/orders/" + f.orderId())
                .header("Authorization", "Bearer " + jwt.generateToken(f.customer())))
                .andReturn().getResponse();
        assertEquals(200, ownerResp.getStatus());
        assertTrue(ownerResp.getContentAsString().contains("59-TEST-SECRET"));

        // 2. Khách hàng lạ (stranger) bị chặn 403 Forbidden
        var strangerResp = mvc.perform(get("/api/v1/rescue/orders/" + f.orderId())
                .header("Authorization", "Bearer " + jwt.generateToken(f.stranger())))
                .andReturn().getResponse();
        assertEquals(403, strangerResp.getStatus(), "Khách hàng lạ không được phép đọc đơn của người khác");
        assertFalse(strangerResp.getContentAsString().contains("59-TEST-SECRET"), "Không được để lộ biển số xe bí mật");
    }

    @Test
    @DisplayName("A02: Các API danh sách history, staff/orders, garage/orders không bị LazyInitializationException 500 khi OSIV=false")
    void testListEndpointsWorkWithoutLazyInitializationException() throws Exception {
        TestFixture f = createFixture();

        // Customer history
        var custResp = mvc.perform(get("/api/v1/rescue/orders/history")
                .header("Authorization", "Bearer " + jwt.generateToken(f.customer())))
                .andReturn().getResponse();
        assertEquals(200, custResp.getStatus());
        assertTrue(custResp.getContentAsString().contains("success"));

        // Staff orders
        var staffResp = mvc.perform(get("/api/v1/staff/rescue/orders")
                .header("Authorization", "Bearer " + jwt.generateToken(f.staff())))
                .andReturn().getResponse();
        assertEquals(200, staffResp.getStatus());
        assertTrue(staffResp.getContentAsString().contains("success"));

        // Garage orders
        var garageResp = mvc.perform(get("/api/v1/garage/rescue/orders")
                .header("Authorization", "Bearer " + jwt.generateToken(f.garage().getOwner())))
                .andReturn().getResponse();
        assertEquals(200, garageResp.getStatus());
        assertTrue(garageResp.getContentAsString().contains("success"));
    }

    @Test
    @DisplayName("A03: WebSocket chặn Anonymous SUBSCRIBE và cấm client SEND trực tiếp vào broker /topic")
    void testWebSocketUnauthorizedSubscribeAndSendAreBlocked() {
        // 1. Anonymous SUBSCRIBE to mechanic offers must be rejected
        var subAccessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        subAccessor.setDestination("/topic/mechanics/999/offers");
        var subMessage = MessageBuilder.createMessage(new byte[0], subAccessor.getMessageHeaders());

        assertThrows(AccessDeniedException.class, () -> interceptor.preSend(subMessage, null),
                "Anonymous SUBSCRIBE tới topic offer của thợ phải bị chặn!");

        // 2. Client SEND directly to /topic must be rejected
        var sendAccessor = StompHeaderAccessor.create(StompCommand.SEND);
        sendAccessor.setDestination("/topic/mechanics/999/offers");
        var sendMessage = MessageBuilder.createMessage(new byte[0], sendAccessor.getMessageHeaders());

        assertThrows(AccessDeniedException.class, () -> interceptor.preSend(sendMessage, null),
                "Client SEND trực tiếp vào broker /topic phải bị chặn!");
    }
}
