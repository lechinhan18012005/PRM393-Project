package com.prm393.floodrescue.features.rescue.controller;

import com.prm393.floodrescue.common.dto.ApiResponse;
import com.prm393.floodrescue.features.auth.entity.Role;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.garage.entity.Garage;
import com.prm393.floodrescue.features.garage.repository.GarageRepository;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStaff;
import com.prm393.floodrescue.features.mechanic.repository.MechanicStaffRepository;
import com.prm393.floodrescue.features.rescue.dto.*;
import com.prm393.floodrescue.features.rescue.entity.RescueOrder;
import com.prm393.floodrescue.features.rescue.repository.RescueOrderRepository;
import com.prm393.floodrescue.features.rescue.service.RescueDispatchService;
import com.prm393.floodrescue.features.rescue.service.RescueExecutionService;
import com.prm393.floodrescue.features.rescue.service.RescuePricingService;
import com.prm393.floodrescue.features.rescue.service.RescueTrackingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Rescue Order", description = "Quản lý luồng cứu hộ chở xe vượt ngập đơn lẻ")
public class RescueOrderController {

    private final RescuePricingService pricingService;
    private final RescueDispatchService dispatchService;
    private final RescueTrackingService trackingService;
    private final RescueExecutionService executionService;

    @GetMapping("/api/v1/rescue/crossing/options")
    @Operation(summary = "Lấy danh sách gara đủ điều kiện và dịch vụ chở xe vượt ngập đang hoạt động")
    public ResponseEntity<ApiResponse<List<CrossingOptionDto>>> getCrossingOptions(
            @RequestParam(required = false) Double pickupLatitude,
            @RequestParam(required = false) Double pickupLongitude
    ) {
        List<CrossingOptionDto> options = pricingService.getEligibleCrossingGarages(pickupLatitude, pickupLongitude);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách lựa chọn chở xe vượt ngập thành công", options));
    }

    @PostMapping("/api/v1/rescue/orders")
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(summary = "Khách hàng tạo yêu cầu SOS chở xe vượt ngập đơn lẻ")
    public ResponseEntity<ApiResponse<RescueOrderResponse>> createSingleCrossingOrder(
            @AuthenticationPrincipal User customer,
            @Valid @RequestBody CreateRescueOrderRequest request
    ) {
        RescueOrderResponse response = dispatchService.createSingleCrossingOrder(customer, request);
        return ResponseEntity.ok(ApiResponse.success("Tạo yêu cầu cứu hộ thành công, đang điều phối thợ", response));
    }

    @GetMapping("/api/v1/rescue/orders/active")
    @Operation(summary = "Lấy thông tin đơn cứu hộ đang hoạt động của người dùng hiện tại")
    public ResponseEntity<ApiResponse<RescueOrderResponse>> getActiveOrder(
            @AuthenticationPrincipal User user
    ) {
        RescueOrderResponse response = dispatchService.getActiveOrderByUser(user);
        return ResponseEntity.ok(ApiResponse.success("Lấy đơn cứu hộ hoạt động thành công", response));
    }

    @GetMapping("/api/v1/rescue/orders/{id}")
    @Operation(summary = "Lấy chi tiết đơn cứu hộ theo ID")
    public ResponseEntity<ApiResponse<RescueOrderResponse>> getOrderById(
            @AuthenticationPrincipal User user,
            @PathVariable("id") Long id
    ) {
        RescueOrderResponse response = dispatchService.getOrderById(user, id);
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết đơn cứu hộ thành công", response));
    }

    @PostMapping("/api/v1/rescue/orders/{id}/cancel")
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(summary = "Khách hàng hủy đơn cứu hộ trước khi thợ nhận")
    public ResponseEntity<ApiResponse<RescueOrderResponse>> cancelOrder(
            @AuthenticationPrincipal User customer,
            @PathVariable("id") Long id,
            @RequestBody(required = false) CancelOrderRequest request
    ) {
        RescueOrderResponse response = dispatchService.cancelOrder(customer, id, request);
        return ResponseEntity.ok(ApiResponse.success("Hủy yêu cầu cứu hộ thành công", response));
    }

    @GetMapping("/api/v1/rescue/offers/pending")
    @PreAuthorize("hasRole('FIELD_MECHANIC')")
    @Operation(summary = "Thợ lấy danh sách offer điều phối đang chờ tiếp nhận (trong 45 giây)")
    public ResponseEntity<ApiResponse<List<RescueOfferResponse>>> getPendingOffers(
            @AuthenticationPrincipal User mechanicUser
    ) {
        List<RescueOfferResponse> offers = dispatchService.getPendingOffersForMechanic(mechanicUser);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách offer chờ nhận thành công", offers));
    }

    @PostMapping("/api/v1/rescue/offers/{offerId}/accept")
    @PreAuthorize("hasRole('FIELD_MECHANIC')")
    @Operation(summary = "Thợ chấp nhận cuốc cứu hộ được điều phối")
    public ResponseEntity<ApiResponse<RescueOrderResponse>> acceptOffer(
            @AuthenticationPrincipal User mechanicUser,
            @PathVariable("offerId") Long offerId
    ) {
        RescueOrderResponse response = dispatchService.acceptOffer(mechanicUser, offerId);
        return ResponseEntity.ok(ApiResponse.success("Tiếp nhận cuốc cứu hộ thành công!", response));
    }

    @PostMapping("/api/v1/rescue/offers/{offerId}/reject")
    @PreAuthorize("hasRole('FIELD_MECHANIC')")
    @Operation(summary = "Thợ từ chối offer điều phối")
    public ResponseEntity<ApiResponse<Void>> rejectOffer(
            @AuthenticationPrincipal User mechanicUser,
            @PathVariable("offerId") Long offerId,
            @RequestParam(value = "reason", required = false, defaultValue = "Thợ bận hoặc quá xa") String reason
    ) {
        dispatchService.rejectOffer(mechanicUser, offerId, reason);
        return ResponseEntity.ok(ApiResponse.success("Đã từ chối nhận cuốc", null));
    }

    @PostMapping("/api/v1/rescue/orders/{id}/location")
    @PreAuthorize("hasRole('FIELD_MECHANIC')")
    @Operation(summary = "Thợ gửi tọa độ GPS định kỳ lên hệ thống")
    public ResponseEntity<ApiResponse<TrackingSnapshotDto>> updateLocation(
            @AuthenticationPrincipal User mechanicUser,
            @PathVariable("id") Long id,
            @Valid @RequestBody LocationUpdateDto location
    ) {
        TrackingSnapshotDto snapshot = trackingService.updateMechanicLocation(mechanicUser, id, location);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật vị trí thợ thành công", snapshot));
    }

    @GetMapping("/api/v1/rescue/orders/{id}/tracking")
    @Operation(summary = "Lấy snapshot vị trí thợ và trạng thái dẫn đường thời gian thực")
    public ResponseEntity<ApiResponse<TrackingSnapshotDto>> getTracking(
            @AuthenticationPrincipal User user,
            @PathVariable("id") Long id
    ) {
        TrackingSnapshotDto snapshot = trackingService.getTrackingSnapshot(user, id);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin tracking thành công", snapshot));
    }

    @PostMapping({"/api/v1/rescue/orders/{id}/arrived", "/api/v1/rescue/orders/{id}/arrive"})
    @PreAuthorize("hasRole('FIELD_MECHANIC')")
    @Operation(summary = "Thợ xác nhận đã đến hiện trường (<30m)")
    public ResponseEntity<ApiResponse<RescueOrderResponse>> confirmArrival(
            @AuthenticationPrincipal User mechanicUser,
            @PathVariable("id") Long id,
            @Valid @RequestBody ConfirmArrivalRequest request
    ) {
        RescueOrderResponse response = executionService.confirmArrival(mechanicUser, id, request);
        return ResponseEntity.ok(ApiResponse.success("Xác nhận đã đến hiện trường đón xe thành công!", response));
    }

    @PostMapping("/api/v1/rescue/orders/{id}/transit-stage")
    @PreAuthorize("hasRole('FIELD_MECHANIC')")
    @Operation(summary = "Thợ cập nhật tiến độ chở xe đơn lẻ (nhận xe, chằng buộc, đang chở, đến điểm trả, bàn giao)")
    public ResponseEntity<ApiResponse<RescueOrderResponse>> updateTransitStage(
            @AuthenticationPrincipal User mechanicUser,
            @PathVariable("id") Long id,
            @Valid @RequestBody TransitStageRequest request
    ) {
        RescueOrderResponse response = executionService.updateTransitStage(mechanicUser, id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật tiến độ chở xe thành công", response));
    }

    @PostMapping(value = "/api/v1/rescue/orders/{id}/evidence", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('FIELD_MECHANIC')")
    @Operation(summary = "Thợ tải ảnh bằng chứng nghiệm thu bàn giao xe")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> uploadOrderEvidence(
            @AuthenticationPrincipal User mechanicUser,
            @PathVariable("id") Long id,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
            @RequestParam(value = "evidenceType", defaultValue = "COMPLETION") String evidenceType
    ) {
        var evidence = executionService.uploadOrderEvidence(mechanicUser, id, file, evidenceType);
        return ResponseEntity.ok(ApiResponse.success("Tải ảnh bằng chứng thành công",
                java.util.Map.of("id", evidence.getId(), "url", evidence.getFileUrl())));
    }

    @PostMapping("/api/v1/rescue/orders/{id}/complete")
    @PreAuthorize("hasRole('FIELD_MECHANIC')")
    @Operation(summary = "Thợ hoàn tất nghiệm thu ca chở xe (bắt buộc có ảnh bàn giao)")
    public ResponseEntity<ApiResponse<RescueOrderResponse>> completeOrder(
            @AuthenticationPrincipal User mechanicUser,
            @PathVariable("id") Long id,
            @Valid @RequestBody CompleteOrderRequest request
    ) {
        RescueOrderResponse response = executionService.completeOrder(mechanicUser, id, request);
        return ResponseEntity.ok(ApiResponse.success("Hoàn tất ca cứu hộ thành công, chuyển sang chờ thanh toán", response));
    }

    @GetMapping("/api/v1/rescue/orders/history")
    @Operation(summary = "Xem lịch sử các đơn cứu hộ của người dùng")
    public ResponseEntity<ApiResponse<List<RescueOrderResponse>>> getHistory(
            @AuthenticationPrincipal User user
    ) {
        List<RescueOrderResponse> responses = dispatchService.getHistory(user);
        return ResponseEntity.ok(ApiResponse.success("Lấy lịch sử đơn cứu hộ thành công", responses));
    }

    @GetMapping("/api/v1/staff/rescue/orders")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    @Operation(summary = "Staff/Admin giám sát toàn bộ đơn cứu hộ trên hệ thống")
    public ResponseEntity<ApiResponse<List<RescueOrderResponse>>> getStaffOrders(
            @AuthenticationPrincipal User user
    ) {
        List<RescueOrderResponse> responses = dispatchService.getStaffOrders(user);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách giám sát đơn cứu hộ thành công", responses));
    }

    @GetMapping("/api/v1/garage/rescue/orders")
    @PreAuthorize("hasRole('GARAGE_OWNER')")
    @Operation(summary = "Chủ gara xem các đơn cứu hộ thuộc gara của mình")
    public ResponseEntity<ApiResponse<List<RescueOrderResponse>>> getGarageOrders(
            @AuthenticationPrincipal User owner
    ) {
        List<RescueOrderResponse> responses = dispatchService.getGarageOrders(owner);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đơn cứu hộ của gara thành công", responses));
    }
}
