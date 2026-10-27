package com.prm393.floodrescue.features.finance.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreatePayoutRequestDto {

    @NotNull(message = "Số tiền yêu cầu rút không được để trống")
    @DecimalMin(value = "50000.0", message = "Số tiền rút tối thiểu là 50.000 VNĐ")
    private BigDecimal requestedAmount;

    @NotBlank(message = "Mã ngân hàng không được để trống")
    private String bankCode;

    private String bankName;

    @NotBlank(message = "Số tài khoản ngân hàng không được để trống")
    private String accountNumber;

    @NotBlank(message = "Tên chủ tài khoản không được để trống")
    private String accountHolderName;
}
