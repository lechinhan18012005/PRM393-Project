package com.prm393.floodrescue.common.contracts.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GarageBranchSnapshot {
    private Long branchId;
    private Long garageId;
    private String branchName;
    private String address;
    private boolean open;
}
