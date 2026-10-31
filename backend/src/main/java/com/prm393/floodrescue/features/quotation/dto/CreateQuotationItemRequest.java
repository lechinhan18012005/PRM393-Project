package com.prm393.floodrescue.features.quotation.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateQuotationItemRequest {
    @NotNull
    private Long serviceId;

    @Min(1)
    private int quantity = 1;

    private String description;
}
