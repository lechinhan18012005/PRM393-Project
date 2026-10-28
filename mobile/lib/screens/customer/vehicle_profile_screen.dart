import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/widgets/rescue_ui.dart';
import 'customer_demo_data.dart';

class VehicleProfileScreen extends StatefulWidget {
  const VehicleProfileScreen({
    super.key,
    this.selectedVehicle = 0,
    this.onSelectVehicle,
  });
  final int selectedVehicle;
  final ValueChanged<int>? onSelectVehicle;
  @override
  State<VehicleProfileScreen> createState() => _VehicleProfileScreenState();
}

class _VehicleProfileScreenState extends State<VehicleProfileScreen> {
  late int _selected;
  @override
  void initState() {
    super.initState();
    _selected = widget.selectedVehicle;
  }

  @override
  void didUpdateWidget(covariant VehicleProfileScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.selectedVehicle != widget.selectedVehicle) {
      _selected = widget.selectedVehicle;
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppColors.background,
    appBar: AppBar(
      title: const Text(
        'Xe của tôi',
        style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
      ),
    ),
    body: Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 760),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            RescueIntro(
              eyebrow: 'PHƯƠNG TIỆN CỦA BẠN',
              title: 'Sẵn sàng cho hành trình',
              description:
                  'Chọn phương tiện để điền nhanh thông tin khi cần hỗ trợ.',
              trailing: RescueLabel(
                '${customerDemoVehicles.length} xe minh họa',
                color: const Color(0xFFB9CEDB),
              ),
            ),
            const RescueSection('Danh sách xe'),
            const RescueDemoNote('Dữ liệu mẫu · Chưa lưu xe lên hệ thống'),
            ...customerDemoVehicles.indexed.map((entry) {
              final v = entry.$2;
              final selected = entry.$1 == _selected;
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: RescuePanel(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: selected
                                  ? AppColors.primaryContainer
                                  : AppColors.surfaceContainerLow,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Icon(
                              Icons.two_wheeler,
                              color: selected
                                  ? AppColors.primary
                                  : AppColors.secondary,
                              size: 25,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  v.name,
                                  style: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                const SizedBox(height: 5),
                                Text(
                                  v.type,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: AppColors.secondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          RescueLabel(v.plate, color: AppColors.secondary),
                          if (selected) const RescueLabel('Đang chọn'),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Text(
                        v.clearance,
                        style: const TextStyle(
                          fontSize: 11,
                          color: AppColors.secondary,
                        ),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          key: ValueKey('select-vehicle-${entry.$1}'),
                          onPressed: selected
                              ? null
                              : () {
                                  setState(() => _selected = entry.$1);
                                  widget.onSelectVehicle?.call(entry.$1);
                                },
                          icon: Icon(
                            selected
                                ? Icons.check_circle_outline
                                : Icons.touch_app_outlined,
                            size: 17,
                          ),
                          label: Text(
                            selected ? 'Xe đang chọn' : 'Dùng xe này',
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
            const SizedBox(height: 4),
            const RescuePanel(
              child: RescueInfo(
                icon: Icons.info_outline,
                title: 'Quản lý phương tiện',
                value: 'Lựa chọn chỉ áp dụng trong phiên hiện tại. Chức năng thêm, sửa và đồng bộ xe đang được phát triển.',
              ),
            ),
          ],
        ),
      ),
    ),
  );
}
