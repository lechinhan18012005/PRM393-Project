package com.prm393.floodrescue.features.garage.dto;

import com.prm393.floodrescue.features.garage.entity.GarageStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApproveGarageRequest {

    @NotNull(message = "Trạng thái phê duyệt không được để trống")
    private GarageStatus status; // APPROVED, REJECTED, SUSPENDED

    private String note;
}
