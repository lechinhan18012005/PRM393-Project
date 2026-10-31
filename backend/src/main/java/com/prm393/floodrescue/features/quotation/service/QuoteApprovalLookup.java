package com.prm393.floodrescue.features.quotation.service;

import com.prm393.floodrescue.common.exception.BadRequestException;
import com.prm393.floodrescue.features.quotation.dto.ApprovedQuoteSnapshot;

import java.util.Optional;

public interface QuoteApprovalLookup {
    Optional<ApprovedQuoteSnapshot> findFinalizedQuote(Long orderId);

    default ApprovedQuoteSnapshot getRequiredFinalizedQuote(Long orderId) {
        return findFinalizedQuote(orderId)
                .orElseThrow(() -> new BadRequestException("Đơn chưa có báo giá được khách hàng chốt"));
    }
}
