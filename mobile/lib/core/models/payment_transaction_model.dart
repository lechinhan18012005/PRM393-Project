class PaymentTransactionModel {
  final int id;
  final int? rescueOrderId;
  final String? rescueCode;
  final String? orderType;
  final int? garageId;
  final String? garageName;
  final int? customerId;
  final String? customerName;
  final String? customerPhone;
  final int payosOrderCode;
  final double amount;
  final double? commissionRate;
  final double? platformFee;
  final double? netGarageAmount;
  final String paymentMethod;
  final String status;
  final bool reconciled;
  final bool checksumValid;
  final String? qrCode;
  final String? checkoutUrl;
  final String? bankName;
  final String? accountNumber;
  final String? accountHolder;
  final String? paymentContent;
  final String? createdAt;
  final String? paidAt;
  final String? reconciledAt;
  final bool isSimulation;

  PaymentTransactionModel({
    required this.id,
    this.rescueOrderId,
    this.rescueCode,
    this.orderType,
    this.garageId,
    this.garageName,
    this.customerId,
    this.customerName,
    this.customerPhone,
    required this.payosOrderCode,
    required this.amount,
    this.commissionRate,
    this.platformFee,
    this.netGarageAmount,
    this.paymentMethod = 'PAYOS_VIETQR',
    this.status = 'PENDING',
    this.reconciled = false,
    this.checksumValid = true,
    this.qrCode,
    this.checkoutUrl,
    this.bankName,
    this.accountNumber,
    this.accountHolder,
    this.paymentContent,
    this.createdAt,
    this.paidAt,
    this.reconciledAt,
    this.isSimulation = false,
  });

  bool get isSuccess => status == 'SUCCESS';
  bool get isPending => status == 'PENDING';
  bool get isFailed => status == 'FAILED';
  bool get isCancelled => status == 'CANCELLED';
  bool get isDuplicatePaid => status == 'DUPLICATE_PAID';
  bool get isTerminal => const {
    'SUCCESS',
    'FAILED',
    'CANCELLED',
    'EXPIRED',
    'REFUNDED',
    'DUPLICATE_PAID',
  }.contains(status);

  factory PaymentTransactionModel.fromJson(Map<String, dynamic> json) {
    return PaymentTransactionModel(
      id: json['id'] as int? ?? 0,
      rescueOrderId: json['rescueOrderId'] as int?,
      rescueCode: json['rescueCode'] as String?,
      orderType: json['orderType'] as String?,
      garageId: json['garageId'] as int?,
      garageName: json['garageName'] as String?,
      customerId: json['customerId'] as int?,
      customerName: json['customerName'] as String?,
      customerPhone: json['customerPhone'] as String?,
      payosOrderCode: (json['payosOrderCode'] as num?)?.toInt() ?? 0,
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      commissionRate: (json['commissionRate'] as num?)?.toDouble(),
      platformFee: (json['platformFee'] as num?)?.toDouble(),
      netGarageAmount: (json['netGarageAmount'] as num?)?.toDouble(),
      paymentMethod: json['paymentMethod'] as String? ?? 'PAYOS_VIETQR',
      status: json['status'] as String? ?? 'PENDING',
      reconciled: json['reconciled'] as bool? ?? false,
      checksumValid: json['checksumValid'] as bool? ?? true,
      qrCode: json['qrCode'] as String?,
      checkoutUrl: json['checkoutUrl'] as String?,
      bankName: json['bankName'] as String?,
      accountNumber: json['accountNumber'] as String?,
      accountHolder: json['accountHolder'] as String?,
      paymentContent: json['paymentContent'] as String?,
      createdAt: json['createdAt'] as String?,
      paidAt: json['paidAt'] as String?,
      reconciledAt: json['reconciledAt'] as String?,
      isSimulation: (json['isSimulation'] as bool?) ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'rescueOrderId': rescueOrderId,
      'rescueCode': rescueCode,
      'orderType': orderType,
      'garageId': garageId,
      'garageName': garageName,
      'customerId': customerId,
      'customerName': customerName,
      'customerPhone': customerPhone,
      'payosOrderCode': payosOrderCode,
      'amount': amount,
      'commissionRate': commissionRate,
      'platformFee': platformFee,
      'netGarageAmount': netGarageAmount,
      'paymentMethod': paymentMethod,
      'status': status,
      'reconciled': reconciled,
      'checksumValid': checksumValid,
      'qrCode': qrCode,
      'checkoutUrl': checkoutUrl,
      'bankName': bankName,
      'accountNumber': accountNumber,
      'accountHolder': accountHolder,
      'paymentContent': paymentContent,
      'createdAt': createdAt,
      'paidAt': paidAt,
      'reconciledAt': reconciledAt,
      'isSimulation': isSimulation,
    };
  }
}
