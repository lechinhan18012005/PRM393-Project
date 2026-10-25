import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/constants/app_colors.dart';
import '../../core/models/rescue_order_model.dart';
import '../../core/services/location_service.dart';
import '../../core/services/rescue_service.dart';
import '../../core/widgets/info_details.dart';
import '../../core/widgets/rescue_ui.dart';
import '../../providers/rescue_provider.dart';
import 'radar_dispatch_screen.dart';

class ServiceSelectionScreen extends StatefulWidget {
  const ServiceSelectionScreen({
    super.key,
    this.initialService = 0,
    this.vehicleName = 'Honda SH 150i',
    this.vehiclePlate = '59-B1 892.44',
    this.vehicleId = 1,
  });
  final int initialService;
  final String vehicleName, vehiclePlate;
  final int vehicleId;

  @override
  State<ServiceSelectionScreen> createState() => _ServiceSelectionScreenState();
}

class _ServiceSelectionScreenState extends State<ServiceSelectionScreen> {
  late int _selectedService;
  int _waterLevel = 1;

  final TextEditingController _pickupController = TextEditingController(
    text: '85 Huỳnh Tấn Phát, P. Tân Thuận Đông, Quận 7, TP.HCM',
  );
  final TextEditingController _dropoffController = TextEditingController(
    text: 'Cầu Phú Mỹ (Khu vực gò cao khô ráo), Quận 7, TP.HCM',
  );

  double? _pickupLat = 10.7385;
  double? _pickupLng = 106.7215;
  double? _dropoffLat = 10.7490;
  double? _dropoffLng = 106.7290;
  String _clientRequestId = UniqueKey().toString();
  bool _isLocating = false;
  bool _isProgrammaticAddressUpdate = false;

  CrossingOptionModel? _selectedOption;

  static const _waterLabels = [
    'Mắt cá · 20 cm',
    'Nửa bánh · 35 cm',
    'Yên xe · 50+ cm',
  ];

  static const _services = [
    (
      title: 'Chở xe qua ngập (Chuyến riêng)',
      price: '120.000 ₫',
      note: 'Chuyến riêng 1-1 · Chở xe & người',
      icon: Icons.local_shipping_outlined,
      detail:
          'Một thợ kèm xe chuyên chở chở riêng xe máy và bạn qua điểm ngập lụt sâu đến nơi khô ráo an toàn. Giá niêm yết cố định, không phải mặc cả hay thương lượng tại hiện trường.',
    ),
    (
      title: 'Sửa xe tại chỗ',
      price: '120.000 ₫',
      note: 'Khắc phục chết máy ngập',
      icon: Icons.build_circle_outlined,
      detail:
          'Thợ kiểm tra bugi, nước vào máy và nhớt. Phụ tùng phát sinh sẽ được báo giá trước.',
    ),
    (
      title: 'Kéo xe về gara',
      price: '200.000 ₫',
      note: 'Nghi ngờ thủy kích',
      icon: Icons.car_repair_outlined,
      detail:
          'Đưa xe ngập nặng về xưởng chi nhánh gara để rã máy sấy khô và đại tu.',
    ),
  ];

  @override
  void initState() {
    super.initState();
    _selectedService = widget.initialService.clamp(0, _services.length - 1);
    _pickupController.addListener(_onPickupAddressChanged);
    _dropoffController.addListener(_onDropoffAddressChanged);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadCrossingOptions();
    });
  }

  @override
  void dispose() {
    _pickupController.removeListener(_onPickupAddressChanged);
    _dropoffController.removeListener(_onDropoffAddressChanged);
    _pickupController.dispose();
    _dropoffController.dispose();
    super.dispose();
  }

  void _onPickupAddressChanged() {
    if (_isProgrammaticAddressUpdate || _isLocating) return;
    final text = _pickupController.text.trim();
    if (text.isEmpty) {
      setState(() {
        _pickupLat = null;
        _pickupLng = null;
        _selectedOption = null;
      });
      return;
    }
    final loc = LocationService.instance.resolveAddressCoordinates(text, isDropoff: false);
    setState(() {
      if (loc != null) {
        _pickupLat = loc.latitude;
        _pickupLng = loc.longitude;
      } else {
        _pickupLat = null;
        _pickupLng = null;
      }
      _selectedOption = null;
    });
    if (_pickupLat != null && _pickupLng != null) {
      _loadCrossingOptions();
    }
  }

  void _onDropoffAddressChanged() {
    if (_isProgrammaticAddressUpdate || _isLocating) return;
    final text = _dropoffController.text.trim();
    if (text.isEmpty) {
      setState(() {
        _dropoffLat = null;
        _dropoffLng = null;
      });
      return;
    }
    final loc = LocationService.instance.resolveAddressCoordinates(text, isDropoff: true);
    setState(() {
      if (loc != null) {
        _dropoffLat = loc.latitude;
        _dropoffLng = loc.longitude;
      } else {
        _dropoffLat = null;
        _dropoffLng = null;
      }
    });
  }

  Future<void> _syncCurrentGpsLocation() async {
    setState(() => _isLocating = true);
    try {
      final loc = await LocationService.instance.getCurrentLocation();
      if (!mounted) return;
      if (loc != null) {
        _isProgrammaticAddressUpdate = true;
        setState(() {
          _pickupLat = loc.latitude;
          _pickupLng = loc.longitude;
          _pickupController.text = 'Tọa độ GPS thiết bị (${loc.latitude.toStringAsFixed(4)}, ${loc.longitude.toStringAsFixed(4)})';
          _selectedOption = null;
          _isLocating = false;
        });
        _isProgrammaticAddressUpdate = false;

        _loadCrossingOptions();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Đã cập nhật tọa độ đón từ GPS thiết bị: ${loc.latitude.toStringAsFixed(4)}, ${loc.longitude.toStringAsFixed(4)} (±${loc.accuracyMeters.toStringAsFixed(0)}m)'),
            backgroundColor: Colors.green,
          ),
        );
      } else {
        setState(() => _isLocating = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Không thể lấy vị trí từ thiết bị. Vui lòng bật GPS và cấp quyền truy cập vị trí.'),
            backgroundColor: Colors.orange,
          ),
        );
      }
    } catch (e) {
      _isProgrammaticAddressUpdate = false;
      if (mounted) {
        setState(() => _isLocating = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lỗi đọc GPS: ${e.toString().replaceFirst("Exception: ", "")}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _loadCrossingOptions() async {
    try {
      final rescueProvider = Provider.of<RescueProvider?>(context, listen: false);
      if (rescueProvider != null) {
        await rescueProvider.loadCrossingOptions(
          pickupLatitude: _pickupLat,
          pickupLongitude: _pickupLng,
        );
        if (mounted) {
          if (rescueProvider.crossingOptions.isNotEmpty) {
            setState(() {
              _selectedOption = rescueProvider.crossingOptions.first;
            });
          } else {
            setState(() {
              _selectedOption = null;
            });
          }
        }
      }
    } catch (_) {}
  }

  Future<void> _submitSos() async {
    if (_pickupLat == null || _pickupLng == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Vui lòng chọn hoặc định vị tọa độ điểm đón hợp lệ qua GPS!'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    if (_dropoffLat == null || _dropoffLng == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Vui lòng nhập điểm đến hợp lệ hoặc chọn tọa độ khô ráo!'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    // Luồng chở xe qua ngập (Service 0) bắt buộc chọn gara đủ điều kiện và gửi giá niêm yết
    if (_selectedService == 0) {
      if (_selectedOption == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Vui lòng chọn một gara cứu hộ khả dụng trước khi gửi yêu cầu!'),
            backgroundColor: Colors.orange,
          ),
        );
        return;
      }
    } else {
      // Dịch vụ sửa tại chỗ hoặc kéo xe về xưởng điều hướng trực tiếp sang màn hình radar tìm kiếm
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => const RadarDispatchScreen(),
        ),
      );
      return;
    }

    final rescueProvider = Provider.of<RescueProvider?>(context, listen: false);
    try {
      RescueOrderModel order;
      if (rescueProvider != null) {
        order = await rescueProvider.createSingleCrossingOrder(
          garageId: _selectedOption!.garageId,
          serviceItemId: _selectedOption!.serviceItemId,
          vehicleId: widget.vehicleId,
          pickupAddress: _pickupController.text.trim(),
          pickupLatitude: _pickupLat!,
          pickupLongitude: _pickupLng!,
          dropoffAddress: _dropoffController.text.trim(),
          dropoffLatitude: _dropoffLat!,
          dropoffLongitude: _dropoffLng!,
          waterLevel: _waterLabels[_waterLevel],
          customerNotes: 'Chở xe vượt ngập đơn lẻ đến nơi khô ráo',
          clientRequestId: _clientRequestId,
          expectedServiceBasePrice: _selectedOption!.serviceBasePrice,
          expectedBookingFee: _selectedOption!.bookingFee,
          expectedTotalAmount: _selectedOption!.totalAmount,
        );
      } else {
        order = await RescueService().createSingleCrossingOrder(
          garageId: _selectedOption!.garageId,
          serviceItemId: _selectedOption!.serviceItemId,
          vehicleId: widget.vehicleId,
          pickupAddress: _pickupController.text.trim(),
          pickupLatitude: _pickupLat!,
          pickupLongitude: _pickupLng!,
          dropoffAddress: _dropoffController.text.trim(),
          dropoffLatitude: _dropoffLat!,
          dropoffLongitude: _dropoffLng!,
          waterLevel: _waterLabels[_waterLevel],
          customerNotes: 'Chở xe vượt ngập đơn lẻ đến nơi khô ráo',
          clientRequestId: _clientRequestId,
          expectedServiceBasePrice: _selectedOption!.serviceBasePrice,
          expectedBookingFee: _selectedOption!.bookingFee,
          expectedTotalAmount: _selectedOption!.totalAmount,
        );
      }

      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (_) => RadarDispatchScreen(orderId: order.id),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        final err = e.toString().replaceFirst("Exception: ", "");
        if (err.contains("PRICE_CHANGED")) {
          _clientRequestId = UniqueKey().toString();
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Mức giá dịch vụ đã thay đổi trên hệ thống. Đang tải lại mức giá mới!'),
              backgroundColor: Colors.orange.shade800,
            ),
          );
          _loadCrossingOptions();
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Lỗi gửi SOS: $err'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final rescueProvider = Provider.of<RescueProvider?>(context);
    final options = rescueProvider?.crossingOptions ?? <CrossingOptionModel>[];
    final isLoading = rescueProvider?.isLoading ?? false;

    return Scaffold(
      appBar: AppBar(title: const Text('Chọn dịch vụ')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
          const RescueIntro(
            eyebrow: 'BẮT ĐẦU YÊU CẦU',
            title: 'Chở xe vượt ngập an toàn',
            description:
                'Xác nhận điểm đón và điểm trả tại nơi khô ráo, chọn dịch vụ và kiểm tra chi phí niêm yết.',
          ),
          const SizedBox(height: 12),

          // Thông tin xe & địa điểm
          RescuePanel(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                RescueInfo(
                  icon: Icons.two_wheeler,
                  title: 'Phương tiện đang chọn',
                  value: '${widget.vehicleName} · ${widget.vehiclePlate}',
                ),
                const Divider(),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.location_on, color: AppColors.primaryOrange, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Điểm đón (nơi xe đang kẹt)',
                            style: TextStyle(fontSize: 12, color: AppColors.secondary, fontWeight: FontWeight.w600),
                          ),
                          TextField(
                            controller: _pickupController,
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                            decoration: const InputDecoration(
                              isDense: true,
                              contentPadding: EdgeInsets.symmetric(vertical: 4),
                              border: UnderlineInputBorder(),
                            ),
                          ),
                          if (_pickupLat == null)
                            const Padding(
                              padding: EdgeInsets.only(top: 2),
                              child: Text(
                                'Chưa xác định được tọa độ đón. Hãy bấm "Định vị GPS thực tế" hoặc nhập (lat, lon).',
                                style: TextStyle(fontSize: 11, color: Colors.deepOrange),
                              ),
                            ),
                          Align(
                            alignment: Alignment.centerRight,
                            child: TextButton.icon(
                              style: TextButton.styleFrom(
                                visualDensity: VisualDensity.compact,
                                padding: EdgeInsets.zero,
                              ),
                              onPressed: _isLocating ? null : _syncCurrentGpsLocation,
                              icon: _isLocating
                                  ? const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 1.5))
                                  : const Icon(Icons.my_location, size: 14, color: AppColors.primaryOrange),
                              label: Text(
                                _isLocating ? 'Đang đọc GPS...' : 'Định vị GPS thực tế',
                                style: const TextStyle(fontSize: 11, color: AppColors.primaryOrange),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.wb_sunny_outlined, color: Colors.green, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Điểm trả xe (vùng khô ráo an toàn)',
                            style: TextStyle(fontSize: 12, color: AppColors.secondary, fontWeight: FontWeight.w600),
                          ),
                          TextField(
                            controller: _dropoffController,
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                            decoration: const InputDecoration(
                              isDense: true,
                              contentPadding: EdgeInsets.symmetric(vertical: 4),
                              border: UnderlineInputBorder(),
                            ),
                          ),
                          if (_dropoffLat == null)
                            const Padding(
                              padding: EdgeInsets.only(top: 2),
                              child: Text(
                                'Chưa xác định được tọa độ trả xe. Hãy nhập điểm quen thuộc hoặc dạng (lat, lon).',
                                style: TextStyle(fontSize: 11, color: Colors.deepOrange),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),

          Text(
            'Bạn cần hỗ trợ gì?',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 10),
          for (var i = 0; i < _services.length; i++) ...[
            _serviceCard(i),
            const SizedBox(height: 8),
          ],

          InfoDetails(
            key: ValueKey(_selectedService),
            title: 'Dịch vụ bao gồm những gì?',
            child: Text(
              _services[_selectedService].detail,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
          const SizedBox(height: 14),

          if (_selectedService == 0) ...[
            Text(
              'Gara cung cấp dịch vụ chở xe trong bán kính',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            if (options.isNotEmpty)
              RescuePanel(
                child: RadioGroup<int>(
                  groupValue: _selectedOption?.garageId,
                  onChanged: (val) {
                    if (val != null) {
                      setState(() {
                        _selectedOption = options.firstWhere((o) => o.garageId == val);
                      });
                    }
                  },
                  child: Column(
                    children: [
                      for (final opt in options)
                        RadioListTile<int>(
                          value: opt.garageId,
                          title: Text(
                            opt.garageName,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                          ),
                          subtitle: Text(
                            '${opt.branchAddress ?? opt.branchName ?? "Chi nhánh phục vụ"} • ${opt.serviceBasePrice.toStringAsFixed(0)} ₫',
                            style: const TextStyle(fontSize: 12),
                          ),
                          secondary: Text(
                            '~ ${opt.estimatedTimeMin} phút',
                            style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.primary),
                          ),
                          contentPadding: EdgeInsets.zero,
                        ),
                      const Divider(),
                      if (_selectedOption != null) ...[
                        _priceRow('Cước dịch vụ niêm yết', '${_selectedOption!.serviceBasePrice.toStringAsFixed(0)} ₫'),
                        const SizedBox(height: 4),
                        _priceRow('Phí đặt xe (nền tảng)', '${_selectedOption!.bookingFee.toStringAsFixed(0)} ₫'),
                        const Divider(height: 16),
                        _priceRow(
                          'Tổng thanh toán dự kiến',
                          '${_selectedOption!.totalAmount.toStringAsFixed(0)} ₫',
                          isBold: true,
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          '✓ Giá niêm yết cố định, không phát sinh phụ phí tại hiện trường',
                          style: TextStyle(fontSize: 11, color: Colors.green, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ],
                  ),
                ),
              )
            else if (isLoading)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: CircularProgressIndicator()),
              )
            else
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.amber.shade50,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.amber.shade200),
                ),
                child: Column(
                  children: [
                    const Icon(Icons.location_off_outlined, color: Colors.orange, size: 36),
                    const SizedBox(height: 8),
                    Text(
                      rescueProvider?.errorMessage ??
                          'Không tìm thấy gara cứu hộ nào có thợ sẵn sàng trong bán kính phục vụ quanh điểm đón.',
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 13, color: Colors.black87),
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      onPressed: _loadCrossingOptions,
                      icon: const Icon(Icons.refresh, size: 18),
                      label: const Text('Thử tìm lại gara'),
                    ),
                  ],
                ),
              ),
          ],

          const SizedBox(height: 18),
          Text(
            'Mực nước hiện tại',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final (index, label) in _waterLabels.indexed)
                ChoiceChip(
                  label: Text(label),
                  selected: _waterLevel == index,
                  onSelected: (_) => setState(() => _waterLevel = index),
                  selectedColor: AppColors.primaryContainer,
                  labelStyle: TextStyle(
                    color: _waterLevel == index ? AppColors.primary : AppColors.secondary,
                    fontSize: 12,
                  ),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  side: BorderSide(
                    color: _waterLevel == index ? AppColors.primaryOrange : AppColors.outlineVariant,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 30),
        ],
        ),
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: AppColors.outlineVariant)),
        ),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 14, 20, 16),
            child: FilledButton.icon(
              onPressed: isLoading ? null : _submitSos,
              icon: isLoading
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Icons.radar_rounded, size: 21),
              label: Text(isLoading ? 'Đang tạo đơn...' : 'Tìm cứu hộ'),
            ),
          ),
        ),
      ),
    );
  }

  Widget _priceRow(String label, String value, {bool isBold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: isBold ? 14 : 12,
            fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
            color: isBold ? AppColors.primary : AppColors.secondary,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: isBold ? 15 : 12,
            fontWeight: isBold ? FontWeight.bold : FontWeight.w600,
            color: isBold ? AppColors.primaryOrange : Colors.black87,
          ),
        ),
      ],
    );
  }

  Widget _serviceCard(int index) {
    final service = _services[index];
    final selected = _selectedService == index;
    return Card(
      color: selected ? const Color(0xFFFFF8F3) : Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: selected ? AppColors.primaryOrange : AppColors.outlineVariant,
          width: selected ? 1.5 : 1,
        ),
      ),
      child: InkWell(
        key: ValueKey('service-$index'),
        onTap: () => setState(() => _selectedService = index),
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: selected ? AppColors.primaryContainer : AppColors.surfaceContainerLow,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  service.icon,
                  color: selected ? AppColors.primaryOrange : AppColors.secondary,
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      service.title,
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      service.price,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      service.note,
                      style: const TextStyle(fontSize: 11, color: AppColors.secondary),
                    ),
                  ],
                ),
              ),
              Icon(
                selected ? Icons.check_circle_rounded : Icons.circle_outlined,
                color: selected ? AppColors.primaryOrange : AppColors.outlineVariant,
                size: 20,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
