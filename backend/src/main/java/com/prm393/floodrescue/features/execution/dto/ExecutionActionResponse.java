package com.prm393.floodrescue.features.execution.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ExecutionActionResponse {
    private Long executionRecordId;
    private Long orderId;
    private String action;
    private Long finalizedQuotationId;
    private Long destinationBranchId;
    private String completionImageUrl;
}
