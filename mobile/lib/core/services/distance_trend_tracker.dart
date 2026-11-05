enum DistanceTrend { unknown, approaching, movingAway, stable }

class DistanceTrendTracker {
  DistanceTrendTracker({this.thresholdMeters = 15, this.maxSamples = 5});

  final double thresholdMeters;
  final int maxSamples;
  final List<double> _samples = <double>[];

  DistanceTrend get trend {
    if (_samples.length < 3) return DistanceTrend.unknown;

    final firstCount = _samples.length ~/ 2;
    final recentCount = _samples.length ~/ 2;
    final firstAverage = _average(_samples.take(firstCount));
    final recentAverage = _average(
      _samples.skip(_samples.length - recentCount),
    );
    final decreaseMeters = firstAverage - recentAverage;

    if (decreaseMeters >= thresholdMeters) return DistanceTrend.approaching;
    if (decreaseMeters <= -thresholdMeters) return DistanceTrend.movingAway;
    return DistanceTrend.stable;
  }

  void addSample(double? distanceMeters, {bool valid = true}) {
    if (!valid || distanceMeters == null || !distanceMeters.isFinite) return;
    _samples.add(distanceMeters);
    if (_samples.length > maxSamples) _samples.removeAt(0);
  }

  void reset() => _samples.clear();

  double _average(Iterable<double> values) {
    var total = 0.0;
    var count = 0;
    for (final value in values) {
      total += value;
      count++;
    }
    return count == 0 ? 0 : total / count;
  }
}
