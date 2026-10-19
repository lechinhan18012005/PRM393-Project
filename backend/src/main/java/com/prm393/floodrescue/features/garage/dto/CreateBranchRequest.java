package com.prm393.floodrescue.features.garage.dto;

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
public class CreateBranchRequest {

    @NotBlank(message = "Tên chi nhánh không được để trống")
    private String branchName;

    @NotBlank(message = "Địa chỉ chi nhánh không được để trống")
    private String address;

    @NotNull(message = "Tọa độ vĩ độ (latitude) là bắt buộc")
    private Double latitude;

    @NotNull(message = "Tọa độ kinh độ (longitude) là bắt buộc")
    private Double longitude;

    private String phoneNumber;
    private String rescueVehicles;
}
