package com.prm393.floodrescue.features.payment.controller;

import com.prm393.floodrescue.common.dto.ApiResponse;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.payment.dto.CreatePaymentLinkResponse;
import com.prm393.floodrescue.features.payment.dto.CreatePaymentRequest;
import com.prm393.floodrescue.features.payment.dto.PayOSWebhookPayload;
import com.prm393.floodrescue.features.payment.dto.PaymentTransactionResponse;
import com.prm393.floodrescue.features.payment.service.PayOSPaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PayOSWebhookController {

    private final PayOSPaymentService payOSPaymentService;

    // UC-18: Create VietQR PayOS or Cash payment transaction
    @PostMapping("/create")
    public ResponseEntity<ApiResponse<CreatePaymentLinkResponse>> createPayment(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CreatePaymentRequest request
    ) {
        CreatePaymentLinkResponse response = payOSPaymentService.createPayment(user, request);
        return ResponseEntity.ok(ApiResponse.success("Khởi tạo giao dịch thanh toán thành công!", response));
    }

    // UC-18 & UC-25: Public Webhook endpoint called by PayOS Gateway (verified by HMAC-SHA256 signature)
    @PostMapping("/payos/webhook")
    public ResponseEntity<ApiResponse<PaymentTransactionResponse>> handlePayOSWebhook(
            @RequestBody PayOSWebhookPayload payload
    ) {
        PaymentTransactionResponse response = payOSPaymentService.handlePayOSWebhook(payload);
        return ResponseEntity.ok(ApiResponse.success("Xác thực Webhook PayOS và hạch toán ví garage thành công!", response));
    }

    // UC-18: Simulate PayOS Webhook callback with valid HMAC-SHA256 signature (for local testing & demo)
    @PostMapping("/{orderCode}/simulate-webhook")
    public ResponseEntity<ApiResponse<PaymentTransactionResponse>> simulatePayOSWebhook(
            @AuthenticationPrincipal User user,
            @PathVariable("orderCode") Long orderCode
    ) {
        PaymentTransactionResponse response = payOSPaymentService.simulatePayOSWebhook(user, orderCode);
        return ResponseEntity.ok(ApiResponse.success("Đã xác nhận thanh toán VietQR PayOS và cộng tiền vào ví Gara!", response));
    }

    // UC-18: Confirm Cash payment at rescue site
    @PostMapping("/{orderCode}/confirm-cash")
    public ResponseEntity<ApiResponse<PaymentTransactionResponse>> confirmCashPayment(
            @AuthenticationPrincipal User user,
            @PathVariable("orderCode") Long orderCode
    ) {
        PaymentTransactionResponse response = payOSPaymentService.confirmCashPayment(user, orderCode);
        return ResponseEntity.ok(ApiResponse.success("Đã xác nhận thu tiền mặt và khấu trừ hoa hồng nền tảng!", response));
    }

    // UC-18: Get payment transaction & electronic invoice details by PayOS orderCode
    @GetMapping("/{orderCode}")
    public ResponseEntity<ApiResponse<PaymentTransactionResponse>> getPaymentByOrderCode(
            @AuthenticationPrincipal User user,
            @PathVariable("orderCode") Long orderCode,
            @RequestParam(defaultValue = "false") boolean refresh
    ) {
        PaymentTransactionResponse response = payOSPaymentService.getTransactionByOrderCode(user, orderCode, refresh);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    // UC-18: Get payments by rescueOrderId
    @GetMapping("/order/{rescueOrderId}")
    public ResponseEntity<ApiResponse<List<PaymentTransactionResponse>>> getPaymentsByRescueOrder(
            @AuthenticationPrincipal User user,
            @PathVariable("rescueOrderId") Long rescueOrderId
    ) {
        List<PaymentTransactionResponse> list = payOSPaymentService.getTransactionsByRescueOrder(user, rescueOrderId);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    // PayOS Return/Cancel redirect landing endpoint
    @GetMapping("/payos/return")
    public ResponseEntity<ApiResponse<Map<String, Object>>> handlePayOSReturn(
            @RequestParam(value = "orderCode", required = false) Long orderCode,
            @RequestParam(value = "cancel", defaultValue = "false") boolean cancel
    ) {
        return ResponseEntity.ok(ApiResponse.success(Map.of(
                "orderCode", orderCode != null ? orderCode : 0L,
                "cancelled", cancel,
                "message", cancel ? "Giao dịch thanh toán đã hủy" : "Đã ghi nhận kết quả trả về từ cổng PayOS"
        )));
    }
}
