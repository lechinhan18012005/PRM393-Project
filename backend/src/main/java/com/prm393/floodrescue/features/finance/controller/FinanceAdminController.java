package com.prm393.floodrescue.features.finance.controller;

import com.prm393.floodrescue.common.dto.ApiResponse;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.finance.dto.*;
import com.prm393.floodrescue.features.finance.entity.DisputeStatus;
import com.prm393.floodrescue.features.finance.entity.PayoutStatus;
import com.prm393.floodrescue.features.finance.service.DisputeRefundService;
import com.prm393.floodrescue.features.finance.service.FinanceAdminService;
import com.prm393.floodrescue.features.payment.dto.PaymentTransactionResponse;
import com.prm393.floodrescue.features.payment.entity.PaymentStatus;
import com.prm393.floodrescue.features.payment.service.PayOSPaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/finance")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class FinanceAdminController {

    private final FinanceAdminService financeAdminService;
    private final PayOSPaymentService payOSPaymentService;
    private final DisputeRefundService disputeRefundService;

    // UC-24: Get active commission rate configuration
    @GetMapping("/commission")
    public ResponseEntity<ApiResponse<CommissionConfigDto>> getActiveCommissionConfig() {
        CommissionConfigDto config = financeAdminService.getActiveCommissionConfig();
        return ResponseEntity.ok(ApiResponse.success(config));
    }

    // UC-24: Get commission change audit trail
    @GetMapping("/commission/history")
    public ResponseEntity<ApiResponse<List<CommissionConfigDto>>> getCommissionHistory() {
        List<CommissionConfigDto> history = financeAdminService.getCommissionHistory();
        return ResponseEntity.ok(ApiResponse.success(history));
    }

    // UC-24: Update platform commission rate configuration
    @PutMapping("/commission")
    public ResponseEntity<ApiResponse<CommissionConfigDto>> updateCommissionConfig(
            @AuthenticationPrincipal User admin,
            @Valid @RequestBody UpdateCommissionConfigRequest request
    ) {
        CommissionConfigDto updated = financeAdminService.updateCommissionConfig(admin, request);
        return ResponseEntity.ok(ApiResponse.success(
                "Lưu cấu hình tỷ lệ hoa hồng nền tảng thành công!",
                updated
        ));
    }

    // UC-25: Monitor Cash Flow & PayOS Reconciliation (list all transactions)
    @GetMapping("/transactions")
    public ResponseEntity<ApiResponse<List<PaymentTransactionResponse>>> getAllTransactions(
            @RequestParam(value = "status", required = false) PaymentStatus status
    ) {
        List<PaymentTransactionResponse> transactions = payOSPaymentService.getAllTransactions(status);
        return ResponseEntity.ok(ApiResponse.success(transactions));
    }

    // UC-25: Trigger automated PayOS reconciliation
    @PostMapping("/transactions/reconcile")
    public ResponseEntity<ApiResponse<List<PaymentTransactionResponse>>> reconcileAllTransactions() {
        List<PaymentTransactionResponse> reconciled = payOSPaymentService.reconcileAllTransactions();
        return ResponseEntity.ok(ApiResponse.success("Đối soát tự động toàn bộ giao dịch PayOS thành công!", reconciled));
    }

    // UC-26: List all payout requests (optional filter by status)
    @GetMapping("/payouts")
    public ResponseEntity<ApiResponse<List<PayoutRequestResponse>>> getAllPayoutRequests(
            @RequestParam(value = "status", required = false) PayoutStatus status
    ) {
        List<PayoutRequestResponse> payouts = financeAdminService.getAllPayoutRequests(status);
        return ResponseEntity.ok(ApiResponse.success(payouts));
    }

    // UC-26: Approve, disburse (transfer), or reject a garage payout request
    @PatchMapping("/payouts/{id}/process")
    public ResponseEntity<ApiResponse<PayoutRequestResponse>> processPayoutRequest(
            @AuthenticationPrincipal User admin,
            @PathVariable("id") Long id,
            @Valid @RequestBody ApprovePayoutDto request
    ) {
        PayoutRequestResponse response = financeAdminService.processPayoutRequest(admin, id, request);
        return ResponseEntity.ok(ApiResponse.success("Xử lý yêu cầu rút tiền thành công!", response));
    }

    // UC-27: List all dispute & refund cases for Admin decision
    @GetMapping("/refunds")
    public ResponseEntity<ApiResponse<List<DisputeResponse>>> getAllRefundDisputes(
            @RequestParam(value = "status", required = false) DisputeStatus status
    ) {
        List<DisputeResponse> disputes = disputeRefundService.getAllDisputes(status);
        return ResponseEntity.ok(ApiResponse.success(disputes));
    }

    // UC-27: Admin approves & executes refund (100% or partial), requests re-verification, or rejects
    @PatchMapping("/refunds/{id}/process")
    public ResponseEntity<ApiResponse<DisputeResponse>> processRefundDecision(
            @AuthenticationPrincipal User admin,
            @PathVariable("id") Long id,
            @Valid @RequestBody AdminProcessRefundRequest request
    ) {
        DisputeResponse response = disputeRefundService.processRefundByAdmin(admin, id, request);
        return ResponseEntity.ok(ApiResponse.success("Đã thực thi quyết định hoàn tiền / xử lý khiếu nại thành công!", response));
    }

    // UC-25: Financial overview statistics
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<PlatformRevenueStatsDto>> getPlatformRevenueStats() {
        PlatformRevenueStatsDto stats = financeAdminService.getPlatformRevenueStats();
        return ResponseEntity.ok(ApiResponse.success(stats));
    }
}
