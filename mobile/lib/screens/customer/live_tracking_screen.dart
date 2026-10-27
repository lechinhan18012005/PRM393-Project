import 'dart:async';
import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/models/rescue_order_model.dart';
import '../../core/services/rescue_service.dart';
import '../../core/widgets/rescue_ui.dart';
import '../../core/widgets/rescue_map_painter.dart';
import 'vietqr_payment_screen.dart';

class LiveTrackingScreen extends StatefulWidget {
  final int? orderId;

  const LiveTrackingScreen({super.key, this.orderId});

  @override
  State<LiveTrackingScreen> createState() => _LiveTrackingScreenState();
}

class _LiveTrackingScreenState extends State<LiveTrackingScreen> {
  final RescueService _rescueService = RescueService();
  Timer? _pollTimer;

  RescueOrderModel? _order;
  TrackingSnapshotModel? _snapshot;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    if (widget.orderId != null) {
      _fetchTracking();
      _pollTimer = Timer.periodic(const Duration(seconds: 4), (_) {
        _fetchTracking();
      });
    }
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  Future<void> _fetchTracking() async {
    if (widget.orderId == null) return;
    try {
      final order = await _rescueService.getOrderById(widget.orderId!);
      TrackingSnapshotModel? snapshot;
      try {
        snapshot = await _rescueService.getTrackingSnapshot(widget.orderId!);
      } catch (_) {}

      if (!mounted) return;
      setState(() {
        _order = order;
        _snapshot = snapshot;
        _errorMessage = null;
      });

      if (order.status == 'CANCELLED' || order.status == 'COMPLETED') {
        _pollTimer?.cancel();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString().replaceFirst('Exception: ', '');
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final order = _order;
    final snapshot = _snapshot;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          order != null ? 'Theo dõi #${order.orderCode}' : 'Theo dõi cứu hộ',
          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
        ),
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 760),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              if (_errorMessage != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(
                    _errorMessage!,
                    style: const TextStyle(color: Colors.red, fontSize: 12),
                  ),
                ),
              if (order != null) ...[
                RescueIntro(
                  eyebrow: 'ĐƠN CỨU HỘ #${order.orderCode}',
                  title: _getTitleByStatus(order),
                  description: 'Chở xe vượt ngập đơn lẻ đến điểm khô ráo đã chọn.',
                  trailing: RescueLabel(
                    _getStatusBadge(order),
                    color: _getStatusBadgeColor(order),
                  ),
                ),
              ] else ...[
                const RescueIntro(
                  eyebrow: 'YÊU CẦU MẪU #SOS-8924',
                  title: 'Đội hỗ trợ đang đến',
                  description: 'Luồng theo dõi minh họa.',
                  trailing: RescueLabel(
                    'Dự kiến mẫu · 6–8 phút',
                    color: Color(0xFF76D6B5),
                  ),
                ),
              ],
              const SizedBox(height: 14),

              // Cảnh báo mất GPS nếu snapshot?.isStale == true
              if (snapshot?.isStale == true)
                Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.amber.shade50,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.amber.shade400),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.satellite_alt, color: Colors.amber.shade900, size: 22),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'Mất tín hiệu GPS từ thợ cứu hộ (> 30 giây). Đang kết nối lại định vị...',
                          style: TextStyle(
                            color: Colors.amber.shade900,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

              // Bản đồ / Sơ đồ
              RescuePanel(
                padding: 0,
                child: SizedBox(
                  height: 200,
                  child: Stack(
                    children: [
                      Positioned.fill(
                        child: CustomPaint(painter: RescueMapPainter()),
                      ),
                      Positioned(
                        top: 12,
                        left: 12,
                        child: RescueLabel(
                          order != null ? 'LỘ TRÌNH ĐANG THEO DÕI' : 'SƠ ĐỒ MINH HỌA',
                          color: AppColors.secondary,
                        ),
                      ),
                      const Align(
                        alignment: Alignment(-.4, .4),
                        child: CircleAvatar(
                          backgroundColor: AppColors.tertiary,
                          child: Icon(Icons.two_wheeler, color: Colors.white),
                        ),
                      ),
                      const Align(
                        alignment: Alignment(.5, -.2),
                        child: Icon(
                          Icons.person_pin_circle,
                          color: AppColors.primary,
                          size: 40,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const RescueSection('Nhân viên hỗ trợ'),
              RescuePanel(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        const CircleAvatar(
                          radius: 24,
                          backgroundColor: AppColors.primaryContainer,
                          child: Icon(
                            Icons.engineering_outlined,
                            color: AppColors.primary,
                            size: 26,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                order?.mechanicName ?? 'Phạm Tuấn Anh',
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${order?.garageName ?? "Gara Toàn Thắng"} • ${order?.mechanicPhone ?? ""}',
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: AppColors.secondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 28),
                    RescueInfo(
                      icon: Icons.location_on_outlined,
                      title: 'Điểm đón khách',
                      value: order?.pickupAddress ?? '85 Huỳnh Tấn Phát, P. Tân Thuận Đông, Quận 7',
                    ),
                    RescueInfo(
                      icon: Icons.wb_sunny_outlined,
                      title: 'Điểm trả khô ráo',
                      value: order?.dropoffAddress ?? 'Cầu Phú Mỹ (Vùng gò cao khô ráo), Quận 7',
                    ),
                    if (snapshot != null) ...[
                      RescueInfo(
                        icon: Icons.route_outlined,
                        title: 'Khoảng cách đến điểm đón',
                        value: snapshot.distanceToTargetMeters != null
                            ? '${(snapshot.distanceToTargetMeters! / 1000).toStringAsFixed(1)} km'
                            : 'Đang cập nhật...',
                      ),
                      RescueInfo(
                        icon: Icons.access_time_outlined,
                        title: 'Thời gian dự kiến',
                        value: snapshot.estimatedMinutes != null
                            ? '~ ${snapshot.estimatedMinutes} phút'
                            : 'Đang tính toán...',
                      ),
                    ],
                    const SizedBox(height: 8),
                    OutlinedButton.icon(
                      onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            order?.mechanicPhone != null
                                ? 'Gọi hotline thợ: ${order!.mechanicPhone}'
                                : 'Liên hệ nhân viên hiện là thao tác mô phỏng.',
                          ),
                        ),
                      ),
                      icon: const Icon(Icons.call_outlined, size: 18),
                      label: Text(
                        order?.mechanicPhone != null
                            ? 'Gọi thợ (${order!.mechanicPhone})'
                            : 'Liên hệ nhân viên · Mô phỏng',
                      ),
                    ),
                  ],
                ),
              ),

              // Banner thanh toán nếu PAYMENT_PENDING
              if (order != null && order.status == 'PAYMENT_PENDING') ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.green.shade50,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.green.shade300, width: 1.5),
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Icon(Icons.check_circle, color: Colors.green.shade700, size: 28),
                          const SizedBox(width: 10),
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Ca cứu hộ đã hoàn thành bàn giao!',
                                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                ),
                                SizedBox(height: 2),
                                Text(
                                  'Xe máy đã được chở qua điểm ngập an toàn. Vui lòng thanh toán cước phí niêm yết.',
                                  style: TextStyle(fontSize: 12, color: Colors.black87),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      FilledButton.icon(
                        style: FilledButton.styleFrom(
                          backgroundColor: AppColors.primaryOrange,
                          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 20),
                        ),
                        onPressed: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => VietQRPaymentScreen(
                                orderId: order.id,
                                garageId: order.garageId,
                                amount: order.totalAmount,
                                orderCode: order.orderCode,
                                rescueOrder: order,
                              ),
                            ),
                          );
                        },
                        icon: const Icon(Icons.qr_code_2),
                        label: Text(
                          'Thanh toán ngay · ${order.totalAmount.toStringAsFixed(0)} ₫',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
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

  String _getTitleByStatus(RescueOrderModel order) {
    switch (order.status) {
      case 'SEARCHING_MECHANIC':
        return 'Đang tìm thợ cứu hộ';
      case 'DISPATCHED':
        return 'Thợ đang di chuyển đến';
      case 'IN_PROGRESS':
        return 'Đang chở xe qua ngập';
      case 'PAYMENT_PENDING':
        return 'Đã bàn giao xe an toàn';
      case 'COMPLETED':
        return 'Hoàn tất ca cứu hộ';
      case 'CANCELLED':
        return 'Ca cứu hộ đã hủy';
      default:
        return 'Đang xử lý';
    }
  }

  String _getStatusBadge(RescueOrderModel order) {
    switch (order.status) {
      case 'DISPATCHED':
        return 'Đang đến điểm đón';
      case 'IN_PROGRESS':
        return 'Đang chở xe (${order.transportStage})';
      case 'PAYMENT_PENDING':
        return 'Chờ thanh toán';
      case 'COMPLETED':
        return 'Đã hoàn thành';
      case 'CANCELLED':
        return 'Đã hủy';
      default:
        return order.status;
    }
  }

  Color _getStatusBadgeColor(RescueOrderModel order) {
    switch (order.status) {
      case 'DISPATCHED':
        return const Color(0xFF76D6B5);
      case 'IN_PROGRESS':
        return Colors.orangeAccent;
      case 'PAYMENT_PENDING':
        return Colors.greenAccent;
      case 'COMPLETED':
        return Colors.blueAccent;
      default:
        return AppColors.secondary;
    }
  }
}
