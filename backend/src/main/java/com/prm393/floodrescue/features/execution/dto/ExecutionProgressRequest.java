package com.prm393.floodrescue.features.execution.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ExecutionProgressRequest {
    @NotBlank
    @Size(max = 1000)
    private String note;

    @Size(max = 1000)
    private String evidenceImageUrl;
}
