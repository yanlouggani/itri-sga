import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/storage/preferences_service.dart';
import '../../core/theme/app_theme.dart';

final preferencesServiceProvider = Provider<PreferencesService>((ref) {
  return PreferencesService();
});

final themeModeProvider = StateNotifierProvider<ThemeModeNotifier, ThemeMode>(
  (ref) {
    final prefs = ref.watch(preferencesServiceProvider);
    return ThemeModeNotifier(prefs);
  },
);

class ThemeModeNotifier extends StateNotifier<ThemeMode> {
  final PreferencesService _prefs;

  ThemeModeNotifier(this._prefs)
      : super(_prefs.isDarkMode ? ThemeMode.dark : ThemeMode.light);

  void toggleTheme() {
    state = state == ThemeMode.light ? ThemeMode.dark : ThemeMode.light;
    _prefs.isDarkMode = state == ThemeMode.dark;
  }

  void setThemeMode(ThemeMode mode) {
    state = mode;
    _prefs.isDarkMode = mode == ThemeMode.dark;
  }
}

final themeDataProvider = Provider<ThemeData>((ref) {
  final themeMode = ref.watch(themeModeProvider);
  switch (themeMode) {
    case ThemeMode.dark:
      return AppTheme.dark();
    case ThemeMode.light:
      return AppTheme.light();
    case ThemeMode.system:
      return AppTheme.light();
  }
});
