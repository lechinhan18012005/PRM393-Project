package com.prm393.floodrescue.features.rescue.service;

import com.prm393.floodrescue.features.garage.entity.BranchStatus;
import com.prm393.floodrescue.features.garage.entity.GarageStatus;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStaff;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStatus;
import com.prm393.floodrescue.features.rescue.entity.RescueOrderStatus;
import com.prm393.floodrescue.features.rescue.repository.RescueOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
public class MechanicEligibilityChecker {

    private final RescueOrderRepository rescueOrderRepository;

    private static final List<RescueOrderStatus> ACTIVE_ORDER_STATUSES = List.of(
            RescueOrderStatus.REQUESTED,
            RescueOrderStatus.DISPATCHED,
            RescueOrderStatus.ARRIVED,
            RescueOrderStatus.IN_PROGRESS
    );

    /**
     * Bộ tiêu chí chuẩn hóa xác minh thợ đủ điều kiện chở xe vượt ngập (B01)
     */
    public boolean isMechanicEligibleForCrossing(MechanicStaff staff, LocalDateTime heartbeatThreshold) {
        return isMechanicEligible(staff, heartbeatThreshold, true);
    }

    /**
     * Bộ tiêu chí dùng chung cho điều phối cứu hộ. Năng lực chở xe chuyên dụng
     * chỉ bắt buộc với đơn vượt ngập, không bắt buộc với sửa tại chỗ/kéo xe.
     */
    public boolean isMechanicEligibleForRescue(MechanicStaff staff, LocalDateTime heartbeatThreshold) {
        return isMechanicEligible(staff, heartbeatThreshold, false);
    }

    private boolean isMechanicEligible(MechanicStaff staff, LocalDateTime heartbeatThreshold,
                                       boolean requireCrossingCapability) {
        if (staff == null) {
            return false;
        }

        // 1. Tài khoản thợ đang hoạt động
        if (staff.getUser() == null || !Boolean.TRUE.equals(staff.getUser().isActive())) {
            return false;
        }

        // 2. Gara đã được phê duyệt (APPROVED)
        if (staff.getGarage() == null || staff.getGarage().getStatus() != GarageStatus.APPROVED) {
            return false;
        }

        // 3. Chi nhánh trực thuộc tồn tại và đang mở cửa (OPEN)
        if (staff.getBranch() == null || staff.getBranch().getOperatingStatus() != BranchStatus.OPEN) {
            return false;
        }

        // 4. Có năng lực chở xe chuyên dụng (hasCrossingCapability = true)
        if (requireCrossingCapability && !staff.isHasCrossingCapability()) {
            return false;
        }

        // 5. Trạng thái làm việc là AVAILABLE
        if (staff.getWorkingStatus() != MechanicStatus.AVAILABLE) {
            return false;
        }

        // 6. Tọa độ GPS hợp lệ (không null, không NaN, nằm trong giới hạn thực tế)
        if (staff.getCurrentLatitude() == null || staff.getCurrentLongitude() == null) {
            return false;
        }
        if (Double.isNaN(staff.getCurrentLatitude()) || Double.isInfinite(staff.getCurrentLatitude())
                || staff.getCurrentLatitude() < -90.0 || staff.getCurrentLatitude() > 90.0) {
            return false;
        }
        if (Double.isNaN(staff.getCurrentLongitude()) || Double.isInfinite(staff.getCurrentLongitude())
                || staff.getCurrentLongitude() < -180.0 || staff.getCurrentLongitude() > 180.0) {
            return false;
        }

        // 7. Độ mới GPS / Heartbeat (trong vòng heartbeatThreshold)
        LocalDateTime lastActive = staff.getLastGpsUpdatedAt() != null
                ? staff.getLastGpsUpdatedAt()
                : staff.getLastHeartbeatAt();
        if (lastActive == null || lastActive.isBefore(heartbeatThreshold)) {
            return false;
        }

        // 8. Không có đơn nào đang thực hiện (REQUESTED, DISPATCHED, ARRIVED, IN_PROGRESS)
        if (rescueOrderRepository.existsByMechanicStaffIdAndStatusIn(staff.getId(), ACTIVE_ORDER_STATUSES)) {
            return false;
        }

        return true;
    }
}
