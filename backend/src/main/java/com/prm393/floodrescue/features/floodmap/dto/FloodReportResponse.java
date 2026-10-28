package com.prm393.floodrescue.features.floodmap.dto;

import com.prm393.floodrescue.features.floodmap.entity.DepthLevel;
import com.prm393.floodrescue.features.floodmap.entity.FloodStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FloodReportResponse {
    private Long id;
    private Long reportedById;
    private String reportedByName;
    private Double latitude;
    private Double longitude;
    private String address;
    private DepthLevel waterDepthLevel;
    private String imageUrls;
    private String description;
    private Integer confidenceScore;
    private Integer clusterCount;
    private FloodStatus moderationStatus;
    private Long moderatedById;
    private String moderatedByName;
    private String moderatorNote;
    private String nearbyStations;
    private LocalDateTime createdAt;
}
