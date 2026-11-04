package com.prm393.floodrescue.features.vehicle.controller;

import com.prm393.floodrescue.common.dto.ApiResponse;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.vehicle.dto.CreateVehicleRequest;
import com.prm393.floodrescue.features.vehicle.dto.VehicleDto;
import com.prm393.floodrescue.features.vehicle.service.VehicleLookupService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/vehicles")
@RequiredArgsConstructor
@Tag(name = "Vehicle Management", description = "Quản lý danh sách phương tiện cá nhân của khách hàng (FEAT-01B)")
@SecurityRequirement(name = "bearerAuth")
public class VehicleController {

    private final VehicleLookupService vehicleService;

    @GetMapping
    @Operation(summary = "Lấy danh sách tất cả các phương tiện đã đăng ký của khách hàng hiện tại")
    public ResponseEntity<ApiResponse<List<VehicleDto>>> getMyVehicles(
            @AuthenticationPrincipal User user
    ) {
        List<VehicleDto> list = vehicleService.getVehiclesByCustomer(user.getId());
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping("/default")
    @Operation(summary = "Lấy thông tin xe máy mặc định đang kích hoạt của khách hàng")
    public ResponseEntity<ApiResponse<VehicleDto>> getDefaultVehicle(
            @AuthenticationPrincipal User user
    ) {
        VehicleDto defaultVehicle = vehicleService.getDefaultVehicleByCustomer(user.getId());
        return ResponseEntity.ok(ApiResponse.success(defaultVehicle));
    }

    @GetMapping("/{vehicleId}")
    @Operation(summary = "Lấy chi tiết một phương tiện theo ID")
    public ResponseEntity<ApiResponse<VehicleDto>> getVehicleDetail(
            @AuthenticationPrincipal User user,
            @PathVariable Long vehicleId
    ) {
        VehicleDto vehicle = vehicleService.getVehicleByIdAndCustomer(vehicleId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy phương tiện với ID: " + vehicleId));
        return ResponseEntity.ok(ApiResponse.success(vehicle));
    }

    @PostMapping
    @Operation(summary = "Thêm một phương tiện mới cho khách hàng")
    public ResponseEntity<ApiResponse<VehicleDto>> addVehicle(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CreateVehicleRequest request
    ) {
        VehicleDto created = vehicleService.createVehicle(user.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Thêm phương tiện mới thành công!", created));
    }

    @PutMapping("/{vehicleId}")
    @Operation(summary = "Cập nhật thông tin phương tiện")
    public ResponseEntity<ApiResponse<VehicleDto>> updateVehicle(
            @AuthenticationPrincipal User user,
            @PathVariable Long vehicleId,
            @Valid @RequestBody CreateVehicleRequest request
    ) {
        VehicleDto updated = vehicleService.updateVehicle(user.getId(), vehicleId, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thông tin phương tiện thành công!", updated));
    }

    @DeleteMapping("/{vehicleId}")
    @Operation(summary = "Xóa phương tiện khỏi danh sách của khách hàng")
    public ResponseEntity<ApiResponse<Void>> deleteVehicle(
            @AuthenticationPrincipal User user,
            @PathVariable Long vehicleId
    ) {
        vehicleService.deleteVehicle(user.getId(), vehicleId);
        return ResponseEntity.ok(ApiResponse.success("Xóa phương tiện thành công!", null));
    }

    @PatchMapping("/{vehicleId}/default")
    @Operation(summary = "Đặt phương tiện làm xe mặc định")
    public ResponseEntity<ApiResponse<VehicleDto>> setDefaultVehicle(
            @AuthenticationPrincipal User user,
            @PathVariable Long vehicleId
    ) {
        VehicleDto selected = vehicleService.setDefaultVehicle(user.getId(), vehicleId);
        return ResponseEntity.ok(ApiResponse.success("Đã chọn phương tiện làm mặc định thành công!", selected));
    }
}
