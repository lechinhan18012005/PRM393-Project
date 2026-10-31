package com.prm393.floodrescue.common.utils;

import java.util.regex.Pattern;

/**
 * Tiện ích chuẩn hóa và xác thực số điện thoại di động Việt Nam.
 * Hỗ trợ định dạng 0xxxxxxxxx hoặc +84xxxxxxxxx và chuyển đổi về dạng chuẩn 0xxxxxxxxx (10 chữ số).
 */
public final class PhoneUtils {

    // Regex đầu số di động hợp lệ tại Việt Nam: 03x, 05x, 07x, 08x, 09x (tổng 10 số)
    private static final Pattern VIETNAMESE_MOBILE_PATTERN =
            Pattern.compile("^0(3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$");

    private static final Pattern BROAD_MOBILE_PATTERN =
            Pattern.compile("^0[35789][0-9]{8}$");

    private PhoneUtils() {}

    /**
     * Chuẩn hóa số điện thoại: loại bỏ khoảng trắng, dấu gạch nối, dấu chấm và đổi +84 thành 0.
     *
     * @param rawPhone Chuỗi số điện thoại thô nhập từ người dùng
     * @return Số điện thoại dạng chuẩn 0xxxxxxxxx, hoặc null nếu input null/rỗng
     */
    public static String normalize(String rawPhone) {
        if (rawPhone == null) {
            return null;
        }
        String cleaned = rawPhone.trim().replaceAll("[\\s.\\-()]", "");
        if (cleaned.isEmpty()) {
            return null;
        }
        if (cleaned.startsWith("+84")) {
            cleaned = "0" + cleaned.substring(3);
        } else if (cleaned.startsWith("84") && cleaned.length() == 11) {
            cleaned = "0" + cleaned.substring(2);
        }
        return cleaned;
    }

    /**
     * Kiểm tra số điện thoại có phải là số di động Việt Nam hợp lệ (10 chữ số, đầu mạng 03, 05, 07, 08, 09).
     *
     * @param phone Chuỗi số điện thoại (chấp nhận cả thô hoặc đã chuẩn hóa)
     * @return true nếu hợp lệ
     */
    public static boolean isValidVietnamesePhone(String phone) {
        String normalized = normalize(phone);
        if (normalized == null) {
            return false;
        }
        return BROAD_MOBILE_PATTERN.matcher(normalized).matches();
    }
}
