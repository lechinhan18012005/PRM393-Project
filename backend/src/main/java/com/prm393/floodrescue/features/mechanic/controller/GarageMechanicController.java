package com.prm393.floodrescue.features.mechanic.controller;

import com.prm393.floodrescue.common.dto.ApiResponse;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.mechanic.dto.AllocateBranchRequest;
import com.prm393.floodrescue.features.mechanic.dto.CreateMechanicRequest;
import com.prm393.floodrescue.features.mechanic.dto.MechanicStaffResponse;
import com.prm393.floodrescue.features.mechanic.service.MechanicStaffService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/garages/mechanics")
@RequiredArgsConstructor
@PreAuthorize("hasRole('GARAGE_OWNER')")
public class GarageMechanicController {

    private final MechanicStaffService mechanicService;

    // UC-05: Create Mechanic Staff & Allocate
    @PostMapping
    public ResponseEntity<ApiResponse<MechanicStaffResponse>> createMechanic(
            @AuthenticationPrincipal User owner,
            @Valid @RequestBody CreateMechanicRequest request
    ) {
        MechanicStaffResponse response = mechanicService.createMechanic(owner, request);
        return ResponseEntity.ok(ApiResponse.success("Thêm nhân viên thợ sửa xe thành công!", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<MechanicStaffResponse>>> getMyMechanics(@AuthenticationPrincipal User owner) {
        List<MechanicStaffResponse> list = mechanicService.getMechanicsByGarage(owner);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @PatchMapping("/{id}/allocate")
    public ResponseEntity<ApiResponse<MechanicStaffResponse>> allocateBranch(
            @AuthenticationPrincipal User owner,
            @PathVariable("id") Long id,
            @RequestBody AllocateBranchRequest request
    ) {
        MechanicStaffResponse response = mechanicService.allocateBranch(owner, id, request);
        return ResponseEntity.ok(ApiResponse.success("Phân bổ chi nhánh cho thợ thành công!", response));
    }
}
