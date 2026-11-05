import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/models/rescue_order_model.dart';
import '../../core/services/rescue_service.dart';
import 'mechanic_ui.dart';

class MechanicOrderHistoryScreen extends StatefulWidget {
  const MechanicOrderHistoryScreen({super.key});

  @override
  State<MechanicOrderHistoryScreen> createState() =>
      _MechanicOrderHistoryScreenState();
}

class _MechanicOrderHistoryScreenState
    extends State<MechanicOrderHistoryScreen> {
  final RescueService _rescueService = RescueService();
  List<RescueOrderModel> _orders = const [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (mounted) setState(() => _loading = true);
    try {
      final orders = await _rescueService.getOrderHistory();
      if (!mounted) return;
      setState(() {
        _orders = orders;
        _error = null;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _formatPrice(num amount) {
    final digits = amount.round().toString();
    return '${digits.replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (_) => '.')} ₫';
  }

  String _formatDate(String? raw) {
    final value = DateTime.tryParse(raw ?? '')?.toLocal();
    if (value == null) return 'Chưa có thời gian';
    String two(int number) => number.toString().padLeft(2, '0');
    return '${two(value.hour)}:${two(value.minute)} · '
        '${two(value.day)}/${two(value.month)}/${value.year}';
  }

  Color _statusColor(RescueOrderModel order) {
    if (order.isCompleted) return Colors.green;
    if (order.isCancelled) return Colors.red;
    if (order.isPaymentPending) return Colors.purple;
    return AppColors.primaryOrange;
  }

  void _showDetail(RescueOrderModel order) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) => SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Đơn #${order.orderCode}',
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                order.statusDescription,
                style: TextStyle(
                  color: _statusColor(order),
                  fontWeight: FontWeight.w700,
                ),
              ),
              const Divider(height: 28),
              MechanicInfo(
                icon: Icons.person_outline,
                title: 'Khách hàng',
                value: order.customerName,
              ),
              MechanicInfo(
                icon: Icons.two_wheeler_outlined,
                title: 'Phương tiện',
                value:
                    '${order.vehiclePlate} · ${order.vehicleModel ?? "Xe máy"}',
              ),
              MechanicInfo(
                icon: Icons.build_outlined,
                title: 'Dịch vụ',
                value: order.orderType == 'BATCH_CROSSING'
                    ? 'Chuyến gom ${order.groupVehicleCount ?? 2} xe'
                    : order.serviceName,
              ),
              MechanicInfo(
                icon: Icons.location_on_outlined,
                title: 'Điểm đón',
                value: order.pickupAddress,
              ),
              MechanicInfo(
                icon: Icons.payments_outlined,
                title: 'Tổng tiền đơn',
                value: _formatPrice(order.totalAmount),
              ),
              MechanicInfo(
                icon: Icons.schedule_outlined,
                title: 'Thời gian tạo',
                value: _formatDate(order.requestedAt),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Lịch sử đơn cứu hộ')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? ListView(
                children: const [
                  SizedBox(height: 220),
                  Center(child: CircularProgressIndicator()),
                ],
              )
            : _error != null
            ? ListView(
                padding: const EdgeInsets.all(24),
                children: [
                  const Icon(Icons.error_outline, size: 48, color: Colors.red),
                  const SizedBox(height: 12),
                  Text(_error!, textAlign: TextAlign.center),
                  const SizedBox(height: 12),
                  FilledButton(onPressed: _load, child: const Text('Thử lại')),
                ],
              )
            : _orders.isEmpty
            ? ListView(
                padding: const EdgeInsets.all(24),
                children: const [
                  SizedBox(height: 120),
                  Icon(Icons.history, size: 54, color: AppColors.secondary),
                  SizedBox(height: 12),
                  Text(
                    'Bạn chưa có đơn cứu hộ nào trong lịch sử.',
                    textAlign: TextAlign.center,
                  ),
                ],
              )
            : ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: _orders.length,
                separatorBuilder: (_, _) => const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  final order = _orders[index];
                  return MechanicPanel(
                    padding: 0,
                    child: ListTile(
                      key: ValueKey('mechanic-history-order-${order.id}'),
                      onTap: () => _showDetail(order),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 8,
                      ),
                      leading: CircleAvatar(
                        backgroundColor: _statusColor(order)
                            .withValues(alpha: .12),
                        child: Icon(
                          order.orderType == 'ONSITE_REPAIR'
                              ? Icons.build_outlined
                              : Icons.local_shipping_outlined,
                          color: _statusColor(order),
                        ),
                      ),
                      title: Text(
                        '#${order.orderCode} · ${order.customerName}',
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                      subtitle: Text(
                        '${order.statusDescription}\n${_formatDate(order.requestedAt)}',
                      ),
                      isThreeLine: true,
                      trailing: Text(
                        _formatPrice(order.totalAmount),
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          color: AppColors.primaryOrange,
                        ),
                      ),
                    ),
                  );
                },
              ),
      ),
    );
  }
}
