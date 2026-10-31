package com.prm393.floodrescue.features.garage.controller;

import com.prm393.floodrescue.common.dto.ApiResponse;
import com.prm393.floodrescue.features.garage.dto.CreatePriceCeilingRequest;
import com.prm393.floodrescue.features.garage.dto.PriceCeilingDto;
import com.prm393.floodrescue.features.garage.service.PriceCeilingService;
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
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(
        name = "Price Ceiling Governance",
        description = "UC-19: Quản lý Khung giá trần của sàn chống nâng giá mùa thiên tai")
public class PriceCeilingController {

    private final PriceCeilingService priceCeilingService;

    @GetMapping("/price-ceilings")
    @Operation(summary = "Lấy danh sách các khung giá trần đang có hiệu lực của hệ thống")
    public ResponseEntity<ApiResponse<List<PriceCeilingDto>>> getActivePriceCeilings() {
        return ResponseEntity.ok(ApiResponse.success(priceCeilingService.getActiveCeilings()));
    }

    @GetMapping("/admin/price-ceilings")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "UC-19: Admin/Staff xem toàn bộ quy định giá trần sàn")
    public ResponseEntity<ApiResponse<List<PriceCeilingDto>>> getAllPriceCeilings() {
        return ResponseEntity.ok(ApiResponse.success(priceCeilingService.getAllCeilings()));
    }

    @PostMapping("/admin/price-ceilings")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "UC-19: Thiết lập khung giá trần mới")
    public ResponseEntity<ApiResponse<PriceCeilingDto>> createPriceCeiling(
            @Valid @RequestBody CreatePriceCeilingRequest request) {
        PriceCeilingDto response = priceCeilingService.createCeiling(request);
        return ResponseEntity.ok(ApiResponse.success("Tạo quy định giá trần thành công!", response));
    }

    @PutMapping("/admin/price-ceilings/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "UC-19: Cập nhật mức giá trần")
    public ResponseEntity<ApiResponse<PriceCeilingDto>> updatePriceCeiling(
            @PathVariable("id") Long id, @Valid @RequestBody CreatePriceCeilingRequest request) {
        PriceCeilingDto response = priceCeilingService.updateCeiling(id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật quy định giá trần thành công!", response));
    }

    @PatchMapping("/admin/price-ceilings/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "UC-19: Bật/Tắt hiệu lực khung giá trần")
    public ResponseEntity<ApiResponse<Void>> togglePriceCeilingStatus(
            @PathVariable("id") Long id, @RequestParam("active") boolean active) {
        priceCeilingService.toggleCeilingStatus(id, active);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái giá trần thành công!", null));
    }
}
