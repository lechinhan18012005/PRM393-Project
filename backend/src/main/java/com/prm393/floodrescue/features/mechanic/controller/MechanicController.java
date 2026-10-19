package com.prm393.floodrescue.features.mechanic.controller;

import com.prm393.floodrescue.common.dto.ApiResponse;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.mechanic.dto.MechanicStaffResponse;
import com.prm393.floodrescue.features.mechanic.dto.ToggleMechanicStatusRequest;
import com.prm393.floodrescue.features.mechanic.service.MechanicStaffService;
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
public class MechanicController {

    private final MechanicStaffService mechanicService;

    // View mechanic profile & assigned branch
    @GetMapping("/me/profile")
    public ResponseEntity<ApiResponse<MechanicStaffResponse>> getMyProfile(@AuthenticationPrincipal User mechanicUser) {
        MechanicStaffResponse response = mechanicService.getMyProfile(mechanicUser);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    // UC-07: Toggle Online / Offline Status
    @PatchMapping("/me/status")
    public ResponseEntity<ApiResponse<MechanicStaffResponse>> toggleStatus(
            @AuthenticationPrincipal User mechanicUser,
            @Valid @RequestBody ToggleMechanicStatusRequest request
    ) {
        MechanicStaffResponse response = mechanicService.toggleStatus(mechanicUser, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái trực tuyến thành công!", response));
    }
}
