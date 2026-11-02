import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import 'batch_trip_api.dart';
import 'batch_trip_models.dart';

class CustomerBatchTripScreen extends StatefulWidget {
  const CustomerBatchTripScreen({
    super.key,
    required this.orderId,
    required this.garageId,
    required this.latitude,
    required this.longitude,
    this.destinationLatitude,
    this.destinationLongitude,
    this.initialTrip,
  });

  final int orderId;
  final int garageId;
  final double latitude;
  final double longitude;
  final double? destinationLatitude;
  final double? destinationLongitude;
  final BatchTripModel? initialTrip;

  @override
  State<CustomerBatchTripScreen> createState() =>
      _CustomerBatchTripScreenState();
}

class _CustomerBatchTripScreenState extends State<CustomerBatchTripScreen> {
  final _api = BatchTripApi();
  List<BatchTripModel> _trips = const [];
  bool _loading = true;
  bool _busy = false;
  BatchTripModel? _joinedTrip;
  String? _error;

  @override
  void initState() {
    super.initState();
    _joinedTrip = widget.initialTrip;
    if (_joinedTrip == null) {
      _load();
    } else {
      _loading = false;
    }
  }

  Future<void> _load() async {
    try {
      final trips = await _api.nearby(
        widget.latitude,
        widget.longitude,
        garageId: widget.garageId,
        destinationLatitude: widget.destinationLatitude,
        destinationLongitude: widget.destinationLongitude,
      );
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

  Future<void> _join(BatchTripModel trip) async {
    setState(() => _busy = true);
    try {
      final joined = await _api.join(trip.id, widget.orderId);
      if (!mounted) return;
      setState(() => _joinedTrip = joined);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Đã tham gia chuyến gom')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _leave({required bool convertPrivate}) async {
    final trip = _joinedTrip;
    if (trip == null) return;
    setState(() => _busy = true);
    try {
      if (convertPrivate) {
        await _api.convertPrivate(trip.id, widget.orderId);
      } else {
        await _api.leave(trip.id, widget.orderId);
      }
      if (!mounted) return;
      if (convertPrivate) {
        Navigator.pop(context, 'PRIVATE');
      } else {
        setState(() => _joinedTrip = null);
        await _load();
      }
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
    backgroundColor: AppColors.surface,
    appBar: AppBar(title: const Text('Chọn chuyến gom gần bạn')),
    body: _joinedTrip != null
        ? _JoinedTripView(
            trip: _joinedTrip!,
            busy: _busy,
            onLeave: () => _leave(convertPrivate: false),
            onConvertPrivate: () => _leave(convertPrivate: true),
          )
        : _loading
        ? const Center(child: CircularProgressIndicator())
        : _error != null
        ? Center(child: Text(_error!, textAlign: TextAlign.center))
        : _trips.isEmpty
        ? const Center(child: Text('Chưa có chuyến gom trong bán kính 5 km'))
        : ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: _trips.length,
            itemBuilder: (_, index) {
              final trip = _trips[index];
              return Card(
                child: ListTile(
                  title: Text(
                    trip.pickupPlace,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  subtitle: Text(
                    'Điểm trả: ${trip.destinationPlace}\n'
                    '${trip.availableSlots} chỗ trống · khởi hành ${trip.departureTime.toLocal()}',
                  ),
                  isThreeLine: true,
                  trailing: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text('${trip.fare.toStringAsFixed(0)} đ'),
                      TextButton(
                        onPressed: _busy ? null : () => _join(trip),
                        child: const Text('Tham gia'),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
  );
}

class _JoinedTripView extends StatelessWidget {
  const _JoinedTripView({
    required this.trip,
    required this.busy,
    required this.onLeave,
    required this.onConvertPrivate,
  });

  final BatchTripModel trip;
  final bool busy;
  final VoidCallback onLeave;
  final VoidCallback onConvertPrivate;

  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.all(16),
    children: [
      Card(
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Đã tham gia chuyến #BATCH-${trip.id}',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 12),
              Text('Điểm tập kết: ${trip.pickupPlace}'),
              Text('Điểm trả an toàn: ${trip.destinationPlace}'),
              Text('${trip.currentVehicleCount}/${trip.capacity} xe'),
              Text('Giá: ${trip.fare.toStringAsFixed(0)} đ'),
              Text('Khởi hành: ${trip.departureTime.toLocal()}'),
              const SizedBox(height: 12),
              const Text(
                'Hãy đưa xe tới điểm tập kết và chờ thợ xác nhận tiếp nhận. Bạn có thể rời chuyến trước khi thợ bắt đầu đón xe.',
                style: TextStyle(color: AppColors.secondary, height: 1.5),
              ),
            ],
          ),
        ),
      ),
      const SizedBox(height: 12),
      OutlinedButton(
        onPressed: busy ? null : onLeave,
        child: const Text('Rời chuyến gom'),
      ),
      TextButton(
        onPressed: busy ? null : onConvertPrivate,
        child: const Text('Chuyển sang chuyến riêng'),
      ),
    ],
  );
}
