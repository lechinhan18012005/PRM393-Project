import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/models/flood_report_model.dart';
import '../core/services/flood_report_service.dart';

class FloodReportProvider with ChangeNotifier {
  final FloodReportService _floodService;
  static const String _offlineQueueKey = 'flood_offline_reports_queue';

  FloodReportProvider({FloodReportService? floodService})
      : _floodService = floodService ?? FloodReportService() {
    loadOfflineQueue().then((_) => syncOfflineReports());
  }

  List<FloodReportModel> _floodPoints = [];
  List<FloodReportModel> _myFloodReports = [];
  final List<Map<String, dynamic>> _offlineQueue = [];
  bool _isLoading = false;
  String? _errorMessage;

  List<FloodReportModel> get floodPoints => _floodPoints;
  List<FloodReportModel> get myFloodReports => _myFloodReports;
  List<Map<String, dynamic>> get offlineQueue => _offlineQueue;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<void> loadOfflineQueue() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonStr = prefs.getString(_offlineQueueKey);
      if (jsonStr != null && jsonStr.isNotEmpty) {
        final List<dynamic> decoded = jsonDecode(jsonStr);
        _offlineQueue.clear();
        _offlineQueue.addAll(decoded.map((e) => Map<String, dynamic>.from(e)));
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<void> _saveOfflineQueue() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_offlineQueueKey, jsonEncode(_offlineQueue));
    } catch (_) {}
  }

  Future<void> fetchActiveFloodPoints() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      _floodPoints = await _floodService.getActiveFloodReports();
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> fetchMyFloodReports() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      _myFloodReports = await _floodService.getMyFloodReports();
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> submitFloodReport({
    required double latitude,
    required double longitude,
    required String address,
    required String waterDepthLevel,
    String? description,
    String? imageUrls,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      final point = await _floodService.reportFlood(
        latitude: latitude,
        longitude: longitude,
        address: address,
        waterDepthLevel: waterDepthLevel,
        description: description,
        imageUrls: imageUrls,
      );
      _floodPoints.insert(0, point);
      _myFloodReports.insert(0, point);
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // UC-20 (4.2.2): Lưu tạm vào hàng đợi ngoại tuyến khi mất sóng 4G/WiFi
  void enqueueOfflineReport({
    required double latitude,
    required double longitude,
    required String address,
    required String waterDepthLevel,
    String? description,
    String? imageUrls,
  }) {
    _offlineQueue.add({
      'latitude': latitude,
      'longitude': longitude,
      'address': address,
      'waterDepthLevel': waterDepthLevel,
      'description': description,
      'imageUrls': imageUrls,
      'queuedAt': DateTime.now().toIso8601String(),
    });
    _saveOfflineQueue();
    notifyListeners();
  }

  // UC-20 (4.2.2): Đồng bộ hàng đợi ngoại tuyến khi có mạng trở lại (TTL 2 giờ)
  Future<int> syncOfflineReports() async {
    if (_offlineQueue.isEmpty) return 0;
    int syncedCount = 0;
    final now = DateTime.now();
    final List<Map<String, dynamic>> remainingQueue = [];

    for (final report in _offlineQueue) {
      final queuedAt = DateTime.tryParse(report['queuedAt'] ?? '') ?? now;
      // Nếu quá 2 giờ thì hủy bỏ theo BR-MAP-007
      if (now.difference(queuedAt).inHours >= 2) {
        continue;
      }
      try {
        await _floodService.reportFlood(
          latitude: report['latitude'] as double,
          longitude: report['longitude'] as double,
          address: report['address'] as String,
          waterDepthLevel: report['waterDepthLevel'] as String,
          description: report['description'] as String?,
          imageUrls: report['imageUrls'] as String?,
        );
        syncedCount++;
      } catch (_) {
        remainingQueue.add(report);
      }
    }

    _offlineQueue.clear();
    _offlineQueue.addAll(remainingQueue);
    await _saveOfflineQueue();
    notifyListeners();
    return syncedCount;
  }

  // UC-20 (4.2.4): Cộng đồng gửi phản hồi nước đã rút tại điểm ngập
  Future<FloodReportModel?> reportWaterReceded(int id) async {
    try {
      final updated = await _floodService.reportWaterReceded(id);
      final index = _floodPoints.indexWhere((p) => p.id == id);
      if (index != -1) {
        if (updated.moderationStatus == 'EXPIRED') {
          _floodPoints.removeAt(index);
        } else {
          _floodPoints[index] = updated;
        }
      }
      final myIndex = _myFloodReports.indexWhere((p) => p.id == id);
      if (myIndex != -1) {
        _myFloodReports[myIndex] = updated;
      }
      notifyListeners();
      return updated;
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      notifyListeners();
      return null;
    }
  }

  Future<String> uploadPhoto(List<int> bytes, String fileName) async {
    return await _floodService.uploadImageBytes(bytes, fileName);
  }

  // UC-20: Tác giả rút lại / hủy báo cáo khi đang chờ duyệt PENDING
  Future<bool> cancelPendingReport(int id) async {
    try {
      final updated = await _floodService.cancelPendingReport(id);
      final myIndex = _myFloodReports.indexWhere((p) => p.id == id);
      if (myIndex != -1) {
        _myFloodReports[myIndex] = updated;
      }
      final activeIndex = _floodPoints.indexWhere((p) => p.id == id);
      if (activeIndex != -1) {
        _floodPoints.removeAt(activeIndex);
      }
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      notifyListeners();
      return false;
    }
  }
}
