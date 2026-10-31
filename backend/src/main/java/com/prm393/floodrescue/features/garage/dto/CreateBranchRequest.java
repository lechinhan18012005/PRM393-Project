package com.prm393.floodrescue.features.garage.dto;

import jakarta.validation.constraints.*;
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
    @Size(min = 2, max = 100, message = "Tên chi nhánh phải từ 2 đến 100 ký tự")
    private String branchName;

    @NotBlank(message = "Địa chỉ chi nhánh không được để trống")
    @Size(min = 5, max = 255, message = "Địa chỉ chi nhánh phải từ 5 đến 255 ký tự")
    private String address;

    @NotNull(message = "Tọa độ vĩ độ (latitude) là bắt buộc")
    @DecimalMin(value = "-90.0", message = "Vĩ độ không thể nhỏ hơn -90 độ")
    @DecimalMax(value = "90.0", message = "Vĩ độ không thể lớn hơn 90 độ")
    private Double latitude;

    @NotNull(message = "Tọa độ kinh độ (longitude) là bắt buộc")
    @DecimalMin(value = "-180.0", message = "Kinh độ không thể nhỏ hơn -180 độ")
    @DecimalMax(value = "180.0", message = "Kinh độ không thể lớn hơn 180 độ")
    private Double longitude;

    @Pattern(
            regexp = "^$|^(0|\\+84)[0-9]{9}$",
            message = "Số điện thoại hotline chi nhánh không hợp lệ (yêu cầu 10 chữ số)")
    private String phoneNumber;

    @Size(max = 255, message = "Thông tin phương tiện cứu hộ không quá 255 ký tự")
    private String rescueVehicles;
}
