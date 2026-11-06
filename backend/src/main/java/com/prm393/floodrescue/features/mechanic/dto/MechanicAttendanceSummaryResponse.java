package com.prm393.floodrescue.features.mechanic.dto;

import lombok.*;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MechanicAttendanceSummaryResponse {
    private LocalDate reportDate;
    private Long garageId;
    private String garageName;
    private int totalMechanicsCount;
    private int activeTodayCount;
    private double totalOnlineHours;
    private double totalOvertimeHours;
    private int totalCompletedOrders;
    private List<MechanicAttendanceItemResponse> items;
}
