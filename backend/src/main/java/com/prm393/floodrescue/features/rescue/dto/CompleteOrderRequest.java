package com.prm393.floodrescue.features.rescue.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompleteOrderRequest {

    @NotBlank(message = "Bắt buộc chụp và tải ảnh nghiệm thu thực tế")
    private String completionPhotoUrl;

    private String handoverPhotoUrl;

    private String notes;
}
