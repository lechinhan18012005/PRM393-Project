import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/services/distance_trend_tracker.dart';

void main() {
  test('detects mechanic approaching after filtered GPS samples', () {
    final tracker = DistanceTrendTracker();
    for (final distance in [500.0, 485.0, 460.0, 440.0, 420.0]) {
      tracker.addSample(distance);
    }
    expect(tracker.trend, DistanceTrend.approaching);
  });

  test('detects mechanic moving away', () {
    final tracker = DistanceTrendTracker();
    for (final distance in [300.0, 315.0, 335.0, 350.0, 370.0]) {
      tracker.addSample(distance);
    }
    expect(tracker.trend, DistanceTrend.movingAway);
  });

  test('ignores small GPS noise and invalid samples', () {
    final tracker = DistanceTrendTracker();
    tracker.addSample(200);
    tracker.addSample(260, valid: false);
    tracker.addSample(205);
    tracker.addSample(198);
    expect(tracker.trend, DistanceTrend.stable);
  });
}
