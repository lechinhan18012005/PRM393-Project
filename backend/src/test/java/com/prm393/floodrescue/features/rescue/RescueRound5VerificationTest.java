package com.prm393.floodrescue.features.rescue;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.prm393.floodrescue.config.JwtService;
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
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RescueRound5VerificationTest {

    @Autowired MockMvc mvc;
    @Autowired JwtService jwt;
    @Autowired UserRepository users;
    @Autowired GarageRepository garages;
    @Autowired ServiceItemRepository services;
    @Autowired MechanicStaffRepository mechanics;
    @Autowired RescueOrderRepository orders;
    @Autowired TransactionTemplate tx;
    @Autowired ObjectMapper mapper;

    User createUser(Role role) {
        String n = "r5_" + UUID.randomUUID().toString().substring(0, 8);
        return users.save(User.builder()
                .username(n)
                .email(n + "@example.com")
                .password("testpass")
                .fullName(n)
                .active(true)
                .role(role)
                .build());
    }

    record Fixture(User customer, User mechanic, Long orderId) {}

    Fixture createFixture() {
        return tx.execute(s -> {
            User c = createUser(Role.CUSTOMER);
            User m = createUser(Role.FIELD_MECHANIC);
            User owner = createUser(Role.GARAGE_OWNER);

            Garage g = garages.save(Garage.builder()
                    .owner(owner)
                    .garageName("Gara R5 Test")
                    .status(GarageStatus.APPROVED)
                    .build());

            ServiceItem service = services.save(ServiceItem.builder()
                    .garage(g)
                    .serviceName("Chở xe qua ngập")
                    .serviceType(ServiceType.CROSSING)
                    .standardPrice(new BigDecimal("120000"))
                    .build());

            MechanicStaff mech = mechanics.save(MechanicStaff.builder()
                    .user(m)
                    .garage(g)
                    .workingStatus(MechanicStatus.BUSY)
                    .build());

            RescueOrder order = orders.save(RescueOrder.builder()
                    .orderCode("R5-" + UUID.randomUUID().toString().substring(0, 8))
                    .customer(c)
                    .garage(g)
                    .serviceItem(service)
                    .mechanicStaff(mech)
                    .status(RescueOrderStatus.DISPATCHED)
                    .vehiclePlate("59-R5 999.99")
                    .pickupAddress("85 Huỳnh Tấn Phát, Q.7")
                    .pickupLatitude(10.7385)
                    .pickupLongitude(106.7215)
                    .dropoffAddress("Cầu Phú Mỹ, Q.7")
                    .dropoffLatitude(10.7490)
                    .dropoffLongitude(106.7290)
                    .serviceBasePrice(new BigDecimal("120000"))
                    .bookingFee(new BigDecimal("30000"))
                    .totalAmount(new BigDecimal("150000"))
                    .build());

            return new Fixture(c, m, order.getId());
        });
    }

    @Test
    @DisplayName("Fresh nearby GPS with accuracy 138m supports tracking and arrival")
    void highAccuracyErrorDoesNotBlockTrackingOrArrival() throws Exception {
        Fixture f = createFixture();
        String auth = "Bearer " + jwt.generateToken(f.mechanic());
        String body = mapper.writeValueAsString(Map.of(
                "latitude", 10.738527,
                "longitude", 106.7215,
                "accuracyMeters", 138.0,
                "recordedAt", Instant.now().toString()));

        for (String action : new String[]{"location", "arrived"}) {
            var response = mvc.perform(post("/api/v1/rescue/orders/" + f.orderId() + "/" + action)
                    .header("Authorization", auth)
                    .contentType("application/json")
                    .content(body))
                    .andReturn().getResponse();
            assertEquals(200, response.getStatus(), action + ": " + response.getContentAsString());
        }
        assertEquals(RescueOrderStatus.ARRIVED, orders.findById(f.orderId()).orElseThrow().getStatus());
    }

    @Test
    @DisplayName("Issue 2: Location tracking accepts native UTC GPS timestamp (ends with Z)")
    void locationTrackingAcceptsNativeUtcGpsTimestamp() throws Exception {
        Fixture f = createFixture();
        String auth = "Bearer " + jwt.generateToken(f.mechanic());
        String utcString = Instant.now().toString();

        String body = mapper.writeValueAsString(Map.of(
                "latitude", 10.7385,
                "longitude", 106.7215,
                "accuracyMeters", 5.0,
                "recordedAt", utcString
        ));

        var response = mvc.perform(post("/api/v1/rescue/orders/" + f.orderId() + "/location")
                .header("Authorization", auth)
                .contentType("application/json")
                .content(body))
                .andReturn().getResponse();

        assertEquals(200, response.getStatus(), "UTC timestamp phải được chấp nhận với HTTP 200");
    }

    @Test
    @DisplayName("Issue 2: Location tracking accepts local datetime and offset strings")
    void locationTrackingAcceptsLocalAndOffsetStrings() throws Exception {
        Fixture f = createFixture();
        String auth = "Bearer " + jwt.generateToken(f.mechanic());

        // 1. Local ISO string without timezone (e.g. 2026-10-24T17:00:00)
        String localString = LocalDateTime.now().toString();
        String localBody = mapper.writeValueAsString(Map.of(
                "latitude", 10.7385,
                "longitude", 106.7215,
                "accuracyMeters", 5.0,
                "recordedAt", localString
        ));
        var localResp = mvc.perform(post("/api/v1/rescue/orders/" + f.orderId() + "/location")
                .header("Authorization", auth)
                .contentType("application/json")
                .content(localBody))
                .andReturn().getResponse();
        assertEquals(200, localResp.getStatus(), "Local timestamp phải được chấp nhận");

        // 2. Offset string with +07:00
        String offsetString = OffsetDateTime.now(ZoneOffset.ofHours(7)).toString();
        String offsetBody = mapper.writeValueAsString(Map.of(
                "latitude", 10.7385,
                "longitude", 106.7215,
                "accuracyMeters", 5.0,
                "recordedAt", offsetString
        ));
        var offsetResp = mvc.perform(post("/api/v1/rescue/orders/" + f.orderId() + "/location")
                .header("Authorization", auth)
                .contentType("application/json")
                .content(offsetBody))
                .andReturn().getResponse();
        assertEquals(200, offsetResp.getStatus(), "Offset timestamp +07:00 phải được chấp nhận");
    }

    @Test
    @DisplayName("Issue 2: Genuinely stale GPS (>30s) is rejected with HTTP 400")
    void staleGpsIsRejected() throws Exception {
        Fixture f = createFixture();
        String auth = "Bearer " + jwt.generateToken(f.mechanic());
        String staleUtc = Instant.now().minusSeconds(45).toString();

        String body = mapper.writeValueAsString(Map.of(
                "latitude", 10.7385,
                "longitude", 106.7215,
                "accuracyMeters", 5.0,
                "recordedAt", staleUtc
        ));

        var response = mvc.perform(post("/api/v1/rescue/orders/" + f.orderId() + "/location")
                .header("Authorization", auth)
                .contentType("application/json")
                .content(body))
                .andReturn().getResponse();

        assertEquals(400, response.getStatus());
        assertTrue(response.getContentAsString(StandardCharsets.UTF_8).contains("quá hạn"));
    }

    @Test
    @DisplayName("Issue 1 & 2: Mobile /arrived endpoint accepts native UTC GPS fix and transitions order")
    void arrivalEndpointAcceptsNativeUtc() throws Exception {
        Fixture f = createFixture();
        String auth = "Bearer " + jwt.generateToken(f.mechanic());
        String utcString = Instant.now().toString();

        String body = mapper.writeValueAsString(Map.of(
                "latitude", 10.7385,
                "longitude", 106.7215,
                "accuracyMeters", 5.0,
                "recordedAt", utcString
        ));

        // Test đường chuẩn /arrived
        var response = mvc.perform(post("/api/v1/rescue/orders/" + f.orderId() + "/arrived")
                .header("Authorization", auth)
                .contentType("application/json")
                .content(body))
                .andReturn().getResponse();

        assertEquals(200, response.getStatus(), "POST /arrived với UTC timestamp phải thành công");
        assertTrue(response.getContentAsString(StandardCharsets.UTF_8).contains("ARRIVED"));
    }

    @Test
    @DisplayName("Issue 1: Alias endpoint /arrive is also supported for backward compatibility")
    void arrivalAliasEndpointSupported() throws Exception {
        Fixture f = createFixture();
        String auth = "Bearer " + jwt.generateToken(f.mechanic());
        String utcString = Instant.now().toString();

        String body = mapper.writeValueAsString(Map.of(
                "latitude", 10.7385,
                "longitude", 106.7215,
                "accuracyMeters", 5.0,
                "recordedAt", utcString
        ));

        // Test đường alias /arrive
        var response = mvc.perform(post("/api/v1/rescue/orders/" + f.orderId() + "/arrive")
                .header("Authorization", auth)
                .contentType("application/json")
                .content(body))
                .andReturn().getResponse();

        assertEquals(200, response.getStatus(), "POST /arrive alias cũng phải trả về 200");
    }
}
