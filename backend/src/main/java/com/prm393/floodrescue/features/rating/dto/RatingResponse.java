package com.prm393.floodrescue.features.rating.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RatingResponse {
    private Long id;
    private Long rescueOrderId;
    private String rescueCode;
    private Long customerId;
    private String customerName;
    private Long garageId;
    private String garageName;
    private Long mechanicStaffId;
    private String mechanicName;
    private Double mechanicRatingAvg;
    private Integer stars;
    private String tags;
    private String comment;
    private LocalDateTime createdAt;
}
