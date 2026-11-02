package com.prm393.floodrescue.features.quotation.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class QuotationDecisionRequest {
    @Size(max = 1000)
    private String note;
}
