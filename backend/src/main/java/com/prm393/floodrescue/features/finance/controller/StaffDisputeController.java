package com.prm393.floodrescue.features.finance.controller;

import com.prm393.floodrescue.common.dto.ApiResponse;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.finance.dto.DisputeResponse;
import com.prm393.floodrescue.features.finance.dto.StaffReviewDisputeRequest;
import com.prm393.floodrescue.features.finance.entity.DisputeStatus;
import com.prm393.floodrescue.features.finance.service.DisputeRefundService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/staff/disputes")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
public class StaffDisputeController {

    private final DisputeRefundService disputeRefundService;

    // UC-23: List all service disputes for Staff investigation
    @GetMapping
    public ResponseEntity<ApiResponse<List<DisputeResponse>>> getAllDisputes(
            @RequestParam(value = "status", required = false) DisputeStatus status
    ) {
        List<DisputeResponse> list = disputeRefundService.getAllDisputes(status);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    // UC-23: Staff reviews evidence, records finding & proposes refund to Admin or rejects
    @PatchMapping("/{id}/review")
    public ResponseEntity<ApiResponse<DisputeResponse>> reviewDispute(
            @AuthenticationPrincipal User staff,
            @PathVariable("id") Long id,
            @Valid @RequestBody StaffReviewDisputeRequest request
    ) {
        DisputeResponse updated = disputeRefundService.reviewDisputeByStaff(staff, id, request);
        return ResponseEntity.ok(ApiResponse.success("Đã cập nhật biên bản xác minh khiếu nại thành công!", updated));
    }
}
