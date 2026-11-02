package com.prm393.floodrescue.common.contracts.service;

import java.math.BigDecimal;

public interface RescueOrderCommands {
    void markWaitingForQuotationApproval(Long orderId, Long quotationId, BigDecimal estimatedAmount);

    void finalizeQuotation(Long orderId, Long quotationId, BigDecimal totalAmount);

    void attachBatchTrip(Long orderId, Long batchTripId, Long mechanicStaffId,
                         Long branchId, BigDecimal fareAmount);

    void detachBatchTrip(Long orderId);

    void cancelBatchOrder(Long orderId, String reason);

    void convertToPrivateCrossing(Long orderId);

    void completeBatchOrder(Long orderId);

    void markVehiclePickedUp(Long orderId);

    void markVehicleDelivered(Long orderId, String completionImageUrl);

    void startService(Long orderId, Long finalizedQuotationId);

    void transferToGarage(Long orderId, Long destinationBranchId);

    void requestOrderCompletion(Long orderId, String completionImageUrl);
}
