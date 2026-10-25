package com.prm393.floodrescue.features.rescue.worker;

import com.prm393.floodrescue.features.rescue.entity.RescueOffer;
import com.prm393.floodrescue.features.rescue.entity.RescueOfferStatus;
import com.prm393.floodrescue.features.rescue.repository.RescueOfferRepository;
import com.prm393.floodrescue.features.rescue.service.RescueDispatchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class RescueDispatchTimeoutWorker {

    private final RescueOfferRepository rescueOfferRepository;
    private final RescueDispatchService rescueDispatchService;

    /**
     * Quét định kỳ 5 giây các offer PENDING đã quá hạn 45 giây để chuyển EXPIRED và điều phối tiếp (B03)
     */
    @Scheduled(fixedDelay = 5000)
    public void processExpiredOffers() {
        LocalDateTime now = LocalDateTime.now();
        List<RescueOffer> expiredOffers = rescueOfferRepository.findByStatusAndExpiresAtBefore(RescueOfferStatus.PENDING, now);
        for (RescueOffer offer : expiredOffers) {
            try {
                rescueDispatchService.handleOfferTimeout(offer.getId());
            } catch (Exception e) {
                log.error("Lỗi khi xử lý timeout cho offer {}: {}", offer.getId(), e.getMessage());
            }
        }
    }
}
