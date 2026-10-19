package com.prm393.floodrescue.features.garage.service;

import com.prm393.floodrescue.common.exception.ResourceNotFoundException;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.garage.dto.ServiceItemDto;
import com.prm393.floodrescue.features.garage.entity.Garage;
import com.prm393.floodrescue.features.garage.entity.ServiceItem;
import com.prm393.floodrescue.features.garage.entity.ServiceType;
import com.prm393.floodrescue.features.garage.repository.GarageRepository;
import com.prm393.floodrescue.features.garage.repository.ServiceItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ServicePricingService {

    private final ServiceItemRepository serviceItemRepository;
    private final GarageRepository garageRepository;

    @Transactional(readOnly = true)
    public List<ServiceItemDto> getServicesByCurrentUser(User user) {
        Garage garage = garageRepository.findByOwnerId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Chưa tìm thấy garage của tài khoản này!"));
        return serviceItemRepository.findByGarageIdOrderByCreatedAtAsc(garage.getId()).stream()
                .map(this::mapToDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ServiceItemDto> getPublicServicesByGarage(Long garageId) {
        return serviceItemRepository.findByGarageIdAndActiveTrueOrderByCreatedAtAsc(garageId).stream()
                .map(this::mapToDto)
                .toList();
    }

    @Transactional
    public ServiceItemDto createServiceItem(User user, ServiceItemDto dto) {
        Garage garage = garageRepository.findByOwnerId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Chưa tìm thấy garage của tài khoản này!"));

        ServiceItem item = ServiceItem.builder()
                .garage(garage)
                .serviceName(dto.getServiceName())
                .category(dto.getCategory() != null ? dto.getCategory() : "TẠI CHỖ")
                .serviceType(dto.getServiceType() != null ? dto.getServiceType() : ServiceType.REPAIR_ONSITE)
                .standardPrice(dto.getStandardPrice())
                .minPrice(dto.getMinPrice() != null ? dto.getMinPrice() : dto.getStandardPrice().multiply(BigDecimal.valueOf(0.8)))
                .maxPrice(dto.getMaxPrice() != null ? dto.getMaxPrice() : dto.getStandardPrice().multiply(BigDecimal.valueOf(1.3)))
                .unit(dto.getUnit() != null ? dto.getUnit() : "lượt")
                .estimatedTimeMin(dto.getEstimatedTimeMin() != null ? dto.getEstimatedTimeMin() : 15)
                .description(dto.getDescription())
                .active(dto.isActive())
                .warrantyDays(dto.getWarrantyDays() != null ? dto.getWarrantyDays() : 3)
                .build();

        item = serviceItemRepository.save(item);
        log.info("Service item created with id: {} for garage: {}", item.getId(), garage.getId());
        return mapToDto(item);
    }

    @Transactional
    public ServiceItemDto updateServiceItem(User user, Long serviceId, ServiceItemDto dto) {
        Garage garage = garageRepository.findByOwnerId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Chưa tìm thấy garage của tài khoản này!"));

        ServiceItem item = serviceItemRepository.findById(serviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dịch vụ với id: " + serviceId));

        if (!item.getGarage().getId().equals(garage.getId())) {
            throw new ResourceNotFoundException("Dịch vụ không thuộc quyền quản lý của garage bạn!");
        }

        if (dto.getServiceName() != null) item.setServiceName(dto.getServiceName());
        if (dto.getCategory() != null) item.setCategory(dto.getCategory());
        if (dto.getServiceType() != null) item.setServiceType(dto.getServiceType());
        if (dto.getStandardPrice() != null) item.setStandardPrice(dto.getStandardPrice());
        if (dto.getMinPrice() != null) item.setMinPrice(dto.getMinPrice());
        if (dto.getMaxPrice() != null) item.setMaxPrice(dto.getMaxPrice());
        if (dto.getUnit() != null) item.setUnit(dto.getUnit());
        if (dto.getEstimatedTimeMin() != null) item.setEstimatedTimeMin(dto.getEstimatedTimeMin());
        if (dto.getDescription() != null) item.setDescription(dto.getDescription());
        item.setActive(dto.isActive());
        if (dto.getWarrantyDays() != null) item.setWarrantyDays(dto.getWarrantyDays());

        item = serviceItemRepository.save(item);
        return mapToDto(item);
    }

    @Transactional
    public void deleteServiceItem(User user, Long serviceId) {
        Garage garage = garageRepository.findByOwnerId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Chưa tìm thấy garage của tài khoản này!"));

        ServiceItem item = serviceItemRepository.findById(serviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dịch vụ với id: " + serviceId));

        if (!item.getGarage().getId().equals(garage.getId())) {
            throw new ResourceNotFoundException("Dịch vụ không thuộc quyền quản lý của garage bạn!");
        }

        serviceItemRepository.delete(item);
    }

    public ServiceItemDto mapToDto(ServiceItem item) {
        return ServiceItemDto.builder()
                .id(item.getId())
                .serviceName(item.getServiceName())
                .category(item.getCategory())
                .serviceType(item.getServiceType())
                .standardPrice(item.getStandardPrice())
                .minPrice(item.getMinPrice())
                .maxPrice(item.getMaxPrice())
                .unit(item.getUnit())
                .estimatedTimeMin(item.getEstimatedTimeMin())
                .description(item.getDescription())
                .active(item.isActive())
                .warrantyDays(item.getWarrantyDays())
                .build();
    }
}
