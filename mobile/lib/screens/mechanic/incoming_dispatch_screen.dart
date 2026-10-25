import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/constants/app_colors.dart';
import '../../core/models/rescue_order_model.dart';
import '../../core/services/rescue_service.dart';
import '../../providers/mechanic_provider.dart';
import 'mechanic_ui.dart';
import 'route_navigation_screen.dart';

class IncomingDispatchScreen extends StatefulWidget {
  final int? offerId;
  final RescueOfferModel? initialOffer;

  const IncomingDispatchScreen({super.key, this.offerId, this.initialOffer});

  static bool get isScreenOpen => _activeInstance != null;
  static _IncomingDispatchScreenState? _activeInstance;

  static void updateActiveOffer(RescueOfferModel offer) {
    _activeInstance?._applyOffer(offer);
  }

  @visibleForTesting
  static void resetTrackingForTesting() {
    _activeInstance = null;
  }

  @override
  State<IncomingDispatchScreen> createState() => _IncomingDispatchScreenState();
}

class _IncomingDispatchScreenState extends State<IncomingDispatchScreen> with WidgetsBindingObserver {
  final RescueService _rescueService = RescueService();
  RescueOfferModel? _offer;
  Timer? _countdownTimer;
  Timer? _pollingTimer;
  int _remainingSeconds = 45;
  bool _isLoading = false;
  bool _isAccepting = false;
  String? _errorMessage;

  AppLifecycleState _lifecycleState = AppLifecycleState.resumed;
  bool get _isAppForeground => _lifecycleState == AppLifecycleState.resumed;

  @override
  void initState() {
    super.initState();
    IncomingDispatchScreen._activeInstance = this;
    WidgetsBinding.instance.addObserver(this);
    if (widget.initialOffer != null) {
      _offer = widget.initialOffer;
      _remainingSeconds = _calculateRemainingSeconds();
      _startTimer();
    } else {
      _loadOffer();
      _startOfferPolling();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    if (IncomingDispatchScreen._activeInstance == this) {
      IncomingDispatchScreen._activeInstance = null;
    }
    _stopTimers();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _lifecycleState = state;
    if (state == AppLifecycleState.resumed) {
      if (!mounted) return;
      if (_offer != null) {
        final remaining = _calculateRemainingSeconds();
        if (remaining <= 0) {
          _stopTimers();
          setState(() => _remainingSeconds = 0);
          _onOfferExpired();
        } else {
          setState(() => _remainingSeconds = remaining);
          _startTimer();
        }
      } else {
        _loadOffer();
        _startOfferPolling();
      }
    } else if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.inactive ||
        state == AppLifecycleState.detached) {
      _stopTimers();
    }
  }

  void _stopTimers() {
    _countdownTimer?.cancel();
    _countdownTimer = null;
    _pollingTimer?.cancel();
    _pollingTimer = null;
  }

  void _applyOffer(RescueOfferModel offer) {
    if (!mounted) return;
    if (_offer?.offerId == offer.offerId) return;
    _pollingTimer?.cancel();
    setState(() {
      _offer = offer;
      _isLoading = false;
      _errorMessage = null;
    });
    _startTimer();
  }

  void _startOfferPolling() {
    _pollingTimer?.cancel();
    if (!_isAppForeground) return;
    _pollingTimer = Timer.periodic(const Duration(seconds: 3), (_) {
      if (!mounted || !_isAppForeground || _offer != null) {
        _pollingTimer?.cancel();
        return;
      }
      _loadOffer(isPeriodic: true);
    });
  }

  int _calculateRemainingSeconds() {
    if (_offer == null) return 45;
    if (_offer!.expiresAt != null) {
      final expireTime = DateTime.tryParse(_offer!.expiresAt!);
      if (expireTime != null) {
        final diffMs = expireTime.difference(DateTime.now()).inMilliseconds;
        final seconds = (diffMs + 999) ~/ 1000;
        return seconds.clamp(0, 45);
      }
    }
    return _offer!.secondsRemaining.clamp(0, 45);
  }

  void _startTimer() {
    _countdownTimer?.cancel();
    if (!_isAppForeground) return;
    _remainingSeconds = _calculateRemainingSeconds();
    if (_remainingSeconds <= 0) {
      _onOfferExpired();
      return;
    }
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted || !_isAppForeground) {
        timer.cancel();
        return;
      }
      final remaining = _calculateRemainingSeconds();
      if (remaining > 0) {
        setState(() => _remainingSeconds = remaining);
      } else {
        setState(() => _remainingSeconds = 0);
        timer.cancel();
        _onOfferExpired();
      }
    });
  }

  void _onOfferExpired() {
    if (!mounted || !_isAppForeground) return;
    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: const Text('Hết thời gian phản hồi'),
        content: const Text(
          'Đã quá 45 giây phản hồi. Hệ thống đã tự động chuyển yêu cầu cứu hộ này cho thợ tiếp theo trong danh sách điều phối.',
        ),
        actions: [
          FilledButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              if (mounted) Navigator.of(context).pop();
            },
            child: const Text('Đã hiểu'),
          ),
        ],
      ),
    );
  }

  Future<void> _loadOffer({bool isPeriodic = false}) async {
    if (!_isAppForeground) {
      _stopTimers();
      return;
    }
    if (!isPeriodic) {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
      });
    }
    try {
      final list = await _rescueService.getPendingOffers();
      if (!mounted || !_isAppForeground) return;

      // Filter offers with status PENDING and remaining seconds > 0
      final validOffers = list.where((o) {
        if (o.status != 'PENDING') return false;
        if (o.expiresAt != null) {
          final exp = DateTime.tryParse(o.expiresAt!);
          if (exp != null && exp.isBefore(DateTime.now())) return false;
        }
        return true;
      }).toList();

      if (validOffers.isNotEmpty) {
        RescueOfferModel selected;
        if (widget.offerId != null) {
          selected = validOffers.firstWhere(
            (o) => o.offerId == widget.offerId,
            orElse: () => validOffers.first,
          );
        } else {
          selected = validOffers.first;
        }

        _pollingTimer?.cancel();
        setState(() {
          _offer = selected;
          _isLoading = false;
          _errorMessage = null;
        });
        _startTimer();
      } else {
        if (mounted && _isAppForeground) {
          setState(() {
            _isLoading = false;
            // If offer was present but now gone from pending list, it may have expired or been taken
            if (_offer != null) {
              _offer = null;
              _countdownTimer?.cancel();
              _startOfferPolling();
            }
          });
        }
      }
    } catch (e) {
      if (mounted && _isAppForeground) {
        setState(() {
          _isLoading = false;
          if (!isPeriodic) {
            _errorMessage = e.toString().replaceFirst('Exception: ', '');
          }
        });
      }
    }
  }

  Future<void> _acceptOffer() async {
    final offer = _offer;
    if (offer == null) return;

    setState(() => _isAccepting = true);
    _countdownTimer?.cancel();

    try {
      final order = await _rescueService.acceptOffer(offer.offerId);
      if (mounted) {
        // Tải lại hồ sơ để đồng bộ trạng thái BUSY
        await context.read<MechanicProvider>().fetchMyProfile();
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Đã tiếp nhận ca cứu hộ! Hãy di chuyển đến điểm đón.'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (_) => RouteNavigationScreen(orderId: order.id),
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;

      // Xử lý mất phản hồi sau accept: kiểm tra xem đơn đã chuyển DISPATCHED cho thợ này chưa
      try {
        final activeOrder = await _rescueService.getActiveOrder();
        if (activeOrder != null && activeOrder.id == offer.orderId && mounted) {
          await context.read<MechanicProvider>().fetchMyProfile();
          if (!mounted) return;
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(
              builder: (_) => RouteNavigationScreen(orderId: activeOrder.id),
            ),
          );
          return;
        }
      } catch (_) {}

      if (!mounted) return;
      setState(() => _isAccepting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Lỗi nhận đơn: ${e.toString().replaceFirst("Exception: ", "")}'),
          backgroundColor: Colors.red,
        ),
      );
      _loadOffer();
    }
  }

  Future<void> _rejectOffer() async {
    if (_offer == null) {
      Navigator.of(context).pop();
      return;
    }

    setState(() => _isLoading = true);
    _countdownTimer?.cancel();

    try {
      await _rescueService.rejectOffer(
        _offer!.offerId,
        reason: 'Thợ bận hoặc khoảng cách hiện tại chưa thuận tiện',
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Đã từ chối đơn. Đơn sẽ chuyển sang thợ kế tiếp.'),
          ),
        );
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        Navigator.of(context).pop();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final offer = _offer;

    return MechanicPage(
      title: offer != null ? 'Yêu cầu cứu hộ đến' : 'Tiếp nhận điều phối',
      bottom: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          FilledButton.icon(
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.primaryOrange,
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
            onPressed: (_isAccepting || _isLoading || offer == null) ? null : _acceptOffer,
            icon: _isAccepting
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.check_circle_outline, size: 20),
            label: Text(
              _isAccepting
                  ? 'Đang tiếp nhận...'
                  : (offer != null
                      ? 'Chấp nhận ca cứu hộ ($_remainingSeconds s)'
                      : 'Đang đợi ca cứu hộ...'),
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
          ),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: (_isAccepting || _isLoading)
                ? null
                : (offer != null ? _rejectOffer : () => Navigator.of(context).pop()),
            child: Text(
              offer != null ? 'Từ chối nhận đơn' : 'Quay lại trang chủ',
              style: TextStyle(color: offer != null ? Colors.redAccent : AppColors.secondary),
            ),
          ),
        ],
      ),
      children: [
        if (_errorMessage != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: MechanicPanel(
              child: Row(
                children: [
                  const Icon(Icons.error_outline, color: AppColors.error, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _errorMessage!,
                      style: const TextStyle(color: AppColors.error, fontSize: 12),
                    ),
                  ),
                  TextButton(
                    onPressed: () => _loadOffer(),
                    child: const Text('Thử lại'),
                  ),
                ],
              ),
            ),
          ),

        if (offer == null) ...[
          // Empty / Waiting state
          MechanicPanel(
            child: Column(
              children: [
                const SizedBox(height: 20),
                const Icon(Icons.radar, size: 54, color: AppColors.primaryOrange),
                const SizedBox(height: 16),
                const Text(
                  'Đang đợi điều phối ca cứu hộ mới...',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                const Text(
                  'Khi có yêu cầu cứu hộ từ khách hàng trong khu vực, thông tin cuốc xe sẽ tự động hiển thị tại đây.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 12, color: AppColors.secondary),
                ),
                const SizedBox(height: 20),
                OutlinedButton.icon(
                  onPressed: _isLoading ? null : () => _loadOffer(),
                  icon: _isLoading
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.refresh, size: 16),
                  label: const Text('Làm mới danh sách'),
                ),
                const SizedBox(height: 10),
              ],
            ),
          ),
        ] else ...[
          // Countdown timer bar
          Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 14),
            decoration: BoxDecoration(
              color: _remainingSeconds > 15 ? Colors.blue.shade50 : Colors.red.shade50,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: _remainingSeconds > 15 ? Colors.blue.shade300 : Colors.red.shade300,
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.timer,
                  color: _remainingSeconds > 15 ? Colors.blue.shade800 : Colors.red.shade800,
                  size: 20,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Thời gian chấp nhận: $_remainingSeconds giây (offer tự động chuyển nếu quá hạn)',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: _remainingSeconds > 15 ? Colors.blue.shade900 : Colors.red.shade900,
                    ),
                  ),
                ),
              ],
            ),
          ),

          MechanicPanel(
            dark: true,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                MechanicLabel(
                  'ĐƠN CỨU HỘ #${offer.orderCode}',
                  color: const Color(0xFFFFC09E),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Khách hàng cần chở xe\nvượt vùng ngập nước',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                    height: 1.25,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  'Cước phí chuyến riêng: ${offer.totalAmount.toStringAsFixed(0)} ₫ · Giá niêm yết cố định',
                  style: const TextStyle(color: Color(0xFFB9CEDB), fontSize: 13, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),

          const MechanicSection('Thông tin khách hàng & xe'),
          MechanicPanel(
            child: Column(
              children: [
                MechanicInfo(
                  icon: Icons.person_outline,
                  title: 'Khách hàng',
                  value: offer.customerName,
                ),
                const Divider(),
                MechanicInfo(
                  icon: Icons.two_wheeler_outlined,
                  title: 'Phương tiện cần chở',
                  value: '${offer.vehiclePlate} · ${offer.vehicleModel ?? "Xe máy"}',
                ),
                if (offer.waterLevel != null) ...[
                  const Divider(),
                  MechanicInfo(
                    icon: Icons.water_drop_outlined,
                    title: 'Mực nước hiện trường',
                    value: offer.waterLevel!,
                  ),
                ],
              ],
            ),
          ),

          const MechanicSection('Lộ trình chuyên chở'),
          MechanicPanel(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                MechanicInfo(
                  icon: Icons.location_on_outlined,
                  title: 'Điểm đón khách (đang ngập)',
                  value: offer.pickupAddress,
                ),
                const Divider(),
                MechanicInfo(
                  icon: Icons.wb_sunny_outlined,
                  title: 'Điểm trả xe (vùng khô ráo)',
                  value: offer.dropoffAddress,
                ),
                const Divider(),
                MechanicInfo(
                  icon: Icons.route_outlined,
                  title: 'Khoảng cách đến điểm đón',
                  value: '${(offer.distanceMeters / 1000).toStringAsFixed(1)} km (~ 5-8 phút)',
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}
