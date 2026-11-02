import 'dart:convert';

import 'package:http/http.dart' as http;

import '../constants/api_constants.dart';
import 'auth_service.dart';

class ServiceDisputeModel {
  final int id;
  final String disputeCode;
  final int rescueOrderId;
  final String rescueCode;
  final String disputeType;
  final double originalAmount;
  final double requestedRefundAmount;
  final double? proposedRefundAmount;
  final double? approvedRefundAmount;
  final String customerReason;
  final String status;
  final String? staffFindingNote;
  final String? adminResolutionNote;
  final String? createdAt;

  ServiceDisputeModel({
    required this.id,
    required this.disputeCode,
    required this.rescueOrderId,
    required this.rescueCode,
    required this.disputeType,
    required this.originalAmount,
    required this.requestedRefundAmount,
    this.proposedRefundAmount,
    this.approvedRefundAmount,
    required this.customerReason,
    required this.status,
    this.staffFindingNote,
    this.adminResolutionNote,
    this.createdAt,
  });

  factory ServiceDisputeModel.fromJson(Map<String, dynamic> json) {
    return ServiceDisputeModel(
      id: (json['id'] as num?)?.toInt() ?? 0,
      disputeCode: json['disputeCode'] as String? ?? '#REF-000',
      rescueOrderId: (json['rescueOrderId'] as num?)?.toInt() ?? 0,
      rescueCode: json['rescueCode'] as String? ?? '',
      disputeType: json['disputeType'] as String? ?? 'OVERCHARGE',
      originalAmount: (json['originalAmount'] as num?)?.toDouble() ?? 0,
      requestedRefundAmount:
          (json['requestedRefundAmount'] as num?)?.toDouble() ?? 0,
      proposedRefundAmount:
          (json['proposedRefundAmount'] as num?)?.toDouble(),
      approvedRefundAmount:
          (json['approvedRefundAmount'] as num?)?.toDouble(),
      customerReason: json['customerReason'] as String? ?? '',
      status: json['status'] as String? ?? 'STAFF_REVIEW',
      staffFindingNote: json['staffFindingNote'] as String?,
      adminResolutionNote: json['adminResolutionNote'] as String?,
      createdAt: json['createdAt'] as String?,
    );
  }
}

class DisputeService {
  final http.Client _client;

  DisputeService({http.Client? client}) : _client = client ?? http.Client();

  Future<ServiceDisputeModel> createDispute({
    required int rescueOrderId,
    int? paymentTransactionId,
    String disputeType = 'OVERCHARGE',
    required double requestedRefundAmount,
    required String customerReason,
    String? evidenceImageUrls,
  }) async {
    final token = await AuthService().getToken();
    final payload = <String, dynamic>{
      'rescueOrderId': rescueOrderId,
      'disputeType': disputeType,
      'requestedRefundAmount': requestedRefundAmount,
      'customerReason': customerReason,
      'paymentTransactionId': ?paymentTransactionId,
      if (evidenceImageUrls != null && evidenceImageUrls.isNotEmpty)
        'evidenceImageUrls': evidenceImageUrls,
    };

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
        return ServiceDisputeModel.fromJson(
          json['data'] as Map<String, dynamic>,
        );
      }
      throw Exception('Không nhận được phản hồi hồ sơ khiếu nại từ máy chủ.');
    } else {
      final msg =
          json['message'] ?? 'Gửi khiếu nại thất bại (${response.statusCode})';
      throw Exception(msg);
    }
  }

  Future<List<ServiceDisputeModel>> getMyDisputes() async {
    final token = await AuthService().getToken();
    final response = await _client.get(
      Uri.parse(ApiConstants.myDisputesUrl),
      headers: {
        'Content-Type': 'application/json',
        if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
      },
    );

    final utf8Body = utf8.decode(response.bodyBytes);
    final json = jsonDecode(utf8Body);

    if (response.statusCode == 200 && json['data'] is List) {
      return (json['data'] as List)
          .map(
            (e) => ServiceDisputeModel.fromJson(e as Map<String, dynamic>),
          )
          .toList();
    }
    return [];
  }
}
