package com.prm393.floodrescue.features.vehicle.repository;

import com.prm393.floodrescue.features.vehicle.entity.CustomerVehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerVehicleRepository extends JpaRepository<CustomerVehicle, Long> {

    List<CustomerVehicle> findByCustomerIdOrderByIdAsc(Long customerId);

    Optional<CustomerVehicle> findByIdAndCustomerId(Long id, Long customerId);

    Optional<CustomerVehicle> findFirstByCustomerIdAndIsDefaultTrue(Long customerId);

    List<CustomerVehicle> findByCustomerIdAndIsDefaultTrue(Long customerId);

    boolean existsByLicensePlateAndCustomerId(String licensePlate, Long customerId);
}
