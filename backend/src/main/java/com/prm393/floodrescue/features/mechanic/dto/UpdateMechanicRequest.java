package com.prm393.floodrescue.features.mechanic.dto;

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
public class UpdateMechanicRequest {

    @Size(min = 2, max = 100, message = "Họ và tên thợ phải từ 2 đến 100 ký tự")
    @Pattern(
            regexp = "^$|^[\\p{L}\\p{M}\\s.'-]+$",
            message = "Họ và tên chứa ký tự điều khiển hoặc ký tự đặc biệt không hợp lệ")
    private String fullName;

    @Pattern(
            regexp = "^$|^(0|\\+84)[0-9]{9}$",
            message = "Số điện thoại không hợp lệ (yêu cầu 10 chữ số, ví dụ: 0903123456)")
    private String phone;

    private Long branchId;

    @Size(max = 100, message = "Tên ca trực không được quá 100 ký tự")
    private String shiftName;

    @Size(max = 200, message = "Chuyên môn không được quá 200 ký tự")
    private String speciality;

    private Boolean hasCrossingCapability;
}
