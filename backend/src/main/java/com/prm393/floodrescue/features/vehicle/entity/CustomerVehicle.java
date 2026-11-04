package com.prm393.floodrescue.features.vehicle.entity;

import com.prm393.floodrescue.features.auth.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "customer_vehicles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerVehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private User customer;

    @Column(name = "license_plate", nullable = false, length = 30)
    private String licensePlate;

    @Column(nullable = false, length = 50)
    private String brand;

    @Column(nullable = false, length = 50)
    private String model;

    @Column(name = "vehicle_type", length = 30)
    private String vehicleType; // SCOOTER, MANUAL, CLUTCH, ELECTRIC

    @Column(name = "engine_capacity", length = 30)
    private String engineCapacity;

    @Column(length = 50)
    private String color;

    @Column(name = "is_default", nullable = false)
    @Builder.Default
    private boolean isDefault = false;

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
