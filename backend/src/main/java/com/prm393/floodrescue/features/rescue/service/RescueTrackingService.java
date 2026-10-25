package com.prm393.floodrescue.features.rescue.service;

import com.prm393.floodrescue.common.exception.BadRequestException;
import com.prm393.floodrescue.common.exception.ResourceNotFoundException;
import com.prm393.floodrescue.common.utils.GeoDistanceUtils;
import com.prm393.floodrescue.features.auth.entity.Role;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStaff;
import com.prm393.floodrescue.features.mechanic.repository.MechanicStaffRepository;
import com.prm393.floodrescue.features.rescue.dto.LocationUpdateDto;
import com.prm393.floodrescue.features.rescue.dto.TrackingSnapshotDto;
import com.prm393.floodrescue.features.rescue.entity.RescueOrder;
import com.prm393.floodrescue.features.rescue.entity.RescueOrderStatus;
import com.prm393.floodrescue.features.rescue.repository.RescueOrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;

@Service
@RequiredArgsConstructor
@Slf4j
public class RescueTrackingService {

    private final RescueOrderRepository rescueOrderRepository;
    private final MechanicStaffRepository mechanicRepository;
    private final SimpMessagingTemplate messagingTemplate;

    private static final long STALE_GPS_THRESHOLD_SECONDS = 30;

    private void executeAfterCommit(Runnable runnable) {
        if (org.springframework.transaction.support.TransactionSynchronizationManager.isActualTransactionActive()) {
            org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(
                    new org.springframework.transaction.support.TransactionSynchronization() {
                        @Override
                        public void afterCommit() {
                            try {
                                runnable.run();
                            } catch (Exception e) {
                                log.warn("After-commit action failed: {}", e.getMessage());
                            }
                        }
                    }
            );
        } else {
            runnable.run();
        }
    }

    @Transactional
    public TrackingSnapshotDto updateMechanicLocation(User mechanicUser, Long orderId, LocationUpdateDto location) {
        RescueOrder order = rescueOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn cứu hộ: " + orderId));

        if (order.getMechanicStaff() == null || !order.getMechanicStaff().getUser().getId().equals(mechanicUser.getId())) {
            throw new BadRequestException("Bạn không phải thợ được phân công cho đơn cứu hộ này!");
        }

        // C03: Đơn đã kết thúc không nhận cập nhật vị trí trực tiếp
        if (order.getStatus() == RescueOrderStatus.PAYMENT_PENDING
                || order.getStatus() == RescueOrderStatus.COMPLETED
                || order.getStatus() == RescueOrderStatus.CANCELLED
                || order.getStatus() == RescueOrderStatus.DISPATCH_FAILED) {
            throw new BadRequestException("Đơn cứu hộ đã kết thúc hành trình, không còn nhận cập nhật vị trí trực tiếp!");
        }

        if (location.getLatitude() == null || location.getLongitude() == null
                || Double.isNaN(location.getLatitude()) || Double.isInfinite(location.getLatitude())
                || Math.abs(location.getLatitude()) > 90.0
                || Double.isNaN(location.getLongitude()) || Double.isInfinite(location.getLongitude())
                || Math.abs(location.getLongitude()) > 180.0) {
            throw new BadRequestException("Tọa độ GPS gửi lên không hợp lệ!");
        }

        if (location.getAccuracyMeters() != null && location.getAccuracyMeters() < 0) {
            throw new BadRequestException("Sai số GPS không được âm!");
        }

        if (location.getRecordedAt() != null) {
            Instant nowInst = Instant.now();
            if (location.getRecordedAt().isBefore(nowInst.minusSeconds(STALE_GPS_THRESHOLD_SECONDS))) {
                throw new BadRequestException("Tọa độ GPS gửi lên đã quá hạn (>30 giây), vui lòng gửi tọa độ mới!");
            }
            if (location.getRecordedAt().isAfter(nowInst.plusSeconds(5))) {
                throw new BadRequestException("Thời gian ghi nhận GPS không hợp lệ (ở tương lai)!");
            }
        }

        MechanicStaff staff = order.getMechanicStaff();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime gpsTime = location.getRecordedAt() != null
                ? LocalDateTime.ofInstant(location.getRecordedAt(), ZoneId.systemDefault())
                : now;

        // Cập nhật vị trí GPS thật (tách gpsUpdatedAt và heartbeatAt - C02)
        staff.setCurrentLatitude(location.getLatitude());
        staff.setCurrentLongitude(location.getLongitude());
        staff.setLastGpsUpdatedAt(gpsTime);
        staff.setLastHeartbeatAt(now);
        mechanicRepository.save(staff);

        TrackingSnapshotDto snapshot = buildSnapshot(order, staff, location.getBearing());

        // Bắn WebSocket cập nhật tracking SAU KHI commit giao dịch
        executeAfterCommit(() -> {
            try {
                messagingTemplate.convertAndSend("/topic/orders/" + order.getId() + "/tracking", snapshot);
            } catch (Exception e) {
                log.warn("Failed to broadcast tracking snapshot: {}", e.getMessage());
            }
        });

        return snapshot;
    }

    @Transactional(readOnly = true)
    public TrackingSnapshotDto getTrackingSnapshot(User user, Long orderId) {
        RescueOrder order = rescueOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn cứu hộ: " + orderId));

        validateAccess(user, order);

        MechanicStaff staff = order.getMechanicStaff();
        return buildSnapshot(order, staff, null);
    }

    private TrackingSnapshotDto buildSnapshot(RescueOrder order, MechanicStaff staff, Double bearing) {
        boolean isTrackingActive = order.getStatus() == RescueOrderStatus.DISPATCHED
                || order.getStatus() == RescueOrderStatus.ARRIVED
                || order.getStatus() == RescueOrderStatus.IN_PROGRESS;

        Double staffLat;
        Double staffLng;

        if (isTrackingActive) {
            staffLat = staff != null ? staff.getCurrentLatitude() : null;
            staffLng = staff != null ? staff.getCurrentLongitude() : null;
        } else {
            // Khi đơn kết thúc/hoàn tất, chỉ trả về snapshot tọa độ lưu lúc hoàn tất, bảo vệ quyền riêng tư
            staffLat = order.getFinalMechanicLatitude();
            staffLng = order.getFinalMechanicLongitude();
        }

        LocalDateTime lastGpsAt = isTrackingActive && staff != null
                ? (staff.getLastGpsUpdatedAt() != null ? staff.getLastGpsUpdatedAt() : staff.getLastHeartbeatAt())
                : null;

        boolean isStale = true;
        if (lastGpsAt != null) {
            long secondsAgo = Math.abs(Duration.between(lastGpsAt, LocalDateTime.now()).getSeconds());
            isStale = secondsAgo > STALE_GPS_THRESHOLD_SECONDS;
        }

        String targetType = "PICKUP";
        String targetAddress = order.getPickupAddress();
        Double targetLat = order.getPickupLatitude();
        Double targetLng = order.getPickupLongitude();

        if (order.getStatus() == RescueOrderStatus.ARRIVED || order.getStatus() == RescueOrderStatus.IN_PROGRESS) {
            targetType = "DROPOFF";
            targetAddress = order.getDropoffAddress();
            targetLat = order.getDropoffLatitude();
            targetLng = order.getDropoffLongitude();
        }

        Double distanceMeters = null;
        Integer etaMinutes = null;

        if (staffLat != null && staffLng != null && targetLat != null && targetLng != null) {
            distanceMeters = GeoDistanceUtils.calculateDistanceMeters(staffLat, staffLng, targetLat, targetLng);
            etaMinutes = GeoDistanceUtils.estimateArrivalMinutes(distanceMeters);
        }

        String statusMsg;
        if (isStale && staff != null) {
            statusMsg = "Cảnh báo: Mất tín hiệu GPS từ thợ (chưa cập nhật trong 30 giây gần nhất)";
        } else if (order.getStatus() == RescueOrderStatus.DISPATCHED) {
            statusMsg = "Thợ đang di chuyển đến điểm đón của bạn";
        } else if (order.getStatus() == RescueOrderStatus.ARRIVED) {
            statusMsg = "Thợ đã đến điểm đón";
        } else if (order.getStatus() == RescueOrderStatus.IN_PROGRESS) {
            statusMsg = "Đang chở xe qua điểm ngập tới nơi khô ráo";
        } else if (order.getStatus() == RescueOrderStatus.PAYMENT_PENDING) {
            statusMsg = "Đã hoàn thành vận chuyển, đang chờ thanh toán";
        } else if (order.getStatus() == RescueOrderStatus.COMPLETED) {
            statusMsg = "Đã hoàn tất cứu hộ và thanh toán thành công";
        } else {
            statusMsg = "Trạng thái: " + order.getStatus();
        }

        return TrackingSnapshotDto.builder()
                .orderId(order.getId())
                .orderCode(order.getOrderCode())
                .status(order.getStatus())
                .transportStage(order.getTransportStage())
                .mechanicLatitude(staffLat)
                .mechanicLongitude(staffLng)
                .mechanicBearing(bearing)
                .distanceToTargetMeters(distanceMeters)
                .estimatedMinutes(etaMinutes)
                .targetType(targetType)
                .targetAddress(targetAddress)
                .targetLatitude(targetLat)
                .targetLongitude(targetLng)
                .lastGpsUpdatedAt(lastGpsAt)
                .isStale(isStale)
                .trackingActive(isTrackingActive)
                .statusMessage(statusMsg)
                .build();
    }

    private void validateAccess(User user, RescueOrder order) {
        if (user.getRole() == Role.ADMIN || user.getRole() == Role.STAFF) {
            return;
        }
        if (user.getRole() == Role.CUSTOMER && order.getCustomer().getId().equals(user.getId())) {
            return;
        }
        if (user.getRole() == Role.FIELD_MECHANIC && order.getMechanicStaff() != null
                && order.getMechanicStaff().getUser().getId().equals(user.getId())) {
            return;
        }
        if (user.getRole() == Role.GARAGE_OWNER && order.getGarage().getOwner().getId().equals(user.getId())) {
            return;
        }
        throw new org.springframework.security.access.AccessDeniedException("Bạn không có quyền truy cập thông tin đơn này!");
    }
}
