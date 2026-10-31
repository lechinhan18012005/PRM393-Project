package com.prm393.floodrescue.features.quotation.entity;

import com.prm393.floodrescue.features.mechanic.entity.MechanicStaff;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "quotation", uniqueConstraints = @UniqueConstraint(
        name = "uk_quotation_order_version", columnNames = {"order_id", "version"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Quotation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "mechanic_id", nullable = false)
    private Long mechanicId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mechanic_id", insertable = false, updatable = false,
            foreignKey = @ForeignKey(name = "fk_quotation_mechanic"))
    private MechanicStaff mechanic;

    @Column(nullable = false, length = 1000)
    private String diagnosis;

    @Column(name = "diagnosis_image_url", length = 1000)
    private String diagnosisImageUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private QuotationStatus status;

    @Column(name = "subtotal_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal subtotalAmount;

    @Column(name = "total_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "customer_note", length = 1000)
    private String customerNote;

    @Column(name = "rejection_reason", length = 1000)
    private String rejectionReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "finalized_at")
    private LocalDateTime finalizedAt;

    @Column(name = "parent_quotation_id")
    private Long parentQuotationId;

    @Column(nullable = false)
    private Integer version;

    @Column(name = "is_latest", nullable = false)
    private boolean latest;

    @Column(name = "booking_fee", nullable = false, precision = 15, scale = 2)
    private BigDecimal bookingFee;

    @Column(name = "discount_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal discountAmount;

    @OneToMany(mappedBy = "quotation", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<QuotationItem> items = new ArrayList<>();

    public void addItem(QuotationItem item) {
        items.add(item);
        item.setQuotation(this);
    }

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
