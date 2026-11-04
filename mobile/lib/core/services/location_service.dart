import 'dart:io';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

class LocationData {
  final double latitude;
  final double longitude;
  final double accuracyMeters;
  final double? bearing;
  final double? speed;
  final DateTime timestamp;
  final bool isSimulated;

  const LocationData({
    required this.latitude,
    required this.longitude,
    required this.accuracyMeters,
    this.bearing,
    this.speed,
    required this.timestamp,
    this.isSimulated = false,
  });
}

abstract class LocationService {
  static LocationService instance = _createDefault();

  static LocationService _createDefault() {
    if (!kIsWeb) {
      try {
        if (Platform.environment.containsKey('FLUTTER_TEST')) {
          return MockLocationService();
        }
      } catch (_) {}
    }
    return DeviceLocationService();
  }

  Future<bool> isLocationServiceEnabled();
  Future<LocationPermission> checkPermission();
  Future<LocationPermission> requestPermission();
  Future<LocationData?> getCurrentLocation();
  double calculateDistanceMeters(double lat1, double lon1, double lat2, double lon2);
  LocationData? resolveAddressCoordinates(String address, {bool isDropoff = false});
}

LocationData? _matchLocationByKeyword(String address) {
  final trimmed = address.trim();
  if (trimmed.isEmpty) return null;

  // 1. Phân tích cú pháp tọa độ dạng "(lat, lon)" hoặc "lat, lon"
  final regex = RegExp(r'(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)');
  final match = regex.firstMatch(trimmed);
  if (match != null) {
    final lat = double.tryParse(match.group(1)!);
    final lon = double.tryParse(match.group(2)!);
    if (lat != null && lon != null && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return LocationData(
        latitude: lat,
        longitude: lon,
        accuracyMeters: 5.0,
        timestamp: DateTime.now(),
      );
    }
  }

  // 2. Tra cứu địa chỉ ngập & khu vực cứu hộ phổ biến
  final lower = trimmed.toLowerCase();
  if (lower.contains('huỳnh tấn phát') || lower.contains('tân thuận') || lower.contains('quận 7') || lower.contains('phú mỹ hưng')) {
    return LocationData(latitude: 10.7385, longitude: 106.7215, accuracyMeters: 8.5, timestamp: DateTime.now());
  } else if (lower.contains('nguyễn gia trí') || lower.contains('bình thạnh') || lower.contains('nguyễn hữu cảnh') || lower.contains('ung văn khiêm')) {
    return LocationData(latitude: 10.8025, longitude: 106.7145, accuracyMeters: 8.5, timestamp: DateTime.now());
  } else if (lower.contains('cầu phú mỹ') || lower.contains('khô ráo') || lower.contains('gò cao')) {
    return LocationData(latitude: 10.7490, longitude: 106.7290, accuracyMeters: 8.5, timestamp: DateTime.now());
  } else if (lower.contains('quận 8') || lower.contains('triều cường') || lower.contains('tạ quang bửu') || lower.contains('phạm thế hiển')) {
    return LocationData(latitude: 10.7250, longitude: 106.6580, accuracyMeters: 10.0, timestamp: DateTime.now());
  } else if (lower.contains('thảo điền') || lower.contains('quận 2') || lower.contains('an phú') || lower.contains('mai chí thọ')) {
    return LocationData(latitude: 10.8030, longitude: 106.7350, accuracyMeters: 10.0, timestamp: DateTime.now());
  } else if (lower.contains('quận 1') || lower.contains('bến thành') || lower.contains('lê lợi')) {
    return LocationData(latitude: 10.7720, longitude: 106.6980, accuracyMeters: 10.0, timestamp: DateTime.now());
  } else if (lower.contains('thủ đức') || lower.contains('kha vạn cân') || lower.contains('võ văn ngân')) {
    return LocationData(latitude: 10.8500, longitude: 106.7720, accuracyMeters: 10.0, timestamp: DateTime.now());
  } else if (lower.contains('gò vấp') || lower.contains('cây trâm') || lower.contains('phang huy ích')) {
    return LocationData(latitude: 10.8380, longitude: 106.6650, accuracyMeters: 10.0, timestamp: DateTime.now());
  } else if (lower.contains('tân bình') || lower.contains('cộng hòa') || lower.contains('trường chinh')) {
    return LocationData(latitude: 10.8010, longitude: 106.6530, accuracyMeters: 10.0, timestamp: DateTime.now());
  }

  return null;
}

class DeviceLocationService implements LocationService {
  @override
  Future<bool> isLocationServiceEnabled() async {
    try {
      return await Geolocator.isLocationServiceEnabled();
    } catch (_) {
      return false;
    }
  }

  @override
  Future<LocationPermission> checkPermission() async {
    try {
      return await Geolocator.checkPermission();
    } catch (_) {
      return LocationPermission.denied;
    }
  }

  @override
  Future<LocationPermission> requestPermission() async {
    try {
      return await Geolocator.requestPermission();
    } catch (_) {
      return LocationPermission.denied;
    }
  }

  @override
  Future<LocationData?> getCurrentLocation() async {
    try {
      final enabled = await isLocationServiceEnabled();
      if (!enabled) return null;

      var permission = await checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await requestPermission();
        if (permission == LocationPermission.denied) return null;
      }
      if (permission == LocationPermission.deniedForever) return null;

      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 8),
        ),
      );

      return LocationData(
        latitude: pos.latitude,
        longitude: pos.longitude,
        accuracyMeters: pos.accuracy,
        bearing: pos.heading,
        speed: pos.speed,
        timestamp: pos.timestamp,
        isSimulated: pos.isMocked,
      );
    } catch (_) {
      return null;
    }
  }

  @override
  double calculateDistanceMeters(double lat1, double lon1, double lat2, double lon2) {
    try {
      return Geolocator.distanceBetween(lat1, lon1, lat2, lon2);
    } catch (_) {
      const r = 6371000.0;
      final dLat = (lat2 - lat1) * pi / 180.0;
      final dLon = (lon2 - lon1) * pi / 180.0;
      final a = sin(dLat / 2) * sin(dLat / 2) +
          cos(lat1 * pi / 180.0) * cos(lat2 * pi / 180.0) * sin(dLon / 2) * sin(dLon / 2);
      final c = 2 * atan2(sqrt(a), sqrt(1 - a));
      return r * c;
    }
  }

  @override
  LocationData? resolveAddressCoordinates(String address, {bool isDropoff = false}) {
    return _matchLocationByKeyword(address);
  }
}

class MockLocationService implements LocationService {
  LocationData? mockedLocation = LocationData(
    latitude: 10.7385,
    longitude: 106.7215,
    accuracyMeters: 8.5,
    timestamp: DateTime.now(),
  );

  @override
  Future<bool> isLocationServiceEnabled() async => true;

  @override
  Future<LocationPermission> checkPermission() async => LocationPermission.always;

  @override
  Future<LocationPermission> requestPermission() async => LocationPermission.always;

  @override
  Future<LocationData?> getCurrentLocation() async => mockedLocation;

  @override
  double calculateDistanceMeters(double lat1, double lon1, double lat2, double lon2) {
    const r = 6371000.0;
    final dLat = (lat2 - lat1) * pi / 180.0;
    final dLon = (lon2 - lon1) * pi / 180.0;
    final a = sin(dLat / 2) * sin(dLat / 2) +
        cos(lat1 * pi / 180.0) * cos(lat2 * pi / 180.0) * sin(dLon / 2) * sin(dLon / 2);
    final c = 2 * atan2(sqrt(a), sqrt(1 - a));
    return r * c;
  }

  @override
  LocationData? resolveAddressCoordinates(String address, {bool isDropoff = false}) {
    return _matchLocationByKeyword(address);
  }
}
