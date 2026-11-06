package com.prm393.floodrescue.features.mechanic.service;

import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.mechanic.dto.MechanicAttendanceItemResponse;
import com.prm393.floodrescue.features.mechanic.dto.MechanicAttendanceSummaryResponse;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStaff;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStatus;

import java.time.LocalDate;

public interface MechanicAttendanceService {

    void recordStatusChange(
            MechanicStaff staff,
            String eventType,
            MechanicStatus statusFrom,
            MechanicStatus statusTo,
            String pauseReason,
            boolean isManualOverride,
            boolean isOvertime,
            Double latitude,
            Double longitude,
            Integer batteryPct
    );

    MechanicAttendanceSummaryResponse getAttendanceSummary(
            User owner,
            LocalDate date,
            Long branchId,
            Long staffId
    );

    MechanicAttendanceItemResponse getMechanicDailyTimeCard(
            User owner,
            Long staffId,
            LocalDate date
    );

    byte[] exportAttendanceCsv(
            User owner,
            LocalDate date,
            Long branchId
    );
}
