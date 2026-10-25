package com.prm393.floodrescue.features.rescue.entity;

public enum TransportStage {
    NONE,                   // Chưa bắt đầu chở
    VEHICLE_RECEIVED,       // Thợ đã tiếp nhận xe máy của khách
    STRAPPED_SECURE,        // Đã cố định chằng buộc an toàn trên xe cứu hộ
    IN_TRANSIT,             // Đang chở xe di chuyển qua đoạn đường ngập
    ARRIVED_DROPOFF,        // Đã tới điểm trả xe khô ráo an toàn
    HANDED_OVER,            // Đã bàn giao xe lại cho khách
    PAUSED_HIGH_WATER       // Tạm dừng do nước dâng nguy hiểm
}
