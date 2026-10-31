package com.prm393.floodrescue.features.batchtransport.service;

import com.prm393.floodrescue.features.auth.entity.Role;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.batchtransport.entity.BatchTrip;
import com.prm393.floodrescue.features.batchtransport.entity.BatchTripStatus;
import com.prm393.floodrescue.features.batchtransport.dto.JoinBatchTripRequest;
import com.prm393.floodrescue.features.batchtransport.dto.BatchTripResponse;
import com.prm393.floodrescue.features.batchtransport.repository.BatchTripRepository;
import com.prm393.floodrescue.common.contracts.dto.OrderSnapshot;
import com.prm393.floodrescue.common.contracts.dto.MechanicContextSnapshot;
import com.prm393.floodrescue.common.contracts.service.GarageCatalogLookup;
import com.prm393.floodrescue.common.contracts.service.RescueOrderCommands;
import com.prm393.floodrescue.common.contracts.service.RescueOrderLookup;
import com.prm393.floodrescue.features.batchtransport.service.impl.BatchTripServiceImpl;
import com.prm393.floodrescue.features.rescue.service.RescueDispatchService;
import com.prm393.floodrescue.features.rescue.dto.CreateRescueOrderRequest;
import com.prm393.floodrescue.features.rescue.dto.RescueOrderResponse;
import com.prm393.floodrescue.features.rescue.entity.OrderType;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BatchTripServiceTest {
    @Mock BatchTripRepository repository;
    @Mock GarageCatalogLookup garageCatalog;
    @Mock RescueOrderLookup orderLookup;
    @Mock RescueOrderCommands orderCommands;
    @Mock RescueDispatchService rescueDispatchService;

    @Test
    void joiningLastSlotMakesTripReadyAndUsesDiscountedFare() {
        BatchTripServiceImpl service = new BatchTripServiceImpl(
                repository, garageCatalog, orderLookup, orderCommands, rescueDispatchService);
        BatchTrip trip = BatchTrip.builder().id(4L).mechanicId(70L).branchId(3L)
                .capacity(4).currentVehicleCount(3).pickupPlace("Điểm A")
                .discountedPricePerVehicle(new BigDecimal("80000"))
                .status(BatchTripStatus.GATHERING).departureTime(LocalDateTime.now().plusMinutes(5))
                .pickupLatitude(10.0).pickupLongitude(106.0)
                .destinationLatitude(10.1).destinationLongitude(106.1).build();
        when(repository.findByIdForUpdate(4L)).thenReturn(Optional.of(trip));
        when(orderLookup.getRequiredOrder(11L)).thenReturn(OrderSnapshot.builder()
                .orderId(11L).customerUserId(8L).garageId(2L)
                .rescueType("BATCH_CROSSING").status("REQUESTED").build());
        when(garageCatalog.getRequiredMechanicByStaffId(70L)).thenReturn(
                MechanicContextSnapshot.builder().mechanicStaffId(70L).garageId(2L).branchId(3L).build());
        User customer = User.builder().id(8L).role(Role.CUSTOMER).build();

        var result = service.join(4L, 11L, customer);

        assertThat(result.getCurrentVehicleCount()).isEqualTo(4);
        assertThat(result.getStatus()).isEqualTo(BatchTripStatus.READY);
        verify(orderCommands).attachBatchTrip(11L, 4L, 70L, 3L, new BigDecimal("80000"));
    }

    @Test
    void creatingBatchOrderAndJoiningHappenInOneServiceTransaction() {
        BatchTripServiceImpl service = new BatchTripServiceImpl(
                repository, garageCatalog, orderLookup, orderCommands, rescueDispatchService);
        BatchTrip trip = BatchTrip.builder().id(4L).mechanicId(70L).branchId(3L)
                .capacity(2).currentVehicleCount(1).pickupPlace("Điểm A")
                .discountedPricePerVehicle(new BigDecimal("80000"))
                .status(BatchTripStatus.GATHERING).departureTime(LocalDateTime.now().plusMinutes(5))
                .pickupLatitude(10.0).pickupLongitude(106.0)
                .destinationLatitude(10.1).destinationLongitude(106.1).build();
        when(repository.findByIdForUpdate(4L)).thenReturn(Optional.of(trip));
        when(garageCatalog.getRequiredMechanicByStaffId(70L)).thenReturn(
                MechanicContextSnapshot.builder().mechanicStaffId(70L)
                        .garageId(2L).branchId(3L).build());

        CreateRescueOrderRequest orderRequest = CreateRescueOrderRequest.builder()
                .garageId(2L).serviceItemId(5L).vehicleId(9L)
                .pickupAddress("Điểm A").pickupLatitude(10.0).pickupLongitude(106.0)
                .dropoffAddress("Điểm B").dropoffLatitude(10.1).dropoffLongitude(106.1)
                .build();
        JoinBatchTripRequest request = new JoinBatchTripRequest();
        request.setOrder(orderRequest);
        request.setExpectedBatchFare(new BigDecimal("80000"));
        User customer = User.builder().id(8L).role(Role.CUSTOMER).build();
        RescueOrderResponse created = RescueOrderResponse.builder().id(11L).build();
        RescueOrderResponse attached = RescueOrderResponse.builder()
                .id(11L).orderType(OrderType.BATCH_CROSSING).build();
        when(rescueDispatchService.createBatchOrderForTrip(customer, orderRequest)).thenReturn(created);
        when(rescueDispatchService.getOrderById(customer, 11L)).thenReturn(attached);

        var result = service.createOrderAndJoin(4L, request, customer);

        assertThat(result.getTrip().getStatus()).isEqualTo(BatchTripStatus.READY);
        assertThat(result.getOrder().getOrderType()).isEqualTo(OrderType.BATCH_CROSSING);
        assertThat(orderRequest.getOrderType()).isEqualTo(OrderType.BATCH_CROSSING);
        verify(orderCommands).attachBatchTrip(11L, 4L, 70L, 3L, new BigDecimal("80000"));
    }

    @Test
    void completingTripMovesEveryDeliveredOrderToPaymentPending() {
        BatchTripServiceImpl service = new BatchTripServiceImpl(
                repository, garageCatalog, orderLookup, orderCommands, rescueDispatchService);
        BatchTrip trip = BatchTrip.builder().id(4L).mechanicId(70L).branchId(3L)
                .capacity(4).currentVehicleCount(2).pickupPlace("Điểm A")
                .discountedPricePerVehicle(new BigDecimal("80000"))
                .status(BatchTripStatus.MOVING).departureTime(LocalDateTime.now().minusMinutes(2))
                .pickupLatitude(10.0).pickupLongitude(106.0)
                .destinationLatitude(10.1).destinationLongitude(106.1).build();
        when(repository.findByIdForUpdate(4L)).thenReturn(Optional.of(trip));
        when(garageCatalog.getRequiredMechanicContext(7L)).thenReturn(MechanicContextSnapshot.builder()
                .userId(7L).mechanicStaffId(70L).branchId(3L)
                .garageApproved(true).branchOpen(true).build());
        when(orderLookup.findByBatchTripId(4L)).thenReturn(List.of(
                OrderSnapshot.builder().orderId(11L).transportStage("HANDED_OVER").build(),
                OrderSnapshot.builder().orderId(12L).transportStage("HANDED_OVER").build()));

        var result = service.complete(4L, User.builder()
                .id(7L).role(Role.FIELD_MECHANIC).build());

        assertThat(result.getStatus()).isEqualTo(BatchTripStatus.COMPLETED);
        verify(orderCommands).completeBatchOrder(11L);
        verify(orderCommands).completeBatchOrder(12L);
    }

    @Test
    void nearbyOnlyReturnsTripsWithCompatibleDestination() {
        BatchTripServiceImpl service = new BatchTripServiceImpl(
                repository, garageCatalog, orderLookup, orderCommands, rescueDispatchService);
        BatchTrip compatible = BatchTrip.builder().id(4L).mechanicId(70L).branchId(3L)
                .capacity(4).currentVehicleCount(1).pickupPlace("Điểm tập kết A")
                .destinationPlace("Điểm trả A")
                .discountedPricePerVehicle(new BigDecimal("80000"))
                .status(BatchTripStatus.GATHERING).departureTime(LocalDateTime.now().plusMinutes(5))
                .pickupLatitude(10.7894).pickupLongitude(106.6269)
                .destinationLatitude(10.7894).destinationLongitude(106.6300).build();
        BatchTrip wrongDirection = BatchTrip.builder().id(5L).mechanicId(71L).branchId(4L)
                .capacity(4).currentVehicleCount(0).pickupPlace("Điểm tập kết B")
                .destinationPlace("Điểm trả B")
                .discountedPricePerVehicle(new BigDecimal("70000"))
                .status(BatchTripStatus.GATHERING).departureTime(LocalDateTime.now().plusMinutes(5))
                .pickupLatitude(10.7895).pickupLongitude(106.6270)
                .destinationLatitude(10.9000).destinationLongitude(106.8000).build();
        when(repository.findByStatusInOrderByDepartureTimeAsc(anyList()))
                .thenReturn(List.of(compatible, wrongDirection));

        var result = service.nearby(
                10.7894, 106.6269, 5, null, 10.7894, 106.6300);

        assertThat(result).extracting(BatchTripResponse::getId).containsExactly(4L);
    }

    @Test
    void cancellingTripCancelsJoinedOrdersInsteadOfLeavingThemWaiting() {
        BatchTripServiceImpl service = new BatchTripServiceImpl(
                repository, garageCatalog, orderLookup, orderCommands, rescueDispatchService);
        BatchTrip trip = BatchTrip.builder().id(4L).mechanicId(70L).branchId(3L)
                .capacity(4).currentVehicleCount(1).pickupPlace("Điểm A")
                .discountedPricePerVehicle(new BigDecimal("80000"))
                .status(BatchTripStatus.GATHERING).departureTime(LocalDateTime.now().plusMinutes(5))
                .pickupLatitude(10.0).pickupLongitude(106.0)
                .destinationLatitude(10.1).destinationLongitude(106.1).build();
        when(repository.findByIdForUpdate(4L)).thenReturn(Optional.of(trip));
        when(garageCatalog.getRequiredMechanicContext(7L)).thenReturn(
                MechanicContextSnapshot.builder().userId(7L).mechanicStaffId(70L)
                        .branchId(3L).garageApproved(true).branchOpen(true).build());
        when(orderLookup.findByBatchTripId(4L)).thenReturn(List.of(
                OrderSnapshot.builder().orderId(11L).build()));

        var result = service.cancel(4L, User.builder()
                .id(7L).role(Role.FIELD_MECHANIC).build());

        assertThat(result.getStatus()).isEqualTo(BatchTripStatus.CANCELLED);
        verify(orderCommands).cancelBatchOrder(eq(11L), contains("thợ hủy"));
        verify(orderCommands, never()).detachBatchTrip(11L);
    }
}
