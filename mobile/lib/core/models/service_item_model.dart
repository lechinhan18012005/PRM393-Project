class ServiceItemModel {
  final int id;
  final String serviceName;
  final String? category;
  final String? serviceType;
  final double standardPrice;
  final double? minPrice;
  final double? maxPrice;
  final String unit;
  final int estimatedTimeMin;
  final String? description;
  final bool active;
  final int warrantyDays;

  ServiceItemModel({
    required this.id,
    required this.serviceName,
    this.category,
    this.serviceType,
    required this.standardPrice,
    this.minPrice,
    this.maxPrice,
    this.unit = 'lượt',
    this.estimatedTimeMin = 15,
    this.description,
    this.active = true,
    this.warrantyDays = 3,
  });

  factory ServiceItemModel.fromJson(Map<String, dynamic> json) {
    return ServiceItemModel(
      id: json['id'] is int ? json['id'] : int.parse(json['id'].toString()),
      serviceName: json['serviceName'] ?? '',
      category: json['category'],
      serviceType: json['serviceType'],
      standardPrice: (json['standardPrice'] as num?)?.toDouble() ?? 0.0,
      minPrice: (json['minPrice'] as num?)?.toDouble(),
      maxPrice: (json['maxPrice'] as num?)?.toDouble(),
      unit: json['unit'] ?? 'lượt',
      estimatedTimeMin: json['estimatedTimeMin'] is int ? json['estimatedTimeMin'] : 15,
      description: json['description'],
      active: json['active'] ?? true,
      warrantyDays: json['warrantyDays'] is int ? json['warrantyDays'] : 3,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'serviceName': serviceName,
      'category': category,
      'serviceType': serviceType,
      'standardPrice': standardPrice,
      'minPrice': minPrice,
      'maxPrice': maxPrice,
      'unit': unit,
      'estimatedTimeMin': estimatedTimeMin,
      'description': description,
      'active': active,
      'warrantyDays': warrantyDays,
    };
  }
}
