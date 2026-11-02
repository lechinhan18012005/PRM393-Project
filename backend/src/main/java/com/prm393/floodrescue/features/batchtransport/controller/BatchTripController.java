package com.prm393.floodrescue.features.batchtransport.controller;

import com.prm393.floodrescue.common.dto.ApiResponse;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.batchtransport.dto.*;
import com.prm393.floodrescue.features.batchtransport.service.BatchTripService;
import com.prm393.floodrescue.common.contracts.dto.OrderSnapshot;
import com.prm393.floodrescue.features.execution.dto.CompletionEvidenceRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/batch-trips")
@RequiredArgsConstructor
public class BatchTripController {
    private final BatchTripService batchTripService;

    @PostMapping
    @PreAuthorize("hasAnyRole('FIELD_MECHANIC','GARAGE_OWNER')")
    public ResponseEntity<ApiResponse<BatchTripResponse>> create(
            @AuthenticationPrincipal User user, @Valid @RequestBody CreateBatchTripRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đã mở chuyến gom trong 10 phút", batchTripService.create(user, request)));
    }

    @GetMapping("/nearby")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<List<BatchTripResponse>>> nearby(
            @RequestParam double latitude, @RequestParam double longitude,
            @RequestParam(defaultValue = "5") double radiusKm,
            @RequestParam(required = false) Long garageId,
            @RequestParam(required = false) Double destinationLatitude,
            @RequestParam(required = false) Double destinationLongitude) {
        return ResponseEntity.ok(ApiResponse.success(
                batchTripService.nearby(latitude, longitude, radiusKm, garageId,
                        destinationLatitude, destinationLongitude)));
    }

    @GetMapping("/mine")
    @PreAuthorize("hasAnyRole('FIELD_MECHANIC','GARAGE_OWNER')")
    public ResponseEntity<ApiResponse<List<BatchTripResponse>>> mine(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success(batchTripService.mine(user)));
    }

    @GetMapping("/monitor")
    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    public ResponseEntity<ApiResponse<List<BatchTripResponse>>> monitor() {
        return ResponseEntity.ok(ApiResponse.success(batchTripService.allForStaff()));
    }

    @GetMapping("/{tripId}/orders")
    public ResponseEntity<ApiResponse<List<OrderSnapshot>>> orders(
            @PathVariable Long tripId, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success(batchTripService.orders(tripId, user)));
    }

    @PostMapping("/{tripId}/join")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<BatchTripResponse>> join(
            @PathVariable Long tripId, @AuthenticationPrincipal User user,
            @Valid @RequestBody BatchOrderRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đã tham gia chuyến gom",
                batchTripService.join(tripId, request.getOrderId(), user)));
    }

    @PostMapping("/{tripId}/join-new")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<JoinBatchTripResponse>> createOrderAndJoin(
            @PathVariable Long tripId, @AuthenticationPrincipal User user,
            @Valid @RequestBody JoinBatchTripRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đã tạo đơn và giữ chỗ trong chuyến gom",
                batchTripService.createOrderAndJoin(tripId, request, user)));
    }

    @PostMapping("/{tripId}/leave")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<BatchTripResponse>> leave(
            @PathVariable Long tripId, @AuthenticationPrincipal User user,
            @Valid @RequestBody BatchOrderRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đã rời chuyến gom",
                batchTripService.leave(tripId, request.getOrderId(), user)));
    }

    @PostMapping("/{tripId}/convert-private")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<BatchTripResponse>> convertPrivate(
            @PathVariable Long tripId, @AuthenticationPrincipal User user,
            @Valid @RequestBody BatchOrderRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đã chuyển sang cứu hộ riêng",
                batchTripService.convertToPrivate(tripId, request.getOrderId(), user)));
    }

    @PostMapping("/{tripId}/start-pickup")
    @PreAuthorize("hasRole('FIELD_MECHANIC')")
    public ResponseEntity<ApiResponse<BatchTripResponse>> startPickup(
            @PathVariable Long tripId, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success("Bắt đầu đón xe", batchTripService.startPickup(tripId, user)));
    }

    @PostMapping("/{tripId}/orders/{orderId}/picked-up")
    @PreAuthorize("hasRole('FIELD_MECHANIC')")
    public ResponseEntity<ApiResponse<BatchTripResponse>> pickedUp(
            @PathVariable Long tripId, @PathVariable Long orderId, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success("Đã xác nhận đón xe", batchTripService.markPickedUp(tripId, orderId, user)));
    }

    @PostMapping("/{tripId}/start-moving")
    @PreAuthorize("hasRole('FIELD_MECHANIC')")
    public ResponseEntity<ApiResponse<BatchTripResponse>> startMoving(
            @PathVariable Long tripId, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success("Chuyến bắt đầu di chuyển", batchTripService.startMoving(tripId, user)));
    }

    @PostMapping("/{tripId}/orders/{orderId}/delivered")
    @PreAuthorize("hasRole('FIELD_MECHANIC')")
    public ResponseEntity<ApiResponse<BatchTripResponse>> delivered(
            @PathVariable Long tripId, @PathVariable Long orderId, @AuthenticationPrincipal User user,
            @Valid @RequestBody CompletionEvidenceRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đã xác nhận trả xe",
                batchTripService.markDelivered(tripId, orderId, request.getCompletionImageUrl(), user)));
    }

    @PostMapping("/{tripId}/complete")
    @PreAuthorize("hasRole('FIELD_MECHANIC')")
    public ResponseEntity<ApiResponse<BatchTripResponse>> complete(
            @PathVariable Long tripId, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success("Chuyến gom đã hoàn thành", batchTripService.complete(tripId, user)));
    }

    @PostMapping("/{tripId}/cancel")
    @PreAuthorize("hasRole('FIELD_MECHANIC')")
    public ResponseEntity<ApiResponse<BatchTripResponse>> cancel(
            @PathVariable Long tripId, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success("Đã hủy chuyến gom", batchTripService.cancel(tripId, user)));
    }
}
