package com.prm393.floodrescue.features.batchtransport.service.impl;

import com.prm393.floodrescue.common.exception.BadRequestException;
import com.prm393.floodrescue.common.exception.ResourceNotFoundException;
import com.prm393.floodrescue.features.auth.entity.Role;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.batchtransport.dto.BatchTripResponse;
import com.prm393.floodrescue.features.batchtransport.dto.CreateBatchTripRequest;
import com.prm393.floodrescue.features.batchtransport.dto.JoinBatchTripRequest;
import com.prm393.floodrescue.features.batchtransport.dto.JoinBatchTripResponse;
import com.prm393.floodrescue.features.batchtransport.entity.BatchTrip;
import com.prm393.floodrescue.features.batchtransport.entity.BatchTripStatus;
import com.prm393.floodrescue.features.batchtransport.repository.BatchTripRepository;
import com.prm393.floodrescue.features.batchtransport.service.BatchTripService;
import com.prm393.floodrescue.common.contracts.dto.GarageOwnerContextSnapshot;
import com.prm393.floodrescue.common.contracts.dto.MechanicContextSnapshot;
import com.prm393.floodrescue.common.contracts.dto.OrderSnapshot;
import com.prm393.floodrescue.common.contracts.service.GarageCatalogLookup;
import com.prm393.floodrescue.common.contracts.service.RescueOrderCommands;
import com.prm393.floodrescue.common.contracts.service.RescueOrderLookup;
import com.prm393.floodrescue.features.rescue.entity.OrderType;
import com.prm393.floodrescue.features.rescue.service.RescueDispatchService;
import com.prm393.floodrescue.features.garage.entity.ServiceType;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class BatchTripServiceImpl implements BatchTripService {
    private static final int GATHERING_MINUTES = 10;
    private static final Set<String> BATCH_RESCUE_TYPES = Set.of(
            "BATCH_CROSSING", "GROUP_CROSSING", "CROSS_FLOODED_AREA");
    private static final Set<String> JOINABLE_ORDER_STATUSES = Set.of(
            "REQUESTED", "WAITING_BATCH", "SEARCHING");

    private final BatchTripRepository batchTripRepository;
    private final GarageCatalogLookup garageCatalog;
    private final RescueOrderLookup orderLookup;
    private final RescueOrderCommands orderCommands;
    private final RescueDispatchService rescueDispatchService;

    @Transactional
    @Override
    public BatchTripResponse create(User mechanicUser, CreateBatchTripRequest request) {
        MechanicContextSnapshot mechanic = mechanicForCreation(mechanicUser, request.getMechanicId());
        if (garageCatalog.getActiveServices(mechanic.getGarageId()).stream()
                .noneMatch(service -> service.getServiceType() == ServiceType.CROSSING)) {
            throw new BadRequestException("Garage chưa cấu hình dịch vụ chở xe vượt ngập");
        }
        double routeDistanceKm = distanceKm(
                request.getPickupLatitude(), request.getPickupLongitude(),
                request.getDestinationLatitude(), request.getDestinationLongitude());
        if (routeDistanceKm < 0.1) {
            throw new BadRequestException("Điểm tập kết và điểm trả phải cách nhau ít nhất 100 m");
        }
        if (routeDistanceKm > 30.0) {
            throw new BadRequestException("Tuyến gom vượt quá giới hạn phục vụ 30 km");
        }
        if (batchTripRepository.existsByMechanicIdAndStatusIn(
                mechanic.getMechanicStaffId(),
                List.of(BatchTripStatus.GATHERING, BatchTripStatus.READY,
                        BatchTripStatus.PICKING_UP, BatchTripStatus.MOVING))) {
            throw new BadRequestException("Thợ đang phụ trách một chuyến gom chưa hoàn tất");
        }
        LocalDateTime now = LocalDateTime.now();
        BatchTrip trip = BatchTrip.builder()
                .mechanicId(mechanic.getMechanicStaffId())
                .branchId(mechanic.getBranchId())
                .capacity(request.getCapacity())
                .currentVehicleCount(0)
                .pickupPlace(request.getPickupPlace().trim())
                .destinationPlace(request.getDestinationPlace().trim())
                .discountedPricePerVehicle(request.getDiscountedPricePerVehicle())
                .status(BatchTripStatus.GATHERING)
                .departureTime(now.plusMinutes(GATHERING_MINUTES))
                .pickupLatitude(request.getPickupLatitude())
                .pickupLongitude(request.getPickupLongitude())
                .destinationLatitude(request.getDestinationLatitude())
                .destinationLongitude(request.getDestinationLongitude())
                .build();
        return toResponse(batchTripRepository.save(trip), null);
    }

    @Transactional
    @Override
    public List<BatchTripResponse> nearby(double latitude, double longitude, double radiusKm,
                                          Long garageId, Double destinationLatitude,
                                          Double destinationLongitude) {
        if (radiusKm <= 0 || radiusKm > 30) throw new BadRequestException("Bán kính tìm kiếm phải từ 0 đến 30 km");
        LocalDateTime now = LocalDateTime.now();
        return batchTripRepository.findByStatusInOrderByDepartureTimeAsc(
                        List.of(BatchTripStatus.GATHERING, BatchTripStatus.READY)).stream()
                .peek(t -> refreshGatheringStatus(t, now))
                .filter(t -> t.getStatus() == BatchTripStatus.GATHERING)
                .filter(t -> garageId == null || t.getBranch().getGarage().getId().equals(garageId))
                .map(t -> new TripDistance(t, distanceKm(latitude, longitude,
                        t.getPickupLatitude(), t.getPickupLongitude())))
                .filter(item -> item.distance <= radiusKm)
                .filter(item -> destinationLatitude == null || destinationLongitude == null
                        || distanceKm(destinationLatitude, destinationLongitude,
                        item.trip.getDestinationLatitude(), item.trip.getDestinationLongitude()) <= 5.0)
                .sorted((a, b) -> Double.compare(a.distance, b.distance))
                .map(item -> toResponse(item.trip, item.distance))
                .toList();
    }

    @Transactional
    @Override
    public List<BatchTripResponse> mine(User mechanicUser) {
        LocalDateTime now = LocalDateTime.now();
        if (mechanicUser.getRole() == Role.GARAGE_OWNER) {
            GarageOwnerContextSnapshot owner = garageCatalog.getRequiredGarageOwnerContext(mechanicUser.getId());
            return batchTripRepository.findByMechanicIdInOrderByCreatedAtDesc(owner.getMechanicStaffIds())
                    .stream().peek(t -> refreshGatheringStatus(t, now)).map(t -> toResponse(t, null)).toList();
        }
        MechanicContextSnapshot mechanic = garageCatalog.getRequiredMechanicContext(mechanicUser.getId());
        return batchTripRepository.findByMechanicIdOrderByCreatedAtDesc(mechanic.getMechanicStaffId())
                .stream().peek(t -> refreshGatheringStatus(t, now)).map(t -> toResponse(t, null)).toList();
    }

    @Transactional
    @Override
    public List<BatchTripResponse> allForStaff() {
        LocalDateTime now = LocalDateTime.now();
        return batchTripRepository.findAll().stream().peek(t -> refreshGatheringStatus(t, now))
                .map(t -> toResponse(t, null)).toList();
    }

    @Transactional(readOnly = true)
    @Override
    public List<OrderSnapshot> orders(Long tripId, User user) {
        BatchTrip trip = requiredTrip(tripId);
        List<OrderSnapshot> orders = orderLookup.findByBatchTripId(tripId);
        boolean isAssignedMechanic = user.getRole() == Role.FIELD_MECHANIC
                && garageCatalog.getRequiredMechanicContext(user.getId()).getMechanicStaffId().equals(trip.getMechanicId());
        boolean isStaff = user.getRole() == Role.STAFF || user.getRole() == Role.ADMIN;
        boolean isOwner = user.getRole() == Role.GARAGE_OWNER
                && garageCatalog.getRequiredGarageOwnerContext(user.getId()).getMechanicStaffIds().contains(trip.getMechanicId());
        boolean isJoinedCustomer = orders.stream().anyMatch(o -> user.getId().equals(o.getCustomerUserId()));
        if (!isAssignedMechanic && !isStaff && !isOwner && !isJoinedCustomer) throw new AccessDeniedException("Không thuộc chuyến gom này");
        return orders;
    }

    @Transactional
    @Override
    public BatchTripResponse join(Long tripId, Long orderId, User customer) {
        BatchTrip trip = lockedTrip(tripId);
        refreshGatheringStatus(trip, LocalDateTime.now());
        if (trip.getStatus() != BatchTripStatus.GATHERING) throw new BadRequestException("Chuyến đã đóng nhận xe");
        if (trip.getCurrentVehicleCount() >= trip.getCapacity()) throw new BadRequestException("Chuyến đã đủ xe");

        OrderSnapshot order = orderLookup.getRequiredOrder(orderId);
        requireCustomer(order, customer);
        if (order.getBatchTripId() != null) throw new BadRequestException("Đơn đã tham gia một chuyến gom");
        if (order.getRescueType() == null || !BATCH_RESCUE_TYPES.contains(order.getRescueType().toUpperCase())) {
            throw new BadRequestException("Đơn không phải loại vượt điểm ngập theo nhóm");
        }
        if (order.getStatus() == null || !JOINABLE_ORDER_STATUSES.contains(order.getStatus().toUpperCase())) {
            throw new BadRequestException("Trạng thái đơn không cho phép tham gia chuyến gom");
        }
        if (order.getBranchId() != null && !trip.getBranchId().equals(order.getBranchId())) {
            throw new BadRequestException("Đơn đã được gán cho chi nhánh khác");
        }
        MechanicContextSnapshot tripMechanic = garageCatalog.getRequiredMechanicByStaffId(trip.getMechanicId());
        if (!order.getGarageId().equals(tripMechanic.getGarageId())) {
            throw new BadRequestException("Chuyến gom không thuộc garage khách hàng đã chọn");
        }
        orderCommands.attachBatchTrip(orderId, tripId, trip.getMechanicId(),
                trip.getBranchId(), trip.getDiscountedPricePerVehicle());
        trip.setCurrentVehicleCount(trip.getCurrentVehicleCount() + 1);
        if (trip.getCurrentVehicleCount() >= trip.getCapacity()) trip.setStatus(BatchTripStatus.READY);
        return toResponse(trip, null);
    }

    @Transactional
    @Override
    public JoinBatchTripResponse createOrderAndJoin(
            Long tripId, JoinBatchTripRequest request, User customer) {
        BatchTrip trip = lockedTrip(tripId);
        refreshGatheringStatus(trip, LocalDateTime.now());
        if (trip.getStatus() != BatchTripStatus.GATHERING) {
            throw new BadRequestException("Chuyến đã đóng nhận xe");
        }
        if (trip.getCurrentVehicleCount() >= trip.getCapacity()) {
            throw new BadRequestException("Chuyến đã đủ xe");
        }
        if (request.getExpectedBatchFare().compareTo(trip.getDiscountedPricePerVehicle()) != 0) {
            throw new BadRequestException("PRICE_CHANGED: Giá chuyến gom đã thay đổi, vui lòng xác nhận lại");
        }

        MechanicContextSnapshot tripMechanic = garageCatalog
                .getRequiredMechanicByStaffId(trip.getMechanicId());
        var orderRequest = request.getOrder();
        if (!tripMechanic.getGarageId().equals(orderRequest.getGarageId())) {
            throw new BadRequestException("Chuyến gom không thuộc garage khách hàng đã chọn");
        }
        if (distanceKm(orderRequest.getPickupLatitude(), orderRequest.getPickupLongitude(),
                trip.getPickupLatitude(), trip.getPickupLongitude()) > 5.0) {
            throw new BadRequestException("Điểm đón cách điểm tập kết của chuyến quá 5 km");
        }
        if (distanceKm(orderRequest.getDropoffLatitude(), orderRequest.getDropoffLongitude(),
                trip.getDestinationLatitude(), trip.getDestinationLongitude()) > 5.0) {
            throw new BadRequestException("Điểm trả không cùng hướng với điểm đến của chuyến gom");
        }

        orderRequest.setOrderType(OrderType.BATCH_CROSSING);
        var createdOrder = rescueDispatchService.createBatchOrderForTrip(customer, orderRequest);
        orderCommands.attachBatchTrip(createdOrder.getId(), tripId, trip.getMechanicId(),
                trip.getBranchId(), trip.getDiscountedPricePerVehicle());
        trip.setCurrentVehicleCount(trip.getCurrentVehicleCount() + 1);
        if (trip.getCurrentVehicleCount() >= trip.getCapacity()) {
            trip.setStatus(BatchTripStatus.READY);
        }

        return JoinBatchTripResponse.builder()
                .trip(toResponse(trip, null))
                .order(rescueDispatchService.getOrderById(customer, createdOrder.getId()))
                .build();
    }

    @Transactional
    @Override
    public BatchTripResponse leave(Long tripId, Long orderId, User customer) {
        BatchTrip trip = lockedTrip(tripId);
        if (trip.getStatus() != BatchTripStatus.GATHERING && trip.getStatus() != BatchTripStatus.READY) {
            throw new BadRequestException("Chuyến đã bắt đầu, không thể rời chuyến");
        }
        OrderSnapshot order = orderLookup.getRequiredOrder(orderId);
        requireCustomer(order, customer);
        requireOrderInTrip(order, tripId);
        orderCommands.detachBatchTrip(orderId);
        trip.setCurrentVehicleCount(Math.max(0, trip.getCurrentVehicleCount() - 1));
        if (trip.getStatus() == BatchTripStatus.READY && LocalDateTime.now().isBefore(trip.getDepartureTime())) {
            trip.setStatus(BatchTripStatus.GATHERING);
        }
        return toResponse(trip, null);
    }

    @Transactional
    @Override
    public BatchTripResponse convertToPrivate(Long tripId, Long orderId, User customer) {
        BatchTrip trip = lockedTrip(tripId);
        if (trip.getStatus() != BatchTripStatus.GATHERING && trip.getStatus() != BatchTripStatus.READY) {
            throw new BadRequestException("Chuyến đã bắt đầu, không thể đổi loại cứu hộ");
        }
        OrderSnapshot order = orderLookup.getRequiredOrder(orderId);
        requireCustomer(order, customer);
        requireOrderInTrip(order, tripId);
        orderCommands.convertToPrivateCrossing(orderId);
        trip.setCurrentVehicleCount(Math.max(0, trip.getCurrentVehicleCount() - 1));
        if (trip.getStatus() == BatchTripStatus.READY && LocalDateTime.now().isBefore(trip.getDepartureTime())) {
            trip.setStatus(BatchTripStatus.GATHERING);
        }
        return toResponse(trip, null);
    }

    @Transactional
    @Override
    public BatchTripResponse startPickup(Long tripId, User mechanicUser) {
        BatchTrip trip = mechanicTrip(tripId, mechanicUser);
        refreshGatheringStatus(trip, LocalDateTime.now());
        if (trip.getStatus() != BatchTripStatus.READY) {
            throw new BadRequestException("Chuyến chỉ bắt đầu khi đủ xe hoặc hết thời gian tập kết");
        }
        if (trip.getCurrentVehicleCount() == 0) throw new BadRequestException("Chuyến chưa có xe");
        trip.setStatus(BatchTripStatus.PICKING_UP);
        return toResponse(trip, null);
    }

    @Transactional
    @Override
    public BatchTripResponse markPickedUp(Long tripId, Long orderId, User mechanicUser) {
        BatchTrip trip = mechanicTrip(tripId, mechanicUser);
        if (trip.getStatus() != BatchTripStatus.PICKING_UP) throw new BadRequestException("Chuyến chưa ở giai đoạn đón xe");
        requireOrderInTrip(orderLookup.getRequiredOrder(orderId), tripId);
        orderCommands.markVehiclePickedUp(orderId);
        return toResponse(trip, null);
    }

    @Transactional
    @Override
    public BatchTripResponse startMoving(Long tripId, User mechanicUser) {
        BatchTrip trip = mechanicTrip(tripId, mechanicUser);
        if (trip.getStatus() != BatchTripStatus.PICKING_UP) throw new BadRequestException("Chuyến chưa hoàn tất đón xe");
        List<OrderSnapshot> orders = orderLookup.findByBatchTripId(tripId);
        if (orders.isEmpty() || orders.stream().anyMatch(
                o -> !"VEHICLE_RECEIVED".equalsIgnoreCase(o.getTransportStage()))) {
            throw new BadRequestException("Phải xác nhận đã đón tất cả xe trước khi khởi hành");
        }
        trip.setStatus(BatchTripStatus.MOVING);
        return toResponse(trip, null);
    }

    @Transactional
    @Override
    public BatchTripResponse markDelivered(Long tripId, Long orderId, String completionImageUrl, User mechanicUser) {
        BatchTrip trip = mechanicTrip(tripId, mechanicUser);
        if (trip.getStatus() != BatchTripStatus.MOVING) throw new BadRequestException("Chuyến chưa di chuyển tới điểm trả");
        OrderSnapshot order = orderLookup.getRequiredOrder(orderId);
        requireOrderInTrip(order, tripId);
        if ("HANDED_OVER".equalsIgnoreCase(order.getTransportStage())) {
            throw new BadRequestException("Xe đã được xác nhận bàn giao");
        }
        orderCommands.markVehicleDelivered(orderId, completionImageUrl.trim());
        return toResponse(trip, null);
    }

    @Transactional
    @Override
    public BatchTripResponse complete(Long tripId, User mechanicUser) {
        BatchTrip trip = mechanicTrip(tripId, mechanicUser);
        if (trip.getStatus() != BatchTripStatus.MOVING) throw new BadRequestException("Chuyến chưa thể hoàn thành");
        List<OrderSnapshot> orders = orderLookup.findByBatchTripId(tripId);
        if (orders.isEmpty() || orders.stream().anyMatch(
                o -> !"HANDED_OVER".equalsIgnoreCase(o.getTransportStage()))) {
            throw new BadRequestException("Phải xác nhận đã trả tất cả xe");
        }
        orders.forEach(order -> orderCommands.completeBatchOrder(order.getOrderId()));
        trip.setStatus(BatchTripStatus.COMPLETED);
        trip.setCompletedAt(LocalDateTime.now());
        return toResponse(trip, null);
    }

    @Transactional
    @Override
    public BatchTripResponse cancel(Long tripId, User mechanicUser) {
        BatchTrip trip = mechanicTrip(tripId, mechanicUser);
        if (trip.getStatus() != BatchTripStatus.GATHERING && trip.getStatus() != BatchTripStatus.READY) {
            throw new BadRequestException("Chuyến đã bắt đầu, không thể hủy");
        }
        orderLookup.findByBatchTripId(tripId).forEach(o -> orderCommands.cancelBatchOrder(
                o.getOrderId(), "Chuyến gom đã bị thợ hủy trước khi khởi hành"));
        trip.setCurrentVehicleCount(0);
        trip.setStatus(BatchTripStatus.CANCELLED);
        return toResponse(trip, null);
    }

    private MechanicContextSnapshot readyMechanic(User user) {
        MechanicContextSnapshot mechanic = garageCatalog.getRequiredMechanicContext(user.getId());
        if (!mechanic.isGarageApproved() || !mechanic.isBranchOpen()) {
            throw new BadRequestException("Garage hoặc chi nhánh chưa sẵn sàng hoạt động");
        }
        return mechanic;
    }

    private MechanicContextSnapshot mechanicForCreation(User user, Long requestedMechanicId) {
        if (user.getRole() == Role.FIELD_MECHANIC) {
            MechanicContextSnapshot current = readyMechanic(user);
            if (requestedMechanicId != null && !requestedMechanicId.equals(current.getMechanicStaffId())) {
                throw new AccessDeniedException("Thợ chỉ có thể tạo chuyến cho chính mình");
            }
            return current;
        }
        if (user.getRole() != Role.GARAGE_OWNER || requestedMechanicId == null) {
            throw new BadRequestException("Chủ garage phải chọn thợ phụ trách chuyến");
        }
        GarageOwnerContextSnapshot owner = garageCatalog.getRequiredGarageOwnerContext(user.getId());
        if (!owner.isApproved()) throw new BadRequestException("Garage chưa được duyệt");
        MechanicContextSnapshot mechanic = garageCatalog.getRequiredMechanicByStaffId(requestedMechanicId);
        if (!owner.getGarageId().equals(mechanic.getGarageId())) {
            throw new AccessDeniedException("Không thể chỉ định thợ của garage khác");
        }
        if (!mechanic.isBranchOpen()) throw new BadRequestException("Chi nhánh của thợ đang đóng");
        return mechanic;
    }

    private BatchTrip mechanicTrip(Long tripId, User user) {
        BatchTrip trip = lockedTrip(tripId);
        MechanicContextSnapshot mechanic = readyMechanic(user);
        if (!mechanic.getMechanicStaffId().equals(trip.getMechanicId())) throw new AccessDeniedException("Không phải thợ phụ trách chuyến");
        return trip;
    }

    private BatchTrip lockedTrip(Long id) {
        return batchTripRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chuyến gom: " + id));
    }

    private BatchTrip requiredTrip(Long id) {
        return batchTripRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chuyến gom: " + id));
    }

    private void requireCustomer(OrderSnapshot order, User user) {
        if (!user.getId().equals(order.getCustomerUserId())) throw new AccessDeniedException("Không phải khách hàng của đơn");
    }

    private void requireOrderInTrip(OrderSnapshot order, Long tripId) {
        if (!tripId.equals(order.getBatchTripId())) throw new BadRequestException("Đơn không thuộc chuyến gom này");
    }

    private void refreshGatheringStatus(BatchTrip trip, LocalDateTime now) {
        if (trip.getStatus() == BatchTripStatus.GATHERING && !now.isBefore(trip.getDepartureTime())) {
            trip.setStatus(trip.getCurrentVehicleCount() == 0 ? BatchTripStatus.EXPIRED : BatchTripStatus.READY);
        }
    }

    private BatchTripResponse toResponse(BatchTrip t, Double distance) {
        Long garageId = t.getBranch() != null ? t.getBranch().getGarage().getId() : null;
        Long serviceItemId = garageId == null ? null : garageCatalog.getActiveServices(garageId).stream()
                .filter(service -> service.getServiceType() == ServiceType.CROSSING)
                .map(service -> service.getServiceId())
                .findFirst()
                .orElse(null);
        return BatchTripResponse.builder()
                .id(t.getId()).mechanicId(t.getMechanicId()).branchId(t.getBranchId())
                .garageId(garageId).serviceItemId(serviceItemId)
                .capacity(t.getCapacity()).currentVehicleCount(t.getCurrentVehicleCount())
                .availableSlots(Math.max(0, t.getCapacity() - t.getCurrentVehicleCount()))
                .pickupPlace(t.getPickupPlace()).destinationPlace(t.getDestinationPlace())
                .discountedPricePerVehicle(t.getDiscountedPricePerVehicle())
                .status(t.getStatus()).departureTime(t.getDepartureTime()).createdAt(t.getCreatedAt())
                .completedAt(t.getCompletedAt()).pickupLatitude(t.getPickupLatitude())
                .pickupLongitude(t.getPickupLongitude()).destinationLatitude(t.getDestinationLatitude())
                .destinationLongitude(t.getDestinationLongitude()).distanceKm(distance).build();
    }

    private double distanceKm(double lat1, double lon1, double lat2, double lon2) {
        double earthRadius = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private record TripDistance(BatchTrip trip, double distance) {}
}
