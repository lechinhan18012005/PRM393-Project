package com.prm393.floodrescue.features.vehicle.service;

import com.prm393.floodrescue.features.vehicle.dto.VehicleDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * Production adapter khi Module Xe máy cá nhân (FEAT-01B) chưa tích hợp.
 * Báo lỗi rõ ràng và không tự sinh xe mẫu/xe giả trên môi trường vận hành thật.
 */
@Service
@Profile("!dev & !test & !local")
@Slf4j
public class ProdVehicleLookupServiceImpl implements VehicleLookupService {

    public ProdVehicleLookupServiceImpl() {
        log.info("[PROD] Initialized ProdVehicleLookupServiceImpl - real vehicle integration required.");
    }

    @Override
    public List<VehicleDto> getVehiclesByCustomer(Long customerId) {
        log.warn("Production VehicleModule is not yet integrated for customer {}", customerId);
        return List.of();
    }

    @Override
    public Optional<VehicleDto> getVehicleByIdAndCustomer(Long vehicleId, Long customerId) {
        log.error("Vehicle lookup called on production but VehicleModule is not connected: vehicleId={}, customerId={}", vehicleId, customerId);
        throw new IllegalStateException("Dịch vụ tra cứu xe máy cá nhân hiện chưa khả dụng trên môi trường vận hành này. Vui lòng liên hệ quản trị viên!");
    }

    @Override
    public VehicleDto getDefaultVehicleByCustomer(Long customerId) {
        log.error("Default vehicle lookup called on production but VehicleModule is not connected: customerId={}", customerId);
        throw new IllegalStateException("Dịch vụ tra cứu xe máy cá nhân hiện chưa khả dụng trên môi trường vận hành này. Vui lòng liên hệ quản trị viên!");
    }
}
