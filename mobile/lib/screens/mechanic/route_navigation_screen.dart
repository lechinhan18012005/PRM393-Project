import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/models/rescue_order_model.dart';
import '../../core/services/location_service.dart';
import '../../core/services/rescue_service.dart';
import 'crossing_transport_screen.dart';
import 'mechanic_ui.dart';
import 'quotation_builder_screen.dart';

Widget buildPostArrivalDestination({
  required int orderId,
  required String orderType,
}) {
  if (orderType == 'ONSITE_REPAIR' || orderType == 'TOWING') {
    return QuotationBuilderScreen(orderId: orderId, orderType: orderType);
  }
  return CrossingTransportScreen(orderId: orderId);
}

class RouteNavigationScreen extends StatefulWidget {
  final int? orderId;

  const RouteNavigationScreen({super.key, this.orderId});

  @override
  State<RouteNavigationScreen> createState() => _RouteNavigationScreenState();
}

class _RouteNavigationScreenState extends State<RouteNavigationScreen> {
  final RescueService _rescueService = RescueService();
  RescueOrderModel? _order;
  Timer? _locationTimer;

  // Cờ cấu hình: chỉ cho phép mô phỏng vị trí trong môi trường DEMO/TEST
  static const bool _allowDemoSimulation = bool.fromEnvironment(
    'DEMO_MODE',
    defaultValue: false,
  );

  // Dynamic mechanic device coordinates
  LocationData? _lastKnownLocation;
  bool _hasActiveGpsFix = false;
  bool _isLoading = false;
  bool _isRefreshingGps = false;
  bool _isSimulated = false;
  String? _errorMessage;
  String? _gpsStatusMessage;

  double? get _currentLat => _lastKnownLocation?.latitude;
  double? get _currentLng => _lastKnownLocation?.longitude;
  double? get _accuracyMeters => _lastKnownLocation?.accuracyMeters;
  DateTime? get _gpsTimestamp => _lastKnownLocation?.timestamp;

  int? get _gpsAgeSeconds => _gpsTimestamp != null
      ? DateTime.now().difference(_gpsTimestamp!).abs().inSeconds
      : null;

  bool get _isGpsFresh => _gpsAgeSeconds != null && _gpsAgeSeconds! <= 30;

  double? _calculateDistanceToPickup() {
    if (_order == null ||
        !_hasActiveGpsFix ||
        _currentLat == null ||
        _currentLng == null) {
      return null;
    }
    return LocationService.instance.calculateDistanceMeters(
      _currentLat!,
      _currentLng!,
      _order!.pickupLatitude,
      _order!.pickupLongitude,
    );
  }

  bool get _isDistanceEligible {
    final dist = _calculateDistanceToPickup();
    return dist != null && dist <= 30.0;
  }

  bool get _isEligibleToConfirm {
    return _hasActiveGpsFix &&
        _lastKnownLocation != null &&
        _isGpsFresh &&
        _isDistanceEligible;
  }

  String? get _ineligibilityReason {
    if (!_hasActiveGpsFix || _lastKnownLocation == null) {
      return 'Mất tín hiệu GPS từ thiết bị';
    }
    if (!_isGpsFresh) {
      return 'Dữ liệu GPS đã cũ (>30s)';
    }
    final dist = _calculateDistanceToPickup();
    final isDistOk = dist != null && dist <= 30.0;
    if (!isDistOk) {
      return 'Chưa đủ gần điểm đón (còn ${dist!.toStringAsFixed(0)}m > 30m)';
    }
    return null;
  }

  @override
  void initState() {
    super.initState();
    _loadOrder();
  }

  @override
  void dispose() {
    _locationTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadOrder() async {
    if (widget.orderId == null) return;
    try {
      final order = await _rescueService.getOrderById(widget.orderId!);
      if (!mounted) return;
      setState(() => _order = order);

      // Lấy tọa độ GPS ban đầu từ thiết bị
      await _syncDeviceLocation();

      // Start periodic GPS reporting
      _reportLocation();
      _locationTimer = Timer.periodic(const Duration(seconds: 8), (_) {
        _reportLocation();
      });
    } catch (e) {
      if (mounted) {
        setState(
          () => _errorMessage = e.toString().replaceFirst('Exception: ', ''),
        );
      }
    }
  }

  Future<void> _syncDeviceLocation() async {
    if (_isSimulated && _lastKnownLocation != null) {
      _hasActiveGpsFix = true;
      return;
    }
    final loc = await LocationService.instance.getCurrentLocation();
    if (!mounted) return;
    if (loc != null) {
      final age = DateTime.now().difference(loc.timestamp).abs();
      if (age.inSeconds > 30) {
        setState(() {
          _lastKnownLocation = loc;
          _hasActiveGpsFix = false;
          _gpsStatusMessage =
              'Tín hiệu GPS bị cũ (>30s), đang đợi vị trí mới...';
        });
      } else {
        setState(() {
          _lastKnownLocation = loc;
          _hasActiveGpsFix = true;
          _gpsStatusMessage = null;
        });
      }
    } else {
      setState(() {
        _hasActiveGpsFix = false;
        _gpsStatusMessage =
            'Mất tín hiệu GPS từ thiết bị. Đang đợi kết nối lại...';
      });
    }
  }

  Future<void> _refreshGpsLocation() async {
    setState(() => _isRefreshingGps = true);
    try {
      await _syncDeviceLocation();
      if (_order != null && _hasActiveGpsFix && _lastKnownLocation != null) {
        await _reportLocation();
      }
    } finally {
      if (mounted) {
        setState(() => _isRefreshingGps = false);
      }
    }
  }

  Future<void> _reportLocation() async {
    if (_order == null) return;
    await _syncDeviceLocation();
    if (!_hasActiveGpsFix || _lastKnownLocation == null) {
      // Mất GPS hoặc dữ liệu GPS quá cũ (>30s) -> Tuyệt đối không gửi tọa độ cache với timestamp mới
      return;
    }
    try {
      await _rescueService.updateLocation(
        _order!.id,
        _lastKnownLocation!.latitude,
        _lastKnownLocation!.longitude,
        accuracyMeters: _lastKnownLocation!.accuracyMeters,
        bearing: _lastKnownLocation!.bearing,
        speed: _lastKnownLocation!.speed,
        recordedAt: _lastKnownLocation!.timestamp.toIso8601String(),
      );
    } catch (_) {}
  }

  // Simulation tool for testing arrival validation
  void _simulateArrivedPosition() {
    if (_order == null) return;
    setState(() {
      // Set mechanic coordinates within 10 meters of pickup location with high accuracy
      _lastKnownLocation = LocationData(
        latitude: _order!.pickupLatitude + 0.00005,
        longitude: _order!.pickupLongitude + 0.00005,
        accuracyMeters: 5.0,
        timestamp: DateTime.now(),
        isSimulated: true,
      );
      _hasActiveGpsFix = true;
      _isSimulated = true;
      _gpsStatusMessage = null;
    });
    _reportLocation();
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(
          'Đã cập nhật vị trí thợ: Cách điểm đón ~ 7 mét (Đủ điều kiện < 30m, ±5m).',
        ),
        backgroundColor: Colors.blue,
      ),
    );
  }

  Future<void> _confirmArrival() async {
    if (_order == null) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const CrossingTransportScreen()),
      );
      return;
    }

    await _syncDeviceLocation();
    if (!mounted) return;

    if (!_isEligibleToConfirm || _lastKnownLocation == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            _ineligibilityReason ?? 'Chưa đủ điều kiện xác nhận đến nơi!',
          ),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    final currentFix = _lastKnownLocation!;
    // Đảm bảo mẫu vị trí còn mới (<30s)
    final age = DateTime.now().difference(currentFix.timestamp).abs();
    if (age.inSeconds > 30) {
      setState(() {
        _hasActiveGpsFix = false;
        _gpsStatusMessage = 'Dữ liệu GPS đã cũ (>30s), đang đợi vị trí mới...';
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Tín hiệu GPS bị cũ (>30s), vui lòng đợi tín hiệu mới trước khi xác nhận!',
          ),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    final dist = LocationService.instance.calculateDistanceMeters(
      currentFix.latitude,
      currentFix.longitude,
      _order!.pickupLatitude,
      _order!.pickupLongitude,
    );
    if (dist > 30.0) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Bạn còn cách điểm đón ${dist.toStringAsFixed(0)}m, chưa đủ gần (≤30m) để xác nhận đến nơi!',
          ),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);
    try {
      final updated = await _rescueService.confirmArrival(
        _order!.id,
        currentFix.latitude,
        currentFix.longitude,
        accuracyMeters: currentFix.accuracyMeters,
        recordedAt: currentFix.timestamp.toIso8601String(),
      );

      if (mounted) {
        final requiresQuotation =
            updated.orderType == 'ONSITE_REPAIR' ||
            updated.orderType == 'TOWING';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              requiresQuotation
                  ? 'Xác nhận đến nơi thành công! Hãy kiểm tra xe và gửi báo giá cho khách.'
                  : 'Xác nhận đến nơi thành công! Bắt đầu các bước chuyên chở xe.',
            ),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (_) => buildPostArrivalDestination(
              orderId: updated.id,
              orderType: updated.orderType,
            ),
          ),
        );
      }
    } catch (e, stack) {
      debugPrint('_confirmArrival EXCEPTION: $e\n$stack');
      if (mounted) {
        setState(() => _isLoading = false);
        final err = e.toString().replaceFirst('Exception: ', '');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Chưa thể xác nhận đến nơi: $err'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 4),
          ),
        );
      }
    }
  }

  Widget _metricBox({
    required IconData icon,
    required String title,
    required String value,
    required String subtext,
    required bool isPassed,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
        decoration: BoxDecoration(
          color: isPassed ? const Color(0xFFE8F7F0) : const Color(0xFFFEECEB),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isPassed ? const Color(0xFF8AD4B2) : const Color(0xFFF5A39E),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  icon,
                  size: 13,
                  color: isPassed
                      ? const Color(0xFF1B6A45)
                      : const Color(0xFFB82820),
                ),
                const SizedBox(width: 3),
                Expanded(
                  child: Text(
                    title,
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      color: isPassed
                          ? const Color(0xFF1B6A45)
                          : const Color(0xFFB82820),
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Icon(
                  isPassed ? Icons.check_circle : Icons.cancel,
                  size: 13,
                  color: isPassed
                      ? const Color(0xFF28A76C)
                      : const Color(0xFFD32F2F),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              value,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w800,
                color: isPassed
                    ? const Color(0xFF0D4229)
                    : const Color(0xFF7D120D),
              ),
            ),
            const SizedBox(height: 2),
            Text(
              subtext,
              style: TextStyle(
                fontSize: 9,
                color: isPassed
                    ? const Color(0xFF2E7D56)
                    : const Color(0xFF9E231C),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final order = _order;
    final distanceMeters = _calculateDistanceToPickup();
    final isEligible = _isEligibleToConfirm;
    final reason = _ineligibilityReason;
    final accuracy = _accuracyMeters;
    final ageSeconds = _gpsAgeSeconds;

    return MechanicPage(
      title: 'Di chuyển đến điểm đón',
      bottom: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          FilledButton.icon(
            style: FilledButton.styleFrom(
              backgroundColor: isEligible
                  ? AppColors.primaryOrange
                  : Colors.grey.shade400,
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
            onPressed: (_isLoading || !isEligible) ? null : _confirmArrival,
            icon: _isLoading
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Icon(Icons.check_circle_outline),
            label: Text(
              _isLoading
                  ? 'Đang kiểm tra tọa độ...'
                  : 'Đã đến điểm đón · Tiếp nhận xe (<30m)',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
          if (!isEligible) ...[
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: (_isLoading || _isRefreshingGps)
                  ? null
                  : _refreshGpsLocation,
              icon: _isRefreshingGps
                  ? const SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.my_location, size: 18),
              label: const Text('Lấy lại vị trí GPS'),
            ),
          ],
          if (_allowDemoSimulation &&
              distanceMeters != null &&
              distanceMeters > 30) ...[
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: _simulateArrivedPosition,
              icon: const Icon(Icons.gps_fixed, size: 18, color: Colors.blue),
              label: const Text(
                'Mô phỏng thợ đã tới nơi (< 30m test)',
                style: TextStyle(
                  color: Colors.blue,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ],
      ),
      children: [
        if (_errorMessage != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(
              _errorMessage!,
              style: const TextStyle(color: Colors.red, fontSize: 12),
            ),
          ),
        MechanicPanel(
          padding: 0,
          child: Column(
            children: [
              Container(
                height: 230,
                decoration: const BoxDecoration(
                  color: Color(0xFFE8F1EE),
                  borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
                ),
                child: Stack(
                  children: [
                    const Positioned.fill(
                      child: CustomPaint(painter: _RouteSketch()),
                    ),
                    Positioned(
                      left: 16,
                      top: 16,
                      child: MechanicLabel(
                        order != null
                            ? 'ĐANG THEO DÕI TỌA ĐỘ THỰC'
                            : 'SƠ ĐỒ MINH HỌA',
                        color: AppColors.secondary,
                      ),
                    ),
                    const Align(
                      alignment: Alignment(-.55, .55),
                      child: CircleAvatar(
                        backgroundColor: AppColors.tertiary,
                        child: Icon(Icons.navigation, color: Colors.white),
                      ),
                    ),
                    const Align(
                      alignment: Alignment(.55, -.4),
                      child: CircleAvatar(
                        backgroundColor: AppColors.primaryOrange,
                        child: Icon(Icons.location_on, color: Colors.white),
                      ),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.route, color: AppColors.tertiary),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            distanceMeters != null
                                ? '${(distanceMeters / 1000).toStringAsFixed(2)} km · Cách điểm đón ${distanceMeters.toStringAsFixed(0)} m'
                                : (_gpsStatusMessage ??
                                      'Đang tìm tín hiệu GPS thiết bị...'),
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: isEligible
                                ? Colors.green.shade100
                                : (_hasActiveGpsFix
                                      ? Colors.orange.shade100
                                      : Colors.red.shade100),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            isEligible
                                ? 'Đủ điều kiện'
                                : (!_hasActiveGpsFix
                                      ? 'Mất tín hiệu GPS'
                                      : (_isDistanceEligible
                                            ? 'GPS chưa đạt'
                                            : 'Chưa đủ gần')),
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: isEligible
                                  ? Colors.green.shade900
                                  : (_hasActiveGpsFix
                                        ? Colors.orange.shade900
                                        : Colors.red.shade900),
                            ),
                          ),
                        ),
                        if (_isSimulated) ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.blue.shade50,
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: Colors.blue.shade200),
                            ),
                            child: const Text(
                              'Mô phỏng',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: Colors.blue,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 14),
                    // Hiển thị riêng khoảng cách, sai số, độ tươi GPS
                    Row(
                      children: [
                        _metricBox(
                          icon: Icons.straighten,
                          title: 'Khoảng cách',
                          value: distanceMeters != null
                              ? '${distanceMeters.toStringAsFixed(0)} m'
                              : '--',
                          subtext: 'Mục tiêu ≤ 30m',
                          isPassed: _isDistanceEligible,
                        ),
                        const SizedBox(width: 8),
                        _metricBox(
                          icon: Icons.gps_fixed,
                          title: 'Sai số GPS',
                          value: accuracy != null
                              ? '±${accuracy.toStringAsFixed(0)} m'
                              : '--',
                          subtext: 'Chỉ tham khảo',
                          isPassed: accuracy != null,
                        ),
                        const SizedBox(width: 8),
                        _metricBox(
                          icon: Icons.access_time,
                          title: 'Độ mới GPS',
                          value: ageSeconds != null
                              ? '${ageSeconds}s trước'
                              : '--',
                          subtext: 'Mục tiêu ≤ 30s',
                          isPassed: _isGpsFresh,
                        ),
                      ],
                    ),
                    if (!isEligible && reason != null) ...[
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 8,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.amber.shade50,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.amber.shade300),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Icon(
                                  Icons.info_outline,
                                  size: 16,
                                  color: Colors.amber.shade900,
                                ),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    'Lý do chưa đủ điều kiện: $reason',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: Colors.amber.shade900,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Align(
                              alignment: Alignment.centerRight,
                              child: TextButton.icon(
                                style: TextButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 2,
                                  ),
                                  minimumSize: Size.zero,
                                  tapTargetSize:
                                      MaterialTapTargetSize.shrinkWrap,
                                ),
                                onPressed: _isRefreshingGps
                                    ? null
                                    : _refreshGpsLocation,
                                icon: _isRefreshingGps
                                    ? const SizedBox(
                                        width: 12,
                                        height: 12,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                        ),
                                      )
                                    : const Icon(Icons.refresh, size: 14),
                                label: const Text(
                                  'Lấy lại vị trí',
                                  style: TextStyle(fontSize: 11),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
        const MechanicSection('Thông tin ca cứu hộ'),
        MechanicPanel(
          child: Column(
            children: [
              MechanicInfo(
                icon: Icons.person_outline,
                title: 'Khách hàng',
                value:
                    '${order?.customerName ?? "Hoàng Văn Khách"} • ${order?.customerPhone ?? ""}',
              ),
              const Divider(),
              MechanicInfo(
                icon: Icons.two_wheeler_outlined,
                title: 'Xe cần chở',
                value:
                    '${order?.vehiclePlate ?? "59-B1 892.44"} · ${order?.vehicleModel ?? "Honda SH"}',
              ),
              const Divider(),
              MechanicInfo(
                icon: Icons.location_on_outlined,
                title: 'Điểm đón (nơi xe kẹt ngập)',
                value:
                    order?.pickupAddress ??
                    '85 Huỳnh Tấn Phát, P. Tân Thuận Đông, Quận 7',
              ),
              const Divider(),
              MechanicInfo(
                icon: Icons.wb_sunny_outlined,
                title: 'Điểm trả xe (khô ráo an toàn)',
                value: order?.dropoffAddress ?? 'Cầu Phú Mỹ, Quận 7',
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _RouteSketch extends CustomPainter {
  const _RouteSketch();
  @override
  void paint(Canvas canvas, Size size) {
    final road = Paint()
      ..color = Colors.white
      ..strokeWidth = 22
      ..style = PaintingStyle.stroke;
    for (final x in [.15, .5, .85]) {
      canvas.drawLine(
        Offset(size.width * x, 0),
        Offset(size.width * (x - .12), size.height),
        road,
      );
    }
    for (final y in [.25, .7]) {
      canvas.drawLine(
        Offset(0, size.height * y),
        Offset(size.width, size.height * (y + .1)),
        road,
      );
    }
    final path = Path()
      ..moveTo(size.width * .23, size.height * .77)
      ..quadraticBezierTo(
        size.width * .3,
        size.height * .4,
        size.width * .75,
        size.height * .32,
      );
    final route = Paint()
      ..color = AppColors.primary
      ..strokeWidth = 5
      ..style = PaintingStyle.stroke;
    canvas.drawPath(path, route);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
