package com.prm393.floodrescue.features.quotation.service.impl;

import com.prm393.floodrescue.features.quotation.dto.ApprovedQuoteSnapshot;
import com.prm393.floodrescue.features.quotation.entity.QuotationStatus;
import com.prm393.floodrescue.features.quotation.repository.QuotationRepository;
import com.prm393.floodrescue.features.quotation.service.QuoteApprovalLookup;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class QuoteApprovalLookupImpl implements QuoteApprovalLookup {
    private final QuotationRepository quotationRepository;

    @Override
    @Transactional(readOnly = true)
    public Optional<ApprovedQuoteSnapshot> findFinalizedQuote(Long orderId) {
        return quotationRepository.findFirstByOrderIdAndLatestTrue(orderId)
                .filter(quotation -> quotation.getStatus() == QuotationStatus.FINALIZED)
                .map(quotation -> ApprovedQuoteSnapshot.builder()
                        .quotationId(quotation.getId())
                        .orderId(quotation.getOrderId())
                        .version(quotation.getVersion())
                        .totalAmount(quotation.getTotalAmount())
                        .build());
    }
}
