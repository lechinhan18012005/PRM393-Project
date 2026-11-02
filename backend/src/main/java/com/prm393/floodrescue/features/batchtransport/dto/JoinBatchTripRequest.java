package com.prm393.floodrescue.features.batchtransport.dto;

import com.prm393.floodrescue.features.rescue.dto.CreateRescueOrderRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class JoinBatchTripRequest {
    @Valid
    @NotNull
    private CreateRescueOrderRequest order;

    @NotNull
    @DecimalMin(value = "0.0")
    private BigDecimal expectedBatchFare;
}
