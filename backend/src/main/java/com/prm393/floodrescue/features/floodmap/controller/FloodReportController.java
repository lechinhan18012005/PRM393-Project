package com.prm393.floodrescue.features.floodmap.controller;

import com.prm393.floodrescue.common.dto.ApiResponse;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.floodmap.dto.CreateFloodReportRequest;
import com.prm393.floodrescue.features.floodmap.dto.FloodReportResponse;
import com.prm393.floodrescue.features.floodmap.service.FloodReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/flood-reports")
@RequiredArgsConstructor
@Tag(name = "Flood Reports", description = "Báo cáo điểm ngập cộng đồng và bản đồ cảnh báo ngập lụt")
public class FloodReportController {

    private final FloodReportService floodReportService;

    // UC-20: Report Flood Incident
    @PostMapping
    @Operation(summary = "UC-20: Gửi báo cáo điểm ngập cộng đồng")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<FloodReportResponse>> reportFlood(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CreateFloodReportRequest request
    ) {
        FloodReportResponse response = floodReportService.createReport(user, request);
        return ResponseEntity.ok(ApiResponse.success("Báo cáo điểm ngập thành công! Hệ thống đang xử lý và kích hoạt cảnh báo.", response));
    }

    // UC-22: View Flood Warning Heatmap & Alerts (Active points)
    @GetMapping("/active")
    @Operation(summary = "UC-22: Lấy danh sách các điểm ngập đang hoạt động trên bản đồ (Public)")
    public ResponseEntity<ApiResponse<List<FloodReportResponse>>> getActiveFloodPoints() {
        List<FloodReportResponse> list = floodReportService.getActiveFloodPoints();
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    // UC-20: View My Submitted Flood Reports
    @GetMapping("/my")
    @Operation(summary = "UC-20: Lấy danh sách các điểm ngập do người dùng hiện tại đã báo cáo")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<List<FloodReportResponse>>> getMyFloodReports(
            @AuthenticationPrincipal User user
    ) {
        List<FloodReportResponse> list = floodReportService.getMyReports(user);
        return ResponseEntity.ok(ApiResponse.success(list));
    }
}
