import 'package:flutter/material.dart';
import '../core/models/branch_model.dart';
import '../core/models/garage_model.dart';
import '../core/models/service_item_model.dart';
import '../core/services/garage_service.dart';

class GarageProvider with ChangeNotifier {
  final GarageService _garageService = GarageService();

  GarageModel? _currentGarage;
  List<BranchModel> _branches = [];
  List<ServiceItemModel> _services = [];
  bool _isLoading = false;
  String? _errorMessage;

  GarageModel? get currentGarage => _currentGarage;
  List<BranchModel> get branches => _branches;
  List<ServiceItemModel> get services => _services;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<void> fetchMyGarage() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      _currentGarage = await _garageService.getMyGarage();
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> fetchBranches() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      _branches = await _garageService.getMyBranches();
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> createBranch({
    required String branchName,
    required String address,
    required double latitude,
    required double longitude,
    String? phoneNumber,
    String? rescueVehicles,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      final newBranch = await _garageService.createBranch(
        branchName: branchName,
        address: address,
        latitude: latitude,
        longitude: longitude,
        phoneNumber: phoneNumber,
        rescueVehicles: rescueVehicles,
      );
      _branches.add(newBranch);
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

  Future<void> toggleBranchStatus(int branchId, bool open) async {
    try {
      final updated = await _garageService.toggleBranchStatus(branchId, open ? 'OPEN' : 'CLOSED_MAINTENANCE');
      final index = _branches.indexWhere((b) => b.id == branchId);
      if (index != -1) {
        _branches[index] = updated;
        notifyListeners();
      }
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      notifyListeners();
    }
  }

  Future<void> fetchServices() async {
    try {
      _services = await _garageService.getMyServices();
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      notifyListeners();
    }
  }
}
