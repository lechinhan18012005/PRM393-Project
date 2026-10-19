import 'package:flutter/material.dart';
import '../core/models/flood_report_model.dart';
import '../core/services/flood_report_service.dart';

class FloodReportProvider with ChangeNotifier {
  final FloodReportService _floodService = FloodReportService();

  List<FloodReportModel> _floodPoints = [];
  bool _isLoading = false;
  String? _errorMessage;

  List<FloodReportModel> get floodPoints => _floodPoints;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

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
      if (point.moderationStatus == 'APPROVED') {
        _floodPoints.insert(0, point);
      }
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

  Future<String> uploadPhoto(List<int> bytes, String fileName) async {
    return await _floodService.uploadImageBytes(bytes, fileName);
  }
}
