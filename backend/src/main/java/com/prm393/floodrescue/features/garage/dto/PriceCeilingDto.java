package com.prm393.floodrescue.features.garage.dto;

import com.prm393.floodrescue.features.garage.entity.ItemCategoryType;
import com.prm393.floodrescue.features.garage.entity.ServiceType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PriceCeilingDto {
    private Long id;
    private ServiceType serviceType;
    private String category;
    private ItemCategoryType itemCategoryType;
    private BigDecimal maxAllowedPrice;
    private String description;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
