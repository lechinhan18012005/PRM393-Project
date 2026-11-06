package com.prm393.floodrescue.features.rescue.controller;

import com.prm393.floodrescue.common.dto.ApiResponse;
import com.prm393.floodrescue.features.rescue.dto.RescueOrderAuditLogResponse;
import com.prm393.floodrescue.features.rescue.service.RescueOrderAuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/garages/orders")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('GARAGE_OWNER', 'GARAGE_STAFF', 'ADMIN', 'STAFF', 'FIELD_MECHANIC', 'CUSTOMER')")
public class GarageOrderAuditController {

    private final RescueOrderAuditService auditService;

    @GetMapping("/{orderId}/audit-logs")
    public ResponseEntity<ApiResponse<List<RescueOrderAuditLogResponse>>> getOrderAuditLogs(
            @PathVariable Long orderId) {
        List<RescueOrderAuditLogResponse> logs = auditService.getOrderAuditLogs(orderId);
        return ResponseEntity.ok(ApiResponse.success("Lấy nhật ký tiến trình đơn hàng thành công", logs));
    }
}
