package com.prm393.floodrescue.features.mechanic.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AllocateBranchRequest {
    private Long branchId;
    private String shiftName;
}
