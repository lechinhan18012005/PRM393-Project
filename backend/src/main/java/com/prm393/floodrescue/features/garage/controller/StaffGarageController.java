package com.prm393.floodrescue.features.garage.controller;

import com.prm393.floodrescue.common.dto.ApiResponse;
import com.prm393.floodrescue.features.garage.dto.ApproveGarageRequest;
import com.prm393.floodrescue.features.garage.dto.GarageBranchResponse;
import com.prm393.floodrescue.features.garage.dto.GarageResponse;
import com.prm393.floodrescue.features.garage.service.GarageBranchService;
import com.prm393.floodrescue.features.garage.service.GarageService;
import com.prm393.floodrescue.features.mechanic.dto.MechanicStaffResponse;
import com.prm393.floodrescue.features.mechanic.service.MechanicStaffService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/staff/garages")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
@Tag(name = "Staff Garage Moderation", description = "Kiểm duyệt và phê duyệt hồ sơ đối tác Garage (Staff/Admin)")
@SecurityRequirement(name = "bearerAuth")
public class StaffGarageController {

    private final GarageService garageService;
    private final GarageBranchService branchService;
    private final MechanicStaffService mechanicService;

    // UC-03: Verify & Approve Garage Profile
    @GetMapping("/pending")
    @Operation(summary = "UC-03: Lấy danh sách hồ sơ Garage đang chờ phê duyệt")
    public ResponseEntity<ApiResponse<List<GarageResponse>>> getPendingGarages() {
        List<GarageResponse> pending = garageService.getPendingGarages();
        return ResponseEntity.ok(ApiResponse.success(pending));
    }

    @GetMapping
    @Operation(summary = "Lấy tất cả danh sách Garage trong hệ thống")
    public ResponseEntity<ApiResponse<List<GarageResponse>>> getAllGarages() {
        List<GarageResponse> all = garageService.getAllGarages();
        return ResponseEntity.ok(ApiResponse.success(all));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy chi tiết hồ sơ thông tin của Garage theo ID")
    public ResponseEntity<ApiResponse<GarageResponse>> getGarageById(@PathVariable("id") Long id) {
        GarageResponse response = garageService.getGarageById(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PatchMapping("/{id}/moderate")
    @Operation(summary = "UC-03: Thẩm định và duyệt hồ sơ Garage (APPROVED / REJECTED / SUSPENDED)")
    public ResponseEntity<ApiResponse<GarageResponse>> moderateGarage(
            @PathVariable("id") Long id,
            @Valid @RequestBody ApproveGarageRequest request
    ) {
        GarageResponse response = garageService.moderateGarage(id, request);
        return ResponseEntity.ok(ApiResponse.success("Kiểm duyệt hồ sơ garage thành công!", response));
    }

    @GetMapping("/{id}/branches")
    @Operation(summary = "Lấy danh sách chi nhánh của Garage theo ID (Staff)")
    public ResponseEntity<ApiResponse<List<GarageBranchResponse>>> getGarageBranches(@PathVariable("id") Long id) {
        List<GarageBranchResponse> branches = branchService.getBranchesByGarageId(id);
        return ResponseEntity.ok(ApiResponse.success(branches));
    }

    @GetMapping("/{id}/mechanics")
    @Operation(summary = "Lấy danh sách thợ cứu hộ của Garage theo ID (Staff)")
    public ResponseEntity<ApiResponse<List<MechanicStaffResponse>>> getGarageMechanics(@PathVariable("id") Long id) {
        List<MechanicStaffResponse> mechanics = mechanicService.getMechanicsByGarageId(id);
        return ResponseEntity.ok(ApiResponse.success(mechanics));
    }
}
