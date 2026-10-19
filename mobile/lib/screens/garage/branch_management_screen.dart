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
    bool isSubmitting = false;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => StatefulBuilder(
        builder: (dialogCtx, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Row(
            children: [
              Icon(Icons.add_business, color: AppColors.primaryOrange, size: 22),
              SizedBox(width: 8),
              Text(
                'Thêm Chi Nhánh Mới',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
            ],
          ),
          content: Form(
            key: formKey,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextFormField(
                    controller: nameCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Tên chi nhánh *',
                      hintText: 'VD: Trạm Phản Ứng Nhanh Trần Xuân Soạn',
                      prefixIcon: Icon(Icons.storefront, size: 20),
                    ),
                    validator: (v) =>
                        v == null || v.trim().isEmpty ? 'Vui lòng nhập tên chi nhánh' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: hotlineCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Hotline chi nhánh *',
                      hintText: '0903.111.222',
                      prefixIcon: Icon(Icons.phone, size: 20),
                    ),
                    keyboardType: TextInputType.phone,
                    validator: (v) =>
                        v == null || v.trim().isEmpty ? 'Vui lòng nhập hotline' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: addressCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Địa chỉ cụ thể *',
                      hintText: '120 Trần Xuân Soạn, Tân Hưng, Quận 7',
                      prefixIcon: Icon(Icons.location_on, size: 20),
                    ),
                    validator: (v) =>
                        v == null || v.trim().isEmpty ? 'Vui lòng nhập địa chỉ' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: vehiclesCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Phương tiện cứu hộ',
                      hintText: '1 Xe tải nhẹ + 2 Xe máy chuyên dụng',
                      prefixIcon: Icon(Icons.fire_truck, size: 20),
                    ),
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: isSubmitting ? null : () => Navigator.of(ctx).pop(),
              child: const Text('Hủy'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primaryOrange,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              ),
              onPressed: isSubmitting
                  ? null
                  : () async {
                      if (formKey.currentState?.validate() ?? false) {
                        setDialogState(() {
                          isSubmitting = true;
                        });

                        final branchName = nameCtrl.text.trim();
                        final address = addressCtrl.text.trim();
                        final phone = hotlineCtrl.text.trim();
                        final vehicles = vehiclesCtrl.text.trim();

                        final success = await context.read<GarageProvider>().createBranch(
                              branchName: branchName,
                              address: address,
                              latitude: 10.7380 + (0.005 * (branchName.length % 7)),
                              longitude: 106.7210 + (0.005 * (address.length % 7)),
                              phoneNumber: phone,
                              rescueVehicles: vehicles.isNotEmpty
                                  ? vehicles
                                  : '1 Xe tải nhẹ + 2 Xe máy chuyên dụng',
                            );

                        if (ctx.mounted) Navigator.of(ctx).pop();
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                success
                                    ? 'Thêm chi nhánh "$branchName" thành công!'
                                    : 'Thêm chi nhánh thất bại',
                              ),
                              backgroundColor: success ? Colors.green : Colors.red,
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        }
                      }
                    },
              child: isSubmitting
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Text(
                      'Lưu',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
            ),
          ],
        ),
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
          'Quản lý chi nhánh',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        foregroundColor: AppColors.onSurface,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Làm mới danh sách',
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
                            'Danh sách các chi nhánh của gara',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: AppColors.outline,
                              letterSpacing: 0.3,
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppColors.primaryContainer.withValues(alpha: 0.3),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            '${branches.length} Chi nhánh',
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primaryOrange,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    if (branches.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(28),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Column(
                          children: [
                            const Icon(Icons.storefront, size: 52, color: Colors.grey),
                            const SizedBox(height: 10),
                            const Text(
                              'Chưa có chi nhánh nào được cấu hình.',
                              style: TextStyle(color: Colors.grey, fontSize: 13),
                            ),
                            const SizedBox(height: 14),
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

                    const SizedBox(height: 16),

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
                        elevation: 2,
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildBranchCard(BuildContext context, BranchModel branch) {
    final statusColor = branch.isOpen ? const Color(0xFF2E7D32) : const Color(0xFFC62828);
    final statusBg = branch.isOpen ? const Color(0xFFE8F5E9) : const Color(0xFFFFEBEE);
    final statusBorder = branch.isOpen ? const Color(0xFF81C784) : const Color(0xFFE57373);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0A000000),
            blurRadius: 6,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  branch.branchName,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                    color: AppColors.onSurface,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              // Instant reactive status chip
              InkWell(
                onTap: () async {
                  final newStatus = !branch.isOpen;
                  final ok = await context
                      .read<GarageProvider>()
                      .toggleBranchStatus(branch.id, newStatus);
                  if (context.mounted && ok) {
                    ScaffoldMessenger.of(context).hideCurrentSnackBar();
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          'Đã chuyển "${branch.branchName}" sang: ${newStatus ? "Đang hoạt động" : "Tạm đóng"}',
                        ),
                        backgroundColor:
                            newStatus ? const Color(0xFF2E7D32) : const Color(0xFFC62828),
                        duration: const Duration(seconds: 2),
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                  }
                },
                borderRadius: BorderRadius.circular(8),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: statusBg,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: statusBorder, width: 1.2),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        branch.isOpen ? Icons.check_circle : Icons.pause_circle,
                        size: 14,
                        color: statusColor,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        branch.isOpen ? 'Đang hoạt động' : 'Tạm đóng',
                        style: TextStyle(
                          color: statusColor,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Address
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(
                Icons.location_on,
                size: 15,
                color: AppColors.secondary,
              ),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  branch.address,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.secondary,
                    height: 1.3,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),

          // Hotline
          Row(
            children: [
              const Icon(Icons.phone, size: 14, color: AppColors.secondary),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  'Hotline: ${branch.phoneNumber != null && branch.phoneNumber!.isNotEmpty ? branch.phoneNumber : "0903.111.222"}',
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.secondary,
                    fontWeight: FontWeight.w500,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          const Divider(height: 1),
          const SizedBox(height: 10),

          // On-duty technicians badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: const Color(0xFFFFF3E0),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFFFFB74D), width: 1),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.engineering, size: 15, color: Color(0xFFE65100)),
                const SizedBox(width: 5),
                Text(
                  'Thợ trực chiến: ${branch.mechanicsCount} thợ',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFFE65100),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 6),

          // Vehicle info
          Row(
            children: [
              const Icon(Icons.two_wheeler, size: 14, color: AppColors.secondary),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  'Phương tiện: ${branch.rescueVehicles ?? "1 Xe tải nhẹ + 2 Xe máy"}',
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppColors.secondary,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
