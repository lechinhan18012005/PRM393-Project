import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/widgets/rescue_ui.dart';
import '../../features/quotation/quotation_api.dart';
import '../../features/quotation/quotation_models.dart';
import 'vietqr_payment_screen.dart';

class ReviewQuotationScreen extends StatefulWidget {
  const ReviewQuotationScreen({super.key, this.orderId});

  final int? orderId;

  @override
  State<ReviewQuotationScreen> createState() => _ReviewQuotationScreenState();
}

class _ReviewQuotationScreenState extends State<ReviewQuotationScreen> {
  final _api = QuotationApi();
  QuotationModel? _quotation;
  bool _loading = true;
  bool _submitting = false;
  String? _error;

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
      final history = await _api.history(widget.orderId!);
      if (!mounted) return;
      final latest = history.where((q) => q.latest).toList();
      setState(() {
        _quotation = latest.isEmpty ? null : latest.first;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  Future<String?> _noteDialog(String title) async {
    final controller = TextEditingController();
    final result = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: TextField(
          controller: controller,
          maxLines: 3,
          decoration: const InputDecoration(
            hintText: 'Nhập nội dung',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Hủy'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('Xác nhận'),
          ),
        ],
      ),
    );
    controller.dispose();
    return result;
  }

  Future<void> _decide(String action) async {
    String? note;
    if (action != 'approve') {
      note = await _noteDialog(
        action == 'reject' ? 'Lý do từ chối' : 'Nội dung cần điều chỉnh',
      );
      if (note == null || note.isEmpty) return;
    }
    setState(() => _submitting = true);
    try {
      final quotation = _quotation!;
      final updated = switch (action) {
        'approve' => await _api.approve(quotation.id),
        'reject' => await _api.reject(quotation.id, note!),
        _ => await _api.requestRevision(quotation.id, note!),
      };
      if (!mounted) return;
      setState(() => _quotation = updated);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Đã cập nhật: ${updated.status}')));
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
  Widget build(BuildContext context) =>
      widget.orderId == null ? _buildDemo(context) : _buildConnected(context);

  Widget _buildConnected(BuildContext context) {
    final quotation = _quotation;
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: _appBar(),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
          ? _ErrorState(message: _error!, retry: _load)
          : quotation == null
          ? const Center(child: Text('Chưa có báo giá'))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                const RescueIntro(
                  eyebrow: 'CHI PHÍ DỊCH VỤ',
                  title: 'Kiểm tra trước khi duyệt',
                  description: 'Xem từng hạng mục và tổng chi phí cứu hộ.',
                ),
                const SizedBox(height: 12),
                _quotationHeader(quotation),
                const SizedBox(height: 16),
                const Text(
                  'Dịch vụ & phụ tùng',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: AppColors.outline,
                  ),
                ),
                const SizedBox(height: 8),
                RescuePanel(
                  padding: 16,
                  child: Column(
                    children: [
                      for (var i = 0; i < quotation.items.length; i++) ...[
                        _buildQuoteItem(
                          '${i + 1}. ${quotation.items[i].name}',
                          '${quotation.items[i].quantity} × ${quotation.items[i].unitPrice.toStringAsFixed(0)} đ',
                          '${quotation.items[i].subtotal.toStringAsFixed(0)} đ',
                        ),
                        if (i < quotation.items.length - 1) const Divider(),
                      ],
                      const Divider(thickness: 1.5),
                      _moneyRow('Phí đặt trước', quotation.bookingFee),
                      _moneyRow('Dịch vụ', quotation.subtotal),
                      _moneyRow('Giảm giá', -quotation.discount),
                      _moneyRow(
                        'TỔNG THANH TOÁN',
                        quotation.total,
                        total: true,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                _warrantyNotice(),
                const SizedBox(height: 24),
                if (quotation.status == 'PENDING_APPROVAL') _connectedActions(),
              ],
            ),
    );
  }

  Widget _buildDemo(BuildContext context) => Scaffold(
    backgroundColor: AppColors.surface,
    appBar: _appBar(),
    body: SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const RescueIntro(
            eyebrow: 'CHI PHÍ DỊCH VỤ',
            title: 'Kiểm tra trước khi duyệt',
            description: 'Xem từng hạng mục và tổng chi phí cứu hộ mẫu.',
          ),
          const SizedBox(height: 12),
          const RescueDemoNote(
            'Mô phỏng · Chưa xử lý giao dịch hoặc gửi dữ liệu thật',
          ),
          _demoHeader(),
          const SizedBox(height: 16),
          const Text(
            'Dịch vụ & phụ tùng',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: AppColors.outline,
            ),
          ),
          const SizedBox(height: 8),
          RescuePanel(
            padding: 16,
            child: Column(
              children: [
                _buildQuoteItem(
                  '1. Phí tiếp cận điểm ngập lụt',
                  'Phí di chuyển & trang thiết bị',
                  '50.000 đ',
                ),
                const Divider(),
                _buildQuoteItem(
                  '2. Sấy bugi & xả nước buồng đốt',
                  'Nhân công thợ cơ động',
                  '70.000 đ',
                ),
                const Divider(),
                _buildQuoteItem(
                  '3. Nhớt xe tay ga Castrol Scooter',
                  'Thay do nhớt cũ nhiễm nước',
                  '130.000 đ',
                ),
                const Divider(),
                _buildQuoteItem(
                  '4. Súc rửa lọc gió & xịt khô IC',
                  'Nhân công vệ sinh điện',
                  '40.000 đ',
                ),
                const Divider(thickness: 1.5),
                const Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  alignment: WrapAlignment.spaceBetween,
                  children: [
                    Text(
                      'TỔNG THANH TOÁN:',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    Text(
                      '290.000 đ',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primaryOrange,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _warrantyNotice(),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Từ Chối'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 2,
                child: ElevatedButton(
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const VietQRPaymentScreen(),
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primaryOrange,
                    foregroundColor: Colors.white,
                  ),
                  child: const Text('Duyệt & thanh toán'),
                ),
              ),
            ],
          ),
        ],
      ),
    ),
  );

  PreferredSizeWidget _appBar() => AppBar(
    title: const Text(
      'Duyệt báo giá',
      style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
    ),
    backgroundColor: Colors.white,
    elevation: 0,
  );

  Widget _quotationHeader(QuotationModel quotation) => RescuePanel(
    padding: 16,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Báo giá #${quotation.id} · V${quotation.version}',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 6),
        Text(
          quotation.diagnosis,
          style: const TextStyle(color: AppColors.secondary),
        ),
        Text(
          'Trạng thái: ${quotation.status}',
          style: const TextStyle(color: AppColors.secondary),
        ),
      ],
    ),
  );

  Widget _demoHeader() => const RescuePanel(
    padding: 16,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Báo giá #8924 · V2 · Sau kiểm tra',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
        ),
        SizedBox(height: 6),
        Text(
          'Gara Toàn Thắng • Thợ lập: Phạm Tuấn Anh',
          style: TextStyle(fontSize: 12, color: AppColors.secondary),
        ),
        Text(
          'Xe: Honda SH 150i • 59-P1 999.88 • Ngập mức 2 (Nửa bánh)',
          style: TextStyle(fontSize: 12, color: AppColors.secondary),
        ),
      ],
    ),
  );

  Widget _connectedActions() => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      OutlinedButton(
        onPressed: _submitting ? null : () => _decide('request-revision'),
        child: const Text('Yêu cầu chỉnh sửa'),
      ),
      const SizedBox(height: 8),
      Row(
        children: [
          Expanded(
            child: OutlinedButton(
              onPressed: _submitting ? null : () => _decide('reject'),
              child: const Text('Từ chối'),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 2,
            child: ElevatedButton(
              onPressed: _submitting ? null : () => _decide('approve'),
              child: const Text('Chấp nhận báo giá'),
            ),
          ),
        ],
      ),
    ],
  );

  Widget _warrantyNotice() => Container(
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: Colors.green.shade50,
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: Colors.green.shade200),
    ),
    child: const Row(
      children: [
        Icon(Icons.verified_user, color: Colors.green, size: 24),
        SizedBox(width: 10),
        Expanded(
          child: Text(
            'Bảo hành 30 ngày cho các chi tiết xử lý ngập nước tại tất cả chi nhánh Gara Toàn Thắng.',
            style: TextStyle(fontSize: 11, color: Colors.green),
          ),
        ),
      ],
    ),
  );

  Widget _buildQuoteItem(String name, String desc, String price) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 4),
    child: Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                name,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                ),
              ),
              Text(
                desc,
                style: const TextStyle(
                  fontSize: 11,
                  color: AppColors.secondary,
                ),
              ),
            ],
          ),
        ),
        Text(
          price,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
        ),
      ],
    ),
  );

  Widget _moneyRow(String label, double value, {bool total = false}) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 4),
    child: Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(fontWeight: total ? FontWeight.bold : null),
        ),
        Text(
          '${value.toStringAsFixed(0)} đ',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: total ? 18 : null,
            color: total ? AppColors.primaryOrange : null,
          ),
        ),
      ],
    ),
  );
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.retry});

  final String message;
  final VoidCallback retry;

  @override
  Widget build(BuildContext context) => Center(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(message, textAlign: TextAlign.center),
        const SizedBox(height: 12),
        OutlinedButton(onPressed: retry, child: const Text('Thử lại')),
      ],
    ),
  );
}
