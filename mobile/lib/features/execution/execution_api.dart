import '../../core/constants/api_constants.dart';
import '../common/authenticated_api_client.dart';

class ExecutionApi {
  ExecutionApi({AuthenticatedApiClient? client})
    : _client = client ?? AuthenticatedApiClient();

  final AuthenticatedApiClient _client;

  Future<void> start(int orderId) => _client.post(
    Uri.parse('${ApiConstants.baseUrl}/rescue-orders/$orderId/execution/start'),
  );

  Future<void> updateProgress(int orderId, String note, {String? imageUrl}) =>
      _client.post(
        Uri.parse(
          '${ApiConstants.baseUrl}/rescue-orders/$orderId/execution/progress',
        ),
        body: {'note': note, 'evidenceImageUrl': imageUrl},
      );

  Future<void> pickedUp(int orderId) => _client.post(
    Uri.parse(
      '${ApiConstants.baseUrl}/rescue-orders/$orderId/execution/picked-up',
    ),
  );

  Future<void> transferToGarage(int orderId, int branchId) => _client.post(
    Uri.parse(
      '${ApiConstants.baseUrl}/rescue-orders/$orderId/execution/transfer-to-garage',
    ),
    body: {'destinationBranchId': branchId},
  );

  Future<void> requestCompletion(int orderId, String imageUrl) => _client.post(
    Uri.parse(
      '${ApiConstants.baseUrl}/rescue-orders/$orderId/execution/request-completion',
    ),
    body: {'completionImageUrl': imageUrl},
  );

  Future<void> delivered(int orderId, String imageUrl) => _client.post(
    Uri.parse(
      '${ApiConstants.baseUrl}/rescue-orders/$orderId/execution/delivered',
    ),
    body: {'completionImageUrl': imageUrl},
  );

  Future<List<Map<String, dynamic>>> history(int orderId) async {
    final data = await _client.get(
      Uri.parse(
        '${ApiConstants.baseUrl}/rescue-orders/$orderId/execution/history',
      ),
    ) as List;
    return data.cast<Map<String, dynamic>>();
  }
}
