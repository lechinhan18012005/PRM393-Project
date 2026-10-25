package com.prm393.floodrescue.features.finance.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateCommissionConfigRequest {

    @NotNull(message = "Tỷ lệ hoa hồng trung bình không được để trống")
    @DecimalMin(value = "0.0", message = "Tỷ lệ hoa hồng không được âm")
    @DecimalMax(value = "50.0", message = "Tỷ lệ hoa hồng không vượt quá 50%")
    private BigDecimal globalRate;

    @DecimalMin(value = "0.0")
    @DecimalMax(value = "50.0")
    private BigDecimal singleCrossingRate;

    @DecimalMin(value = "0.0")
    @DecimalMax(value = "50.0")
    private BigDecimal batchCrossingRate;

    @DecimalMin(value = "0.0")
    @DecimalMax(value = "50.0")
    private BigDecimal waterloggedRepairRate;

    @DecimalMin(value = "0.0")
    @DecimalMax(value = "50.0")
    private BigDecimal surgeHoursRate;

    @DecimalMin(value = "0.0")
    @DecimalMax(value = "50.0")
    private BigDecimal subsidyRate;

    @DecimalMin(value = "0.0")
    private BigDecimal baseFee;

    @DecimalMin(value = "0.0")
    private BigDecimal perKmFee;

    private String versionCode;
    private String changeSummary;
    private String approvalReason;
}
