package com.prm393.floodrescue.features.garage.service.impl;

import com.prm393.floodrescue.common.exception.BadRequestException;
import com.prm393.floodrescue.common.exception.ResourceNotFoundException;
import com.prm393.floodrescue.features.garage.dto.CreatePriceCeilingRequest;
import com.prm393.floodrescue.features.garage.dto.PriceCeilingDto;
import com.prm393.floodrescue.features.garage.entity.ItemCategoryType;
import com.prm393.floodrescue.features.garage.entity.PlatformPriceCeiling;
import com.prm393.floodrescue.features.garage.entity.ServiceType;
import com.prm393.floodrescue.features.garage.repository.PlatformPriceCeilingRepository;
import com.prm393.floodrescue.features.garage.service.PriceCeilingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class PriceCeilingServiceImpl implements PriceCeilingService {

    private final PlatformPriceCeilingRepository ceilingRepository;

    @Override
    @Transactional(readOnly = true)
    public List<PriceCeilingDto> getActiveCeilings() {
        return ceilingRepository.findByActiveTrueOrderByCreatedAtAsc().stream()
                .map(this::mapToDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<PriceCeilingDto> getAllCeilings() {
        return ceilingRepository.findAll().stream()
                .map(this::mapToDto)
                .toList();
    }

    @Override
    @Transactional
    public PriceCeilingDto createCeiling(CreatePriceCeilingRequest request) {
        PlatformPriceCeiling ceiling =
                PlatformPriceCeiling.builder()
                        .serviceType(request.getServiceType())
                        .category(request.getCategory().trim().toUpperCase())
                        .itemCategoryType(request.getItemCategoryType())
                        .maxAllowedPrice(request.getMaxAllowedPrice())
                        .description(request.getDescription())
                        .active(request.isActive())
                        .build();
        ceiling = ceilingRepository.save(ceiling);
        log.info(
                "Created price ceiling id: {} for {} - {}",
                ceiling.getId(),
                ceiling.getServiceType(),
                ceiling.getCategory());
        return mapToDto(ceiling);
    }

    @Override
    @Transactional
    public PriceCeilingDto updateCeiling(Long id, CreatePriceCeilingRequest request) {
        PlatformPriceCeiling ceiling =
                ceilingRepository
                        .findById(id)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Không tìm thấy quy định giá trần với ID: " + id));

        ceiling.setServiceType(request.getServiceType());
        ceiling.setCategory(request.getCategory().trim().toUpperCase());
        ceiling.setItemCategoryType(request.getItemCategoryType());
        ceiling.setMaxAllowedPrice(request.getMaxAllowedPrice());
        ceiling.setDescription(request.getDescription());
        ceiling.setActive(request.isActive());

        ceiling = ceilingRepository.save(ceiling);
        return mapToDto(ceiling);
    }

    @Override
    @Transactional
    public void toggleCeilingStatus(Long id, boolean active) {
        PlatformPriceCeiling ceiling =
                ceilingRepository
                        .findById(id)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Không tìm thấy quy định giá trần với ID: " + id));
        ceiling.setActive(active);
        ceilingRepository.save(ceiling);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<BigDecimal> findMaxAllowedPrice(
            ServiceType serviceType, String category, ItemCategoryType itemCategoryType) {
        if (serviceType == null) {
            return Optional.empty();
        }

        // 1. Thử tìm khớp chính xác serviceType + category + itemCategoryType
        if (category != null && !category.isBlank() && itemCategoryType != null) {
            var exact =
                    ceilingRepository
                            .findFirstByServiceTypeAndCategoryIgnoreCaseAndItemCategoryTypeAndActiveTrue(
                                    serviceType, category.trim(), itemCategoryType);
            if (exact.isPresent()) {
                return exact.map(PlatformPriceCeiling::getMaxAllowedPrice);
            }
        }

        // 2. Thử tìm khớp theo serviceType + itemCategoryType
        if (itemCategoryType != null) {
            var byTypeAndCategoryType =
                    ceilingRepository
                            .findFirstByServiceTypeAndItemCategoryTypeAndActiveTrue(
                                    serviceType, itemCategoryType);
            if (byTypeAndCategoryType.isPresent()) {
                return byTypeAndCategoryType.map(PlatformPriceCeiling::getMaxAllowedPrice);
            }
        }

        // 3. Fallback theo serviceType
        return ceilingRepository
                .findFirstByServiceTypeAndActiveTrue(serviceType)
                .map(PlatformPriceCeiling::getMaxAllowedPrice);
    }

    @Override
    @Transactional(readOnly = true)
    public void validatePriceAgainstCeiling(
            ServiceType serviceType,
            String category,
            ItemCategoryType itemCategoryType,
            BigDecimal price,
            String serviceName) {
        if (price == null) return;
        Optional<BigDecimal> maxAllowed =
                findMaxAllowedPrice(serviceType, category, itemCategoryType);
        if (maxAllowed.isPresent() && price.compareTo(maxAllowed.get()) > 0) {
            throw new BadRequestException(
                    String.format(
                            "Đơn giá niêm yết (%,.0f đ) của dịch vụ '%s' vượt quá mức giá trần quy định của sàn (%,.0f đ) cho danh mục %s. Vui lòng tuân thủ quy định giá cứu hộ để bảo vệ người tiêu dùng mùa bão ngập!",
                            price, serviceName, maxAllowed.get(), serviceType));
        }
    }

    private PriceCeilingDto mapToDto(PlatformPriceCeiling entity) {
        return PriceCeilingDto.builder()
                .id(entity.getId())
                .serviceType(entity.getServiceType())
                .category(entity.getCategory())
                .itemCategoryType(entity.getItemCategoryType())
                .maxAllowedPrice(entity.getMaxAllowedPrice())
                .description(entity.getDescription())
                .active(entity.isActive())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
