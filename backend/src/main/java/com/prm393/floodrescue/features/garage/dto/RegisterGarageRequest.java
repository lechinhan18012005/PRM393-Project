package com.prm393.floodrescue.features.garage.dto;

import jakarta.validation.constraints.AssertTrue;
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

    // --- DECREE 13/2023/ND-CP COMPLIANCE ---
    @AssertTrue(message = "Bạn bắt buộc phải đồng ý với Điều khoản xử lý dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP để tiếp tục.")
    @Builder.Default
    private Boolean nd13Consent = true;

    private String idCardNumber;
    private String businessLicenseStorageKey;
    private String idCardStorageKey;

    // Optional first branch information
    private String firstBranchName;
    private String firstBranchAddress;
    private Double firstBranchLatitude;
    private Double firstBranchLongitude;
    private String firstBranchPhone;
    private String firstBranchVehicles;
}
