package com.prm393.floodrescue.features.finance.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.util.Map;

@Data
@Builder
public class GarageRevenueDto {
    private String month;
    private long paidOrderCount;
    private BigDecimal netRevenue;
    private BigDecimal platformFee;
    private Map<String, BigDecimal> revenueByService;
}
