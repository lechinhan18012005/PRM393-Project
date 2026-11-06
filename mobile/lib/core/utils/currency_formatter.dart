import 'package:flutter/services.dart';

String formatVnd(num? amount, {String fallback = '0 ₫'}) {
  if (amount == null) return fallback;
  final rounded = amount.round();
  final negative = rounded < 0;
  final digits = rounded.abs().toString();
  final grouped = digits.replaceAllMapped(
    RegExp(r'\B(?=(\d{3})+(?!\d))'),
    (_) => '.',
  );
  return '${negative ? '-' : ''}$grouped ₫';
}

String formatVndInput(num amount) => formatVnd(amount).replaceAll(' ₫', '');

double parseVnd(String value) =>
    double.tryParse(value.replaceAll(RegExp(r'[^0-9-]'), '')) ?? 0;

class VietnameseCurrencyInputFormatter extends TextInputFormatter {
  const VietnameseCurrencyInputFormatter();

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final digits = newValue.text.replaceAll(RegExp(r'\D'), '');
    if (digits.isEmpty) return const TextEditingValue(text: '');

    final normalized = digits.replaceFirst(RegExp(r'^0+(?=\d)'), '');
    final formatted = normalized.replaceAllMapped(
      RegExp(r'\B(?=(\d{3})+(?!\d))'),
      (_) => '.',
    );
    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }
}
