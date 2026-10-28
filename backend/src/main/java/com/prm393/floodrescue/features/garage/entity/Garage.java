package com.prm393.floodrescue.features.garage.entity;

import com.prm393.floodrescue.common.security.AttributeEncryptor;
import com.prm393.floodrescue.features.auth.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@org.hibernate.annotations.DynamicUpdate
@Table(name = "garages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Garage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_user_id", nullable = false)
    private User owner;

    @Column(name = "garage_name", nullable = false, length = 150)
    private String garageName;

    @Column(length = 20)
    private String phone;

    @Column(name = "business_license_url", length = 500)
    private String businessLicenseUrl;

    @Column(name = "id_card_url", length = 500)
    private String idCardUrl;

    // --- DECREE 13/2023/ND-CP COMPLIANCE FIELDS ---

    @Column(name = "nd13_consent", nullable = false)
    @Builder.Default
    private Boolean nd13Consent = false;

    @Column(name = "nd13_consented_at")
    private LocalDateTime nd13ConsentedAt;

    @Column(name = "nd13_consent_ip", length = 50)
    private String nd13ConsentIp;

    /**
     * Encrypted Citizen ID (CCCD) number using AES-256-GCM.
     * Decrypted automatically in-memory via JPA AttributeConverter.
     */
    @Convert(converter = AttributeEncryptor.class)
    @Column(name = "id_card_number_encrypted", length = 500)
    private String idCardNumber;

    /**
     * Salted SHA-256 hash of Citizen ID for fast uniqueness & indexed lookups
     * without compromising sensitive plaintext.
     */
    @Column(name = "id_card_number_hash", length = 64)
    private String idCardNumberHash;

    /**
     * Private storage key (e.g. secure-kyc/{garageId}/{uuid}.webp.enc)
     * Not accessible through public URLs.
     */
    @Column(name = "business_license_storage_key", length = 300)
    private String businessLicenseStorageKey;

    @Column(name = "id_card_storage_key", length = 300)
    private String idCardStorageKey;

    /**
     * Data lifecycle retention date.
     * After approval (VERIFIED), sensitive CCCD image files are scheduled to be purged
     * after 30-60 days.
     */
    @Column(name = "kyc_retention_until")
    private LocalDateTime kycRetentionUntil;

    @Column(name = "id_card_purged", nullable = false)
    @Builder.Default
    private Boolean idCardPurged = false;

    // --- END DECREE 13 FIELDS ---

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private GarageStatus status = GarageStatus.PENDING;

    @Column(name = "wallet_balance", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal walletBalance = BigDecimal.ZERO;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.nd13Consent == null) {
            this.nd13Consent = false;
        }
        if (this.idCardPurged == null) {
            this.idCardPurged = false;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
