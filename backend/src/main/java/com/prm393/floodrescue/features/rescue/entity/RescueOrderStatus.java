package com.prm393.floodrescue.features.rescue.entity;

public enum RescueOrderStatus {
    REQUESTED,        // Khách vừa gửi yêu cầu SOS, đang tìm/điều phối thợ
    DISPATCHED,       // Thợ đã nhận cuốc, đang di chuyển tới điểm đón
    ARRIVED,          // Thợ đã tới điểm đón (< 30m)
    IN_PROGRESS,      // Đang thực hiện vận chuyển / chở xe
    PAYMENT_PENDING,  // Hoàn tất chở xe & nghiệm thu ảnh, chờ khách thanh toán (UC-18)
    CANCELLED,        // Đơn đã hủy (khách hủy trước khi có thợ nhận)
    DISPATCH_FAILED   // Hết thợ khả dụng hoặc hết thời gian điều phối
}
