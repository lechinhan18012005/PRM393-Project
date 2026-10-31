import 'dart:io';

import 'package:flutter/foundation.dart';

class ApiConstants {
  // Use 10.0.2.2 for Android emulator, 127.0.0.1 for iOS simulator & Web / Desktop
  static String get baseUrl {
    const configuredUrl = String.fromEnvironment('API_BASE_URL');
    if (configuredUrl.isNotEmpty) return configuredUrl;
    if (kIsWeb) {
      return 'http://localhost:8080/api/v1';
    }
    try {
      if (Platform.isAndroid) {
        return 'http://10.0.2.2:8080/api/v1';
      }
    } catch (_) {}
    return 'http://localhost:8080/api/v1';
  }

  static String get loginUrl => '$baseUrl/auth/login';
  static String get registerUrl => '$baseUrl/auth/register';
  static String get refreshTokenUrl => '$baseUrl/auth/refresh';
  static String get currentUserUrl => '$baseUrl/auth/me';

  // Garage & Branch Endpoints (Luồng 2)
  static String get garageRegisterUrl => '$baseUrl/garages/register';
  static String get myGarageUrl => '$baseUrl/garages/me';
  static String get garageBranchesUrl => '$baseUrl/garages/branches';
  static String get garageServicesUrl => '$baseUrl/garages/services';

  // Mechanic Endpoints (Luồng 2)
  static String get garageMechanicsUrl => '$baseUrl/garages/mechanics';
  static String get mechanicProfileUrl => '$baseUrl/mechanics/me/profile';
  static String get mechanicStatusUrl => '$baseUrl/mechanics/me/status';

  // Flood Map Endpoints (Luồng 8)
  static String get floodReportsUrl => '$baseUrl/flood-reports';
  static String get activeFloodReportsUrl => '$baseUrl/flood-reports/active';

  // Media Upload (Cloudinary)
  static String get uploadImageUrl => '$baseUrl/upload/image';

  // Luồng 3: Cứu hộ chở xe vượt ngập đơn lẻ
  static String get crossingOptionsUrl => '$baseUrl/rescue/crossing/options';
  static String get rescueOptionsUrl => '$baseUrl/rescue/options';
  static String get rescueOrdersUrl => '$baseUrl/rescue/orders';
  static String get activeRescueOrderUrl => '$baseUrl/rescue/orders/active';
  static String get rescueOrderHistoryUrl => '$baseUrl/rescue/orders/history';
  static String rescueOrderUrl(int orderId) =>
      '$baseUrl/rescue/orders/$orderId';
  static String cancelRescueOrderUrl(int orderId) =>
      '$baseUrl/rescue/orders/$orderId/cancel';
  static String get pendingRescueOffersUrl => '$baseUrl/rescue/offers/pending';
  static String acceptRescueOfferUrl(int offerId) =>
      '$baseUrl/rescue/offers/$offerId/accept';
  static String rejectRescueOfferUrl(int offerId) =>
      '$baseUrl/rescue/offers/$offerId/reject';
  static String updateOrderLocationUrl(int orderId) =>
      '$baseUrl/rescue/orders/$orderId/location';
  static String orderTrackingUrl(int orderId) =>
      '$baseUrl/rescue/orders/$orderId/tracking';
  static String confirmOrderArrivalUrl(int orderId) =>
      '$baseUrl/rescue/orders/$orderId/arrived';
  static String updateTransitStageUrl(int orderId) =>
      '$baseUrl/rescue/orders/$orderId/transit-stage';
  static String completeRescueOrderUrl(int orderId) =>
      '$baseUrl/rescue/orders/$orderId/complete';
  static String rescueOrderEvidenceUrl(int orderId) =>
      '$baseUrl/rescue/orders/$orderId/evidence';

  // Finance & Garage Wallet Endpoints (Luồng 5 - UC-26)
  static String get garageWalletUrl => '$baseUrl/garages/wallet';
  static String get garagePayoutsUrl => '$baseUrl/garages/wallet/payouts';

  // PayOS Payment Endpoints (Luồng 5 - UC-18)
  static String get createPaymentUrl => '$baseUrl/payments/create';
  static String paymentByOrderCodeUrl(int orderCode) =>
      '$baseUrl/payments/$orderCode';
  static String paymentsByRescueOrderUrl(int rescueOrderId) =>
      '$baseUrl/payments/order/$rescueOrderId';
  static String simulateWebhookUrl(int orderCode) =>
      '$baseUrl/payments/$orderCode/simulate-webhook';
  static String confirmCashPaymentUrl(int orderCode) =>
      '$baseUrl/payments/$orderCode/confirm-cash';
}
