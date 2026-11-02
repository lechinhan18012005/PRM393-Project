package com.prm393.floodrescue.features.finance.entity;

import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.garage.entity.Garage;
import com.prm393.floodrescue.features.payment.entity.PaymentTransaction;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "service_disputes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceDispute {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "dispute_code", nullable = false, unique = true, length = 50)
    private String disputeCode;

    @Column(name = "rescue_order_id", nullable = false)
    private Long rescueOrderId;

    @Column(name = "rescue_code", length = 50)
    private String rescueCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_transaction_id")
    private PaymentTransaction paymentTransaction;

    @Column(name = "payos_order_code")
    private Long payosOrderCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private User customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "garage_id", nullable = false)
    private Garage garage;

    @Enumerated(EnumType.STRING)
    @Column(name = "dispute_type", nullable = false, length = 30)
    @Builder.Default
    private DisputeType disputeType = DisputeType.OVERCHARGE;

    @Column(name = "original_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal originalAmount;

    @Column(name = "requested_refund_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal requestedRefundAmount;

    @Column(name = "proposed_refund_amount", precision = 15, scale = 2)
    private BigDecimal proposedRefundAmount;

    @Column(name = "approved_refund_amount", precision = 15, scale = 2)
    private BigDecimal approvedRefundAmount;

    @Column(name = "customer_reason", nullable = false, length = 1000)
    private String customerReason;

    @Column(name = "evidence_image_urls", length = 2000)
    private String evidenceImageUrls;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private DisputeStatus status = DisputeStatus.STAFF_REVIEW;

    // UC-23: Staff investigation & proposal
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staff_reviewer_id")
    private User staffReviewer;

    @Column(name = "staff_finding_note", length = 1000)
    private String staffFindingNote;

    @Column(name = "staff_reviewed_at")
    private LocalDateTime staffReviewedAt;

    // UC-27: Admin final refund decision & execution
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admin_approver_id")
    private User adminApprover;

    @Enumerated(EnumType.STRING)
    @Column(name = "refund_source", length = 30)
    @Builder.Default
    private RefundSource refundSource = RefundSource.GARAGE_WALLET;

    @Column(name = "admin_resolution_note", length = 1000)
    private String adminResolutionNote;

    @Column(name = "refund_reference_code", length = 100)
    private String refundReferenceCode;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
