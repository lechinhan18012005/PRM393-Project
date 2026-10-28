package com.prm393.floodrescue.features.rescue.dto;

import com.prm393.floodrescue.features.rescue.entity.RescueOrderStatus;
import com.prm393.floodrescue.features.rescue.entity.TransportStage;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrackingSnapshotDto {

    private Long orderId;
    private String orderCode;
    private RescueOrderStatus status;
    private TransportStage transportStage;

    // Vị trí thợ
    private Double mechanicLatitude;
    private Double mechanicLongitude;
    private Double mechanicBearing;

    // Khoảng cách & ETA tới điểm mục tiêu
    private Double distanceToTargetMeters;
    private Integer estimatedMinutes;

    // Điểm mục tiêu hiện tại (đón hoặc trả)
    private String targetType; // PICKUP hoặc DROPOFF
    private String targetAddress;
    private Double targetLatitude;
    private Double targetLongitude;

    // Trạng thái tín hiệu
    private LocalDateTime lastGpsUpdatedAt;
    private boolean isStale; // True nếu quá 30s không nhận được tín hiệu GPS
    private boolean trackingActive; // True nếu đơn đang diễn ra, False nếu đã hoàn tất/hủy
    private String statusMessage;
}
