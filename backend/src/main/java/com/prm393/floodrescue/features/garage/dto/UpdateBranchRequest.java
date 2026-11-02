package com.prm393.floodrescue.features.garage.dto;

import com.prm393.floodrescue.features.garage.entity.BranchStatus;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateBranchRequest {

    @Size(min = 2, max = 100, message = "Tên chi nhánh phải từ 2 đến 100 ký tự")
    private String branchName;

    @Size(min = 5, max = 255, message = "Địa chỉ chi nhánh phải từ 5 đến 255 ký tự")
    private String address;

    @DecimalMin(value = "-90.0", message = "Vĩ độ không thể nhỏ hơn -90 độ")
    @DecimalMax(value = "90.0", message = "Vĩ độ không thể lớn hơn 90 độ")
    private Double latitude;

    @DecimalMin(value = "-180.0", message = "Kinh độ không thể nhỏ hơn -180 độ")
    @DecimalMax(value = "180.0", message = "Kinh độ không thể lớn hơn 180 độ")
    private Double longitude;

    @Pattern(
            regexp = "^$|^(0|\\+84)[0-9]{9}$",
            message = "Số điện thoại hotline chi nhánh không hợp lệ (yêu cầu 10 chữ số)")
    private String phoneNumber;

    @Size(max = 255, message = "Thông tin phương tiện cứu hộ không quá 255 ký tự")
    private String rescueVehicles;

    private BranchStatus operatingStatus;
}
