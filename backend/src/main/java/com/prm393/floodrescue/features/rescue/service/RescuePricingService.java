package com.prm393.floodrescue.features.rescue.service;

import com.prm393.floodrescue.features.garage.entity.BranchStatus;
import com.prm393.floodrescue.features.garage.entity.Garage;
import com.prm393.floodrescue.features.garage.entity.GarageBranch;
import com.prm393.floodrescue.features.garage.entity.GarageStatus;
import com.prm393.floodrescue.features.garage.entity.ServiceItem;
import com.prm393.floodrescue.features.garage.entity.ServiceType;
import com.prm393.floodrescue.features.garage.repository.GarageBranchRepository;
import com.prm393.floodrescue.features.garage.repository.GarageRepository;
import com.prm393.floodrescue.features.garage.repository.ServiceItemRepository;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStaff;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStatus;
import com.prm393.floodrescue.features.mechanic.repository.MechanicStaffRepository;
import com.prm393.floodrescue.features.rescue.dto.CrossingOptionDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import com.prm393.floodrescue.features.finance.service.CommissionRateService;
import com.prm393.floodrescue.features.rescue.entity.OrderType;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class RescuePricingService {

    private final GarageRepository garageRepository;
    private final GarageBranchRepository branchRepository;
    private final ServiceItemRepository serviceItemRepository;
    private final MechanicStaffRepository mechanicRepository;
    private final MechanicEligibilityChecker eligibilityChecker;
    private final CommissionRateService commissionRateService;

    @Value("${app.rescue.hotline:1900-6868}")
    private String configuredHotline;

    @Value("${app.rescue.heartbeat-valid-minutes:5}")
    private int heartbeatValidMinutes;

    public BigDecimal getBookingFee() {
        // Commission is deducted from garage revenue; no additional customer fee.
        return BigDecimal.ZERO;
    }

    public String getHotline() {
        return configuredHotline;
    }

    public BigDecimal calculateTotalAmount(BigDecimal serviceBasePrice) {
        if (serviceBasePrice == null) {
            return getBookingFee();
        }
        return serviceBasePrice.add(getBookingFee());
    }

    @Transactional(readOnly = true)
    public List<CrossingOptionDto> getEligibleCrossingGarages() {
        return getEligibleCrossingGarages(null, null);
    }

    @Transactional(readOnly = true)
    public List<CrossingOptionDto> getEligibleCrossingGarages(Double pickupLat, Double pickupLng) {
        return getEligibleGarages(ServiceType.CROSSING, pickupLat, pickupLng);
    }

    @Transactional(readOnly = true)
    public List<CrossingOptionDto> getEligibleCrossingGarages(
            Double pickupLat, Double pickupLng, int page, int size) {
        return paginate(getEligibleGarages(ServiceType.CROSSING, pickupLat, pickupLng), page, size);
    }

    @Transactional(readOnly = true)
    public List<CrossingOptionDto> getEligibleGarages(
            ServiceType serviceType, Double pickupLat, Double pickupLng, int page, int size) {
        return paginate(getEligibleGarages(serviceType, pickupLat, pickupLng), page, size);
    }

    @Transactional(readOnly = true)
    public List<CrossingOptionDto> getEligibleGarages(ServiceType serviceType, Double pickupLat, Double pickupLng) {
        List<Garage> approvedGarages = garageRepository.findAll().stream()
                .filter(g -> g.getStatus() == GarageStatus.APPROVED)
                .toList();

        List<CrossingOptionDto> options = new ArrayList<>();
        LocalDateTime heartbeatThreshold = LocalDateTime.now().minusMinutes(heartbeatValidMinutes);

        for (Garage garage : approvedGarages) {
            List<ServiceItem> matchingServices = serviceItemRepository
                    .findByGarageIdAndActiveTrueAndDeletedFalseOrderByCreatedAtAsc(garage.getId())
                    .stream()
                    .filter(s -> s.getServiceType() == serviceType)
                    .toList();

            if (matchingServices.isEmpty()) {
                continue;
            }

            // Lấy các chi nhánh đang OPEN
            List<GarageBranch> openBranches = branchRepository
                    .findByGarageIdOrderByCreatedAtAsc(garage.getId())
                    .stream()
                    .filter(b -> b.getOperatingStatus() == BranchStatus.OPEN)
                    .toList();

            if (openBranches.isEmpty()) {
                continue;
            }

            // Đếm thợ thỏa mãn tiêu chí chuẩn B01 (APPROVED, OPEN, AVAILABLE, hasCrossingCapability, User active, GPS hợp lệ & mới, không vướng đơn)
            List<MechanicStaff> availableMechanics = mechanicRepository
                    .findByGarageIdOrderByCreatedAtDesc(garage.getId())
                    .stream()
                    .filter(m -> serviceType == ServiceType.CROSSING
                            ? eligibilityChecker.isMechanicEligibleForCrossing(m, heartbeatThreshold)
                            : eligibilityChecker.isMechanicEligibleForRescue(m, heartbeatThreshold))
                    .filter(m -> {
                        if (pickupLat == null || pickupLng == null) {
                            return true;
                        }
                        double distance = com.prm393.floodrescue.common.utils.GeoDistanceUtils.calculateDistanceMeters(
                                pickupLat, pickupLng, m.getCurrentLatitude(), m.getCurrentLongitude()
                        );
                        return distance <= 7000.0; // Trong phạm vi phục vụ tối đa 7 km
                    })
                    .toList();

            // Chỉ hiển thị gara khi có ít nhất một thợ đang hoạt động, sẵn sàng và đủ điều kiện.
            if (availableMechanics.isEmpty()) {
                continue;
            }

            GarageBranch mainBranch = openBranches.get(0);
            for (ServiceItem service : matchingServices) {
                BigDecimal basePrice = service.getStandardPrice();
                BigDecimal bookingFee = getBookingFee();
                BigDecimal total = basePrice.add(bookingFee);
                OrderType orderType = serviceType == ServiceType.CROSSING ? OrderType.SINGLE_CROSSING
                        : serviceType == ServiceType.TOWING ? OrderType.TOWING : OrderType.ONSITE_REPAIR;
                BigDecimal rate = commissionRateService.resolve(garage, orderType);
                BigDecimal groupRate = commissionRateService.resolve(garage, OrderType.BATCH_CROSSING);

                options.add(CrossingOptionDto.builder()
                        .garageId(garage.getId())
                        .garageName(garage.getGarageName())
                        .garagePhone(garage.getPhone())
                        .branchId(mainBranch.getId())
                        .branchName(mainBranch.getBranchName())
                        .branchAddress(mainBranch.getAddress())
                        .branchLatitude(mainBranch.getLatitude())
                        .branchLongitude(mainBranch.getLongitude())
                        .serviceItemId(service.getId())
                        .serviceName(service.getServiceName())
                        .description(service.getDescription() != null ? service.getDescription() : service.getServiceName())
                        .serviceBasePrice(basePrice)
                        .bookingFee(bookingFee)
                        .commissionRate(rate)
                        .groupCommissionRate(groupRate)
                        .platformFee(basePrice.multiply(rate).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP))
                        .totalAmount(total)
                        .groupPrice2Vehicles(service.getGroupPrice2Vehicles())
                        .groupPrice3Vehicles(service.getGroupPrice3Vehicles())
                        .groupPrice4Vehicles(service.getGroupPrice4Vehicles())
                        .groupPrice5Vehicles(service.getGroupPrice5Vehicles())
                        .groupPrice6Vehicles(service.getGroupPrice6Vehicles())
                        .currency("VND")
                        .estimatedTimeMin(service.getEstimatedTimeMin() != null ? service.getEstimatedTimeMin() : 20)
                        .availableMechanicCount(availableMechanics.size())
                        .build());
            }
        }
        return options;
    }

    private List<CrossingOptionDto> paginate(List<CrossingOptionDto> options, int page, int size) {
        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(size, 50));
        int fromIndex = Math.min(safePage * safeSize, options.size());
        int toIndex = Math.min(fromIndex + safeSize, options.size());
        return options.subList(fromIndex, toIndex);
    }
}
