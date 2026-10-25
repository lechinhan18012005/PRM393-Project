package com.prm393.floodrescue.features.rescue.entity;

import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.garage.entity.Garage;
import com.prm393.floodrescue.features.garage.entity.GarageBranch;
import com.prm393.floodrescue.features.garage.entity.ServiceItem;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStaff;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "rescue_orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RescueOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_code", nullable = false, unique = true, length = 50)
    private String orderCode;

    @Column(name = "client_request_id", length = 100)
    private String clientRequestId;

    @Column(name = "request_payload_hash", length = 64)
    private String requestPayloadHash;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private User customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mechanic_staff_id")
    private MechanicStaff mechanicStaff;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "garage_id", nullable = false)
    private Garage garage;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id")
    private GarageBranch branch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_item_id", nullable = false)
    private ServiceItem serviceItem;

    @Enumerated(EnumType.STRING)
    @Column(name = "order_type", nullable = false, length = 30)
    @Builder.Default
    private OrderType orderType = OrderType.SINGLE_CROSSING;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private RescueOrderStatus status = RescueOrderStatus.REQUESTED;

    // Vehicle Snapshot
    @Column(name = "vehicle_id")
    private Long vehicleId;

    @Column(name = "vehicle_plate", nullable = false, length = 30)
    private String vehiclePlate;

    @Column(name = "vehicle_model", length = 100)
    private String vehicleModel;

    @Column(name = "vehicle_type", length = 50)
    private String vehicleType;

    // Pickup Location
    @Column(name = "pickup_address", nullable = false, length = 255)
    private String pickupAddress;

    @Column(name = "pickup_latitude", nullable = false)
    private Double pickupLatitude;

    @Column(name = "pickup_longitude", nullable = false)
    private Double pickupLongitude;

    // Dropoff Location (Nơi khô ráo)
    @Column(name = "dropoff_address", nullable = false, length = 255)
    private String dropoffAddress;

    @Column(name = "dropoff_latitude", nullable = false)
    private Double dropoffLatitude;

    @Column(name = "dropoff_longitude", nullable = false)
    private Double dropoffLongitude;

    // Price Snapshots (BigDecimal)
    @Column(name = "service_base_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal serviceBasePrice;

    @Column(name = "booking_fee", nullable = false, precision = 12, scale = 2)
    private BigDecimal bookingFee;

    @Column(name = "total_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmount;

    @Column(length = 10)
    @Builder.Default
    private String currency = "VND";

    // Water level & notes
    @Column(name = "water_level", length = 50)
    private String waterLevel;

    @Column(name = "customer_notes", length = 500)
    private String customerNotes;

    // Transport Stage (Tiến độ chở xe)
    @Enumerated(EnumType.STRING)
    @Column(name = "transport_stage", nullable = false, length = 30)
    @Builder.Default
    private TransportStage transportStage = TransportStage.NONE;

    @Column(name = "transport_note", length = 500)
    private String transportNote;

    // Completion photos & handover
    @Column(name = "completion_photo_url", length = 500)
    private String completionPhotoUrl;

    @Column(name = "handover_photo_url", length = 500)
    private String handoverPhotoUrl;

    @Column(name = "completion_notes", length = 500)
    private String completionNotes;

    // Snapshot vị trí thợ tại thời điểm hoàn tất hoặc kết thúc đơn (bảo vệ quyền riêng tư C03)
    @Column(name = "final_mechanic_latitude")
    private Double finalMechanicLatitude;

    @Column(name = "final_mechanic_longitude")
    private Double finalMechanicLongitude;

    // Timestamps
    @Column(name = "requested_at", nullable = false)
    private LocalDateTime requestedAt;

    @Column(name = "accepted_at")
    private LocalDateTime acceptedAt;

    @Column(name = "arrived_at")
    private LocalDateTime arrivedAt;

    @Column(name = "service_started_at")
    private LocalDateTime serviceStartedAt;

    @Column(name = "service_completed_at")
    private LocalDateTime serviceCompletedAt;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "cancel_reason", length = 300)
    private String cancelReason;

    @Version
    private Long version;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.requestedAt == null) {
            this.requestedAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
