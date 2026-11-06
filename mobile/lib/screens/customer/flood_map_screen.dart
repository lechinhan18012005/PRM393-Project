import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/constants/app_colors.dart';
import '../../core/models/flood_report_model.dart';
import '../../core/services/location_service.dart';
import '../../core/widgets/rescue_ui.dart';
import '../../providers/auth_provider.dart';
import '../../providers/flood_report_provider.dart';
import '../auth/login_screen.dart';
import 'community_flood_report_screen.dart';
import 'my_flood_reports_screen.dart';

class FloodMapScreen extends StatefulWidget {
  const FloodMapScreen({super.key});

  @override
  State<FloodMapScreen> createState() => _FloodMapScreenState();
}

class _FloodMapScreenState extends State<FloodMapScreen> {
  final MapController _mapController = MapController();

  int _filterIndex =
      0; // 0: Tất cả, 1: Ngập sâu > 40cm, 2: Cảnh báo đỏ, 3: Đang có cứu hộ
  int? _selectedPointId;
  LatLng? _myLocation;
  bool _isLocating = false;
  bool _isMapExpanded = false;
  bool _isSatelliteMode = false;

  bool get _isTestEnvironment {
    if (kIsWeb) return false;
    try {
      return Platform.environment.containsKey('FLUTTER_TEST');
    } catch (_) {
      return false;
    }
  }

  LatLng get _defaultCenter => const LatLng(10.7769, 106.7009);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<FloodReportProvider>().fetchActiveFloodPoints();
    });
  }

  @override
  void dispose() {
    _mapController.dispose();
    super.dispose();
  }

  List<FloodReportModel> _filterPoints(List<FloodReportModel> all) {
    if (_filterIndex == 1) {
      return all.where((p) => p.waterDepthLevel != 'ANKLE_20CM').toList();
    } else if (_filterIndex == 2) {
      return all.where((p) => p.waterDepthLevel == 'SEAT_60CM_PLUS').toList();
    } else if (_filterIndex == 3) {
      return all
          .where(
            (p) => p.nearbyStations != null && p.nearbyStations!.isNotEmpty,
          )
          .toList();
    }
    return all;
  }

  Future<void> _locateUser() async {
    setState(() => _isLocating = true);
    try {
      final loc = await LocationService.instance.getCurrentLocation();
      if (!mounted) return;
      if (loc != null) {
        final userLatLng = LatLng(loc.latitude, loc.longitude);
        setState(() {
          _myLocation = userLatLng;
          _isLocating = false;
        });
        _mapController.move(userLatLng, 15.0);
      } else {
        setState(() => _isLocating = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Không thể lấy vị trí GPS hiện tại.')),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLocating = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Lỗi định vị GPS: $e')),
        );
      }
    }
  }

  void _focusPoint(FloodReportModel pt) {
    setState(() => _selectedPointId = pt.id);
    _mapController.move(LatLng(pt.latitude, pt.longitude), 15.5);
  }

  void _resetMapView(List<FloodReportModel> points) {
    if (points.isNotEmpty) {
      _mapController.move(
        LatLng(points.first.latitude, points.first.longitude),
        13.5,
      );
    } else {
      _mapController.move(_defaultCenter, 12.5);
    }
  }

  Future<void> _openGoogleMaps(double lat, double lng) async {
    final uri = Uri.parse(
      'https://www.google.com/maps/search/?api=1&query=$lat,$lng',
    );
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Không thể mở ứng dụng bản đồ.')),
        );
      }
    }
  }

  String _formatRelativeTime(String? dateStr) {
    if (dateStr == null || dateStr.trim().isEmpty) return 'Vừa xong';
    try {
      final dt = DateTime.parse(dateStr).toLocal();
      final diff = DateTime.now().difference(dt);
      if (diff.isNegative || diff.inSeconds < 60) return 'Vừa xong';
      if (diff.inMinutes < 60) return '${diff.inMinutes} phút trước';
      if (diff.inHours < 24) return '${diff.inHours} giờ trước';
      if (diff.inDays < 7) return '${diff.inDays} ngày trước';
      return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')} ${dt.day}/${dt.month}';
    } catch (_) {
      return 'Vừa xong';
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<FloodReportProvider>();
    final points = provider.floodPoints;
    final visible = _filterPoints(points);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Bản đồ ngập',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
        ),
        actions: [
          IconButton(
            tooltip: 'Báo cáo của tôi',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => const MyFloodReportsScreen(),
                ),
              );
            },
            icon: const Icon(Icons.history, color: AppColors.secondary),
          ),
          IconButton(
            tooltip: 'Tải lại điểm ngập',
            onPressed: provider.isLoading
                ? null
                : provider.fetchActiveFloodPoints,
            icon: const Icon(Icons.refresh, color: AppColors.secondary),
          ),
        ],
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 760),
          child: RefreshIndicator(
            onRefresh: provider.fetchActiveFloodPoints,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
              children: [
                RescueIntro(
                  eyebrow: 'THÔNG TIN ĐƯỜNG ĐI',
                  title: 'Chủ động trước điểm ngập',
                  description:
                      'Theo dõi điểm ngập trực tiếp trên bản đồ số GIS. Chạm vào điểm ghim để xem mức nước và chọn lộ trình an toàn.',
                ),
                const SizedBox(height: 14),

                // BẢN ĐỒ GIS TƯƠNG TÁC THỰC TẾ
                RescuePanel(
                  padding: 0,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: SizedBox(
                      height: _isMapExpanded ? 340 : 210,
                      child: Stack(
                        children: [
                          FlutterMap(
                            mapController: _mapController,
                            options: MapOptions(
                              initialCenter: visible.isNotEmpty
                                  ? LatLng(
                                      visible.first.latitude,
                                      visible.first.longitude,
                                    )
                                  : _defaultCenter,
                              initialZoom: 13.0,
                              interactionOptions: const InteractionOptions(
                                flags:
                                    InteractiveFlag.all & ~InteractiveFlag.rotate,
                              ),
                            ),
                            children: [
                              if (!_isTestEnvironment)
                                TileLayer(
                                  urlTemplate: _isSatelliteMode
                                      ? 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
                                      : 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
                                  subdomains: const ['0', '1', '2', '3'],
                                  userAgentPackageName:
                                      'com.prm393.floodrescue.mobile',
                                  maxZoom: 20,
                                ),
                              MarkerLayer(
                                markers: [
                                  if (_myLocation != null)
                                    Marker(
                                      point: _myLocation!,
                                      width: 28,
                                      height: 28,
                                      alignment: Alignment.center,
                                      child: Container(
                                        decoration: BoxDecoration(
                                          color: Colors.blue.withValues(
                                            alpha: 0.25,
                                          ),
                                          shape: BoxShape.circle,
                                          border: Border.all(
                                            color: Colors.blueAccent,
                                            width: 2,
                                          ),
                                        ),
                                        child: const Center(
                                          child: Icon(
                                            Icons.my_location,
                                            size: 16,
                                            color: Colors.blueAccent,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ...visible.map((pt) {
                                    final isSelected =
                                        pt.id == _selectedPointId;
                                    return Marker(
                                      point: LatLng(pt.latitude, pt.longitude),
                                      width: isSelected ? 110 : 80,
                                      height: isSelected ? 60 : 46,
                                      alignment: Alignment.topCenter,
                                      child: GestureDetector(
                                        onTap: () => _focusPoint(pt),
                                        child: _buildMapPin(
                                          pt,
                                          isSelected: isSelected,
                                        ),
                                      ),
                                    );
                                  }),
                                ],
                              ),
                            ],
                          ),

                          // Top HUD Controls trên bản đồ
                          Positioned(
                            top: 8,
                            left: 8,
                            right: 8,
                            child: Wrap(
                              alignment: WrapAlignment.spaceBetween,
                              crossAxisAlignment: WrapCrossAlignment.center,
                              runSpacing: 4,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 4,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withValues(alpha: 0.92),
                                    borderRadius: BorderRadius.circular(8),
                                    boxShadow: const [
                                      BoxShadow(
                                        color: Colors.black12,
                                        blurRadius: 4,
                                      ),
                                    ],
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                        Icons.water_drop,
                                        size: 13,
                                        color: visible.isNotEmpty
                                            ? Colors.red
                                            : Colors.green,
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        '${visible.length} điểm ngập',
                                        style: const TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w700,
                                          color: AppColors.secondary,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    // Nút GPS hiện tại
                                    Material(
                                      color:
                                          Colors.white.withValues(alpha: 0.92),
                                      borderRadius: BorderRadius.circular(8),
                                      elevation: 2,
                                      child: InkWell(
                                        borderRadius: BorderRadius.circular(8),
                                        onTap: _isLocating ? null : _locateUser,
                                        child: Padding(
                                          padding: const EdgeInsets.all(6),
                                          child: _isLocating
                                              ? const SizedBox(
                                                  width: 16,
                                                  height: 16,
                                                  child:
                                                      CircularProgressIndicator(
                                                    strokeWidth: 2,
                                                  ),
                                                )
                                              : const Icon(
                                                  Icons.my_location,
                                                  size: 16,
                                                  color: Colors.blueAccent,
                                                ),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    // Nút căn giữa toàn cảnh
                                    Material(
                                      color:
                                          Colors.white.withValues(alpha: 0.92),
                                      borderRadius: BorderRadius.circular(8),
                                      elevation: 2,
                                      child: InkWell(
                                        borderRadius: BorderRadius.circular(8),
                                        onTap: () => _resetMapView(visible),
                                        child: Padding(
                                          padding: const EdgeInsets.all(6),
                                          child: const Icon(
                                            Icons.center_focus_strong,
                                            size: 16,
                                            color: AppColors.secondary,
                                          ),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    // Nút đổi chế độ bản đồ (Đường phố / Vệ tinh)
                                    Material(
                                      color: _isSatelliteMode
                                          ? AppColors.primary
                                          : Colors.white.withValues(alpha: 0.92),
                                      borderRadius: BorderRadius.circular(8),
                                      elevation: 2,
                                      child: InkWell(
                                        borderRadius: BorderRadius.circular(8),
                                        onTap: () => setState(
                                          () => _isSatelliteMode = !_isSatelliteMode,
                                        ),
                                        child: Padding(
                                          padding: const EdgeInsets.all(6),
                                          child: Icon(
                                            _isSatelliteMode
                                                ? Icons.map
                                                : Icons.satellite_alt,
                                            size: 16,
                                            color: _isSatelliteMode
                                                ? Colors.white
                                                : AppColors.secondary,
                                          ),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    // Nút Phóng to / Thu nhỏ khung bản đồ
                                    Material(
                                      color:
                                          Colors.white.withValues(alpha: 0.92),
                                      borderRadius: BorderRadius.circular(8),
                                      elevation: 2,
                                      child: InkWell(
                                        borderRadius: BorderRadius.circular(8),
                                        onTap: () => setState(
                                          () => _isMapExpanded = !_isMapExpanded,
                                        ),
                                        child: Padding(
                                          padding: const EdgeInsets.all(6),
                                          child: Icon(
                                            _isMapExpanded
                                                ? Icons.fullscreen_exit
                                                : Icons.fullscreen,
                                            size: 16,
                                            color: AppColors.secondary,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 14),
                RescueSection(
                  'Danh sách điểm ngập',
                  action: RescueLabel(
                    provider.isLoading
                        ? 'Đang tải...'
                        : '${visible.length} điểm',
                  ),
                ),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildFilterChip(0, 'Tất cả (${points.length})'),
                      const SizedBox(width: 8),
                      _buildFilterChip(1, 'Ngập sâu'),
                      const SizedBox(width: 8),
                      _buildFilterChip(2, 'Cảnh báo đỏ'),
                      const SizedBox(width: 8),
                      _buildFilterChip(3, 'Có trạm cứu hộ'),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                if (provider.isLoading)
                  const Padding(
                    padding: EdgeInsets.only(bottom: 14),
                    child: LinearProgressIndicator(),
                  ),
                if (provider.errorMessage != null)
                  RescuePanel(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Icon(
                          Icons.cloud_off_outlined,
                          color: AppColors.secondary,
                          size: 30,
                        ),
                        const SizedBox(height: 12),
                        const Text(
                          'Chưa cập nhật được điểm ngập',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          provider.errorMessage!,
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.error,
                          ),
                        ),
                        const SizedBox(height: 12),
                        OutlinedButton.icon(
                          onPressed: provider.isLoading
                              ? null
                              : provider.fetchActiveFloodPoints,
                          icon: const Icon(Icons.refresh, size: 17),
                          label: const Text('Thử lại'),
                        ),
                      ],
                    ),
                  ),
                if (visible.isEmpty &&
                    !provider.isLoading &&
                    provider.errorMessage == null)
                  const RescuePanel(
                    child: RescueInfo(
                      icon: Icons.layers_clear_outlined,
                      title: 'Chưa có điểm ngập phù hợp',
                      value:
                          'Danh sách hiện chưa có dữ liệu theo bộ lọc này. Hãy tải lại hoặc đổi bộ lọc.',
                    ),
                  ),
                for (final point in visible)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: _buildFloodPointCard(context, point),
                  ),
              ],
            ),
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          await Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => const CommunityFloodReportScreen(),
            ),
          );
          if (context.mounted) {
            context.read<FloodReportProvider>().fetchActiveFloodPoints();
          }
        },
        backgroundColor: AppColors.primaryOrange,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_location_alt_outlined),
        label: const Text('Báo điểm ngập'),
      ),
    );
  }

  Widget _buildMapPin(FloodReportModel pt, {bool isSelected = false}) {
    return Tooltip(
      message: '${pt.address} (${pt.depthCm})',
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
            decoration: BoxDecoration(
              color: isSelected ? pt.levelColor : Colors.white,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: isSelected ? Colors.white : pt.levelColor,
                width: isSelected ? 1.5 : 1,
              ),
              boxShadow: const [
                BoxShadow(
                  color: Colors.black26,
                  blurRadius: 3,
                  offset: Offset(0, 1),
                ),
              ],
            ),
            child: Text(
              pt.depthCm,
              style: TextStyle(
                fontSize: 9,
                fontWeight: FontWeight.bold,
                color: isSelected ? Colors.white : pt.levelColor,
              ),
            ),
          ),
          Icon(
            Icons.location_on,
            color: pt.levelColor,
            size: isSelected ? 34 : 26,
            shadows: const [
              Shadow(
                color: Colors.black26,
                blurRadius: 3,
                offset: Offset(0, 2),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFloodPointCard(BuildContext context, FloodReportModel pt) {
    final isSelected = pt.id == _selectedPointId;
    final photoList = pt.imageUrls != null && pt.imageUrls!.trim().isNotEmpty
        ? pt.imageUrls!
            .split(',')
            .map((s) => s.trim())
            .where((s) => s.isNotEmpty)
            .toList()
        : <String>[];

    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: () => _focusPoint(pt),
      child: RescuePanel(
        padding: 14,
        child: Container(
          decoration: isSelected
              ? BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: pt.levelColor, width: 1.5),
                )
              : null,
          padding: isSelected ? const EdgeInsets.all(4) : EdgeInsets.zero,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      pt.address,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: pt.levelColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      pt.levelLabel,
                      style: TextStyle(
                        color: pt.levelColor,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Wrap(
                spacing: 8,
                runSpacing: 4,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  Text(
                    'Mực nước: ${pt.depthCm}',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: pt.levelColor,
                    ),
                  ),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                    decoration: BoxDecoration(
                      color: Colors.blue.shade50,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      '⭐ ${pt.confidenceScore > 5 ? "${pt.confidenceScore}%" : "${pt.confidenceScore}/5"} (${pt.clusterCount} tin)',
                      style:
                          TextStyle(fontSize: 10, color: Colors.blue.shade800),
                    ),
                  ),
                  if (pt.recededConfirmCount != null && pt.recededConfirmCount! > 0)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                      decoration: BoxDecoration(
                        color: Colors.green.shade50,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        '⏳ ${pt.recededConfirmCount} người báo nước rút',
                        style: TextStyle(
                          fontSize: 10,
                          color: Colors.green.shade800,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  if (pt.createdAt != null)
                    Text(
                      _formatRelativeTime(pt.createdAt),
                      style: const TextStyle(
                        fontSize: 10,
                        color: AppColors.secondary,
                      ),
                    ),
                ],
              ),
              if (pt.description != null && pt.description!.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  pt.description!,
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppColors.secondary,
                  ),
                ),
              ],

              // Ảnh hiện trường người dân gửi lên (nếu có)
              if (photoList.isNotEmpty) ...[
                const SizedBox(height: 8),
                SizedBox(
                  height: 60,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: photoList.length,
                    separatorBuilder: (context, index) => const SizedBox(width: 6),
                    itemBuilder: (ctx, idx) {
                      final url = photoList[idx];
                      return GestureDetector(
                        onTap: () {
                          showDialog(
                            context: context,
                            builder: (dCtx) => Dialog(
                              backgroundColor: Colors.transparent,
                              insetPadding: const EdgeInsets.all(16),
                              child: Stack(
                                alignment: Alignment.topRight,
                                children: [
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(12),
                                    child: Image.network(
                                      url,
                                      fit: BoxFit.contain,
                                      errorBuilder: (context, error, stackTrace) => Container(
                                        padding: const EdgeInsets.all(24),
                                        color: Colors.white,
                                        child: const Text('Lỗi tải hình ảnh'),
                                      ),
                                    ),
                                  ),
                                  IconButton(
                                    onPressed: () => Navigator.pop(dCtx),
                                    icon: const Icon(
                                      Icons.close,
                                      color: Colors.white,
                                      size: 28,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image.network(
                            url,
                            width: 60,
                            height: 60,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) => Container(
                              width: 60,
                              height: 60,
                              color: Colors.grey.shade200,
                              child: const Icon(
                                Icons.broken_image,
                                size: 20,
                                color: Colors.grey,
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],

              if (pt.nearbyStations != null && pt.nearbyStations!.isNotEmpty) ...[
                const SizedBox(height: 6),
                Wrap(
                  spacing: 4,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    const Icon(Icons.shield, size: 14, color: AppColors.tertiary),
                    Text(
                      pt.nearbyStations!,
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppColors.tertiary,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ],
              const Divider(height: 16),
              Wrap(
                alignment: WrapAlignment.spaceBetween,
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: 8,
                runSpacing: 4,
                children: [
                  // Nút chỉ đường trên Google Maps
                  TextButton.icon(
                    onPressed: () => _openGoogleMaps(pt.latitude, pt.longitude),
                    icon: const Icon(
                      Icons.navigation_outlined,
                      size: 16,
                      color: AppColors.primaryOrange,
                    ),
                    label: const Text(
                      'Vị trí Maps',
                      style: TextStyle(
                        fontSize: 12,
                        color: AppColors.primaryOrange,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),

                  // Nút gọi hotline cứu hộ lân cận (nếu có số điện thoại)
                  Builder(
                    builder: (context) {
                      final phoneMatch = RegExp(r'(?:Hotline:\s*)?([0-9]{9,11})')
                          .firstMatch(pt.nearbyStations ?? '');
                      if (phoneMatch != null) {
                        final phone = phoneMatch.group(1)!;
                        return TextButton.icon(
                          onPressed: () async {
                            final uri = Uri.parse('tel:$phone');
                            if (await canLaunchUrl(uri)) {
                              await launchUrl(uri);
                            }
                          },
                          icon: const Icon(Icons.phone_in_talk, size: 16, color: Colors.green),
                          label: Text(
                            'Gọi $phone',
                            style: const TextStyle(
                              fontSize: 12,
                              color: Colors.green,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        );
                      }
                      return const SizedBox.shrink();
                    },
                  ),

                  // Nút báo nước rút
                  Consumer<AuthProvider>(
                    builder: (context, auth, _) {
                      final isAuthor = auth.user != null &&
                          pt.reportedById != null &&
                          auth.user!.id == pt.reportedById;
                      final isClustered = pt.clusterCount > 1;
                      final votes = pt.recededConfirmCount ?? 0;

                      String buttonLabel = 'Báo nước đã rút';
                      if (isAuthor && !isClustered) {
                        buttonLabel = 'Báo nước đã rút (Bạn tạo)';
                      } else if (votes > 0 || (isAuthor && isClustered)) {
                        buttonLabel = 'Xác nhận nước rút ($votes/2)';
                      }

                      return TextButton.icon(
                        onPressed: () async {
                          if (!auth.isAuthenticated) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: const Text('Vui lòng đăng nhập để gửi báo cáo nước rút!'),
                                backgroundColor: Colors.orange.shade800,
                                action: SnackBarAction(
                                  label: 'Đăng nhập',
                                  textColor: Colors.white,
                                  onPressed: () {
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(builder: (_) => const LoginScreen()),
                                    );
                                  },
                                ),
                              ),
                            );
                            return;
                          }

                          String dialogTitle = 'Xác nhận nước đã rút';
                          String dialogMessage = 'Bạn xác nhận nước tại "${pt.address}" đã rút? Báo cáo sẽ được ghi nhận và cần thêm 1 lượt xác nhận từ cộng đồng để giải tỏa hoàn toàn.';
                          if (isAuthor && !isClustered) {
                            dialogTitle = 'Giải tỏa điểm ngập của bạn';
                            dialogMessage = 'Bạn là người đã báo cáo điểm ngập đơn lẻ này. Bạn xác nhận nước tại "${pt.address}" đã rút và các phương tiện có thể lưu thông bình thường? Điểm ngập sẽ được giải tỏa ngay lập tức.';
                          } else if (isAuthor && isClustered) {
                            dialogTitle = 'Xác nhận nước rút (Cụm ngập)';
                            dialogMessage = 'Điểm ngập tại "${pt.address}" có ${pt.clusterCount} tin báo từ cộng đồng. Xác nhận của bạn được ghi nhận là 1 phiếu và cần thêm 1 lượt xác nhận từ người khác để giải tỏa an toàn.';
                          } else if (votes > 0) {
                            dialogTitle = 'Đồng thuận xác nhận nước rút';
                            dialogMessage = 'Điểm ngập tại "${pt.address}" đã có $votes lượt báo nước rút. Xác nhận của bạn sẽ hoàn tất giải tỏa điểm ngập này khỏi bản đồ.';
                          }

                          final confirmed = await showDialog<bool>(
                            context: context,
                            builder: (dCtx) => AlertDialog(
                              title: Text(dialogTitle),
                              content: Text(dialogMessage),
                              actions: [
                                TextButton(
                                  onPressed: () => Navigator.pop(dCtx, false),
                                  child: const Text('Hủy'),
                                ),
                                ElevatedButton(
                                  onPressed: () => Navigator.pop(dCtx, true),
                                  child: const Text('Xác nhận rút nước'),
                                ),
                              ],
                            ),
                          );
                          if (confirmed == true && context.mounted) {
                            final updated = await context
                                .read<FloodReportProvider>()
                                .reportWaterReceded(pt.id);
                            if (context.mounted) {
                              if (updated != null) {
                                if (updated.moderationStatus == 'EXPIRED') {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('Cảm ơn bạn! Điểm ngập đã được xác nhận rút nước hoàn toàn và giải tỏa.'),
                                      backgroundColor: Colors.green,
                                    ),
                                  );
                                } else {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text(
                                        'Đã ghi nhận phản hồi (${updated.recededConfirmCount ?? 1}/2 lượt xác nhận). Cần thêm 1 lượt xác nhận từ cộng đồng để giải tỏa hoàn toàn.',
                                      ),
                                      backgroundColor: Colors.blue.shade700,
                                    ),
                                  );
                                }
                              } else {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text('Cập nhật thất bại: ${context.read<FloodReportProvider>().errorMessage ?? "Có lỗi xảy ra"}'),
                                    backgroundColor: Colors.red,
                                  ),
                                );
                              }
                            }
                          }
                        },
                        icon: const Icon(
                          Icons.check_circle_outline,
                          size: 16,
                          color: Colors.teal,
                        ),
                        label: Text(
                          buttonLabel,
                          style: const TextStyle(
                            fontSize: 12,
                            color: Colors.teal,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFilterChip(int index, String label) {
    final isSelected = _filterIndex == index;
    return GestureDetector(
      onTap: () => setState(() => _filterIndex = index),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.secondary
              : AppColors.surfaceContainerLow,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
            color: isSelected ? Colors.white : AppColors.secondary,
          ),
        ),
      ),
    );
  }
}
