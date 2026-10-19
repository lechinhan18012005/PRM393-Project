package com.prm393.floodrescue.features.floodmap.controller;

import com.prm393.floodrescue.common.dto.ApiResponse;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.floodmap.dto.CreateFloodReportRequest;
import com.prm393.floodrescue.features.floodmap.dto.FloodReportResponse;
import com.prm393.floodrescue.features.floodmap.service.FloodReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/flood-reports")
@RequiredArgsConstructor
public class FloodReportController {

    private final FloodReportService floodReportService;

    // UC-20: Report Flood Incident
    @PostMapping
    public ResponseEntity<ApiResponse<FloodReportResponse>> reportFlood(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CreateFloodReportRequest request
    ) {
        FloodReportResponse response = floodReportService.createReport(user, request);
        return ResponseEntity.ok(ApiResponse.success("Báo cáo điểm ngập thành công! Hệ thống đang xử lý và kích hoạt cảnh báo.", response));
    }

    // UC-22: View Flood Warning Heatmap & Alerts (Active points)
    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<FloodReportResponse>>> getActiveFloodPoints() {
        List<FloodReportResponse> list = floodReportService.getActiveFloodPoints();
        return ResponseEntity.ok(ApiResponse.success(list));
    }
}
