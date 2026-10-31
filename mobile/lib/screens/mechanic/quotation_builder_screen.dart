import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../features/quotation/quotation_api.dart';
import '../../features/quotation/quotation_models.dart';
import 'mechanic_ui.dart';
import 'repair_execution_screen.dart';

class QuotationBuilderScreen extends StatefulWidget {
  const QuotationBuilderScreen({super.key, this.orderId, this.orderType});

  final int? orderId;
  final String? orderType;

  @override
  State<QuotationBuilderScreen> createState() => _QuotationBuilderScreenState();
}

class _QuotationBuilderScreenState extends State<QuotationBuilderScreen> {
  final _api = QuotationApi();
  final _diagnosis = TextEditingController();
  final _discount = TextEditingController(text: '0');
  final Set<int> _selected = {};
  List<QuotationCatalogItem> _catalog = const [];
  bool _loading = true;
  bool _submitting = false;
  String? _error;

  int _demoVersion = 1;
  final _demoSelected = <int>{0, 1, 2, 3};
  static const _demoNames = [
    'Phí điều phối & tiếp cận ngập',
    'Sấy bugi & xả nước buồng đốt',
    'Thay nhớt Castrol Scooter',
    'Súc rửa lọc gió & xịt khô IC',
    'Kéo xe về gara xử lý',
  ];
  static const _demoPrices = [50000, 70000, 130000, 40000, 150000];

  @override
  void initState() {
    super.initState();
    if (widget.orderId != null) _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final catalog = await _api.catalog(widget.orderId!);
      if (!mounted) return;
      setState(() {
        _catalog = catalog;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  double get _subtotal => _catalog
      .where((item) => _selected.contains(item.serviceId))
      .fold(0, (sum, item) => sum + item.price);

  void _toggleService(QuotationCatalogItem item, bool selected) {
    setState(() {
      if (!selected) {
        _selected.remove(item.serviceId);
        return;
      }

      final isTowing = item.type == 'TOWING';
      _selected.removeWhere((serviceId) {
        final selectedItem = _catalog.firstWhere(
          (catalogItem) => catalogItem.serviceId == serviceId,
        );
        return (selectedItem.type == 'TOWING') != isTowing;
      });
      _selected.add(item.serviceId);
    });
  }

  Future<void> _submit() async {
    if (_diagnosis.text.trim().isEmpty || _selected.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Nhập chẩn đoán và chọn ít nhất một dịch vụ'),
        ),
      );
      return;
    }
    setState(() => _submitting = true);
    try {
      final quotation = await _api.create(
        orderId: widget.orderId!,
        diagnosis: _diagnosis.text.trim(),
        discount: double.tryParse(_discount.text) ?? 0,
        serviceIds: _selected.toList(),
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Đã gửi báo giá V${quotation.version} cho khách hàng'),
        ),
      );
      Navigator.pop(context, quotation);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  void dispose() {
    _diagnosis.dispose();
    _discount.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) =>
      widget.orderId == null ? _buildDemo(context) : _buildConnected(context);

  Widget _buildConnected(BuildContext context) => Scaffold(
    backgroundColor: AppColors.surface,
    appBar: AppBar(title: const Text('Lập báo giá')),
    body: _loading
        ? const Center(child: CircularProgressIndicator())
        : _error != null
        ? _ErrorState(message: _error!, retry: _load)
        : _catalog.isEmpty
        ? const Center(child: Text('Garage chưa cấu hình dịch vụ'))
        : ListView(
            padding: const EdgeInsets.all(16),
            children: [
              MechanicPanel(
                child: MechanicInfo(
                  icon: Icons.receipt_long_outlined,
                  title: 'Yêu cầu cứu hộ',
                  value: 'Đơn #${widget.orderId}',
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _diagnosis,
                minLines: 2,
                maxLines: 4,
                decoration: const InputDecoration(
                  labelText: 'Kết quả khảo sát / chẩn đoán',
                  border: OutlineInputBorder(),
                ),
              ),
              const MechanicSection('Chọn hạng mục dịch vụ'),
              MechanicPanel(
                padding: 0,
                child: Column(
                  children: _catalog
                      .map(
                        (item) => CheckboxListTile(
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 5,
                          ),
                          controlAffinity: ListTileControlAffinity.leading,
                          value: _selected.contains(item.serviceId),
                          onChanged: (checked) =>
                              _toggleService(item, checked == true),
                          title: Text(
                            item.name,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          subtitle: Text(
                            item.description ?? item.type ?? '',
                            style: const TextStyle(
                              fontSize: 11,
                              color: AppColors.secondary,
                            ),
                          ),
                          secondary: Text(
                            '${item.price.toStringAsFixed(0)} đ',
                            style: const TextStyle(
                              color: AppColors.primary,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      )
                      .toList(),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Chọn các hạng mục sửa tại chỗ hoặc phương án kéo xe. Hai phương án không thể nằm chung trong một báo giá.',
                style: TextStyle(
                  fontSize: 12,
                  color: AppColors.secondary,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _discount,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Giảm giá (đ)',
                  border: OutlineInputBorder(),
                ),
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 16),
              MechanicPanel(
                dark: true,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'TỔNG BÁO GIÁ',
                      style: TextStyle(
                        fontSize: 10,
                        color: Color(0xFFB9CEDB),
                        letterSpacing: 1.2,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _money(_subtotal),
                      key: const Key('quotation-total'),
                      style: const TextStyle(
                        fontSize: 31,
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    Text(
                      '${_selected.length} hạng mục',
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFFB9CEDB),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: _submitting ? null : _submit,
                child: _submitting
                    ? const SizedBox.square(
                        dimension: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Gửi báo giá'),
              ),
            ],
          ),
  );

  Widget _buildDemo(BuildContext context) {
    final total = _demoSelected.fold<int>(
      0,
      (sum, index) => sum + _demoPrices[index],
    );
    return MechanicPage(
      title: 'Lập báo giá',
      bottom: FilledButton.icon(
        onPressed: _demoSelected.isEmpty
            ? null
            : () => Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => RepairExecutionScreen(
                    orderId: widget.orderId,
                    orderType: widget.orderType,
                  ),
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
          selected: {_demoVersion},
          onSelectionChanged: (value) =>
              setState(() => _demoVersion = value.first),
        ),
        const MechanicSection('Chọn hạng mục dịch vụ'),
        MechanicPanel(
          padding: 0,
          child: Column(
            children: List.generate(
              _demoNames.length,
              (index) => CheckboxListTile(
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 5,
                ),
                controlAffinity: ListTileControlAffinity.leading,
                value: _demoSelected.contains(index),
                onChanged: (selected) => setState(() {
                  selected == true
                      ? _demoSelected.add(index)
                      : _demoSelected.remove(index);
                }),
                title: Text(
                  _demoNames[index],
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                subtitle: Text(
                  _money(_demoPrices[index]),
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
                '${_demoSelected.length} hạng mục · Phiên bản V${_demoVersion + 1}',
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

  String _money(num value) =>
      '${value.toStringAsFixed(0).replaceAllMapped(RegExp(r"(\d)(?=(\d{3})+(?!\d))"), (match) => '${match[1]}.')} đ';
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.retry});

  final String message;
  final VoidCallback retry;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(message, textAlign: TextAlign.center),
          const SizedBox(height: 12),
          OutlinedButton(onPressed: retry, child: const Text('Thử lại')),
        ],
      ),
    ),
  );
}
