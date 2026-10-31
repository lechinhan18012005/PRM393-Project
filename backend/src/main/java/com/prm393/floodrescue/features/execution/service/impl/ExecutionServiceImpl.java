package com.prm393.floodrescue.features.execution.service.impl;

import com.prm393.floodrescue.common.exception.BadRequestException;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.execution.dto.ExecutionActionResponse;
import com.prm393.floodrescue.features.execution.dto.ExecutionRecordResponse;
import com.prm393.floodrescue.features.execution.entity.ExecutionAction;
import com.prm393.floodrescue.features.execution.entity.ServiceExecutionRecord;
import com.prm393.floodrescue.features.execution.repository.ServiceExecutionRecordRepository;
import com.prm393.floodrescue.features.execution.service.ExecutionService;
import com.prm393.floodrescue.common.contracts.dto.GarageBranchSnapshot;
import com.prm393.floodrescue.common.contracts.dto.MechanicContextSnapshot;
import com.prm393.floodrescue.common.contracts.dto.OrderSnapshot;
import com.prm393.floodrescue.common.contracts.service.GarageCatalogLookup;
import com.prm393.floodrescue.common.contracts.service.RescueOrderCommands;
import com.prm393.floodrescue.common.contracts.service.RescueOrderLookup;
import com.prm393.floodrescue.features.quotation.dto.ApprovedQuoteSnapshot;
import com.prm393.floodrescue.features.quotation.service.QuoteApprovalLookup;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ExecutionServiceImpl implements ExecutionService {
    private static final Set<String> STARTABLE = Set.of("ARRIVED");
    private static final Set<String> IN_PROGRESS = Set.of("IN_PROGRESS");
    private static final Set<String> PICKUP_ALLOWED = Set.of("IN_PROGRESS");
    private static final Set<String> DELIVERY_ALLOWED = Set.of("IN_PROGRESS");

    private final RescueOrderLookup orderLookup;
    private final RescueOrderCommands orderCommands;
    private final QuoteApprovalLookup quoteApprovalLookup;
    private final GarageCatalogLookup garageCatalog;
    private final ServiceExecutionRecordRepository executionRecordRepository;

    @Transactional
    @Override
    public ExecutionActionResponse start(Long orderId, User mechanicUser) {
        OrderSnapshot order = assignedOrder(orderId, mechanicUser);
        requireStatus(order, STARTABLE, "Đơn chưa ở trạng thái có thể bắt đầu dịch vụ");
        ApprovedQuoteSnapshot quote = quoteApprovalLookup.getRequiredFinalizedQuote(orderId);
        orderCommands.startService(orderId, quote.getQuotationId());
        ServiceExecutionRecord record = saveRecord(order, ExecutionAction.SERVICE_STARTED,
                "Bắt đầu thực hiện dịch vụ", null, null, quote.getQuotationId());
        return ExecutionActionResponse.builder().executionRecordId(record.getId())
                .orderId(orderId).action("SERVICE_STARTED")
                .finalizedQuotationId(quote.getQuotationId()).build();
    }

    @Transactional
    @Override
    public ExecutionActionResponse updateProgress(Long orderId, String note, String evidenceImageUrl,
                                                  User mechanicUser) {
        OrderSnapshot order = assignedOrder(orderId, mechanicUser);
        requireStatus(order, IN_PROGRESS, "Đơn chưa bắt đầu thực hiện dịch vụ");
        ServiceExecutionRecord record = saveRecord(order, ExecutionAction.PROGRESS_UPDATED,
                note.trim(), trimToNull(evidenceImageUrl), null, null);
        return ExecutionActionResponse.builder().executionRecordId(record.getId())
                .orderId(orderId).action("PROGRESS_UPDATED")
                .completionImageUrl(trimToNull(evidenceImageUrl)).build();
    }

    @Transactional
    @Override
    public ExecutionActionResponse markPickedUp(Long orderId, User mechanicUser) {
        OrderSnapshot order = assignedOrder(orderId, mechanicUser);
        requireStatus(order, PICKUP_ALLOWED, "Đơn chưa ở trạng thái có thể nhận xe");
        requireTowing(order);
        requireActionAbsent(orderId, ExecutionAction.VEHICLE_PICKED_UP, "Xe đã được xác nhận tiếp nhận");
        orderCommands.markVehiclePickedUp(orderId);
        ServiceExecutionRecord record = saveRecord(order, ExecutionAction.VEHICLE_PICKED_UP,
                "Đã nhận xe từ khách hàng", null, null, null);
        return ExecutionActionResponse.builder().executionRecordId(record.getId())
                .orderId(orderId).action("VEHICLE_PICKED_UP").build();
    }

    @Transactional
    @Override
    public ExecutionActionResponse transfer(Long orderId, Long destinationBranchId, User mechanicUser) {
        OrderSnapshot order = assignedOrder(orderId, mechanicUser);
        requireStatus(order, IN_PROGRESS, "Đơn chưa bắt đầu thực hiện dịch vụ");
        requireTowing(order);
        requireActionPresent(orderId, ExecutionAction.VEHICLE_PICKED_UP,
                "Cần xác nhận nhận xe trước khi vận chuyển");
        requireActionAbsent(orderId, ExecutionAction.TRANSFER_TO_GARAGE,
                "Xe đã được xác nhận chuyển về garage");
        GarageBranchSnapshot branch = garageCatalog.getRequiredBranch(destinationBranchId, order.getGarageId());
        if (!branch.isOpen()) throw new BadRequestException("Chi nhánh đích đang đóng");
        orderCommands.transferToGarage(orderId, destinationBranchId);
        ServiceExecutionRecord record = saveRecord(order, ExecutionAction.TRANSFER_TO_GARAGE,
                "Chuyển xe về " + branch.getBranchName(), null, destinationBranchId, null);
        return ExecutionActionResponse.builder().executionRecordId(record.getId())
                .orderId(orderId).action("TRANSFER_TO_GARAGE")
                .destinationBranchId(destinationBranchId).build();
    }

    @Transactional
    @Override
    public ExecutionActionResponse markDelivered(Long orderId, String imageUrl, User mechanicUser) {
        OrderSnapshot order = assignedOrder(orderId, mechanicUser);
        requireStatus(order, DELIVERY_ALLOWED, "Đơn chưa ở trạng thái có thể bàn giao xe");
        requireTowing(order);
        requireActionPresent(orderId, ExecutionAction.TRANSFER_TO_GARAGE,
                "Cần xác nhận bắt đầu vận chuyển trước khi bàn giao xe");
        requireActionAbsent(orderId, ExecutionAction.VEHICLE_DELIVERED, "Xe đã được bàn giao");
        String evidence = imageUrl.trim();
        orderCommands.markVehicleDelivered(orderId, evidence);
        ServiceExecutionRecord record = saveRecord(order, ExecutionAction.VEHICLE_DELIVERED,
                "Đã bàn giao xe", evidence, null, null);
        return ExecutionActionResponse.builder().executionRecordId(record.getId())
                .orderId(orderId).action("VEHICLE_DELIVERED").completionImageUrl(evidence).build();
    }

    @Transactional
    @Override
    public ExecutionActionResponse requestCompletion(Long orderId, String imageUrl, User mechanicUser) {
        OrderSnapshot order = assignedOrder(orderId, mechanicUser);
        requireStatus(order, IN_PROGRESS, "Đơn chưa bắt đầu thực hiện dịch vụ");
        if ("TOWING".equalsIgnoreCase(order.getRescueType())) {
            requireActionPresent(orderId, ExecutionAction.VEHICLE_DELIVERED,
                    "Cần bàn giao xe tại garage trước khi hoàn tất đơn kéo xe");
        }
        String evidence = imageUrl.trim();
        orderCommands.requestOrderCompletion(orderId, evidence);
        ServiceExecutionRecord record = saveRecord(order, ExecutionAction.COMPLETION_REQUESTED,
                "Yêu cầu khách hàng nghiệm thu", evidence, null, null);
        return ExecutionActionResponse.builder().executionRecordId(record.getId())
                .orderId(orderId).action("COMPLETION_REQUESTED")
                .completionImageUrl(evidence).build();
    }

    @Transactional(readOnly = true)
    @Override
    public List<ExecutionRecordResponse> history(Long orderId, User mechanicUser) {
        assignedOrder(orderId, mechanicUser);
        return executionRecordRepository.findByOrderIdOrderByCreatedAtAsc(orderId)
                .stream().map(this::toResponse).toList();
    }

    private ServiceExecutionRecord saveRecord(OrderSnapshot order, ExecutionAction action, String note,
                                              String evidenceImageUrl, Long destinationBranchId,
                                              Long quotationId) {
        return executionRecordRepository.save(ServiceExecutionRecord.builder()
                .orderId(order.getOrderId())
                .mechanicId(order.getMechanicStaffId())
                .action(action)
                .note(note)
                .evidenceImageUrl(evidenceImageUrl)
                .destinationBranchId(destinationBranchId)
                .quotationId(quotationId)
                .build());
    }

    private ExecutionRecordResponse toResponse(ServiceExecutionRecord record) {
        return ExecutionRecordResponse.builder()
                .id(record.getId())
                .orderId(record.getOrderId())
                .mechanicId(record.getMechanicId())
                .action(record.getAction())
                .note(record.getNote())
                .evidenceImageUrl(record.getEvidenceImageUrl())
                .destinationBranchId(record.getDestinationBranchId())
                .quotationId(record.getQuotationId())
                .createdAt(record.getCreatedAt())
                .build();
    }

    private String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private OrderSnapshot assignedOrder(Long orderId, User user) {
        OrderSnapshot order = orderLookup.getRequiredOrder(orderId);
        if (order.getMechanicUserId() == null || !order.getMechanicUserId().equals(user.getId())) {
            throw new AccessDeniedException("Thợ không được phân công cho đơn này");
        }
        MechanicContextSnapshot mechanic = garageCatalog.getRequiredMechanicContext(user.getId());
        if (!mechanic.getMechanicStaffId().equals(order.getMechanicStaffId())
                || !mechanic.getBranchId().equals(order.getBranchId())) {
            throw new AccessDeniedException("Phân công thợ hoặc chi nhánh không hợp lệ");
        }
        return order;
    }

    private void requireStatus(OrderSnapshot order, Set<String> accepted, String message) {
        if (order.getStatus() == null || !accepted.contains(order.getStatus().toUpperCase())) {
            throw new BadRequestException(message);
        }
    }

    private void requireTowing(OrderSnapshot order) {
        if (!"TOWING".equalsIgnoreCase(order.getRescueType())) {
            throw new BadRequestException(
                    "Chỉ đơn đã được khách duyệt phương án kéo xe mới được thực hiện vận chuyển");
        }
    }

    private void requireActionPresent(Long orderId, ExecutionAction action, String message) {
        if (!hasAction(orderId, action)) throw new BadRequestException(message);
    }

    private void requireActionAbsent(Long orderId, ExecutionAction action, String message) {
        if (hasAction(orderId, action)) throw new BadRequestException(message);
    }

    private boolean hasAction(Long orderId, ExecutionAction action) {
        return executionRecordRepository.findByOrderIdOrderByCreatedAtAsc(orderId).stream()
                .anyMatch(record -> record.getAction() == action);
    }
}
