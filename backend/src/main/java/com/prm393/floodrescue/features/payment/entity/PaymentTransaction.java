package com.prm393.floodrescue.features.payment.entity;

import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.garage.entity.Garage;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payment_transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "rescue_order_id", nullable = false)
    private Long rescueOrderId;

    @Column(name = "rescue_code", length = 50)
    private String rescueCode;

    @Column(name = "order_type", length = 40)
    @Builder.Default
    private String orderType = "SINGLE_CROSSING";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "garage_id", nullable = false)
    private Garage garage;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private User customer;

    @Column(name = "payos_order_code", unique = true, nullable = false)
    private Long payosOrderCode;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(name = "commission_rate", nullable = false, precision = 5, scale = 2)
    private BigDecimal commissionRate;

    @Column(name = "platform_fee", nullable = false, precision = 15, scale = 2)
    private BigDecimal platformFee;

    @Column(name = "net_garage_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal netGarageAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 30)
    @Builder.Default
    private PaymentMethod paymentMethod = PaymentMethod.PAYOS_VIETQR;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private PaymentStatus status = PaymentStatus.PENDING;

    @Column(nullable = false)
    @Builder.Default
    private boolean reconciled = false;

    @Column(name = "checksum_valid", nullable = false)
    @Builder.Default
    private boolean checksumValid = true;

    @Column(name = "webhook_signature", length = 255)
    private String webhookSignature;

    @Column(name = "qr_code", length = 2000)
    private String qrCode;

    @Column(name = "checkout_url", length = 500)
    private String checkoutUrl;

    @Column(name = "bank_name", length = 120)
    private String bankName;

    @Column(name = "account_number", length = 60)
    private String accountNumber;

    @Column(name = "account_holder", length = 150)
    private String accountHolder;

    @Column(name = "payment_content", length = 200)
    private String paymentContent;

    @Column(name = "raw_webhook_payload", columnDefinition = "TEXT")
    private String rawWebhookPayload;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "reconciled_at")
    private LocalDateTime reconciledAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
