package com.prm393.floodrescue.features.execution.service;

import com.prm393.floodrescue.features.auth.entity.Role;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.common.contracts.dto.MechanicContextSnapshot;
import com.prm393.floodrescue.common.contracts.dto.OrderSnapshot;
import com.prm393.floodrescue.common.contracts.service.GarageCatalogLookup;
import com.prm393.floodrescue.common.contracts.service.RescueOrderCommands;
import com.prm393.floodrescue.common.contracts.service.RescueOrderLookup;
import com.prm393.floodrescue.features.quotation.dto.ApprovedQuoteSnapshot;
import com.prm393.floodrescue.features.quotation.service.QuoteApprovalLookup;
import com.prm393.floodrescue.features.execution.service.impl.ExecutionServiceImpl;
import com.prm393.floodrescue.features.execution.repository.ServiceExecutionRecordRepository;
import com.prm393.floodrescue.features.execution.entity.ServiceExecutionRecord;
import com.prm393.floodrescue.features.execution.entity.ExecutionAction;
import com.prm393.floodrescue.common.exception.BadRequestException;
import com.prm393.floodrescue.common.contracts.dto.GarageBranchSnapshot;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ExecutionServiceTest {
    @Mock RescueOrderLookup orderLookup;
    @Mock RescueOrderCommands orderCommands;
    @Mock QuoteApprovalLookup quoteApprovalLookup;
    @Mock GarageCatalogLookup garageCatalog;
    @Mock ServiceExecutionRecordRepository executionRecordRepository;

    @Test
    void startsOnlyWithFinalizedQuotationAndAssignedMechanic() {
        ExecutionServiceImpl service = new ExecutionServiceImpl(
                orderLookup, orderCommands, quoteApprovalLookup, garageCatalog, executionRecordRepository);
        User mechanic = User.builder().id(7L).role(Role.FIELD_MECHANIC).build();
        when(orderLookup.getRequiredOrder(10L)).thenReturn(OrderSnapshot.builder()
                .orderId(10L).mechanicUserId(7L).mechanicStaffId(70L).branchId(3L)
                .status("ARRIVED").build());
        when(garageCatalog.getRequiredMechanicContext(7L)).thenReturn(MechanicContextSnapshot.builder()
                .userId(7L).mechanicStaffId(70L).branchId(3L).build());
        when(quoteApprovalLookup.getRequiredFinalizedQuote(10L)).thenReturn(ApprovedQuoteSnapshot.builder()
                .quotationId(99L).orderId(10L).version(2).totalAmount(new BigDecimal("290000")).build());
        when(executionRecordRepository.save(any(ServiceExecutionRecord.class))).thenAnswer(invocation -> {
            ServiceExecutionRecord record = invocation.getArgument(0);
            record.setId(1L);
            return record;
        });

        var response = service.start(10L, mechanic);

        assertThat(response.getFinalizedQuotationId()).isEqualTo(99L);
        verify(orderCommands).startService(10L, 99L);
    }

    @Test
    void rejectsVehiclePickupForOnsiteRepairOrder() {
        ExecutionServiceImpl service = new ExecutionServiceImpl(
                orderLookup, orderCommands, quoteApprovalLookup, garageCatalog, executionRecordRepository);
        User mechanic = assignedMechanic("ONSITE_REPAIR");

        assertThatThrownBy(() -> service.markPickedUp(10L, mechanic))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("phương án kéo xe");
        verify(orderCommands, never()).markVehiclePickedUp(anyLong());
    }

    @Test
    void towingMustBePickedUpBeforeTransferAndTransferredBeforeDelivery() {
        ExecutionServiceImpl service = new ExecutionServiceImpl(
                orderLookup, orderCommands, quoteApprovalLookup, garageCatalog, executionRecordRepository);
        User mechanic = assignedMechanic("TOWING");
        when(executionRecordRepository.findByOrderIdOrderByCreatedAtAsc(10L))
                .thenReturn(List.of())
                .thenReturn(List.of(executionRecord(ExecutionAction.VEHICLE_PICKED_UP)))
                .thenReturn(List.of(executionRecord(ExecutionAction.VEHICLE_PICKED_UP)))
                .thenReturn(List.of(
                        executionRecord(ExecutionAction.VEHICLE_PICKED_UP),
                        executionRecord(ExecutionAction.TRANSFER_TO_GARAGE)));
        when(garageCatalog.getRequiredBranch(5L, 2L)).thenReturn(
                GarageBranchSnapshot.builder().branchId(5L).branchName("Chi nhánh 1").open(true).build());
        when(executionRecordRepository.save(any(ServiceExecutionRecord.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        assertThatThrownBy(() -> service.transfer(10L, 5L, mechanic))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("nhận xe");

        service.transfer(10L, 5L, mechanic);
        service.markDelivered(10L, "https://example.test/handover.jpg", mechanic);

        verify(orderCommands).transferToGarage(10L, 5L);
        verify(orderCommands).markVehicleDelivered(10L, "https://example.test/handover.jpg");
    }

    private User assignedMechanic(String rescueType) {
        User mechanic = User.builder().id(7L).role(Role.FIELD_MECHANIC).build();
        when(orderLookup.getRequiredOrder(10L)).thenReturn(OrderSnapshot.builder()
                .orderId(10L).mechanicUserId(7L).mechanicStaffId(70L)
                .garageId(2L).branchId(3L).status("IN_PROGRESS")
                .rescueType(rescueType).build());
        when(garageCatalog.getRequiredMechanicContext(7L)).thenReturn(MechanicContextSnapshot.builder()
                .userId(7L).mechanicStaffId(70L).branchId(3L).build());
        return mechanic;
    }

    private ServiceExecutionRecord executionRecord(ExecutionAction action) {
        return ServiceExecutionRecord.builder().orderId(10L).action(action).build();
    }
}
