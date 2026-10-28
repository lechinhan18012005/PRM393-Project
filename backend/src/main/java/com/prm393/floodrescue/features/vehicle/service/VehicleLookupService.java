package com.prm393.floodrescue.features.vehicle.service;

import com.prm393.floodrescue.features.vehicle.dto.VehicleDto;

import java.util.List;
import java.util.Optional;

/**
 * Contract Interface phục vụ tra cứu thông tin xe máy cá nhân của khách hàng (FEAT-01B).
 * Trách nhiệm module: Bùi Hoàng Phúc.
 * Luồng 3 (Lê Chí Nhân) sử dụng làm contract tích hợp.
 */
public interface VehicleLookupService {

    List<VehicleDto> getVehiclesByCustomer(Long customerId);

    Optional<VehicleDto> getVehicleByIdAndCustomer(Long vehicleId, Long customerId);

    VehicleDto getDefaultVehicleByCustomer(Long customerId);
}
