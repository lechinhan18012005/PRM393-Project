package com.prm393.floodrescue.features.mechanic.dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateMechanicRequest {

    @NotBlank(message = "Tên đăng nhập không được để trống")
    @Size(min = 3, max = 50, message = "Tên đăng nhập phải từ 3 đến 50 ký tự")
    @Pattern(
            regexp = "^[a-zA-Z0-9._-]+$",
            message = "Tên đăng nhập chỉ được chứa chữ cái, chữ số, dấu gạch dưới, gạch ngang và dấu chấm")
    private String username;

    @NotBlank(message = "Họ và tên thợ không được để trống")
    @Size(min = 2, max = 100, message = "Họ và tên thợ phải từ 2 đến 100 ký tự")
    @Pattern(
            regexp = "^[\\p{L}\\p{M}\\s.'-]+$",
            message = "Họ và tên chứa ký tự điều khiển hoặc ký tự đặc biệt không hợp lệ")
    private String fullName;

    @Size(max = 254, message = "Email không được vượt quá 254 ký tự")
    @Email(message = "Định dạng email không hợp lệ")
    private String email;

    @NotBlank(message = "Số điện thoại không được để trống")
    @Pattern(
            regexp = "^(0|\\+84)[0-9]{9}$",
            message = "Số điện thoại không hợp lệ (yêu cầu 10 chữ số, ví dụ: 0903123456 hoặc +84903123456)")
    private String phone;

    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(min = 8, max = 64, message = "Mật khẩu phải từ 8 đến 64 ký tự")
    private String password;

    @NotNull(message = "Vui lòng chọn chi nhánh làm việc cho thợ")
    private Long branchId;

    @Size(max = 100, message = "Tên ca trực không được quá 100 ký tự")
    private String shiftName;

    @Size(max = 200, message = "Chuyên môn không được quá 200 ký tự")
    private String speciality;

    private Boolean hasCrossingCapability;
}
