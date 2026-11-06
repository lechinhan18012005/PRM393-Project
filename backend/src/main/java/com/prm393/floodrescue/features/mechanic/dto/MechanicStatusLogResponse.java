package com.prm393.floodrescue.features.mechanic.dto;

import com.prm393.floodrescue.features.mechanic.entity.MechanicStatus;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MechanicStatusLogResponse {
    private Long id;
    private Long mechanicStaffId;
    private String mechanicFullName;
    private Long branchId;
    private String branchName;
    private String eventType;
    private MechanicStatus statusFrom;
    private MechanicStatus statusTo;
    private String pauseReason;
    private boolean isManualOverride;
    private boolean isOvertime;
    private Double latitude;
    private Double longitude;
    private Integer deviceBatteryPct;
    private LocalDateTime createdAt;
}
