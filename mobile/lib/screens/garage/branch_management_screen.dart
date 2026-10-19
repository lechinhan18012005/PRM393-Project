import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/constants/app_colors.dart';
import '../../core/models/branch_model.dart';
import '../../providers/garage_provider.dart';

class BranchManagementScreen extends StatefulWidget {
  const BranchManagementScreen({super.key});

  @override
  State<BranchManagementScreen> createState() => _BranchManagementScreenState();
}

class _BranchManagementScreenState extends State<BranchManagementScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<GarageProvider>().fetchBranches();
    });
  }

  void _showAddBranchDialog(BuildContext context) {
    final nameCtrl = TextEditingController();
    final addressCtrl = TextEditingController();
    final hotlineCtrl = TextEditingController();
    final vehiclesCtrl = TextEditingController(text: '1 Xe tải nhẹ + 2 Xe máy chuyên dụng');
    final formKey = GlobalKey<FormState>();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Thêm Chi Nhánh Mới', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        content: Form(
          key: formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: nameCtrl,
                  decoration: const InputDecoration(labelText: 'Tên chi nhánh *', hintText: 'VD: Chi nhánh 4 (Nhà Bè)'),
                  validator: (v) => v == null || v.trim().isEmpty ? 'Vui lòng nhập tên chi nhánh' : null,
                ),
                const SizedBox(height: 10),
                TextFormField(
                  controller: addressCtrl,
                  decoration: const InputDecoration(labelText: 'Địa chỉ cụ thể *', hintText: 'VD: 85 Huỳnh Tấn Phát, Nhà Bè'),
                  validator: (v) => v == null || v.trim().isEmpty ? 'Vui lòng nhập địa chỉ' : null,
                ),
                const SizedBox(height: 10),
                TextFormField(
                  controller: hotlineCtrl,
                  decoration: const InputDecoration(labelText: 'Hotline chi nhánh', hintText: '0903.111.222'),
                  keyboardType: TextInputType.phone,
                ),
                const SizedBox(height: 10),
                TextFormField(
                  controller: vehiclesCtrl,
                  decoration: const InputDecoration(labelText: 'Phương tiện cứu hộ', hintText: 'Xe bán tải, xe máy...'),
                ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Hủy'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primaryOrange,
              foregroundColor: Colors.white,
            ),
            onPressed: () async {
              if (formKey.currentState?.validate() ?? false) {
                final success = await context.read<GarageProvider>().createBranch(
                  branchName: nameCtrl.text.trim(),
                  address: addressCtrl.text.trim(),
                  latitude: 10.7380 + (0.01 * (nameCtrl.text.length % 5)),
                  longitude: 106.7210 + (0.01 * (addressCtrl.text.length % 5)),
                  phoneNumber: hotlineCtrl.text.trim(),
                  rescueVehicles: vehiclesCtrl.text.trim(),
                );
                if (ctx.mounted) Navigator.of(ctx).pop();
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(success ? 'Thêm chi nhánh thành công!' : 'Thêm chi nhánh thất bại'),
                      backgroundColor: success ? Colors.green : Colors.red,
                    ),
                  );
                }
              }
            },
            child: const Text('Lưu Chi Nhánh'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final garageProvider = context.watch<GarageProvider>();
    final branches = garageProvider.branches;

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text(
          'Chi nhánh',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => garageProvider.fetchBranches(),
          ),
        ],
      ),
      body: garageProvider.isLoading && branches.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: () => garageProvider.fetchBranches(),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Expanded(
                          child: Text(
                            'Danh sách chi nhánh',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: AppColors.outline,
                            ),
                          ),
                        ),
                        Text(
                          '${branches.length} Chi nhánh',
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.secondary),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),

                    if (branches.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Column(
                          children: [
                            const Icon(Icons.storefront, size: 48, color: Colors.grey),
                            const SizedBox(height: 8),
                            const Text('Chưa có chi nhánh nào được cấu hình.', style: TextStyle(color: Colors.grey)),
                            const SizedBox(height: 12),
                            ElevatedButton.icon(
                              onPressed: () => _showAddBranchDialog(context),
                              icon: const Icon(Icons.add),
                              label: const Text('Thêm chi nhánh đầu tiên'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.primaryOrange,
                                foregroundColor: Colors.white,
                              ),
                            ),
                          ],
                        ),
                      )
                    else
                      ...branches.map((b) => Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: _buildBranchCard(context, b),
                          )),

                    const SizedBox(height: 20),

                    ElevatedButton.icon(
                      onPressed: () => _showAddBranchDialog(context),
                      icon: const Icon(Icons.add_business, size: 20),
                      label: const Text(
                        '+ Thêm Chi Nhánh Mới',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primaryOrange,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildBranchCard(BuildContext context, BranchModel branch) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(
            color: Color(0x05000000),
            blurRadius: 4,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  branch.branchName,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
              ),
              InkWell(
                onTap: () {
                  context.read<GarageProvider>().toggleBranchStatus(branch.id, !branch.isOpen);
                },
                borderRadius: BorderRadius.circular(6),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: branch.isOpen ? Colors.green.shade50 : Colors.red.shade50,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(
                      color: branch.isOpen ? Colors.green.shade300 : Colors.red.shade300,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        branch.isOpen ? Icons.check_circle : Icons.pause_circle,
                        size: 12,
                        color: branch.isOpen ? Colors.green.shade800 : Colors.red.shade800,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        branch.isOpen ? 'Đang hoạt động' : 'Tạm đóng',
                        style: TextStyle(
                          color: branch.isOpen ? Colors.green.shade800 : Colors.red.shade800,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              const Icon(
                Icons.location_on,
                size: 14,
                color: AppColors.secondary,
              ),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  branch.address,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.secondary,
                  ),
                ),
              ),
            ],
          ),
          if (branch.phoneNumber != null && branch.phoneNumber!.isNotEmpty) ...[
            const SizedBox(height: 4),
            Row(
              children: [
                const Icon(Icons.phone, size: 14, color: AppColors.secondary),
                const SizedBox(width: 4),
                Text(
                  'Hotline: ${branch.phoneNumber}',
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.secondary,
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: 10),
          const Divider(),
          const SizedBox(height: 4),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            alignment: WrapAlignment.spaceBetween,
            children: [
              Text(
                'Nhân sự: ${branch.mechanicsCount} Thợ cơ động',
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                'Phương tiện: ${branch.rescueVehicles ?? "Xe cơ động"}',
                style: const TextStyle(
                  fontSize: 11,
                  color: AppColors.secondary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
