class ServiceItemModel {
  final int id;
  final String serviceName;
  final String? category;
  final String? serviceType;
  final String? itemCategoryType;
  final String? applicableVehicleType;
  final double standardPrice;
  final double? minPrice;
  final double? maxPrice;
  final String unit;
  final int estimatedTimeMin;
  final String? description;
  final bool active;
  final bool isDeleted;
  final double? adminCeilingSnapshot;
  final int warrantyDays;

  ServiceItemModel({
    required this.id,
    required this.serviceName,
    this.category,
    this.serviceType,
    this.itemCategoryType,
    this.applicableVehicleType,
    required this.standardPrice,
    this.minPrice,
    this.maxPrice,
    this.unit = 'lượt',
    this.estimatedTimeMin = 15,
    this.description,
    this.active = true,
    this.isDeleted = false,
    this.adminCeilingSnapshot,
    this.warrantyDays = 3,
  });

  factory ServiceItemModel.fromJson(Map<String, dynamic> json) {
    return ServiceItemModel(
      id: json['id'] is int ? json['id'] : int.parse(json['id'].toString()),
      serviceName: json['serviceName'] ?? '',
      category: json['category'],
      serviceType: json['serviceType'],
      itemCategoryType: json['itemCategoryType'],
      applicableVehicleType: json['applicableVehicleType'],
      standardPrice: (json['standardPrice'] as num?)?.toDouble() ?? 0.0,
      minPrice: (json['minPrice'] as num?)?.toDouble(),
      maxPrice: (json['maxPrice'] as num?)?.toDouble(),
      unit: json['unit'] ?? 'lượt',
      estimatedTimeMin: json['estimatedTimeMin'] is int ? json['estimatedTimeMin'] : 15,
      description: json['description'],
      active: json['active'] ?? true,
      isDeleted: json['deleted'] ?? json['isDeleted'] ?? false,
      adminCeilingSnapshot: (json['adminCeilingSnapshot'] as num?)?.toDouble(),
      warrantyDays: json['warrantyDays'] is int ? json['warrantyDays'] : 3,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'serviceName': serviceName,
      'category': category,
      'serviceType': serviceType,
      'itemCategoryType': itemCategoryType,
      'applicableVehicleType': applicableVehicleType,
      'standardPrice': standardPrice,
      'minPrice': minPrice,
      'maxPrice': maxPrice,
      'unit': unit,
      'estimatedTimeMin': estimatedTimeMin,
      'description': description,
      'active': active,
      'isDeleted': isDeleted,
      'adminCeilingSnapshot': adminCeilingSnapshot,
      'warrantyDays': warrantyDays,
    };
  }
}
