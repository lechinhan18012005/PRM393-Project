package com.prm393.floodrescue.features.quotation.service.impl;

import com.prm393.floodrescue.common.exception.BadRequestException;
import com.prm393.floodrescue.common.exception.ResourceNotFoundException;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.common.contracts.dto.GarageServiceSnapshot;
import com.prm393.floodrescue.common.contracts.dto.MechanicContextSnapshot;
import com.prm393.floodrescue.common.contracts.dto.OrderSnapshot;
import com.prm393.floodrescue.common.contracts.service.GarageCatalogLookup;
import com.prm393.floodrescue.common.contracts.service.RescueOrderCommands;
import com.prm393.floodrescue.common.contracts.service.RescueOrderLookup;
import com.prm393.floodrescue.features.quotation.dto.*;
import com.prm393.floodrescue.features.quotation.entity.Quotation;
import com.prm393.floodrescue.features.quotation.entity.QuotationItem;
import com.prm393.floodrescue.features.quotation.entity.QuotationStatus;
import com.prm393.floodrescue.features.quotation.repository.QuotationRepository;
import com.prm393.floodrescue.features.quotation.service.QuotationService;
import com.prm393.floodrescue.features.garage.entity.ServiceType;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.HashSet;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class QuotationServiceImpl implements QuotationService {
    private static final Set<String> QUOTABLE_ORDER_STATUSES = Set.of(
            "ARRIVED", "IN_PROGRESS");
    private static final Set<String> ADDITIONAL_QUOTE_STATUSES = Set.of(
            "IN_PROGRESS");

    private final QuotationRepository quotationRepository;
    private final GarageCatalogLookup garageCatalog;
    private final RescueOrderLookup orderLookup;
    private final RescueOrderCommands orderCommands;

    @Transactional
    @Override
    public QuotationResponse create(Long orderId, User mechanicUser, CreateQuotationRequest request) {
        OrderSnapshot order = orderLookup.getRequiredOrder(orderId);
        requireMechanic(order, mechanicUser);
        requireStatus(order, QUOTABLE_ORDER_STATUSES, "Đơn chưa ở trạng thái cho phép lập báo giá");

        MechanicContextSnapshot mechanic = garageCatalog.getRequiredMechanicContext(mechanicUser.getId());
        validateAssignment(order, mechanic);

        Quotation previous = quotationRepository.findFirstByOrderIdAndLatestTrue(orderId).orElse(null);
        if (previous != null && previous.getStatus() == QuotationStatus.FINALIZED
                && !ADDITIONAL_QUOTE_STATUSES.contains(order.getStatus().toUpperCase())) {
            throw new BadRequestException("Báo giá của đơn đã được chốt");
        }
        if (previous != null) {
            previous.setLatest(false);
            previous.setStatus(QuotationStatus.SUPERSEDED);
        }

        BigDecimal subtotal = BigDecimal.ZERO;
        Set<ServiceType> selectedServiceTypes = new HashSet<>();
        Quotation quotation = Quotation.builder()
                .orderId(orderId)
                .mechanicId(mechanic.getMechanicStaffId())
                .diagnosis(request.getDiagnosis().trim())
                .diagnosisImageUrl(trimToNull(request.getDiagnosisImageUrl()))
                .status(QuotationStatus.PENDING_APPROVAL)
                .bookingFee(nonNegative(order.getBookingFee()))
                .discountAmount(nonNegative(request.getDiscountAmount()))
                .version(previous == null ? 1 : previous.getVersion() + 1)
                .parentQuotationId(previous == null ? null : previous.getId())
                .latest(true)
                .subtotalAmount(BigDecimal.ZERO)
                .totalAmount(BigDecimal.ZERO)
                .build();

        Set<Long> selectedServiceIds = new HashSet<>();
        for (CreateQuotationItemRequest itemRequest : request.getItems()) {
            if (!selectedServiceIds.add(itemRequest.getServiceId())) {
                throw new BadRequestException("Một dịch vụ không được lặp lại trong cùng báo giá");
            }
            GarageServiceSnapshot service = garageCatalog.getRequiredActiveService(
                    itemRequest.getServiceId(), order.getGarageId());
            if (service.getServiceType() != ServiceType.REPAIR_ONSITE
                    && service.getServiceType() != ServiceType.TOWING) {
                throw new BadRequestException("Báo giá sửa/chở xe chỉ được chọn dịch vụ sửa tại chỗ hoặc kéo xe");
            }
            selectedServiceTypes.add(service.getServiceType());
            BigDecimal unitPrice = service.getStandardPrice();
            if (unitPrice == null || unitPrice.signum() < 0) {
                throw new BadRequestException("Dịch vụ chưa có đơn giá hợp lệ: " + service.getServiceName());
            }
            if (service.getMinPrice() != null && unitPrice.compareTo(service.getMinPrice()) < 0
                    || service.getMaxPrice() != null && unitPrice.compareTo(service.getMaxPrice()) > 0) {
                throw new BadRequestException("Đơn giá dịch vụ nằm ngoài khung giá: " + service.getServiceName());
            }
            BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(itemRequest.getQuantity()));
            subtotal = subtotal.add(lineTotal);
            quotation.addItem(QuotationItem.builder()
                    .serviceId(service.getServiceId())
                    .itemName(service.getServiceName())
                    .description(itemRequest.getDescription() == null || itemRequest.getDescription().isBlank()
                            ? service.getDescription() : itemRequest.getDescription().trim())
                    .quantity(itemRequest.getQuantity())
                    .unitPrice(unitPrice)
                    .subtotal(lineTotal)
                    .itemType(service.getServiceType())
                    .build());
        }

        if (selectedServiceTypes.contains(ServiceType.REPAIR_ONSITE)
                && selectedServiceTypes.contains(ServiceType.TOWING)) {
            throw new BadRequestException(
                    "Không thể báo giá đồng thời sửa tại chỗ và kéo xe; hãy chọn một phương án xử lý");
        }

        BigDecimal total = quotation.getBookingFee().add(subtotal).subtract(quotation.getDiscountAmount());
        if (total.signum() < 0) {
            throw new BadRequestException("Giảm giá không được lớn hơn tổng tiền trước giảm");
        }
        quotation.setSubtotalAmount(subtotal);
        quotation.setTotalAmount(total);
        Quotation saved = quotationRepository.save(quotation);
        orderCommands.markWaitingForQuotationApproval(orderId, saved.getId(), total);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    @Override
    public List<QuotationResponse> history(Long orderId, User user) {
        requireParticipant(orderLookup.getRequiredOrder(orderId), user);
        return quotationRepository.findByOrderIdOrderByVersionDesc(orderId).stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    @Override
    public List<GarageServiceSnapshot> catalog(Long orderId, User mechanicUser) {
        OrderSnapshot order = orderLookup.getRequiredOrder(orderId);
        requireMechanic(order, mechanicUser);
        return garageCatalog.getActiveServices(order.getGarageId()).stream()
                .filter(service -> service.getServiceType() == ServiceType.REPAIR_ONSITE
                        || service.getServiceType() == ServiceType.TOWING)
                .toList();
    }

    @Transactional
    @Override
    public QuotationResponse approve(Long quotationId, User customer, QuotationDecisionRequest request) {
        Quotation quotation = getPendingLatest(quotationId, customer);
        quotation.setStatus(QuotationStatus.FINALIZED);
        quotation.setCustomerNote(trimToNull(request.getNote()));
        quotation.setFinalizedAt(LocalDateTime.now());
        orderCommands.finalizeQuotation(quotation.getOrderId(), quotation.getId(), quotation.getTotalAmount());
        return toResponse(quotation);
    }

    @Transactional
    @Override
    public QuotationResponse reject(Long quotationId, User customer, QuotationDecisionRequest request) {
        String reason = trimToNull(request.getNote());
        if (reason == null) throw new BadRequestException("Vui lòng nhập lý do từ chối");
        Quotation quotation = getPendingLatest(quotationId, customer);
        quotation.setStatus(QuotationStatus.REJECTED);
        quotation.setRejectionReason(reason);
        return toResponse(quotation);
    }

    @Transactional
    @Override
    public QuotationResponse requestRevision(Long quotationId, User customer, QuotationDecisionRequest request) {
        String note = trimToNull(request.getNote());
        if (note == null) throw new BadRequestException("Vui lòng nhập nội dung cần điều chỉnh");
        Quotation quotation = getPendingLatest(quotationId, customer);
        quotation.setStatus(QuotationStatus.REVISION_REQUESTED);
        quotation.setCustomerNote(note);
        return toResponse(quotation);
    }

    private Quotation getPendingLatest(Long id, User customer) {
        Quotation quotation = quotationRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy báo giá: " + id));
        OrderSnapshot order = orderLookup.getRequiredOrder(quotation.getOrderId());
        if (!customer.getId().equals(order.getCustomerUserId())) throw new AccessDeniedException("Không phải khách hàng của đơn");
        if (!quotation.isLatest() || quotation.getStatus() != QuotationStatus.PENDING_APPROVAL) {
            throw new BadRequestException("Báo giá không còn chờ khách hàng xử lý");
        }
        return quotation;
    }

    private void validateAssignment(OrderSnapshot order, MechanicContextSnapshot mechanic) {
        if (!mechanic.isGarageApproved() || !mechanic.isBranchOpen()) {
            throw new BadRequestException("Garage hoặc chi nhánh chưa sẵn sàng hoạt động");
        }
        if (!mechanic.getMechanicStaffId().equals(order.getMechanicStaffId())
                || !mechanic.getGarageId().equals(order.getGarageId())
                || !mechanic.getBranchId().equals(order.getBranchId())) {
            throw new AccessDeniedException("Thợ không được phân công cho đơn này");
        }
    }

    private void requireMechanic(OrderSnapshot order, User user) {
        if (order.getMechanicUserId() == null || !order.getMechanicUserId().equals(user.getId())) {
            throw new AccessDeniedException("Thợ không được phân công cho đơn này");
        }
    }

    private void requireParticipant(OrderSnapshot order, User user) {
        if (!user.getId().equals(order.getCustomerUserId()) && !user.getId().equals(order.getMechanicUserId())) {
            throw new AccessDeniedException("Bạn không thuộc đơn cứu hộ này");
        }
    }

    private void requireStatus(OrderSnapshot order, Set<String> accepted, String message) {
        if (order.getStatus() == null || !accepted.contains(order.getStatus().toUpperCase())) {
            throw new BadRequestException(message);
        }
    }

    private BigDecimal nonNegative(BigDecimal value) {
        if (value == null) return BigDecimal.ZERO;
        if (value.signum() < 0) throw new BadRequestException("Số tiền không được âm");
        return value;
    }

    private String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private QuotationResponse toResponse(Quotation q) {
        return QuotationResponse.builder()
                .id(q.getId()).orderId(q.getOrderId()).mechanicId(q.getMechanicId())
                .diagnosis(q.getDiagnosis()).diagnosisImageUrl(q.getDiagnosisImageUrl()).status(q.getStatus())
                .subtotalAmount(q.getSubtotalAmount()).bookingFee(q.getBookingFee())
                .discountAmount(q.getDiscountAmount()).totalAmount(q.getTotalAmount())
                .customerNote(q.getCustomerNote()).rejectionReason(q.getRejectionReason())
                .parentQuotationId(q.getParentQuotationId()).version(q.getVersion()).latest(q.isLatest())
                .createdAt(q.getCreatedAt()).finalizedAt(q.getFinalizedAt())
                .items(q.getItems().stream().map(i -> QuotationItemResponse.builder()
                        .id(i.getId()).serviceId(i.getServiceId()).itemName(i.getItemName())
                        .description(i.getDescription()).quantity(i.getQuantity()).unitPrice(i.getUnitPrice())
                        .subtotal(i.getSubtotal()).itemType(i.getItemType()).build()).toList())
                .build();
    }
}
