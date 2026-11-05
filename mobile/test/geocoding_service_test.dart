import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/services/geocoding_service.dart';
import 'package:mobile/features/common/authenticated_api_client.dart';

class _FakeClient extends AuthenticatedApiClient {
  Uri? requestedUri;

  @override
  Future<dynamic> get(Uri uri) async {
    requestedUri = uri;
    return {
      'displayName': '142 Nguyễn Gia Trí, Bình Thạnh, Việt Nam',
      'latitude': 10.801234,
      'longitude': 106.712345,
    };
  }
}

void main() {
  test('search encodes address and parses OpenStreetMap coordinates', () async {
    final client = _FakeClient();
    final service = GeocodingService(client: client);

    final result = await service.search('142 Nguyễn Gia Trí, Bình Thạnh');

    expect(
      client.requestedUri?.queryParameters['q'],
      '142 Nguyễn Gia Trí, Bình Thạnh',
    );
    expect(result?.latitude, 10.801234);
    expect(result?.longitude, 106.712345);
  });
}
