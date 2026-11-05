package com.prm393.floodrescue.features.mechanic.entity;

import com.prm393.floodrescue.features.garage.entity.Garage;
import com.prm393.floodrescue.features.garage.entity.GarageBranch;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "mechanic_status_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MechanicStatusLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mechanic_staff_id", nullable = false)
    private MechanicStaff mechanicStaff;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "garage_id", nullable = false)
    private Garage garage;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id")
    private GarageBranch branch;

    @Column(name = "event_type", nullable = false, length = 30)
    private String eventType; // ONLINE, PAUSE, RESUME, OFFLINE, AUTO_REAPED, BUSY_START, BUSY_END

    @Enumerated(EnumType.STRING)
    @Column(name = "status_from", length = 30)
    private MechanicStatus statusFrom;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_to", nullable = false, length = 30)
    private MechanicStatus statusTo;

    @Column(name = "pause_reason", length = 100)
    private String pauseReason;

    @Column(name = "is_manual_override", nullable = false)
    @Builder.Default
    private boolean isManualOverride = false;

    @Column(name = "is_overtime", nullable = false)
    @Builder.Default
    private boolean isOvertime = false;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "device_battery_pct")
    private Integer deviceBatteryPct;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}
