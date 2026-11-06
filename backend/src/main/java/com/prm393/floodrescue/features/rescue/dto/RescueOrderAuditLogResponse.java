package com.prm393.floodrescue.features.rescue.dto;

import com.prm393.floodrescue.features.rescue.entity.RescueOrderStatus;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RescueOrderAuditLogResponse {
    private Long id;
    private Long orderId;
    private String orderCode;
    private Long mechanicStaffId;
    private String mechanicFullName;
    private String action;
    private RescueOrderStatus statusFrom;
    private RescueOrderStatus statusTo;
    private Long actorId;
    private String actorName;
    private String actorRole;
    private String notes;
    private Double latitude;
    private Double longitude;
    private String evidencePhotoUrl;
    private LocalDateTime createdAt;
}
