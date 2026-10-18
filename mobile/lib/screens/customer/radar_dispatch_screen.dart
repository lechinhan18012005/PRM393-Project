import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import 'live_tracking_screen.dart';

class RadarDispatchScreen extends StatefulWidget {
  const RadarDispatchScreen({super.key});

  @override
  State<RadarDispatchScreen> createState() => _RadarDispatchScreenState();
}

class _RadarDispatchScreenState extends State<RadarDispatchScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF111C2D), // Dark radar theme
      appBar: AppBar(
        title: const Text(
          'Tìm cứu hộ',
          style: TextStyle(color: Colors.white, fontSize: 16),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          const SizedBox(height: 10),
          const Text(
            'HỆ THỐNG ĐANG QUÉT TRONG BÁN KÍNH 3KM',
            style: TextStyle(
              color: AppColors.primaryContainer,
              fontSize: 11,
              fontWeight: FontWeight.bold,
              letterSpacing: 1,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'Đã tìm thấy 3 thợ trực chiến đang sẵn sàng...',
            style: TextStyle(color: Colors.white70, fontSize: 13),
          ),
          const Spacer(),

          // Radar Graphic
          Center(
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Outer ring
                Container(
                  width: 240,
                  height: 240,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: AppColors.primaryOrange.withValues(alpha: 0.2),
                      width: 1.5,
                    ),
                  ),
                ),
                // Middle ring
                Container(
                  width: 170,
                  height: 170,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: AppColors.primaryOrange.withValues(alpha: 0.35),
                      width: 1.5,
                    ),
                  ),
                ),
                // Inner ring
                Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: AppColors.primaryOrange.withValues(alpha: 0.6),
                      width: 1.5,
                    ),
                  ),
                ),
                // Center pulse bike icon
                Container(
                  width: 56,
                  height: 56,
                  decoration: const BoxDecoration(
                    color: AppColors.primaryOrange,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(color: AppColors.primaryOrange, blurRadius: 16),
                    ],
                  ),
                  child: const Icon(
                    Icons.two_wheeler,
                    color: Colors.white,
                    size: 28,
                  ),
                ),
                // Floating nearby mechanics dots
                const Positioned(
                  top: 35,
                  right: 55,
                  child: CircleAvatar(
                    radius: 6,
                    backgroundColor: Colors.greenAccent,
                  ),
                ),
                const Positioned(
                  bottom: 45,
                  left: 45,
                  child: CircleAvatar(
                    radius: 6,
                    backgroundColor: Colors.greenAccent,
                  ),
                ),
              ],
            ),
          ),
          const Spacer(),

          // Matched Mechanic Card
          Container(
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: const [
                BoxShadow(
                  color: Colors.black26,
                  blurRadius: 10,
                  offset: Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    const CircleAvatar(
                      radius: 26,
                      backgroundColor: AppColors.surfaceContainerHigh,
                      child: Icon(
                        Icons.engineering,
                        color: AppColors.primaryOrange,
                        size: 30,
                      ),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              Text(
                                'Phạm Tuấn Anh',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                ),
                              ),
                              SizedBox(width: 6),
                              Icon(
                                Icons.verified,
                                color: Colors.blue,
                                size: 16,
                              ),
                            ],
                          ),
                          SizedBox(height: 2),
                          Text(
                            'Gara Toàn Thắng (Chi nhánh Q.7) • ⭐ 4.9',
                            style: TextStyle(
                              fontSize: 12,
                              color: AppColors.secondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.green.shade50,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        'Cách 1.2km\n~ 8 phút',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Colors.green.shade800,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => const LiveTrackingScreen(),
                      ),
                    );
                  },
                  icon: const Icon(Icons.navigation, size: 18),
                  label: const Text(
                    'Xem Lộ Trình Thợ Di Chuyển',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primaryOrange,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
