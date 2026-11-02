package com.prm393.floodrescue.features.garage.service.impl;

import com.prm393.floodrescue.common.exception.BadRequestException;
import com.prm393.floodrescue.common.exception.ResourceNotFoundException;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.garage.dto.ServiceItemDto;
import com.prm393.floodrescue.features.garage.entity.ApplicableVehicleType;
import com.prm393.floodrescue.features.garage.entity.Garage;
import com.prm393.floodrescue.features.garage.entity.ItemCategoryType;
import com.prm393.floodrescue.features.garage.entity.ServiceItem;
import com.prm393.floodrescue.features.garage.entity.ServiceType;
import com.prm393.floodrescue.features.garage.repository.GarageRepository;
import com.prm393.floodrescue.features.garage.repository.ServiceItemRepository;
import com.prm393.floodrescue.features.garage.service.GarageAccess;
import com.prm393.floodrescue.features.garage.service.PriceCeilingService;
import com.prm393.floodrescue.features.garage.service.ServicePricingService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ServicePricingServiceImpl implements ServicePricingService {

    private final ServiceItemRepository serviceItemRepository;
    private final GarageRepository garageRepository;
    private final PriceCeilingService priceCeilingService;

    @Override
    @Transactional(readOnly = true)
    public List<ServiceItemDto> getServicesByCurrentUser(User user) {
        Garage garage =
                garageRepository
                        .findByOwnerId(user.getId())
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Chưa tìm thấy garage của tài khoản này!"));
        GarageAccess.requireApproved(garage);
        return serviceItemRepository
                .findByGarageIdAndDeletedFalseOrderByCreatedAtAsc(garage.getId())
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ServiceItemDto> getPublicServicesByGarage(Long garageId) {
        Garage garage =
                garageRepository
                        .findById(garageId)
                        .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy gara"));
        GarageAccess.requireApproved(garage);
        return serviceItemRepository
                .findByGarageIdAndActiveTrueAndDeletedFalseOrderByCreatedAtAsc(garageId)
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    @Override
    @Transactional
    public ServiceItemDto createServiceItem(User user, ServiceItemDto dto) {
        Garage garage =
                garageRepository
                        .findByOwnerId(user.getId())
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Chưa tìm thấy garage của tài khoản này!"));
        GarageAccess.requireApproved(garage);

        String serviceName = dto.getServiceName() != null ? dto.getServiceName().trim() : "";
        if (serviceName.isBlank()) {
            throw new BadRequestException("Tên dịch vụ không được để trống!");
        }

        ServiceType serviceType =
                dto.getServiceType() != null ? dto.getServiceType() : ServiceType.REPAIR_ONSITE;
        ItemCategoryType itemCategoryType =
                dto.getItemCategoryType() != null ? dto.getItemCategoryType() : ItemCategoryType.LABOR;
        ApplicableVehicleType vehicleType =
                dto.getApplicableVehicleType() != null
                        ? dto.getApplicableVehicleType()
                        : ApplicableVehicleType.ALL;
        String category =
                dto.getCategory() != null && !dto.getCategory().isBlank()
                        ? dto.getCategory().trim().toUpperCase()
                        : "TẠI CHỖ";

        // 1. Kiểm tra không trùng lặp tên dịch vụ cho cùng loại xe trong gara
        if (serviceItemRepository
                .existsByGarageIdAndServiceNameIgnoreCaseAndApplicableVehicleTypeAndDeletedFalse(
                        garage.getId(), serviceName, vehicleType)) {
            throw new BadRequestException(
                    String.format(
                            "Dịch vụ '%s' áp dụng cho nhóm xe '%s' đã tồn tại trong bảng giá của bạn!",
                            serviceName, vehicleType));
        }

        // 2. Tính toán và xác thực dải giá toán học
        BigDecimal standardPrice = dto.getStandardPrice();
        if (standardPrice == null || standardPrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Giá chuẩn dịch vụ phải lớn hơn 0!");
        }

        BigDecimal minPrice =
                dto.getMinPrice() != null
                        ? dto.getMinPrice()
                        : standardPrice.multiply(BigDecimal.valueOf(0.8));
        BigDecimal maxPrice =
                dto.getMaxPrice() != null
                        ? dto.getMaxPrice()
                        : standardPrice.multiply(BigDecimal.valueOf(1.3));

        validatePriceRange(standardPrice, minPrice, maxPrice);

        // 3. Đối chiếu Giá trần Sàn (Price Ceiling Check)
        priceCeilingService.validatePriceAgainstCeiling(
                serviceType, category, itemCategoryType, standardPrice, serviceName);
        priceCeilingService.validatePriceAgainstCeiling(
                serviceType, category, itemCategoryType, maxPrice, serviceName);

        BigDecimal ceilingSnapshot =
                priceCeilingService
                        .findMaxAllowedPrice(serviceType, category, itemCategoryType)
                        .orElse(null);

        ServiceItem item =
                ServiceItem.builder()
                        .garage(garage)
                        .serviceName(serviceName)
                        .category(category)
                        .serviceType(serviceType)
                        .itemCategoryType(itemCategoryType)
                        .applicableVehicleType(vehicleType)
                        .standardPrice(standardPrice)
                        .minPrice(minPrice)
                        .maxPrice(maxPrice)
                        .unit(dto.getUnit() != null ? dto.getUnit() : "lượt")
                        .estimatedTimeMin(
                                dto.getEstimatedTimeMin() != null && dto.getEstimatedTimeMin() > 0
                                        ? dto.getEstimatedTimeMin()
                                        : 15)
                        .description(dto.getDescription())
                        .active(dto.isActive())
                        .deleted(false)
                        .adminCeilingSnapshot(ceilingSnapshot)
                        .warrantyDays(
                                dto.getWarrantyDays() != null && dto.getWarrantyDays() >= 0
                                        ? dto.getWarrantyDays()
                                        : 3)
                        .build();

        item = serviceItemRepository.save(item);
        log.info(
                "Service item created with id: {} for garage: {} [type: {}, vehicle: {}]",
                item.getId(),
                garage.getId(),
                item.getServiceType(),
                item.getApplicableVehicleType());
        return mapToDto(item);
    }

    @Override
    @Transactional
    public ServiceItemDto updateServiceItem(User user, Long serviceId, ServiceItemDto dto) {
        Garage garage =
                garageRepository
                        .findByOwnerId(user.getId())
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Chưa tìm thấy garage của tài khoản này!"));
        GarageAccess.requireApproved(garage);

        ServiceItem item =
                serviceItemRepository
                        .findById(serviceId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Không tìm thấy dịch vụ với id: " + serviceId));

        if (!item.getGarage().getId().equals(garage.getId())) {
            throw new BadRequestException("Dịch vụ không thuộc quyền quản lý của garage bạn!");
        }

        if (item.isDeleted()) {
            throw new BadRequestException("Dịch vụ này đã ngừng kinh doanh (đã xóa), không thể chỉnh sửa!");
        }

        String serviceName =
                dto.getServiceName() != null ? dto.getServiceName().trim() : item.getServiceName();
        ApplicableVehicleType vehicleType =
                dto.getApplicableVehicleType() != null
                        ? dto.getApplicableVehicleType()
                        : item.getApplicableVehicleType();

        // Kiểm tra trùng lặp nếu đổi tên hoặc đổi loại xe
        if (serviceItemRepository
                .existsByGarageIdAndServiceNameIgnoreCaseAndApplicableVehicleTypeAndDeletedFalseAndIdNot(
                        garage.getId(), serviceName, vehicleType, serviceId)) {
            throw new BadRequestException(
                    String.format(
                            "Dịch vụ '%s' áp dụng cho nhóm xe '%s' đã tồn tại trong bảng giá của bạn!",
                            serviceName, vehicleType));
        }

        ServiceType serviceType =
                dto.getServiceType() != null ? dto.getServiceType() : item.getServiceType();
        ItemCategoryType itemCategoryType =
                dto.getItemCategoryType() != null
                        ? dto.getItemCategoryType()
                        : item.getItemCategoryType();
        String category =
                dto.getCategory() != null && !dto.getCategory().isBlank()
                        ? dto.getCategory().trim().toUpperCase()
                        : item.getCategory();

        BigDecimal standardPrice =
                dto.getStandardPrice() != null ? dto.getStandardPrice() : item.getStandardPrice();
        BigDecimal minPrice = dto.getMinPrice() != null ? dto.getMinPrice() : item.getMinPrice();
        BigDecimal maxPrice = dto.getMaxPrice() != null ? dto.getMaxPrice() : item.getMaxPrice();

        validatePriceRange(standardPrice, minPrice, maxPrice);

        // Kiểm tra trần giá sàn
        priceCeilingService.validatePriceAgainstCeiling(
                serviceType, category, itemCategoryType, standardPrice, serviceName);
        priceCeilingService.validatePriceAgainstCeiling(
                serviceType, category, itemCategoryType, maxPrice, serviceName);

        BigDecimal ceilingSnapshot =
                priceCeilingService
                        .findMaxAllowedPrice(serviceType, category, itemCategoryType)
                        .orElse(null);

        item.setServiceName(serviceName);
        item.setCategory(category);
        item.setServiceType(serviceType);
        item.setItemCategoryType(itemCategoryType);
        item.setApplicableVehicleType(vehicleType);
        item.setStandardPrice(standardPrice);
        item.setMinPrice(minPrice);
        item.setMaxPrice(maxPrice);
        if (dto.getUnit() != null) item.setUnit(dto.getUnit());
        if (dto.getEstimatedTimeMin() != null && dto.getEstimatedTimeMin() > 0) {
            item.setEstimatedTimeMin(dto.getEstimatedTimeMin());
        }
        if (dto.getDescription() != null) item.setDescription(dto.getDescription());
        item.setActive(dto.isActive());
        item.setAdminCeilingSnapshot(ceilingSnapshot);
        if (dto.getWarrantyDays() != null && dto.getWarrantyDays() >= 0) {
            item.setWarrantyDays(dto.getWarrantyDays());
        }

        item = serviceItemRepository.save(item);
        log.info("Service item updated id: {} for garage: {}", item.getId(), garage.getId());
        return mapToDto(item);
    }

    @Override
    @Transactional
    public void deleteServiceItem(User user, Long serviceId) {
        Garage garage =
                garageRepository
                        .findByOwnerId(user.getId())
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Chưa tìm thấy garage của tài khoản này!"));
        GarageAccess.requireApproved(garage);

        ServiceItem item =
                serviceItemRepository
                        .findById(serviceId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Không tìm thấy dịch vụ với id: " + serviceId));

        if (!item.getGarage().getId().equals(garage.getId())) {
            throw new BadRequestException("Dịch vụ không thuộc quyền quản lý của garage bạn!");
        }

        if (item.isDeleted()) {
            return; // Đã xóa rồi thì bỏ qua
        }

        // BR-PRICE-003: Soft Delete an toàn tuyệt đối, không phá hủy khóa ngoại trong quotation_item
        item.setDeleted(true);
        item.setActive(false);
        serviceItemRepository.save(item);
        log.info(
                "Safe soft-deleted service item id: {} for garage: {}",
                item.getId(),
                garage.getId());
    }

    private void validatePriceRange(
            BigDecimal standardPrice, BigDecimal minPrice, BigDecimal maxPrice) {
        if (standardPrice == null || standardPrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Giá chuẩn dịch vụ phải lớn hơn 0!");
        }
        if (standardPrice.remainder(BigDecimal.ONE).compareTo(BigDecimal.ZERO) != 0) {
            throw new BadRequestException("Đơn giá dịch vụ VNĐ phải là số nguyên, không chứa số lẻ thập phân!");
        }
        BigDecimal maxCap = BigDecimal.valueOf(50_000_000);
        if (standardPrice.compareTo(maxCap) > 0) {
            throw new BadRequestException("Đơn giá dịch vụ không được vượt quá 50.000.000 VNĐ!");
        }
        if (minPrice != null) {
            if (minPrice.compareTo(BigDecimal.ZERO) <= 0) {
                throw new BadRequestException("Giá tối thiểu phải lớn hơn 0!");
            }
            if (minPrice.remainder(BigDecimal.ONE).compareTo(BigDecimal.ZERO) != 0) {
                throw new BadRequestException("Giá tối thiểu VNĐ phải là số nguyên!");
            }
            if (minPrice.compareTo(standardPrice) > 0) {
                throw new BadRequestException(
                        "Giá tối thiểu (minPrice) không được lớn hơn giá chuẩn (standardPrice)!");
            }
        }
        if (maxPrice != null) {
            if (maxPrice.remainder(BigDecimal.ONE).compareTo(BigDecimal.ZERO) != 0) {
                throw new BadRequestException("Giá tối đa VNĐ phải là số nguyên!");
            }
            if (maxPrice.compareTo(maxCap) > 0) {
                throw new BadRequestException("Giá tối đa dịch vụ không được vượt quá 50.000.000 VNĐ!");
            }
            if (maxPrice.compareTo(standardPrice) < 0) {
                throw new BadRequestException(
                        "Giá tối đa (maxPrice) không được nhỏ hơn giá chuẩn (standardPrice)!");
            }
        }
    }

    @Override
    public ServiceItemDto mapToDto(ServiceItem item) {
        return ServiceItemDto.builder()
                .id(item.getId())
                .serviceName(item.getServiceName())
                .category(item.getCategory())
                .serviceType(item.getServiceType())
                .itemCategoryType(item.getItemCategoryType())
                .applicableVehicleType(item.getApplicableVehicleType())
                .standardPrice(item.getStandardPrice())
                .minPrice(item.getMinPrice())
                .maxPrice(item.getMaxPrice())
                .unit(item.getUnit())
                .estimatedTimeMin(item.getEstimatedTimeMin())
                .description(item.getDescription())
                .active(item.isActive())
                .deleted(item.isDeleted())
                .adminCeilingSnapshot(item.getAdminCeilingSnapshot())
                .warrantyDays(item.getWarrantyDays())
                .build();
    }
}
