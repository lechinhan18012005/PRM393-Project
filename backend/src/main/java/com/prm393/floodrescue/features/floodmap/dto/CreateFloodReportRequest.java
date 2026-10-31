package com.prm393.floodrescue.features.floodmap.dto;

import com.prm393.floodrescue.features.floodmap.entity.DepthLevel;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateFloodReportRequest {

    @NotNull(message = "Tọa độ vĩ độ (latitude) là bắt buộc")
    @DecimalMin(value = "-90.0", message = "Vĩ độ phải nằm trong khoảng [-90, 90]")
    @DecimalMax(value = "90.0", message = "Vĩ độ phải nằm trong khoảng [-90, 90]")
    private Double latitude;

    @NotNull(message = "Tọa độ kinh độ (longitude) là bắt buộc")
    @DecimalMin(value = "-180.0", message = "Kinh độ phải nằm trong khoảng [-180, 180]")
    @DecimalMax(value = "180.0", message = "Kinh độ phải nằm trong khoảng [-180, 180]")
    private Double longitude;

    @NotBlank(message = "Địa chỉ điểm ngập là bắt buộc")
    private String address;

    @NotNull(message = "Mức độ ngập nước là bắt buộc")
    private DepthLevel waterDepthLevel;

    private String description;
    private String imageUrls;
}
