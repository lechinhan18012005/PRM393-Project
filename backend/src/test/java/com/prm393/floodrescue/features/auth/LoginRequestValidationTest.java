package com.prm393.floodrescue.features.auth;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.prm393.floodrescue.features.auth.dto.LoginRequest;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

class LoginRequestValidationTest {

    private final Validator validator =
            Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void acceptsEmailAndVietnamesePhone() {
        assertTrue(validator.validate(request("customer@example.com", "Password@123")).isEmpty());
        assertTrue(validator.validate(request("0901234567", "Password@123")).isEmpty());
        assertTrue(validator.validate(request("+84901234567", "Password@123")).isEmpty());
    }

    @Test
    void rejectsUsernameInvalidPhoneAndInvalidPasswordLength() {
        assertFalse(validator.validate(request("plain_username", "Password@123")).isEmpty());
        assertFalse(validator.validate(request("0123456789", "Password@123")).isEmpty());
        assertFalse(validator.validate(request("customer@example.com", "12345")).isEmpty());
        assertFalse(
                validator.validate(request("customer@example.com", "x".repeat(129))).isEmpty());
    }

    private LoginRequest request(String identifier, String password) {
        return LoginRequest.builder().identifier(identifier).password(password).build();
    }
}
