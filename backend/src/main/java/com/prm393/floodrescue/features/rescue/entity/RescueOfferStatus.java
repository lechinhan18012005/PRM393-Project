package com.prm393.floodrescue.features.rescue.entity;

public enum RescueOfferStatus {
    PENDING,    // Đang chờ thợ phản hồi (trong 2 phút)
    ACCEPTED,   // Thợ đã nhận đơn
    REJECTED,   // Thợ từ chối đơn
    EXPIRED,    // Quá 2 phút không phản hồi
    CANCELLED   // Bị hủy vì khách hủy đơn hoặc thợ khác đã nhận
}
