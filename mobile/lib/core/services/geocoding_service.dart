import '../../features/common/authenticated_api_client.dart';
import '../constants/api_constants.dart';

class GeocodingResult {
  const GeocodingResult({
    required this.displayName,
    required this.latitude,
    required this.longitude,
  });

  final String displayName;
  final double latitude;
  final double longitude;

  factory GeocodingResult.fromJson(Map<String, dynamic> json) {
    return GeocodingResult(
      displayName: json['displayName'] as String? ?? '',
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
    );
  }
}

class GeocodingService {
  GeocodingService({AuthenticatedApiClient? client})
    : _client = client ?? AuthenticatedApiClient();

  final AuthenticatedApiClient _client;

  Future<GeocodingResult?> search(String address) async {
    final query = address.trim();
    if (query.length < 3) return null;
    final data = await _client.get(
      Uri.parse(ApiConstants.geocodingSearchUrl)
          .replace(queryParameters: {'q': query}),
    );
    if (data == null) return null;
    return GeocodingResult.fromJson(data as Map<String, dynamic>);
  }
}
