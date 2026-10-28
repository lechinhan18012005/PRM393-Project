package com.prm393.floodrescue.features.finance.dto;

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
public class CommissionConfigDto {
    private Long id;
    private BigDecimal globalRate;
    private BigDecimal singleCrossingRate;
    private BigDecimal batchCrossingRate;
    private BigDecimal waterloggedRepairRate;
    private BigDecimal surgeHoursRate;
    private BigDecimal subsidyRate;
    private BigDecimal baseFee;
    private BigDecimal perKmFee;
    private String versionCode;
    private String changeSummary;
    private String approvalReason;
    private boolean active;
    private Long updatedByUserId;
    private String updatedByName;
    private String updatedByRole;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
