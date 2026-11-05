package com.prm393.floodrescue.features.finance.service;

import com.prm393.floodrescue.common.exception.BadRequestException;
import com.prm393.floodrescue.common.exception.ResourceNotFoundException;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.finance.dto.*;
import com.prm393.floodrescue.features.finance.entity.*;
import com.prm393.floodrescue.features.finance.repository.CommissionConfigRepository;
import com.prm393.floodrescue.features.finance.repository.PayoutRequestRepository;
import com.prm393.floodrescue.features.finance.repository.ServiceDisputeRepository;
import com.prm393.floodrescue.features.finance.repository.WalletTransactionRepository;
import com.prm393.floodrescue.features.garage.entity.BranchStatus;
import com.prm393.floodrescue.features.garage.entity.Garage;
import com.prm393.floodrescue.features.garage.entity.GarageBranch;
import com.prm393.floodrescue.features.garage.entity.GarageStatus;
import com.prm393.floodrescue.features.garage.entity.ServiceItem;
import com.prm393.floodrescue.features.garage.repository.GarageBranchRepository;
import com.prm393.floodrescue.features.garage.repository.GarageRepository;
import com.prm393.floodrescue.features.garage.repository.ServiceItemRepository;
import com.prm393.floodrescue.features.payment.entity.PaymentStatus;
import com.prm393.floodrescue.features.payment.entity.PaymentTransaction;
import com.prm393.floodrescue.features.payment.repository.PaymentTransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * =================================================================================================
 * TÀI LIỆU KỸ THUẬT & GIẢI THÍCH MÃ NGUỒN (TECHNICAL DOCUMENTATION)
 * =================================================================================================
 * Phân hệ (Module): Dịch vụ Quản trị Tài chính, Ví Gara, Giải ngân Rút tiền & Cấu hình Hoa hồng
 * Tác giả phụ trách: Nguyễn Hoàng Long
 *
 * Các Use Case được hiện thực hóa trong Service này:
 *   1. UC-24 (Configure Platform Commission Rate):
 *      - Quản lý cấu hình tỷ lệ hoa hồng nền tảng (Global Rate, Single Crossing, Batch Crossing,
 *        Waterlogged Repair, Surge Hours, Subsidy Rate) theo cơ chế phiên bản bất biến (Immutable Audit Trail).
 *      - Mỗi khi Admin cập nhật cấu hình hoa hồng mới, bản ghi cũ được chuyển trạng thái `active = false`
 *        để lưu vết lịch sử kiểm toán, và bản ghi mới được tạo với `active = true`.
 *      - Hỗ trợ xem danh sách và điều chỉnh tỷ lệ chiết khấu hoa hồng riêng biệt cho từng đối tác Gara
 *        (`getGarageCommissions` & `updateGarageCommission`).
 *   2. UC-25 (Monitor Cash Flow & PayOS Reconciliation):
 *      - Tổng hợp các chỉ số tài chính vĩ mô toàn nền tảng (`getPlatformRevenueStats`): Tổng giá trị
 *        giao dịch gộp (GMV), tổng doanh thu hoa hồng sàn (`platformFee`), tổng doanh thu ròng Gara
 *        (`netGarageAmount`), tổng số dư ví các Gara, thống kê hoàn tiền và khiếu nại đang mở.
 *   3. UC-26 (Manage Garage Wallet & Approve Garage Payout Requests):
 *      - Tính toán số dư thực tế (`walletBalance`), số dư đang phong tỏa chờ rút (`pendingPayoutAmount`),
 *        và số dư khả dụng (`availableBalance = walletBalance - pendingPayoutAmount`).
 *      - Áp dụng khóa bi quan cấp độ dòng trong cơ sở dữ liệu (`PESSIMISTIC_WRITE` thông qua
 *        `garageRepository.lockWalletBalance(garageId)`) để chống lỗi Race Condition / Double-Spend
 *        khi có nhiều luồng đồng thời cộng tiền đơn hàng hoặc duyệt rút tiền.
 *      - Quy trình giải ngân 2 bước chuẩn ngân hàng:
 *          + Bước 1 (`PENDING` -> `APPROVED`): Admin thẩm định và phê duyệt lệnh rút (tiền vẫn được
 *            phong tỏa qua công thức `availableBalance`, chưa trừ `walletBalance`).
 *          + Bước 2 (`APPROVED` -> `TRANSFERRED`): Sau khi chuyển khoản Napas247 thành công, Admin
 *            xác nhận mã giao dịch ngân hàng (`transactionReference`), hệ thống chính thức khấu trừ
 *            `walletBalance` của Gara và ghi bút toán sổ cái kép (`WalletTransactionType.PAYOUT_WITHDRAW`).
 * =================================================================================================
 */
@Service
@RequiredArgsConstructor
public class FinanceAdminService {

    /**
     * Repository thao tác với bảng `commission_configs` lưu trữ cấu hình hoa hồng và lịch sử thay đổi.
     */
    private final CommissionConfigRepository commissionConfigRepository;

    /**
     * Repository thao tác với bảng `payout_requests` quản lý các lệnh yêu cầu rút tiền của đối tác Gara.
     */
    private final PayoutRequestRepository payoutRequestRepository;

    /**
     * Repository thao tác với bảng sổ cái biến động số dư ví `wallet_transactions`.
     */
    private final WalletTransactionRepository walletTransactionRepository;

    /**
     * Repository thao tác với bảng `garages`, cung cấp hàm khóa dòng ví `lockWalletBalance(garageId)`.
     */
    private final GarageRepository garageRepository;

    /**
     * Repository thao tác với bảng `payment_transactions` phục vụ tổng hợp GMV, phí sàn và đối soát PayOS.
     */
    private final PaymentTransactionRepository paymentTransactionRepository;

    /**
     * Repository truy vấn danh mục dịch vụ của từng Gara (`garage_service_catalog`).
     * Sử dụng `@Autowired(required = false)` để giữ nguyên Constructor 5 tham số phục vụ tương thích
     * tuyệt đối với các Unit Test hiện có (`FinanceAdminServiceTest`, `PayOSPaymentServiceTest`).
     */
    @Autowired(required = false)
    private ServiceItemRepository serviceItemRepository;

    /**
     * Repository truy vấn danh sách chi nhánh của Gara (`garage_branches`) để lấy địa chỉ và trạng thái trực chiến.
     */
    @Autowired(required = false)
    private GarageBranchRepository garageBranchRepository;

    /**
     * Repository truy vấn hồ sơ khiếu nại & hoàn tiền (`service_disputes`) để thống kê số khiếu nại đang mở.
     */
    @Autowired(required = false)
    private ServiceDisputeRepository serviceDisputeRepository;

    // =========================================================================
    // UC-24: Configure Platform Commission Rate (Cấu hình Hoa hồng Nền tảng)
    // =========================================================================

    /**
     * Lấy cấu hình tỷ lệ hoa hồng nền tảng đang có hiệu lực (`active = true`).
     * Cơ chế tự phục hồi (Self-Healing Default Initialization):
     *   - Nếu cơ sở dữ liệu vừa khởi tạo và chưa có bất kỳ bản ghi cấu hình nào trong bảng `commission_configs`,
     *     hệ thống sẽ tự động gọi `createDefaultCommissionConfig()` để sinh cấu hình chuẩn (12.50%) và lưu xuống DB.
     *
     * @return Đối tượng `CommissionConfigDto` chứa toàn bộ thông số phí sàn hiện hành.
     */
    @Transactional
    public CommissionConfigDto getActiveCommissionConfig() {
        // Truy vấn bản ghi cấu hình đang active mới nhất theo thời gian tạo giảm dần
        CommissionConfig activeConfig = commissionConfigRepository
                .findFirstByActiveTrueOrderByCreatedAtDesc()
                // Nếu chưa tồn tại bản ghi nào, tự động khởi tạo bản ghi mặc định v2.4 (12.50%)
                .orElseGet(this::createDefaultCommissionConfig);
        // Ánh xạ từ thực thể JPA sang DTO trả về cho tầng Controller hoặc PaymentAttemptService
        return mapToCommissionDto(activeConfig);
    }

    /**
     * Lấy toàn bộ lịch sử thay đổi cấu hình tỷ lệ hoa hồng nền tảng (Audit Trail), sắp xếp mới nhất lên đầu.
     * Phục vụ bảng "Nhật ký kiểm toán thay đổi cấu hình phí sàn" trên giao diện Web Admin.
     *
     * @return Danh sách `List<CommissionConfigDto>` gồm bản ghi đang active và các bản ghi lịch sử đã lưu trữ.
     */
    @Transactional
    public List<CommissionConfigDto> getCommissionHistory() {
        // Lấy tất cả các phiên bản cấu hình từ bảng commission_configs
        List<CommissionConfig> configs = commissionConfigRepository.findAllByOrderByCreatedAtDesc();
        // Đảm bảo luôn có ít nhất 1 bản ghi mặc định nếu bảng đang trống
        if (configs.isEmpty()) {
            configs = List.of(createDefaultCommissionConfig());
        }
        // Chuyển đổi từng bản ghi Entity sang DTO thông qua Stream API
        return configs.stream()
                .map(this::mapToCommissionDto)
                .collect(Collectors.toList());
    }

    /**
     * Cập nhật cấu hình tỷ lệ hoa hồng nền tảng mới (Chỉ dành cho Role.ADMIN).
     * Quy trình nghiệp vụ (Immutable Versioning Pattern):
     *   1. Kiểm tra tính hợp lệ của `globalRate` (không được null và không được nhỏ hơn 0%).
     *   2. Duyệt qua toàn bộ các bản ghi cấu hình hiện có, chuyển các bản ghi đang `active = true` sang
     *      `active = false` để bảo toàn lịch sử kiểm toán mà không ghi đè mất dữ liệu cũ.
     *   3. Khởi tạo một bản ghi `CommissionConfig` mới với `active = true`, tự động tăng mã phiên bản
     *      (`versionCode`) và gắn thông tin Quản trị viên thực hiện (`updatedBy`).
     *
     * @param admin   Tài khoản Quản trị viên đang đăng nhập thực hiện thay đổi.
     * @param request Yêu cầu chứa các mức tỷ lệ hoa hồng mới và lý do phê duyệt.
     * @return Cấu hình hoa hồng mới vừa được kích hoạt.
     */
    @Transactional
    public CommissionConfigDto updateCommissionConfig(User admin, UpdateCommissionConfigRequest request) {
        // Bước 1: Kiểm tra ràng buộc dữ liệu đầu vào cho tỷ lệ hoa hồng chung toàn sàn
        if (request.getGlobalRate() == null || request.getGlobalRate().compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Tỷ lệ hoa hồng nền tảng không hợp lệ");
        }

        // Bước 2: Vô hiệu hóa (Archive) tất cả các bản ghi cấu hình đang active trước đó
        List<CommissionConfig> existingConfigs = commissionConfigRepository.findAllByOrderByCreatedAtDesc();
        for (CommissionConfig cfg : existingConfigs) {
            if (cfg.isActive()) {
                cfg.setActive(false);
                commissionConfigRepository.save(cfg);
            }
        }

        // Bước 3: Chuẩn bị thông số cho phiên bản cấu hình hoa hồng mới
        BigDecimal global = request.getGlobalRate();
        CommissionConfig newConfig = CommissionConfig.builder()
                .globalRate(global)
                // Nếu không truyền mức riêng cho chuyến cứu hộ đơn lẻ thì mặc định lấy theo globalRate
                .singleCrossingRate(request.getSingleCrossingRate() != null ? request.getSingleCrossingRate() : global)
                // Tỷ lệ hoa hồng ưu đãi cho chuyến xe chở gom vượt ngập (mặc định 10.00%)
                .batchCrossingRate(request.getBatchCrossingRate() != null ? request.getBatchCrossingRate() : new BigDecimal("10.00"))
                // Tỷ lệ hoa hồng cho dịch vụ sửa chữa xe ngập nước / thủy kích tại chỗ (mặc định 15.00%)
                .waterloggedRepairRate(request.getWaterloggedRepairRate() != null ? request.getWaterloggedRepairRate() : new BigDecimal("15.00"))
                // Tỷ lệ hoa hồng ưu đãi khung giờ cao điểm mưa bão để khuyến khích thợ ra đường (mặc định 8.00%)
                .surgeHoursRate(request.getSurgeHoursRate() != null ? request.getSurgeHoursRate() : new BigDecimal("8.00"))
                // Tỷ lệ trợ giá từ quỹ bình ổn của nền tảng (mặc định 15.00%)
                .subsidyRate(request.getSubsidyRate() != null ? request.getSubsidyRate() : new BigDecimal("15.00"))
                // Phí mở cửa cơ sở và phí trên mỗi km vận chuyển
                .baseFee(request.getBaseFee() != null ? request.getBaseFee() : new BigDecimal("25000.00"))
                .perKmFee(request.getPerKmFee() != null ? request.getPerKmFee() : new BigDecimal("10000.00"))
                // Tự động đánh số phiên bản tiếp theo nếu Admin không nhập versionCode thủ công
                .versionCode(request.getVersionCode() != null && !request.getVersionCode().isBlank()
                        ? request.getVersionCode()
                        : "v2." + (existingConfigs.size() + 4))
                // Ghi nhận tóm tắt nội dung thay đổi phục vụ tra cứu lịch sử
                .changeSummary(request.getChangeSummary() != null && !request.getChangeSummary().isBlank()
                        ? request.getChangeSummary()
                        : "Cập nhật tỷ lệ hoa hồng chuẩn " + global + "%")
                // Ghi nhận căn cứ / lý do phê duyệt điều chỉnh chính sách phí sàn
                .approvalReason(request.getApprovalReason() != null && !request.getApprovalReason().isBlank()
                        ? request.getApprovalReason()
                        : "Điều chỉnh cấu hình phí sàn theo chính sách vận hành mùa ngập")
                .active(true)
                .updatedBy(admin)
                .build();

        // Lưu phiên bản mới vào cơ sở dữ liệu và trả về DTO
        CommissionConfig saved = commissionConfigRepository.save(newConfig);
        return mapToCommissionDto(saved);
    }

    // =========================================================================
    // UC-24 Mở rộng: Quản lý Tỷ lệ Chiết khấu Hoa hồng riêng cho từng Gara (Admin-Only)
    // =========================================================================

    /**
     * Lấy danh sách toàn bộ các đối tác Gara cùng tỷ lệ chiết khấu hoa hồng hiệu lực, số dư ví
     * và danh mục dịch vụ niêm yết của từng Gara.
     * Cơ chế xác định tỷ lệ chiết khấu hiệu lực (`effectiveRate`):
     *   - Nếu `garage.getCommissionRate() != null`: Sử dụng tỷ lệ chiết khấu riêng đã được Admin cấu hình cho Gara đó.
     *   - Ngược lại: Sử dụng tỷ lệ `globalRate` trong cấu hình hoa hồng toàn sàn đang active (hoặc 12.50%).
     *
     * @return Danh sách `List<GarageCommissionDto>` phục vụ màn hình Quản trị Chiết khấu Gara của Admin.
     */
    @Transactional(readOnly = true)
    public List<GarageCommissionDto> getGarageCommissions() {
        // Lấy mức hoa hồng chung toàn sàn để làm giá trị fallback cho các Gara chưa cấu hình mức riêng
        CommissionConfig activeCfg = commissionConfigRepository
                .findFirstByActiveTrueOrderByCreatedAtDesc()
                .orElse(null);
        BigDecimal fallbackGlobalRate = (activeCfg != null && activeCfg.getGlobalRate() != null)
                ? activeCfg.getGlobalRate()
                : new BigDecimal("12.50");

        // Truy vấn tất cả đối tác Gara trong hệ thống và ánh xạ sang GarageCommissionDto
        return garageRepository.findAll().stream()
                .map(garage -> mapToGarageCommissionDto(garage, fallbackGlobalRate))
                .collect(Collectors.toList());
    }

    /**
     * Cập nhật tỷ lệ phần trăm (%) chiết khấu hoa hồng áp dụng riêng cho một đối tác Gara cụ thể (Chỉ Admin).
     * Đồng thời tự động ghi nhận một bản ghi kiểm toán (Audit Log) vào bảng `commission_configs`
     * để mọi thao tác thay đổi chiết khấu của Admin đều được lưu vết minh bạch trong lịch sử.
     *
     * @param garageId Mã định danh của Gara cần điều chỉnh chiết khấu.
     * @param req      Yêu cầu chứa mức `commissionRate` mới (0% - 100%) và ghi chú `notes`.
     * @param admin    Thực thể `User` của Quản trị viên thực hiện thao tác.
     * @return Đối tượng `GarageCommissionDto` sau khi đã lưu cập nhật.
     */
    @Transactional
    public GarageCommissionDto updateGarageCommission(Long garageId, UpdateGarageCommissionRequest req, User admin) {
        String adminName = (admin != null && admin.getFullName() != null) ? admin.getFullName() : "ADMIN";
        return updateGarageCommissionInternal(garageId, req, admin, adminName);
    }

    /**
     * Phương thức nạp chồng (Overload) cho phép truyền tên Admin dưới dạng chuỗi `adminName`.
     *
     * @param garageId  Mã định danh của Gara cần cập nhật chiết khấu.
     * @param req       Đối tượng chứa tỷ lệ hoa hồng mới và ghi chú.
     * @param adminName Tên hiển thị của Quản trị viên thực hiện.
     * @return Thông tin chiết khấu Gara sau khi cập nhật.
     */
    @Transactional
    public GarageCommissionDto updateGarageCommission(Long garageId, UpdateGarageCommissionRequest req, String adminName) {
        return updateGarageCommissionInternal(garageId, req, null, adminName);
    }

    /**
     * Logic nội bộ xử lý cập nhật tỷ lệ chiết khấu riêng cho Gara và ghi sổ lịch sử kiểm toán `CommissionConfig`.
     */
    private GarageCommissionDto updateGarageCommissionInternal(
            Long garageId,
            UpdateGarageCommissionRequest req,
            User adminUser,
            String adminName
    ) {
        // Kiểm tra tính hợp lệ của tỷ lệ chiết khấu (0.00% <= commissionRate <= 100.00%)
        if (req == null || req.getCommissionRate() == null) {
            throw new BadRequestException("Tỷ lệ chiết khấu hoa hồng không được để trống");
        }
        if (req.getCommissionRate().compareTo(BigDecimal.ZERO) < 0
                || req.getCommissionRate().compareTo(new BigDecimal("100.00")) > 0) {
            throw new BadRequestException("Tỷ lệ chiết khấu hoa hồng phải nằm trong khoảng từ 0% đến 100%");
        }

        // Tìm kiếm Gara theo ID; ném lỗi 404 nếu không tồn tại
        Garage garage = garageRepository.findById(garageId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy Gara với mã #" + garageId));

        // Cập nhật mức tỷ lệ chiết khấu riêng trên thực thể Garage và lưu xuống bảng `garages`
        BigDecimal oldRate = garage.getCommissionRate();
        garage.setCommissionRate(req.getCommissionRate());
        Garage savedGarage = garageRepository.save(garage);

        // Ghi nhận bút toán kiểm toán vào bảng `commission_configs` để lưu vết lịch sử thay đổi
        CommissionConfig currentActive = commissionConfigRepository
                .findFirstByActiveTrueOrderByCreatedAtDesc()
                .orElseGet(this::createDefaultCommissionConfig);

        // Chuyển bản ghi active cũ sang false để bản ghi mới trở thành phiên bản hiện hành mới nhất
        List<CommissionConfig> existingConfigs = commissionConfigRepository.findAllByOrderByCreatedAtDesc();
        for (CommissionConfig cfg : existingConfigs) {
            if (cfg.isActive()) {
                cfg.setActive(false);
                commissionConfigRepository.save(cfg);
            }
        }

        String summary = String.format(
                "Cập nhật chiết khấu Gara %s (#%d) từ %s%% thành %s%%",
                savedGarage.getGarageName(),
                garageId,
                oldRate != null ? oldRate.toPlainString() : currentActive.getGlobalRate().toPlainString(),
                req.getCommissionRate().toPlainString()
        );
        String reason = (req.getNotes() != null && !req.getNotes().isBlank())
                ? req.getNotes().trim()
                : "Điều chỉnh tỷ lệ chiết khấu riêng cho đối tác Gara bởi " + (adminName != null ? adminName : "Admin");

        CommissionConfig auditConfig = CommissionConfig.builder()
                .globalRate(currentActive.getGlobalRate())
                .singleCrossingRate(currentActive.getSingleCrossingRate())
                .batchCrossingRate(currentActive.getBatchCrossingRate())
                .waterloggedRepairRate(currentActive.getWaterloggedRepairRate())
                .surgeHoursRate(currentActive.getSurgeHoursRate())
                .subsidyRate(currentActive.getSubsidyRate())
                .baseFee(currentActive.getBaseFee())
                .perKmFee(currentActive.getPerKmFee())
                .versionCode("v2." + (existingConfigs.size() + 4))
                .changeSummary(summary)
                .approvalReason(reason)
                .active(true)
                .updatedBy(adminUser != null ? adminUser : currentActive.getUpdatedBy())
                .build();
        commissionConfigRepository.save(auditConfig);

        return mapToGarageCommissionDto(savedGarage, currentActive.getGlobalRate());
    }

    // =========================================================================
    // UC-26: Garage Wallet & Payout Requests (Quản lý Ví Gara & Giải ngân Rút tiền)
    // =========================================================================

    /**
     * Lấy thông tin tổng quan Ví điện tử của đối tác Gara đang đăng nhập, bao gồm:
     *   - Số dư tổng trong ví (`walletBalance`)
     *   - Số tiền đang nằm trong các lệnh chờ rút (`pendingPayoutAmount` với trạng thái `PENDING` hoặc `APPROVED`)
     *   - Số dư khả dụng có thể rút tiếp (`availableBalance = max(0, walletBalance - pendingPayoutAmount)`)
     *   - Tổng số tiền đã rút thành công từ trước tới nay (`totalWithdrawnAmount` với trạng thái `TRANSFERRED`)
     *   - Danh sách biến động số dư sổ cái (`recentTransactions`) và danh sách lệnh rút tiền (`payoutRequests`).
     *
     * @param garageOwner Tài khoản Chủ Gara (`Role.GARAGE_OWNER`) đang đăng nhập.
     * @return Đối tượng `GarageWalletDto` chứa đầy đủ số liệu ví và lịch sử giao dịch.
     */
    @Transactional(readOnly = true)
    public GarageWalletDto getGarageWalletSummary(User garageOwner) {
        // Bước 1: Tìm hồ sơ Garage thuộc sở hữu của tài khoản đang đăng nhập
        Garage garage = garageRepository.findByOwnerId(garageOwner.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ garage cho tài khoản này"));

        // Bước 2: Lấy số dư ví hiện tại (mặc định 0 nếu null)
        BigDecimal walletBalance = garage.getWalletBalance() != null ? garage.getWalletBalance() : BigDecimal.ZERO;

        // Bước 3: Tính tổng số tiền đang bị phong tỏa tạm thời trong các lệnh rút tiền chờ xử lý (PENDING, APPROVED)
        BigDecimal pendingPayout = payoutRequestRepository.sumRequestedAmountByGarageIdAndStatuses(
                garage.getId(),
                List.of(PayoutStatus.PENDING, PayoutStatus.APPROVED)
        );
        if (pendingPayout == null) {
            pendingPayout = BigDecimal.ZERO;
        }

        // Bước 4: Tính tổng số tiền đã giải ngân chuyển khoản thành công (TRANSFERRED)
        BigDecimal totalWithdrawn = payoutRequestRepository.sumRequestedAmountByGarageIdAndStatuses(
                garage.getId(),
                List.of(PayoutStatus.TRANSFERRED)
        );
        if (totalWithdrawn == null) {
            totalWithdrawn = BigDecimal.ZERO;
        }

        // Bước 5: Tính số dư khả dụng = Số dư ví - Số tiền đang chờ rút (đảm bảo không âm)
        BigDecimal availableBalance = walletBalance.subtract(pendingPayout);
        if (availableBalance.compareTo(BigDecimal.ZERO) < 0) {
            availableBalance = BigDecimal.ZERO;
        }

        // Bước 6: Truy vấn lịch sử bút toán sổ cái biến động số dư ví của Gara
        List<WalletTransactionDto> txDtos = walletTransactionRepository
                .findByGarageIdOrderByCreatedAtDesc(garage.getId())
                .stream()
                .map(this::mapToWalletTxDto)
                .collect(Collectors.toList());

        // Bước 7: Truy vấn danh sách các yêu cầu rút tiền của Gara
        final BigDecimal finalAvailable = availableBalance;
        List<PayoutRequestResponse> payoutDtos = payoutRequestRepository
                .findByGarageIdOrderByCreatedAtDesc(garage.getId())
                .stream()
                .map(p -> mapToPayoutResponse(p, finalAvailable))
                .collect(Collectors.toList());

        YearMonth month = YearMonth.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        List<PaymentTransaction> monthlyPayments = paymentTransactionRepository
                .findByGarageIdOrderByCreatedAtDesc(garage.getId()).stream()
                .filter(tx -> tx.getStatus() == PaymentStatus.SUCCESS && tx.getPaidAt() != null)
                .filter(tx -> YearMonth.from(tx.getPaidAt()).equals(month))
                .toList();
        Map<String, BigDecimal> byService = new LinkedHashMap<>();
        for (PaymentTransaction tx : monthlyPayments) {
            byService.merge(tx.getOrderType() != null ? tx.getOrderType() : "OTHER",
                    tx.getNetGarageAmount(), BigDecimal::add);
        }
        GarageRevenueDto revenue = GarageRevenueDto.builder()
                .month(month.toString())
                .paidOrderCount(monthlyPayments.stream().map(PaymentTransaction::getRescueOrderId).distinct().count())
                .netRevenue(monthlyPayments.stream().map(PaymentTransaction::getNetGarageAmount)
                        .reduce(BigDecimal.ZERO, BigDecimal::add))
                .platformFee(monthlyPayments.stream().map(PaymentTransaction::getPlatformFee)
                        .reduce(BigDecimal.ZERO, BigDecimal::add))
                .revenueByService(byService)
                .build();

        // Bước 8: Đóng gói và trả về kết quả tổng hợp ví Gara
        return GarageWalletDto.builder()
                .revenue(revenue)
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

    /**
     * Lấy danh sách các yêu cầu rút tiền của riêng Chủ Gara đang đăng nhập.
     *
     * @param garageOwner Tài khoản Chủ Gara đang đăng nhập.
     * @return Danh sách các yêu cầu rút tiền kèm thông tin số dư khả dụng hiện tại.
     */
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

    /**
     * Chủ Gara khởi tạo một yêu cầu rút tiền mới về tài khoản ngân hàng đã liên kết.
     * Các quy tắc an toàn tài chính và đồng bộ hóa (Concurrency & Business Rules):
     *   1. Khóa dòng ví Gara (`garageRepository.lockWalletBalance(garage.getId())`) bằng `PESSIMISTIC_WRITE`
     *      để ngăn chặn việc Chủ Gara bấm gửi đồng thời nhiều lệnh rút tiền vượt quá số dư thực tế.
     *   2. Chỉ cho phép Gara đã được thẩm định và phê duyệt (`GarageStatus.APPROVED`) thực hiện rút tiền.
     *   3. Số tiền rút tối thiểu cho mỗi giao dịch phải từ 50.000 VNĐ trở lên.
     *   4. Số tiền yêu cầu rút không được vượt quá số dư khả dụng (`availableBalance = walletBalance - lockedPayouts`).
     *   5. Tạo lệnh rút ở trạng thái `PayoutStatus.PENDING`; chưa trừ trực tiếp `walletBalance` cho tới khi
     *      Admin xác nhận đã chuyển khoản ngân hàng (`TRANSFERRED`).
     *
     * @param garageOwner Tài khoản Chủ Gara khởi tạo lệnh rút.
     * @param request     Thông tin số tiền rút và tài khoản ngân hàng thụ hưởng.
     * @return Thông tin lệnh rút tiền vừa khởi tạo.
     */
    @Transactional
    public PayoutRequestResponse createPayoutRequest(User garageOwner, CreatePayoutRequestDto request) {
        // Tìm hồ sơ Gara của chủ tài khoản
        Garage garage = garageRepository.findByOwnerId(garageOwner.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ garage cho tài khoản này"));

        // Khóa bi quan (PESSIMISTIC_WRITE) trên dòng dữ liệu ví Gara để đảm bảo tính nhất quán tuyệt đối
        garage.setWalletBalance(garageRepository.lockWalletBalance(garage.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ví gara")));

        // Kiểm tra điều kiện pháp lý: Gara phải ở trạng thái APPROVED mới được rút tiền
        if (garage.getStatus() != GarageStatus.APPROVED) {
            throw new BadRequestException("Garage chưa được phê duyệt kích hoạt nên chưa thể yêu cầu rút tiền");
        }

        // Kiểm tra hạn mức rút tối thiểu 50.000 VNĐ
        if (request.getRequestedAmount() == null || request.getRequestedAmount().compareTo(new BigDecimal("50000")) < 0) {
            throw new BadRequestException("Số tiền rút tối thiểu là 50.000 VNĐ");
        }

        // Kiểm tra số dư khả dụng sau khi đã trừ đi các lệnh rút đang chờ duyệt (PENDING / APPROVED)
        BigDecimal availableBalance = calculateAvailableBalance(garage);
        if (request.getRequestedAmount().compareTo(availableBalance) > 0) {
            throw new BadRequestException("Số tiền yêu cầu rút vượt quá số dư khả dụng của ví garage (" + availableBalance + " VNĐ)");
        }

        // Sinh mã phiếu yêu cầu rút tiền duy nhất theo định dạng PO-YYYY-XXXXXX
        String requestCode = "PO-" + LocalDateTime.now().getYear() + "-"
                + UUID.randomUUID().toString().substring(0, 6).toUpperCase();

        // Khởi tạo thực thể PayoutRequest ở trạng thái PENDING kèm ảnh chụp số dư ví tại thời điểm tạo
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

        // Lưu phiếu rút tiền và tính lại số dư khả dụng mới sau khi khoản tiền này được phong tỏa tạm thời
        PayoutRequest saved = payoutRequestRepository.save(payout);
        BigDecimal newAvailableBalance = availableBalance.subtract(request.getRequestedAmount());
        return mapToPayoutResponse(saved, newAvailableBalance.max(BigDecimal.ZERO));
    }

    /**
     * Lấy danh sách toàn bộ yêu cầu rút tiền của tất cả Gara trên hệ thống (dành cho Admin Tài chính),
     * hỗ trợ lọc tùy chọn theo trạng thái (`PENDING`, `APPROVED`, `TRANSFERRED`, `REJECTED`).
     *
     * @param status Trạng thái lệnh rút cần lọc (truyền `null` để lấy toàn bộ).
     * @return Danh sách `List<PayoutRequestResponse>` sắp xếp theo thời gian tạo mới nhất.
     */
    @Transactional(readOnly = true)
    public List<PayoutRequestResponse> getAllPayoutRequests(PayoutStatus status) {
        List<PayoutRequest> list = (status != null)
                ? payoutRequestRepository.findByStatusOrderByCreatedAtDesc(status)
                : payoutRequestRepository.findAllByOrderByCreatedAtDesc();

        return list.stream()
                .map(p -> mapToPayoutResponse(p, calculateAvailableBalance(p.getGarage())))
                .collect(Collectors.toList());
    }

    /**
     * Quản trị viên Tài chính (`Role.ADMIN`) xử lý yêu cầu rút tiền của Gara (Phê duyệt, Giải ngân hoặc Từ chối).
     * Cơ chế khóa và máy trạng thái (State Machine & Concurrency Control):
     *   1. Truy vấn `garageId` và thiết lập khóa `PESSIMISTIC_WRITE` trên ví của Gara trước khi đọc `PayoutRequest`
     *      để tuân thủ thứ tự khóa chuẩn, ngăn ngừa Deadlock và Race Condition khi nhiều luồng chạy song song.
     *   2. Kiểm tra tính bất biến của trạng thái kết thúc (Terminal States): Nếu lệnh rút đã ở trạng thái
     *      `TRANSFERRED` hoặc `REJECTED` thì từ chối xử lý lại (Idempotency / Double-Disbursement Protection).
     *   3. Xử lý theo từng trạng thái đích (`targetStatus`):
     *      - `APPROVED`: Xác nhận hồ sơ hợp lệ, chuyển trạng thái chờ kế toán chuyển khoản (chưa trừ `walletBalance`).
     *      - `TRANSFERRED`: Xác nhận đã giải ngân qua ngân hàng -> Khấu trừ trực tiếp `walletBalance` của Gara,
     *        ghi nhận mã tham chiếu Ủy nhiệm chi / Napas247 (`transactionReference`), và tạo bút toán sổ cái
     *        `WalletTransactionType.PAYOUT_WITHDRAW` với số tiền âm (`requestedAmount.negate()`).
     *      - `REJECTED`: Từ chối yêu cầu rút tiền -> Giải phóng khoản tiền đang phong tỏa để trả lại vào `availableBalance`.
     *
     * @param admin    Tài khoản Admin thực hiện phê duyệt / giải ngân.
     * @param payoutId Mã định danh của yêu cầu rút tiền.
     * @param dto      Thông tin trạng thái đích, ghi chú thẩm định và mã giao dịch chuyển khoản ngân hàng.
     * @return Thông tin yêu cầu rút tiền sau khi cập nhật trạng thái.
     */
    @Transactional
    public PayoutRequestResponse processPayoutRequest(User admin, Long payoutId, ApprovePayoutDto dto) {
        // Bước 1: Tìm garageId của lệnh rút và khóa dòng ví Gara (PESSIMISTIC_WRITE)
        Long garageId = payoutRequestRepository.findGarageIdById(payoutId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu rút tiền #" + payoutId));
        BigDecimal lockedBalance = garageRepository.lockWalletBalance(garageId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ví gara"));
        PayoutRequest payout = payoutRequestRepository.findById(payoutId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu rút tiền #" + payoutId));

        // Bước 2: Chặn xử lý lặp đối với các lệnh rút đã hoàn tất giải ngân hoặc đã bị từ chối
        if (payout.getStatus() == PayoutStatus.TRANSFERRED || payout.getStatus() == PayoutStatus.REJECTED) {
            throw new BadRequestException("Yêu cầu rút tiền này đã được xử lý hoàn tất trước đó");
        }

        // Bước 3: Kiểm tra trạng thái đích hợp lệ (không được null hoặc quay ngược về PENDING)
        PayoutStatus targetStatus = dto.getStatus();
        if (targetStatus == null || targetStatus == PayoutStatus.PENDING) {
            throw new BadRequestException("Trạng thái phê duyệt rút tiền không hợp lệ");
        }

        Garage garage = payout.getGarage();
        BigDecimal currentWalletBalance = lockedBalance;
        garage.setWalletBalance(lockedBalance);

        // Bước 4: Xử lý theo từng nhánh trạng thái đích
        if (targetStatus == PayoutStatus.APPROVED) {
            // Nhánh 1: Phê duyệt lệnh rút (chờ chuyển khoản ngân hàng)
            if (currentWalletBalance.compareTo(payout.getRequestedAmount()) < 0) {
                throw new BadRequestException("Số dư ví garage hiện tại không đủ để phê duyệt lệnh rút tiền này");
            }
            payout.setStatus(PayoutStatus.APPROVED);
            payout.setAdminReviewer(admin);
            payout.setAdminNote(dto.getAdminNote() != null ? dto.getAdminNote() : "Đã phê duyệt lệnh rút, chờ chuyển khoản ngân hàng");
            payout.setProcessedAt(LocalDateTime.now());
        } else if (targetStatus == PayoutStatus.TRANSFERRED) {
            // Nhánh 2: Xác nhận đã giải ngân chuyển khoản ngân hàng thành công -> Trừ ví Gara và ghi sổ cái
            if (currentWalletBalance.compareTo(payout.getRequestedAmount()) < 0) {
                throw new BadRequestException("Số dư ví garage không đủ để thực hiện giải ngân chuyển khoản");
            }

            // Khấu trừ số dư thực tế trong ví Gara
            BigDecimal newWalletBalance = currentWalletBalance.subtract(payout.getRequestedAmount());
            garage.setWalletBalance(newWalletBalance);
            garageRepository.save(garage);

            // Sinh mã đối chiếu giao dịch ngân hàng (Napas247) nếu Admin không nhập mã UNC thủ công
            String txRef = (dto.getTransactionReference() != null && !dto.getTransactionReference().isBlank())
                    ? dto.getTransactionReference().trim()
                    : "TXN-NAPAS-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

            payout.setStatus(PayoutStatus.TRANSFERRED);
            payout.setAdminReviewer(admin);
            payout.setTransactionReference(txRef);
            payout.setAdminNote(dto.getAdminNote() != null ? dto.getAdminNote() : "Đã giải ngân thành công qua Napas247");
            payout.setProcessedAt(LocalDateTime.now());

            // Ghi nhận bút toán âm (DEBIT) vào bảng sổ cái wallet_transactions
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
            // Nhánh 3: Từ chối yêu cầu rút tiền -> Hủy phong tỏa số tiền yêu cầu rút
            payout.setStatus(PayoutStatus.REJECTED);
            payout.setAdminReviewer(admin);
            payout.setAdminNote(dto.getAdminNote() != null && !dto.getAdminNote().isBlank()
                    ? dto.getAdminNote()
                    : "Từ chối yêu cầu rút tiền do cần đối soát bổ sung");
            payout.setProcessedAt(LocalDateTime.now());
        }

        // Lưu cập nhật PayoutRequest và trả về kết quả kèm số dư khả dụng mới nhất của Gara
        PayoutRequest saved = payoutRequestRepository.save(payout);
        return mapToPayoutResponse(saved, calculateAvailableBalance(garage));
    }

    // =========================================================================
    // UC-25: Thống kê Tổng quan Dòng tiền & Doanh thu Nền tảng (Revenue Stats)
    // =========================================================================

    /**
     * Tính toán và tổng hợp toàn bộ các chỉ số thống kê tài chính của nền tảng theo thời gian thực:
     *   - Tỷ lệ hoa hồng mặc định hiện hành (`activeCommissionRate`).
     *   - Tổng GMV, tổng hoa hồng sàn thu được (`totalPlatformFeeEarned`), tổng doanh thu ròng Gara (`totalNetGarageSettlement`).
     *   - Số lượng giao dịch thành công, đã đối soát, đang chờ thanh toán, đã hoàn tiền, hoặc bị lỗi.
     *   - Số lượng và tổng giá trị các lệnh rút tiền đang chờ giải ngân và đã giải ngân.
     *   - Tổng số dư ví của tất cả Gara và số lượng hồ sơ khiếu nại đang mở chờ xử lý.
     *
     * @return Đối tượng `PlatformRevenueStatsDto` chứa đầy đủ các chỉ số tài chính toàn sàn.
     */
    @Transactional(readOnly = true)
    public PlatformRevenueStatsDto getPlatformRevenueStats() {
        // 1. Lấy cấu hình hoa hồng đang active
        CommissionConfigDto activeConfig = getActiveCommissionConfig();

        // 2. Thống kê các lệnh rút tiền của Gara (Payout Requests)
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

        // 3. Tính tổng số dư ví hiện tại của toàn bộ đối tác Gara
        BigDecimal totalGarageBalances = garageRepository.findAll().stream()
                .map(g -> g.getWalletBalance() != null ? g.getWalletBalance() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 4. Thống kê các giao dịch thanh toán (Payment Transactions)
        List<PaymentTransaction> paidTxs = paymentTransactionRepository != null
                ? paymentTransactionRepository.findByStatusOrderByCreatedAtDesc(PaymentStatus.SUCCESS)
                : List.of();

        List<PaymentTransaction> allTxs = paymentTransactionRepository != null
                ? paymentTransactionRepository.findAllByOrderByCreatedAtDesc()
                : List.of();
        if (allTxs.isEmpty() && !paidTxs.isEmpty()) {
            allTxs = paidTxs;
        }

        long paidCount = paidTxs.size();
        long reconciledCount = paidTxs.stream().filter(PaymentTransaction::isReconciled).count();
        BigDecimal grossGmv = paidTxs.stream()
                .map(tx -> tx.getAmount() != null ? tx.getAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalFee = paidTxs.stream()
                .map(tx -> tx.getPlatformFee() != null ? tx.getPlatformFee() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalNetGarage = paidTxs.stream()
                .map(tx -> tx.getNetGarageAmount() != null ? tx.getNetGarageAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 5. Thống kê giao dịch hoàn tiền (REFUNDED), đang chờ (PENDING) và thất bại (FAILED/CANCELLED/EXPIRED)
        List<PaymentTransaction> refundedTxs = allTxs.stream()
                .filter(tx -> tx.getStatus() == PaymentStatus.REFUNDED)
                .collect(Collectors.toList());
        long refundedCount = refundedTxs.size();
        BigDecimal totalRefunded = refundedTxs.stream()
                .map(tx -> tx.getAmount() != null ? tx.getAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long pendingTxCount = allTxs.stream()
                .filter(tx -> tx.getStatus() == PaymentStatus.PENDING)
                .count();
        long failedTxCount = allTxs.stream()
                .filter(tx -> tx.getStatus() == PaymentStatus.FAILED
                        || tx.getStatus() == PaymentStatus.CANCELLED
                        || tx.getStatus() == PaymentStatus.EXPIRED)
                .count();

        // 6. Thống kê hồ sơ khiếu nại & hoàn tiền nếu ServiceDisputeRepository khả dụng
        long openDisputesCount = 0L;
        if (serviceDisputeRepository != null) {
            List<ServiceDispute> allDisputes = serviceDisputeRepository.findAllByOrderByCreatedAtDesc();
            openDisputesCount = allDisputes.stream()
                    .filter(d -> d.getStatus() == DisputeStatus.STAFF_REVIEW
                            || d.getStatus() == DisputeStatus.ADMIN_APPROVAL)
                    .count();
            BigDecimal approvedDisputeRefunds = allDisputes.stream()
                    .filter(d -> d.getStatus() == DisputeStatus.REFUNDED && d.getApprovedRefundAmount() != null)
                    .map(ServiceDispute::getApprovedRefundAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            if (approvedDisputeRefunds.compareTo(BigDecimal.ZERO) > 0) {
                totalRefunded = approvedDisputeRefunds;
            }
        }

        // 7. Đóng gói kết quả vào DTO (cung cấp đồng thời cả các trường gốc và các trường mở rộng)
        return PlatformRevenueStatsDto.builder()
                .activeCommissionRate(activeConfig.getGlobalRate())
                .totalPaidTransactionCount(paidCount)
                .paidTransactionsCount(paidCount)
                .reconciledTransactionCount(reconciledCount)
                .totalGrossRevenueGmv(grossGmv)
                .totalGmv(grossGmv)
                .totalPlatformFeeEarned(totalFee)
                .totalPlatformCommission(totalFee)
                .totalNetGarageSettlement(totalNetGarage)
                .totalGarageNet(totalNetGarage)
                .pendingPayoutCount(pendingCount)
                .pendingPayoutTotalAmount(pendingSum)
                .pendingPayoutAmount(pendingSum)
                .transferredPayoutCount(transferredCount)
                .completedPayoutsCount(transferredCount)
                .transferredPayoutTotalAmount(transferredSum)
                .completedPayoutAmount(transferredSum)
                .totalGarageWalletBalances(totalGarageBalances)
                .totalRefundedAmount(totalRefunded)
                .refundedTransactionsCount(refundedCount)
                .failedTransactionsCount(failedTxCount)
                .pendingTransactionsCount(pendingTxCount)
                .openDisputesCount(openDisputesCount)
                .build();
    }

    // =========================================================================
    // Helper methods (Các phương thức hỗ trợ tính toán & ánh xạ dữ liệu)
    // =========================================================================

    /**
     * Khởi tạo cấu hình hoa hồng mặc định ban đầu cho hệ thống khi bảng `commission_configs` chưa có dữ liệu.
     */
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

    /**
     * Tính toán số dư khả dụng của Ví Gara:
     * `availableBalance = max(0, walletBalance - SUM(requestedAmount WHERE status IN (PENDING, APPROVED)))`.
     */
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

    /**
     * Ánh xạ thực thể `Garage` cùng danh mục dịch vụ và chi nhánh sang `GarageCommissionDto`.
     */
    private GarageCommissionDto mapToGarageCommissionDto(Garage garage, BigDecimal fallbackGlobalRate) {
        BigDecimal effectiveRate = garage.getCommissionRate() != null
                ? garage.getCommissionRate()
                : (fallbackGlobalRate != null ? fallbackGlobalRate : new BigDecimal("12.50"));

        List<ServiceItem> rawServices = (serviceItemRepository != null && garage.getId() != null)
                ? serviceItemRepository.findByGarageIdAndDeletedFalseOrderByCreatedAtAsc(garage.getId())
                : List.of();

        List<GarageCommissionDto.GarageServiceSummaryDto> serviceDtos = rawServices.stream()
                .map(s -> GarageCommissionDto.GarageServiceSummaryDto.builder()
                        .id(s.getId())
                        .serviceName(s.getServiceName())
                        .basePrice(s.getStandardPrice())
                        .isActive(s.isActive())
                        .build())
                .collect(Collectors.toList());

        List<GarageBranch> branches = (garageBranchRepository != null && garage.getId() != null)
                ? garageBranchRepository.findByGarageIdOrderByCreatedAtAsc(garage.getId())
                : List.of();

        String address = !branches.isEmpty() && branches.get(0).getAddress() != null
                ? branches.get(0).getAddress()
                : "TP. Hồ Chí Minh";

        boolean isOnline = !branches.isEmpty()
                ? branches.stream().anyMatch(b -> b.getOperatingStatus() == BranchStatus.OPEN)
                : garage.getStatus() == GarageStatus.APPROVED;

        return GarageCommissionDto.builder()
                .garageId(garage.getId())
                .garageName(garage.getGarageName())
                .phone(garage.getPhone())
                .address(address)
                .status(garage.getStatus() != null ? garage.getStatus().name() : GarageStatus.PENDING.name())
                .isVerified(garage.getStatus() == GarageStatus.APPROVED)
                .isOnline(isOnline)
                .commissionRate(effectiveRate)
                .walletBalance(garage.getWalletBalance() != null ? garage.getWalletBalance() : BigDecimal.ZERO)
                .serviceCount(serviceDtos.size())
                .services(serviceDtos)
                .updatedAt(garage.getUpdatedAt() != null ? garage.getUpdatedAt() : garage.getCreatedAt())
                .build();
    }

    /**
     * Ánh xạ thực thể `CommissionConfig` sang `CommissionConfigDto`.
     */
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

    /**
     * Ánh xạ thực thể bút toán sổ cái `WalletTransaction` sang `WalletTransactionDto`.
     */
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

    /**
     * Ánh xạ thực thể `PayoutRequest` sang `PayoutRequestResponse`.
     */
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
