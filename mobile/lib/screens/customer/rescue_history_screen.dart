import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/models/rescue_order_model.dart';
import '../../core/services/rescue_service.dart';
import '../../core/widgets/rescue_ui.dart';
import 'customer_disputes_screen.dart';
import 'electronic_invoice_screen.dart';
import 'live_tracking_screen.dart';
import 'radar_dispatch_screen.dart';
import 'rating_review_screen.dart';
import 'vietqr_payment_screen.dart';

class RescueHistoryScreen extends StatefulWidget {
  const RescueHistoryScreen({super.key});

  @override
  State<RescueHistoryScreen> createState() => _RescueHistoryScreenState();
}

class _RescueHistoryScreenState extends State<RescueHistoryScreen> {
  final RescueService _rescueService = RescueService();
  List<RescueOrderModel>? _realOrders;
  int _filter = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadHistory());
  }

  Future<void> _loadHistory() async {
    try {
      final list = await _rescueService.getOrderHistory();
      if (mounted) {
        setState(() {
          _realOrders = list;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _realOrders = [];
        });
      }
    }
  }

  List<RescueOrderModel> get _filteredOrders {
    if (_realOrders == null) return [];
    if (_filter == 1) {
      return _realOrders!.where((o) => o.isActive).toList();
    } else if (_filter == 2) {
      return _realOrders!.where((o) => o.status == 'COMPLETED').toList();
    } else if (_filter == 3) {
      return _realOrders!.where((o) => o.status == 'CANCELLED').toList();
    }
    return _realOrders!;
  }

  void _openScreen(Widget screen) {
    Navigator.of(context)
        .push(MaterialPageRoute<void>(builder: (_) => screen))
        .then((_) => _loadHistory());
  }

  void _navigateToOrder(RescueOrderModel order) {
    if (order.isRequested) {
      _openScreen(RadarDispatchScreen(orderId: order.id));
    } else if (order.status == 'PAYMENT_PENDING') {
      _openScreen(VietQRPaymentScreen(
        orderId: order.id,
        garageId: order.garageId,
        amount: order.totalAmount,
        orderCode: order.orderCode,
        rescueOrder: order,
      ));
    } else if (['DISPATCHED', 'ARRIVED', 'IN_PROGRESS'].contains(order.status)) {
      _openScreen(LiveTrackingScreen(orderId: order.id));
    } else {
      _showRealOrderDetail(order);
    }
  }

  void _showRealOrderDetail(RescueOrderModel o) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (_) => SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Chi tiết đơn #${o.orderCode}',
                style: Theme.of(context)
                    .textTheme
                    .titleLarge
                    ?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              RescueLabel(o.statusDescription, color: AppColors.primary),
              const Divider(height: 24),
              RescueInfo(
                icon: Icons.local_shipping_outlined,
                title: 'Dịch vụ',
                value: o.serviceName,
              ),
              RescueInfo(
                icon: Icons.two_wheeler_outlined,
                title: 'Xe cứu hộ',
                value: '${o.vehiclePlate} (${o.vehicleModel ?? "Xe máy"})',
              ),
              RescueInfo(
                icon: Icons.location_on_outlined,
                title: 'Điểm đón',
                value: o.pickupAddress,
              ),
              RescueInfo(
                icon: Icons.wb_sunny_outlined,
                title: 'Điểm trả',
                value: o.dropoffAddress,
              ),
              RescueInfo(
                icon: Icons.storefront_outlined,
                title: 'Gara hỗ trợ',
                value: o.garageName,
              ),
              RescueInfo(
                icon: Icons.engineering_outlined,
                title: 'Thợ cứu hộ',
                value: o.mechanicName ?? 'Chưa phân thợ',
              ),
              RescueInfo(
                icon: Icons.payments_outlined,
                title: 'Tổng chi phí',
                value: '${o.totalAmount.toStringAsFixed(0)} ₫',
              ),
              if (o.status == 'COMPLETED') ...[
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  onPressed: () {
                    Navigator.of(context).pop();
                    _openScreen(
                      RatingReviewScreen(
                        rescueOrderId: o.id,
                        rescueCode: o.orderCode,
                        garageName: o.garageName,
                        mechanicName: o.mechanicName,
                      ),
                    );
                  },
                  icon: const Icon(Icons.star, color: Colors.amber),
                  label: const Text('Đánh giá dịch vụ & Thợ cứu hộ'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primaryOrange,
                    foregroundColor: Colors.white,
                  ),
                ),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: () {
                    Navigator.of(context).pop();
                    _openScreen(ElectronicInvoiceScreen(order: o));
                  },
                  icon: const Icon(Icons.receipt_long_outlined),
                  label: const Text('Xem biên nhận & Gửi khiếu nại / Hoàn tiền'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredOrders;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Lịch sử cứu hộ',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
        ),
        actions: [
          IconButton(
            tooltip: 'Khiếu nại & Hoàn tiền',
            icon: const Icon(Icons.shield_outlined),
            onPressed: () => _openScreen(const CustomerDisputesScreen()),
          ),
        ],
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 760),
          child: RefreshIndicator(
            onRefresh: _loadHistory,
            color: AppColors.primaryOrange,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                const RescueIntro(
                  eyebrow: 'NHẬT KÝ HÀNH TRÌNH',
                  title: 'Mọi lần hỗ trợ,\ntrong một nơi',
                  description:
                      'Xem lại dịch vụ, chi phí và đội cứu hộ đã hỗ trợ bạn.',
                ),
                const SizedBox(height: 12),
                Card(
                  color: Colors.amber.shade50,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(color: Colors.amber.shade200),
                  ),
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: Colors.amber.shade100,
                      child: Icon(Icons.gavel_outlined, color: Colors.amber.shade900, size: 20),
                    ),
                    title: const Text(
                      'Theo dõi Khiếu nại & Bồi hoàn',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                    subtitle: const Text(
                      'Xem biên bản Staff thẩm định & hoàn tiền từ Admin',
                      style: TextStyle(fontSize: 11),
                    ),
                    trailing: const Icon(Icons.chevron_right, size: 20),
                    onTap: () => _openScreen(const CustomerDisputesScreen()),
                  ),
                ),
                const SizedBox(height: 14),
                RescueSection(
                  'Các lần cứu hộ',
                  action: _realOrders != null
                      ? IconButton(
                          icon: const Icon(
                            Icons.refresh,
                            size: 20,
                            color: AppColors.secondary,
                          ),
                          tooltip: 'Làm mới',
                          onPressed: _loadHistory,
                        )
                      : null,
                ),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final item in [
                      'Tất cả',
                      'Đang xử lý',
                      'Hoàn tất',
                      'Đã hủy',
                    ].indexed)
                      ChoiceChip(
                        label: Text(item.$2),
                        selected: _filter == item.$1,
                        onSelected: (_) => setState(() => _filter = item.$1),
                        selectedColor: AppColors.primaryContainer,
                        labelStyle: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: _filter == item.$1
                              ? AppColors.primary
                              : AppColors.secondary,
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 14),
                if (filtered.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 48),
                    child: Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.history_toggle_off_outlined,
                            size: 56,
                            color: Colors.grey.shade400,
                          ),
                          const SizedBox(height: 14),
                          Text(
                            _realOrders == null || _realOrders!.isEmpty
                                ? 'Chưa có lịch sử cứu hộ'
                                : 'Không có đơn cứu hộ phù hợp',
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: AppColors.onSurface,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            _realOrders == null || _realOrders!.isEmpty
                                ? 'Các chuyến cứu hộ đã yêu cầu sẽ hiển thị tại đây.'
                                : 'Vui lòng chọn tab khác để xem các đơn cứu hộ.',
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.secondary,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  ...filtered.map((o) => _buildRealOrderCard(o)),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildRealOrderCard(RescueOrderModel o) {
    final isActive = o.isActive;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: RescuePanel(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    '#${o.orderCode}',
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppColors.secondary,
                    ),
                  ),
                ),
                RescueLabel(
                  o.statusDescription,
                  color: isActive
                      ? AppColors.primaryOrange
                      : (o.status == 'COMPLETED' ? Colors.green : Colors.grey),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.primaryContainer,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.local_shipping_outlined,
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
                        o.serviceName,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Điểm đón: ${o.pickupAddress}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.secondary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (o.garageName.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(
                          'Gara: ${o.garageName}',
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.secondary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
            const Divider(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${o.totalAmount.toStringAsFixed(0)} ₫',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: AppColors.primary,
                  ),
                ),
                FilledButton.tonal(
                  onPressed: () => _navigateToOrder(o),
                  child: Text(isActive ? 'Tiếp tục đơn' : 'Xem chi tiết'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
