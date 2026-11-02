package com.prm393.floodrescue.features.execution.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CompletionEvidenceRequest {
    @NotBlank
    @Size(max = 1000)
    private String completionImageUrl;
}
