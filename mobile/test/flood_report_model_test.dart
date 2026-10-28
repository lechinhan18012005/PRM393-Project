import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/models/branch_model.dart';
import 'package:mobile/core/models/flood_report_model.dart';
import 'package:mobile/core/models/mechanic_staff_model.dart';

void main() {
  group('Lê Quốc Hội - Model Unit Tests (PRM393)', () {
    test('UC-20 / UC-22: FloodReportModel JSON serialization and depth calculation', () {
      final json = {
        'id': 105,
        'reportedById': 12,
        'reportedByName': 'Hoàng Văn Khách',
        'latitude': 10.7423,
        'longitude': 106.7021,
        'address': '148 Trần Xuân Soạn, Q7',
        'waterDepthLevel': 'SEAT_60CM_PLUS',
        'imageUrls': 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
        'description': 'Nước dâng ngập yên xe',
        'confidenceScore': 4,
        'clusterCount': 3,
        'moderationStatus': 'APPROVED',
        'nearbyStations': '2 Đội thợ cơ động đang túc trực',
      };

      final model = FloodReportModel.fromJson(json);

      expect(model.id, 105);
      expect(model.address, '148 Trần Xuân Soạn, Q7');
      expect(model.waterDepthLevel, 'SEAT_60CM_PLUS');
      expect(model.depthCm, '60cm+');
      expect(model.levelLabel, 'Nguy hiểm (Đỏ)');
      expect(model.levelColor, Colors.red);
      expect(model.confidenceScore, 4);
      expect(model.clusterCount, 3);

      final exportedJson = model.toJson();
      expect(exportedJson['id'], 105);
      expect(exportedJson['waterDepthLevel'], 'SEAT_60CM_PLUS');
    });

    test('UC-04: BranchModel JSON parsing and status check', () {
      final json = {
        'id': 1,
        'garageId': 10,
        'branchName': 'Chi nhánh 1 (Quận 7)',
        'address': '520 Huỳnh Tấn Phát, P. Tân Phú, Q7',
        'latitude': 10.7381,
        'longitude': 106.7212,
        'operatingStatus': 'OPEN',
        'mechanicsCount': 4,
      };

      final branch = BranchModel.fromJson(json);

      expect(branch.id, 1);
      expect(branch.isOpen, true);
      expect(branch.mechanicsCount, 4);
    });

    test('UC-07: MechanicStaffModel online and busy state properties', () {
      final jsonOnline = {
        'id': 201,
        'userId': 55,
        'username': 'tech_01',
        'fullName': 'Phạm Tuấn Anh',
        'garageId': 10,
        'workingStatus': 'AVAILABLE',
        'ratingAvg': 4.9,
      };

      final mechanic = MechanicStaffModel.fromJson(jsonOnline);

      expect(mechanic.isOnline, true);
      expect(mechanic.isBusy, false);
      expect(mechanic.ratingAvg, 4.9);
    });
  });
}
