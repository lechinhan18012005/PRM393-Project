package com.prm393.floodrescue.features.rescue.service;

import com.prm393.floodrescue.common.exception.BadRequestException;
import com.prm393.floodrescue.common.exception.ResourceNotFoundException;
import com.prm393.floodrescue.common.utils.GeoDistanceUtils;
import com.prm393.floodrescue.features.auth.entity.Role;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.garage.entity.BranchStatus;
import com.prm393.floodrescue.features.garage.entity.Garage;
import com.prm393.floodrescue.features.garage.entity.GarageStatus;
import com.prm393.floodrescue.features.garage.entity.ServiceItem;
import com.prm393.floodrescue.features.garage.entity.ServiceType;
import com.prm393.floodrescue.features.garage.repository.GarageRepository;
import com.prm393.floodrescue.features.garage.repository.ServiceItemRepository;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStaff;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStatus;
import com.prm393.floodrescue.features.mechanic.repository.MechanicStaffRepository;
import com.prm393.floodrescue.features.rescue.dto.CancelOrderRequest;
import com.prm393.floodrescue.features.rescue.dto.CreateRescueOrderRequest;
import com.prm393.floodrescue.features.rescue.dto.RescueOfferResponse;
import com.prm393.floodrescue.features.rescue.dto.RescueOrderResponse;
import com.prm393.floodrescue.features.rescue.entity.OrderType;
import com.prm393.floodrescue.features.rescue.entity.RescueOffer;
import com.prm393.floodrescue.features.rescue.entity.RescueOfferStatus;
import com.prm393.floodrescue.features.rescue.entity.RescueOrder;
import com.prm393.floodrescue.features.rescue.entity.RescueOrderAudit;
import com.prm393.floodrescue.features.rescue.entity.RescueOrderStatus;
import com.prm393.floodrescue.features.rescue.entity.TransportStage;
import com.prm393.floodrescue.features.rescue.repository.RescueOfferRepository;
import com.prm393.floodrescue.features.rescue.repository.RescueOrderAuditRepository;
import com.prm393.floodrescue.features.rescue.repository.RescueOrderRepository;
import com.prm393.floodrescue.features.vehicle.dto.VehicleDto;
import com.prm393.floodrescue.features.vehicle.service.VehicleLookupService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class RescueDispatchService {

    private final RescueOrderRepository rescueOrderRepository;
    private final RescueOfferRepository rescueOfferRepository;
    private final RescueOrderAuditRepository auditRepository;
    private final MechanicStaffRepository mechanicRepository;
    private final GarageRepository garageRepository;
    private final ServiceItemRepository serviceItemRepository;
    private final VehicleLookupService vehicleLookupService;
    private final RescuePricingService pricingService;
    private final SimpMessagingTemplate messagingTemplate;
    private final com.prm393.floodrescue.features.auth.repository.UserRepository userRepository;
    private final MechanicEligibilityChecker eligibilityChecker;

    @Value("${app.rescue.offer-timeout-seconds:45}")
    private int offerTimeoutSeconds;

    @Value("${app.rescue.default-dispatch-radius-km:5.0}")
    private double defaultRadiusKm;

    @Value("${app.rescue.max-dispatch-radius-km:7.0}")
    private double maxRadiusKm;

    @Value("${app.rescue.heartbeat-valid-minutes:5}")
    private int heartbeatValidMinutes;

    private static final List<RescueOrderStatus> ACTIVE_ORDER_STATUSES = List.of(
            RescueOrderStatus.REQUESTED,
            RescueOrderStatus.DISPATCHED,
            RescueOrderStatus.ARRIVED,
            RescueOrderStatus.IN_PROGRESS
    );

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

    public static String computePayloadHash(CreateRescueOrderRequest request) {
        String payloadString = String.format("%d:%d:%d:%.6f:%.6f:%.6f:%.6f:%s:%s:%s:%s",
                request.getVehicleId(), request.getGarageId(), request.getServiceItemId(),
                request.getPickupLatitude(), request.getPickupLongitude(),
                request.getDropoffLatitude(), request.getDropoffLongitude(),
                request.getPickupAddress() != null ? request.getPickupAddress().trim() : "",
                request.getDropoffAddress() != null ? request.getDropoffAddress().trim() : "",
                request.getCustomerNotes() != null ? request.getCustomerNotes().trim() : "",
                request.getExpectedTotalAmount() != null ? request.getExpectedTotalAmount().toString() : "");
        try {
            java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(payloadString.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : digest) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            return String.valueOf(payloadString.hashCode());
        }
    }

    @Transactional
    public RescueOrderResponse createSingleCrossingOrder(User customer, CreateRescueOrderRequest request) {
        // 0. Khóa bản ghi khách hàng để tuần tự hóa các yêu cầu tạo đơn đồng thời từ cùng một người dùng (B02)
        userRepository.findByIdWithLock(customer.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Tài khoản người dùng không tồn tại!"));

        // Tính toán hash nội dung request để kiểm tra idempotent (bao gồm tọa độ, địa chỉ, ghi chú và giá)
        String payloadHash = computePayloadHash(request);

        // Idempotent retry: Nếu client gửi kèm clientRequestId đã tồn tại (B02)
        if (request.getClientRequestId() != null && !request.getClientRequestId().isBlank()) {
            Optional<RescueOrder> existingOpt = rescueOrderRepository
                    .findByCustomerIdAndClientRequestId(customer.getId(), request.getClientRequestId().trim());
            if (existingOpt.isPresent()) {
                RescueOrder existing = existingOpt.get();
                if (payloadHash.equals(existing.getRequestPayloadHash())) {
                    log.info("Idempotent replay: Trả về đơn hiện có cho clientRequestId: {}", request.getClientRequestId());
                    return mapToResponse(existing);
                } else {
                    throw new BadRequestException("CONFLICT: clientRequestId đã được sử dụng cho một yêu cầu có nội dung khác!");
                }
            }
        }

        // 1. Kiểm tra đơn active của khách (chống tạo trùng nhiều đơn cùng lúc)
        if (rescueOrderRepository.existsByCustomerIdAndStatusIn(customer.getId(), ACTIVE_ORDER_STATUSES)) {
            throw new BadRequestException("Bạn đang có một yêu cầu cứu hộ đang được xử lý, không thể tạo thêm!");
        }

        // 2. Xác minh xe máy thuộc quyền sở hữu của khách từ JWT
        VehicleDto vehicle = vehicleLookupService.getVehicleByIdAndCustomer(request.getVehicleId(), customer.getId())
                .orElseThrow(() -> new BadRequestException("Xe máy được chọn không thuộc quyền sở hữu của bạn!"));

        // 3. Xác minh Gara và Dịch vụ niêm yết
        Garage garage = garageRepository.findById(request.getGarageId())
                .orElseThrow(() -> new ResourceNotFoundException("Gara không tồn tại với id: " + request.getGarageId()));
        if (garage.getStatus() != GarageStatus.APPROVED) {
            throw new BadRequestException("Gara chưa được phê duyệt hoạt động!");
        }

        ServiceItem serviceItem = serviceItemRepository.findById(request.getServiceItemId())
                .orElseThrow(() -> new ResourceNotFoundException("Dịch vụ không tồn tại: " + request.getServiceItemId()));
        if (!serviceItem.getGarage().getId().equals(garage.getId())) {
            throw new BadRequestException("Dịch vụ không thuộc gara đã chọn!");
        }
        if (!serviceItem.isActive() || serviceItem.getServiceType() != ServiceType.CROSSING) {
            throw new BadRequestException("Dịch vụ chở xe vượt ngập hiện không hoạt động!");
        }

        // 4. Lấy snapshot giá từ database (không tin cậy giá client)
        BigDecimal serviceBasePrice = serviceItem.getStandardPrice();
        BigDecimal bookingFee = pricingService.getBookingFee();
        BigDecimal totalAmount = serviceBasePrice.add(bookingFee);

        // C01: Kiểm tra snapshot giá client đã xác nhận. Nếu giá thay đổi, bắt xác nhận lại
        if (request.getExpectedServiceBasePrice() != null
                && request.getExpectedServiceBasePrice().compareTo(serviceBasePrice) != 0) {
            throw new BadRequestException("PRICE_CHANGED: Mức giá dịch vụ đã thay đổi từ "
                    + request.getExpectedServiceBasePrice() + " sang " + serviceBasePrice + " VND. Vui lòng xác nhận lại giá mới!");
        }
        if (request.getExpectedBookingFee() != null
                && request.getExpectedBookingFee().compareTo(bookingFee) != 0) {
            throw new BadRequestException("PRICE_CHANGED: Phí đặt xe đã thay đổi. Vui lòng xác nhận lại giá mới!");
        }
        if (request.getExpectedTotalAmount() != null
                && request.getExpectedTotalAmount().compareTo(totalAmount) != 0) {
            throw new BadRequestException("PRICE_CHANGED: Tổng số tiền cứu hộ đã thay đổi từ "
                    + request.getExpectedTotalAmount() + " sang " + totalAmount + " VND. Vui lòng xác nhận lại giá mới!");
        }

        // C01: Kiểm tra giới hạn quãng đường chở xe vượt ngập
        double crossingDistanceMeters = GeoDistanceUtils.calculateDistanceMeters(
                request.getPickupLatitude(), request.getPickupLongitude(),
                request.getDropoffLatitude(), request.getDropoffLongitude()
        );
        if (crossingDistanceMeters > 30000.0) {
            throw new BadRequestException("Quãng đường chở xe vượt ngập quá xa ("
                    + Math.round(crossingDistanceMeters / 1000.0) + " km), vượt quá giới hạn phục vụ 30 km của dịch vụ đơn lẻ!");
        }

        // 5. Sinh mã đơn hàng
        String orderCode = "SOS-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyMMdd"))
                + "-" + UUID.randomUUID().toString().substring(0, 4).toUpperCase();

        RescueOrder order = RescueOrder.builder()
                .orderCode(orderCode)
                .clientRequestId(request.getClientRequestId() != null ? request.getClientRequestId().trim() : null)
                .requestPayloadHash(payloadHash)
                .customer(customer)
                .garage(garage)
                .branch(null) // Sẽ gán theo chi nhánh của thợ nhận
                .serviceItem(serviceItem)
                .orderType(OrderType.SINGLE_CROSSING)
                .status(RescueOrderStatus.REQUESTED)
                .vehicleId(vehicle.getId())
                .vehiclePlate(vehicle.getLicensePlate())
                .vehicleModel(vehicle.getBrand() + " " + vehicle.getModel())
                .vehicleType(vehicle.getVehicleType())
                .pickupAddress(request.getPickupAddress())
                .pickupLatitude(request.getPickupLatitude())
                .pickupLongitude(request.getPickupLongitude())
                .dropoffAddress(request.getDropoffAddress())
                .dropoffLatitude(request.getDropoffLatitude())
                .dropoffLongitude(request.getDropoffLongitude())
                .serviceBasePrice(serviceBasePrice)
                .bookingFee(bookingFee)
                .totalAmount(totalAmount)
                .currency("VND")
                .waterLevel(request.getWaterLevel() != null ? request.getWaterLevel() : "Ngang lốc máy")
                .customerNotes(request.getCustomerNotes())
                .transportStage(TransportStage.NONE)
                .requestedAt(LocalDateTime.now())
                .build();

        order = rescueOrderRepository.save(order);
        recordAudit(order.getId(), null, RescueOrderStatus.REQUESTED, customer.getId(), customer.getUsername(), "Khách hàng gửi yêu cầu SOS");

        // 6. Tìm kiếm ứng viên điều phối thuộc Gara đã chọn
        dispatchNextCandidate(order);

        return mapToResponse(order);
    }

    /**
     * Tìm ứng viên tiếp theo trong Gara và tạo offer
     */
    @Transactional
    public void dispatchNextCandidate(RescueOrder order) {
        // Đảm bảo tối đa một offer PENDING cho mỗi đơn
        if (rescueOfferRepository.existsByRescueOrderIdAndStatus(order.getId(), RescueOfferStatus.PENDING)) {
            log.info("Order {} already has an active PENDING offer. Skipping new candidate dispatch.", order.getOrderCode());
            return;
        }

        // Lấy danh sách ID các thợ đã từng được offer cho đơn này
        List<Long> offeredMechanicIds = rescueOfferRepository.findByRescueOrderIdOrderByCreatedAtAsc(order.getId())
                .stream()
                .map(o -> o.getMechanicStaff().getId())
                .toList();

        double pickupLat = order.getPickupLatitude();
        double pickupLng = order.getPickupLongitude();
        LocalDateTime heartbeatThreshold = LocalDateTime.now().minusMinutes(heartbeatValidMinutes);

        // Lọc ứng viên theo bộ tiêu chuẩn chuẩn hóa B01: gara APPROVED, chi nhánh OPEN, AVAILABLE, hasCrossingCapability, GPS thực hợp lệ & đủ mới
        List<CandidateWithDistance> candidates = mechanicRepository.findByGarageIdOrderByCreatedAtDesc(order.getGarage().getId())
                .stream()
                .filter(m -> !offeredMechanicIds.contains(m.getId()))
                .filter(m -> eligibilityChecker.isMechanicEligibleForCrossing(m, heartbeatThreshold))
                .map(m -> {
                    // Dùng tọa độ GPS thật của thợ, KHÔNG fallback về chi nhánh hay điểm đón khách (B01)
                    double distance = GeoDistanceUtils.calculateDistanceMeters(
                            pickupLat, pickupLng, m.getCurrentLatitude(), m.getCurrentLongitude()
                    );
                    return new CandidateWithDistance(m, distance);
                })
                .sorted(Comparator.comparingDouble(c -> c.distanceMeters))
                .toList();

        // Chiến lược tìm kiếm: Ưu tiên trong bán kính mặc định 5 km; nếu không có thợ thì mở rộng tối đa 7 km (B01)
        List<CandidateWithDistance> eligibleCandidates = candidates.stream()
                .filter(c -> c.distanceMeters <= defaultRadiusKm * 1000.0)
                .toList();

        if (eligibleCandidates.isEmpty()) {
            eligibleCandidates = candidates.stream()
                    .filter(c -> c.distanceMeters <= maxRadiusKm * 1000.0)
                    .toList();
        }

        if (eligibleCandidates.isEmpty()) {
            log.info("No candidates available for order: {}. Dispatch marked as failed.", order.getOrderCode());
            order.setStatus(RescueOrderStatus.DISPATCH_FAILED);
            order.setCancelReason("Không tìm thấy thợ khả dụng thuộc gara trong bán kính phục vụ (tối đa " + (int) maxRadiusKm + " km).");
            rescueOrderRepository.save(order);
            recordAudit(order.getId(), RescueOrderStatus.REQUESTED, RescueOrderStatus.DISPATCH_FAILED, null, "SYSTEM", "Hết ứng viên điều phối");
            broadcastOrderUpdate(order);
            return;
        }

        // Chọn ứng viên gần nhất
        CandidateWithDistance selected = eligibleCandidates.get(0);
        LocalDateTime now = LocalDateTime.now();
        RescueOffer offer = RescueOffer.builder()
                .rescueOrder(order)
                .mechanicStaff(selected.mechanic)
                .distanceMeters(selected.distanceMeters)
                .status(RescueOfferStatus.PENDING)
                .offeredAt(now)
                .expiresAt(now.plusSeconds(offerTimeoutSeconds))
                .build();

        offer = rescueOfferRepository.save(offer);
        order.setUpdatedAt(now);
        rescueOrderRepository.save(order);
        log.info("Sent offer id: {} to mechanic staff id: {} for order: {}", offer.getId(), selected.mechanic.getId(), order.getOrderCode());

        // Bắn WebSocket thông báo offer cho thợ SAU KHI commit transaction
        RescueOfferResponse offerResponse = mapToOfferResponse(offer);
        Long mechanicStaffId = selected.mechanic.getId();
        executeAfterCommit(() -> {
            try {
                messagingTemplate.convertAndSend("/topic/mechanics/" + mechanicStaffId + "/offers", offerResponse);
            } catch (Exception e) {
                log.warn("Failed to broadcast offer to mechanic websocket: {}", e.getMessage());
            }
        });
    }

    /**
     * Thợ chấp nhận offer điều phối (Atomically nhận đơn & đổi trạng thái sang BUSY)
     * Thứ tự khóa toàn cục: RescueOrder -> RescueOffer -> MechanicStaff
     */
    @Transactional
    public RescueOrderResponse acceptOffer(User mechanicUser, Long offerId) {
        RescueOffer initialOffer = rescueOfferRepository.findById(offerId)
                .or(() -> rescueOfferRepository.findByIdWithLock(offerId))
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy offer: " + offerId));
        Long orderId = initialOffer.getRescueOrder().getId();

        // 1. Khóa bi quan RescueOrder trước
        RescueOrder order = rescueOrderRepository.findByIdWithLock(orderId)
                .or(() -> rescueOrderRepository.findById(orderId))
                .orElseThrow(() -> new ResourceNotFoundException("Đơn cứu hộ không tồn tại!"));

        // 2. Khóa bi quan RescueOffer
        RescueOffer offer = rescueOfferRepository.findByIdWithLock(offerId)
                .or(() -> rescueOfferRepository.findById(offerId))
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy offer: " + offerId));

        // 3. Khóa bi quan MechanicStaff
        MechanicStaff staff = mechanicRepository.findByUserIdWithLock(mechanicUser.getId())
                .or(() -> mechanicRepository.findByUserId(mechanicUser.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Chưa có hồ sơ thợ cho tài khoản này!"));

        if (!offer.getMechanicStaff().getId().equals(staff.getId())) {
            throw new BadRequestException("Offer này không dành cho bạn!");
        }

        // Idempotency: Nếu thợ này đã nhận thành công trước đó (retry do rớt mạng)
        if (offer.getStatus() == RescueOfferStatus.ACCEPTED
                && order.getStatus() == RescueOrderStatus.DISPATCHED
                && order.getMechanicStaff() != null
                && order.getMechanicStaff().getId().equals(staff.getId())) {
            log.info("Idempotent accept: Thợ {} đã nhận đơn {} trước đó, trả về kết quả hiện tại",
                    mechanicUser.getUsername(), order.getOrderCode());
            return mapToResponse(order);
        }

        if (offer.getStatus() != RescueOfferStatus.PENDING) {
            throw new BadRequestException("Offer đã kết thúc hoặc không còn hiệu lực!");
        }

        if (offer.getExpiresAt().isBefore(LocalDateTime.now())) {
            offer.setStatus(RescueOfferStatus.EXPIRED);
            rescueOfferRepository.save(offer);
            throw new BadRequestException("Offer đã hết thời hạn 45 giây phản hồi!");
        }

        if (order.getStatus() != RescueOrderStatus.REQUESTED) {
            throw new BadRequestException("Đơn cứu hộ đã được tiếp nhận hoặc đã bị hủy!");
        }

        // B01: Kiểm tra lại toàn diện tiêu chí thợ đủ điều kiện tại thời điểm accept
        LocalDateTime heartbeatThreshold = LocalDateTime.now().minusMinutes(heartbeatValidMinutes);
        if (!eligibilityChecker.isMechanicEligibleForCrossing(staff, heartbeatThreshold)) {
            throw new BadRequestException("Bạn không còn đủ điều kiện nhận đơn (trạng thái làm việc, GPS hoặc heartbeat đã thay đổi)!");
        }

        // Kiểm tra thợ có đang vướng đơn active nào khác không
        if (rescueOrderRepository.existsByMechanicStaffIdAndStatusIn(staff.getId(), ACTIVE_ORDER_STATUSES)) {
            throw new BadRequestException("Bạn đang có một đơn cứu hộ khác đang thực hiện, không thể nhận thêm!");
        }

        LocalDateTime now = LocalDateTime.now();

        // 1. Chấp nhận offer
        offer.setStatus(RescueOfferStatus.ACCEPTED);
        offer.setRespondedAt(now);
        rescueOfferRepository.save(offer);

        // 2. Hủy các offer pending khác của đơn này
        List<RescueOffer> otherOffers = rescueOfferRepository.findByRescueOrderIdOrderByCreatedAtAsc(order.getId());
        for (RescueOffer o : otherOffers) {
            if (!o.getId().equals(offer.getId()) && o.getStatus() == RescueOfferStatus.PENDING) {
                o.setStatus(RescueOfferStatus.CANCELLED);
                rescueOfferRepository.save(o);
            }
        }

        // 3. Cập nhật đơn cứu hộ sang DISPATCHED
        order.setStatus(RescueOrderStatus.DISPATCHED);
        order.setMechanicStaff(staff);
        order.setBranch(staff.getBranch());
        order.setAcceptedAt(now);
        order = rescueOrderRepository.save(order);

        // 4. Cập nhật trạng thái thợ sang BUSY trong cùng giao dịch
        staff.setWorkingStatus(MechanicStatus.BUSY);
        staff.setLastHeartbeatAt(now);
        mechanicRepository.save(staff);

        recordAudit(order.getId(), RescueOrderStatus.REQUESTED, RescueOrderStatus.DISPATCHED, mechanicUser.getId(), mechanicUser.getUsername(), "Thợ chấp nhận cuốc cứu hộ");

        log.info("Mechanic {} accepted order {}", mechanicUser.getUsername(), order.getOrderCode());
        broadcastOrderUpdate(order);

        return mapToResponse(order);
    }

    /**
     * Thợ từ chối offer -> chuyển sang ứng viên kế tiếp
     * Thứ tự khóa toàn cục: RescueOrder -> RescueOffer -> MechanicStaff
     */
    @Transactional
    public void rejectOffer(User mechanicUser, Long offerId, String reason) {
        RescueOffer initialOffer = rescueOfferRepository.findById(offerId)
                .or(() -> rescueOfferRepository.findByIdWithLock(offerId))
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy offer: " + offerId));
        Long orderId = initialOffer.getRescueOrder().getId();

        // 1. Khóa bi quan RescueOrder trước
        RescueOrder order = rescueOrderRepository.findByIdWithLock(orderId)
                .or(() -> rescueOrderRepository.findById(orderId))
                .orElseThrow(() -> new ResourceNotFoundException("Đơn cứu hộ không tồn tại!"));

        // 2. Khóa bi quan RescueOffer
        RescueOffer offer = rescueOfferRepository.findByIdWithLock(offerId)
                .or(() -> rescueOfferRepository.findById(offerId))
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy offer: " + offerId));

        // 3. Khóa bi quan MechanicStaff
        MechanicStaff staff = mechanicRepository.findByUserIdWithLock(mechanicUser.getId())
                .or(() -> mechanicRepository.findByUserId(mechanicUser.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Chưa có hồ sơ thợ!"));

        if (!offer.getMechanicStaff().getId().equals(staff.getId())) {
            throw new BadRequestException("Offer này không dành cho bạn!");
        }

        if (offer.getStatus() == RescueOfferStatus.PENDING) {
            offer.setStatus(RescueOfferStatus.REJECTED);
            offer.setRespondedAt(LocalDateTime.now());
            offer.setResponseNote(reason);
            rescueOfferRepository.save(offer);
            log.info("Mechanic {} rejected offer {}", mechanicUser.getUsername(), offerId);

            // Chuyển cho ứng viên tiếp theo nếu đơn vẫn đang tìm thợ
            if (order.getStatus() == RescueOrderStatus.REQUESTED) {
                dispatchNextCandidate(order);
            }
        }
    }

    /**
     * Xử lý hết hạn offer tự động từ Worker (B03)
     * Thứ tự khóa toàn cục: RescueOrder -> RescueOffer
     */
    @Transactional
    public void handleOfferTimeout(Long offerId) {
        RescueOffer initialOffer = rescueOfferRepository.findById(offerId)
                .or(() -> rescueOfferRepository.findByIdWithLock(offerId))
                .orElse(null);
        if (initialOffer == null || initialOffer.getStatus() != RescueOfferStatus.PENDING) {
            return;
        }

        Long orderId = initialOffer.getRescueOrder().getId();

        // 1. Khóa bi quan RescueOrder trước
        RescueOrder order = rescueOrderRepository.findByIdWithLock(orderId)
                .or(() -> rescueOrderRepository.findById(orderId))
                .orElse(null);
        if (order == null || order.getStatus() != RescueOrderStatus.REQUESTED) {
            return;
        }

        // 2. Khóa bi quan RescueOffer
        RescueOffer offer = rescueOfferRepository.findByIdWithLock(offerId)
                .or(() -> rescueOfferRepository.findById(offerId))
                .orElse(null);
        if (offer == null || offer.getStatus() != RescueOfferStatus.PENDING) {
            return;
        }

        if (offer.getExpiresAt().isAfter(LocalDateTime.now())) {
            return;
        }

        offer.setStatus(RescueOfferStatus.EXPIRED);
        offer.setRespondedAt(LocalDateTime.now());
        offer.setResponseNote("Offer hết hạn 45 giây không phản hồi (Server timeout)");
        rescueOfferRepository.save(offer);

        log.info("Offer {} for order {} expired. Dispatching next candidate.", offerId, order.getOrderCode());
        recordAudit(order.getId(), RescueOrderStatus.REQUESTED, RescueOrderStatus.REQUESTED,
                null, "SYSTEM", "Offer thợ " + offer.getMechanicStaff().getUser().getUsername() + " hết hạn 45s. Chuyển ứng viên tiếp theo.");
        dispatchNextCandidate(order);
    }

    /**
     * Khách hàng hủy đơn cứu hộ
     */
    @Transactional
    public RescueOrderResponse cancelOrder(User customer, Long orderId, CancelOrderRequest request) {
        RescueOrder order = rescueOrderRepository.findByIdWithLock(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn: " + orderId));

        if (!order.getCustomer().getId().equals(customer.getId())) {
            throw new BadRequestException("Đơn cứu hộ không thuộc về tài khoản của bạn!");
        }

        if (order.getStatus() != RescueOrderStatus.REQUESTED) {
            throw new BadRequestException("Thợ đã nhận cuốc và đang trên đường di chuyển. Không thể hủy tự do, vui lòng liên hệ hotline "
                    + pricingService.getHotline() + " để được hỗ trợ!");
        }

        order.setStatus(RescueOrderStatus.CANCELLED);
        order.setCancelledAt(LocalDateTime.now());
        order.setCancelReason(request != null && request.getReason() != null ? request.getReason() : "Khách hàng yêu cầu hủy");
        if (order.getMechanicStaff() != null) {
            order.setFinalMechanicLatitude(order.getMechanicStaff().getCurrentLatitude());
            order.setFinalMechanicLongitude(order.getMechanicStaff().getCurrentLongitude());
        }
        order = rescueOrderRepository.save(order);

        // Hủy offer PENDING
        List<RescueOffer> offers = rescueOfferRepository.findByRescueOrderIdOrderByCreatedAtAsc(order.getId());
        for (RescueOffer o : offers) {
            if (o.getStatus() == RescueOfferStatus.PENDING) {
                o.setStatus(RescueOfferStatus.CANCELLED);
                rescueOfferRepository.save(o);
            }
        }

        recordAudit(order.getId(), RescueOrderStatus.REQUESTED, RescueOrderStatus.CANCELLED, customer.getId(), customer.getUsername(), "Khách hàng hủy đơn");
        broadcastOrderUpdate(order);

        return mapToResponse(order);
    }

    /**
     * Lấy offer đang chờ của thợ (Chỉ đọc thuần túy, không dispatch tranh chấp)
     */
    @Transactional(readOnly = true)
    public List<RescueOfferResponse> getPendingOffersForMechanic(User mechanicUser) {
        MechanicStaff staff = mechanicRepository.findByUserId(mechanicUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Chưa có hồ sơ thợ!"));

        LocalDateTime now = LocalDateTime.now();
        List<RescueOffer> offers = rescueOfferRepository.findByMechanicStaffIdAndStatusOrderByOfferedAtDesc(
                staff.getId(), RescueOfferStatus.PENDING);

        return offers.stream()
                .filter(o -> o.getExpiresAt().isAfter(now))
                .map(this::mapToOfferResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public RescueOrderResponse getActiveOrderByUser(User user) {
        RescueOrder order = null;
        if (user.getRole() == com.prm393.floodrescue.features.auth.entity.Role.CUSTOMER) {
            order = rescueOrderRepository.findFirstByCustomerIdAndStatusInOrderByCreatedAtDesc(
                    user.getId(), List.of(
                            RescueOrderStatus.REQUESTED,
                            RescueOrderStatus.DISPATCHED,
                            RescueOrderStatus.ARRIVED,
                            RescueOrderStatus.IN_PROGRESS,
                            RescueOrderStatus.PAYMENT_PENDING
                    )).orElse(null);
        } else if (user.getRole() == com.prm393.floodrescue.features.auth.entity.Role.FIELD_MECHANIC) {
            MechanicStaff staff = mechanicRepository.findByUserId(user.getId()).orElse(null);
            if (staff != null) {
                // PAYMENT_PENDING khong con chiem tho; tho da duoc giai phong ve AVAILABLE
                order = rescueOrderRepository.findFirstByMechanicStaffIdAndStatusInOrderByCreatedAtDesc(
                        staff.getId(), List.of(
                                RescueOrderStatus.DISPATCHED,
                                RescueOrderStatus.ARRIVED,
                                RescueOrderStatus.IN_PROGRESS
                        )).orElse(null);
            }
        }
        return order != null ? mapToResponse(order) : null;
    }

    public void validateOrderAccess(User user, RescueOrder order) {
        if (user.getRole() == Role.ADMIN || user.getRole() == Role.STAFF) {
            return;
        }
        if (user.getRole() == Role.CUSTOMER && order.getCustomer().getId().equals(user.getId())) {
            return;
        }
        if (user.getRole() == Role.FIELD_MECHANIC) {
            // Thợ chính thức được phân công cho đơn
            if (order.getMechanicStaff() != null && order.getMechanicStaff().getUser().getId().equals(user.getId())) {
                return;
            }
            // Thợ chưa nhận đơn nhưng đang có offer PENDING CÒN HIỆU LỰC cho đơn đang REQUESTED
            if (order.getMechanicStaff() == null && order.getStatus() == RescueOrderStatus.REQUESTED) {
                boolean hasActiveOffer = rescueOfferRepository
                        .existsByRescueOrderIdAndMechanicStaffUserIdAndStatusAndExpiresAtAfter(
                                order.getId(), user.getId(), RescueOfferStatus.PENDING, LocalDateTime.now());
                if (hasActiveOffer) {
                    return;
                }
            }
        }
        if (user.getRole() == Role.GARAGE_OWNER && order.getGarage() != null && order.getGarage().getOwner() != null
                && order.getGarage().getOwner().getId().equals(user.getId())) {
            return;
        }
        throw new org.springframework.security.access.AccessDeniedException("Bạn không có quyền truy cập thông tin đơn cứu hộ này!");
    }

    @Transactional(readOnly = true)
    public RescueOrderResponse getOrderById(User user, Long orderId) {
        RescueOrder order = rescueOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn: " + orderId));
        validateOrderAccess(user, order);
        return mapToResponse(order);
    }

    @Transactional(readOnly = true)
    public List<RescueOrderResponse> getHistory(User user) {
        List<RescueOrder> orders;
        if (user.getRole() == Role.CUSTOMER) {
            orders = rescueOrderRepository.findByCustomerIdOrderByCreatedAtDesc(user.getId());
        } else if (user.getRole() == Role.FIELD_MECHANIC) {
            MechanicStaff staff = mechanicRepository.findByUserId(user.getId()).orElse(null);
            orders = staff != null ? rescueOrderRepository.findByMechanicStaffIdOrderByCreatedAtDesc(staff.getId()) : List.of();
        } else {
            orders = List.of();
        }
        return orders.stream().map(this::mapToResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<RescueOrderResponse> getStaffOrders(User staffUser) {
        if (staffUser.getRole() != Role.STAFF && staffUser.getRole() != Role.ADMIN) {
            throw new org.springframework.security.access.AccessDeniedException("Chỉ STAFF hoặc ADMIN mới có quyền giám sát đơn!");
        }
        List<RescueOrder> orders = rescueOrderRepository.findAllByOrderByCreatedAtDesc();
        return orders.stream().map(this::mapToResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<RescueOrderResponse> getGarageOrders(User owner) {
        if (owner.getRole() != Role.GARAGE_OWNER) {
            throw new org.springframework.security.access.AccessDeniedException("Chỉ chủ gara mới có quyền xem đơn của gara!");
        }
        Garage garage = garageRepository.findByOwnerId(owner.getId()).orElse(null);
        List<RescueOrder> orders = garage != null
                ? rescueOrderRepository.findByGarageIdOrderByCreatedAtDesc(garage.getId())
                : List.of();
        return orders.stream().map(this::mapToResponse).toList();
    }

    public void recordAudit(Long orderId, RescueOrderStatus from, RescueOrderStatus to, Long userId, String username, String note) {
        RescueOrderAudit audit = RescueOrderAudit.builder()
                .orderId(orderId)
                .fromStatus(from)
                .toStatus(to)
                .changedByUserId(userId)
                .changedByUsername(username)
                .actionNote(note)
                .build();
        auditRepository.save(audit);
    }

    public void broadcastOrderUpdate(RescueOrder order) {
        RescueOrderResponse response = mapToResponse(order);
        executeAfterCommit(() -> {
            try {
                messagingTemplate.convertAndSend("/topic/orders/" + order.getId() + "/tracking", response);
            } catch (Exception e) {
                log.warn("Failed to broadcast order update: {}", e.getMessage());
            }
        });
    }

    public RescueOrderResponse mapToResponse(RescueOrder o) {
        User cust = o.getCustomer();
        MechanicStaff mech = o.getMechanicStaff();

        boolean isTrackingActive = o.getStatus() == RescueOrderStatus.DISPATCHED
                || o.getStatus() == RescueOrderStatus.ARRIVED
                || o.getStatus() == RescueOrderStatus.IN_PROGRESS;

        Double mechLat = isTrackingActive
                ? (mech != null ? mech.getCurrentLatitude() : null)
                : o.getFinalMechanicLatitude();
        Double mechLng = isTrackingActive
                ? (mech != null ? mech.getCurrentLongitude() : null)
                : o.getFinalMechanicLongitude();

        return RescueOrderResponse.builder()
                .id(o.getId())
                .orderCode(o.getOrderCode())
                .orderType(o.getOrderType())
                .status(o.getStatus())
                .customerId(cust.getId())
                .customerName(cust.getFullName())
                .customerPhone(cust.getPhone())
                .customerAvatar(cust.getAvatarUrl())
                .mechanicStaffId(mech != null ? mech.getId() : null)
                .mechanicUserId(mech != null ? mech.getUser().getId() : null)
                .mechanicName(mech != null ? mech.getUser().getFullName() : null)
                .mechanicPhone(mech != null ? mech.getUser().getPhone() : null)
                .mechanicAvatar(mech != null ? mech.getUser().getAvatarUrl() : null)
                .mechanicRating(mech != null ? mech.getRatingAvg() : null)
                .mechanicSpeciality(mech != null ? mech.getSpeciality() : null)
                .mechanicCurrentLatitude(mechLat)
                .mechanicCurrentLongitude(mechLng)
                .garageId(o.getGarage() != null ? o.getGarage().getId() : null)
                .garageName(o.getGarage() != null ? o.getGarage().getGarageName() : null)
                .garagePhone(o.getGarage() != null ? o.getGarage().getPhone() : null)
                .branchId(o.getBranch() != null ? o.getBranch().getId() : null)
                .branchName(o.getBranch() != null ? o.getBranch().getBranchName() : null)
                .branchAddress(o.getBranch() != null ? o.getBranch().getAddress() : null)
                .serviceItemId(o.getServiceItem() != null ? o.getServiceItem().getId() : null)
                .serviceName(o.getServiceItem() != null ? o.getServiceItem().getServiceName() : null)
                .vehicleId(o.getVehicleId())
                .vehiclePlate(o.getVehiclePlate())
                .vehicleModel(o.getVehicleModel())
                .vehicleType(o.getVehicleType())
                .pickupAddress(o.getPickupAddress())
                .pickupLatitude(o.getPickupLatitude())
                .pickupLongitude(o.getPickupLongitude())
                .dropoffAddress(o.getDropoffAddress())
                .dropoffLatitude(o.getDropoffLatitude())
                .dropoffLongitude(o.getDropoffLongitude())
                .serviceBasePrice(o.getServiceBasePrice())
                .bookingFee(o.getBookingFee())
                .totalAmount(o.getTotalAmount())
                .currency(o.getCurrency())
                .waterLevel(o.getWaterLevel())
                .customerNotes(o.getCustomerNotes())
                .transportStage(o.getTransportStage())
                .transportNote(o.getTransportNote())
                .completionPhotoUrl(o.getCompletionPhotoUrl())
                .handoverPhotoUrl(o.getHandoverPhotoUrl())
                .completionNotes(o.getCompletionNotes())
                .requestedAt(o.getRequestedAt())
                .acceptedAt(o.getAcceptedAt())
                .arrivedAt(o.getArrivedAt())
                .serviceStartedAt(o.getServiceStartedAt())
                .serviceCompletedAt(o.getServiceCompletedAt())
                .cancelledAt(o.getCancelledAt())
                .cancelReason(o.getCancelReason())
                .paidAt(o.getPaidAt())
                .paymentMethod(o.getPaymentMethod())
                .paymentTransactionId(o.getPaymentTransactionId())
                .paymentOrderCode(o.getPaymentOrderCode())
                .supportHotline(pricingService.getHotline())
                .build();
    }

    public RescueOfferResponse mapToOfferResponse(RescueOffer offer) {
        RescueOrder o = offer.getRescueOrder();
        long secondsRemaining = Math.max(0, Duration.between(LocalDateTime.now(), offer.getExpiresAt()).getSeconds());
        return RescueOfferResponse.builder()
                .offerId(offer.getId())
                .orderId(o.getId())
                .orderCode(o.getOrderCode())
                .orderType(o.getOrderType())
                .status(offer.getStatus())
                .customerName(o.getCustomer().getFullName())
                .customerPhone(o.getCustomer().getPhone())
                .customerAvatar(o.getCustomer().getAvatarUrl())
                .vehiclePlate(o.getVehiclePlate())
                .vehicleModel(o.getVehicleModel())
                .vehicleType(o.getVehicleType())
                .waterLevel(o.getWaterLevel())
                .pickupAddress(o.getPickupAddress())
                .pickupLatitude(o.getPickupLatitude())
                .pickupLongitude(o.getPickupLongitude())
                .dropoffAddress(o.getDropoffAddress())
                .dropoffLatitude(o.getDropoffLatitude())
                .dropoffLongitude(o.getDropoffLongitude())
                .totalAmount(o.getTotalAmount())
                .distanceMeters(offer.getDistanceMeters() != null ? offer.getDistanceMeters() : 0.0)
                .offeredAt(offer.getOfferedAt())
                .expiresAt(offer.getExpiresAt())
                .secondsRemaining(secondsRemaining)
                .build();
    }

    private record CandidateWithDistance(MechanicStaff mechanic, double distanceMeters) {}
}
