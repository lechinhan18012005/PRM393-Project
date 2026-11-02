package com.prm393.floodrescue.features.batchtransport.dto;

import com.prm393.floodrescue.features.rescue.dto.RescueOrderResponse;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class JoinBatchTripResponse {
    private BatchTripResponse trip;
    private RescueOrderResponse order;
}
