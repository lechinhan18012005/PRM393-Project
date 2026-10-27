import 'dart:async';
import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/models/rescue_order_model.dart';
import '../../core/services/rescue_service.dart';
import 'live_tracking_screen.dart';

class RadarDispatchScreen extends StatefulWidget {
  final int? orderId;

  const RadarDispatchScreen({super.key, this.orderId});

  @override
  State<RadarDispatchScreen> createState() => _RadarDispatchScreenState();
}

class _RadarDispatchScreenState extends State<RadarDispatchScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  final RescueService _rescueService = RescueService();

  Timer? _pollTimer;
  RescueOrderModel? _order;
  bool _isCancelling = false;
  bool _noMechanicFound = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();

    if (widget.orderId != null) {
      _pollOrderStatus();
      _pollTimer = Timer.periodic(const Duration(seconds: 3), (_) {
        _pollOrderStatus();
      });
    }
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  Future<void> _pollOrderStatus() async {
    if (widget.orderId == null || _isCancelling) return;
    try {
      final order = await _rescueService.getOrderById(widget.orderId!);
      if (!mounted) return;

      setState(() {
        _order = order;
        _errorMessage = null;
      });

      if (order.status == 'DISPATCHED' || order.status == 'IN_PROGRESS') {
        _pollTimer?.cancel();
      } else if (order.status == 'DISPATCH_FAILED') {
        _pollTimer?.cancel();
        setState(() => _noMechanicFound = true);
      } else if (order.status == 'CANCELLED') {
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

  Future<void> _cancelSearch() async {
    if (widget.orderId == null) {
      Navigator.of(context).pop();
      return;
    }

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Hủy tìm cứu hộ?'),
        content: const Text(
          'Chưa có thợ nhận đơn nên bạn được hủy hoàn toàn MIỄN PHÍ và không phát sinh bất kỳ khoản phí nào.\n\nBạn có muốn hủy yêu cầu cứu hộ này?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Tiếp tục tìm'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Hủy yêu cầu'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isCancelling = true);
    _pollTimer?.cancel();

    try {
      await _rescueService.cancelOrder(
        widget.orderId!,
        reason: 'Khách hàng hủy tìm kiếm',
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Đã hủy yêu cầu tìm kiếm thành công (Không mất phí).'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isCancelling = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lỗi hủy đơn: ${e.toString().replaceFirst("Exception: ", "")}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final order = _order;
    final isDispatched = order?.status == 'DISPATCHED' || order?.status == 'IN_PROGRESS';

    return Scaffold(
      backgroundColor: const Color(0xFF112C42), // Dark radar theme
      appBar: AppBar(
        title: Text(
          order != null ? 'Đơn #${order.orderCode}' : 'Tìm cứu hộ',
          style: const TextStyle(color: Colors.white, fontSize: 16),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: Colors.white,
        actions: [
          if (!isDispatched)
            TextButton.icon(
              onPressed: _isCancelling ? null : _cancelSearch,
              icon: const Icon(Icons.close, color: Colors.white70, size: 18),
              label: const Text(
                'Hủy tìm',
                style: TextStyle(color: Colors.white70, fontWeight: FontWeight.bold),
              ),
            ),
        ],
      ),
      body: Column(
        children: [
          const SizedBox(height: 10),
          Text(
            isDispatched
                ? 'ĐÃ KẾT NỐI ĐỘI CỨU HỘ THÀNH CÔNG'
                : _noMechanicFound
                    ? 'CHƯA TÌM THẤY THỢ PHÙ HỢP'
                    : 'ĐANG ĐIỀU PHỐI TUẦN TỰ THEO KHOẢNG CÁCH (3-5KM)',
            style: TextStyle(
              color: isDispatched
                  ? Colors.greenAccent
                  : _noMechanicFound
                      ? Colors.orangeAccent
                      : AppColors.primaryContainer,
              fontSize: 11,
              fontWeight: FontWeight.bold,
              letterSpacing: 1,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            isDispatched
                ? 'Thợ cứu hộ đang chuẩn bị di chuyển đến vị trí xe của bạn.'
                : _noMechanicFound
                    ? 'Hiện các thợ có xe chở chuyên dụng của gara đang bận.'
                    : 'Hệ thống gửi offer 45 giây lần lượt đến từng thợ đủ điều kiện...',
            style: const TextStyle(color: Colors.white70, fontSize: 13),
            textAlign: TextAlign.center,
          ),
          const Spacer(),

          // Radar Graphic
          Center(
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Outer ring
                Container(
                  width: 240,
                  height: 240,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: (isDispatched ? Colors.green : AppColors.primaryOrange).withValues(alpha: 0.2),
                      width: 1.5,
                    ),
                  ),
                ),
                // Middle ring
                Container(
                  width: 170,
                  height: 170,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: (isDispatched ? Colors.green : AppColors.primaryOrange).withValues(alpha: 0.35),
                      width: 1.5,
                    ),
                  ),
                ),
                // Inner ring
                Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: (isDispatched ? Colors.green : AppColors.primaryOrange).withValues(alpha: 0.6),
                      width: 1.5,
                    ),
                  ),
                ),
                // Center pulse bike icon
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: isDispatched ? Colors.green : AppColors.primaryOrange,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: isDispatched ? Colors.greenAccent : AppColors.primaryOrange,
                        blurRadius: 16,
                      ),
                    ],
                  ),
                  child: Icon(
                    isDispatched ? Icons.check : Icons.two_wheeler,
                    color: Colors.white,
                    size: 28,
                  ),
                ),
                if (!isDispatched && !_noMechanicFound) ...[
                  const Positioned(
                    top: 35,
                    right: 55,
                    child: CircleAvatar(
                      radius: 6,
                      backgroundColor: Colors.greenAccent,
                    ),
                  ),
                  const Positioned(
                    bottom: 45,
                    left: 45,
                    child: CircleAvatar(
                      radius: 6,
                      backgroundColor: Colors.greenAccent,
                    ),
                  ),
                ],
              ],
            ),
          ),
          const Spacer(),

          if (_errorMessage != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Text(
                _errorMessage!,
                style: const TextStyle(color: Colors.redAccent, fontSize: 12),
                textAlign: TextAlign.center,
              ),
            ),

          // Bottom Sheet / Card
          if (_noMechanicFound)
            _buildNoMechanicCard(context)
          else if (isDispatched)
            _buildMatchedMechanicCard(context, order!)
          else
            _buildSearchingCard(context, order),
        ],
      ),
    );
  }

  Widget _buildSearchingCard(BuildContext context, RescueOrderModel? order) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(
            color: Colors.black26,
            blurRadius: 10,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(strokeWidth: 2.5),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      order != null ? 'Đang tìm thợ cho đơn #${order.orderCode}' : 'Đang tìm thợ gần bạn...',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      order?.pickupAddress ?? 'Điểm đón đã xác nhận',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12, color: AppColors.secondary),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          OutlinedButton.icon(
            onPressed: _isCancelling ? null : _cancelSearch,
            icon: const Icon(Icons.cancel_outlined, size: 18, color: Colors.red),
            label: Text(
              _isCancelling ? 'Đang hủy...' : 'Hủy tìm cứu hộ (Miễn phí 100%)',
              style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold),
            ),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: Colors.redAccent),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMatchedMechanicCard(BuildContext context, RescueOrderModel order) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(
            color: Colors.black26,
            blurRadius: 10,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              const CircleAvatar(
                radius: 26,
                backgroundColor: AppColors.surfaceContainerHigh,
                child: Icon(
                  Icons.engineering,
                  color: AppColors.primaryOrange,
                  size: 30,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        Text(
                          order.mechanicName ?? 'Thợ cứu hộ',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                        const SizedBox(width: 6),
                        const Icon(
                          Icons.verified,
                          color: Colors.blue,
                          size: 16,
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${order.garageName} • ${order.mechanicPhone ?? ""}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.secondary,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 8,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: Colors.green.shade50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'Đã nhận đơn\nĐang tới',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.green.shade800,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: () {
              Navigator.of(context).pushReplacement(
                MaterialPageRoute(
                  builder: (_) => LiveTrackingScreen(orderId: order.id),
                ),
              );
            },
            icon: const Icon(Icons.navigation, size: 18),
            label: const Text(
              'Xem Lộ Trình Thợ Di Chuyển',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primaryOrange,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNoMechanicCard(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(
            color: Colors.black26,
            blurRadius: 10,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Icon(Icons.error_outline, color: Colors.orange.shade700, size: 28),
              const SizedBox(width: 10),
              const Expanded(
                child: Text(
                  'Không có thợ nhận đơn trong khu vực',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Text(
            'Tất cả thợ cứu hộ có xe chuyên chở trong gara đã được gửi yêu cầu nhưng hiện tại đều bận hoặc không phản hồi kịp thời.',
            style: TextStyle(fontSize: 12, color: AppColors.secondary),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Về trang chủ'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: FilledButton(
                  style: FilledButton.styleFrom(backgroundColor: AppColors.primaryOrange),
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Chọn gara khác'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
