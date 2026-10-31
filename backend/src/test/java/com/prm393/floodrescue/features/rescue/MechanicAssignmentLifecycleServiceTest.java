package com.prm393.floodrescue.features.rescue;

import com.prm393.floodrescue.features.auth.entity.Role;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStaff;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStatus;
import com.prm393.floodrescue.features.mechanic.repository.MechanicStaffRepository;
import com.prm393.floodrescue.features.rescue.entity.RescueOrder;
import com.prm393.floodrescue.features.rescue.repository.RescueOrderRepository;
import com.prm393.floodrescue.features.rescue.service.MechanicAssignmentLifecycleService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MechanicAssignmentLifecycleServiceTest {
    @Mock RescueOrderRepository orderRepository;
    @Mock MechanicStaffRepository mechanicRepository;

    private MechanicAssignmentLifecycleService service;
    private MechanicStaff staff;
    private RescueOrder order;

    @BeforeEach
    void setUp() {
        service = new MechanicAssignmentLifecycleService(orderRepository, mechanicRepository);
        ReflectionTestUtils.setField(service, "heartbeatValidMinutes", 5);
        User user = User.builder().id(7L).username("mechanic_7").fullName("Mechanic 7")
                .role(Role.FIELD_MECHANIC).active(true).build();
        staff = MechanicStaff.builder().id(70L).user(user).workingStatus(MechanicStatus.BUSY).build();
        order = RescueOrder.builder().id(10L).orderCode("SOS-10").mechanicStaff(staff).build();
    }

    @Test
    void releasesFreshOnlineMechanicToAvailable() {
        LocalDateTime now = LocalDateTime.now();
        staff.setLastHeartbeatAt(now.minusMinutes(1));
        when(orderRepository.existsByMechanicStaffIdAndIdNotAndStatusIn(eq(70L), eq(10L), anyList()))
                .thenReturn(false);

        assertEquals(MechanicStatus.AVAILABLE, service.releaseIfNoOtherActiveOrder(order, now));
        assertEquals(MechanicStatus.AVAILABLE, staff.getWorkingStatus());
        verify(mechanicRepository).save(staff);
    }

    @Test
    void releasesStaleMechanicToOffline() {
        LocalDateTime now = LocalDateTime.now();
        staff.setLastHeartbeatAt(now.minusMinutes(10));
        when(orderRepository.existsByMechanicStaffIdAndIdNotAndStatusIn(eq(70L), eq(10L), anyList()))
                .thenReturn(false);

        assertEquals(MechanicStatus.OFFLINE, service.releaseIfNoOtherActiveOrder(order, now));
        assertEquals(MechanicStatus.OFFLINE, staff.getWorkingStatus());
        verify(mechanicRepository).save(staff);
    }

    @Test
    void keepsMechanicBusyWhenAnotherActiveOrderExists() {
        when(orderRepository.existsByMechanicStaffIdAndIdNotAndStatusIn(eq(70L), eq(10L), anyList()))
                .thenReturn(true);

        assertEquals(MechanicStatus.BUSY,
                service.releaseIfNoOtherActiveOrder(order, LocalDateTime.now()));
        assertEquals(MechanicStatus.BUSY, staff.getWorkingStatus());
        verify(mechanicRepository, never()).save(any());
    }
}
