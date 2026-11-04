package com.prm393.floodrescue.features.vehicle.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateVehicleRequest {

    @NotBlank(message = "Biển số xe không được để trống")
    private String licensePlate;

    @NotBlank(message = "Hãng xe không được để trống")
    private String brand;

    @NotBlank(message = "Dòng xe không được để trống")
    private String model;

    private String vehicleType; // SCOOTER, MANUAL, CLUTCH, ELECTRIC

    private String engineCapacity;

    private String color;

    private Boolean isDefault;
}
