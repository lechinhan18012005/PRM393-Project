package com.prm393.floodrescue.features.rescue.dto;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.prm393.floodrescue.common.utils.FlexibleInstantDeserializer;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConfirmArrivalRequest {

    @NotNull(message = "Vĩ độ hiện tại không được để trống")
    @DecimalMin(value = "-90.0", message = "Vĩ độ không hợp lệ")
    @DecimalMax(value = "90.0", message = "Vĩ độ không hợp lệ")
    private Double latitude;

    @NotNull(message = "Kinh độ hiện tại không được để trống")
    @DecimalMin(value = "-180.0", message = "Kinh độ không hợp lệ")
    @DecimalMax(value = "180.0", message = "Kinh độ không hợp lệ")
    private Double longitude;

    private Double accuracyMeters;

    @JsonDeserialize(using = FlexibleInstantDeserializer.class)
    private Instant recordedAt;

    public ConfirmArrivalRequest(Double latitude, Double longitude) {
        this.latitude = latitude;
        this.longitude = longitude;
    }
}
