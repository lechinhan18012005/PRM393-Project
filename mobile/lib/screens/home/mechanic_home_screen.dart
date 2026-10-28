import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/constants/app_colors.dart';
import '../../core/models/rescue_order_model.dart';
import '../../core/services/location_service.dart';
import '../../core/services/rescue_service.dart';
import '../../providers/auth_provider.dart';
import '../../providers/mechanic_provider.dart';
import '../customer/account_screen.dart';
import '../customer/vietqr_payment_screen.dart';
import '../mechanic/crossing_transport_screen.dart';
import '../mechanic/incoming_dispatch_screen.dart';
import '../mechanic/quotation_builder_screen.dart';
import '../mechanic/repair_execution_screen.dart';
import '../mechanic/route_navigation_screen.dart';
import '../mechanic/mechanic_shift_screen.dart';
import '../mechanic/mechanic_ui.dart';

class MechanicHomeScreen extends StatefulWidget {
  const MechanicHomeScreen({super.key});
  @override
  State<MechanicHomeScreen> createState() => _MechanicHomeScreenState();
}

class _MechanicHomeScreenState extends State<MechanicHomeScreen> with WidgetsBindingObserver {
  // Hot reload can retain a State created before these fields existed.
  // Read through defaults instead of relying on field initializers being rerun.
  int? _tab;
  int get _currentTab => _tab ?? 0;
  Set<int>? _visited;
  Set<int> get _visitedTabs => _visited ??= <int>{0};
  static const _titles = [
    'Tổng quan',
    'Công việc',
    'Ca trực',
    'Công cụ',
    'Tài khoản',
  ];

  final RescueService _rescueService = RescueService();
  RescueOrderModel? _activeOrder;

  // Quản lý offer & GPS nhàn rỗi theo phiên FIELD_MECHANIC
  RescueOfferModel? _pendingOffer;
  int _offerSecondsRemaining = 0;
  int? _presentedOfferId;
  bool _isHandlingOfferNavigation = false;
  bool _isPollingOffers = false;
  bool _isSendingGps = false;
  bool _gpsUnavailable = false;
  String? _currentMechanicUsername;

  AppLifecycleState _lifecycleState = AppLifecycleState.resumed;
  bool get _isAppForeground => _lifecycleState == AppLifecycleState.resumed;
  MechanicProvider? _mechanicProvider;

  Timer? _offerPollingTimer;
  Timer? _offerCountdownTimer;
  Timer? _idleGpsTimer;

  bool get _hasActiveOrder =>
      _activeOrder != null &&
      (_activeOrder!.status == 'DISPATCHED' ||
          _activeOrder!.status == 'ARRIVED' ||
          _activeOrder!.status == 'IN_PROGRESS');

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final provider = context.read<MechanicProvider>();
    if (_mechanicProvider != provider) {
      _mechanicProvider?.removeListener(_onProfileChanged);
      _mechanicProvider = provider;
      _mechanicProvider?.addListener(_onProfileChanged);
    }
  }

  void _onProfileChanged() {
    if (!mounted || !_isAppForeground) return;
    _syncTimers();
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && _isAppForeground) {
        _initializeHomeScreen();
      }
    });
  }

  Future<void> _initializeHomeScreen() async {
    if (!mounted || !_isAppForeground) return;
    try {
      await Future.wait([
        context.read<MechanicProvider>().fetchMyProfile(),
        _loadActiveOrder(),
      ]);
    } catch (_) {}
    if (mounted && _isAppForeground) {
      _syncTimers();
      _pollOffersOnce();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _mechanicProvider?.removeListener(_onProfileChanged);
    _stopAllTimers();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _lifecycleState = state;
    if (state == AppLifecycleState.resumed) {
      if (mounted) {
        _initializeHomeScreen();
      }
    } else if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.inactive ||
        state == AppLifecycleState.detached) {
      _stopAllTimers();
    }
  }

  void _syncTimers() {
    if (!mounted || !_isAppForeground) {
      _stopAllTimers();
      return;
    }
    final provider = context.read<MechanicProvider>();
    final profile = provider.myProfile;
    final isOnline = profile?.isOnline == true;

    // Chỉ poll offer và gửi GPS khi thợ AVAILABLE và chưa có cuốc active
    if (isOnline && !_hasActiveOrder) {
      if (_offerPollingTimer == null || !_offerPollingTimer!.isActive) {
        _offerPollingTimer = Timer.periodic(const Duration(seconds: 3), (_) {
          _pollOffersOnce();
        });
        _pollOffersOnce();
      }
      if (_idleGpsTimer == null || !_idleGpsTimer!.isActive) {
        _idleGpsTimer = Timer.periodic(const Duration(seconds: 30), (_) {
          _sendIdleGps();
        });
      }
    } else {
      _stopAllTimers();
    }
  }

  void _stopAllTimers() {
    _offerPollingTimer?.cancel();
    _offerPollingTimer = null;
    _idleGpsTimer?.cancel();
    _idleGpsTimer = null;
    _offerCountdownTimer?.cancel();
    _offerCountdownTimer = null;
  }

  int _calculateRemainingSeconds(RescueOfferModel offer) {
    if (offer.expiresAt != null) {
      final expireTime = DateTime.tryParse(offer.expiresAt!);
      if (expireTime != null) {
        final diffMs = expireTime.difference(DateTime.now()).inMilliseconds;
        final seconds = (diffMs + 999) ~/ 1000;
        return seconds.clamp(0, 45);
      }
    }
    return offer.secondsRemaining.clamp(0, 45);
  }

  Future<void> _pollOffersOnce() async {
    if (_isPollingOffers || !mounted || !_isAppForeground) return;

    final authUser = context.read<AuthProvider>().user;
    if (authUser == null || authUser.role != 'FIELD_MECHANIC') {
      _stopAllTimers();
      setState(() {
        _pendingOffer = null;
        _presentedOfferId = null;
      });
      return;
    }

    // Đổi tài khoản: reset cache offer
    if (_currentMechanicUsername != null && _currentMechanicUsername != authUser.username) {
      setState(() {
        _pendingOffer = null;
        _presentedOfferId = null;
      });
    }
    _currentMechanicUsername = authUser.username;

    // Nếu đã có đơn active hoặc profile offline, không poll
    final profile = context.read<MechanicProvider>().myProfile;
    if (_hasActiveOrder || profile?.isOnline != true) {
      _stopAllTimers();
      return;
    }

    _isPollingOffers = true;
    try {
      final list = await _rescueService.getPendingOffers();
      if (!mounted || !_isAppForeground) return;

      final currentAuth = context.read<AuthProvider>().user;
      if (currentAuth?.username != _currentMechanicUsername) return;

      final validOffers = list.where((o) {
        if (o.status != 'PENDING') return false;
        final rem = _calculateRemainingSeconds(o);
        return rem > 0;
      }).toList();

      if (validOffers.isNotEmpty) {
        final latest = validOffers.first;
        final rem = _calculateRemainingSeconds(latest);

        setState(() {
          _pendingOffer = latest;
          _offerSecondsRemaining = rem;
        });
        _startOfferCountdown();

        // Mở màn nhận cuốc đúng 1 lần cho mỗi offerId
        if (IncomingDispatchScreen.isScreenOpen) {
          _presentedOfferId = latest.offerId;
          IncomingDispatchScreen.updateActiveOffer(latest);
        } else if (_presentedOfferId != latest.offerId && !_isHandlingOfferNavigation) {
          _presentedOfferId = latest.offerId;
          _openIncomingDispatchScreen(offer: latest);
        }
      } else {
        if (_pendingOffer != null) {
          setState(() {
            _pendingOffer = null;
            _offerSecondsRemaining = 0;
            _presentedOfferId = null;
          });
          _offerCountdownTimer?.cancel();
        }
      }
    } catch (_) {
      // Bỏ qua lỗi mạng chập chờn khi polling, chu kỳ sau thử lại
    } finally {
      _isPollingOffers = false;
    }
  }

  void _startOfferCountdown() {
    _offerCountdownTimer?.cancel();
    if (!_isAppForeground) return;
    _offerCountdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted || !_isAppForeground || _pendingOffer == null) {
        timer.cancel();
        return;
      }
      final rem = _calculateRemainingSeconds(_pendingOffer!);
      if (rem <= 0) {
        timer.cancel();
        setState(() {
          _offerSecondsRemaining = 0;
          _pendingOffer = null;
          _presentedOfferId = null;
        });
      } else {
        setState(() => _offerSecondsRemaining = rem);
      }
    });
  }

  Future<void> _sendIdleGps() async {
    if (_isSendingGps || !mounted || !_isAppForeground) return;
    final profile = context.read<MechanicProvider>().myProfile;
    if (profile == null || !profile.isOnline || _hasActiveOrder) return;

    _isSendingGps = true;
    try {
      final loc = await LocationService.instance.getCurrentLocation();
      if (!mounted || !_isAppForeground) return;
      if (loc == null) {
        setState(() => _gpsUnavailable = true);
        return;
      }

      final age = DateTime.now().difference(loc.timestamp).inSeconds.abs();
      if (age > 30) {
        setState(() => _gpsUnavailable = true);
        return;
      }

      setState(() => _gpsUnavailable = false);
      // Gửi GPS thật lên backend để làm mới last_gps_updated_at lúc thợ đang AVAILABLE
      await context.read<MechanicProvider>().toggleStatus(
            status: 'AVAILABLE',
            latitude: loc.latitude,
            longitude: loc.longitude,
          );
    } catch (_) {
      // Bỏ qua lỗi mạng lúc gửi GPS heartbeat
    } finally {
      _isSendingGps = false;
    }
  }

  Future<void> _loadActiveOrder() async {
    try {
      final order = await _rescueService.getActiveOrder();
      if (mounted) {
        setState(() => _activeOrder = order);
        if (_isAppForeground) {
          _syncTimers();
        }
      }
    } catch (_) {}
  }

  Future<void> _toggleAvailability() async {
    await changeMechanicAvailability(context);
    if (mounted && _isAppForeground) {
      _syncTimers();
      _pollOffersOnce();
    }
  }

  void _select(int value) => setState(() {
    _tab = value;
    _visitedTabs.add(value);
  });

  Future<void> _openIncomingDispatchScreen({RescueOfferModel? offer}) async {
    if (IncomingDispatchScreen.isScreenOpen) {
      if (offer != null) {
        IncomingDispatchScreen.updateActiveOffer(offer);
      }
      return;
    }
    _isHandlingOfferNavigation = true;
    try {
      await Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => IncomingDispatchScreen(
            offerId: offer?.offerId,
            initialOffer: offer,
          ),
        ),
      );
    } finally {
      _isHandlingOfferNavigation = false;
      if (mounted && _isAppForeground) {
        context.read<MechanicProvider>().fetchMyProfile();
        await _loadActiveOrder();
        _syncTimers();
        _pollOffersOnce();
      }
    }
  }

  Future<void> _open(Widget page) async {
    await Navigator.of(context).push(MaterialPageRoute(builder: (_) => page));
    if (mounted && _isAppForeground) {
      context.read<MechanicProvider>().fetchMyProfile();
      await _loadActiveOrder();
      _syncTimers();
      _pollOffersOnce();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: _currentTab == 4
          ? null
          : AppBar(
              title: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'FLOOD RESCUE / ĐỘI CỨU HỘ',
                    style: TextStyle(
                      fontSize: 9,
                      letterSpacing: 1.4,
                      color: AppColors.secondary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    _titles[_currentTab],
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
              actions: [
                IconButton(
                  tooltip: 'Làm mới',
                  onPressed: () {
                    _initializeHomeScreen();
                  },
                  icon: const Icon(
                    Icons.refresh_rounded,
                    color: AppColors.secondary,
                  ),
                ),
              ],
            ),
      body: IndexedStack(
        index: _currentTab,
        children: [
          _overview(),
          _visitedTabs.contains(1) ? _jobs() : const SizedBox.shrink(),
          _visitedTabs.contains(2)
              ? const MechanicShiftScreen(embedded: true)
              : const SizedBox.shrink(),
          _visitedTabs.contains(3) ? _tools() : const SizedBox.shrink(),
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
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(
              Icons.dashboard_rounded,
              color: AppColors.primary,
            ),
            label: 'Tổng quan',
          ),
          NavigationDestination(
            icon: Icon(Icons.assignment_outlined),
            selectedIcon: Icon(Icons.assignment, color: AppColors.primary),
            label: 'Công việc',
          ),
          NavigationDestination(
            icon: Icon(Icons.schedule_outlined),
            selectedIcon: Icon(Icons.schedule, color: AppColors.primary),
            label: 'Ca trực',
          ),
          NavigationDestination(
            icon: Icon(Icons.handyman_outlined),
            selectedIcon: Icon(Icons.handyman, color: AppColors.primary),
            label: 'Công cụ',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person, color: AppColors.primary),
            label: 'Tài khoản',
          ),
        ],
      ),
    );
  }

  Widget _scroll(List<Widget> children) => Center(
    child: ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 760),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
        children: children,
      ),
    ),
  );

  Widget _overview() {
    final provider = context.watch<MechanicProvider>();
    final profile = provider.myProfile;
    final name = context.watch<AuthProvider>().user?.fullName ?? 'Thợ cứu hộ';



    return _scroll([
      MechanicPanel(
        dark: true,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'CHÀO MỪNG TRỞ LẠI',
              style: TextStyle(
                color: Color(0xFF99B4C6),
                fontSize: 10,
                letterSpacing: 1.3,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              name,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 23,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              profile?.garageName ?? 'Không gian làm việc của đội cứu hộ',
              style: const TextStyle(color: Color(0xFFB9CEDB), fontSize: 12),
            ),
            const SizedBox(height: 18),
            Wrap(
              spacing: 10,
              runSpacing: 8,
              children: [
                MechanicLabel(
                  profile == null
                      ? 'Chưa tải hồ sơ'
                      : profile.isBusy
                      ? 'Đang thực hiện việc'
                      : profile.isOnline
                      ? 'Sẵn sàng nhận đơn'
                      : 'Đang nghỉ',
                  color: const Color(0xFF76D6B5),
                ),
                if (profile?.branchName != null)
                  MechanicLabel(
                    profile!.branchName!,
                    color: const Color(0xFFB9CEDB),
                  ),
              ],
            ),
          ],
        ),
      ),
      const SizedBox(height: 12),
      Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: _metric(
              Icons.storefront_outlined,
              'Chi nhánh',
              profile?.branchName ?? 'Chưa phân công',
              AppColors.primary,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: _metric(
              Icons.schedule_rounded,
              'Ca được phân',
              profile?.shiftName ?? 'Chưa phân ca',
              AppColors.tertiary,
            ),
          ),
        ],
      ),
      if (provider.errorMessage != null)
        Padding(
          padding: const EdgeInsets.only(top: 12),
          child: MechanicPanel(
            child: Text(
              provider.errorMessage!,
              style: const TextStyle(color: AppColors.error, fontSize: 12),
            ),
          ),
        ),
      MechanicSection(
        'Trạng thái làm việc',
        action: TextButton(
          onPressed: () => _select(2),
          child: const Text('Xem ca trực'),
        ),
      ),
      MechanicPanel(
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.tertiary.withValues(alpha: .08),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.radar, color: AppColors.tertiary),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    profile == null
                        ? 'Chờ tải hồ sơ'
                        : profile.isBusy
                        ? 'Đang bận'
                        : profile.isOnline
                        ? 'Đang nhận yêu cầu'
                        : 'Tạm nghỉ',
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    profile?.isOnline == true
                        ? (_gpsUnavailable
                            ? 'GPS không khả dụng · Cần bật vị trí để nhận cuốc'
                            : 'Đang trực tuyến · Tọa độ GPS đã đồng bộ')
                        : 'Trạng thái đồng bộ với gara',
                    style: TextStyle(
                      fontSize: 11,
                      color: _gpsUnavailable && profile?.isOnline == true
                          ? AppColors.error
                          : AppColors.secondary,
                    ),
                  ),
                ],
              ),
            ),
            Switch(
              value: profile?.isOnline ?? false,
              onChanged: profile == null || profile.isBusy || provider.isLoading
                  ? null
                  : (_) => _toggleAvailability(),
            ),
          ],
        ),
      ),
      const MechanicSection('Công việc cứu hộ'),
      if (_hasActiveOrder)
        _activeOrderCard(_activeOrder!)
      else if (_pendingOffer != null)
        _pendingOfferCard(_pendingOffer!)
      else
        _idleWaitingCard(),
      const MechanicSection('Truy cập nhanh'),
      _tool(
        Icons.notifications_active_outlined,
        'Tiếp nhận điều phối cứu hộ',
        'Kiểm tra và nhận các ca cứu hộ đang chờ',
        () => _openIncomingDispatchScreen(),
        demo: false,
      ),
      const SizedBox(height: 8),
      _tool(
        Icons.receipt_long_outlined,
        'Lập báo giá',
        'Chọn dịch vụ và tính chi phí',
        () => _open(const QuotationBuilderScreen()),
      ),
      const SizedBox(height: 8),
      _tool(
        Icons.person_outline,
        'Thông tin tài khoản',
        'Xem hồ sơ, cập nhật và đăng xuất',
        () => _select(4),
        demo: false,
      ),
    ]);
  }

  Widget _metric(IconData icon, String label, String value, Color color) =>
      MechanicPanel(
        padding: 13,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 20, color: color),
            const SizedBox(height: 12),
            Text(
              label,
              style: const TextStyle(color: AppColors.secondary, fontSize: 10),
            ),
            const SizedBox(height: 5),
            Text(
              value,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
            ),
          ],
        ),
      );

  Widget _activeOrderCard(RescueOrderModel order) => MechanicPanel(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            const MechanicLabel('ĐƠN ĐANG THỰC HIỆN', color: AppColors.primaryOrange),
            MechanicLabel(order.statusDescription),
          ],
        ),
        const SizedBox(height: 14),
        Text(
          'Đơn #${order.orderCode} · ${order.serviceName}',
          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 5),
        Text(
          '${order.vehiclePlate} · ${order.vehicleModel ?? "Xe máy"}',
          style: const TextStyle(fontSize: 12, color: AppColors.secondary),
        ),
        const Divider(height: 26),
        MechanicInfo(
          icon: Icons.person_outline,
          title: 'Khách hàng',
          value: '${order.customerName} (${order.customerPhone ?? ""})',
        ),
        MechanicInfo(
          icon: Icons.location_on_outlined,
          title: 'Điểm đón',
          value: order.pickupAddress,
        ),
        MechanicInfo(
          icon: Icons.wb_sunny_outlined,
          title: 'Điểm trả',
          value: order.dropoffAddress,
        ),
        const SizedBox(height: 14),
        SizedBox(
          width: double.infinity,
          child: FilledButton.icon(
            style: FilledButton.styleFrom(backgroundColor: AppColors.primaryOrange),
            onPressed: () {
              if (order.status == 'DISPATCHED') {
                _open(RouteNavigationScreen(orderId: order.id));
              } else {
                _open(CrossingTransportScreen(orderId: order.id));
              }
            },
            icon: const Icon(Icons.arrow_forward, size: 17),
            label: Text(
              order.status == 'DISPATCHED'
                  ? 'Tiếp tục di chuyển đến điểm đón'
                  : 'Tiếp tục chuyên chở qua ngập',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
        ),
      ],
    ),
  );

  Widget _pendingOfferCard(RescueOfferModel offer) => MechanicPanel(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            MechanicLabel(
              'YÊU CẦU CỨU HỘ MỚI (Còn ${_offerSecondsRemaining}s)',
              color: AppColors.primaryOrange,
            ),
            MechanicLabel(offer.orderType == 'SINGLE_CROSSING' ? 'Chở xe qua ngập' : 'Cứu hộ'),
          ],
        ),
        const SizedBox(height: 14),
        Text(
          'Đơn #${offer.orderCode} · ${offer.totalAmount.toStringAsFixed(0)} ₫',
          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 5),
        Text(
          '${offer.vehiclePlate} · ${offer.vehicleModel ?? "Xe máy"}',
          style: const TextStyle(fontSize: 12, color: AppColors.secondary),
        ),
        const Divider(height: 26),
        MechanicInfo(
          icon: Icons.person_outline,
          title: 'Khách hàng',
          value: '${offer.customerName} (${offer.customerPhone ?? ""})',
        ),
        MechanicInfo(
          icon: Icons.location_on_outlined,
          title: 'Điểm đón',
          value: offer.pickupAddress,
        ),
        MechanicInfo(
          icon: Icons.wb_sunny_outlined,
          title: 'Điểm trả',
          value: offer.dropoffAddress,
        ),
        const SizedBox(height: 14),
        SizedBox(
          width: double.infinity,
          child: FilledButton.icon(
            style: FilledButton.styleFrom(backgroundColor: AppColors.primaryOrange),
            onPressed: () {
              _openIncomingDispatchScreen(offer: offer);
            },
            icon: const Icon(Icons.arrow_forward, size: 17),
            label: Text(
              'Xem & Tiếp nhận ca cứu hộ (${_offerSecondsRemaining}s)',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
        ),
      ],
    ),
  );

  Widget _idleWaitingCard() {
    final provider = context.watch<MechanicProvider>();
    final profile = provider.myProfile;
    final isOnline = profile?.isOnline ?? false;

    return MechanicPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              MechanicLabel(
                isOnline ? 'ĐANG CHỜ ĐIỀU PHỐI' : 'TẠM NGHỈ',
                color: isOnline ? const Color(0xFF76D6B5) : AppColors.secondary,
              ),
              if (_gpsUnavailable && isOnline)
                const MechanicLabel('GPS KHÔNG TÍN HIỆU', color: AppColors.error),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            isOnline
                ? 'Sẵn sàng tiếp nhận cứu hộ'
                : 'Chưa kích hoạt ca trực',
            style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 5),
          Text(
            isOnline
                ? (_gpsUnavailable
                    ? 'Cảnh báo: GPS bị gián đoạn. Hãy bật vị trí để nhận điều phối cuốc ngập.'
                    : 'Hệ thống tự động điều phối khi có khách cần cứu hộ trong khu vực.')
                : 'Bật công tắc trực tuyến ở trên để bắt đầu nhận yêu cầu cứu hộ từ khách hàng.',
            style: TextStyle(
              fontSize: 12,
              color: _gpsUnavailable && isOnline ? AppColors.error : AppColors.secondary,
            ),
          ),
          const Divider(height: 26),
          MechanicInfo(
            icon: Icons.radar,
            title: 'Kênh tiếp nhận',
            value: isOnline ? 'Đang lắng nghe cuốc mới (chu kỳ 3s)' : 'Đang tạm dừng',
          ),
          MechanicInfo(
            icon: Icons.location_on_outlined,
            title: 'Tọa độ GPS hiện tại',
            value: profile?.currentLatitude != null
                ? '${profile!.currentLatitude!.toStringAsFixed(4)}, ${profile.currentLongitude!.toStringAsFixed(4)}'
                : 'Chưa có mẫu GPS',
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () => _openIncomingDispatchScreen(),
              icon: const Icon(Icons.open_in_new, size: 17),
              label: const Text('Mở màn hình tiếp nhận điều phối'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _jobs() => _scroll([
    const Text(
      'Danh sách công việc',
      style: TextStyle(fontSize: 21, fontWeight: FontWeight.w800),
    ),
    const SizedBox(height: 6),
    const Text(
      'Theo dõi các yêu cầu cứu hộ và tiến độ công việc.',
      style: TextStyle(fontSize: 12, color: AppColors.secondary),
    ),
    const SizedBox(height: 16),
    if (_hasActiveOrder)
      _activeOrderCard(_activeOrder!)
    else if (_pendingOffer != null)
      _pendingOfferCard(_pendingOffer!)
    else
      _idleWaitingCard(),
    const SizedBox(height: 16),
    const MechanicPanel(
      child: MechanicInfo(
        icon: Icons.info_outline,
        title: 'Quy trình tiếp nhận',
        value: 'Khi có ca cứu hộ mới, hệ thống tự động gửi yêu cầu với thời gian 45 giây phản hồi.',
      ),
    ),
  ]);

  Widget _tools() => _scroll([
    const Text(
      'Bộ công cụ hiện trường',
      style: TextStyle(fontSize: 21, fontWeight: FontWeight.w800),
    ),
    const SizedBox(height: 6),
    const Text(
      'Hỗ trợ từng bước của hành trình cứu hộ.',
      style: TextStyle(fontSize: 12, color: AppColors.secondary),
    ),
    const MechanicSection('Tiếp nhận & di chuyển'),
    _tool(
      Icons.notifications_active_outlined,
      'Tiếp nhận điều phối cứu hộ',
      'Kiểm tra và nhận các ca cứu hộ đang chờ',
      () => _openIncomingDispatchScreen(),
      demo: false,
    ),
    const SizedBox(height: 8),
    _tool(
      Icons.local_shipping_outlined,
      'Chở xe qua ngập',
      'Tiến độ 5 bước chở xe đơn lẻ',
      () => _open(CrossingTransportScreen(orderId: _hasActiveOrder ? _activeOrder?.id : null)),
      demo: !_hasActiveOrder,
    ),
    const SizedBox(height: 8),
    _tool(
      Icons.route_outlined,
      'Đường đến khách',
      'Xem lộ trình điều hướng',
      () => _open(RouteNavigationScreen(orderId: _hasActiveOrder ? _activeOrder?.id : null)),
      demo: !_hasActiveOrder,
    ),
    const MechanicSection('Sửa chữa & thanh toán'),
    _tool(
      Icons.receipt_long_outlined,
      'Lập báo giá',
      'Danh mục dịch vụ và tổng chi phí',
      () => _open(const QuotationBuilderScreen()),
    ),
    const SizedBox(height: 8),
    _tool(
      Icons.build_outlined,
      'Thực hiện sửa chữa',
      'Theo dõi các bước công việc',
      () => _open(const RepairExecutionScreen()),
    ),
    const SizedBox(height: 8),
    _tool(
      Icons.qr_code_rounded,
      'Thanh toán VietQR',
      'Xem giao diện thanh toán',
      () => _open(const VietQRPaymentScreen()),
    ),
  ]);

  Widget _tool(
    IconData icon,
    String title,
    String subtitle,
    VoidCallback onTap, {
    bool demo = true,
  }) => MechanicPanel(
    padding: 0,
    child: ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
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
        '$subtitle${demo ? ' · Mô phỏng' : ''}',
        style: const TextStyle(fontSize: 11, color: AppColors.secondary),
      ),
      trailing: const Icon(
        Icons.chevron_right,
        size: 18,
        color: AppColors.secondary,
      ),
      onTap: onTap,
    ),
  );
}
