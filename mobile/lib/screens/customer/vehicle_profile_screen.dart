import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/constants/app_colors.dart';
import '../../core/models/vehicle_model.dart';
import '../../core/widgets/rescue_ui.dart';
import '../../providers/vehicle_provider.dart';

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
  // Danh sách gợi ý hãng xe phổ biến
  static const List<String> _popularBrands = [
    'Honda',
    'Yamaha',
    'Piaggio',
    'VinFast',
    'Suzuki',
    'SYM',
  ];

  // Danh sách gợi ý dung tích phổ biến
  static const List<String> _popularCapacities = [
    '50cc',
    '110cc',
    '125cc',
    '150cc',
    '160cc',
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        try {
          context.read<VehicleProvider?>()?.fetchVehicles();
        } catch (_) {}
      }
    });
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

  // Regex kiểm tra định dạng biển số xe máy Việt Nam linh hoạt
  String? _validateLicensePlate(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Vui lòng nhập biển số xe';
    }
    final clean = value.trim().toUpperCase();
    // Chấp nhận các dạng: 59-B1 892.44, 29A1-123.45, 43D1 12345, 60-B8-8888, v.v.
    final plateRegex = RegExp(
      r'^[0-9]{2}[-\s]?[A-Z0-9]{1,2}[-\s]?[0-9]{3,5}(\.[0-9]{2})?$',
    );
    if (!plateRegex.hasMatch(clean)) {
      return 'Biển số chưa đúng định dạng (Ví dụ: 59-B1 892.44)';
    }
    return null;
  }

  Future<void> _showVehicleFormModal(
    BuildContext context, {
    VehicleModel? existing,
  }) async {
    final isEdit = existing != null;
    final formKey = GlobalKey<FormState>();
    final plateController = TextEditingController(
      text: existing?.licensePlate ?? '',
    );
    final brandController = TextEditingController(text: existing?.brand ?? '');
    final modelController = TextEditingController(text: existing?.model ?? '');
    final engineController = TextEditingController(
      text: existing?.engineCapacity ?? '',
    );
    final colorController = TextEditingController(text: existing?.color ?? '');
    String selectedType = existing?.vehicleType ?? 'SCOOTER';
    bool isDefault = existing?.isDefault ?? false;

    bool isSubmitting = false;
    String? formError;

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
                          Text(
                            isEdit
                                ? 'Chỉnh sửa phương tiện'
                                : 'Thêm phương tiện mới',
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close),
                            onPressed: isSubmitting
                                ? null
                                : () => Navigator.pop(bottomSheetCtx),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      if (formError != null) ...[
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(12),
                          margin: const EdgeInsets.only(bottom: 12),
                          decoration: BoxDecoration(
                            color: Colors.red.shade50,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.red.shade200),
                          ),
                          child: Row(
                            children: [
                              const Icon(
                                Icons.error_outline,
                                color: AppColors.error,
                                size: 20,
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  formError!,
                                  style: const TextStyle(
                                    color: AppColors.error,
                                    fontSize: 13,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],

                      TextFormField(
                        controller: plateController,
                        textCapitalization: TextCapitalization.characters,
                        decoration: const InputDecoration(
                          labelText: 'Biển số xe *',
                          hintText: 'Ví dụ: 59-B1 892.44',
                          prefixIcon: Icon(Icons.pin),
                          border: OutlineInputBorder(),
                        ),
                        validator: _validateLicensePlate,
                      ),
                      const SizedBox(height: 12),

                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: brandController,
                              textCapitalization: TextCapitalization.words,
                              decoration: const InputDecoration(
                                labelText: 'Hãng xe *',
                                hintText: 'Honda, Yamaha...',
                                prefixIcon: Icon(
                                  Icons.branding_watermark_outlined,
                                ),
                                border: OutlineInputBorder(),
                              ),
                              validator: (v) => (v == null || v.trim().isEmpty)
                                  ? 'Nhập hãng xe'
                                  : null,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextFormField(
                              controller: modelController,
                              textCapitalization: TextCapitalization.words,
                              decoration: const InputDecoration(
                                labelText: 'Dòng xe *',
                                hintText: 'SH, Exciter, Wave...',
                                prefixIcon: Icon(Icons.two_wheeler),
                                border: OutlineInputBorder(),
                              ),
                              validator: (v) => (v == null || v.trim().isEmpty)
                                  ? 'Nhập dòng xe'
                                  : null,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),

                      // Gợi ý chọn nhanh hãng xe
                      Wrap(
                        spacing: 6,
                        runSpacing: 4,
                        children: _popularBrands.map((b) {
                          return ActionChip(
                            visualDensity: VisualDensity.compact,
                            label: Text(
                              b,
                              style: const TextStyle(fontSize: 11),
                            ),
                            onPressed: () {
                              setModalState(() {
                                brandController.text = b;
                              });
                            },
                          );
                        }).toList(),
                      ),
                      const SizedBox(height: 10),

                      DropdownButtonFormField<String>(
                        value: selectedType,
                        decoration: const InputDecoration(
                          labelText: 'Phân loại xe',
                          prefixIcon: Icon(Icons.category),
                          border: OutlineInputBorder(),
                        ),
                        items: const [
                          DropdownMenuItem(
                            value: 'SCOOTER',
                            child: Text('Xe tay ga'),
                          ),
                          DropdownMenuItem(
                            value: 'MANUAL',
                            child: Text('Xe số'),
                          ),
                          DropdownMenuItem(
                            value: 'CLUTCH',
                            child: Text('Xe côn tay'),
                          ),
                          DropdownMenuItem(
                            value: 'ELECTRIC',
                            child: Text('Xe máy điện'),
                          ),
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
                              keyboardType: TextInputType.text,
                              decoration: const InputDecoration(
                                labelText: 'Dung tích xi-lanh',
                                hintText: '110cc, 150cc...',
                                border: OutlineInputBorder(),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextFormField(
                              controller: colorController,
                              textCapitalization: TextCapitalization.words,
                              decoration: const InputDecoration(
                                labelText: 'Màu sắc',
                                hintText: 'Đỏ, Đen, Trắng...',
                                border: OutlineInputBorder(),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),

                      // Gợi ý nhanh dung tích
                      Wrap(
                        spacing: 6,
                        runSpacing: 4,
                        children: _popularCapacities.map((cap) {
                          return ActionChip(
                            visualDensity: VisualDensity.compact,
                            label: Text(
                              cap,
                              style: const TextStyle(fontSize: 11),
                            ),
                            onPressed: () {
                              setModalState(() {
                                engineController.text = cap;
                              });
                            },
                          );
                        }).toList(),
                      ),
                      const SizedBox(height: 8),

                      CheckboxListTile(
                        contentPadding: EdgeInsets.zero,
                        title: const Text('Đặt làm xe mặc định ưu tiên'),
                        subtitle: const Text(
                          'Tự động chọn khi bạn đặt cứu hộ vượt ngập',
                          style: TextStyle(
                            fontSize: 11,
                            color: AppColors.secondary,
                          ),
                        ),
                        value: isDefault,
                        onChanged: isSubmitting
                            ? null
                            : (val) {
                                setModalState(() => isDefault = val ?? false);
                              },
                      ),
                      const SizedBox(height: 16),

                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: FilledButton(
                          onPressed: isSubmitting
                              ? null
                              : () async {
                                  if (!formKey.currentState!.validate()) return;
                                  if (provider == null) return;

                                  setModalState(() {
                                    isSubmitting = true;
                                    formError = null;
                                  });

                                  final success = isEdit
                                      ? await provider.updateVehicle(
                                          existing.id,
                                          licensePlate: plateController.text
                                              .trim()
                                              .toUpperCase(),
                                          brand: brandController.text.trim(),
                                          model: modelController.text.trim(),
                                          vehicleType: selectedType,
                                          engineCapacity:
                                              engineController.text
                                                  .trim()
                                                  .isNotEmpty
                                              ? engineController.text.trim()
                                              : null,
                                          color:
                                              colorController.text
                                                  .trim()
                                                  .isNotEmpty
                                              ? colorController.text.trim()
                                              : null,
                                          isDefault: isDefault,
                                        )
                                      : await provider.addVehicle(
                                          licensePlate: plateController.text
                                              .trim()
                                              .toUpperCase(),
                                          brand: brandController.text.trim(),
                                          model: modelController.text.trim(),
                                          vehicleType: selectedType,
                                          engineCapacity:
                                              engineController.text
                                                  .trim()
                                                  .isNotEmpty
                                              ? engineController.text.trim()
                                              : null,
                                          color:
                                              colorController.text
                                                  .trim()
                                                  .isNotEmpty
                                              ? colorController.text.trim()
                                              : null,
                                          isDefault: isDefault,
                                        );

                                  if (success) {
                                    navigator.pop();
                                    scaffoldMessenger.showSnackBar(
                                      SnackBar(
                                        content: Text(
                                          isEdit
                                              ? 'Cập nhật phương tiện thành công!'
                                              : 'Thêm phương tiện mới thành công!',
                                        ),
                                        backgroundColor: Colors.green,
                                      ),
                                    );
                                  } else {
                                    setModalState(() {
                                      isSubmitting = false;
                                      formError = provider?.errorMessage ?? 'Không thể lưu phương tiện. Vui lòng kiểm tra lại!';
                                    });
                                  }
                                },
                          child: isSubmitting
                              ? const SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Icon(Icons.check, size: 20),
                                    const SizedBox(width: 8),
                                    Text(
                                      isEdit
                                          ? 'Cập nhật phương tiện'
                                          : 'Lưu phương tiện',
                                      style: const TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ],
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
        content: Text(
          'Bạn có chắc chắn muốn xóa xe "${v.displayName}" (${v.licensePlate})?',
        ),
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

    final bool isLoading = vehicleProvider?.isLoading ?? false;
    final String? errorMessage = vehicleProvider?.errorMessage;
    final vehicles = vehicleProvider?.vehicles ?? const <VehicleModel>[];
    final int count = vehicles.length;

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
                    description: 'Quản lý thông tin xe máy để tự động tính toán mức chịu ngập và cứu hộ nhanh chóng.',
                    trailing: RescueLabel(
                      '$count xe',
                      color: const Color(0xFFB9CEDB),
                    ),
                  ),
                  const SizedBox(height: 16),
                  RescueSection(
                    'Danh sách xe',
                    action: TextButton.icon(
                      onPressed: () => _showVehicleFormModal(context),
                      icon: const Icon(Icons.add, size: 16),
                      label: const Text('Thêm xe'),
                    ),
                  ),
                  const SizedBox(height: 12),

                  if (isLoading && vehicles.isEmpty) ...[
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 36),
                      child: Center(child: CircularProgressIndicator()),
                    ),
                  ] else if (errorMessage != null && vehicles.isEmpty) ...[
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: RescuePanel(
                        child: Column(
                          children: [
                            const Icon(
                              Icons.error_outline,
                              color: AppColors.error,
                              size: 36,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Không thể tải danh sách phương tiện: $errorMessage',
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                fontSize: 13,
                                color: AppColors.error,
                              ),
                            ),
                            const SizedBox(height: 12),
                            OutlinedButton.icon(
                              onPressed: () => vehicleProvider?.fetchVehicles(),
                              icon: const Icon(Icons.refresh, size: 16),
                              label: const Text('Thử lại'),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ] else if (vehicles.isEmpty) ...[
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: RescuePanel(
                        child: Center(
                          child: Column(
                            children: [
                              const SizedBox(height: 8),
                              const Icon(
                                Icons.two_wheeler_outlined,
                                size: 48,
                                color: AppColors.secondary,
                              ),
                              const SizedBox(height: 12),
                              const Text(
                                'Bạn chưa lưu xe nào',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(height: 6),
                              const Text(
                                'Thêm xe máy để hệ thống tự động tính toán mức ngập và hỗ trợ điều phối cứu hộ kịp thời.',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 13,
                                  color: AppColors.secondary,
                                ),
                              ),
                              const SizedBox(height: 16),
                              FilledButton.icon(
                                onPressed: () => _showVehicleFormModal(context),
                                icon: const Icon(Icons.add),
                                label: const Text('Thêm phương tiện ngay'),
                              ),
                              const SizedBox(height: 8),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ] else ...[
                    ...vehicles.indexed.map((entry) {
                      final index = entry.$1;
                      final v = entry.$2;
                      final isSelected =
                          vehicleProvider?.selectedVehicle?.id == v.id;

                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(16),
                          onTap: () {
                            vehicleProvider?.selectVehicle(v);
                            widget.onSelectVehicle?.call(index);
                          },
                          child: Container(
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: isSelected
                                    ? AppColors.primary
                                    : Colors.transparent,
                                width: 1.5,
                              ),
                            ),
                            child: RescuePanel(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.all(12),
                                        decoration: BoxDecoration(
                                          color: isSelected
                                              ? AppColors.primaryContainer
                                              : AppColors.surfaceContainerLow,
                                          borderRadius: BorderRadius.circular(
                                            12,
                                          ),
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
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
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
                                        icon: const Icon(
                                          Icons.edit_outlined,
                                          color: Colors.black45,
                                          size: 20,
                                        ),
                                        tooltip: 'Chỉnh sửa xe',
                                        onPressed: () => _showVehicleFormModal(
                                          context,
                                          existing: v,
                                        ),
                                      ),
                                      IconButton(
                                        icon: const Icon(
                                          Icons.delete_outline,
                                          color: Colors.black45,
                                          size: 20,
                                        ),
                                        tooltip: 'Xóa xe này',
                                        onPressed: () =>
                                            _confirmDelete(context, v),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 12),
                                  Wrap(
                                    spacing: 8,
                                    runSpacing: 8,
                                    children: [
                                      RescueLabel(
                                        v.licensePlate,
                                        color: AppColors.secondary,
                                      ),
                                      if (v.isDefault)
                                        const RescueLabel(
                                          'Xe mặc định',
                                          color: Colors.blueAccent,
                                        ),
                                      if (isSelected)
                                        const RescueLabel(
                                          'Đang chọn',
                                          color: AppColors.primary,
                                        ),
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
                                          key: ValueKey(
                                            'select-vehicle-$index',
                                          ),
                                          onPressed: isSelected
                                              ? null
                                              : () {
                                                  vehicleProvider
                                                      ?.selectVehicle(v);
                                                  widget.onSelectVehicle?.call(
                                                    index,
                                                  );
                                                },
                                          icon: Icon(
                                            isSelected
                                                ? Icons.check_circle_outline
                                                : Icons.touch_app_outlined,
                                            size: 16,
                                          ),
                                          label: Text(
                                            isSelected
                                                ? 'Xe đang chọn'
                                                : 'Dùng xe này',
                                          ),
                                        ),
                                      ),
                                      if (!v.isDefault) ...[
                                        const SizedBox(width: 8),
                                        IconButton.outlined(
                                          tooltip: 'Đặt làm xe mặc định',
                                          icon: const Icon(
                                            Icons.star_border,
                                            size: 18,
                                          ),
                                          onPressed: () async {
                                            final scaffoldMessenger =
                                                ScaffoldMessenger.of(context);
                                            final ok = await vehicleProvider
                                                ?.setDefaultVehicle(v.id);
                                            if (ok == true) {
                                              scaffoldMessenger.showSnackBar(
                                                const SnackBar(
                                                  content: Text(
                                                    'Đã cập nhật xe mặc định thành công!',
                                                  ),
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
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
