package com.prm393.floodrescue.features.finance.service;

import com.prm393.floodrescue.common.exception.BadRequestException;
import com.prm393.floodrescue.common.exception.ResourceNotFoundException;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.finance.dto.*;
import com.prm393.floodrescue.features.finance.entity.*;
import com.prm393.floodrescue.features.finance.repository.CommissionConfigRepository;
import com.prm393.floodrescue.features.finance.repository.PayoutRequestRepository;
import com.prm393.floodrescue.features.finance.repository.WalletTransactionRepository;
import com.prm393.floodrescue.features.garage.entity.Garage;
import com.prm393.floodrescue.features.garage.entity.GarageStatus;
import com.prm393.floodrescue.features.garage.repository.GarageRepository;
import com.prm393.floodrescue.features.payment.entity.PaymentStatus;
import com.prm393.floodrescue.features.payment.entity.PaymentTransaction;
import com.prm393.floodrescue.features.payment.repository.PaymentTransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FinanceAdminService {

    private final CommissionConfigRepository commissionConfigRepository;
    private final PayoutRequestRepository payoutRequestRepository;
    private final WalletTransactionRepository walletTransactionRepository;
    private final GarageRepository garageRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;

    // =========================================================================
    // UC-24: Configure Platform Commission Rate
    // =========================================================================

    @Transactional
    public CommissionConfigDto getActiveCommissionConfig() {
        CommissionConfig activeConfig = commissionConfigRepository
                .findFirstByActiveTrueOrderByCreatedAtDesc()
                .orElseGet(this::createDefaultCommissionConfig);
        return mapToCommissionDto(activeConfig);
    }

    @Transactional
    public List<CommissionConfigDto> getCommissionHistory() {
        List<CommissionConfig> configs = commissionConfigRepository.findAllByOrderByCreatedAtDesc();
        if (configs.isEmpty()) {
            configs = List.of(createDefaultCommissionConfig());
        }
        return configs.stream()
                .map(this::mapToCommissionDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public CommissionConfigDto updateCommissionConfig(User admin, UpdateCommissionConfigRequest request) {
        if (request.getGlobalRate() == null || request.getGlobalRate().compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Tỷ lệ hoa hồng nền tảng không hợp lệ");
        }

        List<CommissionConfig> existingConfigs = commissionConfigRepository.findAllByOrderByCreatedAtDesc();
        for (CommissionConfig cfg : existingConfigs) {
            if (cfg.isActive()) {
                cfg.setActive(false);
                commissionConfigRepository.save(cfg);
            }
        }

        BigDecimal global = request.getGlobalRate();
        CommissionConfig newConfig = CommissionConfig.builder()
                .globalRate(global)
                .singleCrossingRate(request.getSingleCrossingRate() != null ? request.getSingleCrossingRate() : global)
                .batchCrossingRate(request.getBatchCrossingRate() != null ? request.getBatchCrossingRate() : new BigDecimal("10.00"))
                .waterloggedRepairRate(request.getWaterloggedRepairRate() != null ? request.getWaterloggedRepairRate() : new BigDecimal("15.00"))
                .surgeHoursRate(request.getSurgeHoursRate() != null ? request.getSurgeHoursRate() : new BigDecimal("8.00"))
                .subsidyRate(request.getSubsidyRate() != null ? request.getSubsidyRate() : new BigDecimal("15.00"))
                .baseFee(request.getBaseFee() != null ? request.getBaseFee() : new BigDecimal("25000.00"))
                .perKmFee(request.getPerKmFee() != null ? request.getPerKmFee() : new BigDecimal("10000.00"))
                .versionCode(request.getVersionCode() != null && !request.getVersionCode().isBlank()
                        ? request.getVersionCode()
                        : "v2." + (existingConfigs.size() + 4))
                .changeSummary(request.getChangeSummary() != null && !request.getChangeSummary().isBlank()
                        ? request.getChangeSummary()
                        : "Cập nhật tỷ lệ hoa hồng chuẩn " + global + "%")
                .approvalReason(request.getApprovalReason() != null && !request.getApprovalReason().isBlank()
                        ? request.getApprovalReason()
                        : "Điều chỉnh cấu hình phí sàn theo chính sách vận hành mùa ngập")
                .active(true)
                .updatedBy(admin)
                .build();

        CommissionConfig saved = commissionConfigRepository.save(newConfig);
        return mapToCommissionDto(saved);
    }

    // =========================================================================
    // UC-26: Garage Wallet & Payout Requests
    // =========================================================================

    @Transactional(readOnly = true)
    public GarageWalletDto getGarageWalletSummary(User garageOwner) {
        Garage garage = garageRepository.findByOwnerId(garageOwner.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ garage cho tài khoản này"));

        BigDecimal walletBalance = garage.getWalletBalance() != null ? garage.getWalletBalance() : BigDecimal.ZERO;
        BigDecimal pendingPayout = payoutRequestRepository.sumRequestedAmountByGarageIdAndStatuses(
                garage.getId(),
                List.of(PayoutStatus.PENDING, PayoutStatus.APPROVED)
        );
        if (pendingPayout == null) {
            pendingPayout = BigDecimal.ZERO;
        }
        BigDecimal totalWithdrawn = payoutRequestRepository.sumRequestedAmountByGarageIdAndStatuses(
                garage.getId(),
                List.of(PayoutStatus.TRANSFERRED)
        );
        if (totalWithdrawn == null) {
            totalWithdrawn = BigDecimal.ZERO;
        }

        BigDecimal availableBalance = walletBalance.subtract(pendingPayout);
        if (availableBalance.compareTo(BigDecimal.ZERO) < 0) {
            availableBalance = BigDecimal.ZERO;
        }

        List<WalletTransactionDto> txDtos = walletTransactionRepository
                .findByGarageIdOrderByCreatedAtDesc(garage.getId())
                .stream()
                .map(this::mapToWalletTxDto)
                .collect(Collectors.toList());

        final BigDecimal finalAvailable = availableBalance;
        List<PayoutRequestResponse> payoutDtos = payoutRequestRepository
                .findByGarageIdOrderByCreatedAtDesc(garage.getId())
                .stream()
                .map(p -> mapToPayoutResponse(p, finalAvailable))
                .collect(Collectors.toList());

        return GarageWalletDto.builder()
                .garageId(garage.getId())
                .garageName(garage.getGarageName())
                .walletBalance(walletBalance)
                .pendingPayoutAmount(pendingPayout)
                .availableBalance(availableBalance)
                .totalWithdrawnAmount(totalWithdrawn)
                .recentTransactions(txDtos)
                .payoutRequests(payoutDtos)
                .build();
    }

    @Transactional(readOnly = true)
    public List<PayoutRequestResponse> getMyPayoutRequests(User garageOwner) {
        Garage garage = garageRepository.findByOwnerId(garageOwner.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ garage cho tài khoản này"));

        BigDecimal availableBalance = calculateAvailableBalance(garage);
        return payoutRequestRepository.findByGarageIdOrderByCreatedAtDesc(garage.getId())
                .stream()
                .map(p -> mapToPayoutResponse(p, availableBalance))
                .collect(Collectors.toList());
    }

    @Transactional
    public PayoutRequestResponse createPayoutRequest(User garageOwner, CreatePayoutRequestDto request) {
        Garage garage = garageRepository.findByOwnerId(garageOwner.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ garage cho tài khoản này"));

        garage.setWalletBalance(garageRepository.lockWalletBalance(garage.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ví gara")));

        if (garage.getStatus() != GarageStatus.APPROVED) {
            throw new BadRequestException("Garage chưa được phê duyệt kích hoạt nên chưa thể yêu cầu rút tiền");
        }

        if (request.getRequestedAmount() == null || request.getRequestedAmount().compareTo(new BigDecimal("50000")) < 0) {
            throw new BadRequestException("Số tiền rút tối thiểu là 50.000 VNĐ");
        }

        BigDecimal availableBalance = calculateAvailableBalance(garage);
        if (request.getRequestedAmount().compareTo(availableBalance) > 0) {
            throw new BadRequestException("Số tiền yêu cầu rút vượt quá số dư khả dụng của ví garage (" + availableBalance + " VNĐ)");
        }

        String requestCode = "PO-" + LocalDateTime.now().getYear() + "-"
                + UUID.randomUUID().toString().substring(0, 6).toUpperCase();

        PayoutRequest payout = PayoutRequest.builder()
                .requestCode(requestCode)
                .garage(garage)
                .bankCode(request.getBankCode().trim().toUpperCase())
                .bankName(request.getBankName() != null && !request.getBankName().isBlank()
                        ? request.getBankName().trim()
                        : request.getBankCode().trim().toUpperCase())
                .accountNumber(request.getAccountNumber().trim())
                .accountHolderName(request.getAccountHolderName().trim().toUpperCase())
                .requestedAmount(request.getRequestedAmount())
                .walletBalanceSnapshot(garage.getWalletBalance() != null ? garage.getWalletBalance() : BigDecimal.ZERO)
                .status(PayoutStatus.PENDING)
                .build();

        PayoutRequest saved = payoutRequestRepository.save(payout);
        BigDecimal newAvailableBalance = availableBalance.subtract(request.getRequestedAmount());
        return mapToPayoutResponse(saved, newAvailableBalance.max(BigDecimal.ZERO));
    }

    @Transactional(readOnly = true)
    public List<PayoutRequestResponse> getAllPayoutRequests(PayoutStatus status) {
        List<PayoutRequest> list = (status != null)
                ? payoutRequestRepository.findByStatusOrderByCreatedAtDesc(status)
                : payoutRequestRepository.findAllByOrderByCreatedAtDesc();

        return list.stream()
                .map(p -> mapToPayoutResponse(p, calculateAvailableBalance(p.getGarage())))
                .collect(Collectors.toList());
    }

    @Transactional
    public PayoutRequestResponse processPayoutRequest(User admin, Long payoutId, ApprovePayoutDto dto) {
        Long garageId = payoutRequestRepository.findGarageIdById(payoutId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu rút tiền #" + payoutId));
        BigDecimal lockedBalance = garageRepository.lockWalletBalance(garageId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ví gara"));
        PayoutRequest payout = payoutRequestRepository.findById(payoutId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu rút tiền #" + payoutId));

        if (payout.getStatus() == PayoutStatus.TRANSFERRED || payout.getStatus() == PayoutStatus.REJECTED) {
            throw new BadRequestException("Yêu cầu rút tiền này đã được xử lý hoàn tất trước đó");
        }

        PayoutStatus targetStatus = dto.getStatus();
        if (targetStatus == null || targetStatus == PayoutStatus.PENDING) {
            throw new BadRequestException("Trạng thái phê duyệt rút tiền không hợp lệ");
        }

        Garage garage = payout.getGarage();
        BigDecimal currentWalletBalance = lockedBalance;
        garage.setWalletBalance(lockedBalance);

        if (targetStatus == PayoutStatus.APPROVED) {
            if (currentWalletBalance.compareTo(payout.getRequestedAmount()) < 0) {
                throw new BadRequestException("Số dư ví garage hiện tại không đủ để phê duyệt lệnh rút tiền này");
            }
            payout.setStatus(PayoutStatus.APPROVED);
            payout.setAdminReviewer(admin);
            payout.setAdminNote(dto.getAdminNote() != null ? dto.getAdminNote() : "Đã phê duyệt lệnh rút, chờ chuyển khoản ngân hàng");
            payout.setProcessedAt(LocalDateTime.now());
        } else if (targetStatus == PayoutStatus.TRANSFERRED) {
            if (currentWalletBalance.compareTo(payout.getRequestedAmount()) < 0) {
                throw new BadRequestException("Số dư ví garage không đủ để thực hiện giải ngân chuyển khoản");
            }

            BigDecimal newWalletBalance = currentWalletBalance.subtract(payout.getRequestedAmount());
            garage.setWalletBalance(newWalletBalance);
            garageRepository.save(garage);

            String txRef = (dto.getTransactionReference() != null && !dto.getTransactionReference().isBlank())
                    ? dto.getTransactionReference().trim()
                    : "TXN-NAPAS-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

            payout.setStatus(PayoutStatus.TRANSFERRED);
            payout.setAdminReviewer(admin);
            payout.setTransactionReference(txRef);
            payout.setAdminNote(dto.getAdminNote() != null ? dto.getAdminNote() : "Đã giải ngân thành công qua Napas247");
            payout.setProcessedAt(LocalDateTime.now());

            WalletTransaction walletTx = WalletTransaction.builder()
                    .garage(garage)
                    .amount(payout.getRequestedAmount().negate())
                    .balanceAfter(newWalletBalance)
                    .transactionType(WalletTransactionType.PAYOUT_WITHDRAW)
                    .referenceCode(payout.getRequestCode())
                    .description("Giải ngân rút tiền về TK " + payout.getBankCode() + " - " + payout.getAccountNumber() + " (UNC: " + txRef + ")")
                    .build();
            walletTransactionRepository.save(walletTx);
        } else if (targetStatus == PayoutStatus.REJECTED) {
            payout.setStatus(PayoutStatus.REJECTED);
            payout.setAdminReviewer(admin);
            payout.setAdminNote(dto.getAdminNote() != null && !dto.getAdminNote().isBlank()
                    ? dto.getAdminNote()
                    : "Từ chối yêu cầu rút tiền do cần đối soát bổ sung");
            payout.setProcessedAt(LocalDateTime.now());
        }

        PayoutRequest saved = payoutRequestRepository.save(payout);
        return mapToPayoutResponse(saved, calculateAvailableBalance(garage));
    }

    @Transactional(readOnly = true)
    public PlatformRevenueStatsDto getPlatformRevenueStats() {
        CommissionConfigDto activeConfig = getActiveCommissionConfig();
        List<PayoutRequest> allPayouts = payoutRequestRepository.findAllByOrderByCreatedAtDesc();

        long pendingCount = allPayouts.stream()
                .filter(p -> p.getStatus() == PayoutStatus.PENDING || p.getStatus() == PayoutStatus.APPROVED)
                .count();
        BigDecimal pendingSum = allPayouts.stream()
                .filter(p -> p.getStatus() == PayoutStatus.PENDING || p.getStatus() == PayoutStatus.APPROVED)
                .map(PayoutRequest::getRequestedAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long transferredCount = allPayouts.stream()
                .filter(p -> p.getStatus() == PayoutStatus.TRANSFERRED)
                .count();
        BigDecimal transferredSum = allPayouts.stream()
                .filter(p -> p.getStatus() == PayoutStatus.TRANSFERRED)
                .map(PayoutRequest::getRequestedAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalGarageBalances = garageRepository.findAll().stream()
                .map(g -> g.getWalletBalance() != null ? g.getWalletBalance() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<PaymentTransaction> paidTxs = paymentTransactionRepository != null
                ? paymentTransactionRepository.findByStatusOrderByCreatedAtDesc(PaymentStatus.SUCCESS)
                : List.of();

        long paidCount = paidTxs.size();
        long reconciledCount = paidTxs.stream().filter(PaymentTransaction::isReconciled).count();
        BigDecimal grossGmv = paidTxs.stream()
                .map(PaymentTransaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalFee = paidTxs.stream()
                .map(PaymentTransaction::getPlatformFee)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalNetGarage = paidTxs.stream()
                .map(PaymentTransaction::getNetGarageAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return PlatformRevenueStatsDto.builder()
                .activeCommissionRate(activeConfig.getGlobalRate())
                .totalPaidTransactionCount(paidCount)
                .reconciledTransactionCount(reconciledCount)
                .totalGrossRevenueGmv(grossGmv)
                .totalPlatformFeeEarned(totalFee)
                .totalNetGarageSettlement(totalNetGarage)
                .pendingPayoutCount(pendingCount)
                .pendingPayoutTotalAmount(pendingSum)
                .transferredPayoutCount(transferredCount)
                .transferredPayoutTotalAmount(transferredSum)
                .totalGarageWalletBalances(totalGarageBalances)
                .build();
    }

    // =========================================================================
    // Helper methods
    // =========================================================================

    private CommissionConfig createDefaultCommissionConfig() {
        CommissionConfig defaultConfig = CommissionConfig.builder()
                .globalRate(new BigDecimal("12.50"))
                .singleCrossingRate(new BigDecimal("12.50"))
                .batchCrossingRate(new BigDecimal("10.00"))
                .waterloggedRepairRate(new BigDecimal("15.00"))
                .surgeHoursRate(new BigDecimal("8.00"))
                .subsidyRate(new BigDecimal("15.00"))
                .baseFee(new BigDecimal("25000.00"))
                .perKmFee(new BigDecimal("10000.00"))
                .versionCode("v2.4")
                .changeSummary("Khởi tạo cấu hình hoa hồng mặc định mùa mưa ngập")
                .approvalReason("Triển khai đồng bộ toàn hệ sinh thái")
                .active(true)
                .build();
        return commissionConfigRepository.save(defaultConfig);
    }

    private BigDecimal calculateAvailableBalance(Garage garage) {
        BigDecimal walletBalance = garage.getWalletBalance() != null ? garage.getWalletBalance() : BigDecimal.ZERO;
        BigDecimal lockedAmount = payoutRequestRepository.sumRequestedAmountByGarageIdAndStatuses(
                garage.getId(),
                List.of(PayoutStatus.PENDING, PayoutStatus.APPROVED)
        );
        if (lockedAmount == null) {
            lockedAmount = BigDecimal.ZERO;
        }
        return walletBalance.subtract(lockedAmount).max(BigDecimal.ZERO);
    }

    private CommissionConfigDto mapToCommissionDto(CommissionConfig entity) {
        return CommissionConfigDto.builder()
                .id(entity.getId())
                .globalRate(entity.getGlobalRate())
                .singleCrossingRate(entity.getSingleCrossingRate())
                .batchCrossingRate(entity.getBatchCrossingRate())
                .waterloggedRepairRate(entity.getWaterloggedRepairRate())
                .surgeHoursRate(entity.getSurgeHoursRate())
                .subsidyRate(entity.getSubsidyRate())
                .baseFee(entity.getBaseFee())
                .perKmFee(entity.getPerKmFee())
                .versionCode(entity.getVersionCode())
                .changeSummary(entity.getChangeSummary())
                .approvalReason(entity.getApprovalReason())
                .active(entity.isActive())
                .updatedByUserId(entity.getUpdatedBy() != null ? entity.getUpdatedBy().getId() : null)
                .updatedByName(entity.getUpdatedBy() != null ? entity.getUpdatedBy().getFullName() : "HỆ THỐNG")
                .updatedByRole(entity.getUpdatedBy() != null ? entity.getUpdatedBy().getRole().name() : "SYSTEM")
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private WalletTransactionDto mapToWalletTxDto(WalletTransaction tx) {
        return WalletTransactionDto.builder()
                .id(tx.getId())
                .garageId(tx.getGarage().getId())
                .amount(tx.getAmount())
                .balanceAfter(tx.getBalanceAfter())
                .transactionType(tx.getTransactionType())
                .referenceCode(tx.getReferenceCode())
                .description(tx.getDescription())
                .createdAt(tx.getCreatedAt())
                .build();
    }

    private PayoutRequestResponse mapToPayoutResponse(PayoutRequest p, BigDecimal availableBalance) {
        Garage g = p.getGarage();
        User owner = g.getOwner();
        return PayoutRequestResponse.builder()
                .id(p.getId())
                .requestCode(p.getRequestCode())
                .garageId(g.getId())
                .garageName(g.getGarageName())
                .garageOwnerName(owner != null ? owner.getFullName() : null)
                .garagePhone(g.getPhone())
                .bankCode(p.getBankCode())
                .bankName(p.getBankName())
                .accountNumber(p.getAccountNumber())
                .accountHolderName(p.getAccountHolderName())
                .requestedAmount(p.getRequestedAmount())
                .walletBalance(g.getWalletBalance() != null ? g.getWalletBalance() : BigDecimal.ZERO)
                .availableBalance(availableBalance)
                .status(p.getStatus())
                .adminReviewerId(p.getAdminReviewer() != null ? p.getAdminReviewer().getId() : null)
                .adminReviewerName(p.getAdminReviewer() != null ? p.getAdminReviewer().getFullName() : null)
                .adminNote(p.getAdminNote())
                .transactionReference(p.getTransactionReference())
                .createdAt(p.getCreatedAt())
                .processedAt(p.getProcessedAt())
                .build();
    }
}
