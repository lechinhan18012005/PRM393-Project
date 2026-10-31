package com.prm393.floodrescue.features.execution.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "service_execution_record")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServiceExecutionRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "mechanic_id", nullable = false)
    private Long mechanicId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private ExecutionAction action;

    @Column(length = 1000)
    private String note;

    @Column(name = "evidence_image_url", length = 1000)
    private String evidenceImageUrl;

    @Column(name = "destination_branch_id")
    private Long destinationBranchId;

    @Column(name = "quotation_id")
    private Long quotationId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
