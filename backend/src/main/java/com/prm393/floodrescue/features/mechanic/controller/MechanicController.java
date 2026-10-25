package com.prm393.floodrescue.features.mechanic.controller;

import com.prm393.floodrescue.common.dto.ApiResponse;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.mechanic.dto.MechanicStaffResponse;
import com.prm393.floodrescue.features.mechanic.dto.ToggleMechanicStatusRequest;
import com.prm393.floodrescue.features.mechanic.service.MechanicStaffService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/mechanics")
@RequiredArgsConstructor
@PreAuthorize("hasRole('FIELD_MECHANIC')")
@Tag(name = "Mechanic Work Shift", description = "Ca trực và trạng thái trực tuyến của thợ cứu hộ (Field Mechanic)")
@SecurityRequirement(name = "bearerAuth")
public class MechanicController {

    private final MechanicStaffService mechanicService;

    // View mechanic profile & assigned branch
    @GetMapping("/me/profile")
    @Operation(summary = "Lấy thông tin cá nhân và chi nhánh đang trực của thợ cứu hộ")
    public ResponseEntity<ApiResponse<MechanicStaffResponse>> getMyProfile(@AuthenticationPrincipal User mechanicUser) {
        MechanicStaffResponse response = mechanicService.getMyProfile(mechanicUser);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    // UC-07: Toggle Online / Offline Status
    @RequestMapping(
            value = {"/me/status", "/me/heartbeat"},
            method = {RequestMethod.PATCH, RequestMethod.POST}
    )
    @Operation(summary = "UC-07: Bật/tắt trạng thái trực tuyến nhận cứu hộ (AVAILABLE / OFFLINE)")
    public ResponseEntity<ApiResponse<MechanicStaffResponse>> toggleStatus(
            @AuthenticationPrincipal User mechanicUser,
            @Valid @RequestBody ToggleMechanicStatusRequest request
    ) {
        MechanicStaffResponse response = mechanicService.toggleStatus(mechanicUser, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái trực tuyến thành công!", response));
    }
}
