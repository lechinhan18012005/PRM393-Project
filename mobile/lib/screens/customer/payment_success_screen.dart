import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/models/payment_transaction_model.dart';
import '../../core/models/rescue_order_model.dart';
import '../../core/widgets/rescue_ui.dart';
import 'electronic_invoice_screen.dart';
import 'rating_review_screen.dart';

class PaymentSuccessScreen extends StatelessWidget {
  final PaymentTransactionModel? transaction;
  final RescueOrderModel? order;
  final int? orderId;
  final String? rescueCode;
  final double? amount;

  const PaymentSuccessScreen({
    super.key,
    this.transaction,
    this.order,
    this.orderId,
    this.rescueCode,
    this.amount,
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

  @override
  Widget build(BuildContext context) {
    final resolvedOrderId =
        transaction?.rescueOrderId ?? order?.id ?? orderId;
    final code = transaction?.rescueCode ??
        order?.orderCode ??
        rescueCode ??
        (orderId != null ? 'SOS-$orderId' : '#PRM-8924');
    final displayAmount = transaction?.amount ??
        order?.totalAmount ??
        amount ??
        150000.0;
    final methodStr = (transaction?.paymentMethod == 'CASH')
        ? 'Tiền mặt tại hiện trường'
        : 'PayOS VietQR (${transaction?.bankName ?? "MB Bank"})';
    final garageName = transaction?.garageName ??
        order?.garageName ??
        'Trung tâm cứu hộ liên kết';
    final mechanicName = order?.mechanicName ?? 'Thợ cứu hộ phụ trách';
    final paidAtStr = transaction?.paidAt ?? order?.paidAt ?? 'Đã xác nhận';

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Thanh toán thành công',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        automaticallyImplyLeading: false,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            if (!_isReal)
              const RescueDemoNote(
                'Kết quả thanh toán minh họa · Chưa có giao dịch thật',
              ),
            const SizedBox(height: 16),
            // Success Check Icon
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: Colors.green.shade50,
                shape: BoxShape.circle,
                border: Border.all(color: Colors.green.shade300, width: 2),
              ),
              child: const Icon(
                Icons.check_circle,
                color: Colors.green,
                size: 54,
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'GIAO DỊCH THÀNH CÔNG!',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Colors.green,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Đã xác nhận thanh toán cho đơn $code',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13, color: AppColors.secondary),
            ),
            const SizedBox(height: 24),

            // Settlement Receipt Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surfaceContainerLow,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.surfaceContainerHigh),
              ),
              child: Column(
                children: [
                  _buildReceiptRow(
                    'Số tiền thanh toán:',
                    _formatVnd(displayAmount),
                    isAmount: true,
                  ),
                  const SizedBox(height: 10),
                  _buildReceiptRow('Phương thức:', methodStr),
                  const SizedBox(height: 10),
                  _buildReceiptRow('Đơn vị thực hiện:', garageName),
                  const SizedBox(height: 10),
                  _buildReceiptRow('Thợ thực hiện:', mechanicName),
                  if (transaction?.payosOrderCode != null &&
                      transaction!.payosOrderCode > 0) ...[
                    const SizedBox(height: 10),
                    _buildReceiptRow(
                        'Mã giao dịch PayOS:', '#${transaction!.payosOrderCode}'),
                  ],
                  const SizedBox(height: 10),
                  _buildReceiptRow('Thời gian:', paidAtStr),
                ],
              ),
            ),
            const SizedBox(height: 32),

            // Button 1: Xem biên nhận thanh toán
            ElevatedButton.icon(
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => ElectronicInvoiceScreen(
                      transaction: transaction,
                      order: order,
                    ),
                  ),
                );
              },
              icon: const Icon(Icons.receipt_long, size: 18),
              label: const Text(
                'Biên nhận thanh toán',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.secondary,
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 48),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Button 2: Đánh giá thợ cứu hộ (UC-19)
            OutlinedButton.icon(
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => RatingReviewScreen(
                      rescueOrderId: resolvedOrderId,
                      rescueCode: code,
                      garageName: garageName,
                      mechanicName: mechanicName,
                    ),
                  ),
                );
              },
              icon: const Icon(Icons.star, color: Colors.amber, size: 20),
              label: const Text(
                'Đánh giá dịch vụ & Thợ cứu hộ (UC-19)',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(double.infinity, 48),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Button 3: Về trang chủ
            TextButton(
              onPressed: () {
                Navigator.of(context).popUntil((route) => route.isFirst);
              },
              child: const Text('Về màn hình chính'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildReceiptRow(String label, String value, {bool isAmount = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 12, color: AppColors.secondary),
        ),
        Flexible(
          child: Text(
            value,
            textAlign: TextAlign.end,
            style: TextStyle(
              fontSize: isAmount ? 16 : 12,
              fontWeight: FontWeight.bold,
              color: isAmount ? AppColors.primaryOrange : AppColors.onSurface,
            ),
          ),
        ),
      ],
    );
  }
}
