package com.prm393.floodrescue.features.rating.repository;

import com.prm393.floodrescue.features.rating.entity.ServiceRating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ServiceRatingRepository extends JpaRepository<ServiceRating, Long> {
    boolean existsByRescueOrderId(Long rescueOrderId);

    Optional<ServiceRating> findByRescueOrderId(Long rescueOrderId);

    List<ServiceRating> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    List<ServiceRating> findByGarageIdOrderByCreatedAtDesc(Long garageId);

    List<ServiceRating> findByMechanicStaffIdOrderByCreatedAtDesc(Long mechanicStaffId);

    List<ServiceRating> findAllByOrderByCreatedAtDesc();
}
