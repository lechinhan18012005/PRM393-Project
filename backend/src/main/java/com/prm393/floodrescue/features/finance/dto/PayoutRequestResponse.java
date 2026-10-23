package com.prm393.floodrescue.features.finance.dto;

import com.prm393.floodrescue.features.finance.entity.PayoutStatus;
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
public class PayoutRequestResponse {
    private Long id;
    private String requestCode;
    private Long garageId;
    private String garageName;
    private String garageOwnerName;
    private String garagePhone;
    private String bankCode;
    private String bankName;
    private String accountNumber;
    private String accountHolderName;
    private BigDecimal requestedAmount;
    private BigDecimal walletBalance;
    private BigDecimal availableBalance;
    private PayoutStatus status;
    private Long adminReviewerId;
    private String adminReviewerName;
    private String adminNote;
    private String transactionReference;
    private LocalDateTime createdAt;
    private LocalDateTime processedAt;
}
