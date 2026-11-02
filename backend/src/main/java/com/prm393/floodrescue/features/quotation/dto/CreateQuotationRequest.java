package com.prm393.floodrescue.features.quotation.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class CreateQuotationRequest {
    @NotBlank
    private String diagnosis;

    @Size(max = 1000)
    private String diagnosisImageUrl;

    @DecimalMin("0")
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @NotEmpty
    @Valid
    private List<CreateQuotationItemRequest> items;
}
