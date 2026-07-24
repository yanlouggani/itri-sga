import 'package:shared_preferences/shared_preferences.dart';

class PreferencesService {
  late final SharedPreferences _prefs;

  Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  // ── Theme ──
  bool get isDarkMode => _prefs.getBool('is_dark_mode') ?? false;
  set isDarkMode(bool value) => _prefs.setBool('is_dark_mode', value);

  // ── Locale ──
  String get locale => _prefs.getString('locale') ?? 'fr';
  set locale(String value) => _prefs.setString('locale', value);

  // ── Onboarding ──
  bool get isOnboardingComplete =>
      _prefs.getBool('onboarding_complete') ?? false;
  set isOnboardingComplete(bool value) =>
      _prefs.setBool('onboarding_complete', value);

  // ── Last Sync ──
  int get lastSyncTimestamp => _prefs.getInt('last_sync') ?? 0;
  set lastSyncTimestamp(int value) => _prefs.setInt('last_sync', value);

  // ── Generic ──
  String? getString(String key) => _prefs.getString(key);
  Future<bool> setString(String key, String value) =>
      _prefs.setString(key, value);

  int? getInt(String key) => _prefs.getInt(key);
  Future<bool> setInt(String key, int value) => _prefs.setInt(key, value);

  bool? getBool(String key) => _prefs.getBool(key);
  Future<bool> setBool(String key, bool value) => _prefs.setBool(key, value);

  Future<bool> remove(String key) => _prefs.remove(key);
  Future<bool> clear() => _prefs.clear();
}
