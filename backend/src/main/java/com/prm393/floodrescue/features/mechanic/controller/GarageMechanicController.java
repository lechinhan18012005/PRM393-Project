package com.prm393.floodrescue.features.mechanic.controller;

import com.prm393.floodrescue.common.dto.ApiResponse;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.mechanic.dto.AllocateBranchRequest;
import com.prm393.floodrescue.features.mechanic.dto.CreateMechanicRequest;
import com.prm393.floodrescue.features.mechanic.dto.MechanicStaffResponse;
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

import java.util.List;

@RestController
@RequestMapping("/api/v1/garages/mechanics")
@RequiredArgsConstructor
@PreAuthorize("hasRole('GARAGE_OWNER')")
@Tag(name = "Garage Mechanic Management", description = "Quản lý nhân viên thợ cứu hộ và phân bổ chi nhánh (Garage Owner)")
@SecurityRequirement(name = "bearerAuth")
public class GarageMechanicController {

    private final MechanicStaffService mechanicService;

    // UC-05: Create Mechanic Staff & Allocate
    @PostMapping
    @Operation(summary = "UC-05: Tạo tài khoản thợ sửa xe mới và phân bổ vào chi nhánh")
    public ResponseEntity<ApiResponse<MechanicStaffResponse>> createMechanic(
            @AuthenticationPrincipal User owner,
            @Valid @RequestBody CreateMechanicRequest request
    ) {
        MechanicStaffResponse response = mechanicService.createMechanic(owner, request);
        return ResponseEntity.ok(ApiResponse.success("Thêm nhân viên thợ sửa xe thành công!", response));
    }

    @GetMapping
    @Operation(summary = "UC-05: Lấy danh sách thợ sửa xe thuộc quyền quản lý của Garage")
    public ResponseEntity<ApiResponse<List<MechanicStaffResponse>>> getMyMechanics(@AuthenticationPrincipal User owner) {
        List<MechanicStaffResponse> list = mechanicService.getMechanicsByGarage(owner);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @PatchMapping("/{id}/allocate")
    @Operation(summary = "UC-05: Phân bổ hoặc thay đổi chi nhánh làm việc cho thợ")
    public ResponseEntity<ApiResponse<MechanicStaffResponse>> allocateBranch(
            @AuthenticationPrincipal User owner,
            @PathVariable("id") Long id,
            @RequestBody AllocateBranchRequest request
    ) {
        MechanicStaffResponse response = mechanicService.allocateBranch(owner, id, request);
        return ResponseEntity.ok(ApiResponse.success("Phân bổ chi nhánh cho thợ thành công!", response));
    }
}
