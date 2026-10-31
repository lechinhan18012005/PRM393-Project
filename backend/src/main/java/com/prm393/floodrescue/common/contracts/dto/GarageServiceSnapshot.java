package com.prm393.floodrescue.common.contracts.dto;

import com.prm393.floodrescue.features.garage.entity.ServiceType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GarageServiceSnapshot {
    private Long serviceId;
    private Long garageId;
    private String serviceName;
    private String description;
    private ServiceType serviceType;
    private BigDecimal standardPrice;
    private BigDecimal minPrice;
    private BigDecimal maxPrice;
    private boolean active;
}
