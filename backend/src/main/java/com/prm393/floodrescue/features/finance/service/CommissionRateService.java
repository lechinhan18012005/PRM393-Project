package com.prm393.floodrescue.features.finance.service;

import com.prm393.floodrescue.features.finance.entity.CommissionConfig;
import com.prm393.floodrescue.features.finance.repository.CommissionConfigRepository;
import com.prm393.floodrescue.features.garage.entity.Garage;
import com.prm393.floodrescue.features.rescue.entity.OrderType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class CommissionRateService {
    private final CommissionConfigRepository repository;

    @Transactional(readOnly = true)
    public BigDecimal resolve(Garage garage, OrderType type) {
        if (garage.getCommissionRate() != null) return garage.getCommissionRate();
        CommissionConfig config = repository.findFirstByActiveTrueOrderByCreatedAtDesc()
                .orElseGet(() -> CommissionConfig.builder().build());
        BigDecimal rate = switch (type) {
            case SINGLE_CROSSING -> config.getSingleCrossingRate();
            case BATCH_CROSSING -> config.getBatchCrossingRate();
            case ONSITE_REPAIR -> config.getWaterloggedRepairRate();
            case TOWING -> config.getGlobalRate();
        };
        return rate != null ? rate : config.getGlobalRate();
    }
}
