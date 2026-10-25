package com.prm393.floodrescue.common.utils;

public final class GeoDistanceUtils {

    private static final double EARTH_RADIUS_METERS = 6371000.0;

    private GeoDistanceUtils() {}

    /**
     * Tính khoảng cách Haversine giữa 2 điểm GPS (đơn vị: mét)
     */
    public static double calculateDistanceMeters(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return EARTH_RADIUS_METERS * c;
    }

    /**
     * Ước tính thời gian di chuyển (phút) dựa trên khoảng cách.
     * Tốc độ trung bình thợ chở xe trong điều kiện mưa ngập: ~20 km/h (~333 m/phút), cộng 2 phút trễ.
     */
    public static int estimateArrivalMinutes(double distanceMeters) {
        if (distanceMeters <= 30) {
            return 0;
        }
        int minutes = (int) Math.ceil(distanceMeters / 333.0) + 2;
        return Math.max(1, minutes);
    }
}
