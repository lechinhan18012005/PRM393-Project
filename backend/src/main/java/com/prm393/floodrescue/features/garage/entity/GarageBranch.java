package com.prm393.floodrescue.features.garage.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "garage_branches",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_garage_branch_name",
                        columnNames = {"garage_id", "branch_name"})
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GarageBranch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "garage_id", nullable = false)
    private Garage garage;

    @Column(name = "branch_name", nullable = false, length = 150)
    private String branchName;

    @Column(nullable = false, length = 255)
    private String address;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    @Column(name = "phone_number", length = 20)
    private String phoneNumber;

    @Column(name = "rescue_vehicles", length = 255)
    private String rescueVehicles;

    @Enumerated(EnumType.STRING)
    @Column(name = "operating_status", nullable = false, length = 30)
    @Builder.Default
    private BranchStatus operatingStatus = BranchStatus.OPEN;

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
