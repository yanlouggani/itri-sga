import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/router/app_router.dart';
import 'shared/providers/theme_provider.dart';

class SGAUApp extends ConsumerWidget {
  const SGAUApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    debugPrint('[Startup] SGAUApp build — building MaterialApp.router');
    final router = ref.watch(routerProvider);
    final themeData = ref.watch(themeDataProvider);

    return MaterialApp.router(
      title: 'ITRI Academy',
      debugShowCheckedModeBanner: false,
      theme: themeData,
      routerConfig: router,
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('fr', ''),
        Locale('en', ''),
      ],
    );
  }
}
