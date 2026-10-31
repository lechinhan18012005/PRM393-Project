package com.prm393.floodrescue.features.finance.dto;

import com.prm393.floodrescue.features.finance.entity.DisputeStatus;
import com.prm393.floodrescue.features.finance.entity.DisputeType;
import com.prm393.floodrescue.features.finance.entity.RefundSource;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DisputeResponse {
    private Long id;
    private String disputeCode;
    private Long rescueOrderId;
    private String rescueCode;
    private Long paymentTransactionId;
    private Long payosOrderCode;
    private Long customerId;
    private String customerName;
    private String customerPhone;
    private Long garageId;
    private String garageName;
    private BigDecimal garageWalletBalance;
    private DisputeType disputeType;
    private BigDecimal originalAmount;
    private BigDecimal requestedRefundAmount;
    private BigDecimal proposedRefundAmount;
    private BigDecimal approvedRefundAmount;
    private String customerReason;
    private String evidenceImageUrls;
    private DisputeStatus status;
    private Long staffReviewerId;
    private String staffReviewerName;
    private String staffFindingNote;
    private LocalDateTime staffReviewedAt;
    private Long adminApproverId;
    private String adminApproverName;
    private RefundSource refundSource;
    private String adminResolutionNote;
    private String refundReferenceCode;
    private LocalDateTime createdAt;
    private LocalDateTime resolvedAt;
}
