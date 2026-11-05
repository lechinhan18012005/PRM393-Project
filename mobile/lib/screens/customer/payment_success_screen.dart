// ============================================================================
// TẬP TIN: payment_success_screen.dart
// TÁC GIẢ / PHỤ TRÁCH: Nguyễn Hoàng Long
// PHÂN HỆ: Mobile Customer App - Luồng 5: Thanh toán & Đối soát (UC-18)
// MÔ TẢ NGHIỆP VỤ & GIAO DIỆN:
//   - Màn hình xác nhận hoàn tất thanh toán dịch vụ cứu hộ (UC-18).
//   - Được điều hướng tới ngay sau khi giao dịch PayOS VietQR hoặc Tiền mặt
//     chuyển sang trạng thái thành công (`status == 'SUCCESS'`).
//   - Đóng vai trò là điểm trung chuyển (Hub) kết nối 3 luồng nghiệp vụ hậu cứu hộ:
//       1) Xem Biên nhận thanh toán / Hóa đơn điện tử chi tiết (`ElectronicInvoiceScreen` - UC-18),
//          nơi khách hàng cũng có thể gửi yêu cầu khiếu nại & hoàn tiền (UC-23).
//       2) Chuyển sang màn hình Đánh giá dịch vụ & Thợ cứu hộ 1-5 sao (`RatingReviewScreen` - UC-19).
//       3) Quay trở về màn hình chính của ứng dụng khách hàng.
// ============================================================================

import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/models/payment_transaction_model.dart';
import '../../core/models/rescue_order_model.dart';
import '../../core/widgets/rescue_ui.dart';
import 'electronic_invoice_screen.dart';
import 'rating_review_screen.dart';

/// Widget màn hình hiển thị kết quả xác nhận giao dịch thanh toán thành công (UC-18).
///
/// Là một [StatelessWidget] nhận dữ liệu bất biến từ [PaymentTransactionModel] và
/// [RescueOrderModel] để trình bày tóm tắt phiếu thu (Settlement Receipt Card).
class PaymentSuccessScreen extends StatelessWidget {
  /// Đối tượng giao dịch thanh toán đã được xác nhận thành công từ Backend.
  final PaymentTransactionModel? transaction;

  /// Đối tượng thông tin chi tiết đơn cứu hộ liên kết với giao dịch.
  final RescueOrderModel? order;

  /// Mã định danh (ID) đơn cứu hộ dự phòng trong trường hợp chỉ truyền ID.
  final int? orderId;

  /// Mã hiển thị của đơn cứu hộ (ví dụ: 'SOS-1024', '#PRM-8924').
  final String? rescueCode;

  /// Số tiền đã thanh toán (VNĐ).
  final double? amount;

  /// Khởi tạo [PaymentSuccessScreen] với các thông tin giao dịch và đơn cứu hộ.
  const PaymentSuccessScreen({
    super.key,
    this.transaction,
    this.order,
    this.orderId,
    this.rescueCode,
    this.amount,
  });

  /// Kiểm tra xem màn hình đang hiển thị dữ liệu giao dịch thật hay dữ liệu minh họa (Demo Preview).
  bool get _isReal => transaction != null || order != null;

  /// Hàm tiện ích định dạng số tiền sang chuẩn hiển thị tiền tệ Việt Nam Đồng (ví dụ: `150.000 đ`).
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

  // ==========================================================================
  // XÂY DỰNG GIAO DIỆN XÁC NHẬN THANH TOÁN (WIDGET TREE)
  // ==========================================================================

  @override
  Widget build(BuildContext context) {
    // Bước 1: Tổng hợp và chuẩn hóa các thông tin hiển thị từ transaction hoặc order
    final resolvedOrderId = transaction?.rescueOrderId ?? order?.id ?? orderId;
    final code =
        transaction?.rescueCode ??
        order?.orderCode ??
        rescueCode ??
        (orderId != null ? 'SOS-$orderId' : '#PRM-8924');
    final displayAmount =
        transaction?.amount ?? order?.totalAmount ?? amount ?? 150000.0;
    // Xác định tên phương thức thanh toán: Tiền mặt hoặc PayOS VietQR kèm tên ngân hàng
    final methodStr = (transaction?.paymentMethod == 'CASH')
        ? 'Tiền mặt tại hiện trường'
        : 'PayOS VietQR (${transaction?.bankName ?? "MB Bank"})';
    final garageName =
        transaction?.garageName ??
        order?.garageName ??
        'Trung tâm cứu hộ liên kết';
    final mechanicName = order?.mechanicName ?? 'Thợ cứu hộ phụ trách';
    final paidAtStr = transaction?.paidAt ?? order?.paidAt ?? 'Đã xác nhận';

    return Scaffold(
      backgroundColor: AppColors.background,
      // Thanh tiêu đề ẩn nút Back mặc định (automaticallyImplyLeading: false)
      // để ngăn người dùng bấm lùi lại màn hình quét mã QR đã thanh toán xong.
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
            // Hiển thị nhãn ghi chú nếu đang xem ở chế độ minh họa (Preview)
            if (!_isReal)
              const RescueDemoNote(
                'Kết quả thanh toán minh họa · Chưa có giao dịch thật',
              ),
            const SizedBox(height: 16),

            // Success Check Icon: Biểu tượng dấu tích xanh xác nhận giao dịch hoàn tất
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

            // Settlement Receipt Card: Thẻ tóm tắt thông tin giao dịch thanh toán
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
                  // Hiển thị mã giao dịch PayOS nếu thanh toán qua cổng PayOS
                  if (transaction?.payosOrderCode != null &&
                      transaction!.payosOrderCode > 0) ...[
                    const SizedBox(height: 10),
                    _buildReceiptRow(
                      'Mã giao dịch PayOS:',
                      '#${transaction!.payosOrderCode}',
                    ),
                  ],
                  const SizedBox(height: 10),
                  _buildReceiptRow('Thời gian:', paidAtStr),
                ],
              ),
            ),
            const SizedBox(height: 32),

            // Button 1: Xem biên nhận thanh toán (điều hướng sang ElectronicInvoiceScreen - UC-18 & UC-23)
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

            // Button 2: Đánh giá thợ cứu hộ (điều hướng sang RatingReviewScreen - UC-19)
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
                'Đánh giá dịch vụ & Thợ cứu hộ',
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

            // Button 3: Về trang chủ (đóng toàn bộ stack điều hướng thanh toán để về màn hình gốc)
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

  /// Xây dựng một dòng thông tin (Nhãn - Giá trị) trong thẻ tóm tắt thanh toán.
  ///
  /// Khi [isAmount] == `true`, giá trị số tiền được làm nổi bật bằng màu cam chính (`AppColors.primaryOrange`).
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
