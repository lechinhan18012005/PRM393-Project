package com.prm393.floodrescue.features.kyc.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "kyc_audit_logs", indexes = {
        @Index(name = "idx_kyc_audit_garage", columnList = "garage_id"),
        @Index(name = "idx_kyc_audit_operator", columnList = "operator_id"),
        @Index(name = "idx_kyc_audit_action", columnList = "action"),
        @Index(name = "idx_kyc_audit_time", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KycAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "operator_id", nullable = false)
    private Long operatorId;

    @Column(name = "operator_username", nullable = false, length = 100)
    private String operatorUsername;

    @Column(name = "operator_role", nullable = false, length = 50)
    private String operatorRole;

    @Column(name = "garage_id", nullable = false)
    private Long garageId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private KycAuditAction action;

    @Column(name = "resource_accessed", length = 300)
    private String resourceAccessed;

    @Column(name = "ip_address", length = 50)
    private String ipAddress;

    @Column(name = "user_agent", length = 300)
    private String userAgent;

    @Column(length = 500)
    private String details;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}
