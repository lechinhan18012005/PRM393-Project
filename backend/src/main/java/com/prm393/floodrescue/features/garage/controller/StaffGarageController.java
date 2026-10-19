package com.prm393.floodrescue.features.garage.controller;

import com.prm393.floodrescue.common.dto.ApiResponse;
import com.prm393.floodrescue.features.garage.dto.ApproveGarageRequest;
import com.prm393.floodrescue.features.garage.dto.GarageResponse;
import com.prm393.floodrescue.features.garage.service.GarageService;
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
public class StaffGarageController {

    private final GarageService garageService;

    // UC-03: Verify & Approve Garage Profile
    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<List<GarageResponse>>> getPendingGarages() {
        List<GarageResponse> pending = garageService.getPendingGarages();
        return ResponseEntity.ok(ApiResponse.success(pending));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<GarageResponse>>> getAllGarages() {
        List<GarageResponse> all = garageService.getAllGarages();
        return ResponseEntity.ok(ApiResponse.success(all));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<GarageResponse>> getGarageById(@PathVariable("id") Long id) {
        GarageResponse response = garageService.getGarageById(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PatchMapping("/{id}/moderate")
    public ResponseEntity<ApiResponse<GarageResponse>> moderateGarage(
            @PathVariable("id") Long id,
            @Valid @RequestBody ApproveGarageRequest request
    ) {
        GarageResponse response = garageService.moderateGarage(id, request);
        return ResponseEntity.ok(ApiResponse.success("Kiểm duyệt hồ sơ garage thành công!", response));
    }
}
