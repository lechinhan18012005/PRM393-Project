package com.prm393.floodrescue.features.garage.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "garage_service_catalog")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "garage_id", nullable = false)
    private Garage garage;

    @Column(name = "service_name", nullable = false, length = 150)
    private String serviceName;

    @Column(length = 50)
    private String category;

    @Enumerated(EnumType.STRING)
    @Column(name = "service_type", nullable = false, length = 30)
    private ServiceType serviceType;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_category_type", nullable = false, length = 20)
    @Builder.Default
    private ItemCategoryType itemCategoryType = ItemCategoryType.LABOR;

    @Enumerated(EnumType.STRING)
    @Column(name = "applicable_vehicle_type", nullable = false, length = 20)
    @Builder.Default
    private ApplicableVehicleType applicableVehicleType = ApplicableVehicleType.ALL;

    @Column(name = "standard_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal standardPrice;

    @Column(name = "min_price", precision = 12, scale = 2)
    private BigDecimal minPrice;

    @Column(name = "max_price", precision = 12, scale = 2)
    private BigDecimal maxPrice;

    @Column(length = 30)
    @Builder.Default
    private String unit = "lượt";

    @Column(name = "estimated_time_min")
    @Builder.Default
    private Integer estimatedTimeMin = 15;

    @Column(length = 500)
    private String description;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private boolean deleted = false;

    @Column(name = "admin_ceiling_snapshot", precision = 12, scale = 2)
    private BigDecimal adminCeilingSnapshot;

    @Column(name = "warranty_days")
    @Builder.Default
    private Integer warrantyDays = 3;

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
