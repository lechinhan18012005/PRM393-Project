package com.prm393.floodrescue.features.finance.dto;

import com.prm393.floodrescue.features.finance.entity.WalletTransactionType;
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
public class WalletTransactionDto {
    private Long id;
    private Long garageId;
    private BigDecimal amount;
    private BigDecimal balanceAfter;
    private WalletTransactionType transactionType;
    private String referenceCode;
    private String description;
    private LocalDateTime createdAt;
}
