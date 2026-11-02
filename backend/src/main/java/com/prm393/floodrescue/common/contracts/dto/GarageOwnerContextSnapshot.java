package com.prm393.floodrescue.common.contracts.dto;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class GarageOwnerContextSnapshot {
    Long garageId;
    boolean approved;
    List<Long> mechanicStaffIds;
}
