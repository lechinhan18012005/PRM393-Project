package com.prm393.floodrescue.features.batchtransport.dto;

import com.prm393.floodrescue.features.batchtransport.entity.BatchTripStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class BatchTripResponse {
    private Long id;
    private Long mechanicId;
    private Long branchId;
    private Long garageId;
    private Long serviceItemId;
    private Integer capacity;
    private Integer currentVehicleCount;
    private Integer availableSlots;
    private String pickupPlace;
    private String destinationPlace;
    private BigDecimal discountedPricePerVehicle;
    private BatchTripStatus status;
    private LocalDateTime departureTime;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;
    private Double pickupLatitude;
    private Double pickupLongitude;
    private Double destinationLatitude;
    private Double destinationLongitude;
    private Double distanceKm;
}
