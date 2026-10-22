import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/widgets/rescue_ui.dart';

class RescueHistoryScreen extends StatefulWidget {
  const RescueHistoryScreen({super.key});
  @override
  State<RescueHistoryScreen> createState() => _RescueHistoryScreenState();
}

class _RescueHistoryScreenState extends State<RescueHistoryScreen> {
  int _filter = 0;
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
        ),
      ),
    ),
  );
}
