import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';

import '../constants/app_colors.dart';
import '../services/distance_trend_tracker.dart';

class RescueTrackingMap extends StatefulWidget {
  const RescueTrackingMap({
    super.key,
    required this.mechanicLatitude,
    required this.mechanicLongitude,
    required this.targetLatitude,
    required this.targetLongitude,
    this.height = 230,
  });

  final double mechanicLatitude;
  final double mechanicLongitude;
  final double targetLatitude;
  final double targetLongitude;
  final double height;

  @override
  State<RescueTrackingMap> createState() => _RescueTrackingMapState();
}

class _RescueTrackingMapState extends State<RescueTrackingMap> {
  final MapController _mapController = MapController();
  final Distance _distance = const Distance();
  List<LatLng> _routePoints = const [];
  LatLng? _lastRouteOrigin;
  DateTime? _lastRouteFetchAt;
  bool _fetchingRoute = false;
  double? _routeDistanceMeters;

  LatLng get _mechanic =>
      LatLng(widget.mechanicLatitude, widget.mechanicLongitude);
  LatLng get _target => LatLng(widget.targetLatitude, widget.targetLongitude);

  @override
  void initState() {
    super.initState();
    _routePoints = [_mechanic, _target];
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _fitMarkers();
      _refreshRoute(force: true);
    });
  }

  @override
  void didUpdateWidget(covariant RescueTrackingMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    final targetChanged =
        oldWidget.targetLatitude != widget.targetLatitude ||
        oldWidget.targetLongitude != widget.targetLongitude;
    final positionChanged =
        oldWidget.mechanicLatitude != widget.mechanicLatitude ||
        oldWidget.mechanicLongitude != widget.mechanicLongitude;
    if (!targetChanged && !positionChanged) return;

    if (_routeDistanceMeters == null) {
      setState(() => _routePoints = [_mechanic, _target]);
    }
    WidgetsBinding.instance.addPostFrameCallback((_) => _fitMarkers());
    _refreshRoute(force: targetChanged);
  }

  void _fitMarkers() {
    if (!mounted) return;
    _mapController.fitCamera(
      CameraFit.coordinates(
        coordinates: [_mechanic, _target],
        padding: const EdgeInsets.all(42),
        maxZoom: 17,
      ),
    );
  }

  bool _shouldRefreshRoute({required bool force}) {
    if (force || _lastRouteOrigin == null || _lastRouteFetchAt == null) {
      return true;
    }
    final movedMeters = _distance.as(
      LengthUnit.Meter,
      _lastRouteOrigin!,
      _mechanic,
    );
    final elapsed = DateTime.now().difference(_lastRouteFetchAt!);
    return movedMeters >= 100 || elapsed >= const Duration(seconds: 25);
  }

  Future<void> _refreshRoute({bool force = false}) async {
    if (_fetchingRoute || !_shouldRefreshRoute(force: force)) return;
    _fetchingRoute = true;
    final origin = _mechanic;
    final target = _target;
    _lastRouteOrigin = origin;
    _lastRouteFetchAt = DateTime.now();

    try {
      final uri = Uri.https(
        'router.project-osrm.org',
        '/route/v1/driving/${origin.longitude},${origin.latitude};${target.longitude},${target.latitude}',
        const {'overview': 'full', 'geometries': 'geojson', 'steps': 'false'},
      );
      final response = await http.get(uri).timeout(const Duration(seconds: 8));
      if (response.statusCode != 200) return;
      final body = jsonDecode(response.body) as Map<String, dynamic>;
      final routes = body['routes'] as List<dynamic>?;
      if (routes == null || routes.isEmpty) return;
      final route = routes.first as Map<String, dynamic>;
      final geometry = route['geometry'] as Map<String, dynamic>?;
      final coordinates = geometry?['coordinates'] as List<dynamic>?;
      if (coordinates == null || coordinates.length < 2) return;
      final points = coordinates
          .map((coordinate) {
            final pair = coordinate as List<dynamic>;
            return LatLng(
              (pair[1] as num).toDouble(),
              (pair[0] as num).toDouble(),
            );
          })
          .toList(growable: false);
      if (!mounted) return;
      setState(() {
        _routePoints = points;
        _routeDistanceMeters = (route['distance'] as num?)?.toDouble();
      });
    } catch (_) {
      // Keep the direct fallback line when routing is temporarily unavailable.
    } finally {
      _fetchingRoute = false;
    }
  }

  @override
  Widget build(BuildContext context) => SizedBox(
    height: widget.height,
    child: ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: Stack(
        children: [
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCameraFit: CameraFit.coordinates(
                coordinates: [_mechanic, _target],
                padding: const EdgeInsets.all(42),
                maxZoom: 17,
              ),
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.prm393.floodrescue',
                maxZoom: 19,
              ),
              PolylineLayer(
                polylines: [
                  Polyline(
                    points: _routePoints,
                    strokeWidth: 5,
                    color: AppColors.primaryOrange,
                  ),
                ],
              ),
              MarkerLayer(
                markers: [
                  Marker(
                    point: _mechanic,
                    width: 46,
                    height: 46,
                    child: const CircleAvatar(
                      backgroundColor: AppColors.tertiary,
                      child: Icon(Icons.two_wheeler, color: Colors.white),
                    ),
                  ),
                  Marker(
                    point: _target,
                    width: 46,
                    height: 46,
                    child: const Icon(
                      Icons.location_pin,
                      size: 44,
                      color: AppColors.primaryOrange,
                    ),
                  ),
                ],
              ),
            ],
          ),
          Positioned(
            left: 8,
            bottom: 8,
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: .92),
                borderRadius: BorderRadius.circular(6),
              ),
              child: const Padding(
                padding: EdgeInsets.symmetric(horizontal: 7, vertical: 4),
                child: Text(
                  '© OpenStreetMap contributors · OSRM',
                  style: TextStyle(fontSize: 9, color: AppColors.secondary),
                ),
              ),
            ),
          ),
          if (_routeDistanceMeters != null)
            Positioned(
              right: 8,
              top: 8,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: .94),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 9,
                    vertical: 6,
                  ),
                  child: Text(
                    '${(_routeDistanceMeters! / 1000).toStringAsFixed(1)} km',
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    ),
  );
}

class DistanceTrendIndicator extends StatelessWidget {
  const DistanceTrendIndicator({
    super.key,
    required this.trend,
    this.mechanicView = false,
  });

  final DistanceTrend trend;
  final bool mechanicView;

  @override
  Widget build(BuildContext context) {
    final (icon, label, color) = switch (trend) {
      DistanceTrend.approaching => (
        Icons.trending_down_rounded,
        mechanicView
            ? 'Bạn đang đến gần điểm đón'
            : 'Thợ đang đến gần điểm đón',
        const Color(0xFF138A62),
      ),
      DistanceTrend.movingAway => (
        Icons.trending_up_rounded,
        mechanicView ? 'Bạn đang đi xa điểm đón' : 'Khoảng cách đang tăng',
        AppColors.error,
      ),
      DistanceTrend.stable => (
        Icons.trending_flat_rounded,
        'Khoảng cách gần như không đổi',
        AppColors.secondary,
      ),
      DistanceTrend.unknown => (
        Icons.sync_rounded,
        'Đang thu thập thêm dữ liệu GPS',
        AppColors.secondary,
      ),
    };

    return Row(
      key: const ValueKey('distance-trend-indicator'),
      children: [
        Icon(icon, size: 18, color: color),
        const SizedBox(width: 7),
        Expanded(
          child: Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ),
      ],
    );
  }
}
