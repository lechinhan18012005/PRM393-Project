package com.prm393.floodrescue.features.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @NotBlank(message = "Vui lòng nhập họ tên")
                @Size(max = 100, message = "Họ tên tối đa 100 ký tự")
                String fullName,
        @NotBlank(message = "Vui lòng nhập email")
                @Email(message = "Email không hợp lệ")
                @Size(max = 100, message = "Email tối đa 100 ký tự")
                String email,
        @Pattern(
                        regexp = "^(?:\\+?[0-9]{9,15})?$",
                        message = "Số điện thoại cần từ 9 đến 15 chữ số, có thể bắt đầu bằng +")
                String phone) {}
