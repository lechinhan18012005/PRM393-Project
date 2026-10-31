package com.prm393.floodrescue.features.garage.repository;

import com.prm393.floodrescue.features.garage.entity.ItemCategoryType;
import com.prm393.floodrescue.features.garage.entity.PlatformPriceCeiling;
import com.prm393.floodrescue.features.garage.entity.ServiceType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlatformPriceCeilingRepository extends JpaRepository<PlatformPriceCeiling, Long> {

    List<PlatformPriceCeiling> findByActiveTrueOrderByCreatedAtAsc();

    List<PlatformPriceCeiling> findByServiceTypeAndActiveTrue(ServiceType serviceType);

    Optional<PlatformPriceCeiling> findFirstByServiceTypeAndCategoryIgnoreCaseAndItemCategoryTypeAndActiveTrue(
            ServiceType serviceType, String category, ItemCategoryType itemCategoryType);

    Optional<PlatformPriceCeiling> findFirstByServiceTypeAndItemCategoryTypeAndActiveTrue(
            ServiceType serviceType, ItemCategoryType itemCategoryType);

    Optional<PlatformPriceCeiling> findFirstByServiceTypeAndActiveTrue(ServiceType serviceType);
}
