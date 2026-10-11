import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import 'repair_execution_screen.dart';

class QuotationBuilderScreen extends StatefulWidget {
  const QuotationBuilderScreen({super.key});

  @override
  State<QuotationBuilderScreen> createState() => _QuotationBuilderScreenState();
}

class _QuotationBuilderScreenState extends State<QuotationBuilderScreen> {
  int _selectedVersion = 1; // 0: V1, 1: V2
  final Map<String, bool> _items = {
    'Phí điều phối & tiếp cận ngập (50.000 đ)': true,
    'Sấy bugi & xả nước buồng đốt (70.000 đ)': true,
    'Thay nhớt Castrol Scooter (130.000 đ)': true,
    'Súc rửa lọc gió & xịt khô IC (40.000 đ)': true,
    'Kéo xe về Gara xử lý đại tu (150.000 đ)': false,
  };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text('Lập Báo Giá Hiện Trường', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0.5,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Version toggle
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(color: AppColors.surfaceContainer, borderRadius: BorderRadius.circular(12)),
              child: Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _selectedVersion = 0),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        decoration: BoxDecoration(
                          color: _selectedVersion == 0 ? Colors.white : Colors.transparent,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text('Phiên bản V1 (Ước tính sơ bộ)', textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: _selectedVersion == 0 ? AppColors.primaryOrange : AppColors.secondary)),
                      ),
                    ),
                  ),
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _selectedVersion = 1),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        decoration: BoxDecoration(
                          color: _selectedVersion == 1 ? Colors.white : Colors.transparent,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text('Phiên bản V2 (Sau tháo khám xe)', textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: _selectedVersion == 1 ? AppColors.primaryOrange : AppColors.secondary)),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            const Text('DANH MỤC DỊCH VỤ NIÊM YẾT GARA TOÀN THẮNG', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.outline)),
            const SizedBox(height: 8),

            // Items Checkbox List Card
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 2))],
              ),
              child: Column(
                children: _items.keys.map((key) {
                  return CheckboxListTile(
                    title: Text(key, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                    value: _items[key],
                    activeColor: AppColors.primaryOrange,
                    onChanged: (val) {
                      setState(() {
                        _items[key] = val ?? false;
                      });
                    },
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 16),

            // Summary Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.primaryContainer.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.primaryContainer),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('TỔNG BÁO GIÁ V2:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  Text('290.000 đ', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppColors.primaryOrange)),
                ],
              ),
            ),
            const SizedBox(height: 24),

            ElevatedButton(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Đã gửi báo giá số V2 sang máy khách hàng. Đang chờ khách bấm duyệt...')),
                );
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const RepairExecutionScreen()),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primaryOrange,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('GỬI BÁO GIÁ CHO KHÁCH DUYỆT', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            ),
          ],
        ),
      ),
    );
  }
}
