package com.prm393.floodrescue.features.batchtransport.entity;

import com.prm393.floodrescue.features.garage.entity.GarageBranch;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStaff;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "batch_trip")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BatchTrip {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "mechanic_id", nullable = false)
    private Long mechanicId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mechanic_id", insertable = false, updatable = false,
            foreignKey = @ForeignKey(name = "fk_batch_trip_mechanic"))
    private MechanicStaff mechanic;

    @Column(name = "branch_id", nullable = false)
    private Long branchId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id", insertable = false, updatable = false,
            foreignKey = @ForeignKey(name = "fk_batch_trip_branch"))
    private GarageBranch branch;

    @Column(nullable = false)
    private Integer capacity;

    @Column(name = "current_vehicle_count", nullable = false)
    private Integer currentVehicleCount;

    @Column(name = "pickup_place", nullable = false, length = 255)
    private String pickupPlace;

    @Column(name = "destination_place", length = 255)
    private String destinationPlace;

    @Column(name = "discounted_price_per_vehicle", nullable = false, precision = 15, scale = 2)
    private BigDecimal discountedPricePerVehicle;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private BatchTripStatus status;

    @Column(name = "departure_time", nullable = false)
    private LocalDateTime departureTime;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "pickup_latitude", nullable = false)
    private Double pickupLatitude;

    @Column(name = "pickup_longitude", nullable = false)
    private Double pickupLongitude;

    @Column(name = "destination_latitude", nullable = false)
    private Double destinationLatitude;

    @Column(name = "destination_longitude", nullable = false)
    private Double destinationLongitude;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
