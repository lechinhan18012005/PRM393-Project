package com.prm393.floodrescue.features.quotation.controller;

import com.prm393.floodrescue.common.dto.ApiResponse;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.common.contracts.dto.GarageServiceSnapshot;
import com.prm393.floodrescue.features.quotation.dto.*;
import com.prm393.floodrescue.features.quotation.service.QuotationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class QuotationController {
    private final QuotationService quotationService;

    @GetMapping("/rescue-orders/{orderId}/quotation-catalog")
    @PreAuthorize("hasRole('FIELD_MECHANIC')")
    public ResponseEntity<ApiResponse<List<GarageServiceSnapshot>>> catalog(
            @PathVariable Long orderId, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success(quotationService.catalog(orderId, user)));
    }

    @PostMapping("/rescue-orders/{orderId}/quotations")
    @PreAuthorize("hasRole('FIELD_MECHANIC')")
    public ResponseEntity<ApiResponse<QuotationResponse>> create(
            @PathVariable Long orderId, @AuthenticationPrincipal User user,
            @Valid @RequestBody CreateQuotationRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đã gửi báo giá cho khách hàng",
                quotationService.create(orderId, user, request)));
    }

    @GetMapping("/rescue-orders/{orderId}/quotations")
    public ResponseEntity<ApiResponse<List<QuotationResponse>>> history(
            @PathVariable Long orderId, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success(quotationService.history(orderId, user)));
    }

    @PostMapping("/quotations/{id}/approve")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<QuotationResponse>> approve(
            @PathVariable Long id, @AuthenticationPrincipal User user,
            @Valid @RequestBody QuotationDecisionRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đã chấp nhận báo giá", quotationService.approve(id, user, request)));
    }

    @PostMapping("/quotations/{id}/reject")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<QuotationResponse>> reject(
            @PathVariable Long id, @AuthenticationPrincipal User user,
            @Valid @RequestBody QuotationDecisionRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đã từ chối báo giá", quotationService.reject(id, user, request)));
    }

    @PostMapping("/quotations/{id}/request-revision")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<QuotationResponse>> requestRevision(
            @PathVariable Long id, @AuthenticationPrincipal User user,
            @Valid @RequestBody QuotationDecisionRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đã yêu cầu điều chỉnh báo giá",
                quotationService.requestRevision(id, user, request)));
    }
}
