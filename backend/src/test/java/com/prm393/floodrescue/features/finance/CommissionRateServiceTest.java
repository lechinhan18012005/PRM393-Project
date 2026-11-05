package com.prm393.floodrescue.features.finance;

import com.prm393.floodrescue.features.finance.entity.CommissionConfig;
import com.prm393.floodrescue.features.finance.repository.CommissionConfigRepository;
import com.prm393.floodrescue.features.finance.service.CommissionRateService;
import com.prm393.floodrescue.features.garage.entity.Garage;
import com.prm393.floodrescue.features.rescue.entity.OrderType;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CommissionRateServiceTest {
    private final CommissionConfigRepository repository = mock(CommissionConfigRepository.class);
    private final CommissionRateService service = new CommissionRateService(repository);

    @Test
    void garageOverrideIncludingZeroAppliesToEveryOrderType() {
        Garage garage = Garage.builder().commissionRate(new BigDecimal("12.50")).build();
        for (OrderType type : OrderType.values()) {
            assertEquals(new BigDecimal("12.50"), service.resolve(garage, type));
        }
        garage.setCommissionRate(BigDecimal.ZERO);
        assertEquals(BigDecimal.ZERO, service.resolve(garage, OrderType.BATCH_CROSSING));
        verifyNoInteractions(repository);
    }

    @Test
    void fallbackUsesConfiguredOrderTypeAndGlobalRate() {
        CommissionConfig config = CommissionConfig.builder().globalRate(new BigDecimal("7.25"))
                .singleCrossingRate(new BigDecimal("11"))
                .batchCrossingRate(new BigDecimal("8"))
                .waterloggedRepairRate(new BigDecimal("14")).build();
        when(repository.findFirstByActiveTrueOrderByCreatedAtDesc()).thenReturn(Optional.of(config));
        Garage garage = Garage.builder().build();
        assertEquals(new BigDecimal("11"), service.resolve(garage, OrderType.SINGLE_CROSSING));
        assertEquals(new BigDecimal("8"), service.resolve(garage, OrderType.BATCH_CROSSING));
        assertEquals(new BigDecimal("14"), service.resolve(garage, OrderType.ONSITE_REPAIR));
        assertEquals(new BigDecimal("7.25"), service.resolve(garage, OrderType.TOWING));
        config.setSingleCrossingRate(null);
        assertEquals(new BigDecimal("7.25"), service.resolve(garage, OrderType.SINGLE_CROSSING));
    }

    @Test
    void emptyDatabaseUsesSystemDefaultsWithoutWritingDuringQuote() {
        when(repository.findFirstByActiveTrueOrderByCreatedAtDesc()).thenReturn(Optional.empty());
        assertEquals(new BigDecimal("12.50"), service.resolve(Garage.builder().build(), OrderType.SINGLE_CROSSING));
        verify(repository, never()).save(any());
    }
}
