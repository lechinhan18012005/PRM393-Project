package com.prm393.floodrescue.features.finance.dto;

import com.prm393.floodrescue.features.finance.entity.DisputeStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffReviewDisputeRequest {

    @NotNull(message = "Quyết định thẩm tra của Staff không được để trống")
    private DisputeStatus decision; // ADMIN_APPROVAL (đề xuất hoàn tiền) hoặc REJECTED (bác bỏ khiếu nại)

    private BigDecimal proposedRefundAmount;

    @NotBlank(message = "Biên bản kết luận của Staff không được để trống")
    private String staffFindingNote;
}
