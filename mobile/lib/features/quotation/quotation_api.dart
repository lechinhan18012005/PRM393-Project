import '../../core/constants/api_constants.dart';
import '../common/authenticated_api_client.dart';
import 'quotation_models.dart';

class QuotationApi {
  QuotationApi({AuthenticatedApiClient? client})
      : _client = client ?? AuthenticatedApiClient();

  final AuthenticatedApiClient _client;

  Future<List<QuotationCatalogItem>> catalog(int orderId) async {
    final data = await _client.get(Uri.parse(
        '${ApiConstants.baseUrl}/rescue-orders/$orderId/quotation-catalog')) as List;
    return data
        .map((e) => QuotationCatalogItem.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<QuotationModel>> history(int orderId) async {
    final data = await _client.get(
        Uri.parse('${ApiConstants.baseUrl}/rescue-orders/$orderId/quotations')) as List;
    return data
        .map((e) => QuotationModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<QuotationModel> create({
    required int orderId,
    required String diagnosis,
    required double discount,
    required List<int> serviceIds,
  }) async {
    final data = await _client.post(
      Uri.parse('${ApiConstants.baseUrl}/rescue-orders/$orderId/quotations'),
      body: {
        'diagnosis': diagnosis,
        'discountAmount': discount,
        'items': serviceIds.map((id) => {'serviceId': id, 'quantity': 1}).toList(),
      },
    );
    return QuotationModel.fromJson(data as Map<String, dynamic>);
  }

  Future<QuotationModel> approve(int quotationId, {String? note}) =>
      _decision(quotationId, 'approve', note);

  Future<QuotationModel> reject(int quotationId, String reason) =>
      _decision(quotationId, 'reject', reason);

  Future<QuotationModel> requestRevision(int quotationId, String note) =>
      _decision(quotationId, 'request-revision', note);

  Future<QuotationModel> _decision(int id, String action, String? note) async {
    final data = await _client.post(
      Uri.parse('${ApiConstants.baseUrl}/quotations/$id/$action'),
      body: {'note': note},
    );
    return QuotationModel.fromJson(data as Map<String, dynamic>);
  }
}
