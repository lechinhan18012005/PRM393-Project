import 'package:flutter/material.dart';

class RescueMapPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final road = Paint()
      ..color = Colors.white
      ..strokeWidth = 9;
    for (var i = 1; i < 5; i++) {
      canvas.drawLine(
        Offset(size.width * i / 5 - 30, 0),
        Offset(size.width * i / 5 + 35, size.height),
        road,
      );
    }
    for (var i = 1; i < 4; i++) {
      canvas.drawLine(
        Offset(0, size.height * i / 4 + 15),
        Offset(size.width, size.height * i / 4 - 10),
        road,
      );
    }
    final river = Path()
      ..moveTo(size.width * .65, -20)
      ..cubicTo(
        size.width * .15,
        size.height * .4,
        size.width,
        size.height * .5,
        size.width * .7,
        size.height + 20,
      );
    canvas.drawPath(
      river,
      Paint()
        ..color = const Color(0xFFB8D9E3)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 26,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
