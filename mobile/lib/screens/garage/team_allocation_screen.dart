import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/constants/app_colors.dart';
import '../../core/models/mechanic_staff_model.dart';
import '../../providers/garage_provider.dart';
import '../../providers/mechanic_provider.dart';

class TeamAllocationScreen extends StatefulWidget {
  const TeamAllocationScreen({super.key});

  @override
  State<TeamAllocationScreen> createState() => _TeamAllocationScreenState();
}

class _TeamAllocationScreenState extends State<TeamAllocationScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<MechanicProvider>().fetchMechanics();
      context.read<GarageProvider>().fetchBranches();
    });
  }

  void _showAddMechanicDialog(BuildContext context) {
    final usernameCtrl = TextEditingController();
    final nameCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final passwordCtrl = TextEditingController(text: 'Password@123');
    final shiftCtrl = TextEditingController(text: 'Ca 2: Chiều tối (14:00 - 22:00)');
    final specialityCtrl = TextEditingController(text: 'Sấy bugi, xả nước buồng đốt');
    final branches = context.read<GarageProvider>().branches;
    int? selectedBranchId = branches.isNotEmpty ? branches.first.id : null;
    final formKey = GlobalKey<FormState>();

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text('Thêm Nhân Viên Thợ Mới', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          content: Form(
            key: formKey,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextFormField(
                    controller: usernameCtrl,
                    decoration: const InputDecoration(labelText: 'Tên đăng nhập *', hintText: 'tech_08'),
                    validator: (v) => v == null || v.trim().isEmpty ? 'Nhập tên đăng nhập' : null,
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: nameCtrl,
                    decoration: const InputDecoration(labelText: 'Họ và tên thợ *', hintText: 'Nguyễn Văn Nam'),
                    validator: (v) => v == null || v.trim().isEmpty ? 'Nhập họ tên' : null,
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: phoneCtrl,
                    decoration: const InputDecoration(labelText: 'Số điện thoại *', hintText: '0908.123.456'),
                    keyboardType: TextInputType.phone,
                    validator: (v) => v == null || v.trim().isEmpty ? 'Nhập SĐT' : null,
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: passwordCtrl,
                    decoration: const InputDecoration(labelText: 'Mật khẩu khởi tạo *'),
                    obscureText: true,
                    validator: (v) => v == null || v.length < 6 ? 'Tối thiểu 6 ký tự' : null,
                  ),
                  const SizedBox(height: 8),
                  if (branches.isNotEmpty) ...[
                    DropdownButtonFormField<int>(
                      value: selectedBranchId,
                      decoration: const InputDecoration(labelText: 'Phân công vào Chi nhánh'),
                      items: branches
                          .map((b) => DropdownMenuItem<int>(
                                value: b.id,
                                child: Text(b.branchName, style: const TextStyle(fontSize: 12)),
                              ))
                          .toList(),
                      onChanged: (v) => setModalState(() => selectedBranchId = v),
                    ),
                    const SizedBox(height: 8),
                  ],
                  TextFormField(
                    controller: shiftCtrl,
                    decoration: const InputDecoration(labelText: 'Ca trực chiến'),
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: specialityCtrl,
                    decoration: const InputDecoration(labelText: 'Chuyên môn / Kỹ năng'),
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
                  final success = await context.read<MechanicProvider>().createMechanic(
                        username: usernameCtrl.text.trim(),
                        fullName: nameCtrl.text.trim(),
                        phone: phoneCtrl.text.trim(),
                        password: passwordCtrl.text,
                        branchId: selectedBranchId,
                        shiftName: shiftCtrl.text.trim(),
                        speciality: specialityCtrl.text.trim(),
                      );
                  if (ctx.mounted) Navigator.of(ctx).pop();
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(success ? 'Thêm thợ thành công!' : 'Thêm thợ thất bại'),
                        backgroundColor: success ? Colors.green : Colors.red,
                      ),
                    );
                  }
                }
              },
              child: const Text('Tạo Tài Khoản Thợ'),
            ),
          ],
        ),
      ),
    );
  }

  void _showReallocateDialog(BuildContext context, MechanicStaffModel staff) {
    final branches = context.read<GarageProvider>().branches;
    int? selectedBranchId = staff.branchId ?? (branches.isNotEmpty ? branches.first.id : null);
    final shiftCtrl = TextEditingController(text: staff.shiftName ?? 'Ca 2: Chiều tối');

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text('Điều Động: ${staff.fullName}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (branches.isNotEmpty)
                DropdownButtonFormField<int>(
                  value: selectedBranchId,
                  decoration: const InputDecoration(labelText: 'Chuyển sang Chi nhánh'),
                  items: branches
                      .map((b) => DropdownMenuItem<int>(
                            value: b.id,
                            child: Text(b.branchName, style: const TextStyle(fontSize: 12)),
                          ))
                      .toList(),
                  onChanged: (v) => setModalState(() => selectedBranchId = v),
                ),
              const SizedBox(height: 10),
              TextField(
                controller: shiftCtrl,
                decoration: const InputDecoration(labelText: 'Ca trực chiến'),
              ),
            ],
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
                final success = await context.read<MechanicProvider>().allocateBranch(
                      staffId: staff.id,
                      branchId: selectedBranchId,
                      shiftName: shiftCtrl.text.trim(),
                    );
                if (ctx.mounted) Navigator.of(ctx).pop();
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(success ? 'Điều động thợ thành công!' : 'Điều động thất bại'),
                      backgroundColor: success ? Colors.green : Colors.red,
                    ),
                  );
                }
              },
              child: const Text('Lưu Điều Động'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final mechProvider = context.watch<MechanicProvider>();
    final mechanics = mechProvider.mechanics;

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text(
          'Phân công thợ',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => mechProvider.fetchMechanics(),
          ),
        ],
      ),
      body: mechProvider.isLoading && mechanics.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: () => mechProvider.fetchMechanics(),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Status overview
                    Container(
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
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          _buildStatItem('Tổng Số Thợ', '${mechProvider.totalCount}', Colors.black87),
                          _buildStatItem('Đang Trực Tuyến', '${mechProvider.onlineCount}', Colors.green),
                          _buildStatItem('Đang Cứu Hộ', '${mechProvider.busyCount}', AppColors.primaryOrange),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Expanded(
                          child: Text(
                            'Thợ trong ca trực chiến',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: AppColors.outline,
                            ),
                          ),
                        ),
                        TextButton.icon(
                          onPressed: () => _showAddMechanicDialog(context),
                          icon: const Icon(Icons.person_add, size: 16),
                          label: const Text('Thêm Thợ', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                          style: TextButton.styleFrom(foregroundColor: AppColors.primaryOrange),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),

                    if (mechanics.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
                        child: Column(
                          children: [
                            const Icon(Icons.engineering, size: 48, color: Colors.grey),
                            const SizedBox(height: 8),
                            const Text('Chưa có nhân viên thợ nào được tạo.', style: TextStyle(color: Colors.grey)),
                            const SizedBox(height: 12),
                            ElevatedButton.icon(
                              onPressed: () => _showAddMechanicDialog(context),
                              icon: const Icon(Icons.add),
                              label: const Text('Thêm thợ đầu tiên'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.primaryOrange,
                                foregroundColor: Colors.white,
                              ),
                            ),
                          ],
                        ),
                      )
                    else
                      ...mechanics.map((m) => _buildMechanicCard(context, m)),

                    const SizedBox(height: 24),
                    ElevatedButton.icon(
                      onPressed: () => _showAddMechanicDialog(context),
                      icon: const Icon(Icons.add_circle, size: 20),
                      label: const Text(
                        '+ Thêm Nhân Viên Cứu Hộ Mới',
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

  Widget _buildStatItem(String label, String value, Color color) {
    return Expanded(
      child: Column(
        children: [
          Text(
            label,
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 10, color: AppColors.secondary),
          ),
          const SizedBox(height: 2),
          Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
        ],
      ),
    );
  }

  Widget _buildMechanicCard(BuildContext context, MechanicStaffModel staff) {
    Color statusColor;
    String statusText;
    if (staff.isOnline) {
      statusColor = Colors.green;
      statusText = 'Trực tuyến (Online)';
    } else if (staff.isBusy) {
      statusColor = Colors.orange;
      statusText = 'Đang cứu hộ';
    } else {
      statusColor = Colors.grey;
      statusText = 'Nghỉ tạm thời (Offline)';
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: const [
          BoxShadow(color: Colors.black12, blurRadius: 2, offset: Offset(0, 1)),
        ],
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 20,
            backgroundColor: statusColor.withValues(alpha: 0.1),
            child: Icon(Icons.person, color: statusColor, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      staff.fullName,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                    Text(
                      '⭐ ${staff.ratingAvg.toStringAsFixed(1)}',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.amber),
                    ),
                  ],
                ),
                Text(
                  '${staff.branchName ?? "Chưa phân chi nhánh"} • ${staff.shiftName ?? "Ca linh hoạt"}',
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppColors.secondary,
                  ),
                ),
                Text(
                  statusText,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: statusColor,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.sync_alt, size: 18, color: AppColors.secondary),
            tooltip: 'Điều động sang chi nhánh khác',
            onPressed: () => _showReallocateDialog(context, staff),
          ),
        ],
      ),
    );
  }
}
