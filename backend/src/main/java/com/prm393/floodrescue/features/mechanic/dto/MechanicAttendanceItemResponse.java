package com.prm393.floodrescue.features.mechanic.dto;

import com.prm393.floodrescue.features.mechanic.entity.MechanicStatus;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MechanicAttendanceItemResponse {
    private Long mechanicStaffId;
    private String mechanicFullName;
    private String phone;
    private Long branchId;
    private String branchName;
    private String shiftName;
    private MechanicStatus currentStatus;
    private boolean isPaused;
    private String currentPauseReason;
    
    // Thống kê ngày
    private LocalDateTime firstOnlineAt;
    private LocalDateTime lastOfflineAt;
    private long totalOnlineMinutes;
    private long totalBreakMinutes;
    private long totalOvertimeMinutes;
    private int completedOrdersCount;
    
    // Chi tiết timeline sự kiện trong ngày
    private List<MechanicStatusLogResponse> timelineLogs;
}
