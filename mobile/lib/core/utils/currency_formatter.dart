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
