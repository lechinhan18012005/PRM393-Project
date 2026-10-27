package com.prm393.floodrescue.features.onboarding;

import com.prm393.floodrescue.common.dto.ApiResponse;
import com.prm393.floodrescue.common.exception.BadRequestException;
import com.prm393.floodrescue.features.auth.dto.*;
import com.prm393.floodrescue.features.auth.entity.*;
import com.prm393.floodrescue.features.auth.repository.UserRepository;
import com.prm393.floodrescue.features.garage.dto.RegisterGarageRequest;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import lombok.RequiredArgsConstructor;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class OnboardingController {
    private final OnboardingService service;
    private final UserRepository users;

    public record GarageRegistration(
            @NotNull @Valid RegisterRequest account,
            @NotNull @Valid RegisterGarageRequest application) {}

    public record InviteRequest(@NotBlank @Email String email, Long branchId) {}

    public record Activation(@NotBlank String code, @NotNull @Valid RegisterRequest account) {}

    public record StatusRequest(@NotNull Boolean active) {}

    @PostMapping("/onboarding/garage")
    public ApiResponse<AuthResponse> register(@Valid @RequestBody GarageRegistration request) {
        return ApiResponse.success(
                service.registerGarage(request.account(), request.application()));
    }

    @PostMapping("/onboarding/activate")
    public ApiResponse<Map<String, String>> activate(@Valid @RequestBody Activation request) {
        return ApiResponse.success(service.activate(request.code(), request.account()));
    }

    @PostMapping("/admin/staff/invitations")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Map<String, Object>> inviteStaff(
            @AuthenticationPrincipal User user, @Valid @RequestBody InviteRequest request) {
        return ApiResponse.success(service.invite(user, request.email(), null, true));
    }

    @PostMapping("/garages/mechanics/invitations")
    @PreAuthorize("hasRole('GARAGE_OWNER')")
    public ApiResponse<Map<String, Object>> inviteMechanic(
            @AuthenticationPrincipal User user, @Valid @RequestBody InviteRequest request) {
        if (request.branchId() == null) throw new BadRequestException("Vui lòng chọn chi nhánh");
        return ApiResponse.success(
                service.invite(user, request.email(), request.branchId(), false));
    }

    @GetMapping("/admin/staff")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<UserProfileResponse>> listStaff() {
        return ApiResponse.success(
                users.findByRole(Role.STAFF).stream()
                        .map(UserProfileResponse::fromEntity)
                        .toList());
    }

    @PatchMapping("/admin/staff/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<UserProfileResponse> status(
            @PathVariable Long id, @Valid @RequestBody StatusRequest request) {
        User user =
                users.findById(id)
                        .orElseThrow(() -> new BadRequestException("Không tìm thấy Staff"));
        if (user.getRole() != Role.STAFF)
            throw new BadRequestException("Tài khoản không phải Staff");
        user.setActive(request.active());
        return ApiResponse.success(UserProfileResponse.fromEntity(users.save(user)));
    }
}
