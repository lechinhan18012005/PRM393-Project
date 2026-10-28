package com.prm393.floodrescue.features.finance.entity;

import com.prm393.floodrescue.features.auth.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "commission_configs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommissionConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "global_rate", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal globalRate = new BigDecimal("12.50");

    @Column(name = "single_crossing_rate", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal singleCrossingRate = new BigDecimal("12.50");

    @Column(name = "batch_crossing_rate", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal batchCrossingRate = new BigDecimal("10.00");

    @Column(name = "waterlogged_repair_rate", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal waterloggedRepairRate = new BigDecimal("15.00");

    @Column(name = "surge_hours_rate", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal surgeHoursRate = new BigDecimal("8.00");

    @Column(name = "subsidy_rate", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal subsidyRate = new BigDecimal("15.00");

    @Column(name = "base_fee", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal baseFee = new BigDecimal("25000.00");

    @Column(name = "per_km_fee", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal perKmFee = new BigDecimal("10000.00");

    @Column(name = "version_code", length = 30)
    @Builder.Default
    private String versionCode = "v2.4";

    @Column(name = "change_summary", length = 300)
    private String changeSummary;

    @Column(name = "approval_reason", length = 500)
    private String approvalReason;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by_user_id")
    private User updatedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
