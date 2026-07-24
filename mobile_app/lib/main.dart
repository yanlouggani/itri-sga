import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app.dart';
import 'core/storage/preferences_service.dart';
import 'core/supabase/supabase_client_provider.dart';
import 'shared/providers/theme_provider.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  debugPrint('[Startup] App main() execution started');

  // Preferences initialization
  final preferencesService = PreferencesService();
  try {
    debugPrint('[Startup] Initializing PreferencesService...');
    await preferencesService.init().timeout(
      const Duration(seconds: 4),
      onTimeout: () {
        debugPrint('[Startup] PreferencesService initialization TIMED OUT');
        throw TimeoutException('Preferences initialization timed out');
      },
    );
  } catch (e) {
    debugPrint('[Startup] PreferencesService init failed: $e');
  }

  // Supabase initialization
  try {
    debugPrint('[Startup] Initializing Supabase...');
    await Supabase.initialize(
      url: kSupabaseUrl,
      anonKey: kSupabaseAnonKey,
    );
    debugPrint('[Startup] Supabase initialized successfully');
  } catch (e) {
    debugPrint('[Startup] Supabase initialization failed: $e');
  }

  // Device orientations
  try {
    await SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);
  } catch (e) {
    debugPrint('[Startup] Failed to set orientations: $e');
  }

  // System UI overlay
  try {
    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.dark,
        systemNavigationBarColor: Colors.white,
        systemNavigationBarIconBrightness: Brightness.dark,
      ),
    );
  } catch (e) {
    debugPrint('[Startup] Failed to set UI overlay: $e');
  }

  // Error handlers
  FlutterError.onError = (FlutterErrorDetails details) {
    debugPrint('[Startup] Flutter error intercepted: ${details.exceptionAsString()}');
    FlutterError.presentError(details);
  };

  PlatformDispatcher.instance.onError = (Object error, StackTrace stack) {
    debugPrint('[Startup] Unhandled async error: $error');
    debugPrintStack(stackTrace: stack);
    return true;
  };

  runApp(
    ProviderScope(
      overrides: [
        preferencesServiceProvider.overrideWithValue(preferencesService),
      ],
      child: const SGAUApp(),
    ),
  );
}