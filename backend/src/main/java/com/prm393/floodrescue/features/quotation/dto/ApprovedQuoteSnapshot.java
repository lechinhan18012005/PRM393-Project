package com.prm393.floodrescue.features.quotation.dto;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;

@Value
@Builder
public class ApprovedQuoteSnapshot {
    Long quotationId;
    Long orderId;
    Integer version;
    BigDecimal totalAmount;
}
