import 'package:flutter/material.dart';

class FloodReportModel {
  final int id;
  final int? reportedById;
  final String? reportedByName;
  final double latitude;
  final double longitude;
  final String address;
  final String waterDepthLevel; // ANKLE_20CM, HALF_WHEEL_40CM, SEAT_60CM_PLUS
  final String? imageUrls;
  final String? description;
  final int confidenceScore;
  final int clusterCount;
  final String moderationStatus; // PENDING, APPROVED, EXPIRED, REJECTED
  final String? moderatorNote;
  final String? nearbyStations;
  final String? createdAt;

  FloodReportModel({
    required this.id,
    this.reportedById,
    this.reportedByName,
    required this.latitude,
    required this.longitude,
    required this.address,
    required this.waterDepthLevel,
    this.imageUrls,
    this.description,
    this.confidenceScore = 1,
    this.clusterCount = 1,
    required this.moderationStatus,
    this.moderatorNote,
    this.nearbyStations,
    this.createdAt,
  });

  String get depthCm {
    switch (waterDepthLevel) {
      case 'SEAT_60CM_PLUS':
        return '60cm+';
      case 'HALF_WHEEL_40CM':
        return '40cm - 50cm';
      case 'ANKLE_20CM':
      default:
        return '20cm - 30cm';
    }
  }

  String get levelLabel {
    switch (waterDepthLevel) {
      case 'SEAT_60CM_PLUS':
        return 'Nguy hiểm (Đỏ)';
      case 'HALF_WHEEL_40CM':
        return 'Cảnh báo (Cam)';
      case 'ANKLE_20CM':
      default:
        return 'Theo dõi (Vàng)';
    }
  }

  Color get levelColor {
    switch (waterDepthLevel) {
      case 'SEAT_60CM_PLUS':
        return Colors.red;
      case 'HALF_WHEEL_40CM':
        return Colors.orange;
      case 'ANKLE_20CM':
      default:
        return Colors.amber.shade700;
    }
  }

  factory FloodReportModel.fromJson(Map<String, dynamic> json) {
    return FloodReportModel(
      id: json['id'] is int ? json['id'] : int.parse(json['id'].toString()),
      reportedById: json['reportedById'] != null ? int.tryParse(json['reportedById'].toString()) : null,
      reportedByName: json['reportedByName'],
      latitude: (json['latitude'] as num?)?.toDouble() ?? 10.7423,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 106.7021,
      address: json['address'] ?? '',
      waterDepthLevel: json['waterDepthLevel'] ?? 'HALF_WHEEL_40CM',
      imageUrls: json['imageUrls'],
      description: json['description'],
      confidenceScore: json['confidenceScore'] is int ? json['confidenceScore'] : 1,
      clusterCount: json['clusterCount'] is int ? json['clusterCount'] : 1,
      moderationStatus: json['moderationStatus'] ?? 'PENDING',
      moderatorNote: json['moderatorNote'],
      nearbyStations: json['nearbyStations'] ?? '2 Đội thợ cơ động đang túc trực',
      createdAt: json['createdAt']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'reportedById': reportedById,
      'reportedByName': reportedByName,
      'latitude': latitude,
      'longitude': longitude,
      'address': address,
      'waterDepthLevel': waterDepthLevel,
      'imageUrls': imageUrls,
      'description': description,
      'confidenceScore': confidenceScore,
      'clusterCount': clusterCount,
      'moderationStatus': moderationStatus,
      'moderatorNote': moderatorNote,
      'nearbyStations': nearbyStations,
      'createdAt': createdAt,
    };
  }
}
