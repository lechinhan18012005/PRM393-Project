import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../../core/constants/app_colors.dart';
import '../../core/services/location_service.dart';

class PickedMapLocation {
  const PickedMapLocation({required this.latitude, required this.longitude});

  final double latitude;
  final double longitude;
}

class MapLocationPickerScreen extends StatefulWidget {
  const MapLocationPickerScreen({
    super.key,
    required this.title,
    required this.instruction,
    this.initialLatitude,
    this.initialLongitude,
  });

  final String title;
  final String instruction;
  final double? initialLatitude;
  final double? initialLongitude;

  @override
  State<MapLocationPickerScreen> createState() =>
      _MapLocationPickerScreenState();
}

class _MapLocationPickerScreenState extends State<MapLocationPickerScreen> {
  final MapController _mapController = MapController();
  LatLng? _selected;
  bool _locating = false;

  LatLng get _initialCenter => LatLng(
    widget.initialLatitude ?? 10.7894,
    widget.initialLongitude ?? 106.6269,
  );

  @override
  void initState() {
    super.initState();
    if (widget.initialLatitude != null && widget.initialLongitude != null) {
      _selected = _initialCenter;
    }
  }

  Future<void> _useCurrentLocation() async {
    setState(() => _locating = true);
    try {
      final location = await LocationService.instance.getCurrentLocation();
      if (!mounted) return;
      if (location == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Không lấy được GPS. Hãy bật vị trí và cấp quyền.'),
          ),
        );
        return;
      }
      final point = LatLng(location.latitude, location.longitude);
      setState(() => _selected = point);
      _mapController.move(point, 17);
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  void _confirm() {
    final point = _selected;
    if (point == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Hãy chạm lên bản đồ để đặt ghim.')),
      );
      return;
    }
    Navigator.pop(
      context,
      PickedMapLocation(latitude: point.latitude, longitude: point.longitude),
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(widget.title)),
    body: Stack(
      children: [
        FlutterMap(
          mapController: _mapController,
          options: MapOptions(
            initialCenter: _initialCenter,
            initialZoom: 16,
            onTap: (_, point) => setState(() => _selected = point),
          ),
          children: [
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.prm393.floodrescue.mobile',
            ),
            if (_selected != null)
              MarkerLayer(
                markers: [
                  Marker(
                    point: _selected!,
                    width: 54,
                    height: 54,
                    alignment: Alignment.topCenter,
                    child: const Icon(
                      Icons.location_pin,
                      size: 50,
                      color: AppColors.primaryOrange,
                    ),
                  ),
                ],
              ),
            const RichAttributionWidget(
              attributions: [
                TextSourceAttribution('OpenStreetMap contributors'),
              ],
            ),
          ],
        ),
        Positioned(
          left: 16,
          right: 16,
          top: 16,
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Text(widget.instruction, textAlign: TextAlign.center),
            ),
          ),
        ),
        Positioned(
          right: 16,
          bottom: 116,
          child: FloatingActionButton.small(
            heroTag: 'current-location',
            onPressed: _locating ? null : _useCurrentLocation,
            child: _locating
                ? const Padding(
                    padding: EdgeInsets.all(10),
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.my_location),
          ),
        ),
      ],
    ),
    bottomNavigationBar: SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
        child: FilledButton.icon(
          onPressed: _confirm,
          icon: const Icon(Icons.check_circle_outline),
          label: Text(
            _selected == null
                ? 'Chọn một vị trí trên bản đồ'
                : 'Xác nhận vị trí này',
          ),
        ),
      ),
    ),
  );
}
