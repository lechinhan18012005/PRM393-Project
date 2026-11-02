class VehicleModel {
  final int id;
  final int? customerId;
  final String licensePlate;
  final String brand;
  final String model;
  final String vehicleType;
  final String? engineCapacity;
  final String? color;
  final bool isDefault;

  const VehicleModel({
    required this.id,
    this.customerId,
    required this.licensePlate,
    required this.brand,
    required this.model,
    required this.vehicleType,
    this.engineCapacity,
    this.color,
    this.isDefault = false,
  });

  String get displayName => '$brand $model'.trim();

  String get typeDisplayName {
    switch (vehicleType.toUpperCase()) {
      case 'SCOOTER':
        return 'Xe tay ga';
      case 'MANUAL':
        return 'Xe số';
      case 'CLUTCH':
        return 'Xe côn tay';
      case 'ELECTRIC':
        return 'Xe máy điện';
      default:
        return vehicleType;
    }
  }

  String get clearanceEstimate {
    switch (vehicleType.toUpperCase()) {
      case 'CLUTCH':
        return 'Cổ hút gió ước tính: 55 cm';
      case 'MANUAL':
        return 'Cổ hút gió ước tính: 40 cm';
      case 'ELECTRIC':
        return 'Độ chịu ngập chuẩn IP67: ~ 35 cm';
      case 'SCOOTER':
      default:
        return 'Cổ hút gió ước tính: 45 cm';
    }
  }

  factory VehicleModel.fromJson(Map<String, dynamic> json) => VehicleModel(
        id: json['id'] is int ? json['id'] : int.tryParse(json['id'].toString()) ?? 0,
        customerId: json['customerId'] != null
            ? (json['customerId'] is int
                ? json['customerId']
                : int.tryParse(json['customerId'].toString()))
            : null,
        licensePlate: json['licensePlate'] ?? '',
        brand: json['brand'] ?? '',
        model: json['model'] ?? '',
        vehicleType: json['vehicleType'] ?? 'SCOOTER',
        engineCapacity: json['engineCapacity'],
        color: json['color'],
        isDefault: json['isDefault'] ?? json['default'] ?? false,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        if (customerId != null) 'customerId': customerId,
        'licensePlate': licensePlate,
        'brand': brand,
        'model': model,
        'vehicleType': vehicleType,
        if (engineCapacity != null) 'engineCapacity': engineCapacity,
        if (color != null) 'color': color,
        'isDefault': isDefault,
      };

  VehicleModel copyWith({
    int? id,
    int? customerId,
    String? licensePlate,
    String? brand,
    String? model,
    String? vehicleType,
    String? engineCapacity,
    String? color,
    bool? isDefault,
  }) {
    return VehicleModel(
      id: id ?? this.id,
      customerId: customerId ?? this.customerId,
      licensePlate: licensePlate ?? this.licensePlate,
      brand: brand ?? this.brand,
      model: model ?? this.model,
      vehicleType: vehicleType ?? this.vehicleType,
      engineCapacity: engineCapacity ?? this.engineCapacity,
      color: color ?? this.color,
      isDefault: isDefault ?? this.isDefault,
    );
  }
}
