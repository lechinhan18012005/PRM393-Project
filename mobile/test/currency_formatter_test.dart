import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/utils/currency_formatter.dart';

void main() {
  test('formats Vietnamese currency with dot thousand separators', () {
    expect(formatVnd(0), '0 ₫');
    expect(formatVnd(30000), '30.000 ₫');
    expect(formatVnd(120000), '120.000 ₫');
    expect(formatVnd(150000), '150.000 ₫');
    expect(formatVnd(330000), '330.000 ₫');
    expect(formatVnd(-30000), '-30.000 ₫');
  });
}
