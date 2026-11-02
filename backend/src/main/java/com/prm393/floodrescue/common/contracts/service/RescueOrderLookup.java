package com.prm393.floodrescue.common.contracts.service;

import com.prm393.floodrescue.common.contracts.dto.OrderSnapshot;

import java.util.List;

public interface RescueOrderLookup {
    OrderSnapshot getRequiredOrder(Long orderId);

    List<OrderSnapshot> findByBatchTripId(Long batchTripId);
}
