import '../../core/constants/api_constants.dart';
import '../common/authenticated_api_client.dart';
import 'batch_trip_models.dart';

class BatchTripApi {
  BatchTripApi({AuthenticatedApiClient? client})
    : _client = client ?? AuthenticatedApiClient();

  final AuthenticatedApiClient _client;

  Future<BatchTripModel> create({
    int? mechanicId,
    required int capacity,
    required String pickupPlace,
    required String destinationPlace,
    required double fare,
    required double pickupLatitude,
    required double pickupLongitude,
    required double destinationLatitude,
    required double destinationLongitude,
  }) async {
    final data = await _client.post(
      Uri.parse('${ApiConstants.baseUrl}/batch-trips'),
      body: {
        'mechanicId': mechanicId,
        'capacity': capacity,
        'pickupPlace': pickupPlace,
        'destinationPlace': destinationPlace,
        'discountedPricePerVehicle': fare,
        'pickupLatitude': pickupLatitude,
        'pickupLongitude': pickupLongitude,
        'destinationLatitude': destinationLatitude,
        'destinationLongitude': destinationLongitude,
      },
    );
    return BatchTripModel.fromJson(data as Map<String, dynamic>);
  }

  Future<List<BatchTripModel>> mine() async {
    final data = await _client.get(
      Uri.parse('${ApiConstants.baseUrl}/batch-trips/mine'),
    ) as List;
    return data
        .map((e) => BatchTripModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<BatchTripModel>> nearby(
    double lat,
    double lng, {
    double radiusKm = 5,
    int? garageId,
    double? destinationLatitude,
    double? destinationLongitude,
  }) async {
    final uri = Uri.parse('${ApiConstants.baseUrl}/batch-trips/nearby').replace(
      queryParameters: {
        'latitude': '$lat',
        'longitude': '$lng',
        'radiusKm': '$radiusKm',
        if (garageId != null) 'garageId': '$garageId',
        if (destinationLatitude != null)
          'destinationLatitude': '$destinationLatitude',
        if (destinationLongitude != null)
          'destinationLongitude': '$destinationLongitude',
      },
    );
    final data = await _client.get(uri) as List;
    return data
        .map((e) => BatchTripModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<BatchTripModel> join(int tripId, int orderId) =>
      _orderAction(tripId, orderId, 'join');

  Future<BatchJoinResult> createOrderAndJoin({
    required int tripId,
    required double expectedBatchFare,
    required Map<String, dynamic> order,
  }) async {
    final data = await _client.post(
      Uri.parse('${ApiConstants.baseUrl}/batch-trips/$tripId/join-new'),
      body: {'expectedBatchFare': expectedBatchFare, 'order': order},
    );
    return BatchJoinResult.fromJson(data as Map<String, dynamic>);
  }

  Future<BatchTripModel> leave(int tripId, int orderId) =>
      _orderAction(tripId, orderId, 'leave');

  Future<BatchTripModel> convertPrivate(int tripId, int orderId) =>
      _orderAction(tripId, orderId, 'convert-private');

  Future<List<BatchOrderModel>> orders(int tripId) async {
    final data = await _client.get(
      Uri.parse('${ApiConstants.baseUrl}/batch-trips/$tripId/orders'),
    ) as List;
    return data
        .map((e) => BatchOrderModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<BatchTripModel> startPickup(int tripId) =>
      _tripAction(tripId, 'start-pickup');

  Future<BatchTripModel> pickedUp(int tripId, int orderId) =>
      _tripAction(tripId, 'orders/$orderId/picked-up');

  Future<BatchTripModel> startMoving(int tripId) =>
      _tripAction(tripId, 'start-moving');

  Future<BatchTripModel> delivered(int tripId, int orderId, String imageUrl) =>
      _tripAction(
        tripId,
        'orders/$orderId/delivered',
        body: {'completionImageUrl': imageUrl},
      );

  Future<BatchTripModel> complete(int tripId) =>
      _tripAction(tripId, 'complete');

  Future<BatchTripModel> cancel(int tripId) => _tripAction(tripId, 'cancel');

  Future<BatchTripModel> _tripAction(
    int tripId,
    String action, {
    Map<String, dynamic>? body,
  }) async {
    final data = await _client.post(
      Uri.parse('${ApiConstants.baseUrl}/batch-trips/$tripId/$action'),
      body: body,
    );
    return BatchTripModel.fromJson(data as Map<String, dynamic>);
  }

  Future<BatchTripModel> _orderAction(
    int tripId,
    int orderId,
    String action,
  ) async {
    final data = await _client.post(
      Uri.parse('${ApiConstants.baseUrl}/batch-trips/$tripId/$action'),
      body: {'orderId': orderId},
    );
    return BatchTripModel.fromJson(data as Map<String, dynamic>);
  }
}
