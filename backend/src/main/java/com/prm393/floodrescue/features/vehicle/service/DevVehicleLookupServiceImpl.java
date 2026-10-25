package com.prm393.floodrescue.features.vehicle.service;

import com.prm393.floodrescue.features.vehicle.dto.VehicleDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * [DEV/TEST FIXTURE]
 * Triển khai tra cứu danh mục xe cá nhân trong môi trường phát triển/kiểm thử.
 * Đảm bảo xác thực quyền sở hữu theo customerId, không nhận vehicleId tùy ý không thuộc sở hữu.
 */
@Service
@Profile({"dev", "test", "local"})
@Slf4j
public class DevVehicleLookupServiceImpl implements VehicleLookupService {

    // Fixture storage theo customerId
    private final Map<Long, List<VehicleDto>> mockCustomerVehicles = new ConcurrentHashMap<>();

    public DevVehicleLookupServiceImpl() {
        log.info("[DEV/TEST FIXTURE] Initialized VehicleLookupService with verified user vehicle fixtures.");
    }

    private List<VehicleDto> generateDefaultVehiclesForCustomer(Long customerId) {
        List<VehicleDto> list = new ArrayList<>();
        list.add(VehicleDto.builder()
                .id(customerId * 100 + 1)
                .customerId(customerId)
                .licensePlate("59-B1 892.44")
                .brand("Honda")
                .model("SH 150i")
                .vehicleType("SCOOTER")
                .engineCapacity("150cc")
                .color("Trắng ánh kim")
                .isDefault(true)
                .build());

        list.add(VehicleDto.builder()
                .id(customerId * 100 + 2)
                .customerId(customerId)
                .licensePlate("59-S3 481.09")
                .brand("Yamaha")
                .model("Exciter 150")
                .vehicleType("CLUTCH")
                .engineCapacity("150cc")
                .color("Xanh GP")
                .isDefault(false)
                .build());

        list.add(VehicleDto.builder()
                .id(customerId * 100 + 3)
                .customerId(customerId)
                .licensePlate("59-X1 204.88")
                .brand("Honda")
                .model("Wave Alpha")
                .vehicleType("MANUAL")
                .engineCapacity("110cc")
                .color("Đỏ đô")
                .isDefault(false)
                .build());

        return list;
    }

    @Override
    public List<VehicleDto> getVehiclesByCustomer(Long customerId) {
        return mockCustomerVehicles.computeIfAbsent(customerId, this::generateDefaultVehiclesForCustomer);
    }

    @Override
    public Optional<VehicleDto> getVehicleByIdAndCustomer(Long vehicleId, Long customerId) {
        if (vehicleId == null) {
            return Optional.of(getDefaultVehicleByCustomer(customerId));
        }
        List<VehicleDto> vehicles = getVehiclesByCustomer(customerId);

        // 1. Khớp chính xác ID tuyệt đối (ví dụ: customerId * 100 + X)
        Optional<VehicleDto> exactMatch = vehicles.stream()
                .filter(v -> v.getId().equals(vehicleId))
                .findFirst();
        if (exactMatch.isPresent()) {
            return exactMatch;
        }

        // 2. Khớp theo index tương đối (1, 2, 3) từ Mobile UI hiện tại
        if (vehicleId >= 1 && vehicleId <= vehicles.size()) {
            return Optional.of(vehicles.get((int) (vehicleId - 1)));
        }

        return Optional.empty();
    }

    @Override
    public VehicleDto getDefaultVehicleByCustomer(Long customerId) {
        List<VehicleDto> vehicles = getVehiclesByCustomer(customerId);
        return vehicles.stream()
                .filter(VehicleDto::isDefault)
                .findFirst()
                .orElse(vehicles.get(0));
    }
}
