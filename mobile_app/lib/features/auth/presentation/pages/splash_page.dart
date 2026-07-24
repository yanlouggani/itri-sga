import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/colors.dart';
import '../../../../core/theme/text_styles.dart';
import '../../providers/auth_provider.dart';

class SplashPage extends ConsumerStatefulWidget {
  const SplashPage({super.key});

  @override
  ConsumerState<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends ConsumerState<SplashPage> with TickerProviderStateMixin {
  late AnimationController _fadeController;
  late Animation<double> _fadeAnimation;
  late AnimationController _scaleController;
  late Animation<double> _scaleAnimation;
  bool _minDurationElapsed = false;

  @override
  void initState() {
    super.initState();
    
    // Smooth entrance fade animation
    _fadeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    );
    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _fadeController, curve: Curves.easeOut),
    );

    // Subtle scaling animation for the icon
    _scaleController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1600),
    );
    _scaleAnimation = Tween<double>(begin: 0.85, end: 1.0).animate(
      CurvedAnimation(parent: _scaleController, curve: Curves.elasticOut),
    );

    _fadeController.forward();
    _scaleController.forward();

    // Ensure the splash displays for a minimum of 2.2 seconds for branding premium experience
    Timer(const Duration(milliseconds: 2200), () {
      if (mounted) {
        setState(() {
          _minDurationElapsed = true;
        });
        _checkNavigation();
      }
    });
  }

  @override
  void dispose() {
    _fadeController.dispose();
    _scaleController.dispose();
    super.dispose();
  }

  void _checkNavigation() {
    if (!_minDurationElapsed) return;

    final authState = ref.read(authProvider);
    if (authState.isInitializing) {
      // If auth is still initializing, wait. When auth completes, AuthRedirect in the router will redirect automatically.
      debugPrint('[Splash] Auth is still initializing, waiting...');
      return;
    }

    final isLoggedIn = authState.isAuthenticated;
    if (isLoggedIn) {
      final role = authState.user?.role ?? '';
      debugPrint('[Splash] Navigating to dashboard for role: $role');
      if (role == 'admin') {
        context.go('/admin/dashboard');
      } else if (role == 'professor') {
        context.go('/professor/dashboard');
      } else if (role == 'student') {
        context.go('/student/dashboard');
      } else {
        context.go('/login');
      }
    } else {
      debugPrint('[Splash] Not logged in, navigating to login');
      context.go('/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    // Listen to changes in authState to trigger navigation once both the duration has elapsed and auth is ready
    ref.listen<AuthState>(authProvider, (previous, next) {
      if (!next.isInitializing && _minDurationElapsed) {
        _checkNavigation();
      }
    });

    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.surfaceDark : AppColors.backgroundLight,
      body: Stack(
        alignment: Alignment.center,
        children: [
          // Sleek Material 3 subtle background shapes
          Positioned(
            top: -100,
            right: -100,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: (isDark ? AppColors.primaryDark : AppColors.primaryLight).withAlpha(15),
              ),
            ),
          ),
          Positioned(
            bottom: -80,
            left: -80,
            child: Container(
              width: 250,
              height: 250,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.accent.withAlpha(isDark ? 10 : 20),
              ),
            ),
          ),
          
          // Main branding group
          FadeTransition(
            opacity: _fadeAnimation,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Premium Styled Logo Container
                ScaleTransition(
                  scale: _scaleAnimation,
                  child: Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.primaryDark : Colors.white,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primary.withAlpha(isDark ? 50 : 30),
                          blurRadius: 24,
                          offset: const Offset(0, 8),
                        ),
                      ],
                      border: Border.all(
                        color: isDark ? AppColors.borderDark : AppColors.borderLight,
                        width: 1.5,
                      ),
                    ),
                    child: Hero(
                      tag: 'app_logo',
                      child: Icon(
                        Icons.school_rounded,
                        size: 64,
                        color: isDark ? AppColors.accent : AppColors.primary,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 28),
                
                // School Logo Text
                Text(
                  'ITRI Academy',
                  style: AppTextStyles.displayMedium.copyWith(
                    fontWeight: FontWeight.w800,
                    letterSpacing: 2,
                    color: isDark ? Colors.white : AppColors.primary,
                  ),
                ),
                const SizedBox(height: 6),
                
                // Description subtext
                Text(
                  'École de Langues et de Formation',
                  style: AppTextStyles.bodyMedium.copyWith(
                    color: isDark ? const Color(0xFFA0A0B0) : AppColors.textSecondary,
                    fontWeight: FontWeight.w500,
                  ),
                  textAlign: TextAlign.center,
                ),
                
                const SizedBox(height: 60),
                
                // Elegant loading indicator
                SizedBox(
                  width: 160,
                  child: TweenAnimationBuilder<double>(
                    duration: const Duration(milliseconds: 2000),
                    tween: Tween<double>(begin: 0.0, end: 1.0),
                    builder: (context, value, child) {
                      return Column(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(4),
                            child: LinearProgressIndicator(
                              value: value,
                              minHeight: 4,
                              backgroundColor: (isDark ? AppColors.borderDark : AppColors.borderLight),
                              valueColor: AlwaysStoppedAnimation<Color>(
                                isDark ? AppColors.accent : AppColors.primary,
                              ),
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Chargement...',
                            style: AppTextStyles.bodySmall.copyWith(
                              color: isDark ? const Color(0xFF808095) : AppColors.textSecondary.withAlpha(180),
                              fontStyle: FontStyle.italic,
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
          
          // Footer
          Positioned(
            bottom: 32,
            child: FadeTransition(
              opacity: _fadeAnimation,
              child: Text(
                'ITRI Academy • 2026',
                style: AppTextStyles.bodySmall.copyWith(
                  color: isDark ? const Color(0xFF606075) : AppColors.textSecondary.withAlpha(150),
                  letterSpacing: 1.2,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
