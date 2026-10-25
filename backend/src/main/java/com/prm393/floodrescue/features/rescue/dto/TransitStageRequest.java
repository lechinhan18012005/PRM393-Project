package com.prm393.floodrescue.features.rescue.dto;

import com.prm393.floodrescue.features.rescue.entity.TransportStage;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransitStageRequest {

    @NotNull(message = "Giai đoạn vận chuyển không được để trống")
    private TransportStage stage;

    private String note;
}
