package com.prm393.floodrescue.features.mechanic.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateMechanicRequest {
    private String fullName;
    private String phone;
    private Long branchId;
    private String shiftName;
    private String speciality;
    private Boolean hasCrossingCapability;
}
