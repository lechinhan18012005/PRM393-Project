package com.prm393.floodrescue.features.floodmap.controller;

import com.prm393.floodrescue.common.dto.ApiResponse;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.floodmap.dto.FloodReportResponse;
import com.prm393.floodrescue.features.floodmap.dto.ModerateFloodReportRequest;
import com.prm393.floodrescue.features.floodmap.service.FloodReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/staff/flood-reports")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
@Tag(name = "Staff Flood Report Moderation", description = "Kiểm duyệt báo cáo điểm ngập và cập nhật nước rút (Staff/Admin)")
@SecurityRequirement(name = "bearerAuth")
public class StaffFloodReportController {

    private final FloodReportService floodReportService;

    // UC-21: Moderate & Verify Flood Map Points
    @GetMapping
    @Operation(summary = "UC-21: Lấy toàn bộ danh sách điểm ngập phục vụ kiểm duyệt")
    public ResponseEntity<ApiResponse<List<FloodReportResponse>>> getAllFloodReports() {
        List<FloodReportResponse> list = floodReportService.getAllReportsForStaff();
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @PatchMapping("/{id}/moderate")
    @Operation(summary = "UC-21: Thẩm định và duyệt điểm ngập (VERIFIED / REJECTED)")
    public ResponseEntity<ApiResponse<FloodReportResponse>> moderateFloodReport(
            @AuthenticationPrincipal User staff,
            @PathVariable("id") Long id,
            @Valid @RequestBody ModerateFloodReportRequest request
    ) {
        FloodReportResponse response = floodReportService.moderateReport(staff, id, request);
        return ResponseEntity.ok(ApiResponse.success("Kiểm duyệt điểm ngập thành công!", response));
    }

    @PatchMapping("/{id}/resolve")
    @Operation(summary = "UC-21: Xác nhận nước đã rút, chuyển trạng thái an toàn (RECEDED)")
    public ResponseEntity<ApiResponse<FloodReportResponse>> resolveWaterReceded(
            @AuthenticationPrincipal User staff,
            @PathVariable("id") Long id
    ) {
        FloodReportResponse response = floodReportService.resolveWaterReceded(staff, id);
        return ResponseEntity.ok(ApiResponse.success("Đã ghi nhận nước rút, chuyển điểm ngập sang trạng thái an toàn!", response));
    }
}
