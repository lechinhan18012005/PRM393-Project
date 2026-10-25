package com.prm393.floodrescue.features.rescue.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CrossingOptionDto {
    private Long garageId;
    private String garageName;
    private String garagePhone;
    private Long branchId;
    private String branchName;
    private String branchAddress;
    private Double branchLatitude;
    private Double branchLongitude;
    private Long serviceItemId;
    private String serviceName;
    private String description;
    private BigDecimal serviceBasePrice;
    private BigDecimal bookingFee;
    private BigDecimal totalAmount;
    private String currency;
    private int estimatedTimeMin;
    private int availableMechanicCount;
}
