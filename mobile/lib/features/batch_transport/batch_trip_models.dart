import '../../core/models/rescue_order_model.dart';

class BatchTripModel {
  const BatchTripModel({
    required this.id,
    required this.garageId,
    required this.serviceItemId,
    required this.capacity,
    required this.currentVehicleCount,
    required this.pickupPlace,
    required this.destinationPlace,
    required this.fare,
    required this.status,
    required this.departureTime,
    required this.pickupLatitude,
    required this.pickupLongitude,
    required this.destinationLatitude,
    required this.destinationLongitude,
  });

  final int id;
  final int? garageId;
  final int? serviceItemId;
  final int capacity;
  final int currentVehicleCount;
  final String pickupPlace;
  final String destinationPlace;
  final double fare;
  final String status;
  final DateTime departureTime;
  final double pickupLatitude;
  final double pickupLongitude;
  final double destinationLatitude;
  final double destinationLongitude;

  int get availableSlots => capacity - currentVehicleCount;

  factory BatchTripModel.fromJson(Map<String, dynamic> json) => BatchTripModel(
    id: (json['id'] as num).toInt(),
    garageId: (json['garageId'] as num?)?.toInt(),
    serviceItemId: (json['serviceItemId'] as num?)?.toInt(),
    capacity: (json['capacity'] as num).toInt(),
    currentVehicleCount: (json['currentVehicleCount'] as num).toInt(),
    pickupPlace: json['pickupPlace'] as String? ?? '',
    destinationPlace:
        json['destinationPlace'] as String? ?? 'Điểm trả an toàn đã chọn',
    fare: (json['discountedPricePerVehicle'] as num).toDouble(),
    status: json['status'] as String? ?? '',
    departureTime: DateTime.parse(json['departureTime'] as String),
    pickupLatitude: (json['pickupLatitude'] as num).toDouble(),
    pickupLongitude: (json['pickupLongitude'] as num).toDouble(),
    destinationLatitude: (json['destinationLatitude'] as num).toDouble(),
    destinationLongitude: (json['destinationLongitude'] as num).toDouble(),
  );
}

class BatchJoinResult {
  const BatchJoinResult({required this.trip, required this.order});

  final BatchTripModel trip;
  final RescueOrderModel order;

  factory BatchJoinResult.fromJson(Map<String, dynamic> json) =>
      BatchJoinResult(
        trip: BatchTripModel.fromJson(json['trip'] as Map<String, dynamic>),
        order: RescueOrderModel.fromJson(json['order'] as Map<String, dynamic>),
      );
}

class BatchOrderModel {
  const BatchOrderModel({
    required this.id,
    required this.orderCode,
    required this.customerName,
    required this.vehiclePlate,
    required this.pickupAddress,
    required this.dropoffAddress,
    required this.status,
    required this.transportStage,
  });

  final int id;
  final String orderCode;
  final String customerName;
  final String vehiclePlate;
  final String pickupAddress;
  final String dropoffAddress;
  final String status;
  final String transportStage;

  bool get pickedUp => transportStage == 'VEHICLE_RECEIVED';
  bool get delivered => transportStage == 'HANDED_OVER';

  factory BatchOrderModel.fromJson(Map<String, dynamic> json) =>
      BatchOrderModel(
        id: (json['orderId'] as num).toInt(),
        orderCode: json['orderCode'] as String? ?? '',
        customerName: json['customerName'] as String? ?? '',
        vehiclePlate: json['vehiclePlate'] as String? ?? '',
        pickupAddress: json['pickupAddress'] as String? ?? '',
        dropoffAddress: json['dropoffAddress'] as String? ?? '',
        status: json['status'] as String? ?? '',
        transportStage: json['transportStage'] as String? ?? 'NONE',
      );
}
