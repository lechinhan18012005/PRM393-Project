import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';

// Customer Screens
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

// Garage Owner Screens
import '../garage/batch_transport_manage_screen.dart';
import '../garage/team_allocation_screen.dart';
import '../garage/branch_management_screen.dart';
import '../garage/garage_revenue_screen.dart';
import '../garage/garage_wallet_payout_screen.dart';

class DemoCatalogScreen extends StatelessWidget {
  const DemoCatalogScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text('Tất Cả Màn Hình Flutter (22 Trang)', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0.5,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Section 1: Customer
          _buildCategoryHeader('1. LUỒNG KHÁCH HÀNG (CUSTOMER)', Icons.person, Colors.blue),
          _buildScreenTile(context, 'Yêu Cầu Cứu Hộ & Chọn Dịch Vụ', 'Gom xe vượt ngập / Khám xe / Kéo xe', const ServiceSelectionScreen()),
          _buildScreenTile(context, 'Quét Radar Tìm Thợ Trong Bán Kính', 'Hiệu ứng radar quét tìm thợ gần nhất 3km', const RadarDispatchScreen()),
          _buildScreenTile(context, 'Theo Dõi Thợ Thời Gian Thực', 'Bản đồ di chuyển và ETA đến hiện trường', const LiveTrackingScreen()),
          _buildScreenTile(context, 'Duyệt Báo Giá Số V1 / V2', 'Bảng kê phụ tùng, sấy bugi, thay nhớt', const ReviewQuotationScreen()),
          _buildScreenTile(context, 'Thanh Toán PayOS VietQR', 'Mã QR động MB Bank NAPAS 247', const VietQRPaymentScreen()),
          _buildScreenTile(context, 'Xác Nhận Thanh Toán & Gạch Nợ', 'Biên lai giao dịch PayOS Webhook tự động', const PaymentSuccessScreen()),
          _buildScreenTile(context, 'Hóa Đơn Điện Tử & Bảo Hành', 'Phiếu bảo hành 30 ngày & mã tra cứu QR', const ElectronicInvoiceScreen()),
          _buildScreenTile(context, 'Đánh Giá & Nhận Xét Thợ Cứu Hộ', 'Bình chọn 1-5 sao, chọn tag đánh giá', const RatingReviewScreen()),
          _buildScreenTile(context, 'Báo Điểm Ngập Lụt Cộng Đồng', 'Gửi tọa độ ngập, độ sâu và hình ảnh', const CommunityFloodReportScreen()),
          _buildScreenTile(context, 'Bản Đồ Cảnh Báo Ngập Lụt Đô Thị', 'Bản đồ nhiệt GIS và các điểm ngập sâu', const FloodMapScreen()),
          _buildScreenTile(context, 'Hồ Sơ Phương Tiện Xe Máy', 'Quản lý nhiều xe (SH, Exciter, Wave)', const VehicleProfileScreen()),
          _buildScreenTile(context, 'Lịch Sử Cứu Hộ & Bảo Hành', 'Danh sách các đơn cứu hộ trước đây', const RescueHistoryScreen()),

          const SizedBox(height: 16),
          // Section 2: Mechanic
          _buildCategoryHeader('2. LUỒNG THỢ CƠ ĐỘNG (MECHANIC)', Icons.build, Colors.orange),
          _buildScreenTile(context, 'Chuông Nhận Đơn Khẩn Cấp 45 Giây', 'Bộ đếm ngược 45s và chi tiết cứu hộ', const IncomingDispatchScreen()),
          _buildScreenTile(context, 'Điều Hướng Lộ Trình Hiện Trường', 'Chỉ đường Turn-by-Turn né vùng ngập', const RouteNavigationScreen()),
          _buildScreenTile(context, 'Lập Báo Giá Hiện Trường (V1 / V2)', 'Chọn phụ tùng từ catalog Gara Toàn Thắng', const QuotationBuilderScreen()),
          _buildScreenTile(context, 'Thực Hiện Sửa Chữa & Nghiệm Thu', 'Checklist kỹ thuật và chụp ảnh xe nổ', const RepairExecutionScreen()),
          _buildScreenTile(context, 'Bảng Ca Trực Chiến & Phân Bổ Địa Bàn', 'Lịch trực bão và bàn giao thiết bị', const MechanicShiftScreen()),

          const SizedBox(height: 16),
          // Section 3: Garage Owner
          _buildCategoryHeader('3. LUỒNG CHỦ GARA (GARAGE OWNER)', Icons.store, Colors.green),
          _buildScreenTile(context, 'Quản Lý Đội Xe Gom Vượt Ngập', 'Quản lý xe tải/ba gác gom 4-6 xe', const BatchTransportManageScreen()),
          _buildScreenTile(context, 'Phân Bổ Đội Thợ Trực Bão', 'Điều động thợ trực chiến sang điểm ngập', const TeamAllocationScreen()),
          _buildScreenTile(context, 'Quản Lý Đa Chi Nhánh Gara', 'Danh sách chi nhánh Q.7, Q.8, Bình Thạnh', const BranchManagementScreen()),
          _buildScreenTile(context, 'Tổng Quan Doanh Thu Điều Phối Gara', 'Báo cáo doanh thu, GMV và chiết khấu sàn', const GarageRevenueScreen()),
          _buildScreenTile(context, 'Ví Doanh Thu & Rút Tiền PayOS', 'Số dư ví Gara và lệnh chuyển khoản ngân hàng', const GarageWalletPayoutScreen()),
          const SizedBox(height: 30),
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
          Text(title, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: color, letterSpacing: 0.5)),
        ],
      ),
    );
  }

  Widget _buildScreenTile(BuildContext context, String title, String subtitle, Widget screen) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 0.5,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.grey.shade200)),
      child: ListTile(
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
        subtitle: Text(subtitle, style: const TextStyle(fontSize: 11, color: AppColors.secondary)),
        trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: AppColors.primaryOrange),
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => screen),
          );
        },
      ),
    );
  }
}
