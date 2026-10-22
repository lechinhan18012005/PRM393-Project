package com.prm393.floodrescue.features.auth.controller;

import com.prm393.floodrescue.common.dto.ApiResponse;
import com.prm393.floodrescue.features.auth.dto.AuthResponse;
import com.prm393.floodrescue.features.auth.dto.LoginRequest;
import com.prm393.floodrescue.features.auth.dto.RegisterRequest;
import com.prm393.floodrescue.features.auth.dto.TokenRefreshRequest;
import com.prm393.floodrescue.features.auth.dto.UpdateProfileRequest;
import com.prm393.floodrescue.features.auth.dto.UserProfileResponse;
import com.prm393.floodrescue.features.auth.service.AuthService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Đăng ký, đăng nhập và quản lý token")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    @Operation(summary = "Đăng ký tài khoản CUSTOMER")
    public ResponseEntity<ApiResponse<AuthResponse>> register(
            @Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(response, "Đăng ký tài khoản thành công"));
    }

    @PostMapping("/login")
    @Operation(summary = "Đăng nhập và nhận access token, refresh token")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.ok(response, "Đăng nhập thành công"));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Lấy token mới bằng refresh token")
    public ResponseEntity<ApiResponse<AuthResponse>> refreshToken(
            @Valid @RequestBody TokenRefreshRequest request) {
        AuthResponse response = authService.refreshToken(request);
        return ResponseEntity.ok(ApiResponse.ok(response, "Làm mới token thành công"));
    }

    @GetMapping("/me")
    @Operation(summary = "Lấy thông tin tài khoản đang đăng nhập")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getCurrentUser(
            Authentication authentication) {
        UserProfileResponse response = authService.getCurrentUserProfile(authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok(response, "Lấy thông tin tài khoản thành công"));
    }

    @PatchMapping("/me")
    @Operation(summary = "Cập nhật thông tin cá nhân của tài khoản đang đăng nhập")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<UserProfileResponse>> updateCurrentUser(
            Authentication authentication, @Valid @RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(
                ApiResponse.ok(
                        authService.updateCurrentUserProfile(authentication.getName(), request),
                        "Cập nhật thông tin thành công"));
    }
}
