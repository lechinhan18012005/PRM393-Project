package com.prm393.floodrescue.features.vehicle.service;

import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.auth.repository.UserRepository;
import com.prm393.floodrescue.features.vehicle.dto.CreateVehicleRequest;
import com.prm393.floodrescue.features.vehicle.dto.VehicleDto;
import com.prm393.floodrescue.features.vehicle.entity.CustomerVehicle;
import com.prm393.floodrescue.features.vehicle.repository.CustomerVehicleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@Primary
@RequiredArgsConstructor
@Slf4j
@Transactional
public class DatabaseVehicleLookupServiceImpl implements VehicleLookupService {

    private final CustomerVehicleRepository vehicleRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public List<VehicleDto> getVehiclesByCustomer(Long customerId) {
        return vehicleRepository.findByCustomerIdOrderByIdAsc(customerId)
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<VehicleDto> getVehicleByIdAndCustomer(Long vehicleId, Long customerId) {
        if (vehicleId == null) {
            VehicleDto defaultVehicle = getDefaultVehicleByCustomer(customerId);
            return Optional.ofNullable(defaultVehicle);
        }

        return vehicleRepository.findByIdAndCustomerId(vehicleId, customerId)
                .map(this::mapToDto);
    }

    @Override
    @Transactional
    public VehicleDto getDefaultVehicleByCustomer(Long customerId) {
        Optional<CustomerVehicle> defaultOpt = vehicleRepository.findFirstByCustomerIdAndIsDefaultTrue(customerId);
        if (defaultOpt.isPresent()) {
            return mapToDto(defaultOpt.get());
        }

        List<CustomerVehicle> vehicles = vehicleRepository.findByCustomerIdOrderByIdAsc(customerId);
        if (!vehicles.isEmpty()) {
            CustomerVehicle first = vehicles.get(0);
            first.setDefault(true);
            return mapToDto(vehicleRepository.save(first));
        }

        return null;
    }

    @Override
    @Transactional
    public VehicleDto createVehicle(Long customerId, CreateVehicleRequest request) {
        User customer = userRepository.findById(customerId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy khách hàng với ID: " + customerId));

        boolean shouldBeDefault = Boolean.TRUE.equals(request.getIsDefault());
        List<CustomerVehicle> existing = vehicleRepository.findByCustomerIdOrderByIdAsc(customerId);
        if (existing.isEmpty()) {
            shouldBeDefault = true;
        }

        if (shouldBeDefault) {
            clearDefaultVehicles(customerId);
        }

        CustomerVehicle newVehicle = CustomerVehicle.builder()
                .customer(customer)
                .licensePlate(request.getLicensePlate().trim().toUpperCase())
                .brand(request.getBrand().trim())
                .model(request.getModel().trim())
                .vehicleType(request.getVehicleType() != null ? request.getVehicleType().trim().toUpperCase() : "SCOOTER")
                .engineCapacity(request.getEngineCapacity() != null && !request.getEngineCapacity().isBlank()
                        ? request.getEngineCapacity().trim()
                        : null)
                .color(request.getColor() != null && !request.getColor().isBlank()
                        ? request.getColor().trim()
                        : null)
                .isDefault(shouldBeDefault)
                .build();

        CustomerVehicle saved = vehicleRepository.save(newVehicle);
        log.info("Đã lưu phương tiện mới vào Database: ID={}, Biển số={}", saved.getId(), saved.getLicensePlate());
        return mapToDto(saved);
    }

    @Override
    @Transactional
    public VehicleDto updateVehicle(Long customerId, Long vehicleId, CreateVehicleRequest request) {
        CustomerVehicle vehicle = vehicleRepository.findByIdAndCustomerId(vehicleId, customerId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy phương tiện với ID: " + vehicleId));

        if (Boolean.TRUE.equals(request.getIsDefault())) {
            clearDefaultVehicles(customerId);
            vehicle.setDefault(true);
        } else if (request.getIsDefault() != null && !request.getIsDefault()) {
            vehicle.setDefault(false);
        }

        if (request.getLicensePlate() != null && !request.getLicensePlate().isBlank()) {
            vehicle.setLicensePlate(request.getLicensePlate().trim().toUpperCase());
        }
        if (request.getBrand() != null && !request.getBrand().isBlank()) {
            vehicle.setBrand(request.getBrand().trim());
        }
        if (request.getModel() != null && !request.getModel().isBlank()) {
            vehicle.setModel(request.getModel().trim());
        }
        if (request.getVehicleType() != null && !request.getVehicleType().isBlank()) {
            vehicle.setVehicleType(request.getVehicleType().trim().toUpperCase());
        }
        if (request.getEngineCapacity() != null) {
            vehicle.setEngineCapacity(request.getEngineCapacity().isBlank() ? null : request.getEngineCapacity().trim());
        }
        if (request.getColor() != null) {
            vehicle.setColor(request.getColor().isBlank() ? null : request.getColor().trim());
        }

        CustomerVehicle updated = vehicleRepository.save(vehicle);
        log.info("Đã cập nhật phương tiện vào Database: ID={}", updated.getId());
        return mapToDto(updated);
    }

    @Override
    @Transactional
    public void deleteVehicle(Long customerId, Long vehicleId) {
        CustomerVehicle vehicle = vehicleRepository.findByIdAndCustomerId(vehicleId, customerId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy phương tiện với ID: " + vehicleId));

        boolean wasDefault = vehicle.isDefault();
        vehicleRepository.delete(vehicle);
        log.info("Đã xóa phương tiện khỏi Database: ID={}", vehicleId);

        if (wasDefault) {
            List<CustomerVehicle> remaining = vehicleRepository.findByCustomerIdOrderByIdAsc(customerId);
            if (!remaining.isEmpty()) {
                CustomerVehicle newDefault = remaining.get(0);
                newDefault.setDefault(true);
                vehicleRepository.save(newDefault);
            }
        }
    }

    @Override
    @Transactional
    public VehicleDto setDefaultVehicle(Long customerId, Long vehicleId) {
        CustomerVehicle vehicle = vehicleRepository.findByIdAndCustomerId(vehicleId, customerId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy phương tiện với ID: " + vehicleId));

        clearDefaultVehicles(customerId);
        vehicle.setDefault(true);
        CustomerVehicle saved = vehicleRepository.save(vehicle);
        log.info("Đã thiết lập phương tiện mặc định trong Database: ID={}", saved.getId());
        return mapToDto(saved);
    }

    private void clearDefaultVehicles(Long customerId) {
        List<CustomerVehicle> currentDefaults = vehicleRepository.findByCustomerIdAndIsDefaultTrue(customerId);
        for (CustomerVehicle v : currentDefaults) {
            v.setDefault(false);
        }
        vehicleRepository.saveAll(currentDefaults);
    }

    private VehicleDto mapToDto(CustomerVehicle entity) {
        return VehicleDto.builder()
                .id(entity.getId())
                .customerId(entity.getCustomer() != null ? entity.getCustomer().getId() : null)
                .licensePlate(entity.getLicensePlate())
                .brand(entity.getBrand())
                .model(entity.getModel())
                .vehicleType(entity.getVehicleType())
                .engineCapacity(entity.getEngineCapacity())
                .color(entity.getColor())
                .isDefault(entity.isDefault())
                .build();
    }
}
