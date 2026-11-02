package com.prm393.floodrescue.common.contracts.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MechanicContextSnapshot {
    private Long userId;
    private Long mechanicStaffId;
    private Long garageId;
    private Long branchId;
    private boolean garageApproved;
    private boolean branchOpen;
}
