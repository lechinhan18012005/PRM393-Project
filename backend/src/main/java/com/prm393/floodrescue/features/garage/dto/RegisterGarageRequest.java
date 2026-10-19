package com.prm393.floodrescue.features.garage.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterGarageRequest {

    @NotBlank(message = "Tên garage không được để trống")
    private String garageName;

    private String phone;
    private String businessLicenseUrl;
    private String idCardUrl;

    // Optional first branch information
    private String firstBranchName;
    private String firstBranchAddress;
    private Double firstBranchLatitude;
    private Double firstBranchLongitude;
    private String firstBranchPhone;
    private String firstBranchVehicles;
}
