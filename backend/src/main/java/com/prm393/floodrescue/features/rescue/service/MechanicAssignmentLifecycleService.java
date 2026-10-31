package com.prm393.floodrescue.features.rescue.service;

import com.prm393.floodrescue.features.mechanic.entity.MechanicStaff;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStatus;
import com.prm393.floodrescue.features.mechanic.repository.MechanicStaffRepository;
import com.prm393.floodrescue.features.rescue.entity.RescueOrder;
import com.prm393.floodrescue.features.rescue.entity.RescueOrderStatus;
import com.prm393.floodrescue.features.rescue.repository.RescueOrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class MechanicAssignmentLifecycleService {
    private static final List<RescueOrderStatus> OCCUPYING_STATUSES = List.of(
            RescueOrderStatus.REQUESTED,
            RescueOrderStatus.DISPATCHED,
            RescueOrderStatus.ARRIVED,
            RescueOrderStatus.IN_PROGRESS
    );

    private final RescueOrderRepository orderRepository;
    private final MechanicStaffRepository mechanicRepository;

    @Value("${app.rescue.heartbeat-valid-minutes:5}")
    private int heartbeatValidMinutes;

    /**
     * Releases the assigned mechanic after an order no longer occupies them.
     * PAYMENT_PENDING and COMPLETED orders do not keep a mechanic BUSY.
     */
    @Transactional
    public MechanicStatus releaseIfNoOtherActiveOrder(RescueOrder order, LocalDateTime releasedAt) {
        if (order == null || order.getId() == null || order.getMechanicStaff() == null) {
            return null;
        }

        MechanicStaff staff = order.getMechanicStaff();
        boolean hasOtherActiveOrder = orderRepository
                .existsByMechanicStaffIdAndIdNotAndStatusIn(
                        staff.getId(), order.getId(), OCCUPYING_STATUSES);

        if (hasOtherActiveOrder) {
            log.info("Mechanic {} remains BUSY because another active order exists",
                    staff.getUser().getUsername());
            return staff.getWorkingStatus();
        }

        LocalDateTime threshold = releasedAt.minusMinutes(heartbeatValidMinutes);
        boolean heartbeatFresh = staff.getLastHeartbeatAt() != null
                && staff.getLastHeartbeatAt().isAfter(threshold);
        MechanicStatus releasedStatus = staff.getUser().isActive() && heartbeatFresh
                ? MechanicStatus.AVAILABLE
                : MechanicStatus.OFFLINE;

        staff.setWorkingStatus(releasedStatus);
        mechanicRepository.save(staff);
        log.info("Mechanic {} released after order {} to status {}",
                staff.getUser().getUsername(), order.getOrderCode(), releasedStatus);
        return releasedStatus;
    }
}
