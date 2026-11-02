package com.prm393.floodrescue.features.rescue.service;

import com.prm393.floodrescue.common.exception.BadRequestException;
import com.prm393.floodrescue.common.exception.ResourceNotFoundException;
import com.prm393.floodrescue.common.service.CloudinaryService;
import com.prm393.floodrescue.common.utils.GeoDistanceUtils;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStaff;
import com.prm393.floodrescue.features.mechanic.repository.MechanicStaffRepository;
import com.prm393.floodrescue.features.rescue.dto.CompleteOrderRequest;
import com.prm393.floodrescue.features.rescue.dto.ConfirmArrivalRequest;
import com.prm393.floodrescue.features.rescue.dto.RescueOrderResponse;
import com.prm393.floodrescue.features.rescue.dto.TransitStageRequest;
import com.prm393.floodrescue.features.rescue.entity.RescueOrder;
import com.prm393.floodrescue.features.rescue.entity.RescueOrderEvidence;
import com.prm393.floodrescue.features.rescue.entity.RescueOrderStatus;
import com.prm393.floodrescue.features.rescue.entity.TransportStage;
import com.prm393.floodrescue.features.rescue.repository.RescueOrderEvidenceRepository;
import com.prm393.floodrescue.features.rescue.repository.RescueOrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;

@Service
@RequiredArgsConstructor
@Slf4j
public class RescueExecutionService {

    private final RescueOrderRepository rescueOrderRepository;
    private final MechanicStaffRepository mechanicRepository;
    private final RescueOrderEvidenceRepository evidenceRepository;
    private final CloudinaryService cloudinaryService;
    private final RescueDispatchService dispatchService;
    private final MechanicAssignmentLifecycleService mechanicLifecycle;

    @Value("${app.rescue.arrival-threshold-meters:30.0}")
    private double arrivalThresholdMeters;

    /**
     * Thợ xác nhận đã đến hiện trường đón xe (<30m)
     */
    @Transactional
    public RescueOrderResponse confirmArrival(User mechanicUser, Long orderId, ConfirmArrivalRequest request) {
        RescueOrder order = rescueOrderRepository.findByIdWithLock(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn cứu hộ: " + orderId));

        validateAssignedMechanic(order, mechanicUser);

        if (order.getStatus() != RescueOrderStatus.DISPATCHED) {
            throw new BadRequestException("Đơn cứu hộ không ở trạng thái đang di chuyển tới điểm đón!");
        }

        if (request.getLatitude() == null || request.getLongitude() == null
                || Double.isNaN(request.getLatitude()) || Double.isInfinite(request.getLatitude())
                || Math.abs(request.getLatitude()) > 90.0
                || Double.isNaN(request.getLongitude()) || Double.isInfinite(request.getLongitude())
                || Math.abs(request.getLongitude()) > 180.0) {
            throw new BadRequestException("Tọa độ GPS xác nhận đến nơi không hợp lệ!");
        }

        if (request.getRecordedAt() != null) {
            Instant nowInst = Instant.now();
            if (request.getRecordedAt().isBefore(nowInst.minusSeconds(30))) {
                throw new BadRequestException("Dữ liệu GPS đã cũ (>30 giây). Vui lòng bật lại định vị GPS và thử lại!");
            }
            if (request.getRecordedAt().isAfter(nowInst.plusSeconds(5))) {
                throw new BadRequestException("Thời gian ghi nhận GPS không hợp lệ (ở tương lai)!");
            }
        }

        double distance = GeoDistanceUtils.calculateDistanceMeters(
                request.getLatitude(), request.getLongitude(),
                order.getPickupLatitude(), order.getPickupLongitude()
        );

        if (distance > arrivalThresholdMeters) {
            long distRounded = Math.round(distance);
            throw new BadRequestException(
                    "Bạn còn cách điểm đón " + distRounded + " mét, chưa đủ gần (<30m) để xác nhận đến nơi!"
            );
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime gpsTime = request.getRecordedAt() != null
                ? LocalDateTime.ofInstant(request.getRecordedAt(), ZoneId.systemDefault())
                : now;
        order.setStatus(RescueOrderStatus.ARRIVED);
        order.setArrivedAt(now);

        MechanicStaff staff = order.getMechanicStaff();
        staff.setCurrentLatitude(request.getLatitude());
        staff.setCurrentLongitude(request.getLongitude());
        staff.setLastGpsUpdatedAt(gpsTime);
        staff.setLastHeartbeatAt(now);
        mechanicRepository.save(staff);

        order = rescueOrderRepository.save(order);
        dispatchService.recordAudit(order.getId(), RescueOrderStatus.DISPATCHED, RescueOrderStatus.ARRIVED,
                mechanicUser.getId(), mechanicUser.getUsername(), "Thợ xác nhận đã đến hiện trường (khoảng cách " + Math.round(distance) + "m)");

        dispatchService.broadcastOrderUpdate(order);
        log.info("Mechanic {} arrived at order {} (distance: {}m)", mechanicUser.getUsername(), order.getOrderCode(), distance);

        return dispatchService.mapToResponse(order);
    }

    /**
     * Cập nhật tiến độ chở xe đơn lẻ (nhận xe, chằng buộc, đang chở, tới điểm trả, bàn giao)
     * Nghiêm ngặt tuân thủ luồng mốc D01: NONE -> VEHICLE_RECEIVED -> STRAPPED_SECURE -> IN_TRANSIT -> ARRIVED_DROPOFF -> HANDED_OVER
     */
    @Transactional
    public RescueOrderResponse updateTransitStage(User mechanicUser, Long orderId, TransitStageRequest request) {
        RescueOrder order = rescueOrderRepository.findByIdWithLock(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn cứu hộ: " + orderId));

        validateAssignedMechanic(order, mechanicUser);

        if (order.getStatus() != RescueOrderStatus.ARRIVED && order.getStatus() != RescueOrderStatus.IN_PROGRESS) {
            throw new BadRequestException("Chỉ được cập nhật tiến độ vận chuyển sau khi thợ đã đến nơi!");
        }

        // Kiểm tra chuyển bước tuần tự hợp lệ (D01)
        validateStageTransition(order.getTransportStage(), request.getStage());

        // Idempotent retry: Nếu đã ở bước này thì trả về luôn, không tạo audit trùng
        if (order.getTransportStage() == request.getStage()) {
            log.info("Idempotent transit stage update: Stage {} already set for order {}", request.getStage(), order.getOrderCode());
            return dispatchService.mapToResponse(order);
        }

        RescueOrderStatus previousStatus = order.getStatus();
        if (request.getStage() == TransportStage.VEHICLE_RECEIVED && order.getStatus() == RescueOrderStatus.ARRIVED) {
            order.setStatus(RescueOrderStatus.IN_PROGRESS);
            order.setServiceStartedAt(LocalDateTime.now());
        }

        order.setTransportStage(request.getStage());
        if (request.getNote() != null && !request.getNote().isBlank()) {
            order.setTransportNote(request.getNote().trim());
        }

        LocalDateTime now = LocalDateTime.now();
        MechanicStaff staff = order.getMechanicStaff();
        staff.setLastHeartbeatAt(now);
        mechanicRepository.save(staff);

        order = rescueOrderRepository.save(order);

        String auditNote = "Cập nhật tiến độ: " + request.getStage()
                + (request.getNote() != null ? " (" + request.getNote() + ")" : "");
        dispatchService.recordAudit(order.getId(), previousStatus, order.getStatus(),
                mechanicUser.getId(), mechanicUser.getUsername(), auditNote);

        dispatchService.broadcastOrderUpdate(order);
        log.info("Order {} transit stage updated to: {}", order.getOrderCode(), request.getStage());

        return dispatchService.mapToResponse(order);
    }

    @Transactional
    public RescueOrderEvidence uploadOrderEvidence(User mechanicUser, Long orderId, MultipartFile file, String evidenceType) {
        RescueOrder order = rescueOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn cứu hộ: " + orderId));
        validateAssignedMechanic(order, mechanicUser);

        if (order.getStatus() != RescueOrderStatus.IN_PROGRESS && order.getStatus() != RescueOrderStatus.ARRIVED) {
            throw new BadRequestException("Chỉ được tải ảnh bằng chứng khi đơn đang được thực hiện!");
        }

        String url = cloudinaryService.uploadImage(file, "rescue_evidence/" + orderId);
        RescueOrderEvidence evidence = RescueOrderEvidence.builder()
                .rescueOrder(order)
                .uploadedBy(mechanicUser)
                .fileUrl(url)
                .evidenceType(evidenceType != null ? evidenceType : "COMPLETION")
                .build();
        return evidenceRepository.save(evidence);
    }

    /**
     * Thợ hoàn tất ca cứu hộ & nghiệm thu bàn giao xe bằng ảnh thật (D01 & D02)
     */
    @Transactional
    public RescueOrderResponse completeOrder(User mechanicUser, Long orderId, CompleteOrderRequest request) {
        RescueOrder order = rescueOrderRepository.findByIdWithLock(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn cứu hộ: " + orderId));

        validateAssignedMechanic(order, mechanicUser);

        // Idempotent: Nếu đã hoàn tất và đang ở PAYMENT_PENDING hoặc COMPLETED thì trả về kết quả hiện tại
        if (order.getStatus() == RescueOrderStatus.PAYMENT_PENDING || order.getStatus() == RescueOrderStatus.COMPLETED) {
            log.info("Order {} is already {}. Returning current state.", order.getOrderCode(), order.getStatus());
            return dispatchService.mapToResponse(order);
        }

        // D01: Chỉ complete từ IN_PROGRESS
        if (order.getStatus() != RescueOrderStatus.IN_PROGRESS) {
            throw new BadRequestException("Chỉ có thể hoàn tất đơn khi đang trong quá trình thực hiện (IN_PROGRESS)!");
        }

        // D01: Bắt buộc phải qua bước HANDED_OVER trước đó, không được tự động gán bỏ bước
        if (order.getTransportStage() != TransportStage.HANDED_OVER) {
            throw new BadRequestException("Chưa hoàn tất bước bàn giao xe (HANDED_OVER). Vui lòng hoàn thành bước bàn giao trước khi nghiệm thu hoàn tất!");
        }

        // D02: Xác thực ảnh nghiệm thu hợp lệ (không chấp nhận chuỗi giả / URL chưa upload)
        String photoUrl = request.getCompletionPhotoUrl() != null ? request.getCompletionPhotoUrl().trim() : "";
        if (photoUrl.isBlank() || !(photoUrl.startsWith("http://") || photoUrl.startsWith("https://")) || photoUrl.contains("not-an-upload")) {
            throw new BadRequestException("Ảnh nghiệm thu không hợp lệ hoặc chưa được tải lên hệ thống qua kênh chính thức!");
        }

        // Kiểm tra ảnh đã được upload chính thức qua hệ thống cho đơn này bởi thợ này
        boolean isValidEvidence = evidenceRepository.existsByRescueOrderIdAndUploadedByIdAndFileUrl(
                order.getId(), mechanicUser.getId(), photoUrl
        );
        if (!isValidEvidence) {
            throw new BadRequestException("Ảnh nghiệm thu không hợp lệ hoặc không thuộc về đơn cứu hộ này!");
        }

        LocalDateTime now = LocalDateTime.now();
        RescueOrderStatus previousStatus = order.getStatus();

        order.setStatus(RescueOrderStatus.PAYMENT_PENDING);
        order.setCompletionPhotoUrl(photoUrl);
        if (request.getHandoverPhotoUrl() != null && !request.getHandoverPhotoUrl().isBlank()) {
            order.setHandoverPhotoUrl(request.getHandoverPhotoUrl().trim());
        }
        if (request.getNotes() != null) {
            order.setCompletionNotes(request.getNotes().trim());
        }
        order.setServiceCompletedAt(now);

        // Lưu snapshot tọa độ cuối cùng của thợ tại thời điểm hoàn tất (bảo vệ quyền riêng tư)
        MechanicStaff staff = order.getMechanicStaff();
        Double finalLat = staff != null && staff.getCurrentLatitude() != null ? staff.getCurrentLatitude() : order.getDropoffLatitude();
        Double finalLng = staff != null && staff.getCurrentLongitude() != null ? staff.getCurrentLongitude() : order.getDropoffLongitude();
        order.setFinalMechanicLatitude(finalLat);
        order.setFinalMechanicLongitude(finalLng);

        order = rescueOrderRepository.save(order);

        // PAYMENT_PENDING no longer occupies the mechanic.
        mechanicLifecycle.releaseIfNoOtherActiveOrder(order, now);

        dispatchService.recordAudit(order.getId(), previousStatus, RescueOrderStatus.PAYMENT_PENDING,
                mechanicUser.getId(), mechanicUser.getUsername(), "Thợ hoàn tất chở xe, nghiệm thu có ảnh bàn giao. Đơn chuyển sang PAYMENT_PENDING.");

        dispatchService.broadcastOrderUpdate(order);
        log.info("Order {} completed by mechanic {}. Now PAYMENT_PENDING.", order.getOrderCode(), mechanicUser.getUsername());

        return dispatchService.mapToResponse(order);
    }

    /**
     * Cập nhật trạng thái RescueOrder sang COMPLETED khi thanh toán thành công (PayOS / Cash)
     */
    @Transactional
    public RescueOrder markPaymentSuccessful(
            Long rescueOrderId,
            Long paymentTransactionId,
            Long paymentOrderCode,
            String paymentMethod,
            BigDecimal paidAmount,
            LocalDateTime paidAt
    ) {
        RescueOrder order = rescueOrderRepository.findByIdWithLock(rescueOrderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn cứu hộ: " + rescueOrderId));

        // Idempotency: nếu đã COMPLETED rồi thì kiểm tra khớp transaction và trả về
        if (order.getStatus() == RescueOrderStatus.COMPLETED) {
            if (paymentTransactionId != null && paymentTransactionId.equals(order.getPaymentTransactionId())) {
                log.info("Order {} is already COMPLETED by matching transaction {}. Idempotent return.",
                        order.getOrderCode(), paymentTransactionId);
                return order;
            }
            log.warn("Order {} is already COMPLETED by transaction {}, rejecting duplicate completion by transaction {}",
                    order.getOrderCode(), order.getPaymentTransactionId(), paymentTransactionId);
            throw new BadRequestException(String.format("Đơn cứu hộ %s đã được hoàn tất bởi giao dịch #%s, không thể hoàn tất lại bởi giao dịch #%s!",
                    order.getOrderCode(), order.getPaymentTransactionId(), paymentTransactionId));
        }

        if (order.getStatus() != RescueOrderStatus.PAYMENT_PENDING) {
            throw new BadRequestException("Chỉ có thể xác nhận thanh toán khi đơn ở trạng thái PAYMENT_PENDING. Hiện tại: " + order.getStatus());
        }

        if (paidAmount == null || order.getTotalAmount() == null || paidAmount.compareTo(order.getTotalAmount()) != 0) {
            throw new BadRequestException(String.format("Số tiền thanh toán (%s) không khớp với tổng tiền đơn cứu hộ (%s)!",
                    paidAmount, order.getTotalAmount()));
        }

        RescueOrderStatus previousStatus = order.getStatus();
        LocalDateTime resolvedPaidAt = paidAt != null ? paidAt : LocalDateTime.now();

        order.setStatus(RescueOrderStatus.COMPLETED);
        order.setPaidAt(resolvedPaidAt);
        order.setPaymentMethod(paymentMethod != null ? paymentMethod : "PAYOS");
        order.setPaymentTransactionId(paymentTransactionId);
        order.setPaymentOrderCode(paymentOrderCode);

        order = rescueOrderRepository.save(order);

        // Defensive reconciliation for legacy/completed orders whose mechanic was left BUSY.
        mechanicLifecycle.releaseIfNoOtherActiveOrder(order, resolvedPaidAt);

        dispatchService.recordAudit(order.getId(), previousStatus, RescueOrderStatus.COMPLETED,
                null, "PAYMENT_GATEWAY", String.format("Thanh toán thành công qua %s (Mã GD: %s, Mã PayOS: %s, Số tiền: %s VND). Đơn cứu hộ hoàn tất.",
                        order.getPaymentMethod(), paymentTransactionId, paymentOrderCode, paidAmount));

        dispatchService.broadcastOrderUpdate(order);
        log.info("Order {} marked COMPLETED after payment success. Paid at: {}", order.getOrderCode(), resolvedPaidAt);

        return order;
    }

    private void validateStageTransition(TransportStage current, TransportStage next) {
        if (current == null) {
            current = TransportStage.NONE;
        }
        if (current == next) {
            return;
        }
        boolean isValid = switch (current) {
            case NONE -> next == TransportStage.VEHICLE_RECEIVED;
            case VEHICLE_RECEIVED -> next == TransportStage.STRAPPED_SECURE;
            case STRAPPED_SECURE -> next == TransportStage.IN_TRANSIT;
            case IN_TRANSIT -> next == TransportStage.ARRIVED_DROPOFF || next == TransportStage.PAUSED_HIGH_WATER;
            case ARRIVED_DROPOFF -> next == TransportStage.HANDED_OVER;
            case PAUSED_HIGH_WATER -> next == TransportStage.IN_TRANSIT;
            case HANDED_OVER -> false;
        };
        if (!isValid) {
            throw new BadRequestException("Không thể chuyển tiến độ từ " + current + " sang " + next
                    + ". Quy trình phải thực hiện tuần tự: Tiếp nhận xe -> Chằng buộc -> Đang di chuyển -> Đến điểm trả -> Bàn giao xe.");
        }
    }

    private void validateAssignedMechanic(RescueOrder order, User mechanicUser) {
        if (order.getMechanicStaff() == null || !order.getMechanicStaff().getUser().getId().equals(mechanicUser.getId())) {
            throw new BadRequestException("Bạn không phải là thợ được phân công phụ trách đơn cứu hộ này!");
        }
    }
}
