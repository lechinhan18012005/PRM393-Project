package com.prm393.floodrescue.features.vehicle.service;

import com.prm393.floodrescue.features.vehicle.dto.CreateVehicleRequest;
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
 * Triển khai tra cứu và quản lý danh mục xe cá nhân trong môi trường phát triển/kiểm thử.
 * Đảm bảo xác thực quyền sở hữu theo customerId, không nhận vehicleId tùy ý không thuộc sở hữu.
 */
@Service
@Profile({"dev", "test", "local"})
@Slf4j
public class DevVehicleLookupServiceImpl implements VehicleLookupService {

    // Fixture storage theo customerId
    private final Map<Long, List<VehicleDto>> mockCustomerVehicles = new ConcurrentHashMap<>();

    public DevVehicleLookupServiceImpl() {
        log.info("[DEV/TEST FIXTURE] Initialized VehicleLookupService with in-memory storage.");
    }

    @Override
    public List<VehicleDto> getVehiclesByCustomer(Long customerId) {
        return mockCustomerVehicles.computeIfAbsent(customerId, k -> new ArrayList<>());
    }

    @Override
    public Optional<VehicleDto> getVehicleByIdAndCustomer(Long vehicleId, Long customerId) {
        if (vehicleId == null) {
            return Optional.ofNullable(getDefaultVehicleByCustomer(customerId));
        }
        List<VehicleDto> vehicles = getVehiclesByCustomer(customerId);
        return vehicles.stream()
                .filter(v -> v.getId().equals(vehicleId))
                .findFirst();
    }

    @Override
    public VehicleDto getDefaultVehicleByCustomer(Long customerId) {
        List<VehicleDto> vehicles = getVehiclesByCustomer(customerId);
        if (vehicles.isEmpty()) {
            return null;
        }
        return vehicles.stream()
                .filter(VehicleDto::isDefault)
                .findFirst()
                .orElse(vehicles.get(0));
    }

    @Override
    public synchronized VehicleDto createVehicle(Long customerId, CreateVehicleRequest request) {
        List<VehicleDto> list = getVehiclesByCustomer(customerId);
        long newId = list.stream().mapToLong(VehicleDto::getId).max().orElse(customerId * 100) + 1;

        boolean isDefault = Boolean.TRUE.equals(request.getIsDefault()) || list.isEmpty();
        if (isDefault) {
            list.forEach(v -> v.setDefault(false));
        }

        VehicleDto newVehicle = VehicleDto.builder()
                .id(newId)
                .customerId(customerId)
                .licensePlate(request.getLicensePlate().trim().toUpperCase())
                .brand(request.getBrand().trim())
                .model(request.getModel().trim())
                .vehicleType(request.getVehicleType() != null && !request.getVehicleType().isBlank()
                        ? request.getVehicleType().trim().toUpperCase() : "SCOOTER")
                .engineCapacity(request.getEngineCapacity() != null && !request.getEngineCapacity().isBlank()
                        ? request.getEngineCapacity().trim() : null)
                .color(request.getColor() != null && !request.getColor().isBlank()
                        ? request.getColor().trim() : null)
                .isDefault(isDefault)
                .build();

        list.add(newVehicle);
        log.info("[DEV] Created vehicle {} for customer {}", newVehicle.getId(), customerId);
        return newVehicle;
    }

    @Override
    public synchronized VehicleDto updateVehicle(Long customerId, Long vehicleId, CreateVehicleRequest request) {
        VehicleDto vehicle = getVehicleByIdAndCustomer(vehicleId, customerId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy phương tiện với ID: " + vehicleId));

        if (request.getLicensePlate() != null && !request.getLicensePlate().isBlank()) {
            vehicle.setLicensePlate(request.getLicensePlate().trim());
        }
        if (request.getBrand() != null && !request.getBrand().isBlank()) {
            vehicle.setBrand(request.getBrand().trim());
        }
        if (request.getModel() != null && !request.getModel().isBlank()) {
            vehicle.setModel(request.getModel().trim());
        }
        if (request.getVehicleType() != null && !request.getVehicleType().isBlank()) {
            vehicle.setVehicleType(request.getVehicleType().trim());
        }
        if (request.getEngineCapacity() != null) {
            vehicle.setEngineCapacity(request.getEngineCapacity().trim());
        }
        if (request.getColor() != null) {
            vehicle.setColor(request.getColor().trim());
        }
        if (Boolean.TRUE.equals(request.getIsDefault())) {
            List<VehicleDto> list = getVehiclesByCustomer(customerId);
            list.forEach(v -> v.setDefault(false));
            vehicle.setDefault(true);
        }

        log.info("[DEV] Updated vehicle {} for customer {}", vehicle.getId(), customerId);
        return vehicle;
    }

    @Override
    public synchronized void deleteVehicle(Long customerId, Long vehicleId) {
        List<VehicleDto> list = getVehiclesByCustomer(customerId);
        VehicleDto target = getVehicleByIdAndCustomer(vehicleId, customerId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy phương tiện với ID: " + vehicleId));

        boolean wasDefault = target.isDefault();
        list.remove(target);

        if (wasDefault && !list.isEmpty()) {
            list.get(0).setDefault(true);
        }
        log.info("[DEV] Deleted vehicle {} for customer {}", vehicleId, customerId);
    }

    @Override
    public synchronized VehicleDto setDefaultVehicle(Long customerId, Long vehicleId) {
        List<VehicleDto> list = getVehiclesByCustomer(customerId);
        VehicleDto target = getVehicleByIdAndCustomer(vehicleId, customerId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy phương tiện với ID: " + vehicleId));

        list.forEach(v -> v.setDefault(false));
        target.setDefault(true);
        log.info("[DEV] Set vehicle {} as default for customer {}", target.getId(), customerId);
        return target;
    }
}
