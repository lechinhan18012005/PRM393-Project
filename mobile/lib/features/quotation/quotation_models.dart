class QuotationCatalogItem {
  const QuotationCatalogItem({
    required this.serviceId,
    required this.name,
    required this.price,
    this.description,
    this.type,
  });

  final int serviceId;
  final String name;
  final double price;
  final String? description;
  final String? type;

  factory QuotationCatalogItem.fromJson(Map<String, dynamic> json) =>
      QuotationCatalogItem(
        serviceId: (json['serviceId'] as num).toInt(),
        name: json['serviceName'] as String? ?? '',
        price: (json['standardPrice'] as num?)?.toDouble() ?? 0,
        description: json['description'] as String?,
        type: json['serviceType'] as String?,
      );
}

class QuotationLine {
  const QuotationLine({
    required this.serviceId,
    required this.name,
    required this.quantity,
    required this.unitPrice,
    required this.subtotal,
    this.description,
  });

  final int serviceId;
  final String name;
  final int quantity;
  final double unitPrice;
  final double subtotal;
  final String? description;

  factory QuotationLine.fromJson(Map<String, dynamic> json) => QuotationLine(
        serviceId: (json['serviceId'] as num).toInt(),
        name: json['itemName'] as String? ?? '',
        quantity: (json['quantity'] as num).toInt(),
        unitPrice: (json['unitPrice'] as num).toDouble(),
        subtotal: (json['subtotal'] as num).toDouble(),
        description: json['description'] as String?,
      );
}

class QuotationModel {
  const QuotationModel({
    required this.id,
    required this.orderId,
    required this.version,
    required this.status,
    required this.diagnosis,
    required this.bookingFee,
    required this.subtotal,
    required this.discount,
    required this.total,
    required this.latest,
    required this.items,
    this.customerNote,
    this.rejectionReason,
  });

  final int id;
  final int orderId;
  final int version;
  final String status;
  final String diagnosis;
  final double bookingFee;
  final double subtotal;
  final double discount;
  final double total;
  final bool latest;
  final List<QuotationLine> items;
  final String? customerNote;
  final String? rejectionReason;

  factory QuotationModel.fromJson(Map<String, dynamic> json) => QuotationModel(
        id: (json['id'] as num).toInt(),
        orderId: (json['orderId'] as num).toInt(),
        version: (json['version'] as num).toInt(),
        status: json['status'] as String? ?? '',
        diagnosis: json['diagnosis'] as String? ?? '',
        bookingFee: (json['bookingFee'] as num?)?.toDouble() ?? 0,
        subtotal: (json['subtotalAmount'] as num?)?.toDouble() ?? 0,
        discount: (json['discountAmount'] as num?)?.toDouble() ?? 0,
        total: (json['totalAmount'] as num?)?.toDouble() ?? 0,
        latest: json['latest'] as bool? ?? false,
        customerNote: json['customerNote'] as String?,
        rejectionReason: json['rejectionReason'] as String?,
        items: (json['items'] as List? ?? const [])
            .map((e) => QuotationLine.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}
