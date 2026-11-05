import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/constants/app_colors.dart';
import '../../core/models/rescue_order_model.dart';
import '../../core/models/vehicle_model.dart';
import '../../core/services/geocoding_service.dart';
import '../../core/services/location_service.dart';
import '../../core/services/rescue_service.dart';
import '../../core/widgets/info_details.dart';
import '../../core/widgets/rescue_ui.dart';
import '../../providers/rescue_provider.dart';
import '../../providers/vehicle_provider.dart';
import '../../features/batch_transport/batch_trip_api.dart';
import 'radar_dispatch_screen.dart';

class ServiceSelectionScreen extends StatefulWidget {
  const ServiceSelectionScreen({
    super.key,
    this.initialService = 0,
    this.vehicleName,
    this.vehiclePlate,
    this.vehicleId,
    this.initialVehicle,
    this.batchTripApi,
    this.geocodingService,
  });

  final int initialService;
  final String? vehicleName, vehiclePlate;
  final int? vehicleId;
  final VehicleModel? initialVehicle;
  final BatchTripApi? batchTripApi;
  final GeocodingService? geocodingService;

  @override
  State<ServiceSelectionScreen> createState() => _ServiceSelectionScreenState();
}

class _ServiceSelectionScreenState extends State<ServiceSelectionScreen> {
  late int _selectedService;
  int _waterLevel = 1;

  final TextEditingController _pickupController = TextEditingController();
  final TextEditingController _notesController = TextEditingController();

  double? _pickupLat;
  double? _pickupLng;
  double? _pickupAccuracyMeters;
  String? _pickupLocationSource;

  VehicleModel? _selectedVehicle;

  String _clientRequestId = UniqueKey().toString();
  bool _isLocating = false;
  bool _isResolvingAddress = false;
  bool _isSubmitting = false;
  bool _isGroupTrip = false;
  int _groupVehicleCount = 2;

  CrossingOptionModel? _selectedOption;
  late final GeocodingService _geocodingService;

  static const _waterLabels = [
    'Mắt cá · 20 cm',
    'Nửa bánh · 35 cm',
    'Yên xe · 50+ cm',
  ];

  static const _services = [
    (
      title: 'Chở xe qua điểm ngập',
      price: 'Chọn chuyến riêng hoặc chuyến gom',
      note: 'Chở xe và người tới vùng khô ráo',
      icon: Icons.local_shipping_outlined,
      detail: 'Bạn có thể chọn chuyến riêng để được điều phối ngay, hoặc tự khởi tạo chuyến gom 2–6 xe với mức giá nhóm do gara niêm yết.',
    ),
    (
      title: 'Cứu hộ và kiểm tra xe tại chỗ',
      price: 'Báo giá minh bạch sau kiểm tra',
      note: 'Thợ đến hiện trường hỗ trợ nổ máy hoặc kéo về gara',
      icon: Icons.build_circle_outlined,
      detail: 'Thợ cứu hộ kiểm tra tình trạng xe tại hiện trường. Nếu có thể khắc phục, thợ lập báo giá sửa tại chỗ; nếu hư hỏng nặng, thợ lập báo giá kéo xe về gara. Dịch vụ kéo xe kết thúc khi bàn giao tại gara và không bao gồm sửa chữa.',
    ),
  ];

  String get _serviceType =>
      const ['CROSSING', 'REPAIR_ONSITE'][_selectedService];
  String get _orderType => _selectedService == 0
      ? (_isGroupTrip ? 'BATCH_CROSSING' : 'SINGLE_CROSSING')
      : 'ONSITE_REPAIR';
  String get _customerNote => const [
    'Chở xe vượt ngập đơn lẻ đến nơi khô ráo',
    'Yêu cầu thợ kiểm tra xe ngập và báo giá phương án xử lý phù hợp',
  ][_selectedService];
  String get _introTitle => const [
    'Chở xe vượt ngập an toàn',
    'Cứu hộ và kiểm tra xe ngập',
  ][_selectedService];
  String get _optionHeading => const [
    'Gara cung cấp dịch vụ chở xe trong bán kính',
    'Gara có thợ cứu hộ đang sẵn sàng',
  ][_selectedService];

  @override
  void initState() {
    super.initState();
    _geocodingService = widget.geocodingService ?? GeocodingService();
    _selectedService = widget.initialService.clamp(0, _services.length - 1);

    if (widget.initialVehicle != null) {
      _selectedVehicle = widget.initialVehicle;
    }

    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await _initializeVehicleAndLocation();
    });
  }

  @override
  void dispose() {
    _pickupController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _initializeVehicleAndLocation() async {
    // 1. Đồng bộ thông tin phương tiện từ VehicleProvider
    VehicleProvider? vehicleProvider;
    try {
      vehicleProvider = Provider.of<VehicleProvider?>(context, listen: false);
    } catch (_) {}

    if (vehicleProvider != null) {
      if (vehicleProvider.vehicles.isEmpty) {
        await vehicleProvider.fetchVehicles();
      }

      if (_selectedVehicle == null) {
        if (widget.vehicleId != null) {
          final match = vehicleProvider.vehicles
              .where((v) => v.id == widget.vehicleId)
              .firstOrNull;
          _selectedVehicle = match;
        }
        _selectedVehicle ??=
            vehicleProvider.selectedVehicle ??
            (vehicleProvider.vehicles.isNotEmpty
                ? vehicleProvider.vehicles.first
                : null);
      }
    }

    // 2. Tự động lấy vị trí GPS hiện tại của thiết bị
    await _syncCurrentGpsLocation(silent: true);

    if (mounted) {
      setState(() {});
      _loadServiceOptions();
    }
  }

  void _onPickupAddressChanged(String _) {
    setState(() {
      _pickupLat = null;
      _pickupLng = null;
      _pickupAccuracyMeters = null;
      _pickupLocationSource = null;
      _selectedOption = null;
    });
  }

  Future<bool> _resolvePickupAddress({bool showSuccess = true}) async {
    final address = _pickupController.text.trim();
    if (address.length < 3 || _isResolvingAddress) return false;
    setState(() => _isResolvingAddress = true);
    try {
      final result = await _geocodingService.search(address);
      if (!mounted) return false;
      if (result == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Không tìm thấy địa chỉ. Hãy nhập thêm phường/xã, quận/huyện hoặc tỉnh/thành.',
            ),
            backgroundColor: Colors.orange,
          ),
        );
        return false;
      }
      setState(() {
        _pickupLat = result.latitude;
        _pickupLng = result.longitude;
        _pickupAccuracyMeters = null;
        _pickupLocationSource = 'OpenStreetMap';
        _selectedOption = null;
      });
      await _loadServiceOptions();
      if (showSuccess && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Đã xác định vị trí: ${result.displayName}'),
            backgroundColor: Colors.green,
          ),
        );
      }
      return true;
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(error.toString().replaceFirst('Exception: ', '')),
            backgroundColor: Colors.red,
          ),
        );
      }
      return false;
    } finally {
      if (mounted) setState(() => _isResolvingAddress = false);
    }
  }

  Future<void> _syncCurrentGpsLocation({bool silent = false}) async {
    setState(() => _isLocating = true);
    try {
      final loc = await LocationService.instance.getCurrentLocation();
      if (!mounted) return;
      if (loc != null) {
        setState(() {
          _pickupLat = loc.latitude;
          _pickupLng = loc.longitude;
          _pickupAccuracyMeters = loc.accuracyMeters;
          _pickupLocationSource = 'GPS thiết bị';
          _pickupController.text =
              'Vị trí GPS hiện tại (${loc.latitude.toStringAsFixed(4)}, ${loc.longitude.toStringAsFixed(4)})';
          _selectedOption = null;
          _isLocating = false;
        });

        _loadServiceOptions();
        if (!silent && mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'Đã cập nhật vị trí từ GPS thiết bị: ${loc.latitude.toStringAsFixed(4)}, ${loc.longitude.toStringAsFixed(4)} (±${loc.accuracyMeters.toStringAsFixed(0)}m)',
              ),
              backgroundColor: Colors.green,
            ),
          );
        }
      } else {
        setState(() => _isLocating = false);
        if (!silent && mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                'Không thể lấy vị trí từ GPS thiết bị. Vui lòng bật GPS hoặc nhập địa chỉ.',
              ),
              backgroundColor: Colors.orange,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLocating = false);
        if (!silent) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'Lỗi đọc GPS: ${e.toString().replaceFirst("Exception: ", "")}',
              ),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    }
  }

  Future<void> _loadServiceOptions() async {
    if (_pickupLat == null || _pickupLng == null) return;
    try {
      final rescueProvider = Provider.of<RescueProvider?>(
        context,
        listen: false,
      );
      if (rescueProvider != null) {
        if (_serviceType == 'CROSSING') {
          await rescueProvider.loadCrossingOptions(
            pickupLatitude: _pickupLat,
            pickupLongitude: _pickupLng,
          );
        } else {
          await rescueProvider.loadRescueOptions(
            serviceType: _serviceType,
            pickupLatitude: _pickupLat,
            pickupLongitude: _pickupLng,
          );
        }
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

  Future<void> _loadMoreServiceOptions() async {
    if (_pickupLat == null || _pickupLng == null) return;
    final rescueProvider = Provider.of<RescueProvider?>(context, listen: false);
    if (rescueProvider == null) return;
    if (_serviceType == 'CROSSING') {
      await rescueProvider.loadCrossingOptions(
        pickupLatitude: _pickupLat,
        pickupLongitude: _pickupLng,
        loadMore: true,
      );
    } else {
      await rescueProvider.loadRescueOptions(
        serviceType: _serviceType,
        pickupLatitude: _pickupLat,
        pickupLongitude: _pickupLng,
        loadMore: true,
      );
    }
  }

  void _showSelectVehicleSheet(BuildContext context) {
    VehicleProvider? vehicleProvider;
    try {
      vehicleProvider = Provider.of<VehicleProvider?>(context, listen: false);
    } catch (_) {}
    final vehicles = vehicleProvider?.vehicles ?? const [];

    showModalBottomSheet<void>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetCtx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Chọn xe yêu cầu cứu hộ',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(sheetCtx),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              if (vehicles.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 20),
                  child: Center(
                    child: Text(
                      'Bạn chưa có phương tiện nào được lưu.',
                      style: TextStyle(color: AppColors.secondary),
                    ),
                  ),
                )
              else
                ...vehicles.map((v) {
                  final isCurrent = _selectedVehicle?.id == v.id;
                  return ListTile(
                    contentPadding: const EdgeInsets.symmetric(vertical: 4),
                    leading: CircleAvatar(
                      backgroundColor: isCurrent
                          ? AppColors.primaryContainer
                          : AppColors.surfaceContainerLow,
                      child: Icon(
                        v.vehicleType == 'ELECTRIC'
                            ? Icons.electric_moped
                            : Icons.two_wheeler,
                        color: isCurrent
                            ? AppColors.primary
                            : AppColors.secondary,
                      ),
                    ),
                    title: Text(
                      v.displayName,
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    subtitle: Text('${v.licensePlate} • ${v.typeDisplayName}'),
                    trailing: isCurrent
                        ? const Icon(
                            Icons.check_circle,
                            color: AppColors.primary,
                          )
                        : null,
                    onTap: () {
                      setState(() {
                        _selectedVehicle = v;
                      });
                      vehicleProvider?.selectVehicle(v);
                      Navigator.pop(sheetCtx);
                    },
                  );
                }),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _submitSos() async {
    if ((_pickupLat == null || _pickupLng == null) &&
        _pickupController.text.trim().isNotEmpty) {
      await _resolvePickupAddress(showSuccess: false);
      if (!mounted) return;
    }
    if (_pickupLat == null || _pickupLng == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Vui lòng định vị GPS hoặc nhập địa chỉ điểm đón rồi bấm "Tìm trên bản đồ".',
          ),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    if (_selectedOption == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Vui lòng chọn một gara cứu hộ khả dụng trước khi gửi yêu cầu!',
          ),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    if (_isGroupTrip &&
        !_selectedOption!.groupPrices.containsKey(_groupVehicleCount)) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Gara chưa niêm yết giá chuyến gom cho $_groupVehicleCount xe.',
          ),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    final dropoffAddress = _pickupController.text.trim();
    final dropoffLatitude = _pickupLat!;
    final dropoffLongitude = _pickupLng!;

    final customNote = _notesController.text.trim();
    final groupNote = _isGroupTrip
        ? 'Chuyến gom do khách khởi tạo: $_groupVehicleCount xe'
        : _customerNote;
    final fullCustomerNotes = customNote.isNotEmpty
        ? '$groupNote. Ghi chú thêm: $customNote'
        : groupNote;

    final targetVehicleId = _selectedVehicle?.id ?? widget.vehicleId ?? 1;

    final rescueProvider = Provider.of<RescueProvider?>(context, listen: false);
    setState(() => _isSubmitting = true);
    try {
      final selectedBasePrice = _isGroupTrip
          ? _selectedOption!.groupPrices[_groupVehicleCount]!
          : _selectedOption!.serviceBasePrice;
      final selectedTotal = selectedBasePrice + _selectedOption!.bookingFee;
      RescueOrderModel order;
      if (rescueProvider != null) {
        order = await rescueProvider.createSingleCrossingOrder(
          orderType: _orderType,
          groupVehicleCount: _isGroupTrip ? _groupVehicleCount : null,
          garageId: _selectedOption!.garageId,
          serviceItemId: _selectedOption!.serviceItemId,
          vehicleId: targetVehicleId,
          pickupAddress: _pickupController.text.trim(),
          pickupLatitude: _pickupLat!,
          pickupLongitude: _pickupLng!,
          dropoffAddress: dropoffAddress,
          dropoffLatitude: dropoffLatitude,
          dropoffLongitude: dropoffLongitude,
          waterLevel: _waterLabels[_waterLevel],
          customerNotes: fullCustomerNotes,
          clientRequestId: _clientRequestId,
          expectedServiceBasePrice: selectedBasePrice,
          expectedBookingFee: _selectedOption!.bookingFee,
          expectedTotalAmount: selectedTotal,
        );
      } else {
        order = await RescueService().createSingleCrossingOrder(
          orderType: _orderType,
          groupVehicleCount: _isGroupTrip ? _groupVehicleCount : null,
          garageId: _selectedOption!.garageId,
          serviceItemId: _selectedOption!.serviceItemId,
          vehicleId: targetVehicleId,
          pickupAddress: _pickupController.text.trim(),
          pickupLatitude: _pickupLat!,
          pickupLongitude: _pickupLng!,
          dropoffAddress: dropoffAddress,
          dropoffLatitude: dropoffLatitude,
          dropoffLongitude: dropoffLongitude,
          waterLevel: _waterLabels[_waterLevel],
          customerNotes: fullCustomerNotes,
          clientRequestId: _clientRequestId,
          expectedServiceBasePrice: selectedBasePrice,
          expectedBookingFee: _selectedOption!.bookingFee,
          expectedTotalAmount: selectedTotal,
        );
      }

      if (mounted) {
        final destination = RadarDispatchScreen(orderId: order.id);
        Navigator.of(context)
            .pushReplacement(MaterialPageRoute(builder: (_) => destination));
      }
    } catch (e) {
      if (mounted) {
        final err = e.toString().replaceFirst("Exception: ", "");
        if (err.contains("PRICE_CHANGED")) {
          _clientRequestId = UniqueKey().toString();
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text(
                'Mức giá dịch vụ đã thay đổi trên hệ thống. Đang tải lại mức giá mới!',
              ),
              backgroundColor: Colors.orange.shade800,
            ),
          );
          _loadServiceOptions();
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Lỗi gửi SOS: $err'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final rescueProvider = Provider.of<RescueProvider?>(context);
    final options = rescueProvider?.crossingOptions ?? <CrossingOptionModel>[];
    final isLoading = rescueProvider?.isLoading ?? false;

    final vehicleDisplayName =
        _selectedVehicle?.displayName ?? widget.vehicleName ?? 'Xe máy của bạn';
    final vehiclePlate =
        _selectedVehicle?.licensePlate ?? widget.vehiclePlate ?? '';

    return Scaffold(
      appBar: AppBar(title: const Text('Chọn dịch vụ cứu hộ')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Bạn cần hỗ trợ gì?',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 10),
            for (var i = 0; i < _services.length; i++) ...[
              _serviceCard(i),
              const SizedBox(height: 8),
            ],
            const SizedBox(height: 4),

            RescueIntro(
              eyebrow: 'BẮT ĐẦU YÊU CẦU',
              title: _introTitle,
              description: _selectedService == 0
                  ? 'Xác nhận điểm đón, chọn chuyến riêng hoặc khởi tạo chuyến gom và số lượng từ 2 đến 6 xe.'
                  : 'Xác nhận điểm xe đang gặp nạn, chọn gara khả dụng; thợ sẽ đến kiểm tra và gửi báo giá để bạn duyệt.',
            ),
            const SizedBox(height: 12),

            // Thông tin xe & địa điểm
            RescuePanel(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  InkWell(
                    onTap: () => _showSelectVehicleSheet(context),
                    borderRadius: BorderRadius.circular(10),
                    child: RescueInfo(
                      icon: Icons.two_wheeler,
                      title: 'Phương tiện đang chọn (chạm để đổi xe)',
                      value: vehiclePlate.isNotEmpty
                          ? '$vehicleDisplayName · $vehiclePlate'
                          : vehicleDisplayName,
                    ),
                  ),
                  const Divider(height: 20),

                  // Điểm đón
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(
                        Icons.location_on,
                        color: AppColors.primaryOrange,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Điểm đón (nơi xe đang ngập/kẹt)',
                              style: TextStyle(
                                fontSize: 12,
                                color: AppColors.secondary,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            TextField(
                              key: const Key('rescue-pickup-address'),
                              controller: _pickupController,
                              onChanged: _onPickupAddressChanged,
                              textInputAction: TextInputAction.search,
                              onSubmitted: (_) => _resolvePickupAddress(),
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                              ),
                              decoration: const InputDecoration(
                                isDense: true,
                                hintText:
                                    'Nhập số nhà, tên đường, phường/xã...',
                                contentPadding: EdgeInsets.symmetric(
                                  vertical: 6,
                                ),
                                border: UnderlineInputBorder(),
                              ),
                            ),
                            if (_pickupLat == null)
                              const Padding(
                                padding: EdgeInsets.only(top: 4),
                                child: Text(
                                  'Chưa có tọa độ. Dùng GPS hoặc tìm địa chỉ trên bản đồ.',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: Colors.deepOrange,
                                  ),
                                ),
                              )
                            else
                              Padding(
                                key: const Key('pickup-coordinate-confirmed'),
                                padding: const EdgeInsets.only(top: 5),
                                child: Row(
                                  children: [
                                    const Icon(
                                      Icons.check_circle,
                                      size: 14,
                                      color: Colors.green,
                                    ),
                                    const SizedBox(width: 5),
                                    Expanded(
                                      child: Text(
                                        'Tọa độ GPS (${_pickupLocationSource ?? "đã xác định"}): '
                                        '${_pickupLat!.toStringAsFixed(6)}, '
                                        '${_pickupLng!.toStringAsFixed(6)}'
                                        '${_pickupAccuracyMeters == null ? "" : " (±${_pickupAccuracyMeters!.toStringAsFixed(0)} m)"}',
                                        style: const TextStyle(
                                          fontSize: 11,
                                          color: Colors.green,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            Wrap(
                              alignment: WrapAlignment.end,
                              spacing: 8,
                              children: [
                                TextButton.icon(
                                  key: const Key('geocode-pickup-address'),
                                  onPressed: _isResolvingAddress || _isLocating
                                      ? null
                                      : _resolvePickupAddress,
                                  icon: _isResolvingAddress
                                      ? const SizedBox(
                                          width: 12,
                                          height: 12,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 1.5,
                                          ),
                                        )
                                      : const Icon(Icons.search, size: 14),
                                  label: Text(
                                    _isResolvingAddress
                                        ? 'Đang tìm...'
                                        : 'Tìm trên bản đồ',
                                  ),
                                ),
                                TextButton.icon(
                                  style: TextButton.styleFrom(
                                    visualDensity: VisualDensity.compact,
                                    padding: EdgeInsets.zero,
                                  ),
                                  onPressed: _isLocating
                                      ? null
                                      : () => _syncCurrentGpsLocation(
                                          silent: false,
                                        ),
                                  icon: _isLocating
                                      ? const SizedBox(
                                          width: 12,
                                          height: 12,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 1.5,
                                          ),
                                        )
                                      : const Icon(
                                          Icons.my_location,
                                          size: 14,
                                          color: AppColors.primaryOrange,
                                        ),
                                  label: Text(
                                    _isLocating
                                        ? 'Đang đọc GPS...'
                                        : 'Định vị GPS thực tế',
                                    style: const TextStyle(
                                      fontSize: 11,
                                      color: AppColors.primaryOrange,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const Align(
                              alignment: Alignment.centerRight,
                              child: Text(
                                'Dữ liệu địa chỉ © OpenStreetMap contributors',
                                style: TextStyle(
                                  fontSize: 9,
                                  color: AppColors.secondary,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  if (_selectedService == 1) ...[
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.blue.shade50,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Row(
                        children: [
                          Icon(
                            Icons.info_outline,
                            size: 16,
                            color: Colors.blue,
                          ),
                          SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Thợ cứu hộ sẽ đến trực tiếp điểm đón để kiểm tra và khắc phục xe tại chỗ.',
                              style: TextStyle(
                                fontSize: 11,
                                color: Colors.blue,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 18),

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
              _crossingModeSection(options),
              const SizedBox(height: 14),
            ],

            Text(
              _optionHeading,
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
                        _selectedOption = options.firstWhere(
                          (o) => o.garageId == val,
                        );
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
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                          subtitle: Text(
                            '${opt.branchAddress ?? opt.branchName ?? "Chi nhánh phục vụ"} • ${_formatPrice(_isGroupTrip ? opt.groupPrices[_groupVehicleCount] : opt.serviceBasePrice)}',
                            style: const TextStyle(fontSize: 12),
                          ),
                          contentPadding: EdgeInsets.zero,
                        ),
                      const Divider(),
                      if (_selectedOption != null) ...[
                        _priceRow(
                          _isGroupTrip
                              ? 'Tổng cước gom $_groupVehicleCount xe'
                              : 'Cước chuyến riêng',
                          _formatPrice(
                            _isGroupTrip
                                ? _selectedOption!
                                      .groupPrices[_groupVehicleCount]
                                : _selectedOption!.serviceBasePrice,
                            fallback: 'Chưa niêm yết',
                          ),
                        ),
                        const SizedBox(height: 4),
                        _priceRow(
                          'Phí đặt xe (nền tảng)',
                          _formatPrice(_selectedOption!.bookingFee),
                        ),
                        const Divider(height: 16),
                        _priceRow(
                          'Tổng thanh toán dự kiến',
                          _formatPrice(
                            ((_isGroupTrip
                                        ? _selectedOption!
                                              .groupPrices[_groupVehicleCount]
                                        : _selectedOption!.serviceBasePrice) ??
                                    0) +
                                _selectedOption!.bookingFee,
                          ),
                          isBold: true,
                        ),
                      ],
                      if (rescueProvider?.hasMoreOptions == true) ...[
                        const Divider(height: 20),
                        TextButton.icon(
                          key: const ValueKey('load-more-garages'),
                          onPressed:
                              rescueProvider?.isLoadingMoreOptions == true
                              ? null
                              : _loadMoreServiceOptions,
                          icon: rescueProvider?.isLoadingMoreOptions == true
                              ? const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : const Icon(Icons.expand_more),
                          label: const Text('Xem thêm gara'),
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
                    const Icon(
                      Icons.location_off_outlined,
                      color: Colors.orange,
                      size: 36,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      rescueProvider?.errorMessage ?? 'Không tìm thấy gara cứu hộ nào có thợ sẵn sàng trong bán kính phục vụ quanh điểm đón.',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 13,
                        color: Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      onPressed: _loadServiceOptions,
                      icon: const Icon(Icons.refresh, size: 18),
                      label: const Text('Thử tìm lại gara'),
                    ),
                  ],
                ),
              ),

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
                      color: _waterLevel == index
                          ? AppColors.primary
                          : AppColors.secondary,
                      fontSize: 12,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                    side: BorderSide(
                      color: _waterLevel == index
                          ? AppColors.primaryOrange
                          : AppColors.outlineVariant,
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 18),

            // Ghi chú của khách hàng
            Text(
              'Ghi chú cho đội cứu hộ (tùy chọn)',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _notesController,
              maxLines: 2,
              decoration: InputDecoration(
                hintText: 'Ví dụ: Xe bị ngập qua bugi đề không nổ, đang đứng cạnh trạm xe buýt...',
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.outlineVariant),
                ),
              ),
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
              onPressed: isLoading || _isSubmitting ? null : _submitSos,
              icon: isLoading || _isSubmitting
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.radar_rounded, size: 21),
              label: Text(
                isLoading || _isSubmitting
                    ? 'Đang tạo đơn...'
                    : _isGroupTrip
                    ? 'Khởi tạo chuyến gom'
                    : 'Tìm cứu hộ',
              ),
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
        Expanded(
          child: Text(
            label,
            style: TextStyle(
              fontSize: isBold ? 14 : 12,
              fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
              color: isBold ? AppColors.primary : AppColors.secondary,
            ),
          ),
        ),
        const SizedBox(width: 8),
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

  String _formatPrice(num? amount, {String fallback = 'Chưa có giá'}) {
    if (amount == null) return fallback;
    final digits = amount.round().toString();
    final formatted = digits.replaceAllMapped(
      RegExp(r'\B(?=(\d{3})+(?!\d))'),
      (_) => '.',
    );
    return '$formatted ₫';
  }

  Widget _crossingModeSection(List<CrossingOptionModel> options) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Chọn hình thức di chuyển',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 8),
        Card(
          color: !_isGroupTrip ? const Color(0xFFFFF8F3) : Colors.white,
          child: ListTile(
            key: const ValueKey('crossing-private'),
            onTap: () {
              setState(() {
                _isGroupTrip = false;
                _selectedOption = options.isEmpty ? null : options.first;
                _clientRequestId = UniqueKey().toString();
              });
            },
            leading: const Icon(Icons.person_outline),
            title: const Text(
              'Đi chuyến riêng',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            subtitle: const Text('Điều phối thợ riêng, không cần chờ ghép xe'),
            trailing: Icon(
              !_isGroupTrip ? Icons.check_circle : Icons.circle_outlined,
              color: !_isGroupTrip
                  ? AppColors.primaryOrange
                  : AppColors.outlineVariant,
            ),
          ),
        ),
        const SizedBox(height: 6),
        Card(
          color: _isGroupTrip ? const Color(0xFFFFF8F3) : Colors.white,
          child: ListTile(
            key: const ValueKey('crossing-group'),
            onTap: () {
              setState(() {
                _isGroupTrip = true;
                _selectedOption = options.isEmpty ? null : options.first;
                _clientRequestId = UniqueKey().toString();
              });
            },
            leading: const Icon(Icons.groups_2_outlined),
            title: const Text(
              'Chọn chuyến gom',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            subtitle: const Text(
              'Bạn khởi tạo chuyến và chọn số lượng xe, giá ưu đãi theo nhóm',
            ),
            trailing: Icon(
              _isGroupTrip ? Icons.check_circle : Icons.circle_outlined,
              color: _isGroupTrip
                  ? AppColors.primaryOrange
                  : AppColors.outlineVariant,
            ),
          ),
        ),
        if (_isGroupTrip) ...[
          const SizedBox(height: 10),
          const Text(
            'Số lượng xe trong chuyến gom',
            style: TextStyle(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              for (final count in [2, 3, 4, 5, 6])
                ChoiceChip(
                  key: ValueKey('group-vehicle-count-$count'),
                  label: Text('$count xe'),
                  selected: _groupVehicleCount == count,
                  onSelected: (_) => setState(() {
                    _groupVehicleCount = count;
                    _clientRequestId = UniqueKey().toString();
                  }),
                ),
            ],
          ),
          if (_selectedOption != null &&
              _selectedOption!.groupPrices[_groupVehicleCount] == null) ...[
            const SizedBox(height: 8),
            Text(
              'Gara này chưa niêm yết giá cho $_groupVehicleCount xe.',
              style: const TextStyle(fontSize: 12, color: Colors.deepOrange),
            ),
          ],
        ],
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
        onTap: () {
          setState(() {
            _selectedService = index;
            _selectedOption = null;
            _isGroupTrip = false;
            _clientRequestId = UniqueKey().toString();
          });
          _loadServiceOptions();
        },
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: selected
                      ? AppColors.primaryContainer
                      : AppColors.surfaceContainerLow,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  service.icon,
                  color: selected
                      ? AppColors.primaryOrange
                      : AppColors.secondary,
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
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                      ),
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
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppColors.secondary,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                selected ? Icons.check_circle_rounded : Icons.circle_outlined,
                color: selected
                    ? AppColors.primaryOrange
                    : AppColors.outlineVariant,
                size: 20,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
