package com.prm393.floodrescue.features.finance.dto;

import com.prm393.floodrescue.features.finance.entity.DisputeStatus;
import com.prm393.floodrescue.features.finance.entity.RefundSource;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminProcessRefundRequest {

    @NotNull(message = "Quyết định hoàn tiền của Admin không được để trống")
    private DisputeStatus decision; // REFUNDED, REJECTED, hoặc STAFF_REVIEW (yêu cầu Staff xác minh lại)

    private BigDecimal approvedRefundAmount;

    @Builder.Default
    private RefundSource refundSource = RefundSource.GARAGE_WALLET;

    private String adminResolutionNote;

    private String refundReferenceCode;
}
