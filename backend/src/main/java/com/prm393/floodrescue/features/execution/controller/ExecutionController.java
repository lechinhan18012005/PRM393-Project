package com.prm393.floodrescue.features.execution.controller;

import com.prm393.floodrescue.common.dto.ApiResponse;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.execution.dto.*;
import com.prm393.floodrescue.features.execution.service.ExecutionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/rescue-orders/{orderId}/execution")
@RequiredArgsConstructor
@PreAuthorize("hasRole('FIELD_MECHANIC')")
public class ExecutionController {
    private final ExecutionService executionService;

    @PostMapping("/start")
    public ResponseEntity<ApiResponse<ExecutionActionResponse>> start(
            @PathVariable Long orderId, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success("Đã bắt đầu thực hiện dịch vụ", executionService.start(orderId, user)));
    }

    @PostMapping("/progress")
    public ResponseEntity<ApiResponse<ExecutionActionResponse>> updateProgress(
            @PathVariable Long orderId, @AuthenticationPrincipal User user,
            @Valid @RequestBody ExecutionProgressRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đã cập nhật tiến độ dịch vụ",
                executionService.updateProgress(orderId, request.getNote(), request.getEvidenceImageUrl(), user)));
    }

    @PostMapping("/picked-up")
    public ResponseEntity<ApiResponse<ExecutionActionResponse>> pickedUp(
            @PathVariable Long orderId, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success("Đã xác nhận nhận xe",
                executionService.markPickedUp(orderId, user)));
    }

    @PostMapping("/transfer-to-garage")
    public ResponseEntity<ApiResponse<ExecutionActionResponse>> transfer(
            @PathVariable Long orderId, @AuthenticationPrincipal User user,
            @Valid @RequestBody TransferToGarageRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đã chuyển trạng thái kéo xe về garage",
                executionService.transfer(orderId, request.getDestinationBranchId(), user)));
    }

    @PostMapping("/delivered")
    public ResponseEntity<ApiResponse<ExecutionActionResponse>> delivered(
            @PathVariable Long orderId, @AuthenticationPrincipal User user,
            @Valid @RequestBody CompletionEvidenceRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đã xác nhận bàn giao xe",
                executionService.markDelivered(orderId, request.getCompletionImageUrl(), user)));
    }

    @PostMapping("/request-completion")
    public ResponseEntity<ApiResponse<ExecutionActionResponse>> requestCompletion(
            @PathVariable Long orderId, @AuthenticationPrincipal User user,
            @Valid @RequestBody CompletionEvidenceRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đã gửi yêu cầu hoàn tất đơn",
                executionService.requestCompletion(orderId, request.getCompletionImageUrl(), user)));
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<ExecutionRecordResponse>>> history(
            @PathVariable Long orderId, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success(executionService.history(orderId, user)));
    }
}
