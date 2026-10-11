class UserModel {
  final int id;
  final String username;
  final String email;
  final String? phone;
  final String fullName;
  final String? avatarUrl;
  final String role; // CUSTOMER, GARAGE_OWNER, FIELD_MECHANIC, STAFF, ADMIN
  final bool active;
  final String? createdAt;

  UserModel({
    required this.id,
    required this.username,
    required this.email,
    this.phone,
    required this.fullName,
    this.avatarUrl,
    required this.role,
    required this.active,
    this.createdAt,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] is int ? json['id'] : int.parse(json['id'].toString()),
      username: json['username'] ?? '',
      email: json['email'] ?? '',
      phone: json['phone'],
      fullName: json['fullName'] ?? '',
      avatarUrl: json['avatarUrl'],
      role: json['role'] ?? 'CUSTOMER',
      active: json['active'] ?? true,
      createdAt: json['createdAt'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'email': email,
      'phone': phone,
      'fullName': fullName,
      'avatarUrl': avatarUrl,
      'role': role,
      'active': active,
      'createdAt': createdAt,
    };
  }
}
