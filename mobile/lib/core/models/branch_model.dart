class BranchModel {
  final int id;
  final int garageId;
  final String? garageName;
  final String branchName;
  final String address;
  final double latitude;
  final double longitude;
  final String? phoneNumber;
  final String? rescueVehicles;
  final String operatingStatus; // OPEN, CLOSED_MAINTENANCE
  final int mechanicsCount;
  final String? createdAt;

  BranchModel({
    required this.id,
    required this.garageId,
    this.garageName,
    required this.branchName,
    required this.address,
    required this.latitude,
    required this.longitude,
    this.phoneNumber,
    this.rescueVehicles,
    required this.operatingStatus,
    this.mechanicsCount = 0,
    this.createdAt,
  });

  bool get isOpen => operatingStatus == 'OPEN';

  factory BranchModel.fromJson(Map<String, dynamic> json) {
    return BranchModel(
      id: json['id'] is int ? json['id'] : int.parse(json['id'].toString()),
      garageId: json['garageId'] is int ? json['garageId'] : (json['garageId'] != null ? int.parse(json['garageId'].toString()) : 0),
      garageName: json['garageName'],
      branchName: json['branchName'] ?? '',
      address: json['address'] ?? '',
      latitude: (json['latitude'] as num?)?.toDouble() ?? 10.7423,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 106.7021,
      phoneNumber: json['phoneNumber'],
      rescueVehicles: json['rescueVehicles'],
      operatingStatus: json['operatingStatus'] ?? 'OPEN',
      mechanicsCount: json['mechanicsCount'] is int ? json['mechanicsCount'] : 0,
      createdAt: json['createdAt']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'garageId': garageId,
      'garageName': garageName,
      'branchName': branchName,
      'address': address,
      'latitude': latitude,
      'longitude': longitude,
      'phoneNumber': phoneNumber,
      'rescueVehicles': rescueVehicles,
      'operatingStatus': operatingStatus,
      'mechanicsCount': mechanicsCount,
      'createdAt': createdAt,
    };
  }
}
