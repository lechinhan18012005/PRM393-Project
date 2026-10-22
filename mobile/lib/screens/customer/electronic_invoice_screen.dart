import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/widgets/rescue_ui.dart';
import 'stitch_hydro_rescue_screen.dart';

class ElectronicInvoiceScreen extends StatelessWidget {
  const ElectronicInvoiceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text(
          'Hóa đơn & bảo hành',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
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
              eyebrow: 'THÔNG TIN SAU CỨU HỘ',
              title: 'Hóa đơn & bảo hành',
              description: 'Lưu lại chi phí và thông tin bảo hành mẫu.',
            ),
            const SizedBox(height: 12),
            const RescueDemoNote(
              'Mô phỏng · Chưa xử lý giao dịch hoặc gửi dữ liệu thật',
            ),
            // E-Invoice Paper Simulation
            RescuePanel(
              padding: 20,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    alignment: WrapAlignment.spaceBetween,
                    children: [
                      const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'HÓA ĐƠN ĐIỆN TỬ',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primaryOrange,
                            ),
                          ),
                          Text(
                            'Kèm Phiếu Bảo Hành Cứu Hộ',
                            style: TextStyle(
                              fontSize: 11,
                              color: AppColors.secondary,
                            ),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: Colors.green.shade50,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          'ĐÃ GẠCH NỢ',
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

                  const Text(
                    'Mã hóa đơn: #INV-2026-8924',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                  const Text(
                    'Thời gian lập: 11/10/2026 - 17:35:12',
                    style: TextStyle(fontSize: 12, color: AppColors.secondary),
                  ),
                  const Text(
                    'Đơn vị thực hiện: Cứu hộ Gara Toàn Thắng (CN Q.7)',
                    style: TextStyle(fontSize: 12, color: AppColors.secondary),
                  ),
                  const Text(
                    'Khách hàng: Hoàng Văn Khách • Xe: 59-P1 999.88',
                    style: TextStyle(fontSize: 12, color: AppColors.secondary),
                  ),

                  const SizedBox(height: 16),
                  const Text(
                    'CHI TIẾT VẬT TƯ & BẢO HÀNH',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: AppColors.outline,
                    ),
                  ),
                  const SizedBox(height: 8),

                  _buildWarrantyRow(
                    'Bugi NGK chính hãng',
                    '1 chiếc',
                    '3 Tháng',
                  ),
                  _buildWarrantyRow(
                    'Nhớt Castrol Power1 Scooter',
                    '1 bình 0.8L',
                    '1.000 km',
                  ),
                  _buildWarrantyRow(
                    'Vệ sinh bugi & xả nước buồng đốt',
                    '1 lần',
                    '30 Ngày',
                  ),

                  const Divider(height: 24),
                  const Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    alignment: WrapAlignment.spaceBetween,
                    children: [
                      Text(
                        'TỔNG THANH TOÁN:',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                      Text(
                        '290.000 đ',
                        style: TextStyle(
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
                          Icons.qr_code,
                          size: 70,
                          color: AppColors.secondary,
                        ),
                        Text(
                          'Mã tra cứu bảo hành: BH-8924-OK',
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
            const SizedBox(height: 20),

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

  Widget _buildWarrantyRow(String item, String qty, String warranty) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
                Text(
                  'Số lượng: $qty',
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppColors.secondary,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: Colors.blue.shade50,
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              'BH $warranty',
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                color: Colors.blue.shade800,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
