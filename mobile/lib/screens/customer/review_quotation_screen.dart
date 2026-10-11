import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import 'vietqr_payment_screen.dart';

class ReviewQuotationScreen extends StatelessWidget {
  const ReviewQuotationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text('Duyệt Báo Giá Cứu Hộ', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0.5,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Quotation Header Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 2))],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('BÁO GIÁ SỐ: #QUO-8924-V2', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(color: Colors.blue.shade50, borderRadius: BorderRadius.circular(6)),
                        child: const Text('Phiên bản V2 (Sau khám)', style: TextStyle(color: Colors.blue, fontSize: 11, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  const Text('Gara Toàn Thắng • Thợ lập: Phạm Tuấn Anh', style: TextStyle(fontSize: 12, color: AppColors.secondary)),
                  const Text('Xe: Honda SH 150i • 59-P1 999.88 • Ngập mức 2 (Nửa bánh)', style: TextStyle(fontSize: 12, color: AppColors.secondary)),
                ],
              ),
            ),
            const SizedBox(height: 16),

            const Text('CHI TIẾT HẠNG MỤC SỬA CHỮA & VẬT TƯ', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.outline)),
            const SizedBox(height: 8),

            // Itemized List Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 2))],
              ),
              child: Column(
                children: [
                  _buildQuoteItem('1. Phí tiếp cận điểm ngập lụt', 'Phí di chuyển & trang thiết bị', '50.000 đ'),
                  const Divider(),
                  _buildQuoteItem('2. Sấy bugi & xả nước buồng đốt', 'Nhân công thợ cơ động', '70.000 đ'),
                  const Divider(),
                  _buildQuoteItem('3. Nhớt xe tay ga Castrol Scooter', 'Thay do nhớt cũ nhiễm nước', '130.000 đ'),
                  const Divider(),
                  _buildQuoteItem('4. Súc rửa lọc gió & xịt khô IC', 'Nhân công vệ sinh điện', '40.000 đ'),
                  const SizedBox(height: 12),
                  const Divider(thickness: 1.5),
                  const SizedBox(height: 8),
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('TỔNG THANH TOÁN:', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                      Text('290.000 đ', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primaryOrange)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Warranty Commitment Notice
            Container(
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
            ),
            const SizedBox(height: 24),

            // Action Buttons
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.of(context).pop(),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('Từ Chối'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const VietQRPaymentScreen()),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primaryOrange,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('Chấp Thuận & Thanh Toán', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuoteItem(String name, String desc, String price) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                Text(desc, style: const TextStyle(fontSize: 11, color: AppColors.secondary)),
              ],
            ),
          ),
          Text(price, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
        ],
      ),
    );
  }
}
