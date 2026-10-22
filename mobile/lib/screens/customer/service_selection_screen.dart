import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/widgets/info_details.dart';
import '../../core/widgets/rescue_ui.dart';
import 'radar_dispatch_screen.dart';

class ServiceSelectionScreen extends StatefulWidget {
  const ServiceSelectionScreen({
    super.key,
    this.initialService = 0,
    this.vehicleName = 'Honda SH 150i',
    this.vehiclePlate = '59-B1 892.44',
  });
  final int initialService;
  final String vehicleName, vehiclePlate;

  @override
  State<ServiceSelectionScreen> createState() => _ServiceSelectionScreenState();
}

class _ServiceSelectionScreenState extends State<ServiceSelectionScreen> {
  late int _selectedService;
  @override
  void initState() {
    super.initState();
    _selectedService = widget.initialService.clamp(0, 2);
  }

  int _waterLevel = 1;
  static const _services = [
    (
      title: 'Chở xe qua ngập',
      price: '40.000 ₫ / lượt',
      note: 'Ghép chuyến',
      icon: Icons.local_shipping_outlined,
      detail: 'Xe chuyên dụng chở 4–6 xe máy và chủ xe qua điểm ngập.',
    ),
    (
      title: 'Sửa xe tại chỗ',
      price: '120.000 ₫',
      note: 'Phí kiểm tra',
      icon: Icons.build_circle_outlined,
      detail: 'Thợ kiểm tra bugi, nước vào máy và nhớt. Phụ tùng phát sinh sẽ được báo giá trước.',
    ),
    (
      title: 'Kéo xe về gara',
      price: '200.000 ₫',
      note: 'Đã gồm phí kéo',
      icon: Icons.car_repair_outlined,
      detail: 'Đưa xe ngập nặng hoặc nghi thủy kích về gara để kiểm tra và sửa chữa.',
    ),
  ];

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Chọn dịch vụ')),
    body: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const RescueIntro(
          eyebrow: 'BẮT ĐẦU YÊU CẦU',
          title: 'Chọn cách hỗ trợ',
          description:
              'Chọn dịch vụ phù hợp và kiểm tra giá trước khi tiếp tục.',
        ),
        const SizedBox(height: 12),
        const RescueDemoNote('Mô phỏng · Giá và đơn cứu hộ chưa nối API'),
        RescuePanel(
          child: Column(
            children: [
              const RescueInfo(
                icon: Icons.location_on_outlined,
                title: 'Điểm cứu hộ mẫu',
                value: '142 Nguyễn Gia Trí, Bình Thạnh, TP.HCM',
              ),
              const Divider(),
              RescueInfo(
                icon: Icons.two_wheeler,
                title: 'Phương tiện đang chọn',
                value: '${widget.vehicleName} · ${widget.vehiclePlate}',
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        Text(
          'Bạn cần hỗ trợ gì?',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 14),
        for (int i = 0; i < _services.length; i++) ...[
          _serviceCard(i),
          const SizedBox(height: 12),
        ],
        InfoDetails(
          key: ValueKey(_selectedService),
          title: 'Dịch vụ bao gồm những gì?',
          child: Text(
            _services[_selectedService].detail,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ),
        const SizedBox(height: 18),
        Text(
          'Mực nước hiện tại',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final (index, label) in [
              'Mắt cá · 20 cm',
              'Nửa bánh · 35 cm',
              'Yên xe · 50+ cm',
            ].indexed)
              ChoiceChip(
                label: Text(label),
                selected: _waterLevel == index,
                onSelected: (_) => setState(() => _waterLevel = index),
                selectedColor: AppColors.primaryContainer,
                labelStyle: TextStyle(
                  color: _waterLevel == index
                      ? AppColors.primary
                      : AppColors.secondary,
                  fontSize: 12,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
                side: BorderSide(
                  color: _waterLevel == index
                      ? AppColors.primaryOrange
                      : AppColors.outlineVariant,
                ),
              ),
          ],
        ),
        const SizedBox(height: 20),
      ],
    ),
    bottomNavigationBar: Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: AppColors.outlineVariant)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 16),
          child: FilledButton.icon(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => const RadarDispatchScreen(),
              ),
            ),
            icon: const Icon(Icons.radar_rounded, size: 21),
            label: const Text('Tìm cứu hộ'),
          ),
        ),
      ),
    ),
  );

  Widget _serviceCard(int index) {
    final service = _services[index];
    final selected = _selectedService == index;
    return Semantics(
      selected: selected,
      button: true,
      child: Card(
        color: selected ? const Color(0xFFFFF8F3) : Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(
            color: selected
                ? AppColors.primaryOrange
                : AppColors.outlineVariant,
            width: selected ? 1.5 : 1,
          ),
        ),
        child: InkWell(
          key: ValueKey('service-$index'),
          onTap: () => setState(() => _selectedService = index),
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(11),
                  decoration: BoxDecoration(
                    color: selected
                        ? AppColors.primaryContainer
                        : AppColors.surfaceContainerLow,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    service.icon,
                    color: selected
                        ? AppColors.primaryOrange
                        : AppColors.secondary,
                    size: 25,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        service.title,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        service.price,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primary,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        service.note,
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.secondary,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Icon(
                  selected ? Icons.check_circle_rounded : Icons.circle_outlined,
                  color: selected
                      ? AppColors.primaryOrange
                      : AppColors.outlineVariant,
                  size: 22,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
