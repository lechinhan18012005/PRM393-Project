class CrossingOptionModel {
  final int garageId;
  final String garageName;
  final String? garagePhone;
  final int? branchId;
  final String? branchName;
  final String? branchAddress;
  final double? branchLatitude;
  final double? branchLongitude;
  final int serviceItemId;
  final String serviceName;
  final String? description;
  final double serviceBasePrice;
  final double bookingFee;
  final double totalAmount;
  final String currency;
  final int estimatedTimeMin;
  final int availableMechanicCount;

  CrossingOptionModel({
    required this.garageId,
    required this.garageName,
    this.garagePhone,
    this.branchId,
    this.branchName,
    this.branchAddress,
    this.branchLatitude,
    this.branchLongitude,
    required this.serviceItemId,
    required this.serviceName,
    this.description,
    required this.serviceBasePrice,
    required this.bookingFee,
    required this.totalAmount,
    required this.currency,
    required this.estimatedTimeMin,
    required this.availableMechanicCount,
  });

  factory CrossingOptionModel.fromJson(Map<String, dynamic> json) {
    return CrossingOptionModel(
      garageId: json['garageId'] as int,
      garageName: json['garageName'] as String? ?? 'Gara Cứu Hộ',
      garagePhone: json['garagePhone'] as String?,
      branchId: json['branchId'] as int?,
      branchName: json['branchName'] as String?,
      branchAddress: json['branchAddress'] as String?,
      branchLatitude: (json['branchLatitude'] as num?)?.toDouble(),
      branchLongitude: (json['branchLongitude'] as num?)?.toDouble(),
      serviceItemId: json['serviceItemId'] as int,
      serviceName: json['serviceName'] as String? ?? 'Chở xe qua ngập',
      description: json['description'] as String?,
      serviceBasePrice: (json['serviceBasePrice'] as num?)?.toDouble() ?? 120000.0,
      bookingFee: (json['bookingFee'] as num?)?.toDouble() ?? 30000.0,
      totalAmount: (json['totalAmount'] as num?)?.toDouble() ?? 150000.0,
      currency: json['currency'] as String? ?? 'VND',
      estimatedTimeMin: json['estimatedTimeMin'] as int? ?? 20,
      availableMechanicCount: json['availableMechanicCount'] as int? ?? 1,
    );
  }
}

class RescueOrderModel {
  final int id;
  final String orderCode;
  final String orderType;
  final String status;

  // Khách hàng
  final int customerId;
  final String customerName;
  final String? customerPhone;
  final String? customerAvatar;

  // Thợ
  final int? mechanicStaffId;
  final int? mechanicUserId;
  final String? mechanicName;
  final String? mechanicPhone;
  final String? mechanicAvatar;
  final double? mechanicRating;
  final String? mechanicSpeciality;
  final double? mechanicCurrentLatitude;
  final double? mechanicCurrentLongitude;

  // Gara & Chi nhánh
  final int garageId;
  final String garageName;
  final String? garagePhone;
  final int? branchId;
  final String? branchName;
  final String? branchAddress;

  // Dịch vụ
  final int serviceItemId;
  final String serviceName;

  // Xe cá nhân
  final int? vehicleId;
  final String vehiclePlate;
  final String? vehicleModel;
  final String? vehicleType;

  // Điểm đón & trả
  final String pickupAddress;
  final double pickupLatitude;
  final double pickupLongitude;
  final String dropoffAddress;
  final double dropoffLatitude;
  final double dropoffLongitude;

  // Giá snapshot
  final double serviceBasePrice;
  final double bookingFee;
  final double totalAmount;
  final String currency;

  final String? waterLevel;
  final String? customerNotes;

  // Tiến độ vận chuyển
  final String transportStage;
  final String? transportNote;

  // Nghiệm thu
  final String? completionPhotoUrl;
  final String? handoverPhotoUrl;
  final String? completionNotes;

  // Timestamps
  final String? requestedAt;
  final String? acceptedAt;
  final String? arrivedAt;
  final String? serviceStartedAt;
  final String? serviceCompletedAt;
  final String? cancelledAt;
  final String? cancelReason;
  final String? supportHotline;

  // Thanh toán
  final String? paidAt;
  final String? paymentMethod;
  final int? paymentTransactionId;
  final int? paymentOrderCode;

  RescueOrderModel({
    required this.id,
    required this.orderCode,
    required this.orderType,
    required this.status,
    required this.customerId,
    required this.customerName,
    this.customerPhone,
    this.customerAvatar,
    this.mechanicStaffId,
    this.mechanicUserId,
    this.mechanicName,
    this.mechanicPhone,
    this.mechanicAvatar,
    this.mechanicRating,
    this.mechanicSpeciality,
    this.mechanicCurrentLatitude,
    this.mechanicCurrentLongitude,
    required this.garageId,
    required this.garageName,
    this.garagePhone,
    this.branchId,
    this.branchName,
    this.branchAddress,
    required this.serviceItemId,
    required this.serviceName,
    this.vehicleId,
    required this.vehiclePlate,
    this.vehicleModel,
    this.vehicleType,
    required this.pickupAddress,
    required this.pickupLatitude,
    required this.pickupLongitude,
    required this.dropoffAddress,
    required this.dropoffLatitude,
    required this.dropoffLongitude,
    required this.serviceBasePrice,
    required this.bookingFee,
    required this.totalAmount,
    required this.currency,
    this.waterLevel,
    this.customerNotes,
    required this.transportStage,
    this.transportNote,
    this.completionPhotoUrl,
    this.handoverPhotoUrl,
    this.completionNotes,
    this.requestedAt,
    this.acceptedAt,
    this.arrivedAt,
    this.serviceStartedAt,
    this.serviceCompletedAt,
    this.cancelledAt,
    this.cancelReason,
    this.supportHotline,
    this.paidAt,
    this.paymentMethod,
    this.paymentTransactionId,
    this.paymentOrderCode,
  });

  factory RescueOrderModel.fromJson(Map<String, dynamic> json) {
    return RescueOrderModel(
      id: json['id'] as int,
      orderCode: json['orderCode'] as String? ?? 'SOS-UNKNOWN',
      orderType: json['orderType'] as String? ?? 'SINGLE_CROSSING',
      status: json['status'] as String? ?? 'REQUESTED',
      customerId: json['customerId'] as int,
      customerName: json['customerName'] as String? ?? 'Khách hàng',
      customerPhone: json['customerPhone'] as String?,
      customerAvatar: json['customerAvatar'] as String?,
      mechanicStaffId: json['mechanicStaffId'] as int?,
      mechanicUserId: json['mechanicUserId'] as int?,
      mechanicName: json['mechanicName'] as String?,
      mechanicPhone: json['mechanicPhone'] as String?,
      mechanicAvatar: json['mechanicAvatar'] as String?,
      mechanicRating: (json['mechanicRating'] as num?)?.toDouble(),
      mechanicSpeciality: json['mechanicSpeciality'] as String?,
      mechanicCurrentLatitude: (json['mechanicCurrentLatitude'] as num?)?.toDouble(),
      mechanicCurrentLongitude: (json['mechanicCurrentLongitude'] as num?)?.toDouble(),
      garageId: json['garageId'] as int,
      garageName: json['garageName'] as String? ?? 'Gara cứu hộ',
      garagePhone: json['garagePhone'] as String?,
      branchId: json['branchId'] as int?,
      branchName: json['branchName'] as String?,
      branchAddress: json['branchAddress'] as String?,
      serviceItemId: json['serviceItemId'] as int,
      serviceName: json['serviceName'] as String? ?? 'Chở xe qua ngập',
      vehicleId: json['vehicleId'] as int?,
      vehiclePlate: json['vehiclePlate'] as String? ?? '59-XX',
      vehicleModel: json['vehicleModel'] as String?,
      vehicleType: json['vehicleType'] as String?,
      pickupAddress: json['pickupAddress'] as String? ?? '',
      pickupLatitude: (json['pickupLatitude'] as num?)?.toDouble() ?? 0.0,
      pickupLongitude: (json['pickupLongitude'] as num?)?.toDouble() ?? 0.0,
      dropoffAddress: json['dropoffAddress'] as String? ?? '',
      dropoffLatitude: (json['dropoffLatitude'] as num?)?.toDouble() ?? 0.0,
      dropoffLongitude: (json['dropoffLongitude'] as num?)?.toDouble() ?? 0.0,
      serviceBasePrice: (json['serviceBasePrice'] as num?)?.toDouble() ?? 120000.0,
      bookingFee: (json['bookingFee'] as num?)?.toDouble() ?? 30000.0,
      totalAmount: (json['totalAmount'] as num?)?.toDouble() ?? 150000.0,
      currency: json['currency'] as String? ?? 'VND',
      waterLevel: json['waterLevel'] as String?,
      customerNotes: json['customerNotes'] as String?,
      transportStage: json['transportStage'] as String? ?? 'NONE',
      transportNote: json['transportNote'] as String?,
      completionPhotoUrl: json['completionPhotoUrl'] as String?,
      handoverPhotoUrl: json['handoverPhotoUrl'] as String?,
      completionNotes: json['completionNotes'] as String?,
      requestedAt: json['requestedAt'] as String?,
      acceptedAt: json['acceptedAt'] as String?,
      arrivedAt: json['arrivedAt'] as String?,
      serviceStartedAt: json['serviceStartedAt'] as String?,
      serviceCompletedAt: json['serviceCompletedAt'] as String?,
      cancelledAt: json['cancelledAt'] as String?,
      cancelReason: json['cancelReason'] as String?,
      supportHotline: json['supportHotline'] as String? ?? '1900-6868',
      paidAt: json['paidAt'] as String?,
      paymentMethod: json['paymentMethod'] as String?,
      paymentTransactionId: (json['paymentTransactionId'] as num?)?.toInt(),
      paymentOrderCode: (json['paymentOrderCode'] as num?)?.toInt(),
    );
  }

  bool get isRequested => status == 'REQUESTED' || status == 'SEARCHING';
  bool get isDispatched => status == 'DISPATCHED';
  bool get isArrived => status == 'ARRIVED';
  bool get isInProgress => status == 'IN_PROGRESS';
  bool get isPaymentPending => status == 'PAYMENT_PENDING';
  bool get isCompleted => status == 'COMPLETED';
  bool get isCancelled => status == 'CANCELLED';

  bool get isActive =>
      isRequested ||
      isDispatched ||
      isArrived ||
      isInProgress ||
      isPaymentPending;

  String get statusDescription {
    switch (status) {
      case 'REQUESTED':
      case 'SEARCHING':
        return 'Đang tìm thợ cứu hộ';
      case 'DISPATCHED':
        return 'Thợ đã tiếp nhận, đang di chuyển đến';
      case 'ARRIVED':
        return 'Thợ đã có mặt tại điểm đón';
      case 'IN_PROGRESS':
        return 'Đang chở xe qua điểm ngập';
      case 'PAYMENT_PENDING':
        return 'Chờ thanh toán';
      case 'COMPLETED':
        return 'Đã hoàn thành cứu hộ';
      case 'CANCELLED':
        return 'Đã hủy yêu cầu';
      case 'DISPATCH_FAILED':
        return 'Không tìm thấy thợ phù hợp';
      default:
        return status;
    }
  }
}

class TrackingSnapshotModel {
  final int orderId;
  final String orderCode;
  final String status;
  final String transportStage;
  final double? mechanicLatitude;
  final double? mechanicLongitude;
  final double? mechanicBearing;
  final double? distanceToTargetMeters;
  final int? estimatedMinutes;
  final String targetType;
  final String targetAddress;
  final double? targetLatitude;
  final double? targetLongitude;
  final String? lastGpsUpdatedAt;
  final bool isStale;
  final String statusMessage;

  TrackingSnapshotModel({
    required this.orderId,
    required this.orderCode,
    required this.status,
    required this.transportStage,
    this.mechanicLatitude,
    this.mechanicLongitude,
    this.mechanicBearing,
    this.distanceToTargetMeters,
    this.estimatedMinutes,
    required this.targetType,
    required this.targetAddress,
    this.targetLatitude,
    this.targetLongitude,
    this.lastGpsUpdatedAt,
    required this.isStale,
    required this.statusMessage,
  });

  factory TrackingSnapshotModel.fromJson(Map<String, dynamic> json) {
    return TrackingSnapshotModel(
      orderId: json['orderId'] as int,
      orderCode: json['orderCode'] as String? ?? '',
      status: json['status'] as String? ?? '',
      transportStage: json['transportStage'] as String? ?? 'NONE',
      mechanicLatitude: (json['mechanicLatitude'] as num?)?.toDouble(),
      mechanicLongitude: (json['mechanicLongitude'] as num?)?.toDouble(),
      mechanicBearing: (json['mechanicBearing'] as num?)?.toDouble(),
      distanceToTargetMeters: (json['distanceToTargetMeters'] as num?)?.toDouble(),
      estimatedMinutes: json['estimatedMinutes'] as int?,
      targetType: json['targetType'] as String? ?? 'PICKUP',
      targetAddress: json['targetAddress'] as String? ?? '',
      targetLatitude: (json['targetLatitude'] as num?)?.toDouble(),
      targetLongitude: (json['targetLongitude'] as num?)?.toDouble(),
      lastGpsUpdatedAt: json['lastGpsUpdatedAt'] as String?,
      isStale: json['isStale'] as bool? ?? false,
      statusMessage: json['statusMessage'] as String? ?? '',
    );
  }
}

class RescueOfferModel {
  final int offerId;
  final int orderId;
  final String orderCode;
  final String orderType;
  final String status;
  final String customerName;
  final String? customerPhone;
  final String? customerAvatar;
  final String vehiclePlate;
  final String? vehicleModel;
  final String? vehicleType;
  final String? waterLevel;
  final String pickupAddress;
  final double pickupLatitude;
  final double pickupLongitude;
  final String dropoffAddress;
  final double dropoffLatitude;
  final double dropoffLongitude;
  final double totalAmount;
  final double distanceMeters;
  final String? offeredAt;
  final String? expiresAt;
  final int secondsRemaining;

  RescueOfferModel({
    required this.offerId,
    required this.orderId,
    required this.orderCode,
    required this.orderType,
    required this.status,
    required this.customerName,
    this.customerPhone,
    this.customerAvatar,
    required this.vehiclePlate,
    this.vehicleModel,
    this.vehicleType,
    this.waterLevel,
    required this.pickupAddress,
    required this.pickupLatitude,
    required this.pickupLongitude,
    required this.dropoffAddress,
    required this.dropoffLatitude,
    required this.dropoffLongitude,
    required this.totalAmount,
    required this.distanceMeters,
    this.offeredAt,
    this.expiresAt,
    required this.secondsRemaining,
  });

  factory RescueOfferModel.fromJson(Map<String, dynamic> json) {
    return RescueOfferModel(
      offerId: json['offerId'] as int,
      orderId: json['orderId'] as int,
      orderCode: json['orderCode'] as String? ?? '',
      orderType: json['orderType'] as String? ?? 'SINGLE_CROSSING',
      status: json['status'] as String? ?? 'PENDING',
      customerName: json['customerName'] as String? ?? 'Khách hàng',
      customerPhone: json['customerPhone'] as String?,
      customerAvatar: json['customerAvatar'] as String?,
      vehiclePlate: json['vehiclePlate'] as String? ?? '',
      vehicleModel: json['vehicleModel'] as String?,
      vehicleType: json['vehicleType'] as String?,
      waterLevel: json['waterLevel'] as String?,
      pickupAddress: json['pickupAddress'] as String? ?? '',
      pickupLatitude: (json['pickupLatitude'] as num?)?.toDouble() ?? 0.0,
      pickupLongitude: (json['pickupLongitude'] as num?)?.toDouble() ?? 0.0,
      dropoffAddress: json['dropoffAddress'] as String? ?? '',
      dropoffLatitude: (json['dropoffLatitude'] as num?)?.toDouble() ?? 0.0,
      dropoffLongitude: (json['dropoffLongitude'] as num?)?.toDouble() ?? 0.0,
      totalAmount: (json['totalAmount'] as num?)?.toDouble() ?? 150000.0,
      distanceMeters: (json['distanceMeters'] as num?)?.toDouble() ?? 0.0,
      offeredAt: json['offeredAt'] as String?,
      expiresAt: json['expiresAt'] as String?,
      secondsRemaining: json['secondsRemaining'] as int? ?? 45,
    );
  }
}
