package com.prm393.floodrescue.features.mechanic.dto;

import com.prm393.floodrescue.features.garage.entity.BranchStatus;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStatus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MechanicStaffResponse {
    private boolean active;
    private Long id;
    private Long userId;
    private String username;
    private String fullName;
    private String phone;
    private String email;
    private String avatarUrl;
    private Long garageId;
    private String garageName;
    private Long branchId;
    private String branchName;
    private String branchAddress;
    private BranchStatus branchOperatingStatus;
    private boolean isManualOverride;
    private LocalDateTime pausedAt;
    private String pauseReason;
    private Double currentLatitude;
    private Double currentLongitude;
    private MechanicStatus workingStatus;
    private String shiftName;
    private Double ratingAvg;
    private String speciality;
    private boolean hasCrossingCapability;
    private LocalDateTime lastHeartbeatAt;
    private LocalDateTime lastGpsUpdatedAt;
    private LocalDateTime createdAt;
}
