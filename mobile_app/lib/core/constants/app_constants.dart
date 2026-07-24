class AppConstants {
  AppConstants._();

  static const String appName = 'ITRI Academy';
  static const String appVersion = '1.0.0';

  static const Duration tokenRefreshThreshold = Duration(hours: 1);
  static const Duration qrCodeRotationInterval = Duration(seconds: 8);
  static const Duration socketReconnectDelay = Duration(seconds: 3);

  static const int defaultPageSize = 20;
  static const int maxFileSizeBytes = 5 * 1024 * 1024; // 5 MB

  static const double sidebarWidth = 260.0;
  static const double sidebarCollapsedWidth = 72.0;
  static const double maxContentWidth = 1200.0;
}
