package com.prm393.floodrescue.features.execution.dto;

import com.prm393.floodrescue.features.execution.entity.ExecutionAction;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ExecutionRecordResponse {
    private Long id;
    private Long orderId;
    private Long mechanicId;
    private ExecutionAction action;
    private String note;
    private String evidenceImageUrl;
    private Long destinationBranchId;
    private Long quotationId;
    private LocalDateTime createdAt;
}
