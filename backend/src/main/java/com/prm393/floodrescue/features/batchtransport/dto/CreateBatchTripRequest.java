package com.prm393.floodrescue.features.batchtransport.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreateBatchTripRequest {
    private Long mechanicId;

    @Min(4) @Max(6)
    private int capacity;

    @NotBlank @Size(max = 255)
    private String pickupPlace;

    @NotBlank @Size(max = 255)
    private String destinationPlace;

    @NotNull @DecimalMin(value = "0", inclusive = false)
    private BigDecimal discountedPricePerVehicle;

    @NotNull @DecimalMin("-90") @DecimalMax("90")
    private Double pickupLatitude;

    @NotNull @DecimalMin("-180") @DecimalMax("180")
    private Double pickupLongitude;

    @NotNull @DecimalMin("-90") @DecimalMax("90")
    private Double destinationLatitude;

    @NotNull @DecimalMin("-180") @DecimalMax("180")
    private Double destinationLongitude;
}
