package com.prm393.floodrescue.features.rescue.entity;

public enum RescueOfferStatus {
    PENDING,    // Đang chờ thợ phản hồi (trong 45 giây)
    ACCEPTED,   // Thợ đã nhận đơn
    REJECTED,   // Thợ từ chối đơn
    EXPIRED,    // Quá 45 giây không phản hồi
    CANCELLED   // Bị hủy vì khách hủy đơn hoặc thợ khác đã nhận
}
