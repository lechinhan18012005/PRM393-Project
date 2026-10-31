package com.prm393.floodrescue.features.batchtransport.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class BatchOrderRequest {
    @NotNull
    private Long orderId;
}
