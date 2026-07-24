import 'package:flutter/material.dart';

class ResponsiveUtils {
  ResponsiveUtils._();

  // ── Breakpoints ──
  static const double mobileBreakpoint = 600;
  static const double tabletBreakpoint = 900;
  static const double desktopBreakpoint = 1200;

  // ── Device Type ──
  static bool isMobile(BuildContext context) =>
      MediaQuery.of(context).size.width < mobileBreakpoint;

  static bool isTablet(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    return width >= mobileBreakpoint && width < desktopBreakpoint;
  }

  static bool isDesktop(BuildContext context) =>
      MediaQuery.of(context).size.width >= desktopBreakpoint;

  static bool isLargeDesktop(BuildContext context) =>
      MediaQuery.of(context).size.width >= 1600;

  // ── Orientation ──
  static bool isPortrait(BuildContext context) =>
      MediaQuery.of(context).orientation == Orientation.portrait;

  static bool isLandscape(BuildContext context) =>
      MediaQuery.of(context).orientation == Orientation.landscape;

  // ── Adaptive Values ──
  static T value<T>({
    required BuildContext context,
    required T mobile,
    T? tablet,
    required T desktop,
  }) {
    if (isDesktop(context)) return desktop;
    if (isTablet(context)) return tablet ?? mobile;
    return mobile;
  }

  // ── Screen Dimensions ──
  static double screenWidth(BuildContext context) =>
      MediaQuery.of(context).size.width;

  static double screenHeight(BuildContext context) =>
      MediaQuery.of(context).size.height;

  static double statusBarHeight(BuildContext context) =>
      MediaQuery.of(context).padding.top;

  static double bottomBarHeight(BuildContext context) =>
      MediaQuery.of(context).padding.bottom;

  // ── Grid ──
  static int gridColumns(BuildContext context) {
    if (isLargeDesktop(context)) return 4;
    if (isDesktop(context)) return 3;
    if (isTablet(context)) return 2;
    return 1;
  }

  // ── Content Width ──
  static double contentMaxWidth(BuildContext context) {
    return isDesktop(context) ? 1200 : screenWidth(context);
  }

  // ── Font Scale ──
  static double fontScale(BuildContext context) {
    return MediaQuery.textScalerOf(context).textScaleFactor.clamp(0.8, 1.3);
  }

  // ── Padding ──
  static EdgeInsets screenPadding(BuildContext context) {
    if (isDesktop(context)) {
      return const EdgeInsets.symmetric(horizontal: 32, vertical: 24);
    }
    if (isTablet(context)) {
      return const EdgeInsets.symmetric(horizontal: 24, vertical: 16);
    }
    return const EdgeInsets.symmetric(horizontal: 16, vertical: 12);
  }

  static EdgeInsets cardPadding(BuildContext context) {
    if (isDesktop(context)) {
      return const EdgeInsets.all(24);
    }
    return const EdgeInsets.all(16);
  }
}
