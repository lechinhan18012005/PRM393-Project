package com.prm393.floodrescue.features.garage.repository;

import com.prm393.floodrescue.features.garage.entity.ServiceItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServiceItemRepository extends JpaRepository<ServiceItem, Long> {
    List<ServiceItem> findByGarageIdOrderByCreatedAtAsc(Long garageId);
    List<ServiceItem> findByGarageIdAndActiveTrueOrderByCreatedAtAsc(Long garageId);
}
