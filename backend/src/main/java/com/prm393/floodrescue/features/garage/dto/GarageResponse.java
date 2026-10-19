package com.prm393.floodrescue.features.garage.dto;

import com.prm393.floodrescue.features.garage.entity.GarageStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GarageResponse {
    private Long id;
    private Long ownerId;
    private String ownerName;
    private String ownerEmail;
    private String garageName;
    private String phone;
    private String businessLicenseUrl;
    private String idCardUrl;
    private GarageStatus status;
    private BigDecimal walletBalance;
    private String rejectionReason;
    private LocalDateTime createdAt;
    private int branchCount;
    private int mechanicCount;
}
