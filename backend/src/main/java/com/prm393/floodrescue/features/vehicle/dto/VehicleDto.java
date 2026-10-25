package com.prm393.floodrescue.features.vehicle.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VehicleDto {
    private Long id;
    private Long customerId;
    private String licensePlate;
    private String brand;
    private String model;
    private String vehicleType; // SCOOTER, MANUAL, CLUTCH, ELECTRIC
    private String engineCapacity;
    private String color;
    private boolean isDefault;
}
