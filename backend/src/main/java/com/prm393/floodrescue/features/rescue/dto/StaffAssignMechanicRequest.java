package com.prm393.floodrescue.features.rescue.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffAssignMechanicRequest {
    @NotNull(message = "ID thợ cứu hộ không được để trống")
    private Long mechanicStaffId;
}
