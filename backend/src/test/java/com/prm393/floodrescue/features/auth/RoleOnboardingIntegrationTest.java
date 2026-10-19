package com.prm393.floodrescue.features.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.*;
import com.prm393.floodrescue.features.auth.entity.*;
import com.prm393.floodrescue.features.auth.repository.*;
import com.prm393.floodrescue.features.garage.entity.*;
import com.prm393.floodrescue.features.garage.repository.*;
import com.prm393.floodrescue.features.mechanic.entity.*;
import com.prm393.floodrescue.features.mechanic.repository.*;
import com.prm393.floodrescue.features.onboarding.*;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class RoleOnboardingIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired UserRepository users;
    @Autowired GarageRepository garages;
    @Autowired GarageBranchRepository branches;
    @Autowired MechanicStaffRepository mechanics;
    @Autowired PasswordEncoder encoder;
    @Autowired InvitationRepository invitations;

    String suffix() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

    User user(Role role) {
        String name = "u" + suffix();
        return users.save(
                User.builder()
                        .username(name)
                        .email(name + "@example.com")
                        .fullName("Test User")
                        .password(encoder.encode("Password@123"))
                        .role(role)
                        .build());
    }

    Map<String, Object> account(String email) {
        return Map.of(
                "username",
                "u" + suffix(),
                "email",
                email,
                "fullName",
                "New User",
                "password",
                "Password@123");
    }

    JsonNode call(MockHttpServletRequestBuilder request, Object body, int status) throws Exception {
        if (body != null)
            request.contentType("application/json").content(mapper.writeValueAsString(body));
        String response =
                mvc.perform(request)
                        .andExpect(status().is(status))
                        .andReturn()
                        .getResponse()
                        .getContentAsString();
        return response.isBlank() ? mapper.nullNode() : mapper.readTree(response).path("data");
    }

    String token(User user) throws Exception {
        return call(
                        post("/api/v1/auth/login"),
                        Map.of("identifier", user.getUsername(), "password", "Password@123"),
                        200)
                .path("accessToken")
                .asText();
    }

    Garage garage(User owner, GarageStatus status) {
        return garages.save(
                Garage.builder()
                        .owner(owner)
                        .garageName("Test Garage")
                        .status(status)
                        .businessLicenseUrl("https://example.com/license")
                        .idCardUrl("https://example.com/id")
                        .build());
    }

    GarageBranch branch(Garage garage) {
        return branches.save(
                GarageBranch.builder()
                        .garage(garage)
                        .branchName("Branch")
                        .address("Address")
                        .latitude(10.0)
                        .longitude(106.0)
                        .operatingStatus(BranchStatus.OPEN)
                        .build());
    }

    @Test
    void platformRoleMatrix() throws Exception {
        for (Role role : Role.values()) {
            User user = user(role);
            boolean mobile = role == Role.CUSTOMER || role == Role.FIELD_MECHANIC;
            for (String platform : List.of("MOBILE", "WEB"))
                call(
                        post("/api/v1/auth/login"),
                        Map.of(
                                "identifier",
                                user.getUsername(),
                                "password",
                                "Password@123",
                                "platform",
                                platform),
                        (platform.equals("MOBILE") == mobile) ? 200 : 403);
        }
    }

    @Test
    void ownerRegistrationIsAtomicAndPendingCannotOperate() throws Exception {
        Map<String, Object> account = account("owner" + suffix() + "@example.com");
        Map<String, Object> application =
                Map.of(
                        "garageName",
                        "New Garage",
                        "businessLicenseUrl",
                        "https://example.com/license",
                        "idCardUrl",
                        "https://example.com/id");
        JsonNode result =
                call(
                        post("/api/v1/onboarding/garage"),
                        Map.of("account", account, "application", application),
                        200);
        assertEquals("GARAGE_OWNER", result.path("user").path("role").asText());
        String auth = "Bearer " + result.path("accessToken").asText();
        call(get("/api/v1/garages/me").header("Authorization", auth), null, 200);
        call(get("/api/v1/garages/branches").header("Authorization", auth), null, 403);
        call(get("/api/v1/garages/services").header("Authorization", auth), null, 403);
        call(
                post("/api/v1/garages/mechanics/invitations").header("Authorization", auth),
                Map.of("email", "m@example.com", "branchId", 1),
                403);
        JsonNode resubmitted =
                call(
                        put("/api/v1/garages/me/application").header("Authorization", auth),
                        application,
                        200);
        assertEquals("PENDING", resubmitted.path("status").asText());
        int count = users.findAll().size();
        call(
                post("/api/v1/onboarding/garage"),
                Map.of(
                        "account",
                        account("bad" + suffix() + "@example.com"),
                        "application",
                        Map.of("garageName", "Invalid")),
                400);
        assertEquals(count, users.findAll().size());
    }

    @Test
    void staffInvitationsAreAdminOnlyAndSingleUse() throws Exception {
        User admin = user(Role.ADMIN), customer = user(Role.CUSTOMER);
        String adminAuth = "Bearer " + token(admin);
        String email = "staff" + suffix() + "@example.com";
        call(
                post("/api/v1/admin/staff/invitations")
                        .header("Authorization", "Bearer " + token(customer)),
                Map.of("email", email),
                403);
        call(
                post("/api/v1/garages/register")
                        .header("Authorization", "Bearer " + token(customer)),
                Map.of("garageName", "Attempt"),
                403);
        JsonNode invitation =
                call(
                        post("/api/v1/admin/staff/invitations").header("Authorization", adminAuth),
                        Map.of("email", email),
                        200);
        Map<String, Object> body =
                Map.of("code", invitation.path("code").asText(), "account", account(email));
        call(
                post("/api/v1/onboarding/activate"),
                Map.of(
                        "code",
                        invitation.path("code").asText(),
                        "account",
                        account("wrong@example.com")),
                400);
        call(post("/api/v1/onboarding/activate"), body, 200);
        User staff = users.findByEmail(email).orElseThrow();
        assertEquals(Role.STAFF, staff.getRole());
        call(post("/api/v1/onboarding/activate"), body, 400);
        String staffToken = token(staff);
        call(
                patch("/api/v1/admin/staff/" + staff.getId() + "/status")
                        .header("Authorization", adminAuth),
                Map.of("active", false),
                200);
        call(get("/api/v1/auth/me").header("Authorization", "Bearer " + staffToken), null, 401);
    }

    @Test
    void expiredInvitationCannotActivate() throws Exception {
        User admin = user(Role.ADMIN);
        String email = "expired" + suffix() + "@example.com";
        JsonNode invitation =
                call(
                        post("/api/v1/admin/staff/invitations")
                                .header("Authorization", "Bearer " + token(admin)),
                        Map.of("email", email),
                        200);
        AccountInvitation stored =
                invitations.findAll().stream()
                        .filter(i -> i.getEmail().equals(email))
                        .findFirst()
                        .orElseThrow();
        stored.setExpiresAt(LocalDateTime.now().minusMinutes(1));
        invitations.save(stored);
        call(
                post("/api/v1/onboarding/activate"),
                Map.of("code", invitation.path("code").asText(), "account", account(email)),
                400);
        assertTrue(users.findByEmail(email).isEmpty());
    }

    @Test
    void mechanicInvitationAndAllocationStayInsideGarage() throws Exception {
        User owner = user(Role.GARAGE_OWNER), otherOwner = user(Role.GARAGE_OWNER);
        Garage garage = garage(owner, GarageStatus.APPROVED),
                otherGarage = garage(otherOwner, GarageStatus.APPROVED);
        GarageBranch ownBranch = branch(garage), otherBranch = branch(otherGarage);
        String auth = "Bearer " + token(owner);
        String email = "mechanic" + suffix() + "@example.com";
        call(
                post("/api/v1/garages/mechanics/invitations").header("Authorization", auth),
                Map.of("email", email, "branchId", otherBranch.getId()),
                403);
        JsonNode invite =
                call(
                        post("/api/v1/garages/mechanics/invitations").header("Authorization", auth),
                        Map.of("email", email, "branchId", ownBranch.getId()),
                        200);
        call(
                post("/api/v1/onboarding/activate"),
                Map.of("code", invite.path("code").asText(), "account", account(email)),
                200);
        User mechanicUser = users.findByEmail(email).orElseThrow();
        assertEquals(Role.FIELD_MECHANIC, mechanicUser.getRole());
        MechanicStaff mechanic = mechanics.findByUserId(mechanicUser.getId()).orElseThrow();
        call(
                patch("/api/v1/garages/mechanics/" + mechanic.getId() + "/allocate")
                        .header("Authorization", auth),
                Map.of("branchId", otherBranch.getId()),
                403);
        call(
                patch("/api/v1/garages/mechanics/" + mechanic.getId() + "/allocate")
                        .header("Authorization", auth),
                Map.of("branchId", ownBranch.getId(), "shiftName", "Morning"),
                200);
        String mechanicToken = token(mechanicUser);
        call(
                patch("/api/v1/garages/mechanics/" + mechanic.getId() + "/status")
                        .header("Authorization", auth),
                Map.of("active", false),
                200);
        call(
                get("/api/v1/mechanics/me/profile")
                        .header("Authorization", "Bearer " + mechanicToken),
                null,
                401);
    }

    @Test
    void rejectedGarageCanResubmitAndSuspensionBlocksOperations() throws Exception {
        User owner = user(Role.GARAGE_OWNER), staff = user(Role.STAFF);
        Garage garage = garage(owner, GarageStatus.REJECTED);
        String ownerAuth = "Bearer " + token(owner), staffAuth = "Bearer " + token(staff);
        Map<String, Object> application =
                Map.of(
                        "garageName",
                        "Updated Garage",
                        "businessLicenseUrl",
                        "https://example.com/license",
                        "idCardUrl",
                        "https://example.com/id");
        call(
                put("/api/v1/garages/me/application").header("Authorization", ownerAuth),
                application,
                200);
        call(
                patch("/api/v1/staff/garages/" + garage.getId() + "/moderate")
                        .header("Authorization", ownerAuth),
                Map.of("status", "APPROVED"),
                403);
        call(
                patch("/api/v1/staff/garages/" + garage.getId() + "/moderate")
                        .header("Authorization", staffAuth),
                Map.of("status", "APPROVED"),
                200);
        call(get("/api/v1/garages/branches").header("Authorization", ownerAuth), null, 200);
        call(
                put("/api/v1/garages/me/application").header("Authorization", ownerAuth),
                application,
                400);
        call(
                patch("/api/v1/staff/garages/" + garage.getId() + "/moderate")
                        .header("Authorization", staffAuth),
                Map.of("status", "SUSPENDED", "note", "Verification required"),
                200);
        call(get("/api/v1/garages/branches").header("Authorization", ownerAuth), null, 403);
        call(get("/api/v1/admin/staff").header("Authorization", staffAuth), null, 403);
    }
}
