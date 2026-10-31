package com.prm393.floodrescue.features.mechanic.entity;

import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.garage.entity.Garage;
import com.prm393.floodrescue.features.garage.entity.GarageBranch;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "mechanic_staffs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MechanicStaff {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "garage_id", nullable = false)
    private Garage garage;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id")
    private GarageBranch branch;

    @Column(name = "current_latitude")
    private Double currentLatitude;

    @Column(name = "current_longitude")
    private Double currentLongitude;

    @Enumerated(EnumType.STRING)
    @Column(name = "working_status", nullable = false, length = 30)
    @Builder.Default
    private MechanicStatus workingStatus = MechanicStatus.OFFLINE;

    @Column(name = "shift_name", length = 100)
    private String shiftName;

    @Column(name = "rating_avg")
    @Builder.Default
    private Double ratingAvg = 5.0;

    @Column(length = 200)
    private String speciality;

    @Column(name = "has_crossing_capability", nullable = false, columnDefinition = "boolean default false")
    @Builder.Default
    private boolean hasCrossingCapability = false;

    @Column(name = "is_manual_override", nullable = false)
    @Builder.Default
    private boolean isManualOverride = false;

    @Column(name = "paused_at")
    private LocalDateTime pausedAt;

    @Column(name = "pause_reason", length = 100)
    private String pauseReason;

    @Column(name = "last_heartbeat_at")
    private LocalDateTime lastHeartbeatAt;

    @Column(name = "last_gps_updated_at")
    private LocalDateTime lastGpsUpdatedAt;

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
