import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/models/mechanic_staff_model.dart';
import '../../core/services/mechanic_service.dart';
import '../../core/services/media_service.dart';
import '../../core/services/rescue_service.dart';
import '../../core/services/location_service.dart';
import '../../features/batch_transport/batch_trip_api.dart';
import '../../features/batch_transport/batch_trip_models.dart';
import '../../features/batch_transport/map_location_picker_screen.dart';

class BatchTransportManageScreen extends StatefulWidget {
  const BatchTransportManageScreen({super.key, this.operatorMode = false});

  final bool operatorMode;

  @override
  State<BatchTransportManageScreen> createState() =>
      _BatchTransportManageScreenState();
}

class _BatchTransportManageScreenState
    extends State<BatchTransportManageScreen> {
  final _api = BatchTripApi();
  final _mechanicService = MechanicService();
  List<BatchTripModel> _trips = const [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final trips = await _api.mine();
      if (!mounted) return;
      setState(() {
        _trips = trips;
        _loading = false;
        _error = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  Future<void> _openCreate() async {
    try {
      final mechanics = widget.operatorMode
          ? <MechanicStaffModel>[]
          : await _mechanicService.getMyMechanics();
      if (!mounted) return;
      final created = await showModalBottomSheet<bool>(
        context: context,
        isScrollControlled: true,
        builder: (_) => _CreateTripSheet(
          api: _api,
          mechanics: mechanics,
          requiresMechanic: !widget.operatorMode,
        ),
      );
      if (created == true) await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
      );
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppColors.surface,
    appBar: AppBar(
      title: const Text('Chuyến gom vượt ngập'),
      actions: [IconButton(onPressed: _load, icon: const Icon(Icons.refresh))],
    ),
    floatingActionButton: FloatingActionButton.extended(
      onPressed: _openCreate,
      icon: const Icon(Icons.add),
      label: const Text('Tạo chuyến'),
    ),
    body: _loading
        ? const Center(child: CircularProgressIndicator())
        : _error != null
        ? Center(child: Text(_error!, textAlign: TextAlign.center))
        : _trips.isEmpty
        ? const Center(child: Text('Chưa có chuyến gom'))
        : RefreshIndicator(
            onRefresh: _load,
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _trips.length,
              itemBuilder: (_, index) => _TripCard(
                _trips[index],
                onTap: widget.operatorMode
                    ? () async {
                        await Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) =>
                                _BatchTripOperationScreen(trip: _trips[index]),
                          ),
                        );
                        _load();
                      }
                    : null,
              ),
            ),
          ),
  );
}

class _TripCard extends StatelessWidget {
  const _TripCard(this.trip, {this.onTap});
  final BatchTripModel trip;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => Card(
    margin: const EdgeInsets.only(bottom: 12),
    child: InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '#BATCH-${trip.id}',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                Chip(label: Text(trip.status)),
              ],
            ),
            Text('Tập kết: ${trip.pickupPlace}'),
            Text('Điểm trả: ${trip.destinationPlace}'),
            const SizedBox(height: 8),
            Text(
              '${trip.currentVehicleCount}/${trip.capacity} xe · '
              '${trip.fare.toStringAsFixed(0)} đ/xe',
            ),
            const SizedBox(height: 6),
            LinearProgressIndicator(
              value: trip.currentVehicleCount / trip.capacity,
            ),
            const SizedBox(height: 6),
            Text(
              'Khởi hành: ${trip.departureTime.toLocal()}',
              style: const TextStyle(color: AppColors.secondary, fontSize: 12),
            ),
          ],
        ),
      ),
    ),
  );
}

class _BatchTripOperationScreen extends StatefulWidget {
  const _BatchTripOperationScreen({required this.trip});

  final BatchTripModel trip;

  @override
  State<_BatchTripOperationScreen> createState() =>
      _BatchTripOperationScreenState();
}

class _BatchTripOperationScreenState extends State<_BatchTripOperationScreen> {
  final _api = BatchTripApi();
  final _rescueService = RescueService();
  late BatchTripModel _trip;
  List<BatchOrderModel> _orders = const [];
  bool _loading = true;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _trip = widget.trip;
    _load();
  }

  Future<void> _load() async {
    try {
      final orders = await _api.orders(_trip.id);
      if (!mounted) return;
      setState(() {
        _orders = orders;
        _loading = false;
        _error = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  Future<void> _run(
    Future<BatchTripModel> Function() action,
    String message,
  ) async {
    setState(() => _busy = true);
    try {
      final trip = await action();
      if (!mounted) return;
      setState(() => _trip = trip);
      await _load();
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(message)));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _deliver(BatchOrderModel order) async {
    final file = await MediaService.instance.pickImageFromCamera();
    if (file == null) return;
    setState(() => _busy = true);
    try {
      final imageUrl = await _rescueService.uploadOrderEvidence(
        order.id,
        file.bytes,
        file.filename,
      );
      final trip = await _api.delivered(_trip.id, order.id, imageUrl);
      if (!mounted) return;
      setState(() => _trip = trip);
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text('Vận hành chuyến #${_trip.id}')),
    body: _loading
        ? const Center(child: CircularProgressIndicator())
        : _error != null
        ? Center(child: Text(_error!))
        : ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _TripCard(_trip),
              const SizedBox(height: 12),
              ..._orders.map(
                (order) => Card(
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${order.orderCode} · ${order.vehiclePlate}',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        Text('${order.customerName} · ${order.pickupAddress}'),
                        Text('Trạng thái: ${order.transportStage}'),
                        const SizedBox(height: 8),
                        if (_trip.status == 'PICKING_UP')
                          OutlinedButton.icon(
                            onPressed: _busy || order.pickedUp
                                ? null
                                : () => _run(
                                    () => _api.pickedUp(_trip.id, order.id),
                                    'Đã tiếp nhận ${order.vehiclePlate}',
                                  ),
                            icon: const Icon(Icons.key_outlined),
                            label: Text(
                              order.pickedUp
                                  ? 'Đã nhận xe'
                                  : 'Xác nhận nhận xe',
                            ),
                          ),
                        if (_trip.status == 'MOVING')
                          OutlinedButton.icon(
                            onPressed: _busy || order.delivered
                                ? null
                                : () => _deliver(order),
                            icon: const Icon(Icons.camera_alt_outlined),
                            label: Text(
                              order.delivered
                                  ? 'Đã bàn giao'
                                  : 'Chụp ảnh và bàn giao',
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              if (_trip.status == 'GATHERING') ...[
                const Card(
                  child: Padding(
                    padding: EdgeInsets.all(14),
                    child: Text(
                      'Đang chờ đủ xe hoặc hết 10 phút tập kết trước khi bắt đầu đón.',
                    ),
                  ),
                ),
                OutlinedButton(
                  onPressed: _busy
                      ? null
                      : () => _run(
                          () => _api.cancel(_trip.id),
                          'Đã hủy chuyến gom',
                        ),
                  child: const Text('Hủy chuyến'),
                ),
              ],
              if (_trip.status == 'READY') ...[
                FilledButton(
                  onPressed: _busy || _orders.isEmpty
                      ? null
                      : () => _run(
                          () => _api.startPickup(_trip.id),
                          'Bắt đầu đón xe',
                        ),
                  child: const Text('Bắt đầu đón xe'),
                ),
                TextButton(
                  onPressed: _busy
                      ? null
                      : () => _run(
                          () => _api.cancel(_trip.id),
                          'Đã hủy chuyến gom',
                        ),
                  child: const Text('Hủy chuyến'),
                ),
              ],
              if (_trip.status == 'PICKING_UP')
                FilledButton(
                  onPressed: _busy
                      ? null
                      : () => _run(
                          () => _api.startMoving(_trip.id),
                          'Bắt đầu di chuyển',
                        ),
                  child: const Text('Khởi hành sau khi đã nhận đủ xe'),
                ),
              if (_trip.status == 'MOVING')
                FilledButton(
                  onPressed: _busy
                      ? null
                      : () => _run(
                          () => _api.complete(_trip.id),
                          'Chuyến gom đã hoàn tất',
                        ),
                  child: const Text('Hoàn tất sau khi bàn giao đủ xe'),
                ),
            ],
          ),
  );
}

class _CreateTripSheet extends StatefulWidget {
  const _CreateTripSheet({
    required this.api,
    required this.mechanics,
    required this.requiresMechanic,
  });
  final BatchTripApi api;
  final List<MechanicStaffModel> mechanics;
  final bool requiresMechanic;

  @override
  State<_CreateTripSheet> createState() => _CreateTripSheetState();
}

class _CreateTripSheetState extends State<_CreateTripSheet> {
  final _form = GlobalKey<FormState>();
  final _pickup = TextEditingController();
  final _destination = TextEditingController();
  final _fare = TextEditingController();
  PickedMapLocation? _pickupLocation;
  PickedMapLocation? _destinationLocation;
  int _capacity = 4;
  int? _mechanicId;
  bool _saving = false;

  Future<void> _save() async {
    if (!_form.currentState!.validate() ||
        (widget.requiresMechanic && _mechanicId == null)) {
      return;
    }
    if (_pickupLocation == null || _destinationLocation == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Hãy chọn điểm tập kết và điểm trả an toàn trên bản đồ.',
          ),
        ),
      );
      return;
    }
    final routeDistance = LocationService.instance.calculateDistanceMeters(
      _pickupLocation!.latitude,
      _pickupLocation!.longitude,
      _destinationLocation!.latitude,
      _destinationLocation!.longitude,
    );
    if (routeDistance < 100 || routeDistance > 30000) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            routeDistance < 100
                ? 'Điểm trả phải cách điểm tập kết ít nhất 100 m.'
                : 'Tuyến gom không được dài quá 30 km.',
          ),
        ),
      );
      return;
    }
    setState(() => _saving = true);
    try {
      await widget.api.create(
        mechanicId: _mechanicId,
        capacity: _capacity,
        pickupPlace: _pickup.text.trim(),
        destinationPlace: _destination.text.trim(),
        fare: double.parse(_fare.text),
        pickupLatitude: _pickupLocation!.latitude,
        pickupLongitude: _pickupLocation!.longitude,
        destinationLatitude: _destinationLocation!.latitude,
        destinationLongitude: _destinationLocation!.longitude,
      );
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
      );
      setState(() => _saving = false);
    }
  }

  Future<void> _pickLocation({required bool pickup}) async {
    final current = pickup ? _pickupLocation : _destinationLocation;
    final fallback = pickup ? null : _pickupLocation;
    final selected = await Navigator.of(context).push<PickedMapLocation>(
      MaterialPageRoute(
        builder: (_) => MapLocationPickerScreen(
          title: pickup ? 'Chọn điểm tập kết' : 'Chọn điểm trả an toàn',
          instruction: pickup
              ? 'Chọn nơi an toàn, dễ nhận biết và đủ chỗ để khách đưa xe tới tập kết.'
              : 'Chọn nơi khô ráo, an toàn để bàn giao xe sau khi vượt điểm ngập.',
          initialLatitude: current?.latitude ?? fallback?.latitude,
          initialLongitude: current?.longitude ?? fallback?.longitude,
        ),
      ),
    );
    if (selected == null || !mounted) return;
    setState(() {
      if (pickup) {
        _pickupLocation = selected;
        if (_pickup.text.trim().isEmpty) {
          _pickup.text = 'Điểm tập kết đã chọn';
        }
      } else {
        _destinationLocation = selected;
        if (_destination.text.trim().isEmpty) {
          _destination.text = 'Điểm trả an toàn đã chọn';
        }
      }
    });
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.fromLTRB(
      16,
      16,
      16,
      MediaQuery.viewInsetsOf(context).bottom + 16,
    ),
    child: Form(
      key: _form,
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Tạo chuyến gom',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            if (widget.requiresMechanic)
              DropdownButtonFormField<int>(
                initialValue: _mechanicId,
                decoration: const InputDecoration(labelText: 'Thợ phụ trách'),
                items: widget.mechanics
                    .where((m) => m.branchId != null)
                    .map(
                      (m) => DropdownMenuItem(
                        value: m.id,
                        child: Text('${m.fullName} · ${m.branchName ?? ''}'),
                      ),
                    )
                    .toList(),
                onChanged: (value) => setState(() => _mechanicId = value),
                validator: (value) =>
                    value == null ? 'Chọn thợ phụ trách' : null,
              )
            else
              const ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Icon(Icons.person_outline),
                title: Text('Bạn là thợ phụ trách chuyến này'),
              ),
            DropdownButtonFormField<int>(
              initialValue: _capacity,
              decoration: const InputDecoration(labelText: 'Sức chứa'),
              items: [4, 5, 6]
                  .map((n) => DropdownMenuItem(value: n, child: Text('$n xe')))
                  .toList(),
              onChanged: (value) => setState(() => _capacity = value ?? 4),
            ),
            _field(_pickup, 'Tên điểm tập kết dễ nhận biết'),
            _field(_fare, 'Giá mỗi xe', number: true),
            _mapLocationField(
              title: 'Điểm tập kết',
              description: 'Nơi khách đưa xe tới để thợ tiếp nhận',
              location: _pickupLocation,
              icon: Icons.groups_2_outlined,
              onTap: () => _pickLocation(pickup: true),
            ),
            _field(_destination, 'Tên điểm trả an toàn dễ nhận biết'),
            _mapLocationField(
              title: 'Điểm trả an toàn',
              description: 'Nơi khô ráo để bàn giao xe',
              location: _destinationLocation,
              icon: Icons.flag_outlined,
              onTap: () => _pickLocation(pickup: false),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _saving ? null : _save,
                child: Text(_saving ? 'Đang tạo...' : 'Mở chuyến 10 phút'),
              ),
            ),
          ],
        ),
      ),
    ),
  );

  Widget _field(
    TextEditingController controller,
    String label, {
    bool number = false,
  }) => Padding(
    padding: const EdgeInsets.only(top: 8),
    child: TextFormField(
      controller: controller,
      keyboardType: number
          ? const TextInputType.numberWithOptions(decimal: true, signed: true)
          : null,
      decoration: InputDecoration(labelText: label),
      validator: (value) => value == null || value.trim().isEmpty
          ? 'Không được để trống'
          : number && double.tryParse(value) == null
          ? 'Số không hợp lệ'
          : null,
    ),
  );

  Widget _mapLocationField({
    required String title,
    required String description,
    required PickedMapLocation? location,
    required IconData icon,
    required VoidCallback onTap,
  }) => Card(
    margin: const EdgeInsets.only(top: 10),
    child: ListTile(
      onTap: onTap,
      leading: Icon(icon, color: AppColors.primaryOrange),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
      subtitle: Text(
        location == null
            ? '$description\nChưa chọn vị trí'
            : '$description\n${location.latitude.toStringAsFixed(5)}, '
                  '${location.longitude.toStringAsFixed(5)}',
      ),
      isThreeLine: true,
      trailing: const Icon(Icons.map_outlined),
    ),
  );
}
