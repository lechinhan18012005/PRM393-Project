import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/auth_provider.dart';

import '../../core/constants/app_colors.dart';

// Customer Screens
import '../customer/stitch_hydro_rescue_screen.dart';
import '../customer/service_selection_screen.dart';
import '../customer/radar_dispatch_screen.dart';
import '../customer/live_tracking_screen.dart';
import '../customer/review_quotation_screen.dart';
import '../customer/vietqr_payment_screen.dart';
import '../customer/payment_success_screen.dart';
import '../customer/electronic_invoice_screen.dart';
import '../customer/rating_review_screen.dart';
import '../customer/community_flood_report_screen.dart';
import '../customer/flood_map_screen.dart';
import '../customer/vehicle_profile_screen.dart';
import '../customer/rescue_history_screen.dart';

// Mechanic Screens
import '../mechanic/incoming_dispatch_screen.dart';
import '../mechanic/route_navigation_screen.dart';
import '../mechanic/quotation_builder_screen.dart';
import '../mechanic/repair_execution_screen.dart';
import '../mechanic/mechanic_shift_screen.dart';

class DemoCatalogScreen extends StatelessWidget {
  const DemoCatalogScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text(
          'Khám phá ứng dụng',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (context.watch<AuthProvider>().user?.role == 'CUSTOMER') ...[
            // Section 1: Customer
            _buildCategoryHeader('Khách hàng', Icons.person, Colors.blue),
            _buildScreenTile(
              context,
              'Trang chủ',
              'Bản đồ ngập GIS, nút SOS khẩn cấp, KTV Nam',
              const StitchHydroRescueScreen(),
            ),
            _buildScreenTile(
              context,
              'Chọn dịch vụ',
              'Gom xe vượt ngập / Khám xe / Kéo xe',
              const ServiceSelectionScreen(),
            ),
            _buildScreenTile(
              context,
              'Tìm cứu hộ',
              'Hiệu ứng radar quét tìm thợ gần nhất 3km',
              const RadarDispatchScreen(),
            ),
            _buildScreenTile(
              context,
              'Theo dõi cứu hộ',
              'Bản đồ di chuyển và ETA đến hiện trường',
              const LiveTrackingScreen(),
            ),
            _buildScreenTile(
              context,
              'Duyệt báo giá',
              'Bảng kê phụ tùng, sấy bugi, thay nhớt',
              const ReviewQuotationScreen(),
            ),
            _buildScreenTile(
              context,
              'Thanh toán',
              'Mã QR động MB Bank NAPAS 247',
              const VietQRPaymentScreen(),
            ),
            _buildScreenTile(
              context,
              'Thanh toán thành công',
              'Biên lai giao dịch PayOS Webhook tự động',
              const PaymentSuccessScreen(),
            ),
            _buildScreenTile(
              context,
              'Hóa đơn & bảo hành',
              'Phiếu bảo hành 30 ngày & mã tra cứu QR',
              const ElectronicInvoiceScreen(),
            ),
            _buildScreenTile(
              context,
              'Đánh giá cứu hộ',
              'Bình chọn 1-5 sao, chọn tag đánh giá',
              const RatingReviewScreen(),
            ),
            _buildScreenTile(
              context,
              'Báo ngập',
              'Gửi tọa độ ngập, độ sâu và hình ảnh',
              const CommunityFloodReportScreen(),
            ),
            _buildScreenTile(
              context,
              'Bản đồ ngập',
              'Bản đồ nhiệt GIS và các điểm ngập sâu',
              const FloodMapScreen(),
            ),
            _buildScreenTile(
              context,
              'Xe của tôi',
              'Quản lý nhiều xe (SH, Exciter, Wave)',
              const VehicleProfileScreen(),
            ),
            _buildScreenTile(
              context,
              'Lịch sử cứu hộ',
              'Danh sách các đơn cứu hộ trước đây',
              const RescueHistoryScreen(),
            ),

            const SizedBox(height: 16),
          ],
          if (context.watch<AuthProvider>().user?.role == 'FIELD_MECHANIC') ...[
            // Section 2: Mechanic
            _buildCategoryHeader('Thợ cứu hộ', Icons.build, Colors.orange),
            _buildScreenTile(
              context,
              'Nhận yêu cầu cứu hộ',
              'Bộ đếm ngược 45s và chi tiết cứu hộ',
              const IncomingDispatchScreen(),
            ),
            _buildScreenTile(
              context,
              'Đường đến khách',
              'Chỉ đường Turn-by-Turn né vùng ngập',
              const RouteNavigationScreen(),
            ),
            _buildScreenTile(
              context,
              'Lập báo giá',
              'Chọn phụ tùng từ catalog Gara Toàn Thắng',
              const QuotationBuilderScreen(),
            ),
            _buildScreenTile(
              context,
              'Sửa chữa & bàn giao',
              'Checklist kỹ thuật và chụp ảnh xe nổ',
              const RepairExecutionScreen(),
            ),
            _buildScreenTile(
              context,
              'Ca trực',
              'Lịch trực bão và bàn giao thiết bị',
              const MechanicShiftScreen(),
            ),

            const SizedBox(height: 16),
          ],
        ],
      ),
    );
  }

  Widget _buildCategoryHeader(String title, IconData icon, Color color) {
    return Padding(
      padding: const EdgeInsets.only(top: 8, bottom: 6),
      child: Row(
        children: [
          Icon(icon, size: 18, color: color),
          const SizedBox(width: 8),
          Text(
            title,
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 13,
              color: color,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildScreenTile(
    BuildContext context,
    String title,
    String subtitle,
    Widget screen,
  ) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: ListTile(
        title: Text(
          title,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
        ),
        subtitle: Text(
          subtitle,
          style: const TextStyle(fontSize: 11, color: AppColors.secondary),
        ),
        trailing: const Icon(
          Icons.arrow_forward_ios,
          size: 14,
          color: AppColors.primaryOrange,
        ),
        onTap: () {
          Navigator.of(context).push(MaterialPageRoute(builder: (_) => screen));
        },
      ),
    );
  }
}
