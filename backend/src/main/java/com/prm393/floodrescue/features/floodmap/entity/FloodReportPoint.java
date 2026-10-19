package com.prm393.floodrescue.features.floodmap.entity;

import com.prm393.floodrescue.features.auth.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "flood_report_points")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FloodReportPoint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reported_by_user_id", nullable = false)
    private User reportedBy;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    @Column(nullable = false, length = 255)
    private String address;

    @Enumerated(EnumType.STRING)
    @Column(name = "water_depth_level", nullable = false, length = 30)
    private DepthLevel waterDepthLevel;

    @Column(name = "image_urls", length = 1000)
    private String imageUrls;

    @Column(length = 500)
    private String description;

    @Column(name = "confidence_score")
    @Builder.Default
    private Integer confidenceScore = 1;

    @Column(name = "cluster_count")
    @Builder.Default
    private Integer clusterCount = 1;

    @Enumerated(EnumType.STRING)
    @Column(name = "moderation_status", nullable = false, length = 30)
    @Builder.Default
    private FloodStatus moderationStatus = FloodStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "moderated_by_user_id")
    private User moderatedBy;

    @Column(name = "moderator_note", length = 500)
    private String moderatorNote;

    @Column(name = "nearby_stations", length = 255)
    private String nearbyStations;

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
