package com.prm393.floodrescue.features.execution.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class TransferToGarageRequest {
    @NotNull
    private Long destinationBranchId;
}
