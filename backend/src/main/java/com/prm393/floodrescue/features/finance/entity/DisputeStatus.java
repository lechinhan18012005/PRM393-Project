package com.prm393.floodrescue.features.finance.entity;

public enum DisputeStatus {
    STAFF_REVIEW,     // Khách vừa gửi khiếu nại (hoặc Admin yêu cầu xác minh lại), chờ Staff thẩm tra (UC-23)
    ADMIN_APPROVAL,   // Staff đã lập biên bản xác nhận vi phạm và đề xuất hoàn tiền, chờ Admin quyết định (UC-27)
    REFUNDED,         // Admin đã phê duyệt và hoàn tiền thành công (UC-27)
    REJECTED          // Khiếu nại bị bác bỏ (bởi Staff hoặc Admin)
}
