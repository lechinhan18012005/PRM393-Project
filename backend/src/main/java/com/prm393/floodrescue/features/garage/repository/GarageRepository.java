package com.prm393.floodrescue.features.garage.repository;

import com.prm393.floodrescue.features.garage.entity.Garage;
import com.prm393.floodrescue.features.garage.entity.GarageStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GarageRepository extends JpaRepository<Garage, Long> {
    @Query(value = "SELECT COALESCE(wallet_balance, 0) FROM garages WHERE id = :id FOR UPDATE", nativeQuery = true)
    Optional<java.math.BigDecimal> lockWalletBalance(@org.springframework.data.repository.query.Param("id") Long id);
    Optional<Garage> findByOwnerId(Long ownerId);
    List<Garage> findByStatus(GarageStatus status);
    List<Garage> findAllByOrderByCreatedAtDesc();
    boolean existsByOwnerId(Long ownerId);
}
