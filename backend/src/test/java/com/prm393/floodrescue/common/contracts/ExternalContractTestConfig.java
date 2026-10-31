package com.prm393.floodrescue.common.contracts;

import com.prm393.floodrescue.common.contracts.dto.GarageBranchSnapshot;
import com.prm393.floodrescue.common.contracts.dto.GarageOwnerContextSnapshot;
import com.prm393.floodrescue.common.contracts.dto.GarageServiceSnapshot;
import com.prm393.floodrescue.common.contracts.dto.MechanicContextSnapshot;
import com.prm393.floodrescue.common.contracts.dto.OrderSnapshot;
import com.prm393.floodrescue.common.contracts.service.GarageCatalogLookup;
import com.prm393.floodrescue.common.contracts.service.RescueOrderCommands;
import com.prm393.floodrescue.common.contracts.service.RescueOrderLookup;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

import java.math.BigDecimal;
import java.util.List;

@TestConfiguration
public class ExternalContractTestConfig {

    @Bean
    @Primary
    GarageCatalogLookup garageCatalogLookup() {
        return new GarageCatalogLookup() {
            @Override
            public GarageServiceSnapshot getRequiredActiveService(Long serviceId, Long garageId) {
                throw unused();
            }

            @Override
            public List<GarageServiceSnapshot> getActiveServices(Long garageId) {
                throw unused();
            }

            @Override
            public MechanicContextSnapshot getRequiredMechanicContext(Long mechanicUserId) {
                throw unused();
            }

            @Override
            public MechanicContextSnapshot getRequiredMechanicByStaffId(Long mechanicStaffId) {
                throw unused();
            }

            @Override
            public GarageOwnerContextSnapshot getRequiredGarageOwnerContext(Long ownerUserId) {
                throw unused();
            }

            @Override
            public GarageBranchSnapshot getRequiredBranch(Long branchId, Long garageId) {
                throw unused();
            }
        };
    }

    @Bean
    @Primary
    RescueOrderLookup rescueOrderLookup() {
        return new RescueOrderLookup() {
            @Override
            public OrderSnapshot getRequiredOrder(Long orderId) {
                throw unused();
            }

            @Override
            public List<OrderSnapshot> findByBatchTripId(Long batchTripId) {
                throw unused();
            }
        };
    }

    @Bean
    @Primary
    RescueOrderCommands rescueOrderCommands() {
        return new RescueOrderCommands() {
            @Override
            public void markWaitingForQuotationApproval(Long orderId, Long quotationId, BigDecimal estimatedAmount) {
                throw unused();
            }

            @Override
            public void finalizeQuotation(Long orderId, Long quotationId, BigDecimal totalAmount) {
                throw unused();
            }

            @Override
            public void attachBatchTrip(Long orderId, Long batchTripId, Long mechanicStaffId,
                                        Long branchId, BigDecimal fareAmount) {
                throw unused();
            }

            @Override
            public void detachBatchTrip(Long orderId) {
                throw unused();
            }

            @Override
            public void cancelBatchOrder(Long orderId, String reason) {
                throw unused();
            }

            @Override
            public void convertToPrivateCrossing(Long orderId) {
                throw unused();
            }

            @Override
            public void completeBatchOrder(Long orderId) {
                throw unused();
            }

            @Override
            public void markVehiclePickedUp(Long orderId) {
                throw unused();
            }

            @Override
            public void markVehicleDelivered(Long orderId, String completionImageUrl) {
                throw unused();
            }

            @Override
            public void startService(Long orderId, Long finalizedQuotationId) {
                throw unused();
            }

            @Override
            public void transferToGarage(Long orderId, Long destinationBranchId) {
                throw unused();
            }

            @Override
            public void requestOrderCompletion(Long orderId, String completionImageUrl) {
                throw unused();
            }
        };
    }

    private static UnsupportedOperationException unused() {
        return new UnsupportedOperationException("Contract stub is not used by auth tests");
    }
}
