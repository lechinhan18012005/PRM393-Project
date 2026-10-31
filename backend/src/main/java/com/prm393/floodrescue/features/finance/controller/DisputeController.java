package com.prm393.floodrescue.features.finance.controller;

import com.prm393.floodrescue.common.dto.ApiResponse;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.finance.dto.CreateDisputeRequest;
import com.prm393.floodrescue.features.finance.dto.DisputeResponse;
import com.prm393.floodrescue.features.finance.service.DisputeRefundService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/disputes")
@RequiredArgsConstructor
public class DisputeController {

    private final DisputeRefundService disputeRefundService;

    // Customer submits a complaint / dispute on a completed & paid rescue order (input to UC-23)
    @PostMapping
    public ResponseEntity<ApiResponse<DisputeResponse>> createDispute(
            @AuthenticationPrincipal User customer,
            @Valid @RequestBody CreateDisputeRequest request
    ) {
        DisputeResponse created = disputeRefundService.createDispute(customer, request);
        return ResponseEntity.ok(ApiResponse.success("Đã gửi khiếu nại dịch vụ thành công! Bộ phận CSKH (Staff) sẽ xác minh và phản hồi sớm nhất.", created));
    }

    // Customer views their own disputes
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<DisputeResponse>>> getMyDisputes(
            @AuthenticationPrincipal User customer
    ) {
        List<DisputeResponse> list = disputeRefundService.getMyDisputes(customer);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    // View disputes by rescueOrderId
    @GetMapping("/order/{rescueOrderId}")
    public ResponseEntity<ApiResponse<List<DisputeResponse>>> getDisputesByOrder(
            @PathVariable("rescueOrderId") Long rescueOrderId
    ) {
        List<DisputeResponse> list = disputeRefundService.getDisputesByOrder(rescueOrderId);
        return ResponseEntity.ok(ApiResponse.success(list));
    }
}
