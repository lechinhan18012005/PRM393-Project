package com.prm393.floodrescue.features.auth.dto;

import jakarta.validation.constraints.NotBlank;
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
public class LoginRequest {

    @NotBlank(message = "Vui lòng nhập số điện thoại hoặc email")
    @Size(max = 254, message = "Số điện thoại hoặc email không được vượt quá 254 ký tự")
    @Pattern(
            regexp = "^(?:[^\\s@]+@[^\\s@]+\\.[^\\s@]+|(?:0|\\+84)[35789]\\d{8})$",
            message = "Số điện thoại hoặc email không hợp lệ")
    private String identifier;

    @NotBlank(message = "Vui lòng nhập mật khẩu")
    @Size(min = 6, max = 128, message = "Mật khẩu phải từ 6 đến 128 ký tự")
    private String password;

    private ClientPlatform platform;

    public enum ClientPlatform {
        MOBILE,
        WEB
    }
}
