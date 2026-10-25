import 'dart:async';
import 'package:flutter/material.dart';
import '../core/models/rescue_order_model.dart';
import '../core/services/rescue_service.dart';

class RescueProvider with ChangeNotifier {
  final RescueService _rescueService = RescueService();

  RescueOrderModel? _currentOrder;
  RescueOrderModel? get currentOrder => _currentOrder;

  TrackingSnapshotModel? _currentTracking;
  TrackingSnapshotModel? get currentTracking => _currentTracking;

  List<CrossingOptionModel> _crossingOptions = [];
  List<CrossingOptionModel> get crossingOptions => _crossingOptions;

  List<RescueOfferModel> _pendingOffers = [];
  List<RescueOfferModel> get pendingOffers => _pendingOffers;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String? _errorMessage;
  String? get errorMessage => _errorMessage;

  Timer? _pollingTimer;

  void setCurrentOrder(RescueOrderModel? order) {
    _currentOrder = order;
    notifyListeners();
  }

  // 1. Phá»¥c há»“i Ä‘Æ¡n active khi má»Ÿ app hoáº·c vÃ o mÃ n hÃ¬nh
  Future<RescueOrderModel?> loadActiveOrder() async {
    try {
      final order = await _rescueService.getActiveOrder();
      _currentOrder = order;
      notifyListeners();
      return order;
    } catch (e) {
      // Bá» qua lá»—i máº¡ng ná»n
      return null;
    }
  }

  // 2. Táº£i danh sÃ¡ch lá»±a chá»n chá»Ÿ xe vÆ°á»£t ngáº­p
  Future<void> loadCrossingOptions({double? pickupLatitude, double? pickupLongitude}) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      _crossingOptions = await _rescueService.getCrossingOptions(
        pickupLatitude: pickupLatitude,
        pickupLongitude: pickupLongitude,
      );
    } catch (e) {
      _errorMessage = e.toString().replaceFirst('Exception: ', '');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // 3. KhÃ¡ch táº¡o Ä‘Æ¡n SOS
  Future<RescueOrderModel> createSingleCrossingOrder({
    required int garageId,
    required int serviceItemId,
    required int vehicleId,
    required String pickupAddress,
    required double pickupLatitude,
    required double pickupLongitude,
    required String dropoffAddress,
    required double dropoffLatitude,
    required double dropoffLongitude,
    String? waterLevel,
    String? customerNotes,
    String? clientRequestId,
    double? expectedServiceBasePrice,
    double? expectedBookingFee,
    double? expectedTotalAmount,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      final order = await _rescueService.createSingleCrossingOrder(
        garageId: garageId,
        serviceItemId: serviceItemId,
        vehicleId: vehicleId,
        pickupAddress: pickupAddress,
        pickupLatitude: pickupLatitude,
        pickupLongitude: pickupLongitude,
        dropoffAddress: dropoffAddress,
        dropoffLatitude: dropoffLatitude,
        dropoffLongitude: dropoffLongitude,
        waterLevel: waterLevel,
        customerNotes: customerNotes,
        clientRequestId: clientRequestId,
        expectedServiceBasePrice: expectedServiceBasePrice,
        expectedBookingFee: expectedBookingFee,
        expectedTotalAmount: expectedTotalAmount,
      );
      _currentOrder = order;
      return order;
    } catch (e) {
      _errorMessage = e.toString().replaceFirst('Exception: ', '');
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // 4. Báº¯t Ä‘áº§u vÃ²ng láº·p polling tracking (fallback HTTP & realtime)
  void startTrackingPolling(int orderId) {
    stopTrackingPolling();
    fetchTrackingSnapshot(orderId);
    _pollingTimer = Timer.periodic(const Duration(seconds: 4), (_) async {
      await fetchTrackingSnapshot(orderId);
      // Äá»“ng thá»i cáº­p nháº­t tráº¡ng thÃ¡i Ä‘Æ¡n
      try {
        final order = await _rescueService.getOrderById(orderId);
        _currentOrder = order;
        notifyListeners();
      } catch (_) {}
    });
  }

  void stopTrackingPolling() {
    _pollingTimer?.cancel();
    _pollingTimer = null;
  }

  Future<void> fetchTrackingSnapshot(int orderId) async {
    try {
      final snapshot = await _rescueService.getTrackingSnapshot(orderId);
      _currentTracking = snapshot;
      notifyListeners();
    } catch (_) {}
  }

  // 5. KhÃ¡ch há»§y Ä‘Æ¡n
  Future<void> cancelOrder(int orderId, {String? reason}) async {
    _isLoading = true;
    notifyListeners();
    try {
      final order = await _rescueService.cancelOrder(orderId, reason: reason);
      _currentOrder = order;
      stopTrackingPolling();
    } catch (e) {
      _errorMessage = e.toString().replaceFirst('Exception: ', '');
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // 6. Thá»£ táº£i danh sÃ¡ch offer
  Future<void> loadPendingOffers() async {
    try {
      _pendingOffers = await _rescueService.getPendingOffers();
      notifyListeners();
    } catch (_) {}
  }

  // 7. Thá»£ nháº­n offer
  Future<RescueOrderModel> acceptOffer(int offerId) async {
    _isLoading = true;
    notifyListeners();
    try {
      final order = await _rescueService.acceptOffer(offerId);
      _currentOrder = order;
      _pendingOffers.removeWhere((o) => o.offerId == offerId);
      return order;
    } catch (e) {
      _errorMessage = e.toString().replaceFirst('Exception: ', '');
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // 8. Thá»£ tá»« chá»‘i offer
  Future<void> rejectOffer(int offerId, {String? reason}) async {
    try {
      await _rescueService.rejectOffer(offerId, reason: reason);
      _pendingOffers.removeWhere((o) => o.offerId == offerId);
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString().replaceFirst('Exception: ', '');
      rethrow;
    }
  }

  @override
  void dispose() {
    stopTrackingPolling();
    super.dispose();
  }
}
