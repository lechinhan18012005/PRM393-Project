package com.prm393.floodrescue.common.security;

import com.prm393.floodrescue.common.exception.BadRequestException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Dịch vụ giới hạn tần suất yêu cầu (Rate Limiting) trượt thời gian (Sliding Window).
 * Ngăn chặn brute-force, spam lời mời và lạm dụng API kích hoạt tài khoản.
 */
@Service
@Slf4j
public class RateLimiterService {

    private final Map<String, Deque<Long>> requestLogs = new ConcurrentHashMap<>();

    /**
     * Kiểm tra và áp dụng giới hạn tần suất. Nếu vượt ngưỡng, ném BadRequestException.
     *
     * @param key           Khóa định danh (vd: IP, Email, GarageId + Action)
     * @param maxRequests   Số request tối đa trong cửa sổ thời gian
     * @param windowSeconds Độ dài cửa sổ thời gian tính theo giây
     * @param actionName    Tên hành động để thông báo lỗi rõ ràng
     */
    public synchronized void checkRateLimit(String key, int maxRequests, long windowSeconds, String actionName) {
        long now = Instant.now().toEpochMilli();
        long windowStart = now - (windowSeconds * 1000L);

        Deque<Long> timestamps = requestLogs.computeIfAbsent(key, k -> new ArrayDeque<>());

        // Loại bỏ các mốc thời gian ngoài cửa sổ
        while (!timestamps.isEmpty() && timestamps.peekFirst() < windowStart) {
            timestamps.pollFirst();
        }

        if (timestamps.size() >= maxRequests) {
            log.warn("Rate limit exceeded for key '{}' on action '{}' ({}/{} req in {}s)",
                    key, actionName, timestamps.size(), maxRequests, windowSeconds);
            throw new BadRequestException(String.format(
                    "Bạn đã gửi quá nhiều yêu cầu %s. Vui lòng chờ %d giây trước khi thử lại!",
                    actionName, windowSeconds));
        }

        timestamps.addLast(now);

        // Dọn dẹp map khi dung lượng lớn
        if (requestLogs.size() > 5000) {
            requestLogs.entrySet().removeIf(entry -> {
                Deque<Long> queue = entry.getValue();
                return queue.isEmpty() || queue.peekLast() < windowStart;
            });
        }
    }
}
