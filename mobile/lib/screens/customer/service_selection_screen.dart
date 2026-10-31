import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/constants/app_colors.dart';
import '../../core/models/rescue_order_model.dart';
import '../../core/services/location_service.dart';
import '../../core/services/rescue_service.dart';
import '../../core/widgets/info_details.dart';
import '../../core/widgets/rescue_ui.dart';
import '../../providers/rescue_provider.dart';
import '../../features/batch_transport/batch_trip_api.dart';
import '../../features/batch_transport/batch_trip_models.dart';
import '../../features/batch_transport/customer_batch_trip_screen.dart';
import 'radar_dispatch_screen.dart';

class ServiceSelectionScreen extends StatefulWidget {
  const ServiceSelectionScreen({
    super.key,
    this.initialService = 0,
    this.vehicleName = 'Honda SH 150i',
    this.vehiclePlate = '59-B1 892.44',
    this.vehicleId = 1,
    this.batchTripApi,
  });
  final int initialService;
  final String vehicleName, vehiclePlate;
  final int vehicleId;
  final BatchTripApi? batchTripApi;

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
  bool _isLoadingTrips = false;
  bool _isSubmitting = false;

  CrossingOptionModel? _selectedOption;
  BatchTripModel? _selectedBatchTrip;
  List<BatchTripModel> _nearbyBatchTrips = const [];
  late final BatchTripApi _batchTripApi;

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
      detail: 'Bạn có thể chọn chuyến riêng để được điều phối ngay, hoặc tham gia một chuyến gom đã được thợ hoặc gara mở sẵn để nhận giá ưu đãi.',
    ),
    (
      title: 'Cứu hộ và kiểm tra xe',
      price: 'Báo giá sau kiểm tra',
      note: 'Thợ quyết định sửa tại chỗ hoặc kéo về gara',
      icon: Icons.build_circle_outlined,
      detail: 'Thợ kiểm tra tình trạng xe tại hiện trường. Nếu có thể khắc phục, thợ lập báo giá sửa tại chỗ; nếu hư hỏng nặng, thợ lập báo giá kéo xe về gara để khách duyệt.',
    ),
  ];

  String get _serviceType =>
      const ['CROSSING', 'REPAIR_ONSITE'][_selectedService];
  String get _orderType =>
      const ['SINGLE_CROSSING', 'ONSITE_REPAIR'][_selectedService];
  String get _customerNote => const [
    'Chở xe vượt ngập đơn lẻ đến nơi khô ráo',
    'Yêu cầu thợ kiểm tra xe và báo giá phương án xử lý phù hợp',
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
    _batchTripApi = widget.batchTripApi ?? BatchTripApi();
    _selectedService = widget.initialService.clamp(0, _services.length - 1);
    _pickupController.addListener(_onPickupAddressChanged);
    _dropoffController.addListener(_onDropoffAddressChanged);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadServiceOptions();
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
    final loc = LocationService.instance.resolveAddressCoordinates(
      text,
      isDropoff: false,
    );
    setState(() {
      if (loc != null) {
        _pickupLat = loc.latitude;
        _pickupLng = loc.longitude;
      } else {
        _pickupLat = null;
        _pickupLng = null;
      }
      _selectedOption = null;
      _selectedBatchTrip = null;
    });
    if (_pickupLat != null && _pickupLng != null) {
      _loadServiceOptions();
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
    final loc = LocationService.instance.resolveAddressCoordinates(
      text,
      isDropoff: true,
    );
    setState(() {
      if (loc != null) {
        _dropoffLat = loc.latitude;
        _dropoffLng = loc.longitude;
      } else {
        _dropoffLat = null;
        _dropoffLng = null;
      }
      _selectedBatchTrip = null;
    });
    if (_selectedService == 0 &&
        _pickupLat != null &&
        _pickupLng != null &&
        _dropoffLat != null &&
        _dropoffLng != null) {
      _loadNearbyBatchTrips();
    }
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
          _pickupController.text =
              'Tọa độ GPS thiết bị (${loc.latitude.toStringAsFixed(4)}, ${loc.longitude.toStringAsFixed(4)})';
          _selectedOption = null;
          _selectedBatchTrip = null;
          _isLocating = false;
        });
        _isProgrammaticAddressUpdate = false;

        _loadServiceOptions();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Đã cập nhật tọa độ đón từ GPS thiết bị: ${loc.latitude.toStringAsFixed(4)}, ${loc.longitude.toStringAsFixed(4)} (±${loc.accuracyMeters.toStringAsFixed(0)}m)',
            ),
            backgroundColor: Colors.green,
          ),
        );
      } else {
        setState(() => _isLocating = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Không thể lấy vị trí từ thiết bị. Vui lòng bật GPS và cấp quyền truy cập vị trí.',
            ),
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
            content: Text(
              'Lỗi đọc GPS: ${e.toString().replaceFirst("Exception: ", "")}',
            ),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _loadServiceOptions() async {
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
      if (_selectedService == 0 &&
          rescueProvider != null &&
          _pickupLat != null &&
          _pickupLng != null) {
        await _loadNearbyBatchTrips();
      } else if (mounted) {
        setState(() {
          _nearbyBatchTrips = const [];
          _selectedBatchTrip = null;
        });
      }
    } catch (_) {}
  }

  Future<void> _loadNearbyBatchTrips() async {
    if (_pickupLat == null ||
        _pickupLng == null ||
        _dropoffLat == null ||
        _dropoffLng == null) {
      if (mounted) setState(() => _nearbyBatchTrips = const []);
      return;
    }
    if (mounted) setState(() => _isLoadingTrips = true);
    try {
      final trips = await _batchTripApi.nearby(
        _pickupLat!,
        _pickupLng!,
        destinationLatitude: _dropoffLat,
        destinationLongitude: _dropoffLng,
      );
      if (!mounted) return;
      setState(() {
        _nearbyBatchTrips = trips;
        if (_selectedBatchTrip != null &&
            !trips.any((trip) => trip.id == _selectedBatchTrip!.id)) {
          _selectedBatchTrip = null;
        }
      });
    } catch (_) {
      if (mounted) setState(() => _nearbyBatchTrips = const []);
    } finally {
      if (mounted) setState(() => _isLoadingTrips = false);
    }
  }

  Future<void> _submitSos() async {
    if (_pickupLat == null || _pickupLng == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Vui lòng chọn hoặc định vị tọa độ điểm đón hợp lệ qua GPS!',
          ),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    if (_selectedService == 0 && (_dropoffLat == null || _dropoffLng == null)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Vui lòng nhập điểm đến hợp lệ hoặc chọn tọa độ khô ráo!',
          ),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    if (_selectedBatchTrip == null && _selectedOption == null) {
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

    final dropoffAddress = _selectedService == 1
        ? _pickupController.text.trim()
        : _dropoffController.text.trim();
    final dropoffLatitude = _selectedService == 1 ? _pickupLat! : _dropoffLat!;
    final dropoffLongitude = _selectedService == 1 ? _pickupLng! : _dropoffLng!;

    final rescueProvider = Provider.of<RescueProvider?>(context, listen: false);
    setState(() => _isSubmitting = true);
    try {
      if (_selectedBatchTrip != null) {
        final trip = _selectedBatchTrip!;
        if (trip.garageId == null || trip.serviceItemId == null) {
          throw Exception('Chuyến gom chưa được cấu hình dịch vụ vượt ngập');
        }
        final orderPayload = <String, dynamic>{
          'orderType': 'BATCH_CROSSING',
          'garageId': trip.garageId,
          'serviceItemId': trip.serviceItemId,
          'vehicleId': widget.vehicleId,
          'pickupAddress': _pickupController.text.trim(),
          'pickupLatitude': _pickupLat!,
          'pickupLongitude': _pickupLng!,
          'dropoffAddress': dropoffAddress,
          'dropoffLatitude': dropoffLatitude,
          'dropoffLongitude': dropoffLongitude,
          'waterLevel': _waterLabels[_waterLevel],
          'customerNotes': 'Tham gia chuyến gom #${trip.id}',
          'clientRequestId': _clientRequestId,
        };
        final joined = await _batchTripApi.createOrderAndJoin(
          tripId: trip.id,
          expectedBatchFare: trip.fare,
          order: orderPayload,
        );
        rescueProvider?.setCurrentOrder(joined.order);
        if (!mounted) return;
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (_) => CustomerBatchTripScreen(
              orderId: joined.order.id,
              garageId: trip.garageId!,
              latitude: _pickupLat!,
              longitude: _pickupLng!,
              destinationLatitude: dropoffLatitude,
              destinationLongitude: dropoffLongitude,
              initialTrip: joined.trip,
            ),
          ),
        );
        return;
      }

      RescueOrderModel order;
      if (rescueProvider != null) {
        order = await rescueProvider.createSingleCrossingOrder(
          orderType: _orderType,
          garageId: _selectedOption!.garageId,
          serviceItemId: _selectedOption!.serviceItemId,
          vehicleId: widget.vehicleId,
          pickupAddress: _pickupController.text.trim(),
          pickupLatitude: _pickupLat!,
          pickupLongitude: _pickupLng!,
          dropoffAddress: dropoffAddress,
          dropoffLatitude: dropoffLatitude,
          dropoffLongitude: dropoffLongitude,
          waterLevel: _waterLabels[_waterLevel],
          customerNotes: _customerNote,
          clientRequestId: _clientRequestId,
          expectedServiceBasePrice: _selectedOption!.serviceBasePrice,
          expectedBookingFee: _selectedOption!.bookingFee,
          expectedTotalAmount: _selectedOption!.totalAmount,
        );
      } else {
        order = await RescueService().createSingleCrossingOrder(
          orderType: _orderType,
          garageId: _selectedOption!.garageId,
          serviceItemId: _selectedOption!.serviceItemId,
          vehicleId: widget.vehicleId,
          pickupAddress: _pickupController.text.trim(),
          pickupLatitude: _pickupLat!,
          pickupLongitude: _pickupLng!,
          dropoffAddress: dropoffAddress,
          dropoffLatitude: dropoffLatitude,
          dropoffLongitude: dropoffLongitude,
          waterLevel: _waterLabels[_waterLevel],
          customerNotes: _customerNote,
          clientRequestId: _clientRequestId,
          expectedServiceBasePrice: _selectedOption!.serviceBasePrice,
          expectedBookingFee: _selectedOption!.bookingFee,
          expectedTotalAmount: _selectedOption!.totalAmount,
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
              content: Text(
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

    return Scaffold(
      appBar: AppBar(title: const Text('Chọn dịch vụ')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            RescueIntro(
              eyebrow: 'BẮT ĐẦU YÊU CẦU',
              title: _introTitle,
              description: _selectedService == 0
                  ? 'Xác nhận điểm đón và điểm trả, sau đó chọn chuyến riêng hoặc tham gia chuyến gom do thợ mở sẵn.'
                  : 'Xác nhận điểm xe đang gặp nạn, chọn gara khả dụng; thợ sẽ kiểm tra và gửi báo giá để bạn duyệt.',
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
                              'Điểm đón (nơi xe đang kẹt)',
                              style: TextStyle(
                                fontSize: 12,
                                color: AppColors.secondary,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            TextField(
                              controller: _pickupController,
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                              ),
                              decoration: const InputDecoration(
                                isDense: true,
                                contentPadding: EdgeInsets.symmetric(
                                  vertical: 4,
                                ),
                                border: UnderlineInputBorder(),
                              ),
                            ),
                            if (_pickupLat == null)
                              const Padding(
                                padding: EdgeInsets.only(top: 2),
                                child: Text(
                                  'Chưa xác định được tọa độ đón. Hãy bấm "Định vị GPS thực tế" hoặc nhập (lat, lon).',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: Colors.deepOrange,
                                  ),
                                ),
                              ),
                            Align(
                              alignment: Alignment.centerRight,
                              child: TextButton.icon(
                                style: TextButton.styleFrom(
                                  visualDensity: VisualDensity.compact,
                                  padding: EdgeInsets.zero,
                                ),
                                onPressed: _isLocating
                                    ? null
                                    : _syncCurrentGpsLocation,
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
                                  ),
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
                      const Icon(
                        Icons.wb_sunny_outlined,
                        color: Colors.green,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Điểm trả xe (vùng khô ráo an toàn)',
                              style: TextStyle(
                                fontSize: 12,
                                color: AppColors.secondary,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            TextField(
                              controller: _dropoffController,
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                              ),
                              decoration: const InputDecoration(
                                isDense: true,
                                contentPadding: EdgeInsets.symmetric(
                                  vertical: 4,
                                ),
                                border: UnderlineInputBorder(),
                              ),
                            ),
                            if (_dropoffLat == null)
                              const Padding(
                                padding: EdgeInsets.only(top: 2),
                                child: Text(
                                  'Chưa xác định được tọa độ trả xe. Hãy nhập điểm quen thuộc hoặc dạng (lat, lon).',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: Colors.deepOrange,
                                  ),
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
              _crossingModeSection(options),
              const SizedBox(height: 14),
            ],

            if (_selectedBatchTrip != null) ...[
              Text(
                'Chuyến gom bạn sẽ tham gia',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              RescuePanel(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Điểm tập kết: ${_selectedBatchTrip!.pickupPlace}',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    Text('Điểm trả: ${_selectedBatchTrip!.destinationPlace}'),
                    const SizedBox(height: 6),
                    Text(
                      '${_selectedBatchTrip!.availableSlots} chỗ còn lại · Khởi hành ${_selectedBatchTrip!.departureTime.toLocal()}',
                      style: const TextStyle(color: AppColors.secondary),
                    ),
                    const Divider(height: 20),
                    _priceRow(
                      'Giá trọn gói mỗi xe',
                      '${_selectedBatchTrip!.fare.toStringAsFixed(0)} ₫',
                      isBold: true,
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Đơn và chỗ trong chuyến chỉ được tạo sau khi bạn xác nhận.',
                      style: TextStyle(fontSize: 11, color: Colors.green),
                    ),
                  ],
                ),
              ),
            ] else ...[
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
                              '${opt.branchAddress ?? opt.branchName ?? "Chi nhánh phục vụ"} • ${opt.serviceBasePrice.toStringAsFixed(0)} ₫',
                              style: const TextStyle(fontSize: 12),
                            ),
                            secondary: Text(
                              '~ ${opt.estimatedTimeMin} phút',
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                color: AppColors.primary,
                              ),
                            ),
                            contentPadding: EdgeInsets.zero,
                          ),
                        const Divider(),
                        if (_selectedOption != null) ...[
                          _priceRow(
                            'Cước dịch vụ niêm yết',
                            '${_selectedOption!.serviceBasePrice.toStringAsFixed(0)} ₫',
                          ),
                          const SizedBox(height: 4),
                          _priceRow(
                            'Phí đặt xe (nền tảng)',
                            '${_selectedOption!.bookingFee.toStringAsFixed(0)} ₫',
                          ),
                          const Divider(height: 16),
                          _priceRow(
                            'Tổng thanh toán dự kiến',
                            '${_selectedOption!.totalAmount.toStringAsFixed(0)} ₫',
                            isBold: true,
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            '✓ Giá niêm yết cố định, không phát sinh phụ phí tại hiện trường',
                            style: TextStyle(
                              fontSize: 11,
                              color: Colors.green,
                              fontWeight: FontWeight.w600,
                            ),
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
                    : _selectedBatchTrip != null
                    ? 'Xác nhận tham gia chuyến'
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

  Widget _crossingModeSection(List<CrossingOptionModel> options) {
    final eligibleTrips = _nearbyBatchTrips.where((trip) {
      return trip.garageId != null && trip.serviceItemId != null;
    }).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Chọn hình thức di chuyển',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 8),
        Card(
          color: _selectedBatchTrip == null
              ? const Color(0xFFFFF8F3)
              : Colors.white,
          child: ListTile(
            key: const ValueKey('crossing-private'),
            onTap: () {
              setState(() {
                _selectedBatchTrip = null;
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
              _selectedBatchTrip == null
                  ? Icons.check_circle
                  : Icons.circle_outlined,
              color: _selectedBatchTrip == null
                  ? AppColors.primaryOrange
                  : AppColors.outlineVariant,
            ),
          ),
        ),
        const SizedBox(height: 6),
        if (_isLoadingTrips)
          const Padding(
            padding: EdgeInsets.all(16),
            child: Center(child: CircularProgressIndicator()),
          )
        else if (eligibleTrips.isEmpty)
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.surfaceContainerLow,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Text(
              'Hiện chưa có chuyến gom phù hợp do thợ hoặc gara mở. Bạn có thể chọn chuyến riêng.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.secondary),
            ),
          )
        else ...[
          const Padding(
            padding: EdgeInsets.only(top: 6, bottom: 4),
            child: Text(
              'Chuyến gom đang mở gần bạn',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
          for (final trip in eligibleTrips)
            Card(
              color: _selectedBatchTrip?.id == trip.id
                  ? const Color(0xFFFFF8F3)
                  : Colors.white,
              child: ListTile(
                key: ValueKey('batch-trip-${trip.id}'),
                onTap: () {
                  setState(() {
                    _selectedBatchTrip = trip;
                    _selectedOption = null;
                    _clientRequestId = UniqueKey().toString();
                  });
                },
                leading: const Icon(Icons.groups_2_outlined),
                title: Text(
                  'Tập kết: ${trip.pickupPlace}',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                subtitle: Text(
                  'Điểm trả: ${trip.destinationPlace}\n'
                  '${trip.availableSlots} chỗ · ${trip.fare.toStringAsFixed(0)} ₫/xe',
                ),
                isThreeLine: true,
                trailing: Icon(
                  _selectedBatchTrip?.id == trip.id
                      ? Icons.check_circle
                      : Icons.circle_outlined,
                  color: _selectedBatchTrip?.id == trip.id
                      ? AppColors.primaryOrange
                      : AppColors.outlineVariant,
                ),
              ),
            ),
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
            _selectedBatchTrip = null;
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
