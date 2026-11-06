package com.prm393.floodrescue.features.mechanic.service.impl;

import com.prm393.floodrescue.common.exception.ResourceNotFoundException;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.garage.entity.Garage;
import com.prm393.floodrescue.features.garage.repository.GarageRepository;
import com.prm393.floodrescue.features.garage.service.GarageAccess;
import com.prm393.floodrescue.features.mechanic.dto.MechanicAttendanceItemResponse;
import com.prm393.floodrescue.features.mechanic.dto.MechanicAttendanceSummaryResponse;
import com.prm393.floodrescue.features.mechanic.dto.MechanicStatusLogResponse;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStaff;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStatus;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStatusLog;
import com.prm393.floodrescue.features.mechanic.repository.MechanicStaffRepository;
import com.prm393.floodrescue.features.mechanic.repository.MechanicStatusLogRepository;
import com.prm393.floodrescue.features.mechanic.service.MechanicAttendanceService;
import com.prm393.floodrescue.features.rescue.entity.RescueOrderStatus;
import com.prm393.floodrescue.features.rescue.repository.RescueOrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MechanicAttendanceServiceImpl implements MechanicAttendanceService {

    private final MechanicStatusLogRepository statusLogRepository;
    private final MechanicStaffRepository mechanicRepository;
    private final GarageRepository garageRepository;
    private final RescueOrderRepository rescueOrderRepository;

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordStatusChange(
            MechanicStaff staff,
            String eventType,
            MechanicStatus statusFrom,
            MechanicStatus statusTo,
            String pauseReason,
            boolean isManualOverride,
            boolean isOvertime,
            Double latitude,
            Double longitude,
            Integer batteryPct) {
        if (staff == null || staff.getGarage() == null) return;
        try {
            MechanicStatusLog logEntry = MechanicStatusLog.builder()
                    .mechanicStaff(staff)
                    .garage(staff.getGarage())
                    .branch(staff.getBranch())
                    .eventType(eventType)
                    .statusFrom(statusFrom)
                    .statusTo(statusTo)
                    .pauseReason(pauseReason)
                    .isManualOverride(isManualOverride)
                    .isOvertime(isOvertime)
                    .latitude(latitude)
                    .longitude(longitude)
                    .deviceBatteryPct(batteryPct)
                    .createdAt(LocalDateTime.now())
                    .build();

            statusLogRepository.save(logEntry);
            log.debug("Recorded status log for mechanic staffId {}: event={}", staff.getId(), eventType);
        } catch (Exception e) {
            log.warn("Failed to record status log for mechanic {}: {}", staff.getId(), e.getMessage());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public MechanicAttendanceSummaryResponse getAttendanceSummary(
            User owner,
            LocalDate date,
            Long branchId,
            Long staffId) {
        Garage garage = garageRepository.findByOwnerId(owner.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy gara của bạn"));
        GarageAccess.requireApproved(garage);

        LocalDate targetDate = date != null ? date : LocalDate.now();
        LocalDateTime startOfDay = targetDate.atStartOfDay();
        LocalDateTime endOfDay = targetDate.atTime(LocalTime.MAX);

        List<MechanicStaff> allStaffs = mechanicRepository.findByGarageId(garage.getId());
        if (branchId != null) {
            allStaffs = allStaffs.stream()
                    .filter(s -> s.getBranch() != null && s.getBranch().getId().equals(branchId))
                    .collect(Collectors.toList());
        }
        if (staffId != null) {
            allStaffs = allStaffs.stream()
                    .filter(s -> s.getId().equals(staffId))
                    .collect(Collectors.toList());
        }

        List<MechanicAttendanceItemResponse> items = new ArrayList<>();
        double totalOnlineHours = 0;
        double totalOvertimeHours = 0;
        int activeCount = 0;
        int totalCompletedOrders = 0;

        for (MechanicStaff staff : allStaffs) {
            MechanicAttendanceItemResponse item = calculateDailyAttendance(staff, startOfDay, endOfDay);
            items.add(item);

            if (item.getTotalOnlineMinutes() > 0 || item.getFirstOnlineAt() != null) {
                activeCount++;
            }
            totalOnlineHours += (item.getTotalOnlineMinutes() / 60.0);
            totalOvertimeHours += (item.getTotalOvertimeMinutes() / 60.0);
            totalCompletedOrders += item.getCompletedOrdersCount();
        }

        return MechanicAttendanceSummaryResponse.builder()
                .reportDate(targetDate)
                .garageId(garage.getId())
                .garageName(garage.getGarageName())
                .totalMechanicsCount(allStaffs.size())
                .activeTodayCount(activeCount)
                .totalOnlineHours(Math.round(totalOnlineHours * 10.0) / 10.0)
                .totalOvertimeHours(Math.round(totalOvertimeHours * 10.0) / 10.0)
                .totalCompletedOrders(totalCompletedOrders)
                .items(items)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public MechanicAttendanceItemResponse getMechanicDailyTimeCard(User owner, Long staffId, LocalDate date) {
        Garage garage = garageRepository.findByOwnerId(owner.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy gara của bạn"));
        GarageAccess.requireApproved(garage);

        MechanicStaff staff = mechanicRepository.findById(staffId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ thợ"));
        if (!staff.getGarage().getId().equals(garage.getId())) {
            throw new org.springframework.security.access.AccessDeniedException("Thợ không thuộc gara của bạn");
        }

        LocalDate targetDate = date != null ? date : LocalDate.now();
        LocalDateTime startOfDay = targetDate.atStartOfDay();
        LocalDateTime endOfDay = targetDate.atTime(LocalTime.MAX);

        return calculateDailyAttendance(staff, startOfDay, endOfDay);
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportAttendanceCsv(User owner, LocalDate date, Long branchId) {
        MechanicAttendanceSummaryResponse summary = getAttendanceSummary(owner, date, branchId, null);
        StringBuilder sb = new StringBuilder();

        // UTF-8 BOM để Excel đọc đúng tiếng Việt có dấu
        sb.append('\ufeff');

        // Header thông tin báo cáo
        sb.append("BÁO CÁO CHẤM CÔNG & HOẠT ĐỘNG THỢ CỨU HỘ\n");
        sb.append("Gara:,").append(summary.getGarageName()).append("\n");
        sb.append("Ngày báo cáo:,").append(summary.getReportDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))).append("\n");
        sb.append("Tổng nhân sự:,").append(summary.getTotalMechanicsCount()).append(",Có mặt hôm nay:,").append(summary.getActiveTodayCount()).append("\n");
        sb.append("Tổng giờ trực tuyến:,").append(summary.getTotalOnlineHours()).append(" giờ,Tổng giờ tăng ca:,").append(summary.getTotalOvertimeHours()).append(" giờ\n");
        sb.append("Tổng cuốc cứu hộ hoàn thành:,").append(summary.getTotalCompletedOrders()).append("\n\n");

        // Header bảng
        sb.append("STT,Họ và tên thợ,Số điện thoại,Chi nhánh,Ca làm việc,Giờ vào ca,Giờ kết thúc,Tổng giờ Online,Giờ tạm nghỉ,Giờ tăng ca,Cuốc hoàn thành,Trạng thái hiện tại\n");

        int stt = 1;
        for (MechanicAttendanceItemResponse item : summary.getItems()) {
            sb.append(stt++).append(",");
            sb.append(escapeCsv(item.getMechanicFullName())).append(",");
            sb.append(escapeCsv(item.getPhone() != null ? item.getPhone() : "-")).append(",");
            sb.append(escapeCsv(item.getBranchName() != null ? item.getBranchName() : "Chưa phân bổ")).append(",");
            sb.append(escapeCsv(item.getShiftName() != null ? item.getShiftName() : "-")).append(",");
            sb.append(item.getFirstOnlineAt() != null ? item.getFirstOnlineAt().format(DateTimeFormatter.ofPattern("HH:mm:ss")) : "-").append(",");
            sb.append(item.getLastOfflineAt() != null ? item.getLastOfflineAt().format(DateTimeFormatter.ofPattern("HH:mm:ss")) : "-").append(",");
            sb.append(String.format("%.1f", item.getTotalOnlineMinutes() / 60.0)).append(",");
            sb.append(String.format("%.1f", item.getTotalBreakMinutes() / 60.0)).append(",");
            sb.append(String.format("%.1f", item.getTotalOvertimeMinutes() / 60.0)).append(",");
            sb.append(item.getCompletedOrdersCount()).append(",");
            sb.append(item.isPaused() ? "Tạm nghỉ: " + (item.getCurrentPauseReason() != null ? item.getCurrentPauseReason() : "") : item.getCurrentStatus().name()).append("\n");
        }

        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    private String escapeCsv(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    private MechanicAttendanceItemResponse calculateDailyAttendance(
            MechanicStaff staff,
            LocalDateTime startOfDay,
            LocalDateTime endOfDay) {
        List<MechanicStatusLog> logs = statusLogRepository
                .findByMechanicStaffIdAndCreatedAtBetweenOrderByCreatedAtAsc(staff.getId(), startOfDay, endOfDay);

        LocalDateTime firstOnline = null;
        LocalDateTime lastOffline = null;
        long totalOnlineSeconds = 0;
        long totalBreakSeconds = 0;
        long totalOvertimeSeconds = 0;

        LocalDateTime lastOnlineStateTime = null;
        LocalDateTime lastBreakStateTime = null;

        for (MechanicStatusLog logEntry : logs) {
            String event = logEntry.getEventType();
            LocalDateTime t = logEntry.getCreatedAt();

            if ("ONLINE".equalsIgnoreCase(event) || "RESUME".equalsIgnoreCase(event)) {
                if (firstOnline == null) {
                    firstOnline = t;
                }
                lastOnlineStateTime = t;
                if (lastBreakStateTime != null) {
                    totalBreakSeconds += Duration.between(lastBreakStateTime, t).getSeconds();
                    lastBreakStateTime = null;
                }
            } else if ("PAUSE".equalsIgnoreCase(event)) {
                lastBreakStateTime = t;
                if (lastOnlineStateTime != null) {
                    long duration = Duration.between(lastOnlineStateTime, t).getSeconds();
                    totalOnlineSeconds += duration;
                    if (logEntry.isOvertime()) {
                        totalOvertimeSeconds += duration;
                    }
                    lastOnlineStateTime = null;
                }
            } else if ("OFFLINE".equalsIgnoreCase(event) || "AUTO_REAPED".equalsIgnoreCase(event)) {
                lastOffline = t;
                if (lastOnlineStateTime != null) {
                    long duration = Duration.between(lastOnlineStateTime, t).getSeconds();
                    totalOnlineSeconds += duration;
                    if (logEntry.isOvertime()) {
                        totalOvertimeSeconds += duration;
                    }
                    lastOnlineStateTime = null;
                }
                if (lastBreakStateTime != null) {
                    totalBreakSeconds += Duration.between(lastBreakStateTime, t).getSeconds();
                    lastBreakStateTime = null;
                }
            }
        }

        // Nếu thợ hiện đang ONLINE hoặc BUSY ở thời điểm hiện tại của ngày hôm nay
        LocalDateTime now = LocalDateTime.now();
        if (now.isAfter(startOfDay) && now.isBefore(endOfDay)) {
            if (lastOnlineStateTime != null) {
                totalOnlineSeconds += Duration.between(lastOnlineStateTime, now).getSeconds();
            }
            if (lastBreakStateTime != null) {
                totalBreakSeconds += Duration.between(lastBreakStateTime, now).getSeconds();
            }
        }

        // Đếm số đơn cứu hộ hoàn thành của thợ trong ngày
        long completedOrders = rescueOrderRepository.countByMechanicStaffIdAndStatusAndServiceCompletedAtBetween(
                staff.getId(), RescueOrderStatus.COMPLETED, startOfDay, endOfDay
        );

        List<MechanicStatusLogResponse> timeline = logs.stream()
                .map(l -> MechanicStatusLogResponse.builder()
                        .id(l.getId())
                        .mechanicStaffId(staff.getId())
                        .mechanicFullName(staff.getUser() != null ? staff.getUser().getFullName() : null)
                        .branchId(l.getBranch() != null ? l.getBranch().getId() : null)
                        .branchName(l.getBranch() != null ? l.getBranch().getBranchName() : null)
                        .eventType(l.getEventType())
                        .statusFrom(l.getStatusFrom())
                        .statusTo(l.getStatusTo())
                        .pauseReason(l.getPauseReason())
                        .isManualOverride(l.isManualOverride())
                        .isOvertime(l.isOvertime())
                        .latitude(l.getLatitude())
                        .longitude(l.getLongitude())
                        .deviceBatteryPct(l.getDeviceBatteryPct())
                        .createdAt(l.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        return MechanicAttendanceItemResponse.builder()
                .mechanicStaffId(staff.getId())
                .mechanicFullName(staff.getUser() != null ? staff.getUser().getFullName() : "")
                .phone(staff.getUser() != null ? staff.getUser().getPhone() : "")
                .branchId(staff.getBranch() != null ? staff.getBranch().getId() : null)
                .branchName(staff.getBranch() != null ? staff.getBranch().getBranchName() : "Chưa phân chi nhánh")
                .shiftName(staff.getShiftName() != null ? staff.getShiftName() : "Chưa phân ca")
                .currentStatus(staff.getWorkingStatus())
                .isPaused(staff.getWorkingStatus() == MechanicStatus.OFFLINE && staff.isManualOverride())
                .currentPauseReason(staff.getPauseReason())
                .firstOnlineAt(firstOnline)
                .lastOfflineAt(lastOffline)
                .totalOnlineMinutes(totalOnlineSeconds / 60)
                .totalBreakMinutes(totalBreakSeconds / 60)
                .totalOvertimeMinutes(totalOvertimeSeconds / 60)
                .completedOrdersCount((int) completedOrders)
                .timelineLogs(timeline)
                .build();
    }
}
