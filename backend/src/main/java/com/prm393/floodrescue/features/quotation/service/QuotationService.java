package com.prm393.floodrescue.features.quotation.service;

import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.common.contracts.dto.GarageServiceSnapshot;
import com.prm393.floodrescue.features.quotation.dto.CreateQuotationRequest;
import com.prm393.floodrescue.features.quotation.dto.QuotationDecisionRequest;
import com.prm393.floodrescue.features.quotation.dto.QuotationResponse;

import java.util.List;

public interface QuotationService {
    QuotationResponse create(Long orderId, User mechanicUser, CreateQuotationRequest request);

    List<QuotationResponse> history(Long orderId, User user);

    List<GarageServiceSnapshot> catalog(Long orderId, User mechanicUser);

    QuotationResponse approve(Long quotationId, User customer, QuotationDecisionRequest request);

    QuotationResponse reject(Long quotationId, User customer, QuotationDecisionRequest request);

    QuotationResponse requestRevision(Long quotationId, User customer, QuotationDecisionRequest request);
}
