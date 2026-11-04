import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/constants/app_colors.dart';
import '../../core/widgets/logout_dialog.dart';
import '../../core/models/rescue_order_model.dart';
import '../../core/services/rescue_service.dart';
import '../../core/widgets/rescue_ui.dart';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../providers/flood_report_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/vehicle_provider.dart';
import 'service_selection_screen.dart';
import '../../features/batch_transport/customer_batch_trip_screen.dart';
import 'community_flood_report_screen.dart';
import 'flood_map_screen.dart';
import 'rescue_history_screen.dart';
import 'vehicle_profile_screen.dart';
import 'account_screen.dart';
import 'radar_dispatch_screen.dart';
import 'live_tracking_screen.dart';
import 'vietqr_payment_screen.dart';
import '../demo/demo_catalog_screen.dart';

class StitchHydroRescueScreen extends StatefulWidget {
  const StitchHydroRescueScreen({super.key});
  @override
  State<StitchHydroRescueScreen> createState() =>
      _StitchHydroRescueScreenState();
}

class _StitchHydroRescueScreenState extends State<StitchHydroRescueScreen> {
  final RescueService _rescueService = RescueService();
  RescueOrderModel? _activeOrder;
  Timer? _batchOrderRefreshTimer;

  // Hot reload can retain a State created before these fields existed.
  // Read through defaults instead of relying on field initializers being rerun.
  int? _tab;
  int get _currentTab => _tab ?? 0;
  Set<int>? _visited;
  Set<int> get _visitedTabs => _visited ??= <int>{0};

  bool get _isTestEnvironment {
    if (kIsWeb) return false;
    try {
      return Platform.environment.containsKey('FLUTTER_TEST');
    } catch (_) {
      return false;
    }
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadActiveOrder();
      try {
        context.read<VehicleProvider?>()?.fetchVehicles();
      } catch (_) {}
    });
  }

  Future<void> _loadActiveOrder() async {
    try {
      final order = await _rescueService.getActiveOrder();
      if (mounted) {
        setState(() => _activeOrder = order);
        _batchOrderRefreshTimer?.cancel();
        if (order != null &&
            order.orderType == 'BATCH_CROSSING' &&
            order.isRequested) {
          _batchOrderRefreshTimer = Timer(
            const Duration(seconds: 10),
            _loadActiveOrder,
          );
        }
      }
    } catch (_) {}
  }

  @override
  void dispose() {
    _batchOrderRefreshTimer?.cancel();
    super.dispose();
  }

  void _select(int index) {
    setState(() {
      _tab = index;
      _visitedTabs.add(index);
    });
    if (index == 0) {
      _loadActiveOrder();
    }
  }

  void _open(Widget screen) =>
      Navigator.of(context)
          .push(MaterialPageRoute<void>(builder: (_) => screen))
          .then((_) => _loadActiveOrder());
  void _chooseVehicle() {
    VehicleProvider? vehicleProvider;
    try {
      vehicleProvider = context.read<VehicleProvider?>();
    } catch (_) {}
    final realVehicles = vehicleProvider?.vehicles ?? const [];
    final activeId = vehicleProvider?.selectedVehicle?.id;

    showModalBottomSheet<void>(
      context: context,
      builder: (sheet) => SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Chọn xe', style: Theme.of(context).textTheme.titleLarge),
                  TextButton(
                    onPressed: () {
                      Navigator.pop(sheet);
                      _select(3);
                    },
                    child: const Text('Quản lý xe'),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              if (realVehicles.isNotEmpty) ...[
                ...realVehicles.map(
                  (v) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: CircleAvatar(
                      backgroundColor: AppColors.primaryContainer,
                      child: Icon(
                        v.vehicleType == 'ELECTRIC'
                            ? Icons.electric_moped
                            : Icons.two_wheeler,
                        color: AppColors.primary,
                      ),
                    ),
                    title: Text(v.displayName),
                    subtitle: Text('${v.licensePlate} · ${v.typeDisplayName}'),
                    trailing: (activeId == v.id)
                        ? const Icon(Icons.check_circle, color: AppColors.primary)
                        : null,
                    onTap: () {
                      vehicleProvider?.selectVehicle(v);
                      Navigator.pop(sheet);
                    },
                  ),
                ),
              ] else if (vehicleProvider?.isLoading == true) ...[
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 24),
                  child: Center(child: CircularProgressIndicator()),
                ),
              ] else ...[
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 20),
                  child: Column(
                    children: [
                      const Icon(
                        Icons.two_wheeler_outlined,
                        size: 48,
                        color: AppColors.secondary,
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        'Chưa có phương tiện nào',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Vui lòng thêm xe của bạn để hệ thống hỗ trợ cứu hộ chính xác nhất.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 13,
                          color: AppColors.secondary,
                        ),
                      ),
                      const SizedBox(height: 16),
                      FilledButton.icon(
                        onPressed: () {
                          Navigator.pop(sheet);
                          _select(3);
                        },
                        icon: const Icon(Icons.add),
                        label: const Text('Thêm phương tiện ngay'),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppColors.background,
    appBar: _currentTab == 0
        ? AppBar(
            title: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'HYDRORESCUE / KHÁCH HÀNG',
                  style: TextStyle(
                    fontSize: 9,
                    letterSpacing: 1.4,
                    color: AppColors.secondary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                SizedBox(height: 3),
                Text(
                  'Trang chủ',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                ),
              ],
            ),
            actions: [
              IconButton(
                key: const Key('customer-logout-btn'),
                tooltip: 'Đăng xuất',
                icon: const Icon(Icons.logout, color: AppColors.error),
                onPressed: () => showLogoutConfirmationDialog(context),
              ),
              IconButton(
                key: const Key('open-account'),
                tooltip: 'Tài khoản',
                onPressed: () => _select(4),
                icon: const Icon(
                  Icons.person_outline,
                  color: AppColors.secondary,
                ),
              ),
              IconButton(
                tooltip: 'Khám phá ứng dụng mẫu',
                onPressed: () => _open(const DemoCatalogScreen()),
                icon: const Icon(Icons.apps_rounded, color: AppColors.primary),
              ),
            ],
          )
        : null,
    body: IndexedStack(
      index: _currentTab,
      children: [
        _home(),
        _visitedTabs.contains(1)
            ? const FloodMapScreen()
            : const SizedBox.shrink(),
        _visitedTabs.contains(2)
            ? const RescueHistoryScreen()
            : const SizedBox.shrink(),
        _visitedTabs.contains(3)
            ? const VehicleProfileScreen()
            : const SizedBox.shrink(),
        _visitedTabs.contains(4)
            ? const AccountScreen()
            : const SizedBox.shrink(),
      ],
    ),
    bottomNavigationBar: NavigationBar(
      selectedIndex: _currentTab,
      onDestinationSelected: _select,
      backgroundColor: Colors.white,
      indicatorColor: AppColors.primaryContainer,
      labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
      destinations: const [
        NavigationDestination(
          icon: Icon(Icons.home_outlined),
          selectedIcon: Icon(Icons.home_rounded, color: AppColors.primary),
          label: 'Trang chủ',
        ),
        NavigationDestination(
          icon: Icon(Icons.map_outlined),
          selectedIcon: Icon(Icons.map, color: AppColors.primary),
          label: 'Bản đồ',
        ),
        NavigationDestination(
          icon: Icon(Icons.history_outlined),
          selectedIcon: Icon(Icons.history, color: AppColors.primary),
          label: 'Lịch sử',
        ),
        NavigationDestination(
          icon: Icon(Icons.two_wheeler_outlined),
          selectedIcon: Icon(Icons.two_wheeler, color: AppColors.primary),
          label: 'Xe của tôi',
        ),
        NavigationDestination(
          icon: Icon(Icons.person_outline),
          selectedIcon: Icon(Icons.person, color: AppColors.primary),
          label: 'Tài khoản',
        ),
      ],
    ),
  );
  Widget _home() {
    final name = context.watch<AuthProvider?>()?.user?.fullName;
    final vehicleProvider = context.watch<VehicleProvider?>();
    final realVehicle = vehicleProvider?.selectedVehicle;
    final hasVehicles = (vehicleProvider?.vehicles ?? []).isNotEmpty;
    final vehicleName = realVehicle?.displayName ??
        (hasVehicles ? 'Chưa chọn phương tiện' : 'Chưa có phương tiện');
    final vehiclePlate = realVehicle?.licensePlate ??
        (hasVehicles ? 'Nhấn để chọn xe' : 'Nhấn để thêm xe');
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 760),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
          children: [
            RescueIntro(
              eyebrow: 'AN TÂM TRÊN MỌI HÀNH TRÌNH',
              title: name == null ? 'Bạn cần hỗ trợ?' : 'Xin chào, $name',
              description: 'Cứu hộ xe máy và theo dõi điểm ngập trong cùng một ứng dụng.',
              trailing: const Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  RescueLabel('Cứu hộ xe máy', color: Color(0xFF76D6B5)),
                  RescueLabel('Kết nối đội hỗ trợ', color: Color(0xFFB9CEDB)),
                ],
              ),
            ),
            if (_activeOrder != null && _activeOrder!.isActive) ...[
              const RescueSection('Đơn cứu hộ đang phục vụ'),
              _activeOrderCard(_activeOrder!),
            ],
            const RescueSection('Yêu cầu cứu hộ'),
            RescuePanel(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  RescueLabel(
                    hasVehicles ? 'Thông tin xe cứu hộ' : 'Chưa có xe cứu hộ',
                    color: AppColors.secondary,
                  ),
                  const SizedBox(height: 6),
                  const RescueInfo(
                    icon: Icons.location_on_outlined,
                    title: 'Điểm cứu hộ mẫu',
                    value: '142 Nguyễn Gia Trí, Bình Thạnh, TP.HCM',
                  ),
                  const Divider(height: 22),
                  InkWell(
                    key: const Key('choose-vehicle'),
                    borderRadius: BorderRadius.circular(10),
                    onTap: () {
                      if (!hasVehicles && !(vehicleProvider?.isLoading ?? false)) {
                        _select(3);
                      } else {
                        _chooseVehicle();
                      }
                    },
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: AppColors.primaryContainer,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(
                              realVehicle?.vehicleType == 'ELECTRIC'
                                  ? Icons.electric_moped
                                  : Icons.two_wheeler,
                              color: AppColors.primary,
                              size: 22,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  vehicleName,
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  vehiclePlate,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: AppColors.secondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const Icon(
                            Icons.unfold_more_rounded,
                            color: AppColors.secondary,
                            size: 20,
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  FilledButton.icon(
                    key: const Key('request-rescue'),
                    onPressed: () {
                      if (realVehicle == null && !hasVehicles) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: const Text('Vui lòng thêm phương tiện trước khi yêu cầu cứu hộ'),
                            action: SnackBarAction(
                              label: 'Thêm xe',
                              onPressed: () => _select(3),
                            ),
                          ),
                        );
                        return;
                      }
                      _open(
                        ServiceSelectionScreen(
                          vehicleName: vehicleName,
                          vehiclePlate: realVehicle?.licensePlate ?? vehiclePlate,
                        ),
                      );
                    },
                    icon: const Icon(Icons.sos_rounded, size: 24),
                    label: const Text('Gọi cứu hộ'),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Xem dịch vụ và giá mẫu trước khi tiếp tục.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 11, color: AppColors.secondary),
                  ),
                ],
              ),
            ),
            const RescueSection('Dịch vụ hỗ trợ'),
            LayoutBuilder(
              builder: (context, constraints) {
                final tiles = [
                  _service(
                    Icons.local_shipping_outlined,
                    'Chở qua ngập',
                    'Chuyến riêng hoặc chuyến gom',
                    0,
                  ),
                  _service(
                    Icons.build_outlined,
                    'Cứu hộ xe',
                    'Kiểm tra rồi báo giá',
                    1,
                  ),
                ];
                if (constraints.maxWidth < 330 ||
                    MediaQuery.textScalerOf(context).scale(1) > 1.3) {
                  return Column(
                    children: [
                      for (final tile in tiles)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: tile,
                        ),
                    ],
                  );
                }
                return Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    for (var i = 0; i < tiles.length; i++) ...[
                      if (i > 0) const SizedBox(width: 8),
                      Expanded(child: tiles[i]),
                    ],
                  ],
                );
              },
            ),
            RescueSection(
              'Theo dõi điểm ngập',
              action: TextButton(
                onPressed: () => _select(1),
                child: const Text('Xem bản đồ'),
              ),
            ),
            Consumer<FloodReportProvider>(
              builder: (context, floodProvider, _) {
                final activePoints = floodProvider.floodPoints;
                final initialCenter = activePoints.isNotEmpty
                    ? LatLng(
                        activePoints.first.latitude,
                        activePoints.first.longitude,
                      )
                    : const LatLng(10.7769, 106.7009);

                return RescuePanel(
                  padding: 0,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: InkWell(
                      onTap: () => _select(1),
                      child: SizedBox(
                        height: 165,
                        child: Stack(
                          children: [
                            IgnorePointer(
                              child: FlutterMap(
                                options: MapOptions(
                                  initialCenter: initialCenter,
                                  initialZoom: 13.0,
                                  interactionOptions:
                                      const InteractionOptions(
                                    flags: InteractiveFlag.none,
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
                                  MarkerLayer(
                                    markers: activePoints.isNotEmpty
                                        ? activePoints.take(5).map((pt) {
                                            return Marker(
                                              point: LatLng(
                                                pt.latitude,
                                                pt.longitude,
                                              ),
                                              width: 32,
                                              height: 32,
                                              alignment:
                                                  Alignment.topCenter,
                                              child: Container(
                                                decoration:
                                                    const BoxDecoration(
                                                  color: Colors.white,
                                                  shape: BoxShape.circle,
                                                  boxShadow: [
                                                    BoxShadow(
                                                      color: Colors.black26,
                                                      blurRadius: 4,
                                                    ),
                                                  ],
                                                ),
                                                padding:
                                                    const EdgeInsets.all(4),
                                                child: Icon(
                                                  Icons.water_drop,
                                                  size: 18,
                                                  color: pt.waterDepthLevel ==
                                                          'SEAT_60CM_PLUS'
                                                      ? Colors.red
                                                      : (pt.waterDepthLevel ==
                                                              'KNEE_40CM'
                                                          ? Colors.deepOrange
                                                          : Colors
                                                              .amber
                                                              .shade800),
                                                ),
                                              ),
                                            );
                                          }).toList()
                                        : [
                                            const Marker(
                                              point: LatLng(
                                                  10.7769, 106.7009),
                                              width: 32,
                                              height: 32,
                                              alignment:
                                                  Alignment.topCenter,
                                              child: Icon(
                                                Icons.location_on,
                                                size: 32,
                                                color: AppColors.primary,
                                              ),
                                            ),
                                          ],
                                  ),
                                ],
                              ),
                            ),
                            Positioned(
                              top: 10,
                              left: 10,
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color:
                                      Colors.white.withValues(alpha: 0.94),
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
                                    Container(
                                      width: 8,
                                      height: 8,
                                      decoration: BoxDecoration(
                                        color: activePoints.isNotEmpty
                                            ? Colors.red
                                            : Colors.green,
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      activePoints.isNotEmpty
                                          ? 'BẢN ĐỒ GIS (${activePoints.length} ĐIỂM)'
                                          : 'BẢN ĐỒ SỐ GIS',
                                      style: const TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w700,
                                        color: AppColors.secondary,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            const Positioned(
                              right: 12,
                              bottom: 12,
                              child: CircleAvatar(
                                radius: 17,
                                backgroundColor: Colors.white,
                                child: Icon(
                                  Icons.open_in_full,
                                  size: 16,
                                  color: AppColors.secondary,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: 10),
            Consumer<FloodReportProvider>(
              builder: (context, floodProvider, _) {
                final count = floodProvider.floodPoints.length;
                return RescuePanel(
                  padding: 12,
                  child: Row(
                    children: [
                      const Icon(
                        Icons.info_outline,
                        color: AppColors.tertiary,
                        size: 20,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          count > 0
                              ? 'Đang có $count điểm ngập hoạt động trên hệ thống. Chạm để xem chi tiết.'
                              : 'Mở bản đồ để tải danh sách điểm ngập từ hệ thống.',
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.secondary,
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
            const RescueSection('Tiện ích hành trình'),
            _shortcut(
              Icons.add_location_alt_outlined,
              'Báo ngập cộng đồng',
              'Chia sẻ tình trạng đường với mọi người',
              () => _open(const CommunityFloodReportScreen()),
            ),
            const SizedBox(height: 8),
            _shortcut(
              Icons.receipt_long_outlined,
              'Lịch sử cứu hộ',
              'Xem lại thông tin các lần hỗ trợ mẫu',
              () => _select(2),
            ),
          ],
        ),
      ),
    );
  }

  Widget _activeOrderCard(RescueOrderModel order) {
    Color badgeColor = AppColors.primary;
    String actionLabel = 'Xem trạng thái đơn';
    VoidCallback onAction;

    if (order.isRequested && order.orderType == 'BATCH_CROSSING') {
      badgeColor = Colors.orange;
      actionLabel = 'Chọn chuyến gom gần bạn';
      onAction = () => _open(
        CustomerBatchTripScreen(
          orderId: order.id,
          garageId: order.garageId,
          latitude: order.pickupLatitude,
          longitude: order.pickupLongitude,
          destinationLatitude: order.dropoffLatitude,
          destinationLongitude: order.dropoffLongitude,
        ),
      );
    } else if (order.isRequested) {
      badgeColor = Colors.orange;
      actionLabel = 'Theo dõi tìm kiếm cứu hộ';
      onAction = () => _open(RadarDispatchScreen(orderId: order.id));
    } else if (order.status == 'PAYMENT_PENDING') {
      badgeColor = Colors.purple;
      actionLabel = 'Thanh toán đơn cứu hộ';
      onAction = () => _open(
        VietQRPaymentScreen(
          orderId: order.id,
          garageId: order.garageId,
          amount: order.totalAmount,
          orderCode: order.orderCode,
          rescueOrder: order,
        ),
      );
    } else {
      badgeColor = Colors.green;
      actionLabel = 'Theo dõi trực tiếp xe cứu hộ';
      onAction = () => _open(LiveTrackingScreen(orderId: order.id));
    }

    return RescuePanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              RescueLabel('ĐƠN ĐANG THỰC HIỆN', color: badgeColor),
              IconButton(
                icon: const Icon(
                  Icons.refresh,
                  size: 20,
                  color: AppColors.secondary,
                ),
                tooltip: 'Làm mới',
                onPressed: _loadActiveOrder,
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            '${order.serviceName} · #${order.orderCode}',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 4),
          Text(
            'Trạng thái: ${order.statusDescription}',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: badgeColor,
            ),
          ),
          const SizedBox(height: 8),
          RescueInfo(
            icon: Icons.location_on_outlined,
            title: 'Điểm đón',
            value: order.pickupAddress,
          ),
          const SizedBox(height: 4),
          RescueInfo(
            icon: Icons.wb_sunny_outlined,
            title: 'Điểm trả',
            value: order.dropoffAddress,
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            style: FilledButton.styleFrom(
              backgroundColor: badgeColor,
              padding: const EdgeInsets.symmetric(vertical: 12),
            ),
            onPressed: onAction,
            icon: const Icon(Icons.navigation_outlined, size: 18),
            label: Text(
              actionLabel,
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  Widget _service(
    IconData icon,
    String title,
    String subtitle,
    int index,
  ) => RescuePanel(
    padding: 0,
    child: InkWell(
      onTap: () {
        final vehicleProvider = context.read<VehicleProvider?>();
        final currentVehicle = vehicleProvider?.selectedVehicle;
        if (currentVehicle == null && (vehicleProvider?.vehicles.isEmpty ?? true)) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Vui lòng thêm phương tiện trước khi yêu cầu cứu hộ'),
              action: SnackBarAction(
                label: 'Thêm xe',
                onPressed: () => _select(3),
              ),
            ),
          );
          return;
        }
        _open(
          ServiceSelectionScreen(
            initialService: index,
            vehicleName: currentVehicle?.displayName ?? '',
            vehiclePlate: currentVehicle?.licensePlate ?? '',
          ),
        );
      },
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: AppColors.primary, size: 23),
            const SizedBox(height: 10),
            Text(
              title,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 4),
            Text(
              subtitle,
              style: const TextStyle(fontSize: 10, color: AppColors.secondary),
            ),
          ],
        ),
      ),
    ),
  );
  Widget _shortcut(
    IconData icon,
    String title,
    String subtitle,
    VoidCallback action,
  ) => RescuePanel(
    padding: 0,
    child: ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
      leading: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: AppColors.primaryContainer,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, color: AppColors.primary, size: 21),
      ),
      title: Text(
        title,
        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
      ),
      subtitle: Text(
        subtitle,
        style: const TextStyle(fontSize: 11, color: AppColors.secondary),
      ),
      trailing: const Icon(
        Icons.chevron_right,
        size: 18,
        color: AppColors.secondary,
      ),
      onTap: action,
    ),
  );
}
