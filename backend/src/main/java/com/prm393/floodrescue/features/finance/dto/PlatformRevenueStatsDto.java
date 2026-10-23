package com.prm393.floodrescue.features.finance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlatformRevenueStatsDto {
    private BigDecimal activeCommissionRate;
    private long totalPaidTransactionCount;
    private long reconciledTransactionCount;
    private BigDecimal totalGrossRevenueGmv;
    private BigDecimal totalPlatformFeeEarned;
    private BigDecimal totalNetGarageSettlement;
    private long pendingPayoutCount;
    private BigDecimal pendingPayoutTotalAmount;
    private long transferredPayoutCount;
    private BigDecimal transferredPayoutTotalAmount;
    private BigDecimal totalGarageWalletBalances;
}
