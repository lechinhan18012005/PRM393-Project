import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import 'mechanic_ui.dart';
import 'repair_execution_screen.dart';

class QuotationBuilderScreen extends StatefulWidget {
  const QuotationBuilderScreen({super.key});
  @override
  State<QuotationBuilderScreen> createState() => _QuotationBuilderScreenState();
}

class _QuotationBuilderScreenState extends State<QuotationBuilderScreen> {
  int _version = 1;
  final _selected = <int>{0, 1, 2, 3};
  static const _names = [
    'Phí điều phối & tiếp cận ngập',
    'Sấy bugi & xả nước buồng đốt',
    'Thay nhớt Castrol Scooter',
    'Súc rửa lọc gió & xịt khô IC',
    'Kéo xe về gara xử lý',
  ];
  static const _prices = [50000, 70000, 130000, 40000, 150000];
  String _money(int value) =>
      '${value.toString().replaceAllMapped(RegExp(r"(\d)(?=(\d{3})+(?!\d))"), (m) => '${m[1]}.')} đ';
  @override
  Widget build(BuildContext context) {
    final total = _selected.fold<int>(0, (sum, i) => sum + _prices[i]);
    return MechanicPage(
      title: 'Lập báo giá',
      bottom: FilledButton.icon(
        onPressed: _selected.isEmpty
            ? null
            : () => Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => const RepairExecutionScreen(),
                ),
              ),
        icon: const Icon(Icons.build_outlined, size: 18),
        label: const Text('Tiếp tục sửa chữa mô phỏng'),
      ),
      children: [
        const MechanicPanel(
          child: MechanicInfo(
            icon: Icons.receipt_long_outlined,
            title: 'Yêu cầu mẫu #SOS-8924',
            value: 'Hoàng Văn Khách · Honda SH',
          ),
        ),
        const SizedBox(height: 16),
        SegmentedButton<int>(
          segments: const [
            ButtonSegment(value: 0, label: Text('V1 · Ước tính')),
            ButtonSegment(value: 1, label: Text('V2 · Tại chỗ')),
          ],
          selected: {_version},
          onSelectionChanged: (v) => setState(() => _version = v.first),
        ),
        const MechanicSection('Chọn hạng mục dịch vụ'),
        MechanicPanel(
          padding: 0,
          child: Column(
            children: List.generate(
              _names.length,
              (i) => CheckboxListTile(
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 5,
                ),
                controlAffinity: ListTileControlAffinity.leading,
                value: _selected.contains(i),
                onChanged: (v) => setState(() {
                  v == true ? _selected.add(i) : _selected.remove(i);
                }),
                title: Text(
                  _names[i],
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                subtitle: Text(
                  _money(_prices[i]),
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.primary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 16),
        MechanicPanel(
          dark: true,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'TỔNG BÁO GIÁ MẪU',
                style: TextStyle(
                  fontSize: 10,
                  color: Color(0xFFB9CEDB),
                  letterSpacing: 1.2,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                _money(total),
                key: const Key('quotation-total'),
                style: const TextStyle(
                  fontSize: 31,
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                '${_selected.length} hạng mục · Phiên bản V${_version + 1}',
                style: const TextStyle(fontSize: 12, color: Color(0xFFB9CEDB)),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        const Text(
          'Giá và danh mục trên là dữ liệu minh họa; báo giá chưa được gửi cho khách.',
          style: TextStyle(
            fontSize: 12,
            color: AppColors.secondary,
            height: 1.6,
          ),
        ),
      ],
    );
  }
}
