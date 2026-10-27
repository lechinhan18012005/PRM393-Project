package com.prm393.floodrescue.features.finance.dto;

import com.prm393.floodrescue.features.finance.entity.PayoutStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApprovePayoutDto {

    @NotNull(message = "Trạng thái xử lý không được để trống")
    private PayoutStatus status;

    private String adminNote;

    private String transactionReference;
}
