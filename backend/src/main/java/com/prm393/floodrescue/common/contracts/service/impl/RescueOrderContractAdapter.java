package com.prm393.floodrescue.common.contracts.service.impl;

import com.prm393.floodrescue.common.contracts.dto.OrderSnapshot;
import com.prm393.floodrescue.common.contracts.service.RescueOrderCommands;
import com.prm393.floodrescue.common.contracts.service.RescueOrderLookup;
import com.prm393.floodrescue.common.exception.BadRequestException;
import com.prm393.floodrescue.common.exception.ResourceNotFoundException;
import com.prm393.floodrescue.features.garage.entity.ServiceType;
import com.prm393.floodrescue.features.garage.repository.ServiceItemRepository;
import com.prm393.floodrescue.features.garage.repository.GarageBranchRepository;
import com.prm393.floodrescue.features.mechanic.repository.MechanicStaffRepository;
import com.prm393.floodrescue.features.quotation.entity.Quotation;
import com.prm393.floodrescue.features.quotation.entity.QuotationItem;
import com.prm393.floodrescue.features.quotation.repository.QuotationRepository;
import com.prm393.floodrescue.features.rescue.entity.OrderType;
import com.prm393.floodrescue.features.rescue.entity.RescueOrder;
import com.prm393.floodrescue.features.rescue.entity.RescueOrderStatus;
import com.prm393.floodrescue.features.rescue.entity.TransportStage;
import com.prm393.floodrescue.features.rescue.repository.RescueOrderRepository;
import com.prm393.floodrescue.features.rescue.service.MechanicAssignmentLifecycleService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RescueOrderContractAdapter implements RescueOrderLookup, RescueOrderCommands {
    private final RescueOrderRepository orderRepository;
    private final QuotationRepository quotationRepository;
    private final ServiceItemRepository serviceItemRepository;
    private final MechanicStaffRepository mechanicStaffRepository;
    private final GarageBranchRepository branchRepository;
    private final MechanicAssignmentLifecycleService mechanicLifecycle;

    @Override
    @Transactional(readOnly = true)
    public OrderSnapshot getRequiredOrder(Long orderId) {
        return toSnapshot(requiredOrder(orderId));
    }

    @Override
    public List<OrderSnapshot> findByBatchTripId(Long batchTripId) {
        return orderRepository.findByBatchTripIdOrderByCreatedAtAsc(batchTripId)
                .stream().map(this::toSnapshot).toList();
    }

    @Override
    @Transactional
    public void markWaitingForQuotationApproval(Long orderId, Long quotationId, BigDecimal estimatedAmount) {
        RescueOrder order = requiredLockedOrder(orderId);
        requireStatus(order, RescueOrderStatus.ARRIVED, RescueOrderStatus.IN_PROGRESS);
        // Dev's order state machine has no separate quotation-waiting status.
        // Keep the accepted amount unchanged until the customer approves.
    }

    @Override
    @Transactional
    public void finalizeQuotation(Long orderId, Long quotationId, BigDecimal totalAmount) {
        RescueOrder order = requiredLockedOrder(orderId);
        Quotation quotation = quotationRepository.findByIdForUpdate(quotationId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy báo giá: " + quotationId));
        if (!orderId.equals(quotation.getOrderId())) {
            throw new BadRequestException("Báo giá không thuộc đơn cứu hộ");
        }
        boolean requiresTowing = quotation.getItems().stream()
                .anyMatch(item -> item.getItemType() == ServiceType.TOWING);
        QuotationItem primaryItem = quotation.getItems().stream()
                .filter(item -> !requiresTowing || item.getItemType() == ServiceType.TOWING)
                .findFirst()
                .orElseThrow(() -> new BadRequestException("Báo giá không có hạng mục dịch vụ"));
        order.setServiceItem(serviceItemRepository.findById(primaryItem.getServiceId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Không tìm thấy dịch vụ: " + primaryItem.getServiceId())));
        order.setOrderType(requiresTowing ? OrderType.TOWING : OrderType.ONSITE_REPAIR);
        order.setTotalAmount(totalAmount);
    }

    @Override
    @Transactional
    public void attachBatchTrip(Long orderId, Long batchTripId, Long mechanicStaffId,
                                Long branchId, BigDecimal fareAmount) {
        RescueOrder order = requiredLockedOrder(orderId);
        requireStatus(order, RescueOrderStatus.REQUESTED, RescueOrderStatus.DISPATCH_FAILED);
        if (order.getOrderType() != OrderType.BATCH_CROSSING) {
            throw new BadRequestException("Chỉ đơn gom xe mới được tham gia chuyến");
        }
        order.setMechanicStaff(mechanicStaffRepository.findById(mechanicStaffId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thợ phụ trách")));
        order.setBranch(branchRepository.findById(branchId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chi nhánh phụ trách")));
        order.setBatchTripId(batchTripId);
        BigDecimal bookingFee = order.getBookingFee() == null ? BigDecimal.ZERO : order.getBookingFee();
        order.setServiceBasePrice(fareAmount.subtract(bookingFee).max(BigDecimal.ZERO));
        order.setTotalAmount(fareAmount);
        order.setStatus(RescueOrderStatus.DISPATCHED);
        order.setAcceptedAt(LocalDateTime.now());
        order.setTransportStage(TransportStage.NONE);
        order.setTransportNote("Đã tham gia chuyến gom #" + batchTripId);
    }

    @Override
    @Transactional
    public void detachBatchTrip(Long orderId) {
        RescueOrder order = requiredLockedOrder(orderId);
        if (order.getBatchTripId() == null) throw new BadRequestException("Đơn chưa tham gia chuyến gom");
        resetBatchAssignment(order);
        restoreCatalogPrice(order);
    }

    @Override
    @Transactional
    public void cancelBatchOrder(Long orderId, String reason) {
        RescueOrder order = requiredLockedOrder(orderId);
        if (order.getOrderType() != OrderType.BATCH_CROSSING) {
            throw new BadRequestException("Chỉ đơn gom xe mới được hủy cùng chuyến");
        }
        if (order.getStatus() != RescueOrderStatus.REQUESTED
                && order.getStatus() != RescueOrderStatus.DISPATCHED) {
            throw new BadRequestException("Đơn gom đã bắt đầu phục vụ, không thể hủy cùng chuyến");
        }
        order.setStatus(RescueOrderStatus.CANCELLED);
        order.setCancelledAt(LocalDateTime.now());
        order.setCancelReason(reason);
        order.setTransportNote(reason);
    }

    @Override
    @Transactional
    public void convertToPrivateCrossing(Long orderId) {
        RescueOrder order = requiredLockedOrder(orderId);
        if (order.getBatchTripId() == null) throw new BadRequestException("Đơn chưa tham gia chuyến gom");
        resetBatchAssignment(order);
        order.setOrderType(OrderType.SINGLE_CROSSING);
        order.setTransportNote("Khách chuyển sang chuyến riêng");
        restoreCatalogPrice(order);
    }

    @Override
    @Transactional
    public void completeBatchOrder(Long orderId) {
        RescueOrder order = requiredLockedOrder(orderId);
        if (order.getOrderType() != OrderType.BATCH_CROSSING
                || order.getTransportStage() != TransportStage.HANDED_OVER) {
            throw new BadRequestException("Đơn gom chưa hoàn tất bàn giao xe");
        }
        LocalDateTime completedAt = LocalDateTime.now();
        order.setCompletionPhotoUrl(order.getHandoverPhotoUrl());
        order.setServiceCompletedAt(completedAt);
        order.setStatus(RescueOrderStatus.PAYMENT_PENDING);
        mechanicLifecycle.releaseIfNoOtherActiveOrder(order, completedAt);
    }

    @Override
    @Transactional
    public void markVehiclePickedUp(Long orderId) {
        RescueOrder order = requiredLockedOrder(orderId);
        if (order.getOrderType() == OrderType.BATCH_CROSSING) {
            requireStatus(order, RescueOrderStatus.DISPATCHED);
            order.setStatus(RescueOrderStatus.IN_PROGRESS);
            order.setServiceStartedAt(LocalDateTime.now());
        } else {
            requireStatus(order, RescueOrderStatus.IN_PROGRESS);
            requireTowing(order);
        }
        order.setTransportStage(TransportStage.VEHICLE_RECEIVED);
    }

    @Override
    @Transactional
    public void markVehicleDelivered(Long orderId, String completionImageUrl) {
        RescueOrder order = requiredLockedOrder(orderId);
        requireStatus(order, RescueOrderStatus.IN_PROGRESS);
        if (order.getOrderType() != OrderType.BATCH_CROSSING) requireTowing(order);
        order.setTransportStage(TransportStage.HANDED_OVER);
        order.setHandoverPhotoUrl(completionImageUrl);
    }

    @Override
    @Transactional
    public void startService(Long orderId, Long finalizedQuotationId) {
        RescueOrder order = requiredLockedOrder(orderId);
        requireStatus(order, RescueOrderStatus.ARRIVED);
        order.setStatus(RescueOrderStatus.IN_PROGRESS);
        order.setServiceStartedAt(LocalDateTime.now());
        order.setTransportStage(TransportStage.NONE);
    }

    @Override
    @Transactional
    public void transferToGarage(Long orderId, Long destinationBranchId) {
        RescueOrder order = requiredLockedOrder(orderId);
        requireStatus(order, RescueOrderStatus.IN_PROGRESS);
        requireTowing(order);
        order.setTransportStage(TransportStage.IN_TRANSIT);
        order.setTransportNote("Chuyển xe về chi nhánh #" + destinationBranchId);
    }

    @Override
    @Transactional
    public void requestOrderCompletion(Long orderId, String completionImageUrl) {
        RescueOrder order = requiredLockedOrder(orderId);
        requireStatus(order, RescueOrderStatus.IN_PROGRESS);
        LocalDateTime completedAt = LocalDateTime.now();
        order.setCompletionPhotoUrl(completionImageUrl);
        order.setServiceCompletedAt(completedAt);
        order.setStatus(RescueOrderStatus.PAYMENT_PENDING);
        mechanicLifecycle.releaseIfNoOtherActiveOrder(order, completedAt);
    }

    private RescueOrder requiredOrder(Long orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn cứu hộ: " + orderId));
    }

    private RescueOrder requiredLockedOrder(Long orderId) {
        return orderRepository.findByIdWithLock(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn cứu hộ: " + orderId));
    }

    private void requireStatus(RescueOrder order, RescueOrderStatus... accepted) {
        for (RescueOrderStatus status : accepted) {
            if (order.getStatus() == status) return;
        }
        throw new BadRequestException("Trạng thái đơn không hợp lệ cho thao tác này: " + order.getStatus());
    }

    private void requireTowing(RescueOrder order) {
        if (order.getOrderType() != OrderType.TOWING) {
            throw new BadRequestException(
                    "Đơn chưa được khách hàng duyệt phương án kéo xe về garage");
        }
    }

    private OrderSnapshot toSnapshot(RescueOrder order) {
        return OrderSnapshot.builder()
                .orderId(order.getId())
                .customerUserId(order.getCustomer().getId())
                .mechanicUserId(order.getMechanicStaff() == null ? null : order.getMechanicStaff().getUser().getId())
                .mechanicStaffId(order.getMechanicStaff() == null ? null : order.getMechanicStaff().getId())
                .garageId(order.getGarage().getId())
                .branchId(order.getBranch() == null ? null : order.getBranch().getId())
                .batchTripId(order.getBatchTripId())
                .rescueType(order.getOrderType().name())
                .status(order.getStatus().name())
                .transportStage(order.getTransportStage().name())
                .orderCode(order.getOrderCode())
                .customerName(order.getCustomer().getFullName())
                .customerPhone(order.getCustomer().getPhone())
                .vehiclePlate(order.getVehiclePlate())
                .vehicleModel(order.getVehicleModel())
                .pickupAddress(order.getPickupAddress())
                .dropoffAddress(order.getDropoffAddress())
                .bookingFee(order.getBookingFee())
                .totalAmount(order.getTotalAmount())
                .build();
    }

    private void resetBatchAssignment(RescueOrder order) {
        order.setBatchTripId(null);
        order.setMechanicStaff(null);
        order.setBranch(null);
        order.setStatus(RescueOrderStatus.REQUESTED);
        order.setAcceptedAt(null);
        order.setServiceStartedAt(null);
        order.setTransportStage(TransportStage.NONE);
        order.setTransportNote(null);
    }

    private void restoreCatalogPrice(RescueOrder order) {
        BigDecimal basePrice = order.getServiceItem().getStandardPrice();
        order.setServiceBasePrice(basePrice);
        order.setTotalAmount(basePrice.add(order.getBookingFee()));
    }
}
