package com.prm393.floodrescue.features.garage.controller;

import com.prm393.floodrescue.common.dto.ApiResponse;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.garage.dto.*;
import com.prm393.floodrescue.features.garage.entity.BranchStatus;
import com.prm393.floodrescue.features.garage.service.GarageBranchService;
import com.prm393.floodrescue.features.garage.service.GarageService;
import com.prm393.floodrescue.features.garage.service.ServicePricingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/garages")
@RequiredArgsConstructor
@Tag(name = "Garage Management", description = "Đăng ký garage, quản lý chi nhánh và thiết lập bảng giá cứu hộ")
@SecurityRequirement(name = "bearerAuth")
public class GarageController {

    private final GarageService garageService;
    private final GarageBranchService branchService;
    private final ServicePricingService pricingService;

    // UC-02: Register Garage & Submit Credentials
    @PostMapping("/register")
    @Operation(summary = "UC-02: Đăng ký thông tin và nộp hồ sơ Garage")
    public ResponseEntity<ApiResponse<GarageResponse>> registerGarage(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody RegisterGarageRequest request
    ) {
        GarageResponse response = garageService.registerGarage(user, request);
        return ResponseEntity.ok(ApiResponse.success("Nộp hồ sơ đăng ký garage thành công. Vui lòng chờ Staff phê duyệt!", response));
    }

    // Get current garage profile
    @GetMapping("/me")
    @Operation(summary = "Lấy thông tin hồ sơ Garage của tài khoản đang đăng nhập")
    public ResponseEntity<ApiResponse<GarageResponse>> getMyGarage(@AuthenticationPrincipal User user) {
        GarageResponse response = garageService.getCurrentGarage(user);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    // UC-04: Manage Garage Branches
    @GetMapping("/branches")
    @Operation(summary = "UC-04: Lấy danh sách chi nhánh của Garage")
    public ResponseEntity<ApiResponse<List<GarageBranchResponse>>> getMyBranches(@AuthenticationPrincipal User user) {
        List<GarageBranchResponse> branches = branchService.getBranchesByCurrentUser(user);
        return ResponseEntity.ok(ApiResponse.success(branches));
    }

    @PostMapping("/branches")
    @PreAuthorize("hasRole('GARAGE_OWNER')")
    @Operation(summary = "UC-04: Thêm mới chi nhánh cho Garage")
    public ResponseEntity<ApiResponse<GarageBranchResponse>> createBranch(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CreateBranchRequest request
    ) {
        GarageBranchResponse response = branchService.createBranch(user, request);
        return ResponseEntity.ok(ApiResponse.success("Thêm chi nhánh mới thành công!", response));
    }

    @PutMapping("/branches/{id}")
    @PreAuthorize("hasRole('GARAGE_OWNER')")
    @Operation(summary = "UC-04: Cập nhật thông tin chi nhánh")
    public ResponseEntity<ApiResponse<GarageBranchResponse>> updateBranch(
            @AuthenticationPrincipal User user,
            @PathVariable("id") Long id,
            @Valid @RequestBody UpdateBranchRequest request
    ) {
        GarageBranchResponse response = branchService.updateBranch(user, id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật chi nhánh thành công!", response));
    }

    @PatchMapping("/branches/{id}/status")
    @PreAuthorize("hasRole('GARAGE_OWNER')")
    @Operation(summary = "UC-04: Đổi trạng thái hoạt động của chi nhánh (OPEN/CLOSED_MAINTENANCE)")
    public ResponseEntity<ApiResponse<GarageBranchResponse>> toggleBranchStatus(
            @AuthenticationPrincipal User user,
            @PathVariable("id") Long id,
            @RequestParam(value = "status", required = false) BranchStatus status
    ) {
        GarageBranchResponse response = branchService.toggleBranchStatus(user, id, status);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái chi nhánh thành công!", response));
    }

    // UC-06: Configure Service Catalog & Pricing
    @GetMapping("/services")
    @Operation(summary = "UC-06: Lấy danh sách dịch vụ cứu hộ và giá của Garage")
    public ResponseEntity<ApiResponse<List<ServiceItemDto>>> getMyServices(@AuthenticationPrincipal User user) {
        List<ServiceItemDto> services = pricingService.getServicesByCurrentUser(user);
        return ResponseEntity.ok(ApiResponse.success(services));
    }

    @PostMapping("/services")
    @PreAuthorize("hasRole('GARAGE_OWNER')")
    @Operation(summary = "UC-06: Thêm dịch vụ cứu hộ mới vào bảng giá")
    public ResponseEntity<ApiResponse<ServiceItemDto>> createService(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody ServiceItemDto dto
    ) {
        ServiceItemDto response = pricingService.createServiceItem(user, dto);
        return ResponseEntity.ok(ApiResponse.success("Thêm dịch vụ cứu hộ mới thành công!", response));
    }

    @PutMapping("/services/{id}")
    @PreAuthorize("hasRole('GARAGE_OWNER')")
    @Operation(summary = "UC-06: Cập nhật dịch vụ cứu hộ và đơn giá")
    public ResponseEntity<ApiResponse<ServiceItemDto>> updateService(
            @AuthenticationPrincipal User user,
            @PathVariable("id") Long id,
            @Valid @RequestBody ServiceItemDto dto
    ) {
        ServiceItemDto response = pricingService.updateServiceItem(user, id, dto);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật dịch vụ thành công!", response));
    }

    @DeleteMapping("/services/{id}")
    @PreAuthorize("hasRole('GARAGE_OWNER')")
    @Operation(summary = "UC-06: Xóa dịch vụ cứu hộ khỏi bảng giá")
    public ResponseEntity<ApiResponse<Map<String, String>>> deleteService(
            @AuthenticationPrincipal User user,
            @PathVariable("id") Long id
    ) {
        pricingService.deleteServiceItem(user, id);
        return ResponseEntity.ok(ApiResponse.success("Đã xóa dịch vụ khỏi bảng giá", Map.of("message", "Deleted")));
    }

    // Public API: get active services of a garage for customers
    @GetMapping("/{id}/services")
    @Operation(summary = "Lấy danh sách dịch vụ công khai của Garage (Public)")
    @SecurityRequirements
    public ResponseEntity<ApiResponse<List<ServiceItemDto>>> getPublicServices(@PathVariable("id") Long id) {
        List<ServiceItemDto> services = pricingService.getPublicServicesByGarage(id);
        return ResponseEntity.ok(ApiResponse.success(services));
    }
}
