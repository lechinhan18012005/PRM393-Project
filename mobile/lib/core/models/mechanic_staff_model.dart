class MechanicStaffModel {
  final int id;
  final int userId;
  final String username;
  final String fullName;
  final String? phone;
  final String? email;
  final String? avatarUrl;
  final int garageId;
  final String? garageName;
  final int? branchId;
  final String? branchName;
  final String? branchAddress;
  final double? currentLatitude;
  final double? currentLongitude;
  final String workingStatus; // OFFLINE, AVAILABLE, BUSY
  final String? shiftName;
  final double ratingAvg;
  final String? speciality;
  final String? lastHeartbeatAt;
  final String? lastGpsUpdatedAt;
  final String? createdAt;

  MechanicStaffModel({
    required this.id,
    required this.userId,
    required this.username,
    required this.fullName,
    this.phone,
    this.email,
    this.avatarUrl,
    required this.garageId,
    this.garageName,
    this.branchId,
    this.branchName,
    this.branchAddress,
    this.currentLatitude,
    this.currentLongitude,
    required this.workingStatus,
    this.shiftName,
    this.ratingAvg = 5.0,
    this.speciality,
    this.lastHeartbeatAt,
    this.lastGpsUpdatedAt,
    this.createdAt,
  });

  bool get isOnline => workingStatus == 'AVAILABLE';
  bool get isBusy => workingStatus == 'BUSY';

  factory MechanicStaffModel.fromJson(Map<String, dynamic> json) {
    return MechanicStaffModel(
      id: json['id'] is int ? json['id'] : int.parse(json['id'].toString()),
      userId: json['userId'] is int ? json['userId'] : int.parse(json['userId'].toString()),
      username: json['username'] ?? '',
      fullName: json['fullName'] ?? '',
      phone: json['phone'],
      email: json['email'],
      avatarUrl: json['avatarUrl'],
      garageId: json['garageId'] is int ? json['garageId'] : int.parse((json['garageId'] ?? 0).toString()),
      garageName: json['garageName'],
      branchId: json['branchId'] != null ? int.tryParse(json['branchId'].toString()) : null,
      branchName: json['branchName'],
      branchAddress: json['branchAddress'],
      currentLatitude: (json['currentLatitude'] as num?)?.toDouble(),
      currentLongitude: (json['currentLongitude'] as num?)?.toDouble(),
      workingStatus: json['workingStatus'] ?? 'OFFLINE',
      shiftName: json['shiftName'],
      ratingAvg: (json['ratingAvg'] as num?)?.toDouble() ?? 5.0,
      speciality: json['speciality'],
      lastHeartbeatAt: json['lastHeartbeatAt']?.toString(),
      lastGpsUpdatedAt: json['lastGpsUpdatedAt']?.toString(),
      createdAt: json['createdAt']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'username': username,
      'fullName': fullName,
      'phone': phone,
      'email': email,
      'avatarUrl': avatarUrl,
      'garageId': garageId,
      'garageName': garageName,
      'branchId': branchId,
      'branchName': branchName,
      'branchAddress': branchAddress,
      'currentLatitude': currentLatitude,
      'currentLongitude': currentLongitude,
      'workingStatus': workingStatus,
      'shiftName': shiftName,
      'ratingAvg': ratingAvg,
      'speciality': speciality,
      'lastHeartbeatAt': lastHeartbeatAt,
      'lastGpsUpdatedAt': lastGpsUpdatedAt,
      'createdAt': createdAt,
    };
  }
}
