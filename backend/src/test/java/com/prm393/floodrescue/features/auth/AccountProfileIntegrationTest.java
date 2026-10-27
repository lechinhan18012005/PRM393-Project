package com.prm393.floodrescue.features.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.*;
import com.prm393.floodrescue.config.JwtService;
import com.prm393.floodrescue.features.auth.entity.*;
import com.prm393.floodrescue.features.auth.repository.UserRepository;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AccountProfileIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired UserRepository users;
    @Autowired JwtService jwt;

    User customer() {
        String name = "profile_" + UUID.randomUUID().toString().substring(0, 8);
        return users.save(
                User.builder()
                        .username(name)
                        .email(name + "@example.com")
                        .fullName("Original Name")
                        .password("unused")
                        .role(Role.CUSTOMER)
                        .build());
    }

    JsonNode call(MockHttpServletRequestBuilder request, Object body, int status) throws Exception {
        if (body != null)
            request.contentType("application/json").content(mapper.writeValueAsString(body));
        String result =
                mvc.perform(request)
                        .andExpect(status().is(status))
                        .andReturn()
                        .getResponse()
                        .getContentAsString();
        return result.isBlank() ? mapper.nullNode() : mapper.readTree(result);
    }

    String auth(User user) {
        return "Bearer " + jwt.generateToken(user);
    }

    @Test
    void viewAndUpdateOnlyOwnEditableFields() throws Exception {
        User self = customer(), other = customer();
        String auth = auth(self);
        JsonNode result = call(get("/api/v1/auth/me").header("Authorization", auth), null, 200);
        assertEquals(self.getUsername(), result.path("data").path("username").asText());
        result =
                call(
                                patch("/api/v1/auth/me").header("Authorization", auth),
                                Map.of(
                                        "fullName",
                                        "  Updated Name  ",
                                        "email",
                                        "UPDATED_PROFILE@EXAMPLE.COM",
                                        "phone",
                                        "+84912345678",
                                        "id",
                                        other.getId(),
                                        "role",
                                        "ADMIN",
                                        "username",
                                        "hijacked"),
                                200)
                        .path("data");
        assertEquals("Updated Name", result.path("fullName").asText());
        assertEquals("updated_profile@example.com", result.path("email").asText());
        assertEquals("CUSTOMER", result.path("role").asText());
        assertEquals(self.getUsername(), result.path("username").asText());
        assertEquals("Original Name", users.findById(other.getId()).orElseThrow().getFullName());
        result = call(get("/api/v1/auth/me").header("Authorization", auth), null, 200).path("data");
        assertEquals("Updated Name", result.path("fullName").asText());
        assertEquals(
                self.getId(),
                users.findByIdentifier("updated_profile@example.com").orElseThrow().getId());
        Map<String, Object> clearPhone = new HashMap<>();
        clearPhone.put("fullName", "Updated Name");
        clearPhone.put("email", "updated_profile@example.com");
        clearPhone.put("phone", null);
        result =
                call(patch("/api/v1/auth/me").header("Authorization", auth), clearPhone, 200)
                        .path("data");
        assertTrue(result.path("phone").isNull());
    }

    @Test
    void rejectsDuplicateEmailOrPhoneWithoutChangingProfile() throws Exception {
        User self = customer(), other = customer();
        other.setPhone("0912345678");
        users.saveAndFlush(other);
        call(
                patch("/api/v1/auth/me").header("Authorization", auth(self)),
                Map.of("fullName", "Invalid", "email", other.getEmail()),
                400);
        call(
                patch("/api/v1/auth/me").header("Authorization", auth(self)),
                Map.of("fullName", "Invalid", "email", self.getEmail(), "phone", other.getPhone()),
                400);
        assertEquals("Original Name", users.findById(self.getId()).orElseThrow().getFullName());
    }

    @Test
    void rejectsInvalidFields() throws Exception {
        User self = customer();
        String auth = auth(self);
        for (Map<String, String> body :
                List.of(
                        Map.of("fullName", " ", "email", self.getEmail()),
                        Map.of("fullName", "Name", "email", "invalid"),
                        Map.of("fullName", "Name", "email", self.getEmail(), "phone", "abc"))) {
            call(patch("/api/v1/auth/me").header("Authorization", auth), body, 400);
        }
    }

    @Test
    void updateRequiresAuthentication() throws Exception {
        call(
                patch("/api/v1/auth/me"),
                Map.of("fullName", "Name", "email", "someone@example.com"),
                401);
    }
}
