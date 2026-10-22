package com.prm393.floodrescue.features.payment.dto;

import com.prm393.floodrescue.features.payment.entity.PaymentMethod;
import jakarta.validation.constraints.DecimalMin;
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
public class CreatePaymentRequest {

    @NotNull(message = "Mã đơn cứu hộ (rescueOrderId) không được để trống")
    private Long rescueOrderId;

    @NotNull(message = "Mã garage nhận đơn (garageId) không được để trống")
    private Long garageId;

    private String rescueCode;

    private String orderType;

    @NotNull(message = "Số tiền thanh toán không được để trống")
    @DecimalMin(value = "1000.0", message = "Số tiền thanh toán tối thiểu là 1.000 VNĐ")
    private BigDecimal amount;

    private PaymentMethod paymentMethod;

    private String description;
}
