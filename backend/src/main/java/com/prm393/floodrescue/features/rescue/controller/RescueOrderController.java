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
import com.prm393.floodrescue.features.garage.entity.ServiceType;
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
@Tag(name = "Rescue Order", description = "Quáº£n lÃ½ luá»“ng cá»©u há»™ chá»Ÿ xe vÆ°á»£t ngáº­p Ä‘Æ¡n láº»")
public class RescueOrderController {

    private final RescuePricingService pricingService;
    private final RescueDispatchService dispatchService;
    private final RescueTrackingService trackingService;
    private final RescueExecutionService executionService;

    @GetMapping("/api/v1/rescue/crossing/options")
    @Operation(summary = "Láº¥y danh sÃ¡ch gara Ä‘á»§ Ä‘iá»u kiá»‡n vÃ  dá»‹ch vá»¥ chá»Ÿ xe vÆ°á»£t ngáº­p Ä‘ang hoáº¡t Ä‘á»™ng")
    public ResponseEntity<ApiResponse<List<CrossingOptionDto>>> getCrossingOptions(
            @RequestParam(required = false) Double pickupLatitude,
            @RequestParam(required = false) Double pickupLongitude
    ) {
        List<CrossingOptionDto> options = pricingService.getEligibleCrossingGarages(pickupLatitude, pickupLongitude);
        return ResponseEntity.ok(ApiResponse.success("Láº¥y danh sÃ¡ch lá»±a chá»n chá»Ÿ xe vÆ°á»£t ngáº­p thÃ nh cÃ´ng", options));
    }

    @GetMapping("/api/v1/rescue/options")
    @Operation(summary = "Láº¥y gara Ä‘á»§ Ä‘iá»u kiá»‡n theo loáº¡i dá»‹ch vá»¥ cá»©u há»™")
    public ResponseEntity<ApiResponse<List<CrossingOptionDto>>> getRescueOptions(
            @RequestParam ServiceType serviceType,
            @RequestParam(required = false) Double pickupLatitude,
            @RequestParam(required = false) Double pickupLongitude
    ) {
        List<CrossingOptionDto> options = pricingService.getEligibleGarages(serviceType, pickupLatitude, pickupLongitude);
        return ResponseEntity.ok(ApiResponse.success("Láº¥y danh sÃ¡ch lá»±a chá»n cá»©u há»™ thÃ nh cÃ´ng", options));
    }

    @PostMapping("/api/v1/rescue/orders")
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(summary = "KhÃ¡ch hÃ ng táº¡o yÃªu cáº§u SOS theo loáº¡i dá»‹ch vá»¥ Ä‘Ã£ chá»n")
    public ResponseEntity<ApiResponse<RescueOrderResponse>> createSingleCrossingOrder(
            @AuthenticationPrincipal User customer,
            @Valid @RequestBody CreateRescueOrderRequest request
    ) {
        RescueOrderResponse response = dispatchService.createSingleCrossingOrder(customer, request);
        return ResponseEntity.ok(ApiResponse.success(
                "Táº¡o yÃªu cáº§u cá»©u há»™ thÃ nh cÃ´ng, Ä‘ang Ä‘iá»u phá»‘i thá»£", response));
    }

    @GetMapping("/api/v1/rescue/orders/active")
    @Operation(summary = "Láº¥y thÃ´ng tin Ä‘Æ¡n cá»©u há»™ Ä‘ang hoáº¡t Ä‘á»™ng cá»§a ngÆ°á»i dÃ¹ng hiá»‡n táº¡i")
    public ResponseEntity<ApiResponse<RescueOrderResponse>> getActiveOrder(
            @AuthenticationPrincipal User user
    ) {
        RescueOrderResponse response = dispatchService.getActiveOrderByUser(user);
        return ResponseEntity.ok(ApiResponse.success("Láº¥y Ä‘Æ¡n cá»©u há»™ hoáº¡t Ä‘á»™ng thÃ nh cÃ´ng", response));
    }

    @GetMapping("/api/v1/rescue/orders/{id}")
    @Operation(summary = "Láº¥y chi tiáº¿t Ä‘Æ¡n cá»©u há»™ theo ID")
    public ResponseEntity<ApiResponse<RescueOrderResponse>> getOrderById(
            @AuthenticationPrincipal User user,
            @PathVariable("id") Long id
    ) {
        RescueOrderResponse response = dispatchService.getOrderById(user, id);
        return ResponseEntity.ok(ApiResponse.success("Láº¥y chi tiáº¿t Ä‘Æ¡n cá»©u há»™ thÃ nh cÃ´ng", response));
    }

    @PostMapping("/api/v1/rescue/orders/{id}/cancel")
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(summary = "KhÃ¡ch hÃ ng há»§y Ä‘Æ¡n cá»©u há»™ trÆ°á»›c khi thá»£ nháº­n")
    public ResponseEntity<ApiResponse<RescueOrderResponse>> cancelOrder(
            @AuthenticationPrincipal User customer,
            @PathVariable("id") Long id,
            @RequestBody(required = false) CancelOrderRequest request
    ) {
        RescueOrderResponse response = dispatchService.cancelOrder(customer, id, request);
        return ResponseEntity.ok(ApiResponse.success("Há»§y yÃªu cáº§u cá»©u há»™ thÃ nh cÃ´ng", response));
    }

    @GetMapping("/api/v1/rescue/offers/pending")
    @PreAuthorize("hasRole('FIELD_MECHANIC')")
    @Operation(summary = "Thá»£ láº¥y danh sÃ¡ch offer Ä‘iá»u phá»‘i Ä‘ang chá» tiáº¿p nháº­n (trong 45 giÃ¢y)")
    public ResponseEntity<ApiResponse<List<RescueOfferResponse>>> getPendingOffers(
            @AuthenticationPrincipal User mechanicUser
    ) {
        List<RescueOfferResponse> offers = dispatchService.getPendingOffersForMechanic(mechanicUser);
        return ResponseEntity.ok(ApiResponse.success("Láº¥y danh sÃ¡ch offer chá» nháº­n thÃ nh cÃ´ng", offers));
    }

    @PostMapping("/api/v1/rescue/offers/{offerId}/accept")
    @PreAuthorize("hasRole('FIELD_MECHANIC')")
    @Operation(summary = "Thá»£ cháº¥p nháº­n cuá»‘c cá»©u há»™ Ä‘Æ°á»£c Ä‘iá»u phá»‘i")
    public ResponseEntity<ApiResponse<RescueOrderResponse>> acceptOffer(
            @AuthenticationPrincipal User mechanicUser,
            @PathVariable("offerId") Long offerId
    ) {
        RescueOrderResponse response = dispatchService.acceptOffer(mechanicUser, offerId);
        return ResponseEntity.ok(ApiResponse.success("Tiáº¿p nháº­n cuá»‘c cá»©u há»™ thÃ nh cÃ´ng!", response));
    }

    @PostMapping("/api/v1/rescue/offers/{offerId}/reject")
    @PreAuthorize("hasRole('FIELD_MECHANIC')")
    @Operation(summary = "Thá»£ tá»« chá»‘i offer Ä‘iá»u phá»‘i")
    public ResponseEntity<ApiResponse<Void>> rejectOffer(
            @AuthenticationPrincipal User mechanicUser,
            @PathVariable("offerId") Long offerId,
            @RequestParam(value = "reason", required = false, defaultValue = "Thá»£ báº­n hoáº·c quÃ¡ xa") String reason
    ) {
        dispatchService.rejectOffer(mechanicUser, offerId, reason);
        return ResponseEntity.ok(ApiResponse.success("ÄÃ£ tá»« chá»‘i nháº­n cuá»‘c", null));
    }

    @PostMapping("/api/v1/rescue/orders/{id}/location")
    @PreAuthorize("hasRole('FIELD_MECHANIC')")
    @Operation(summary = "Thá»£ gá»­i tá»a Ä‘á»™ GPS Ä‘á»‹nh ká»³ lÃªn há»‡ thá»‘ng")
    public ResponseEntity<ApiResponse<TrackingSnapshotDto>> updateLocation(
            @AuthenticationPrincipal User mechanicUser,
            @PathVariable("id") Long id,
            @Valid @RequestBody LocationUpdateDto location
    ) {
        TrackingSnapshotDto snapshot = trackingService.updateMechanicLocation(mechanicUser, id, location);
        return ResponseEntity.ok(ApiResponse.success("Cáº­p nháº­t vá»‹ trÃ­ thá»£ thÃ nh cÃ´ng", snapshot));
    }

    @GetMapping("/api/v1/rescue/orders/{id}/tracking")
    @Operation(summary = "Láº¥y snapshot vá»‹ trÃ­ thá»£ vÃ  tráº¡ng thÃ¡i dáº«n Ä‘Æ°á»ng thá»i gian thá»±c")
    public ResponseEntity<ApiResponse<TrackingSnapshotDto>> getTracking(
            @AuthenticationPrincipal User user,
            @PathVariable("id") Long id
    ) {
        TrackingSnapshotDto snapshot = trackingService.getTrackingSnapshot(user, id);
        return ResponseEntity.ok(ApiResponse.success("Láº¥y thÃ´ng tin tracking thÃ nh cÃ´ng", snapshot));
    }

    @PostMapping({"/api/v1/rescue/orders/{id}/arrived", "/api/v1/rescue/orders/{id}/arrive"})
    @PreAuthorize("hasRole('FIELD_MECHANIC')")
    @Operation(summary = "Thá»£ xÃ¡c nháº­n Ä‘Ã£ Ä‘áº¿n hiá»‡n trÆ°á»ng (<30m)")
    public ResponseEntity<ApiResponse<RescueOrderResponse>> confirmArrival(
            @AuthenticationPrincipal User mechanicUser,
            @PathVariable("id") Long id,
            @Valid @RequestBody ConfirmArrivalRequest request
    ) {
        RescueOrderResponse response = executionService.confirmArrival(mechanicUser, id, request);
        return ResponseEntity.ok(ApiResponse.success("XÃ¡c nháº­n Ä‘Ã£ Ä‘áº¿n hiá»‡n trÆ°á»ng Ä‘Ã³n xe thÃ nh cÃ´ng!", response));
    }

    @PostMapping("/api/v1/rescue/orders/{id}/transit-stage")
    @PreAuthorize("hasRole('FIELD_MECHANIC')")
    @Operation(summary = "Thá»£ cáº­p nháº­t tiáº¿n Ä‘á»™ chá»Ÿ xe Ä‘Æ¡n láº» (nháº­n xe, cháº±ng buá»™c, Ä‘ang chá»Ÿ, Ä‘áº¿n Ä‘iá»ƒm tráº£, bÃ n giao)")
    public ResponseEntity<ApiResponse<RescueOrderResponse>> updateTransitStage(
            @AuthenticationPrincipal User mechanicUser,
            @PathVariable("id") Long id,
            @Valid @RequestBody TransitStageRequest request
    ) {
        RescueOrderResponse response = executionService.updateTransitStage(mechanicUser, id, request);
        return ResponseEntity.ok(ApiResponse.success("Cáº­p nháº­t tiáº¿n Ä‘á»™ chá»Ÿ xe thÃ nh cÃ´ng", response));
    }

    @PostMapping(value = "/api/v1/rescue/orders/{id}/evidence", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('FIELD_MECHANIC')")
    @Operation(summary = "Thá»£ táº£i áº£nh báº±ng chá»©ng nghiá»‡m thu bÃ n giao xe")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> uploadOrderEvidence(
            @AuthenticationPrincipal User mechanicUser,
            @PathVariable("id") Long id,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
            @RequestParam(value = "evidenceType", defaultValue = "COMPLETION") String evidenceType
    ) {
        var evidence = executionService.uploadOrderEvidence(mechanicUser, id, file, evidenceType);
        return ResponseEntity.ok(ApiResponse.success("Táº£i áº£nh báº±ng chá»©ng thÃ nh cÃ´ng",
                java.util.Map.of("id", evidence.getId(), "url", evidence.getFileUrl())));
    }

    @PostMapping("/api/v1/rescue/orders/{id}/complete")
    @PreAuthorize("hasRole('FIELD_MECHANIC')")
    @Operation(summary = "Thá»£ hoÃ n táº¥t nghiá»‡m thu ca chá»Ÿ xe (báº¯t buá»™c cÃ³ áº£nh bÃ n giao)")
    public ResponseEntity<ApiResponse<RescueOrderResponse>> completeOrder(
            @AuthenticationPrincipal User mechanicUser,
            @PathVariable("id") Long id,
            @Valid @RequestBody CompleteOrderRequest request
    ) {
        RescueOrderResponse response = executionService.completeOrder(mechanicUser, id, request);
        return ResponseEntity.ok(ApiResponse.success("HoÃ n táº¥t ca cá»©u há»™ thÃ nh cÃ´ng, chuyá»ƒn sang chá» thanh toÃ¡n", response));
    }

    @GetMapping("/api/v1/rescue/orders/history")
    @Operation(summary = "Xem lá»‹ch sá»­ cÃ¡c Ä‘Æ¡n cá»©u há»™ cá»§a ngÆ°á»i dÃ¹ng")
    public ResponseEntity<ApiResponse<List<RescueOrderResponse>>> getHistory(
            @AuthenticationPrincipal User user
    ) {
        List<RescueOrderResponse> responses = dispatchService.getHistory(user);
        return ResponseEntity.ok(ApiResponse.success("Láº¥y lá»‹ch sá»­ Ä‘Æ¡n cá»©u há»™ thÃ nh cÃ´ng", responses));
    }

    @GetMapping("/api/v1/staff/rescue/orders")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    @Operation(summary = "Staff/Admin giÃ¡m sÃ¡t toÃ n bá»™ Ä‘Æ¡n cá»©u há»™ trÃªn há»‡ thá»‘ng")
    public ResponseEntity<ApiResponse<List<RescueOrderResponse>>> getStaffOrders(
            @AuthenticationPrincipal User user
    ) {
        List<RescueOrderResponse> responses = dispatchService.getStaffOrders(user);
        return ResponseEntity.ok(ApiResponse.success("Láº¥y danh sÃ¡ch giÃ¡m sÃ¡t Ä‘Æ¡n cá»©u há»™ thÃ nh cÃ´ng", responses));
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

    @PostMapping("/api/v1/staff/rescue/orders/{id}/assign")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    @Operation(summary = "Staff/Admin điều phối thủ công KTV cho ca cứu hộ")
    public ResponseEntity<ApiResponse<RescueOrderResponse>> staffAssignMechanic(
            @PathVariable("id") Long id,
            @RequestBody @Valid StaffAssignMechanicRequest request,
            @AuthenticationPrincipal User user
    ) {
        RescueOrderResponse response = dispatchService.staffAssignMechanic(user, id, request.getMechanicStaffId());
        return ResponseEntity.ok(ApiResponse.success("Điều phối kỹ thuật viên thành công", response));
    }

    @PostMapping("/api/v1/staff/rescue/orders/{id}/retry-dispatch")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    @Operation(summary = "Staff/Admin kích hoạt tìm kiếm lại KTV")
    public ResponseEntity<ApiResponse<RescueOrderResponse>> staffRetryDispatch(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal User user
    ) {
        RescueOrderResponse response = dispatchService.staffRetryDispatch(user, id);
        return ResponseEntity.ok(ApiResponse.success("Đã kích hoạt tìm lại kỹ thuật viên", response));
    }

    @PostMapping("/api/v1/staff/rescue/orders/{id}/cancel")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    @Operation(summary = "Staff/Admin hủy ca cứu hộ khẩn cấp")
    public ResponseEntity<ApiResponse<RescueOrderResponse>> staffCancelOrder(
            @PathVariable("id") Long id,
            @RequestBody(required = false) CancelOrderRequest request,
            @AuthenticationPrincipal User user
    ) {
        RescueOrderResponse response = dispatchService.staffCancelOrder(user, id, request);
        return ResponseEntity.ok(ApiResponse.success("Hủy ca cứu hộ thành công", response));
    }
}