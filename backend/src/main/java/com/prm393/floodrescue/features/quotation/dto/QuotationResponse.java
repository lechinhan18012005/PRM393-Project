package com.prm393.floodrescue.features.quotation.dto;

import com.prm393.floodrescue.features.quotation.entity.QuotationStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class QuotationResponse {
    private Long id;
    private Long orderId;
    private Long mechanicId;
    private String diagnosis;
    private String diagnosisImageUrl;
    private QuotationStatus status;
    private BigDecimal subtotalAmount;
    private BigDecimal bookingFee;
    private BigDecimal discountAmount;
    private BigDecimal totalAmount;
    private String customerNote;
    private String rejectionReason;
    private Long parentQuotationId;
    private Integer version;
    private boolean latest;
    private LocalDateTime createdAt;
    private LocalDateTime finalizedAt;
    private List<QuotationItemResponse> items;
}
