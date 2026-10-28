class GarageModel {
  final int id;
  final int? ownerId;
  final String? ownerName;
  final String? ownerEmail;
  final String garageName;
  final String? phone;
  final String? businessLicenseUrl;
  final String? idCardUrl;
  final String status; // PENDING, APPROVED, REJECTED, SUSPENDED
  final double walletBalance;
  final String? rejectionReason;
  final int branchCount;
  final int mechanicCount;
  final String? createdAt;

  GarageModel({
    required this.id,
    this.ownerId,
    this.ownerName,
    this.ownerEmail,
    required this.garageName,
    this.phone,
    this.businessLicenseUrl,
    this.idCardUrl,
    required this.status,
    this.walletBalance = 0.0,
    this.rejectionReason,
    this.branchCount = 0,
    this.mechanicCount = 0,
    this.createdAt,
  });

  bool get isApproved => status == 'APPROVED';

  factory GarageModel.fromJson(Map<String, dynamic> json) {
    return GarageModel(
      id: json['id'] is int ? json['id'] : int.parse(json['id'].toString()),
      ownerId: json['ownerId'] != null ? int.tryParse(json['ownerId'].toString()) : null,
      ownerName: json['ownerName'],
      ownerEmail: json['ownerEmail'],
      garageName: json['garageName'] ?? '',
      phone: json['phone'],
      businessLicenseUrl: json['businessLicenseUrl'],
      idCardUrl: json['idCardUrl'],
      status: json['status'] ?? 'PENDING',
      walletBalance: (json['walletBalance'] as num?)?.toDouble() ?? 0.0,
      rejectionReason: json['rejectionReason'],
      branchCount: json['branchCount'] is int ? json['branchCount'] : 0,
      mechanicCount: json['mechanicCount'] is int ? json['mechanicCount'] : 0,
      createdAt: json['createdAt']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'ownerId': ownerId,
      'ownerName': ownerName,
      'ownerEmail': ownerEmail,
      'garageName': garageName,
      'phone': phone,
      'businessLicenseUrl': businessLicenseUrl,
      'idCardUrl': idCardUrl,
      'status': status,
      'walletBalance': walletBalance,
      'rejectionReason': rejectionReason,
      'branchCount': branchCount,
      'mechanicCount': mechanicCount,
      'createdAt': createdAt,
    };
  }
}
