package com.prm393.floodrescue.features.quotation.service;

import com.prm393.floodrescue.features.auth.entity.Role;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.garage.entity.ServiceType;
import com.prm393.floodrescue.common.contracts.dto.GarageServiceSnapshot;
import com.prm393.floodrescue.common.contracts.dto.MechanicContextSnapshot;
import com.prm393.floodrescue.common.contracts.dto.OrderSnapshot;
import com.prm393.floodrescue.common.contracts.service.GarageCatalogLookup;
import com.prm393.floodrescue.common.contracts.service.RescueOrderCommands;
import com.prm393.floodrescue.common.contracts.service.RescueOrderLookup;
import com.prm393.floodrescue.features.quotation.dto.CreateQuotationItemRequest;
import com.prm393.floodrescue.features.quotation.dto.CreateQuotationRequest;
import com.prm393.floodrescue.features.quotation.entity.Quotation;
import com.prm393.floodrescue.features.quotation.repository.QuotationRepository;
import com.prm393.floodrescue.features.quotation.service.impl.QuotationServiceImpl;
import com.prm393.floodrescue.common.exception.BadRequestException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class QuotationServiceTest {
    @Mock QuotationRepository quotationRepository;
    @Mock GarageCatalogLookup garageCatalog;
    @Mock RescueOrderLookup orderLookup;
    @Mock RescueOrderCommands orderCommands;

    @Test
    void createUsesServerCatalogPriceAndUpdatesOrder() {
        QuotationServiceImpl service = new QuotationServiceImpl(quotationRepository, garageCatalog, orderLookup, orderCommands);
        User mechanicUser = User.builder().id(7L).role(Role.FIELD_MECHANIC).build();
        when(orderLookup.getRequiredOrder(10L)).thenReturn(OrderSnapshot.builder()
                .orderId(10L).mechanicUserId(7L).mechanicStaffId(70L).garageId(2L).branchId(3L)
                .status("ARRIVED").bookingFee(new BigDecimal("50000")).build());
        when(garageCatalog.getRequiredMechanicContext(7L)).thenReturn(MechanicContextSnapshot.builder()
                .userId(7L).mechanicStaffId(70L).garageId(2L).branchId(3L)
                .garageApproved(true).branchOpen(true).build());
        when(garageCatalog.getRequiredActiveService(5L, 2L)).thenReturn(GarageServiceSnapshot.builder()
                .serviceId(5L).garageId(2L).serviceName("Sấy bugi").serviceType(ServiceType.REPAIR_ONSITE)
                .standardPrice(new BigDecimal("70000")).minPrice(new BigDecimal("50000"))
                .maxPrice(new BigDecimal("90000")).active(true).build());
        when(quotationRepository.findFirstByOrderIdAndLatestTrue(10L)).thenReturn(Optional.empty());
        when(quotationRepository.save(any())).thenAnswer(invocation -> {
            Quotation q = invocation.getArgument(0);
            q.setId(99L);
            return q;
        });

        CreateQuotationItemRequest item = new CreateQuotationItemRequest();
        item.setServiceId(5L);
        item.setQuantity(2);
        CreateQuotationRequest request = new CreateQuotationRequest();
        request.setDiagnosis("Nước vào máy");
        request.setDiscountAmount(new BigDecimal("10000"));
        request.setItems(List.of(item));

        var result = service.create(10L, mechanicUser, request);

        assertThat(result.getSubtotalAmount()).isEqualByComparingTo("140000");
        assertThat(result.getTotalAmount()).isEqualByComparingTo("180000");
        assertThat(result.getVersion()).isEqualTo(1);
        verify(orderCommands).markWaitingForQuotationApproval(10L, 99L, new BigDecimal("180000"));
    }

    @Test
    void rejectsMixingOnsiteRepairAndTowingInOneQuotation() {
        QuotationServiceImpl service = new QuotationServiceImpl(
                quotationRepository, garageCatalog, orderLookup, orderCommands);
        User mechanicUser = User.builder().id(7L).role(Role.FIELD_MECHANIC).build();
        when(orderLookup.getRequiredOrder(10L)).thenReturn(OrderSnapshot.builder()
                .orderId(10L).mechanicUserId(7L).mechanicStaffId(70L)
                .garageId(2L).branchId(3L).status("ARRIVED")
                .bookingFee(BigDecimal.ZERO).build());
        when(garageCatalog.getRequiredMechanicContext(7L)).thenReturn(MechanicContextSnapshot.builder()
                .userId(7L).mechanicStaffId(70L).garageId(2L).branchId(3L)
                .garageApproved(true).branchOpen(true).build());
        when(garageCatalog.getRequiredActiveService(5L, 2L)).thenReturn(serviceItem(
                5L, "Sấy bugi", ServiceType.REPAIR_ONSITE, "70000"));
        when(garageCatalog.getRequiredActiveService(6L, 2L)).thenReturn(serviceItem(
                6L, "Kéo xe về garage", ServiceType.TOWING, "150000"));
        when(quotationRepository.findFirstByOrderIdAndLatestTrue(10L)).thenReturn(Optional.empty());

        CreateQuotationRequest request = new CreateQuotationRequest();
        request.setDiagnosis("Xe ngập nặng");
        request.setDiscountAmount(BigDecimal.ZERO);
        request.setItems(List.of(quotationItem(5L), quotationItem(6L)));

        assertThatThrownBy(() -> service.create(10L, mechanicUser, request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Không thể báo giá đồng thời");
        verify(quotationRepository, never()).save(any());
    }

    private GarageServiceSnapshot serviceItem(
            Long id, String name, ServiceType type, String price) {
        return GarageServiceSnapshot.builder()
                .serviceId(id).garageId(2L).serviceName(name).serviceType(type)
                .standardPrice(new BigDecimal(price)).active(true).build();
    }

    private CreateQuotationItemRequest quotationItem(Long serviceId) {
        CreateQuotationItemRequest item = new CreateQuotationItemRequest();
        item.setServiceId(serviceId);
        item.setQuantity(1);
        return item;
    }
}
