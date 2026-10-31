package com.prm393.floodrescue.features.finance.service;

import com.prm393.floodrescue.common.exception.BadRequestException;
import com.prm393.floodrescue.common.exception.ResourceNotFoundException;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.finance.dto.AdminProcessRefundRequest;
import com.prm393.floodrescue.features.finance.dto.CreateDisputeRequest;
import com.prm393.floodrescue.features.finance.dto.DisputeResponse;
import com.prm393.floodrescue.features.finance.dto.StaffReviewDisputeRequest;
import com.prm393.floodrescue.features.finance.entity.*;
import com.prm393.floodrescue.features.finance.repository.ServiceDisputeRepository;
import com.prm393.floodrescue.features.finance.repository.WalletTransactionRepository;
import com.prm393.floodrescue.features.garage.entity.Garage;
import com.prm393.floodrescue.features.garage.repository.GarageRepository;
import com.prm393.floodrescue.features.payment.entity.PaymentStatus;
import com.prm393.floodrescue.features.payment.entity.PaymentTransaction;
import com.prm393.floodrescue.features.payment.repository.PaymentTransactionRepository;
import com.prm393.floodrescue.features.rescue.entity.RescueOrder;
import com.prm393.floodrescue.features.rescue.entity.RescueOrderStatus;
import com.prm393.floodrescue.features.rescue.repository.RescueOrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DisputeRefundService {

    private final ServiceDisputeRepository serviceDisputeRepository;
    private final RescueOrderRepository rescueOrderRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final GarageRepository garageRepository;
    private final WalletTransactionRepository walletTransactionRepository;

    // =========================================================================
    // UC-23 (Input): Customer submits a complaint / dispute on a completed order
    // =========================================================================

    @Transactional
    public DisputeResponse createDispute(User customer, CreateDisputeRequest request) {
        if (customer == null) {
            throw new AccessDeniedException("Yêu cầu đăng nhập để gửi khiếu nại dịch vụ");
        }

        Long rescueOrderId = request.getRescueOrderId();
        boolean hasActiveDispute = serviceDisputeRepository.existsByRescueOrderIdAndStatusIn(
                rescueOrderId,
                List.of(DisputeStatus.STAFF_REVIEW, DisputeStatus.ADMIN_APPROVAL, DisputeStatus.REFUNDED)
        );
        if (hasActiveDispute) {
            throw new BadRequestException("Đơn cứu hộ này đã có hồ sơ khiếu nại đang xử lý hoặc đã được hoàn tiền");
        }

        RescueOrder order = rescueOrderRepository.findById(rescueOrderId).orElse(null);
        if (order != null) {
            if (order.getCustomer() != null && !order.getCustomer().getId().equals(customer.getId())) {
                throw new AccessDeniedException("Bạn chỉ có thể gửi khiếu nại cho đơn cứu hộ của chính mình");
            }
            if (order.getStatus() != RescueOrderStatus.COMPLETED) {
                throw new BadRequestException("Chỉ có thể gửi khiếu nại khi đơn cứu hộ đã hoàn tất và thanh toán (COMPLETED)");
            }
        }

        PaymentTransaction tx = resolvePaidTransaction(rescueOrderId, request.getPaymentTransactionId());
        if (order == null && tx.getCustomer() != null && !tx.getCustomer().getId().equals(customer.getId())) {
            throw new AccessDeniedException("Bạn không phải là khách hàng của giao dịch thanh toán này");
        }

        if (tx.getStatus() == PaymentStatus.REFUNDED) {
            throw new BadRequestException("Giao dịch này đã được hoàn tiền trước đó");
        }
        if (tx.getStatus() != PaymentStatus.SUCCESS) {
            throw new BadRequestException("Chỉ có thể khiếu nại giao dịch đã thanh toán thành công");
        }

        BigDecimal requestedRefund = request.getRequestedRefundAmount();
        if (requestedRefund == null || requestedRefund.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Số tiền yêu cầu hoàn trả phải lớn hơn 0");
        }
        if (requestedRefund.compareTo(tx.getAmount()) > 0) {
            throw new BadRequestException(String.format(
                    "Số tiền yêu cầu hoàn trả (%s VNĐ) không được vượt quá tổng tiền đã thanh toán (%s VNĐ)",
                    requestedRefund.toPlainString(),
                    tx.getAmount().toPlainString()
            ));
        }

        Garage garage = order != null && order.getGarage() != null ? order.getGarage() : tx.getGarage();
        String rescueCode = order != null && order.getOrderCode() != null
                ? order.getOrderCode()
                : (tx.getRescueCode() != null ? tx.getRescueCode() : "#RC-" + rescueOrderId);

        String disputeCode = "REF-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();

        ServiceDispute dispute = ServiceDispute.builder()
                .disputeCode(disputeCode)
                .rescueOrderId(rescueOrderId)
                .rescueCode(rescueCode)
                .paymentTransaction(tx)
                .payosOrderCode(tx.getPayosOrderCode())
                .customer(customer)
                .garage(garage)
                .disputeType(request.getDisputeType() != null ? request.getDisputeType() : DisputeType.OVERCHARGE)
                .originalAmount(tx.getAmount())
                .requestedRefundAmount(requestedRefund)
                .proposedRefundAmount(requestedRefund)
                .customerReason(request.getCustomerReason().trim())
                .evidenceImageUrls(request.getEvidenceImageUrls())
                .status(DisputeStatus.STAFF_REVIEW)
                .refundSource(RefundSource.GARAGE_WALLET)
                .build();

        ServiceDispute saved = serviceDisputeRepository.save(dispute);
        log.info("Dispute {} created by customer {} for rescueOrder #{}", saved.getDisputeCode(), customer.getUsername(), rescueOrderId);
        return mapToResponse(saved);
    }

    // =========================================================================
    // UC-23: Staff investigates evidence, writes finding & proposes refund / rejects
    // =========================================================================

    @Transactional
    public DisputeResponse reviewDisputeByStaff(User staff, Long disputeId, StaffReviewDisputeRequest request) {
        ServiceDispute dispute = serviceDisputeRepository.findById(disputeId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ khiếu nại #" + disputeId));

        if (dispute.getStatus() == DisputeStatus.REFUNDED) {
            throw new BadRequestException("Hồ sơ khiếu nại này đã được Admin hoàn tiền, không thể chỉnh sửa");
        }

        DisputeStatus decision = request.getDecision();
        if (decision != DisputeStatus.ADMIN_APPROVAL && decision != DisputeStatus.REJECTED) {
            throw new BadRequestException("Staff chỉ được phép chuyển hồ sơ đề xuất Admin hoàn tiền (ADMIN_APPROVAL) hoặc bác bỏ khiếu nại (REJECTED)");
        }

        dispute.setStaffReviewer(staff);
        dispute.setStaffFindingNote(request.getStaffFindingNote().trim());
        dispute.setStaffReviewedAt(LocalDateTime.now());

        if (decision == DisputeStatus.ADMIN_APPROVAL) {
            BigDecimal proposed = request.getProposedRefundAmount() != null
                    ? request.getProposedRefundAmount()
                    : dispute.getRequestedRefundAmount();
            if (proposed.compareTo(BigDecimal.ZERO) <= 0 || proposed.compareTo(dispute.getOriginalAmount()) > 0) {
                throw new BadRequestException("Mức tiền đề xuất hoàn trả phải lớn hơn 0 và không vượt quá tổng tiền giao dịch gốc (" + dispute.getOriginalAmount() + " VNĐ)");
            }
            dispute.setProposedRefundAmount(proposed);
            dispute.setStatus(DisputeStatus.ADMIN_APPROVAL);
            log.info("Dispute {} reviewed by staff {} -> proposed refund {} VND to Admin",
                    dispute.getDisputeCode(), staff.getUsername(), proposed);
        } else {
            dispute.setProposedRefundAmount(BigDecimal.ZERO);
            dispute.setStatus(DisputeStatus.REJECTED);
            dispute.setResolvedAt(LocalDateTime.now());
            log.info("Dispute {} rejected by staff {}", dispute.getDisputeCode(), staff.getUsername());
        }

        return mapToResponse(serviceDisputeRepository.save(dispute));
    }

    // =========================================================================
    // UC-27: Admin approves & executes refund (100% or partial) or rejects
    // =========================================================================

    @Transactional
    public DisputeResponse processRefundByAdmin(User admin, Long disputeId, AdminProcessRefundRequest request) {
        ServiceDispute dispute = serviceDisputeRepository.findById(disputeId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ khiếu nại #" + disputeId));

        if (dispute.getStatus() == DisputeStatus.REFUNDED) {
            throw new BadRequestException("Hồ sơ khiếu nại này đã được hoàn tiền hoàn tất trước đó");
        }

        DisputeStatus decision = request.getDecision();
        if (decision != DisputeStatus.REFUNDED && decision != DisputeStatus.REJECTED && decision != DisputeStatus.STAFF_REVIEW) {
            throw new BadRequestException("Quyết định của Admin không hợp lệ (chỉ chấp nhận REFUNDED, REJECTED hoặc STAFF_REVIEW)");
        }

        dispute.setAdminApprover(admin);

        if (decision == DisputeStatus.STAFF_REVIEW) {
            dispute.setStatus(DisputeStatus.STAFF_REVIEW);
            dispute.setAdminResolutionNote(request.getAdminResolutionNote() != null && !request.getAdminResolutionNote().isBlank()
                    ? request.getAdminResolutionNote().trim()
                    : "Admin yêu cầu Staff xác minh lại chứng từ hiện trường");
            return mapToResponse(serviceDisputeRepository.save(dispute));
        }

        if (decision == DisputeStatus.REJECTED) {
            dispute.setStatus(DisputeStatus.REJECTED);
            dispute.setApprovedRefundAmount(BigDecimal.ZERO);
            dispute.setAdminResolutionNote(request.getAdminResolutionNote() != null && !request.getAdminResolutionNote().isBlank()
                    ? request.getAdminResolutionNote().trim()
                    : "Admin bác bỏ yêu cầu hoàn tiền sau khi thẩm định");
            dispute.setResolvedAt(LocalDateTime.now());
            return mapToResponse(serviceDisputeRepository.save(dispute));
        }

        // decision == DisputeStatus.REFUNDED
        BigDecimal refundAmount = request.getApprovedRefundAmount() != null
                ? request.getApprovedRefundAmount()
                : (dispute.getProposedRefundAmount() != null ? dispute.getProposedRefundAmount() : dispute.getRequestedRefundAmount());

        if (refundAmount == null || refundAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Số tiền duyệt hoàn phải lớn hơn 0");
        }
        if (refundAmount.compareTo(dispute.getOriginalAmount()) > 0) {
            throw new BadRequestException("Số tiền duyệt hoàn không được vượt quá tổng tiền gốc của đơn (" + dispute.getOriginalAmount() + " VNĐ)");
        }

        RefundSource source = request.getRefundSource() != null ? request.getRefundSource() : RefundSource.GARAGE_WALLET;
        Garage garage = dispute.getGarage();

        if (source == RefundSource.GARAGE_WALLET && garage != null) {
            BigDecimal currentWalletBalance = garageRepository.lockWalletBalance(garage.getId())
                    .orElse(garage.getWalletBalance() != null ? garage.getWalletBalance() : BigDecimal.ZERO);
            BigDecimal newWalletBalance = currentWalletBalance.subtract(refundAmount);
            garage.setWalletBalance(newWalletBalance);
            garageRepository.save(garage);

            WalletTransaction walletTx = WalletTransaction.builder()
                    .garage(garage)
                    .amount(refundAmount.negate())
                    .balanceAfter(newWalletBalance)
                    .transactionType(WalletTransactionType.DISPUTE_REFUND_DEDUCT)
                    .referenceCode(dispute.getDisputeCode())
                    .description(String.format(
                            "Khấu trừ hoàn tiền khiếu nại %s cho đơn %s (Hoàn khách: %s đ)",
                            dispute.getDisputeCode(),
                            dispute.getRescueCode(),
                            refundAmount.toPlainString()
                    ))
                    .build();
            walletTransactionRepository.save(walletTx);
        }

        PaymentTransaction tx = dispute.getPaymentTransaction();
        if (tx != null) {
            tx.setStatus(PaymentStatus.REFUNDED);
            paymentTransactionRepository.save(tx);
        }

        String refCode = request.getRefundReferenceCode() != null && !request.getRefundReferenceCode().isBlank()
                ? request.getRefundReferenceCode().trim()
                : "PAYOS-REV-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        dispute.setApprovedRefundAmount(refundAmount);
        dispute.setRefundSource(source);
        dispute.setRefundReferenceCode(refCode);
        dispute.setAdminResolutionNote(request.getAdminResolutionNote() != null && !request.getAdminResolutionNote().isBlank()
                ? request.getAdminResolutionNote().trim()
                : "Admin phê duyệt hoàn tiền cho khách hàng qua cổng đối soát");
        dispute.setStatus(DisputeStatus.REFUNDED);
        dispute.setResolvedAt(LocalDateTime.now());

        ServiceDispute saved = serviceDisputeRepository.save(dispute);
        log.info("Admin {} approved refund {} VND for dispute {} (source: {}, ref: {})",
                admin.getUsername(), refundAmount, saved.getDisputeCode(), source, refCode);
        return mapToResponse(saved);
    }

    // =========================================================================
    // Queries
    // =========================================================================

    @Transactional(readOnly = true)
    public List<DisputeResponse> getAllDisputes(DisputeStatus status) {
        List<ServiceDispute> list = (status != null)
                ? serviceDisputeRepository.findByStatusOrderByCreatedAtDesc(status)
                : serviceDisputeRepository.findAllByOrderByCreatedAtDesc();
        return list.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<DisputeResponse> getMyDisputes(User customer) {
        if (customer == null) {
            throw new AccessDeniedException("Yêu cầu đăng nhập");
        }
        return serviceDisputeRepository.findByCustomerIdOrderByCreatedAtDesc(customer.getId())
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<DisputeResponse> getDisputesByOrder(Long rescueOrderId) {
        return serviceDisputeRepository.findByRescueOrderIdOrderByCreatedAtDesc(rescueOrderId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private PaymentTransaction resolvePaidTransaction(Long rescueOrderId, Long paymentTransactionId) {
        if (paymentTransactionId != null) {
            return paymentTransactionRepository.findById(paymentTransactionId)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giao dịch thanh toán #" + paymentTransactionId));
        }
        List<PaymentTransaction> txs = paymentTransactionRepository.findByRescueOrderIdOrderByCreatedAtDesc(rescueOrderId);
        return txs.stream()
                .filter(t -> t.getStatus() == PaymentStatus.SUCCESS || t.getStatus() == PaymentStatus.REFUNDED)
                .findFirst()
                .orElseThrow(() -> new BadRequestException("Không tìm thấy giao dịch đã thanh toán thành công cho đơn cứu hộ #" + rescueOrderId));
    }

    private DisputeResponse mapToResponse(ServiceDispute d) {
        User customer = d.getCustomer();
        Garage garage = d.getGarage();
        PaymentTransaction tx = d.getPaymentTransaction();
        User staff = d.getStaffReviewer();
        User admin = d.getAdminApprover();

        return DisputeResponse.builder()
                .id(d.getId())
                .disputeCode(d.getDisputeCode())
                .rescueOrderId(d.getRescueOrderId())
                .rescueCode(d.getRescueCode())
                .paymentTransactionId(tx != null ? tx.getId() : null)
                .payosOrderCode(d.getPayosOrderCode())
                .customerId(customer != null ? customer.getId() : null)
                .customerName(customer != null ? customer.getFullName() : "Khách hàng")
                .customerPhone(customer != null ? customer.getPhone() : null)
                .garageId(garage != null ? garage.getId() : null)
                .garageName(garage != null ? garage.getGarageName() : null)
                .garageWalletBalance(garage != null && garage.getWalletBalance() != null ? garage.getWalletBalance() : BigDecimal.ZERO)
                .disputeType(d.getDisputeType())
                .originalAmount(d.getOriginalAmount())
                .requestedRefundAmount(d.getRequestedRefundAmount())
                .proposedRefundAmount(d.getProposedRefundAmount())
                .approvedRefundAmount(d.getApprovedRefundAmount())
                .customerReason(d.getCustomerReason())
                .evidenceImageUrls(d.getEvidenceImageUrls())
                .status(d.getStatus())
                .staffReviewerId(staff != null ? staff.getId() : null)
                .staffReviewerName(staff != null ? staff.getFullName() : null)
                .staffFindingNote(d.getStaffFindingNote())
                .staffReviewedAt(d.getStaffReviewedAt())
                .adminApproverId(admin != null ? admin.getId() : null)
                .adminApproverName(admin != null ? admin.getFullName() : null)
                .refundSource(d.getRefundSource())
                .adminResolutionNote(d.getAdminResolutionNote())
                .refundReferenceCode(d.getRefundReferenceCode())
                .createdAt(d.getCreatedAt())
                .resolvedAt(d.getResolvedAt())
                .build();
    }
}
