package com.prm393.floodrescue.features.onboarding.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO yêu cầu khởi tạo trực tiếp tài khoản Nhân viên Điều hành (STAFF) dành cho Quản trị viên (ADMIN).
 * Hỗ trợ cơ chế cấp phát nhanh (Cách A) trên cổng Web Admin mà không bắt buộc phải chờ luồng mã mời 2 bước.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateStaffAccountRequest {

    @NotBlank(message = "Email nhân viên không được để trống")
    @Email(message = "Định dạng email không hợp lệ")
    @Size(max = 254, message = "Email không vượt quá 254 ký tự")
    private String email;

    @Size(max = 100, message = "Họ và tên không vượt quá 100 ký tự")
    private String fullName;

    @JsonAlias({"phone", "phoneNumber"})
    @Size(max = 20, message = "Số điện thoại không vượt quá 20 ký tự")
    private String phoneNumber;

    @Size(max = 50, message = "Tên đăng nhập không vượt quá 50 ký tự")
    private String username;

    @Size(max = 100, message = "Mật khẩu không vượt quá 100 ký tự")
    private String password;
}
