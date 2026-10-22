package com.prm393.floodrescue.features.finance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GarageWalletDto {
    private Long garageId;
    private String garageName;
    private BigDecimal walletBalance;
    private BigDecimal pendingPayoutAmount;
    private BigDecimal availableBalance;
    private BigDecimal totalWithdrawnAmount;
    private List<WalletTransactionDto> recentTransactions;
    private List<PayoutRequestResponse> payoutRequests;
}
