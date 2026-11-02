package com.prm393.floodrescue.features.finance.dto;

import com.prm393.floodrescue.features.finance.entity.DisputeType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateDisputeRequest {

    @NotNull(message = "Mã đơn cứu hộ không được để trống")
    private Long rescueOrderId;

    private Long paymentTransactionId;

    @Builder.Default
    private DisputeType disputeType = DisputeType.OVERCHARGE;

    @NotNull(message = "Số tiền yêu cầu hoàn trả không được để trống")
    @DecimalMin(value = "1000.00", message = "Số tiền yêu cầu hoàn trả tối thiểu là 1.000 VNĐ")
    private BigDecimal requestedRefundAmount;

    @NotBlank(message = "Lý do khiếu nại không được để trống")
    private String customerReason;

    private String evidenceImageUrls;
}
