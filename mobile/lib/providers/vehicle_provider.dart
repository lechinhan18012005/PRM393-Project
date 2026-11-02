import 'package:flutter/material.dart';

import '../core/models/vehicle_model.dart';
import '../core/services/vehicle_service.dart';

class VehicleProvider with ChangeNotifier {
  final VehicleService _vehicleService;

  VehicleProvider({VehicleService? vehicleService})
      : _vehicleService = vehicleService ?? VehicleService();

  List<VehicleModel> _vehicles = [];
  VehicleModel? _selectedVehicle;
  bool _isLoading = false;
  String? _errorMessage;

  List<VehicleModel> get vehicles => _vehicles;
  VehicleModel? get selectedVehicle => _selectedVehicle;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<void> fetchVehicles() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      _vehicles = await _vehicleService.getMyVehicles();
      if (_vehicles.isNotEmpty) {
        // Ưu tiên xe default hoặc xe đang chọn trước đó
        final currentId = _selectedVehicle?.id;
        if (currentId != null && _vehicles.any((v) => v.id == currentId)) {
          _selectedVehicle = _vehicles.firstWhere((v) => v.id == currentId);
        } else {
          _selectedVehicle = _vehicles.firstWhere(
            (v) => v.isDefault,
            orElse: () => _vehicles.first,
          );
        }
      } else {
        _selectedVehicle = null;
      }
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void selectVehicle(VehicleModel vehicle) {
    _selectedVehicle = vehicle;
    notifyListeners();
  }

  Future<bool> setDefaultVehicle(int vehicleId) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      final updated = await _vehicleService.setDefaultVehicle(vehicleId);
      _vehicles = _vehicles.map((v) {
        if (v.id == vehicleId) {
          return updated;
        } else {
          return v.copyWith(isDefault: false);
        }
      }).toList();
      _selectedVehicle = updated;
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

  Future<bool> addVehicle({
    required String licensePlate,
    required String brand,
    required String model,
    String? vehicleType,
    String? engineCapacity,
    String? color,
    bool isDefault = false,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      final newVehicle = await _vehicleService.addVehicle(
        licensePlate: licensePlate,
        brand: brand,
        model: model,
        vehicleType: vehicleType,
        engineCapacity: engineCapacity,
        color: color,
        isDefault: isDefault,
      );
      if (isDefault || _vehicles.isEmpty) {
        _vehicles = _vehicles.map((v) => v.copyWith(isDefault: false)).toList();
        _selectedVehicle = newVehicle;
      }
      _vehicles.add(newVehicle);
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

  Future<bool> deleteVehicle(int vehicleId) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      await _vehicleService.deleteVehicle(vehicleId);
      final wasSelected = _selectedVehicle?.id == vehicleId;
      _vehicles.removeWhere((v) => v.id == vehicleId);
      if (wasSelected) {
        _selectedVehicle = _vehicles.isNotEmpty
            ? _vehicles.firstWhere((v) => v.isDefault, orElse: () => _vehicles.first)
            : null;
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
}
