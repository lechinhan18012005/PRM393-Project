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
public class CreatePaymentLinkResponse {
    private Long transactionId;
    private Long rescueOrderId;
    private String rescueCode;
    private Long payosOrderCode;
    private BigDecimal amount;
    private BigDecimal commissionRate;
    private BigDecimal platformFee;
    private BigDecimal netGarageAmount;
    private PaymentMethod paymentMethod;
    private PaymentStatus status;
    private String qrCode;
    private String checkoutUrl;
    private String bankName;
    private String accountNumber;
    private String accountHolder;
    private String paymentContent;
    private LocalDateTime createdAt;
}
