package com.prm393.floodrescue.features.mechanic.dto;

import com.prm393.floodrescue.features.mechanic.entity.MechanicStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ToggleMechanicStatusRequest {

    @NotNull(message = "Trạng thái làm việc không được để trống")
    private MechanicStatus workingStatus; // AVAILABLE, OFFLINE, BUSY

    private Double latitude;
    private Double longitude;
}
