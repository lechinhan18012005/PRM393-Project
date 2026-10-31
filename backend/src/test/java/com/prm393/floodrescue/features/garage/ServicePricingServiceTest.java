package com.prm393.floodrescue.features.garage;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.prm393.floodrescue.common.exception.BadRequestException;
import com.prm393.floodrescue.features.auth.entity.Role;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.garage.dto.ServiceItemDto;
import com.prm393.floodrescue.features.garage.entity.*;
import com.prm393.floodrescue.features.garage.repository.GarageRepository;
import com.prm393.floodrescue.features.garage.repository.ServiceItemRepository;
import com.prm393.floodrescue.features.garage.service.PriceCeilingService;
import com.prm393.floodrescue.features.garage.service.impl.ServicePricingServiceImpl;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@ExtendWith(MockitoExtension.class)
class ServicePricingServiceTest {

    @Mock private ServiceItemRepository serviceItemRepository;
    @Mock private GarageRepository garageRepository;
    @Mock private PriceCeilingService priceCeilingService;

    @InjectMocks private ServicePricingServiceImpl pricingService;

    private User sampleUser;
    private Garage sampleGarage;

    @BeforeEach
    void setUp() {
        sampleUser = User.builder()
                .id(1L)
                .username("garage_owner")
                .role(Role.GARAGE_OWNER)
                .build();

        sampleGarage = Garage.builder()
                .id(10L)
                .owner(sampleUser)
                .garageName("Gara Thần Tốc")
                .status(GarageStatus.APPROVED)
                .build();
    }

    @Test
    @DisplayName("UC-06: Thêm dịch vụ cứu hộ mới hợp lệ và tự động tính dải giá mặc định")
    void createServiceItem_Success() {
        when(garageRepository.findByOwnerId(sampleUser.getId())).thenReturn(Optional.of(sampleGarage));
        when(serviceItemRepository.existsByGarageIdAndServiceNameIgnoreCaseAndApplicableVehicleTypeAndDeletedFalse(
                eq(10L), eq("Sấy bugi xả buồng đốt"), eq(ApplicableVehicleType.ALL)))
                .thenReturn(false);

        when(priceCeilingService.findMaxAllowedPrice(eq(ServiceType.REPAIR_ONSITE), eq("BUG_XUC"), eq(ItemCategoryType.LABOR)))
                .thenReturn(Optional.of(new BigDecimal("100000")));

        ServiceItemDto inputDto = ServiceItemDto.builder()
                .serviceName("Sấy bugi xả buồng đốt")
                .serviceType(ServiceType.REPAIR_ONSITE)
                .category("BUG_XUC")
                .itemCategoryType(ItemCategoryType.LABOR)
                .applicableVehicleType(ApplicableVehicleType.ALL)
                .standardPrice(new BigDecimal("70000"))
                .active(true)
                .build();

        when(serviceItemRepository.save(any(ServiceItem.class))).thenAnswer(invocation -> {
            ServiceItem item = invocation.getArgument(0);
            item.setId(55L);
            return item;
        });

        ServiceItemDto result = pricingService.createServiceItem(sampleUser, inputDto);

        assertNotNull(result);
        assertEquals(55L, result.getId());
        assertEquals("Sấy bugi xả buồng đốt", result.getServiceName());
        assertEquals(new BigDecimal("70000"), result.getStandardPrice());
        assertEquals(new BigDecimal("56000.0"), result.getMinPrice());
        assertEquals(new BigDecimal("91000.0"), result.getMaxPrice());
        assertFalse(result.isDeleted());
        assertTrue(result.isActive());

        verify(priceCeilingService, times(1))
                .validatePriceAgainstCeiling(eq(ServiceType.REPAIR_ONSITE), eq("BUG_XUC"), eq(ItemCategoryType.LABOR), eq(new BigDecimal("70000")), anyString());
    }

    @Test
    @DisplayName("BR-PRICE-001: Chặn thêm dịch vụ nếu đơn giá vượt quá giá trần của Admin")
    void createServiceItem_ThrowsException_WhenPriceExceedsCeiling() {
        when(garageRepository.findByOwnerId(sampleUser.getId())).thenReturn(Optional.of(sampleGarage));
        when(serviceItemRepository.existsByGarageIdAndServiceNameIgnoreCaseAndApplicableVehicleTypeAndDeletedFalse(
                eq(10L), eq("Sấy bugi xả buồng đốt"), eq(ApplicableVehicleType.ALL)))
                .thenReturn(false);

        doThrow(new BadRequestException("Vượt quá giá trần của sàn"))
                .when(priceCeilingService).validatePriceAgainstCeiling(
                        any(), any(), any(), eq(new BigDecimal("150000")), anyString());

        ServiceItemDto inputDto = ServiceItemDto.builder()
                .serviceName("Sấy bugi xả buồng đốt")
                .serviceType(ServiceType.REPAIR_ONSITE)
                .category("BUG_XUC")
                .itemCategoryType(ItemCategoryType.LABOR)
                .applicableVehicleType(ApplicableVehicleType.ALL)
                .standardPrice(new BigDecimal("150000"))
                .build();

        assertThrows(BadRequestException.class, () -> pricingService.createServiceItem(sampleUser, inputDto));
        verify(serviceItemRepository, never()).save(any());
    }

    @Test
    @DisplayName("BR-PRICE-002: Chặn thêm dịch vụ nếu dải giá minPrice > standardPrice")
    void createServiceItem_ThrowsException_WhenPriceRangeInvalid() {
        when(garageRepository.findByOwnerId(sampleUser.getId())).thenReturn(Optional.of(sampleGarage));

        ServiceItemDto inputDto = ServiceItemDto.builder()
                .serviceName("Thay nhớt xe ga")
                .serviceType(ServiceType.REPAIR_ONSITE)
                .category("THAY_NHOT")
                .standardPrice(new BigDecimal("100000"))
                .minPrice(new BigDecimal("120000")) // Sai: min > standard
                .maxPrice(new BigDecimal("150000"))
                .build();

        assertThrows(BadRequestException.class, () -> pricingService.createServiceItem(sampleUser, inputDto));
    }

    @Test
    @DisplayName("BR-PRICE-003: Xóa dịch vụ áp dụng Soft Delete tuyệt đối không gọi repository.delete")
    void deleteServiceItem_PerformsSafeSoftDelete() {
        when(garageRepository.findByOwnerId(sampleUser.getId())).thenReturn(Optional.of(sampleGarage));

        ServiceItem existingItem = ServiceItem.builder()
                .id(77L)
                .garage(sampleGarage)
                .serviceName("Dịch vụ cũ")
                .active(true)
                .deleted(false)
                .build();

        when(serviceItemRepository.findById(77L)).thenReturn(Optional.of(existingItem));

        pricingService.deleteServiceItem(sampleUser, 77L);

        // Đảm bảo cờ soft delete được bật và active tắt
        assertTrue(existingItem.isDeleted());
        assertFalse(existingItem.isActive());

        // Đảm bảo gọi save() để lưu trạng thái soft delete
        verify(serviceItemRepository, times(1)).save(existingItem);
        // Tuyệt đối KHÔNG gọi delete() làm hỏng khóa ngoại
        verify(serviceItemRepository, never()).delete(any());
    }

    @Test
    @DisplayName("UC-06: Danh sách dịch vụ trả về cho chủ Gara chỉ chứa các dịch vụ chưa bị xóa (deleted = false)")
    void getServicesByCurrentUser_ReturnsOnlyNonDeletedServices() {
        when(garageRepository.findByOwnerId(sampleUser.getId())).thenReturn(Optional.of(sampleGarage));

        ServiceItem activeItem = ServiceItem.builder()
                .id(1L)
                .garage(sampleGarage)
                .serviceName("Sấy bugi")
                .standardPrice(new BigDecimal("70000"))
                .deleted(false)
                .active(true)
                .build();

        when(serviceItemRepository.findByGarageIdAndDeletedFalseOrderByCreatedAtAsc(10L))
                .thenReturn(List.of(activeItem));

        List<ServiceItemDto> results = pricingService.getServicesByCurrentUser(sampleUser);

        assertEquals(1, results.size());
        assertEquals("Sấy bugi", results.get(0).getServiceName());
        assertFalse(results.get(0).isDeleted());
    }
}
