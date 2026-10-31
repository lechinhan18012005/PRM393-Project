package com.prm393.floodrescue.features.garage.service;

import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.garage.dto.ServiceItemDto;
import com.prm393.floodrescue.features.garage.entity.ServiceItem;

import java.util.List;

public interface ServicePricingService {

    List<ServiceItemDto> getServicesByCurrentUser(User user);

    List<ServiceItemDto> getPublicServicesByGarage(Long garageId);

    ServiceItemDto createServiceItem(User user, ServiceItemDto dto);

    ServiceItemDto updateServiceItem(User user, Long serviceId, ServiceItemDto dto);

    void deleteServiceItem(User user, Long serviceId);

    ServiceItemDto mapToDto(ServiceItem item);
}
