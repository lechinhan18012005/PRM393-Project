import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/constants/app_colors.dart';
import '../../core/widgets/logout_dialog.dart';
import '../../core/models/vehicle_model.dart';
import '../../core/widgets/rescue_ui.dart';
import '../../providers/vehicle_provider.dart';
import 'customer_demo_data.dart';

class VehicleProfileScreen extends StatefulWidget {
  const VehicleProfileScreen({
    super.key,
    this.selectedVehicle = 0,
    this.onSelectVehicle,
  });

  final int selectedVehicle;
  final ValueChanged<int>? onSelectVehicle;

  @override
  State<VehicleProfileScreen> createState() => _VehicleProfileScreenState();
}

class _VehicleProfileScreenState extends State<VehicleProfileScreen> {
  late int _selected;

  @override
  void initState() {
    super.initState();
    _selected = widget.selectedVehicle;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        try {
          context.read<VehicleProvider?>()?.fetchVehicles();
        } catch (_) {}
      }
    });
  }

  @override
  void didUpdateWidget(covariant VehicleProfileScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.selectedVehicle != widget.selectedVehicle) {
      setState(() {
        _selected = widget.selectedVehicle;
      });
    }
  }

  IconData _getVehicleIcon(String type) {
    switch (type.toUpperCase()) {
      case 'ELECTRIC':
        return Icons.electric_moped;
      case 'CLUTCH':
        return Icons.two_wheeler;
      case 'SCOOTER':
        return Icons.moped;
      case 'MANUAL':
      default:
        return Icons.two_wheeler;
    }
  }

  Future<void> _showAddVehicleModal(BuildContext context) async {
    final formKey = GlobalKey<FormState>();
    final plateController = TextEditingController();
    final brandController = TextEditingController();
    final modelController = TextEditingController();
    final engineController = TextEditingController(text: '150cc');
    final colorController = TextEditingController(text: 'Đen');
    String selectedType = 'SCOOTER';
    bool isDefault = false;

    final scaffoldMessenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);
    VehicleProvider? provider;
    try {
      provider = context.read<VehicleProvider?>();
    } catch (_) {}

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (bottomSheetCtx) {
        return StatefulBuilder(
          builder: (ctx, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 20,
                bottom: MediaQuery.of(bottomSheetCtx).viewInsets.bottom + 20,
              ),
              child: SingleChildScrollView(
                child: Form(
                  key: formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Thêm phương tiện mới',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close),
                            onPressed: () => Navigator.pop(bottomSheetCtx),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: plateController,
                        textCapitalization: TextCapitalization.characters,
                        decoration: const InputDecoration(
                          labelText: 'Biển số xe *',
                          hintText: 'Ví dụ: 59-B1 892.44',
                          prefixIcon: Icon(Icons.pin),
                          border: OutlineInputBorder(),
                        ),
                        validator: (v) =>
                            (v == null || v.trim().isEmpty) ? 'Vui lòng nhập biển số xe' : null,
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: brandController,
                              decoration: const InputDecoration(
                                labelText: 'Hãng xe *',
                                hintText: 'Honda, Yamaha...',
                                prefixIcon: Icon(Icons.branding_watermark),
                                border: OutlineInputBorder(),
                              ),
                              validator: (v) =>
                                  (v == null || v.trim().isEmpty) ? 'Nhập hãng xe' : null,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextFormField(
                              controller: modelController,
                              decoration: const InputDecoration(
                                labelText: 'Dòng xe *',
                                hintText: 'SH, Exciter, Wave...',
                                border: OutlineInputBorder(),
                              ),
                              validator: (v) =>
                                  (v == null || v.trim().isEmpty) ? 'Nhập dòng xe' : null,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        initialValue: selectedType,
                        decoration: const InputDecoration(
                          labelText: 'Phân loại xe',
                          prefixIcon: Icon(Icons.category),
                          border: OutlineInputBorder(),
                        ),
                        items: const [
                          DropdownMenuItem(value: 'SCOOTER', child: Text('Xe tay ga')),
                          DropdownMenuItem(value: 'MANUAL', child: Text('Xe số')),
                          DropdownMenuItem(value: 'CLUTCH', child: Text('Xe côn tay')),
                          DropdownMenuItem(value: 'ELECTRIC', child: Text('Xe máy điện')),
                        ],
                        onChanged: (val) {
                          if (val != null) {
                            setModalState(() => selectedType = val);
                          }
                        },
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: engineController,
                              decoration: const InputDecoration(
                                labelText: 'Dung tích xi-lanh',
                                hintText: '150cc',
                                border: OutlineInputBorder(),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextFormField(
                              controller: colorController,
                              decoration: const InputDecoration(
                                labelText: 'Màu sắc',
                                hintText: 'Đỏ, Đen, Trắng...',
                                border: OutlineInputBorder(),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      CheckboxListTile(
                        contentPadding: EdgeInsets.zero,
                        title: const Text('Đặt làm xe mặc định ưu tiên'),
                        value: isDefault,
                        onChanged: (val) {
                          setModalState(() => isDefault = val ?? false);
                        },
                      ),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: FilledButton.icon(
                          onPressed: () async {
                            if (!formKey.currentState!.validate()) return;
                            if (provider != null) {
                              final success = await provider.addVehicle(
                                licensePlate: plateController.text.trim(),
                                brand: brandController.text.trim(),
                                model: modelController.text.trim(),
                                vehicleType: selectedType,
                                engineCapacity: engineController.text.trim(),
                                color: colorController.text.trim(),
                                isDefault: isDefault,
                              );
                              navigator.pop();
                              scaffoldMessenger.showSnackBar(
                                SnackBar(
                                  content: Text(
                                    success
                                        ? 'Thêm phương tiện thành công!'
                                        : (provider?.errorMessage ?? 'Không thể thêm xe'),
                                  ),
                                  backgroundColor: success ? Colors.green : Colors.red,
                                ),
                              );
                            } else {
                              navigator.pop();
                              scaffoldMessenger.showSnackBar(
                                const SnackBar(
                                  content: Text('Đã lưu thông tin xe!'),
                                  backgroundColor: Colors.green,
                                ),
                              );
                            }
                          },
                          icon: const Icon(Icons.check),
                          label: const Text(
                            'Lưu phương tiện',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _confirmDelete(BuildContext context, VehicleModel v) async {
    final scaffoldMessenger = ScaffoldMessenger.of(context);
    VehicleProvider? provider;
    try {
      provider = context.read<VehicleProvider?>();
    } catch (_) {}

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Xóa phương tiện'),
        content: Text('Bạn có chắc chắn muốn xóa xe "${v.displayName}" (${v.licensePlate})?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Hủy'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Xác nhận xóa'),
          ),
        ],
      ),
    );

    if (confirm == true && provider != null) {
      final ok = await provider.deleteVehicle(v.id);
      scaffoldMessenger.showSnackBar(
        SnackBar(
          content: Text(
            ok
                ? 'Đã xóa phương tiện thành công!'
                : (provider.errorMessage ?? 'Không thể xóa xe'),
          ),
          backgroundColor: ok ? Colors.black87 : Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    VehicleProvider? vehicleProvider;
    try {
      vehicleProvider = context.watch<VehicleProvider?>();
    } catch (_) {}

    final bool hasApiVehicles = vehicleProvider != null && vehicleProvider.vehicles.isNotEmpty;
    final int count = hasApiVehicles ? vehicleProvider.vehicles.length : customerDemoVehicles.length;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Xe của tôi',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
        ),
        actions: [
          if (vehicleProvider != null)
            IconButton(
              tooltip: 'Tải lại danh sách xe',
              icon: const Icon(Icons.refresh),
              onPressed: () => vehicleProvider?.fetchVehicles(),
            ),
          IconButton(
            key: const Key('vehicle-profile-logout-btn'),
            icon: const Icon(Icons.logout, color: AppColors.error),
            tooltip: 'Đăng xuất',
            onPressed: () => showLogoutConfirmationDialog(context),
          ),
        ],
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 760),
          child: RefreshIndicator(
            onRefresh: () async {
              await vehicleProvider?.fetchVehicles();
            },
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                RescueIntro(
                  eyebrow: 'PHƯƠNG TIỆN CỦA BẠN',
                  title: 'Sẵn sàng cho hành trình',
                  description:
                      'Quản lý thông tin xe máy để tự động tính toán mức chịu ngập và cứu hộ nhanh chóng.',
                  trailing: RescueLabel(
                    '$count xe',
                    color: const Color(0xFFB9CEDB),
                  ),
                ),
                const SizedBox(height: 16),
                RescueSection(
                  'Danh sách xe',
                  action: TextButton.icon(
                    onPressed: () => _showAddVehicleModal(context),
                    icon: const Icon(Icons.add, size: 16),
                    label: const Text('Thêm xe'),
                  ),
                ),
                const SizedBox(height: 12),

                if (hasApiVehicles) ...[
                  ...vehicleProvider.vehicles.indexed.map((entry) {
                    final index = entry.$1;
                    final v = entry.$2;
                    final isSelected = (_selected == index) || (vehicleProvider?.selectedVehicle?.id == v.id);

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: RescuePanel(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: isSelected
                                        ? AppColors.primaryContainer
                                        : AppColors.surfaceContainerLow,
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Icon(
                                    _getVehicleIcon(v.vehicleType),
                                    color: isSelected
                                        ? AppColors.primary
                                        : AppColors.secondary,
                                    size: 26,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        v.displayName,
                                        style: const TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        '${v.typeDisplayName}${v.engineCapacity != null ? ' · ${v.engineCapacity}' : ''}${v.color != null ? ' · ${v.color}' : ''}',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: AppColors.secondary,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.delete_outline, color: Colors.black45, size: 20),
                                  tooltip: 'Xóa xe này',
                                  onPressed: () => _confirmDelete(context, v),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                RescueLabel(v.licensePlate, color: AppColors.secondary),
                                if (v.isDefault)
                                  const RescueLabel('Xe mặc định', color: Colors.blueAccent),
                                if (isSelected)
                                  const RescueLabel('Đang chọn', color: AppColors.primary),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              v.clearanceEstimate,
                              style: const TextStyle(
                                fontSize: 11,
                                color: AppColors.secondary,
                              ),
                            ),
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                Expanded(
                                  child: OutlinedButton.icon(
                                    key: ValueKey('select-vehicle-$index'),
                                    onPressed: isSelected
                                        ? null
                                        : () {
                                            setState(() => _selected = index);
                                            vehicleProvider?.selectVehicle(v);
                                            widget.onSelectVehicle?.call(index);
                                          },
                                    icon: Icon(
                                      isSelected
                                          ? Icons.check_circle_outline
                                          : Icons.touch_app_outlined,
                                      size: 16,
                                    ),
                                    label: Text(
                                      isSelected ? 'Xe đang chọn' : 'Dùng xe này',
                                    ),
                                  ),
                                ),
                                if (!v.isDefault) ...[
                                  const SizedBox(width: 8),
                                  IconButton.outlined(
                                    tooltip: 'Đặt làm xe mặc định',
                                    icon: const Icon(Icons.star_border, size: 18),
                                    onPressed: () async {
                                      final scaffoldMessenger = ScaffoldMessenger.of(context);
                                      final ok = await vehicleProvider?.setDefaultVehicle(v.id);
                                      if (ok == true) {
                                        scaffoldMessenger.showSnackBar(
                                          const SnackBar(
                                            content: Text('Đã cập nhật xe mặc định thành công!'),
                                          ),
                                        );
                                      }
                                    },
                                  ),
                                ],
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                ] else ...[
                  // Chế độ demo / fallback
                  ...customerDemoVehicles.indexed.map((entry) {
                    final index = entry.$1;
                    final v = entry.$2;
                    final isSelected = index == _selected;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: RescuePanel(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: isSelected
                                        ? AppColors.primaryContainer
                                        : AppColors.surfaceContainerLow,
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Icon(
                                    Icons.two_wheeler,
                                    color: isSelected
                                        ? AppColors.primary
                                        : AppColors.secondary,
                                    size: 25,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        v.name,
                                        style: const TextStyle(
                                          fontSize: 15,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                      const SizedBox(height: 5),
                                      Text(
                                        v.type,
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: AppColors.secondary,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 14),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                RescueLabel(v.plate, color: AppColors.secondary),
                                if (isSelected) const RescueLabel('Đang chọn'),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Text(
                              v.clearance,
                              style: const TextStyle(
                                fontSize: 11,
                                color: AppColors.secondary,
                              ),
                            ),
                            const SizedBox(height: 12),
                            SizedBox(
                              width: double.infinity,
                              child: OutlinedButton.icon(
                                key: ValueKey('select-vehicle-$index'),
                                onPressed: isSelected
                                    ? null
                                    : () {
                                        setState(() => _selected = index);
                                        widget.onSelectVehicle?.call(index);
                                      },
                                icon: Icon(
                                  isSelected
                                      ? Icons.check_circle_outline
                                      : Icons.touch_app_outlined,
                                  size: 17,
                                ),
                                label: Text(
                                  isSelected ? 'Xe đang chọn' : 'Dùng xe này',
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                ],

                const SizedBox(height: 8),
                const RescuePanel(
                  child: RescueInfo(
                    icon: Icons.cloud_done_outlined,
                    title: 'Đồng bộ đám mây',
                    value: 'Dữ liệu phương tiện được lưu trữ bảo mật và đồng bộ trên tài khoản của bạn, tự động điền khi tạo yêu cầu cứu hộ.',
                  ),
                ),
                const SizedBox(height: 16),
                FilledButton.tonalIcon(
                  key: const Key('logout-button-vehicle-profile'),
                  onPressed: () => showLogoutConfirmationDialog(context),
                  icon: const Icon(Icons.logout, color: AppColors.error),
                  label: const Text(
                    'Đăng xuất',
                    style: TextStyle(
                      color: AppColors.error,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.error.withValues(alpha: 0.1),
                    minimumSize: const Size.fromHeight(48),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    ),
  );
  }
}
