package com.prm393.floodrescue.common.utils;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;

public final class DateTimeUtils {

    private DateTimeUtils() {}

    /**
     * Chuyển đổi linh hoạt chuỗi timestamp ISO-8601 sang Instant:
     * - Hỗ trợ chuẩn UTC có 'Z' (vd: 2026-10-24T09:57:31Z)
     * - Hỗ trợ chuẩn có múi giờ offset (vd: 2026-10-24T16:57:31+07:00)
     * - Hỗ trợ chuỗi LocalDateTime local (vd: 2026-10-24T16:57:31) theo múi giờ hệ thống
     */
    public static Instant parseFlexibleInstant(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        String s = text.trim();

        // 1. Thử parse Instant chuẩn (hỗ trợ chuỗi UTC có đuôi 'Z')
        try {
            return Instant.parse(s);
        } catch (DateTimeParseException ignored) {}

        // 2. Thử parse OffsetDateTime (hỗ trợ chuỗi có offset múi giờ +07:00)
        try {
            return OffsetDateTime.parse(s).toInstant();
        } catch (DateTimeParseException ignored) {}

        // 3. Thử parse LocalDateTime (chuỗi không có offset, quy về múi giờ mặc định của máy chủ)
        try {
            LocalDateTime ldt = LocalDateTime.parse(s);
            return ldt.atZone(ZoneId.systemDefault()).toInstant();
        } catch (DateTimeParseException ignored) {}

        throw new IllegalArgumentException("Không thể phân tích chuỗi thời gian sang Instant: " + text);
    }
}
