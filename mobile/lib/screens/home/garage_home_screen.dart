import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../auth/login_screen.dart';
import '../demo/demo_catalog_screen.dart';
import '../garage/garage_wallet_payout_screen.dart';
import '../garage/branch_management_screen.dart';
import '../garage/batch_transport_manage_screen.dart';
import '../garage/team_allocation_screen.dart';
import '../garage/garage_revenue_screen.dart';

class GarageHomeScreen extends StatefulWidget {
  const GarageHomeScreen({super.key});

  @override
  State<GarageHomeScreen> createState() => _GarageHomeScreenState();
}

class _GarageHomeScreenState extends State<GarageHomeScreen> {
  String _selectedBranch = 'Chi nhánh 1 (Q.7 - Huỳnh Tấn Phát)';

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final user = authProvider.user;

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text(
          'Quản Lý Gara & Chi Nhánh',
          style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.white,
        elevation: 0.5,
        foregroundColor: AppColors.onSurface,
        actions: [
          IconButton(
            icon: const Icon(Icons.grid_view_rounded, color: AppColors.primaryOrange),
            tooltip: 'Danh sách 22 màn hình',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const DemoCatalogScreen()),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.logout, color: AppColors.error),
            tooltip: 'Đăng xuất',
            onPressed: () async {
              await authProvider.logout();
              if (context.mounted) {
                Navigator.of(context).pushReplacement(
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                );
              }
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Garage Owner Header Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: const [
                  BoxShadow(color: Colors.black12, blurRadius: 6, offset: Offset(0, 2)),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const CircleAvatar(
                        radius: 24,
                        backgroundColor: AppColors.surfaceContainerHigh,
                        child: Icon(Icons.store, color: AppColors.primary, size: 28),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              user?.fullName ?? 'Gara Cứu Hộ Toàn Thắng',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                            ),
                            const SizedBox(height: 2),
                            const Text(
                              'Đối tác cứu hộ Hạng 1 • 3 Chi nhánh hoạt động',
                              style: TextStyle(fontSize: 12, color: AppColors.secondary),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  const Divider(),
                  const SizedBox(height: 8),

                  // Branch selector
                  const Text(
                    'ĐANG CHỌN CHI NHÁNH ĐIỀU PHỐI:',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.outline),
                  ),
                  const SizedBox(height: 6),
                  DropdownButtonFormField<String>(
                    initialValue: _selectedBranch,
                    decoration: InputDecoration(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      filled: true,
                      fillColor: AppColors.surfaceContainerLow,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: BorderSide.none,
                      ),
                    ),
                    items: const [
                      DropdownMenuItem(
                        value: 'Chi nhánh 1 (Q.7 - Huỳnh Tấn Phát)',
                        child: Text('Chi nhánh 1 (Q.7 - Huỳnh Tấn Phát)'),
                      ),
                      DropdownMenuItem(
                        value: 'Chi nhánh 2 (Q.8 - Phạm Thế Hiển)',
                        child: Text('Chi nhánh 2 (Q.8 - Phạm Thế Hiển)'),
                      ),
                      DropdownMenuItem(
                        value: 'Chi nhánh 3 (Bình Thạnh - Ung Văn Khiêm)',
                        child: Text('Chi nhánh 3 (Bình Thạnh - Ung Văn Khiêm)'),
                      ),
                    ],
                    onChanged: (val) {
                      if (val != null) {
                        setState(() {
                          _selectedBranch = val;
                        });
                      }
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Demo Shortcut Banner
            GestureDetector(
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const DemoCatalogScreen()),
                );
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: AppColors.primaryOrange.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.primaryOrange),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.widgets, color: AppColors.primaryOrange, size: 22),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Xem trọn bộ 22 màn hình nghiệp vụ tĩnh (Catalog Demo)',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.primaryOrange),
                      ),
                    ),
                    Icon(Icons.arrow_forward, color: AppColors.primaryOrange, size: 16),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 14),

            // Revenue and Balance Card
            GestureDetector(
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const GarageRevenueScreen()),
                );
              },
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppColors.tertiary, Color(0xFF003925)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: const [
                    BoxShadow(color: Colors.black12, blurRadius: 8, offset: Offset(0, 4)),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Số Dư Ví PayOS Khả Dụng',
                      style: TextStyle(color: Colors.white70, fontSize: 13),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      '24.850.000 đ',
                      style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        ElevatedButton.icon(
                          onPressed: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(builder: (_) => const GarageWalletPayoutScreen()),
                            );
                          },
                          icon: const Icon(Icons.account_balance_wallet, size: 16),
                          label: const Text('Rút tiền PayOS'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.white,
                            foregroundColor: AppColors.tertiary,
                            elevation: 0,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                        ),
                        const SizedBox(width: 8),
                        OutlinedButton(
                          onPressed: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(builder: (_) => const GarageRevenueScreen()),
                            );
                          },
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.white,
                            side: const BorderSide(color: Colors.white54),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          child: const Text('Xem Doanh Thu'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            const Text(
              'QUẢN LÝ ĐỘI THỢ & DỊCH VỤ GARA',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.outline),
            ),
            const SizedBox(height: 10),

            // Branches and Mechanics count (Tap to view team allocation)
            Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const TeamAllocationScreen()),
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Thợ Trực Tuyến', style: TextStyle(fontSize: 12, color: AppColors.secondary)),
                          SizedBox(height: 4),
                          Text('7 Thợ', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.tertiary)),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: GestureDetector(
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const BatchTransportManageScreen()),
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Xe Gom Vượt Ngập', style: TextStyle(fontSize: 12, color: AppColors.secondary)),
                          SizedBox(height: 4),
                          Text('2 Chuyến', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primaryOrange)),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Branch Management Tile
            ListTile(
              tileColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              leading: const Icon(Icons.business, color: Colors.blue),
              title: const Text('Quản Lý Danh Sách Chi Nhánh'),
              subtitle: const Text('3 Chi nhánh (Q.7, Q.8, Bình Thạnh)'),
              trailing: const Icon(Icons.arrow_forward_ios, size: 14),
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const BranchManagementScreen()),
                );
              },
            ),
            const SizedBox(height: 8),

            // Batch Transport Management Tile
            ListTile(
              tileColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              leading: const Icon(Icons.fire_truck, color: AppColors.primaryOrange),
              title: const Text('Quản Lý Đội Xe Gom Vượt Ngập'),
              subtitle: const Text('Xe tải nhẹ, xe ba gác máy nâng chở 4-6 xe'),
              trailing: const Icon(Icons.arrow_forward_ios, size: 14),
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const BatchTransportManageScreen()),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
