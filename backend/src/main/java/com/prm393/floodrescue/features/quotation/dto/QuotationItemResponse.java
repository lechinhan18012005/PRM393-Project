package com.prm393.floodrescue.features.quotation.dto;

import com.prm393.floodrescue.features.garage.entity.ServiceType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class QuotationItemResponse {
    private Long id;
    private Long serviceId;
    private String itemName;
    private String description;
    private Integer quantity;
    private BigDecimal unitPrice;
    private BigDecimal subtotal;
    private ServiceType itemType;
}
