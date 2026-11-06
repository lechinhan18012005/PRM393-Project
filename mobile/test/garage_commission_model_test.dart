import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/models/rescue_order_model.dart';

void main() {
  test('Garage quote retains commission and does not invent a booking surcharge', () {
    final option = CrossingOptionModel.fromJson({
      'garageId': 1,
      'serviceItemId': 2,
      'serviceBasePrice': 120000,
      'totalAmount': 120000,
      'commissionRate': 12.5,
      'groupCommissionRate': 12.5,
      'groupPrice2Vehicles': 200000,
    });
    expect(option.bookingFee, 0);
    expect(option.totalAmount, 120000);
    expect(option.commissionRate, 12.5);
    expect(option.groupCommissionRate, 12.5);
    expect(option.groupPrices[2], 200000);
  });
}
