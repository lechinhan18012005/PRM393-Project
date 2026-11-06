package com.prm393.floodrescue.features.rescue.entity;

import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStaff;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "rescue_order_audit_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RescueOrderAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private RescueOrder order;

    @Column(name = "order_code", nullable = false, length = 50)
    private String orderCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mechanic_staff_id")
    private MechanicStaff mechanicStaff;

    @Column(name = "action", nullable = false, length = 50)
    private String action; // CREATED, OFFER_SENT, OFFER_ACCEPTED, OFFER_REJECTED, ARRIVED, SERVICE_STARTED, QUOTATION_SUBMITTED, QUOTATION_APPROVED, COMPLETED, PAID, CANCELLED

    @Enumerated(EnumType.STRING)
    @Column(name = "status_from", length = 30)
    private RescueOrderStatus statusFrom;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_to", nullable = false, length = 30)
    private RescueOrderStatus statusTo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    private User actor;

    @Column(name = "actor_role", nullable = false, length = 30)
    private String actorRole; // FIELD_MECHANIC, CUSTOMER, GARAGE_STAFF, SYSTEM

    @Column(name = "notes", length = 500)
    private String notes;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "evidence_photo_url", length = 500)
    private String evidencePhotoUrl;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}
