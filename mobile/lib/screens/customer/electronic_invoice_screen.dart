import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/models/payment_transaction_model.dart';
import '../../core/models/rescue_order_model.dart';
import '../../core/services/dispute_service.dart';
import '../../core/widgets/rescue_ui.dart';
import 'stitch_hydro_rescue_screen.dart';

class ElectronicInvoiceScreen extends StatelessWidget {
  final PaymentTransactionModel? transaction;
  final RescueOrderModel? order;

  const ElectronicInvoiceScreen({
    super.key,
    this.transaction,
    this.order,
  });

  bool get _isReal => transaction != null || order != null;

  String _formatVnd(double val) {
    final intVal = val.round();
    final str = intVal.toString();
    final buffer = StringBuffer();
    for (int i = 0; i < str.length; i++) {
      if (i > 0 && (str.length - i) % 3 == 0) {
        buffer.write('.');
      }
      buffer.write(str[i]);
    }
    return '${buffer.toString()} đ';
  }

  void _showDisputeBottomSheet(
    BuildContext context, {
    required int rescueOrderId,
    int? paymentTransactionId,
    required String rescueCode,
    required double paidAmount,
  }) {
    final amountController = TextEditingController(
      text: paidAmount.round().toString(),
    );
    final reasonController = TextEditingController();
    String selectedType = 'OVERCHARGE';
    bool isSubmitting = false;

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetCtx) {
        return StatefulBuilder(
          builder: (ctx, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 20,
                bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            'Gửi khiếu nại & Yêu cầu hoàn tiền',
                            style: Theme.of(ctx).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.w800,
                                ),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () => Navigator.of(sheetCtx).pop(),
                        ),
                      ],
                    ),
                    Text(
                      'Đơn cứu hộ: $rescueCode • Đã thanh toán: ${_formatVnd(paidAmount)}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.secondary,
                      ),
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      initialValue: selectedType,
                      decoration: const InputDecoration(
                        labelText: 'Nhóm lý do khiếu nại',
                        border: OutlineInputBorder(),
                      ),
                      items: const [
                        DropdownMenuItem(
                          value: 'OVERCHARGE',
                          child: Text('Thu vượt báo giá / phụ phí ngoài luồng'),
                        ),
                        DropdownMenuItem(
                          value: 'POOR_QUALITY',
                          child: Text('Chất lượng cứu hộ / sửa chữa không đạt'),
                        ),
                        DropdownMenuItem(
                          value: 'DAMAGE',
                          child: Text('Hư hỏng phương tiện trong lúc cứu hộ'),
                        ),
                        DropdownMenuItem(
                          value: 'FAKE_RESCUE',
                          child: Text('Báo hoàn tất khống / hủy sau khi thu tiền'),
                        ),
                      ],
                      onChanged: (val) {
                        if (val != null) {
                          setModalState(() => selectedType = val);
                        }
                      },
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: amountController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Số tiền yêu cầu hoàn trả (VNĐ)',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: reasonController,
                      maxLines: 3,
                      decoration: const InputDecoration(
                        labelText: 'Mô tả chi tiết sự việc & bằng chứng',
                        hintText:
                            'Nhập lý do khiếu nại để bộ phận CSKH (Staff) đối chiếu và đề xuất Admin hoàn tiền...',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      onPressed: isSubmitting
                          ? null
                          : () async {
                              final amount =
                                  double.tryParse(amountController.text.trim()) ??
                                  0;
                              final reason = reasonController.text.trim();
                              if (amount <= 0 || amount > paidAmount) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(
                                      'Số tiền yêu cầu hoàn phải từ 1đ đến ${_formatVnd(paidAmount)}',
                                    ),
                                  ),
                                );
                                return;
                              }
                              if (reason.isEmpty) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text(
                                      'Vui lòng nhập mô tả chi tiết lý do khiếu nại',
                                    ),
                                  ),
                                );
                                return;
                              }

                              setModalState(() => isSubmitting = true);
                              try {
                                final created =
                                    await DisputeService().createDispute(
                                  rescueOrderId: rescueOrderId,
                                  paymentTransactionId: paymentTransactionId,
                                  disputeType: selectedType,
                                  requestedRefundAmount: amount,
                                  customerReason: reason,
                                );
                                if (sheetCtx.mounted) {
                                  Navigator.of(sheetCtx).pop();
                                }
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      backgroundColor: Colors.green.shade700,
                                      content: Text(
                                        'Đã gửi hồ sơ khiếu nại ${created.disputeCode}! Bộ phận CSKH sẽ xác minh sớm nhất.',
                                      ),
                                    ),
                                  );
                                }
                              } catch (e) {
                                if (sheetCtx.mounted) {
                                  Navigator.of(sheetCtx).pop();
                                }
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      backgroundColor:
                                          _isReal ? Colors.red.shade700 : Colors.green.shade700,
                                      content: Text(
                                        _isReal
                                            ? 'Đã ghi nhận yêu cầu khiếu nại ($e)'
                                            : 'Đã gửi hồ sơ khiếu nại mẫu thành công! Bộ phận CSKH đang tiếp nhận xử lý.',
                                      ),
                                    ),
                                  );
                                }
                              }
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.red.shade700,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      icon: const Icon(Icons.report_problem_outlined),
                      label: Text(
                        isSubmitting
                            ? 'Đang gửi hồ sơ...'
                            : 'Gửi Khiếu Nại & Yêu Cầu Hoàn Tiền',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final code = transaction?.rescueCode ??
        order?.orderCode ??
        '#RC-DEMO-8924';
    final total = transaction?.amount ??
        order?.totalAmount ??
        150000.0;
    final basePrice = order?.serviceBasePrice ?? (total - 30000.0);
    final bookingFee = order?.bookingFee ?? 30000.0;
    final garageName = transaction?.garageName ??
        order?.garageName ??
        'Trung tâm cứu hộ liên kết';
    final customerName = order?.customerName ??
        transaction?.customerName ??
        'Khách hàng cứu hộ';
    final vehicleInfo = [
      if (order?.vehiclePlate != null && order!.vehiclePlate.isNotEmpty) order!.vehiclePlate,
      if (order?.vehicleModel != null && order!.vehicleModel!.isNotEmpty) order!.vehicleModel!,
    ].join(' • ');
    final serviceName = order?.serviceName ?? 'Chở xe máy qua điểm ngập (Chuyến riêng)';
    final methodStr = (transaction?.paymentMethod == 'CASH')
        ? 'Tiền mặt tại hiện trường'
        : 'PayOS VietQR';
    final refCode = transaction?.payosOrderCode != null && transaction!.payosOrderCode > 0
        ? '#${transaction!.payosOrderCode}'
        : (order?.paymentOrderCode != null ? '#${order!.paymentOrderCode}' : 'RESCUE-$code');
    final paidAtStr = transaction?.paidAt ?? order?.paidAt ?? 'Đã hoàn tất';
    final rescueOrderId = transaction?.rescueOrderId ?? order?.id ?? 8924;

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text(
          'Biên nhận thanh toán cứu hộ',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const RescueIntro(
              eyebrow: 'THÔNG TIN BIÊN NHẬN',
              title: 'Biên nhận cứu hộ dịch vụ',
              description: 'Lưu lại chi tiết chi phí và xác nhận hoàn tất thanh toán.',
            ),
            const SizedBox(height: 12),
            if (!_isReal)
              const RescueDemoNote(
                'Biên nhận minh họa · Chưa có giao dịch thật',
              ),
            // Receipt Paper Box
            RescuePanel(
              padding: 20,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'BIÊN NHẬN DỊCH VỤ',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: AppColors.primaryOrange,
                              ),
                            ),
                            SizedBox(height: 2),
                            Text(
                              'Hệ thống cứu hộ Motorbike Flood Rescue',
                              style: TextStyle(
                                fontSize: 11,
                                color: AppColors.secondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.green.shade50,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.green.shade300),
                        ),
                        child: Text(
                          'ĐÃ THANH TOÁN',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: Colors.green.shade800,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 24),

                  Text(
                    'Mã đơn cứu hộ: $code',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Mã tham chiếu thanh toán: $refCode',
                    style: const TextStyle(fontSize: 12, color: AppColors.secondary),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Thời gian hoàn tất: $paidAtStr',
                    style: const TextStyle(fontSize: 12, color: AppColors.secondary),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Đơn vị thực hiện: $garageName',
                    style: const TextStyle(fontSize: 12, color: AppColors.secondary),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Khách hàng: $customerName${vehicleInfo.isNotEmpty ? " • $vehicleInfo" : ""}',
                    style: const TextStyle(fontSize: 12, color: AppColors.secondary),
                  ),

                  const SizedBox(height: 16),
                  const Text(
                    'CHI TIẾT DỊCH VỤ CỨU HỘ',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: AppColors.outline,
                    ),
                  ),
                  const SizedBox(height: 8),

                  _buildDetailRow(serviceName, _formatVnd(basePrice)),
                  _buildDetailRow('Phí dịch vụ khẩn cấp & điều phối', _formatVnd(bookingFee)),
                  _buildDetailRow('Phương thức thanh toán', methodStr),

                  const Divider(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Expanded(
                        child: Text(
                          'TỔNG THANH TOÁN:',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                      ),
                      Text(
                        _formatVnd(total),
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                          color: AppColors.primaryOrange,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Center(
                    child: Column(
                      children: [
                        const Icon(
                          Icons.verified_user_outlined,
                          size: 40,
                          color: Colors.green,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Xác nhận thanh toán hợp lệ trên hệ thống HydroRescue',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 10,
                            color: Colors.grey.shade600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            OutlinedButton.icon(
              onPressed: () => _showDisputeBottomSheet(
                context,
                rescueOrderId: rescueOrderId,
                paymentTransactionId: transaction?.id,
                rescueCode: code,
                paidAmount: total,
              ),
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.red.shade700,
                side: BorderSide(color: Colors.red.shade300),
                padding: const EdgeInsets.symmetric(vertical: 13),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              icon: const Icon(Icons.gavel_outlined, size: 18),
              label: const Text(
                'Khiếu nại dịch vụ / Yêu cầu hoàn tiền',
                style: TextStyle(fontWeight: FontWeight.w700),
              ),
            ),
            const SizedBox(height: 12),

            ElevatedButton(
              onPressed: () {
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(
                    builder: (_) => const StitchHydroRescueScreen(),
                  ),
                  (route) => false,
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primaryOrange,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text(
                'Về Trang Chủ Khách Hàng',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 6,
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.onSurface,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Flexible(
            flex: 5,
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: AppColors.onSurface,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
