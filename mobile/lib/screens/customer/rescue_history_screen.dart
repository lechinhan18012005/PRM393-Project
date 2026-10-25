import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/models/rescue_order_model.dart';
import '../../core/services/rescue_service.dart';
import '../../core/widgets/rescue_ui.dart';
import 'radar_dispatch_screen.dart';
import 'live_tracking_screen.dart';
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
    } catch (_) {}
  }

  void _openScreen(Widget screen) {
    Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => screen)).then((_) => _loadHistory());
  }

  void _navigateToOrder(RescueOrderModel order) {
    if (order.isRequested) {
      _openScreen(RadarDispatchScreen(orderId: order.id));
    } else if (order.status == 'PAYMENT_PENDING') {
      _openScreen(VietQRPaymentScreen(
        orderId: order.id,
        amount: order.totalAmount,
        orderCode: order.orderCode,
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
                style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
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
            ],
          ),
        ),
      ),
    );
  }

  static const _orders = [
    (
      id: '#PRM-8924',
      date: '11/10/2026 · 17:35',
      title: 'Sửa xe ngập nước tại chỗ',
      price: '290.000 đ',
      garage: 'Gara Toàn Thắng · Chi nhánh Q.7',
      mechanic: 'Phạm Tuấn Anh',
      repair: true,
      icon: Icons.build_outlined,
    ),
    (
      id: '#PRM-8201',
      date: '04/10/2026 · 08:20',
      title: 'Chở xe qua vùng ngập',
      price: '40.000 đ',
      garage: 'Đội Gom Xe Triều Cường Q.8',
      mechanic: 'Nguyễn Văn Hải',
      repair: false,
      icon: Icons.local_shipping_outlined,
    ),
    (
      id: '#PRM-7819',
      date: '20/09/2026 · 19:45',
      title: 'Kéo xe về gara',
      price: '450.000 đ',
      garage: 'Gara Toàn Thắng · Bình Thạnh',
      mechanic: 'Lê Văn Trọng',
      repair: false,
      icon: Icons.car_repair_outlined,
    ),
  ];
  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppColors.background,
    appBar: AppBar(
      title: const Text(
        'Lịch sử cứu hộ',
        style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
      ),
    ),
    body: Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 760),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const RescueIntro(
              eyebrow: 'NHẬT KÝ HÀNH TRÌNH',
              title: 'Mọi lần hỗ trợ,\ntrong một nơi',
              description:
                  'Xem lại dịch vụ, chi phí và đội cứu hộ đã hỗ trợ bạn.',
            ),
            const RescueSection('Các lần cứu hộ'),
            if (_realOrders != null && _realOrders!.isNotEmpty) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  RescueLabel(
                    'Lịch sử thực tế (${_realOrders!.length} đơn)',
                    color: AppColors.primary,
                  ),
                  IconButton(
                    icon: const Icon(Icons.refresh, size: 20, color: AppColors.secondary),
                    onPressed: _loadHistory,
                  ),
                ],
              ),
              const SizedBox(height: 12),
              ..._realOrders!.map((o) => _buildRealOrderCard(o)),
            ] else ...[
              const RescueDemoNote('Lịch sử minh họa · Chưa tải đơn thực tế'),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final item in [
                    'Tất cả',
                    'Sửa tại chỗ',
                    'Vận chuyển',
                  ].indexed)
                    ChoiceChip(
                      label: Text(item.$2),
                      selected: _filter == item.$1,
                      onSelected: (_) => setState(() => _filter = item.$1),
                      selectedColor: AppColors.primaryContainer,
                      labelStyle: TextStyle(
                        fontSize: 12,
                        color: _filter == item.$1
                            ? AppColors.primary
                            : AppColors.secondary,
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 14),
              ..._orders
                  .where(
                    (o) => _filter == 0 || (_filter == 1 ? o.repair : !o.repair),
                  )
                  .map(
                    (o) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: RescuePanel(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  o.id,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.secondary,
                                  ),
                                ),
                              ),
                              const RescueLabel('Hoàn tất · Mẫu'),
                            ],
                          ),
                          const SizedBox(height: 14),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: AppColors.primaryContainer,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Icon(
                                  o.icon,
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
                                      o.title,
                                      style: const TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                    const SizedBox(height: 5),
                                    Text(
                                      o.date,
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
                          Text(
                            o.garage,
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.secondary,
                            ),
                          ),
                          const SizedBox(height: 10),
                          Wrap(
                            alignment: WrapAlignment.spaceBetween,
                            spacing: 12,
                            runSpacing: 8,
                            children: [
                              Text(
                                o.price,
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w800,
                                  color: AppColors.primary,
                                ),
                              ),
                              TextButton(
                                onPressed: () => showModalBottomSheet<void>(
                                  context: context,
                                  builder: (_) => SafeArea(
                                    child: SingleChildScrollView(
                                      padding: const EdgeInsets.all(20),
                                      child: Column(
                                        mainAxisSize: MainAxisSize.min,
                                        crossAxisAlignment:
                                            CrossAxisAlignment.stretch,
                                        children: [
                                          const RescueDemoNote(
                                            'Chi tiết đơn minh họa',
                                          ),
                                          Text(
                                            o.id,
                                            style: Theme.of(context)
                                                .textTheme
                                                .titleLarge,
                                          ),
                                          RescueInfo(
                                            icon: o.icon,
                                            title: 'Dịch vụ',
                                            value: o.title,
                                          ),
                                          RescueInfo(
                                            icon: Icons.storefront_outlined,
                                            title: 'Đơn vị hỗ trợ',
                                            value: o.garage,
                                          ),
                                          RescueInfo(
                                            icon: Icons.engineering_outlined,
                                            title: 'Nhân viên cứu hộ',
                                            value: o.mechanic,
                                          ),
                                          RescueInfo(
                                            icon: Icons.payments_outlined,
                                            title: 'Chi phí mẫu',
                                            value: o.price,
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                                child: const Text('Xem chi tiết'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          ],
        ),
      ),
    ),
  );

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
                  color: isActive ? AppColors.primaryOrange : (o.status == 'COMPLETED' ? Colors.green : Colors.grey),
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
