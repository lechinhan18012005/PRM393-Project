package com.prm393.floodrescue.features.rescue.entity;

import com.prm393.floodrescue.features.mechanic.entity.MechanicStaff;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "rescue_offers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RescueOffer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rescue_order_id", nullable = false)
    private RescueOrder rescueOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mechanic_staff_id", nullable = false)
    private MechanicStaff mechanicStaff;

    @Column(name = "distance_meters")
    private Double distanceMeters;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private RescueOfferStatus status = RescueOfferStatus.PENDING;

    @Column(name = "offered_at", nullable = false)
    private LocalDateTime offeredAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "responded_at")
    private LocalDateTime respondedAt;

    @Column(name = "response_note", length = 255)
    private String responseNote;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.offeredAt == null) {
            this.offeredAt = LocalDateTime.now();
        }
    }
}
