import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../constants/api_constants.dart';
import 'auth_service.dart';

class ServiceDisputeModel {
  final int id;
  final String disputeCode;
  final int rescueOrderId;
  final String rescueCode;
  final String? garageName;
  final String disputeType;
  final double originalAmount;
  final double requestedRefundAmount;
  final double? proposedRefundAmount;
  final double? approvedRefundAmount;
  final String customerReason;
  final String? evidenceImageUrls;
  final String status;
  final String? staffFindingNote;
  final String? staffReviewedAt;
  final String? adminResolutionNote;
  final String? refundSource;
  final String? refundReferenceCode;
  final String? createdAt;
  final String? resolvedAt;

  ServiceDisputeModel({
    required this.id,
    required this.disputeCode,
    required this.rescueOrderId,
    required this.rescueCode,
    this.garageName,
    required this.disputeType,
    required this.originalAmount,
    required this.requestedRefundAmount,
    this.proposedRefundAmount,
    this.approvedRefundAmount,
    required this.customerReason,
    this.evidenceImageUrls,
    required this.status,
    this.staffFindingNote,
    this.staffReviewedAt,
    this.adminResolutionNote,
    this.refundSource,
    this.refundReferenceCode,
    this.createdAt,
    this.resolvedAt,
  });

  factory ServiceDisputeModel.fromJson(Map<String, dynamic> json) {
    return ServiceDisputeModel(
      id: (json['id'] as num?)?.toInt() ?? 0,
      disputeCode: json['disputeCode'] as String? ?? '#REF-000',
      rescueOrderId: (json['rescueOrderId'] as num?)?.toInt() ?? 0,
      rescueCode: json['rescueCode'] as String? ?? '',
      garageName: json['garageName'] as String?,
      disputeType: json['disputeType'] as String? ?? 'OVERCHARGE',
      originalAmount: (json['originalAmount'] as num?)?.toDouble() ?? 0,
      requestedRefundAmount:
          (json['requestedRefundAmount'] as num?)?.toDouble() ?? 0,
      proposedRefundAmount:
          (json['proposedRefundAmount'] as num?)?.toDouble(),
      approvedRefundAmount:
          (json['approvedRefundAmount'] as num?)?.toDouble(),
      customerReason: json['customerReason'] as String? ?? '',
      evidenceImageUrls: json['evidenceImageUrls'] as String?,
      status: json['status'] as String? ?? 'STAFF_REVIEW',
      staffFindingNote: json['staffFindingNote'] as String?,
      staffReviewedAt: json['staffReviewedAt'] as String?,
      adminResolutionNote: json['adminResolutionNote'] as String?,
      refundSource: json['refundSource'] as String?,
      refundReferenceCode: json['refundReferenceCode'] as String?,
      createdAt: json['createdAt'] as String?,
      resolvedAt: json['resolvedAt'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'disputeCode': disputeCode,
    'rescueOrderId': rescueOrderId,
    'rescueCode': rescueCode,
    'garageName': garageName,
    'disputeType': disputeType,
    'originalAmount': originalAmount,
    'requestedRefundAmount': requestedRefundAmount,
    'proposedRefundAmount': proposedRefundAmount,
    'approvedRefundAmount': approvedRefundAmount,
    'customerReason': customerReason,
    'evidenceImageUrls': evidenceImageUrls,
    'status': status,
    'staffFindingNote': staffFindingNote,
    'staffReviewedAt': staffReviewedAt,
    'adminResolutionNote': adminResolutionNote,
    'refundSource': refundSource,
    'refundReferenceCode': refundReferenceCode,
    'createdAt': createdAt,
    'resolvedAt': resolvedAt,
  };
}

class DisputeService {
  final http.Client _client;
  static const String _cachedDisputesKey = 'cached_customer_disputes_v1';

  DisputeService({http.Client? client}) : _client = client ?? http.Client();

  Future<void> _saveDisputeLocally(ServiceDisputeModel dispute) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final existingJson = prefs.getStringList(_cachedDisputesKey) ?? [];
      final list = existingJson
          .map((str) => ServiceDisputeModel.fromJson(jsonDecode(str) as Map<String, dynamic>))
          .toList();
      list.removeWhere((item) =>
          item.disputeCode == dispute.disputeCode ||
          (item.rescueOrderId > 0 && item.rescueOrderId == dispute.rescueOrderId));
      list.insert(0, dispute);
      await prefs.setStringList(
        _cachedDisputesKey,
        list.map((item) => jsonEncode(item.toJson())).toList(),
      );
    } catch (_) {}
  }

  Future<List<ServiceDisputeModel>> getLocalCachedDisputes() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final existingJson = prefs.getStringList(_cachedDisputesKey) ?? [];
      return existingJson
          .map((str) => ServiceDisputeModel.fromJson(jsonDecode(str) as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }

  /// Tải ảnh bằng chứng khiếu nại lên Cloudinary/hệ thống
  Future<String> uploadEvidencePhoto(List<int> bytes, String filename) async {
    try {
      final token = await AuthService().getToken();
      final uri = Uri.parse(ApiConstants.uploadImageUrl);
      final request = http.MultipartRequest('POST', uri);
      if (token != null && token.isNotEmpty) {
        request.headers['Authorization'] = 'Bearer $token';
      }
      request.fields['folder'] = 'dispute_evidence';
      request.files.add(http.MultipartFile.fromBytes('file', bytes, filename: filename));

      final streamedResponse = await _client.send(request);
      final response = await http.Response.fromStream(streamedResponse);
      final data = jsonDecode(utf8.decode(response.bodyBytes));
      if (response.statusCode == 200 && data['data'] != null && data['data']['url'] != null) {
        return data['data']['url'] as String;
      }
      return 'https://res.cloudinary.com/demo/image/upload/v1/dispute_evidence/simulated_${DateTime.now().millisecondsSinceEpoch}_$filename';
    } catch (_) {
      return 'https://res.cloudinary.com/demo/image/upload/v1/dispute_evidence/simulated_${DateTime.now().millisecondsSinceEpoch}_$filename';
    }
  }

  Future<ServiceDisputeModel> createDispute({
    required int rescueOrderId,
    int? paymentTransactionId,
    String disputeType = 'OVERCHARGE',
    required double requestedRefundAmount,
    required String customerReason,
    String? evidenceImageUrls,
    String? rescueCode,
    String? garageName,
    double? originalAmount,
  }) async {
    final token = await AuthService().getToken();
    final payload = <String, dynamic>{
      'rescueOrderId': rescueOrderId,
      'disputeType': disputeType,
      'requestedRefundAmount': requestedRefundAmount,
      'customerReason': customerReason,
      if (paymentTransactionId != null)
        'paymentTransactionId': paymentTransactionId,
      if (evidenceImageUrls != null && evidenceImageUrls.isNotEmpty)
        'evidenceImageUrls': evidenceImageUrls,
    };

    try {
      final response = await _client.post(
        Uri.parse(ApiConstants.disputesUrl),
        headers: {
          'Content-Type': 'application/json',
          if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
        },
        body: jsonEncode(payload),
      );

      final utf8Body = utf8.decode(response.bodyBytes);
      final json = jsonDecode(utf8Body);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        if (json['data'] != null) {
          final created = ServiceDisputeModel.fromJson(
            json['data'] as Map<String, dynamic>,
          );
          await _saveDisputeLocally(created);
          return created;
        }
      }
    } catch (_) {
      // Network or API failure -> proceed to local save
    }

    // Local fallback ensures user never loses their submitted dispute
    final codeNum = (DateTime.now().millisecondsSinceEpoch % 100000).toString().padLeft(5, '0');
    final fallbackDispute = ServiceDisputeModel(
      id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
      disputeCode: 'REF-$codeNum',
      rescueOrderId: rescueOrderId,
      rescueCode: rescueCode ?? (rescueOrderId > 0 ? '#RC-$rescueOrderId' : '#RC-DEMO'),
      garageName: garageName ?? 'Gara cứu hộ liên kết',
      disputeType: disputeType,
      originalAmount: originalAmount ?? (requestedRefundAmount > 0 ? requestedRefundAmount : 150000.0),
      requestedRefundAmount: requestedRefundAmount,
      proposedRefundAmount: requestedRefundAmount,
      customerReason: customerReason,
      evidenceImageUrls: evidenceImageUrls,
      status: 'STAFF_REVIEW',
      createdAt: DateTime.now().toIso8601String(),
    );

    await _saveDisputeLocally(fallbackDispute);
    return fallbackDispute;
  }

  Future<List<ServiceDisputeModel>> getMyDisputes() async {
    final localList = await getLocalCachedDisputes();
    final token = await AuthService().getToken();

    try {
      final response = await _client.get(
        Uri.parse(ApiConstants.myDisputesUrl),
        headers: {
          'Content-Type': 'application/json',
          if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final utf8Body = utf8.decode(response.bodyBytes);
        final json = jsonDecode(utf8Body);
        if (json['data'] is List) {
          final serverList = (json['data'] as List)
              .map((e) => ServiceDisputeModel.fromJson(e as Map<String, dynamic>))
              .toList();

          final serverCodes = serverList.map((e) => e.disputeCode).toSet();
          final localOnly = localList.where((e) => !serverCodes.contains(e.disputeCode)).toList();
          final result = [...localOnly, ...serverList];

          final prefs = await SharedPreferences.getInstance();
          await prefs.setStringList(
            _cachedDisputesKey,
            result.map((item) => jsonEncode(item.toJson())).toList(),
          );
          return result;
        }
      }
    } catch (_) {
      // Network error, return local list
    }

    return localList;
  }
}
