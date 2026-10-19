package com.prm393.floodrescue.features.garage.repository;

import com.prm393.floodrescue.features.garage.entity.Garage;
import com.prm393.floodrescue.features.garage.entity.GarageStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GarageRepository extends JpaRepository<Garage, Long> {
    Optional<Garage> findByOwnerId(Long ownerId);
    List<Garage> findByStatus(GarageStatus status);
    List<Garage> findAllByOrderByCreatedAtDesc();
    boolean existsByOwnerId(Long ownerId);
}
