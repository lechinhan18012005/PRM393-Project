package com.prm393.floodrescue.features.payment.dto;

import com.prm393.floodrescue.features.payment.entity.PaymentMethod;
import com.prm393.floodrescue.features.payment.entity.PaymentStatus;
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
public class PaymentTransactionResponse {
    private Long id;
    private Long rescueOrderId;
    private String rescueCode;
    private String orderType;
    private Long garageId;
    private String garageName;
    private Long customerId;
    private String customerName;
    private String customerPhone;
    private Long payosOrderCode;
    private BigDecimal amount;
    private BigDecimal commissionRate;
    private BigDecimal platformFee;
    private BigDecimal netGarageAmount;
    private PaymentMethod paymentMethod;
    private PaymentStatus status;
    private boolean reconciled;
    private boolean checksumValid;
    private String webhookSignature;
    private String qrCode;
    private String checkoutUrl;
    private String bankName;
    private String accountNumber;
    private String accountHolder;
    private String paymentContent;
    private String rawWebhookPayload;
    private LocalDateTime createdAt;
    private LocalDateTime paidAt;
    private LocalDateTime reconciledAt;
}
