package com.prm393.floodrescue.features.mechanic.controller;

import com.prm393.floodrescue.common.dto.ApiResponse;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.mechanic.dto.MechanicAttendanceItemResponse;
import com.prm393.floodrescue.features.mechanic.dto.MechanicAttendanceSummaryResponse;
import com.prm393.floodrescue.features.mechanic.service.MechanicAttendanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/garages/attendance")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('GARAGE_OWNER', 'GARAGE_STAFF', 'ADMIN', 'STAFF')")
public class GarageMechanicAttendanceController {

    private final MechanicAttendanceService attendanceService;

    @GetMapping
    public ResponseEntity<ApiResponse<MechanicAttendanceSummaryResponse>> getAttendanceSummary(
            @AuthenticationPrincipal User owner,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) Long staffId) {
        MechanicAttendanceSummaryResponse summary = attendanceService.getAttendanceSummary(owner, date, branchId, staffId);
        return ResponseEntity.ok(ApiResponse.success("Lấy báo cáo chấm công thành công", summary));
    }

    @GetMapping("/mechanics/{staffId}")
    public ResponseEntity<ApiResponse<MechanicAttendanceItemResponse>> getMechanicTimeCard(
            @AuthenticationPrincipal User owner,
            @PathVariable Long staffId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        MechanicAttendanceItemResponse timeCard = attendanceService.getMechanicDailyTimeCard(owner, staffId, date);
        return ResponseEntity.ok(ApiResponse.success("Lấy Time Card thợ thành công", timeCard));
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportAttendanceCsv(
            @AuthenticationPrincipal User owner,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) Long branchId) {
        LocalDate targetDate = date != null ? date : LocalDate.now();
        byte[] csvBytes = attendanceService.exportAttendanceCsv(owner, targetDate, branchId);

        String filename = "cham-cong-tho-" + targetDate + ".csv";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(csvBytes);
    }
}
