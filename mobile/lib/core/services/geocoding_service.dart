import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
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

  bool get _isTestEnvironment {
    if (kIsWeb) return false;
    try {
      return Platform.environment.containsKey('FLUTTER_TEST');
    } catch (_) {
      return false;
    }
  }

  Future<GeocodingResult?> reverse(double latitude, double longitude) async {
    try {
      final data = await _client.get(
        Uri.parse(ApiConstants.geocodingReverseUrl).replace(
          queryParameters: {
            'lat': latitude.toString(),
            'lon': longitude.toString(),
          },
        ),
      );
      if (data != null) {
        return GeocodingResult.fromJson(data as Map<String, dynamic>);
      }
    } catch (_) {
      // Backend may be offline, token expired, or in test environment.
      if (_isTestEnvironment) return null;
      // Fallback to direct public Nominatim reverse geocode:
      try {
        final uri = Uri.parse(
          'https://nominatim.openstreetmap.org/reverse?lat=$latitude&lon=$longitude&format=jsonv2&addressdetails=1',
        );
        final response = await http.get(
          uri,
          headers: {
            'User-Agent': 'HydroRescueVietnam/1.0',
            'Accept-Language': 'vi',
          },
        ).timeout(const Duration(seconds: 4));
        if (response.statusCode == 200) {
          final json = jsonDecode(utf8.decode(response.bodyBytes)) as Map<String, dynamic>;
          final name = json['display_name'] as String?;
          if (name != null && name.trim().isNotEmpty) {
            return GeocodingResult(
              displayName: name.trim(),
              latitude: latitude,
              longitude: longitude,
            );
          }
        }
      } catch (_) {}
    }
    return null;
  }
}
