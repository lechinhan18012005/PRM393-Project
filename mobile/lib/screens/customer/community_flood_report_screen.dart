import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:image_picker/image_picker.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';

import '../../core/constants/app_colors.dart';
import '../../core/services/location_service.dart';
import '../../core/services/media_service.dart';
import '../../core/widgets/rescue_ui.dart';
import '../../features/batch_transport/map_location_picker_screen.dart';
import '../../providers/flood_report_provider.dart';
import 'my_flood_reports_screen.dart';

class HcmcLocationRef {
  final String title;
  final String address;
  final double lat;
  final double lng;
  const HcmcLocationRef(this.title, this.address, this.lat, this.lng);
}

const List<HcmcLocationRef> _hcmcLocations = [
  HcmcLocationRef(
    'Trần Xuân Soạn',
    'Số 148 Trần Xuân Soạn, P. Tân Hưng, Quận 7',
    10.7423,
    106.7021,
  ),
  HcmcLocationRef(
    'Huỳnh Tấn Phát',
    '520 Huỳnh Tấn Phát, P. Tân Phú, Quận 7',
    10.7381,
    106.7212,
  ),
  HcmcLocationRef(
    'Mễ Cốc',
    'Đường Mễ Cốc, Phường 15, Quận 8',
    10.7510,
    106.6620,
  ),
  HcmcLocationRef(
    'Bến Bình Đông',
    'Bến Bình Đông, Phường 13, Quận 8',
    10.7420,
    106.7020,
  ),
  HcmcLocationRef(
    'Quốc Hương',
    'Đường Quốc Hương, P. Thảo Điền, TP. Thủ Đức',
    10.8035,
    106.7350,
  ),
  HcmcLocationRef(
    'Nguyễn Văn Quá',
    'Đường Nguyễn Văn Quá, P. Đông Hưng Thuận, Quận 12',
    10.8410,
    106.6210,
  ),
  HcmcLocationRef(
    'Nguyễn Hữu Cảnh',
    'Đường Nguyễn Hữu Cảnh, P. 22, Quận Bình Thạnh',
    10.7930,
    106.7170,
  ),
  HcmcLocationRef(
    'Nguyễn Gia Trí',
    'Đường Nguyễn Gia Trí (D2), P. 25, Quận Bình Thạnh',
    10.8025,
    106.7145,
  ),
  HcmcLocationRef(
    'Ung Văn Khiêm',
    'Đường Ung Văn Khiêm, P. 25, Quận Bình Thạnh',
    10.8060,
    106.7180,
  ),
  HcmcLocationRef(
    'Kha Vạn Cân',
    'Đường Kha Vạn Cân, P. Linh Đông, TP. Thủ Đức',
    10.8500,
    106.7580,
  ),
  HcmcLocationRef(
    'Võ Văn Ngân',
    'Đường Võ Văn Ngân, P. Linh Chiểu, TP. Thủ Đức',
    10.8520,
    106.7720,
  ),
  HcmcLocationRef(
    'Cây Trâm',
    'Đường Nguyễn Văn Khối (Cây Trâm), P. 8, Quận Gò Vấp',
    10.8430,
    106.6560,
  ),
  HcmcLocationRef(
    'Phan Huy Ích',
    'Đường Phan Huy Ích, P. 14, Quận Gò Vấp',
    10.8380,
    106.6380,
  ),
  HcmcLocationRef(
    'Cộng Hòa',
    'Đường Cộng Hòa, P. 13, Quận Tân Bình',
    10.8010,
    106.6530,
  ),
  HcmcLocationRef(
    'Trường Chinh',
    'Đường Trường Chinh, P. 15, Quận Tân Bình',
    10.8140,
    106.6350,
  ),
  HcmcLocationRef(
    'Bến Thành',
    'Khu vực Chợ Bến Thành, Quận 1',
    10.7720,
    106.6980,
  ),
  HcmcLocationRef(
    'Cầu Tân Thuận',
    'Cầu Tân Thuận, Phường Tân Thuận Đông, Quận 7',
    10.7580,
    106.7120,
  ),
  HcmcLocationRef(
    'Phạm Thế Hiển',
    'Đường Phạm Thế Hiển, Phường 4, Quận 8',
    10.7410,
    106.6780,
  ),
  HcmcLocationRef(
    'Tạ Quang Bửu',
    'Đường Tạ Quang Bửu, Phường 5, Quận 8',
    10.7350,
    106.6710,
  ),
  HcmcLocationRef(
    'An Dương Vương',
    'Đường An Dương Vương, Phường 16, Quận 8',
    10.7310,
    106.6280,
  ),
  HcmcLocationRef(
    'Hồ Học Lãm',
    'Đường Hồ Học Lãm, Phường An Lạc, Quận Bình Tân',
    10.7290,
    106.6120,
  ),
  HcmcLocationRef(
    'Lê Đức Thọ',
    'Đường Lê Đức Thọ, Phường 16, Quận Gò Vấp',
    10.8510,
    106.6720,
  ),
];

class CommunityFloodReportScreen extends StatefulWidget {
  const CommunityFloodReportScreen({super.key});

  @override
  State<CommunityFloodReportScreen> createState() =>
      _CommunityFloodReportScreenState();
}

class _CommunityFloodReportScreenState
    extends State<CommunityFloodReportScreen> {
  final MapController _mapController = MapController();

  int _depthLevel = 2; // 1: Mắt cá (<=25cm), 2: Bánh xe (26-50cm), 3: Yên xe (>50cm)
  double? _latitude;
  double? _longitude;
  bool _isLocating = false;
  bool _isUploadingPhoto = false;

  final _latController = TextEditingController();
  final _lngController = TextEditingController();
  final _addressController = TextEditingController();
  final _depthController = TextEditingController(text: '40');
  final _noteController = TextEditingController();

  final List<Uint8List> _photoBytes = [];
  final List<String> _attachedPhotos = [];

  bool get _isTestEnvironment {
    if (kIsWeb) return false;
    try {
      return Platform.environment.containsKey('FLUTTER_TEST');
    } catch (_) {
      return false;
    }
  }

  LatLng get _initialMapCenter {
    if (_latitude != null && _longitude != null) {
      return LatLng(_latitude!, _longitude!);
    }
    // Default to Ho Chi Minh City Center
    return const LatLng(10.7769, 106.7009);
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _detectCurrentLocation(silent: true);
    });
  }

  @override
  void dispose() {
    _mapController.dispose();
    _latController.dispose();
    _lngController.dispose();
    _addressController.dispose();
    _depthController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  HcmcLocationRef? _findNearestLocation(double lat, double lng, {double maxDistanceKm = 1.5}) {
    HcmcLocationRef? nearest;
    double minDistance = double.infinity;
    for (final loc in _hcmcLocations) {
      final dist = LocationService.instance.calculateDistanceMeters(
        lat,
        lng,
        loc.lat,
        loc.lng,
      );
      if (dist < minDistance && dist <= maxDistanceKm * 1000) {
        minDistance = dist;
        nearest = loc;
      }
    }
    return nearest;
  }

  Future<void> _detectCurrentLocation({bool silent = false}) async {
    setState(() => _isLocating = true);
    try {
      final loc = await LocationService.instance.getCurrentLocation();
      if (!mounted) return;
      setState(() => _isLocating = false);
      if (loc != null) {
        _updateLocationCoordinates(
          loc.latitude,
          loc.longitude,
          syncAddress: true,
        );

        if (!silent) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'Đã lấy vị trí GPS: ${loc.latitude.toStringAsFixed(6)}, ${loc.longitude.toStringAsFixed(6)}',
              ),
              backgroundColor: Colors.green,
            ),
          );
        }
      } else {
        if (!silent) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                'Không thể lấy vị trí GPS hiện tại. Vui lòng chạm lên bản đồ để đánh dấu điểm ngập.',
              ),
              backgroundColor: Colors.orange,
            ),
          );
        }
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLocating = false);
      if (!silent) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lỗi khi lấy vị trí GPS: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _updateLocationCoordinates(
    double lat,
    double lng, {
    bool syncAddress = false,
  }) {
    setState(() {
      _latitude = lat;
      _longitude = lng;
      _latController.text = lat.toStringAsFixed(6);
      _lngController.text = lng.toStringAsFixed(6);

      if (syncAddress && _addressController.text.trim().isEmpty) {
        final nearest = _findNearestLocation(lat, lng);
        if (nearest != null) {
          _addressController.text = nearest.address;
        }
      }
    });

    try {
      _mapController.move(LatLng(lat, lng), 15.5);
    } catch (_) {}
  }

  void _onMapPinTapped(double lat, double lng) {
    _updateLocationCoordinates(lat, lng, syncAddress: true);
  }

  void _onCoordinateInputChanged() {
    final lat = double.tryParse(_latController.text.trim());
    final lng = double.tryParse(_lngController.text.trim());
    if (lat != null && lng != null && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      setState(() {
        _latitude = lat;
        _longitude = lng;
      });
      try {
        _mapController.move(LatLng(lat, lng), 15.5);
      } catch (_) {}

      if (_addressController.text.trim().isEmpty) {
        final nearest = _findNearestLocation(lat, lng);
        if (nearest != null) {
          _addressController.text = nearest.address;
        }
      }
    }
  }

  void _onAddressChanged(String text) {
    final trimmed = text.trim().toLowerCase();
    if (trimmed.length < 3) return;

    for (final loc in _hcmcLocations) {
      if (trimmed.contains(loc.title.toLowerCase()) ||
          loc.address.toLowerCase().contains(trimmed)) {
        setState(() {
          _latitude = loc.lat;
          _longitude = loc.lng;
          _latController.text = loc.lat.toStringAsFixed(6);
          _lngController.text = loc.lng.toStringAsFixed(6);
        });
        try {
          _mapController.move(LatLng(loc.lat, loc.lng), 15.5);
        } catch (_) {}
        break;
      }
    }
  }

  Future<void> _openFullScreenMapPicker() async {
    final picked = await Navigator.of(context).push<PickedMapLocation>(
      MaterialPageRoute(
        builder: (_) => MapLocationPickerScreen(
          title: 'Đánh dấu điểm ngập lụt',
          instruction: 'Chạm lên vị trí ngập trên bản đồ để cắm ghim',
          initialLatitude: _latitude,
          initialLongitude: _longitude,
        ),
      ),
    );
    if (picked != null) {
      _updateLocationCoordinates(
        picked.latitude,
        picked.longitude,
        syncAddress: true,
      );
    }
  }

  String _getDepthEnum() {
    switch (_depthLevel) {
      case 1:
        return 'ANKLE_20CM';
      case 3:
        return 'SEAT_60CM_PLUS';
      case 2:
      default:
        return 'HALF_WHEEL_40CM';
    }
  }

  void _onDepthInputChanged(String val) {
    final cm = int.tryParse(val.trim());
    if (cm != null) {
      setState(() {
        if (cm <= 25) {
          _depthLevel = 1;
        } else if (cm <= 50) {
          _depthLevel = 2;
        } else {
          _depthLevel = 3;
        }
      });
    }
  }

  void _selectDepthPreset(int level, int cm) {
    setState(() {
      _depthLevel = level;
      _depthController.text = cm.toString();
    });
  }

  Future<void> _pickAndUploadPhoto() async {
    if (_attachedPhotos.length >= 3) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Tối đa 3 ảnh hiện trường.')),
      );
      return;
    }

    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => SafeArea(
        child: Wrap(
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt, color: AppColors.primaryOrange),
              title: const Text('Chụp ảnh từ Camera'),
              onTap: () => Navigator.pop(ctx, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library, color: Colors.blue),
              title: const Text('Chọn ảnh từ Thư viện'),
              onTap: () => Navigator.pop(ctx, ImageSource.gallery),
            ),
          ],
        ),
      ),
    );

    if (source == null) return;

    setState(() => _isUploadingPhoto = true);
    try {
      final mediaFile = source == ImageSource.camera
          ? await MediaService.instance.pickImageFromCamera()
          : await MediaService.instance.pickImageFromGallery();

      if (mediaFile == null) {
        if (mounted) setState(() => _isUploadingPhoto = false);
        return;
      }

      if (!mounted) return;
      final url = await context.read<FloodReportProvider>().uploadPhoto(
        mediaFile.bytes,
        mediaFile.filename,
      );

      if (!mounted) return;
      setState(() {
        if (_attachedPhotos.length < 3) {
          _photoBytes.add(mediaFile.bytes);
          _attachedPhotos.add(url);
        }
        _isUploadingPhoto = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Đã đính kèm ảnh hiện trường thành công!'),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      if (mounted) {
        setState(() => _isUploadingPhoto = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lỗi tải ảnh lên: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _removePhoto(int index) {
    setState(() {
      if (index >= 0 && index < _attachedPhotos.length) {
        _attachedPhotos.removeAt(index);
        if (index < _photoBytes.length) {
          _photoBytes.removeAt(index);
        }
      }
    });
  }

  void _viewFullPhoto(int index) {
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(16),
        child: Stack(
          alignment: Alignment.center,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: index < _photoBytes.length
                  ? Image.memory(_photoBytes[index], fit: BoxFit.contain)
                  : Image.network(_attachedPhotos[index], fit: BoxFit.contain),
            ),
            Positioned(
              top: 10,
              right: 10,
              child: GestureDetector(
                onTap: () => Navigator.pop(ctx),
                child: Container(
                  padding: const EdgeInsets.all(6),
                  decoration: const BoxDecoration(
                    color: Colors.black54,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.close, color: Colors.white, size: 20),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _openManualPinSelector() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Chọn điểm nóng gợi ý ngập lụt',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
              ),
              const Divider(),
              Expanded(
                child: ListView.separated(
                  itemCount: _hcmcLocations.length,
                  separatorBuilder: (context, index) => const Divider(height: 1),
                  itemBuilder: (context, i) {
                    final h = _hcmcLocations[i];
                    return ListTile(
                      leading: const Icon(
                        Icons.pin_drop,
                        color: AppColors.primaryOrange,
                      ),
                      title: Text(
                        h.title,
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      subtitle: Text(
                        h.address,
                        style: const TextStyle(fontSize: 12),
                      ),
                      onTap: () {
                        setState(() {
                          _addressController.text = h.address;
                        });
                        _updateLocationCoordinates(h.lat, h.lng);
                        Navigator.pop(ctx);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('Đã ghim vị trí: ${h.address}'),
                            backgroundColor: Colors.green,
                          ),
                        );
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final floodProvider = context.watch<FloodReportProvider>();

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text(
          'Báo ngập',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        actions: [
          TextButton.icon(
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => const MyFloodReportsScreen(),
                ),
              );
            },
            icon: const Icon(Icons.history, size: 18),
            label: const Text('Báo cáo của tôi'),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const RescueIntro(
              eyebrow: 'CỘNG ĐỒNG ĐỒNG HÀNH',
              title: 'Chia sẻ điểm ngập',
              description:
                  'Đánh dấu điểm ngập trực tiếp trên bản đồ và cung cấp mực nước để hỗ trợ người đi đường né tránh kịp thời.',
            ),
            const SizedBox(height: 16),

            // Map Section Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'BẢN ĐỒ ĐIỂM NGẬP LỤT *',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: AppColors.outline,
                  ),
                ),
                TextButton.icon(
                  onPressed: _openFullScreenMapPicker,
                  icon: const Icon(Icons.fullscreen, size: 16),
                  label: const Text(
                    'Mở bản đồ lớn',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                  ),
                  style: TextButton.styleFrom(
                    padding: EdgeInsets.zero,
                    minimumSize: const Size(50, 24),
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),

            // Interactive Map Box
            Container(
              height: 230,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: _latitude != null
                      ? AppColors.primaryOrange
                      : Colors.grey.shade300,
                  width: _latitude != null ? 2 : 1,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(15),
                child: Stack(
                  children: [
                    FlutterMap(
                      mapController: _mapController,
                      options: MapOptions(
                        initialCenter: _initialMapCenter,
                        initialZoom: 15.0,
                        onTap: (_, point) {
                          _onMapPinTapped(point.latitude, point.longitude);
                        },
                        interactionOptions: const InteractionOptions(
                          flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
                        ),
                      ),
                      children: [
                        if (!_isTestEnvironment)
                          TileLayer(
                            urlTemplate:
                                'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
                            subdomains: const ['0', '1', '2', '3'],
                            userAgentPackageName:
                                'com.prm393.floodrescue.mobile',
                          ),
                        if (_latitude != null && _longitude != null)
                          MarkerLayer(
                            markers: [
                              Marker(
                                point: LatLng(_latitude!, _longitude!),
                                width: 50,
                                height: 50,
                                alignment: Alignment.topCenter,
                                child: const Icon(
                                  Icons.location_pin,
                                  size: 46,
                                  color: Colors.red,
                                ),
                              ),
                            ],
                          ),
                      ],
                    ),

                    // Instruction banner on top of map
                    Positioned(
                      top: 8,
                      left: 8,
                      right: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.94),
                          borderRadius: BorderRadius.circular(8),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.1),
                              blurRadius: 4,
                            ),
                          ],
                        ),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.touch_app,
                              size: 16,
                              color: AppColors.primaryOrange,
                            ),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                _latitude != null
                                    ? 'Chạm vị trí bất kỳ trên bản đồ để đổi nút đỏ'
                                    : 'Chạm lên bản đồ để đánh dấu điểm ngập lụt',
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.black87,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    // Quick GPS locate button
                    Positioned(
                      bottom: 10,
                      right: 10,
                      child: FloatingActionButton.small(
                        heroTag: 'map_gps_btn',
                        backgroundColor: Colors.white,
                        foregroundColor: Colors.blue,
                        tooltip: 'Lấy vị trí GPS hiện tại',
                        onPressed: () => _detectCurrentLocation(silent: false),
                        child: _isLocating
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : const Icon(Icons.my_location, size: 20),
                      ),
                    ),

                    // Quick hotspots selector button
                    Positioned(
                      bottom: 10,
                      left: 10,
                      child: InkWell(
                        onTap: _openManualPinSelector,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(20),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.15),
                                blurRadius: 4,
                              ),
                            ],
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.list,
                                size: 14,
                                color: AppColors.primaryOrange,
                              ),
                              SizedBox(width: 4),
                              Text(
                                'Điểm nóng gợi ý',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.black87,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Two separate fields for Latitude and Longitude
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _latController,
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                      signed: true,
                    ),
                    decoration: InputDecoration(
                      labelText: 'Vĩ độ (Latitude) *',
                      hintText: '10.742300',
                      prefixIcon: const Icon(
                        Icons.north,
                        size: 18,
                        color: Colors.red,
                      ),
                      filled: true,
                      fillColor: Colors.white,
                      isDense: true,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    onChanged: (_) => _onCoordinateInputChanged(),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: TextField(
                    controller: _lngController,
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                      signed: true,
                    ),
                    decoration: InputDecoration(
                      labelText: 'Kinh độ (Longitude) *',
                      hintText: '106.702100',
                      prefixIcon: const Icon(
                        Icons.east,
                        size: 18,
                        color: Colors.blue,
                      ),
                      filled: true,
                      fillColor: Colors.white,
                      isDense: true,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    onChanged: (_) => _onCoordinateInputChanged(),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),

            // Dedicated Street / Address text field
            TextField(
              controller: _addressController,
              decoration: InputDecoration(
                labelText: 'Tên đường / Số nhà / Địa chỉ chi tiết *',
                hintText: 'VD: Số 148 Trần Xuân Soạn, Quận 7',
                prefixIcon: const Icon(
                  Icons.edit_location_alt,
                  color: AppColors.primaryOrange,
                ),
                suffixIcon: _addressController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 18),
                        onPressed: () {
                          setState(() {
                            _addressController.clear();
                          });
                        },
                      )
                    : null,
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              onChanged: _onAddressChanged,
            ),
            const SizedBox(height: 16),

            // Water Depth Input Section
            const Text(
              'MỰC NƯỚC HIỆN TẠI (NHẬP SỐ HOẶC CHỌN) *',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: AppColors.outline,
              ),
            ),
            const SizedBox(height: 8),

            // Direct depth input field
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _depthController,
                    keyboardType: TextInputType.number,
                    onChanged: _onDepthInputChanged,
                    decoration: InputDecoration(
                      labelText: 'Chiều cao mực nước ngập',
                      hintText: 'Nhập số cm (VD: 30, 45, 70...)',
                      prefixIcon: const Icon(Icons.waves, color: Colors.blue),
                      suffixText: 'cm',
                      suffixStyle: const TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Colors.blue,
                        fontSize: 14,
                      ),
                      filled: true,
                      fillColor: Colors.white,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Hoặc bấm chọn nhanh mức tương ứng:',
              style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                _buildDepthOption(
                  1,
                  '20cm',
                  'Ngập mắt cá chân',
                  Colors.amber.shade700,
                  20,
                ),
                const SizedBox(width: 8),
                _buildDepthOption(
                  2,
                  '40cm',
                  'Ngập nửa bánh xe',
                  Colors.orange,
                  40,
                ),
                const SizedBox(width: 8),
                _buildDepthOption(
                  3,
                  '60cm+',
                  'Ngập lút yên xe',
                  Colors.red,
                  60,
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Photos section
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'ẢNH CHỤP HIỆN TRƯỜNG (TÙY CHỌN)',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: AppColors.outline,
                  ),
                ),
                Text(
                  '${_attachedPhotos.length}/3 ảnh',
                  style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                _buildPhotoSlot(0),
                const SizedBox(width: 8),
                _buildPhotoSlot(1),
                const SizedBox(width: 8),
                _buildPhotoSlot(2),
              ],
            ),
            const SizedBox(height: 16),

            // Note/Description
            const Text(
              'MÔ TẢ CHI TIẾT TÌNH HÌNH',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: AppColors.outline,
              ),
            ),
            const SizedBox(height: 6),
            TextField(
              controller: _noteController,
              maxLines: 2,
              decoration: InputDecoration(
                hintText:
                    'VD: Nước chảy xiết, nhiều xe chết máy, có ổ gà lớn bên phải...',
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Submit Button
            if (floodProvider.isLoading)
              const Center(child: CircularProgressIndicator())
            else
              ElevatedButton.icon(
                onPressed: () async {
                  // Validate coordinates
                  final lat = double.tryParse(_latController.text.trim()) ?? _latitude;
                  final lng = double.tryParse(_lngController.text.trim()) ?? _longitude;

                  if (lat == null || lng == null) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text(
                          'Vui lòng nhập tọa độ hoặc chạm lên bản đồ để đánh dấu điểm ngập!',
                        ),
                        backgroundColor: Colors.orange,
                      ),
                    );
                    return;
                  }

                  // Validate address
                  final addressText = _addressController.text.trim();
                  if (addressText.isEmpty) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Vui lòng nhập tên đường / địa chỉ điểm ngập!'),
                      ),
                    );
                    return;
                  }

                  // Validate water depth
                  final depthCm = int.tryParse(_depthController.text.trim());
                  if (depthCm == null || depthCm <= 0) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Vui lòng nhập chiều cao mực nước ngập (cm)!'),
                      ),
                    );
                    return;
                  }

                  // Format description with custom depth
                  String? description;
                  final userNote = _noteController.text.trim();
                  final depthPrefix = 'Mực nước: ${depthCm}cm.';
                  if (userNote.isNotEmpty) {
                    description = '$depthPrefix $userNote';
                  } else {
                    description = depthPrefix;
                  }

                  final success = await context
                      .read<FloodReportProvider>()
                      .submitFloodReport(
                        latitude: lat,
                        longitude: lng,
                        address: addressText,
                        waterDepthLevel: _getDepthEnum(),
                        description: description,
                        imageUrls: _attachedPhotos.isNotEmpty
                            ? _attachedPhotos.join(',')
                            : null,
                      );

                  if (context.mounted) {
                    if (success) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text(
                            'Đã gửi báo cáo điểm ngập! Hệ thống đang cập nhật cảnh báo bản đồ (+10 điểm uy tín).',
                          ),
                          backgroundColor: Colors.green,
                        ),
                      );
                      Navigator.of(context).pop();
                    } else {
                      // Xử lý lỗi offline hoặc lỗi khác
                      final errorMsg = floodProvider.errorMessage ?? '';
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Gửi thất bại: $errorMsg'),
                          backgroundColor: Colors.red,
                          action: SnackBarAction(
                            label: 'Lưu ngoại tuyến',
                            textColor: Colors.white,
                            onPressed: () {
                              context
                                  .read<FloodReportProvider>()
                                  .enqueueOfflineReport(
                                    latitude: lat,
                                    longitude: lng,
                                    address: addressText,
                                    waterDepthLevel: _getDepthEnum(),
                                    description: description,
                                    imageUrls: _attachedPhotos.isNotEmpty
                                        ? _attachedPhotos.join(',')
                                        : null,
                                  );
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text(
                                    'Đã lưu vào hàng đợi ngoại tuyến. Sẽ tự động gửi khi có mạng!',
                                  ),
                                  backgroundColor: Colors.blue,
                                ),
                              );
                              Navigator.of(context).pop();
                            },
                          ),
                        ),
                      );
                    }
                  }
                },
                icon: const Icon(Icons.send, size: 18),
                label: const Text(
                  'Gửi Báo Cáo Điểm Ngập',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primaryOrange,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildDepthOption(
    int level,
    String label,
    String desc,
    Color color,
    int presetCm,
  ) {
    final isSelected = _depthLevel == level;
    return Expanded(
      child: GestureDetector(
        onTap: () => _selectDepthPreset(level, presetCm),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
          decoration: BoxDecoration(
            color: isSelected ? color.withValues(alpha: 0.12) : Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected ? color : Colors.grey.shade300,
              width: isSelected ? 2 : 1,
            ),
          ),
          child: Column(
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                desc,
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontSize: 10, color: Colors.grey.shade700),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPhotoSlot(int index) {
    final hasPhoto = index < _attachedPhotos.length;
    final isAddSlot = index == _attachedPhotos.length;

    if (hasPhoto) {
      final hasLocalBytes = index < _photoBytes.length;
      return Expanded(
        child: Container(
          height: 90,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.blue.shade300, width: 1.5),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.08),
                blurRadius: 4,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: Stack(
              fit: StackFit.expand,
              children: [
                GestureDetector(
                  onTap: () => _viewFullPhoto(index),
                  child: hasLocalBytes
                      ? Image.memory(
                          _photoBytes[index],
                          fit: BoxFit.cover,
                        )
                      : Image.network(
                          _attachedPhotos[index],
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) =>
                              Container(
                                color: Colors.grey.shade200,
                                child: const Center(
                                  child: Icon(
                                    Icons.broken_image,
                                    color: Colors.grey,
                                  ),
                                ),
                              ),
                        ),
                ),
                // Gradient top overlay for button visibility
                Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 32,
                  child: Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Colors.black.withValues(alpha: 0.55),
                          Colors.transparent,
                        ],
                      ),
                    ),
                  ),
                ),
                // Delete button
                Positioned(
                  top: 4,
                  right: 4,
                  child: GestureDetector(
                    onTap: () => _removePhoto(index),
                    child: Container(
                      padding: const EdgeInsets.all(3),
                      decoration: const BoxDecoration(
                        color: Colors.red,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.close,
                        size: 14,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
                // Small photo index tag
                Positioned(
                  bottom: 4,
                  left: 4,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 5,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.6),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      'Ảnh ${index + 1}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Expanded(
      child: GestureDetector(
        onTap: isAddSlot ? _pickAndUploadPhoto : null,
        child: Container(
          height: 90,
          decoration: BoxDecoration(
            color: isAddSlot ? Colors.blue.shade50 : Colors.grey.shade100,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isAddSlot ? Colors.blue.shade300 : Colors.grey.shade300,
            ),
          ),
          child: Center(
            child: _isUploadingPhoto && isAddSlot
                ? const Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                      SizedBox(height: 6),
                      Text(
                        'Đang tải...',
                        style: TextStyle(fontSize: 10, color: Colors.blue),
                      ),
                    ],
                  )
                : Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        isAddSlot ? Icons.add_a_photo : Icons.image_outlined,
                        color: isAddSlot ? Colors.blue : Colors.grey.shade400,
                        size: 24,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        isAddSlot ? '+ Thêm ảnh' : 'Trống',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight:
                              isAddSlot ? FontWeight.bold : FontWeight.normal,
                          color: isAddSlot
                              ? Colors.blue.shade700
                              : Colors.grey.shade500,
                        ),
                      ),
                    ],
                  ),
          ),
        ),
      ),
    );
  }
}
