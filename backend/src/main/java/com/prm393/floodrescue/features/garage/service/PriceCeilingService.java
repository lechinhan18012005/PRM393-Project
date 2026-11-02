package com.prm393.floodrescue.features.garage.service;

import com.prm393.floodrescue.features.garage.dto.CreatePriceCeilingRequest;
import com.prm393.floodrescue.features.garage.dto.PriceCeilingDto;
import com.prm393.floodrescue.features.garage.entity.ItemCategoryType;
import com.prm393.floodrescue.features.garage.entity.ServiceType;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface PriceCeilingService {

    List<PriceCeilingDto> getActiveCeilings();

    List<PriceCeilingDto> getAllCeilings();

    PriceCeilingDto createCeiling(CreatePriceCeilingRequest request);

    PriceCeilingDto updateCeiling(Long id, CreatePriceCeilingRequest request);

    void toggleCeilingStatus(Long id, boolean active);

    Optional<BigDecimal> findMaxAllowedPrice(
            ServiceType serviceType, String category, ItemCategoryType itemCategoryType);

    void validatePriceAgainstCeiling(
            ServiceType serviceType,
            String category,
            ItemCategoryType itemCategoryType,
            BigDecimal price,
            String serviceName);
}
