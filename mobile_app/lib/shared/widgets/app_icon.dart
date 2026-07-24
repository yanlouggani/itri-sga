import 'package:flutter/material.dart';

/// Consistent icon wrapper for the app.
class AppIcon extends StatelessWidget {
  final IconData icon;
  final double size;
  final Color? color;
  final double? padding;

  const AppIcon({
    super.key,
    required this.icon,
    this.size = 24,
    this.color,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveColor = color ?? Theme.of(context).colorScheme.onSurface;

    if (padding != null) {
      return Padding(
        padding: EdgeInsets.all(padding!),
        child: Icon(icon, size: size, color: effectiveColor),
      );
    }

    return Icon(icon, size: size, color: effectiveColor);
  }
}

/// Status badge dot (green/red/orange/grey).
class StatusDot extends StatelessWidget {
  final Color color;
  final double size;

  const StatusDot({
    super.key,
    required this.color,
    this.size = 8,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: color.withAlpha(80),
            blurRadius: 4,
            spreadRadius: 1,
          ),
        ],
      ),
    );
  }
}
