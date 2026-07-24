import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/theme/colors.dart';
import '../../core/theme/text_styles.dart';

/// A full-page error display with custom illustration, auto-countdown retry,
/// and manual override to guarantee resilient offline handling in SGAU.
class AppErrorWidget extends StatefulWidget {
  final String? title;
  final String message;
  final IconData icon;
  final VoidCallback? onRetry;
  final String? retryLabel;
  final bool autoRetry;

  const AppErrorWidget({
    super.key,
    this.title,
    required this.message,
    this.icon = Icons.wifi_off_rounded,
    this.onRetry,
    this.retryLabel,
    this.autoRetry = true,
  });

  @override
  State<AppErrorWidget> createState() => _AppErrorWidgetState();
}

class _AppErrorWidgetState extends State<AppErrorWidget> {
  int _secondsLeft = 6;
  Timer? _countdownTimer;
  bool _isRetrying = false;
  int _retryAttempts = 0;

  @override
  void initState() {
    super.initState();
    if (widget.onRetry != null && widget.autoRetry) {
      _startCountdown();
    }
  }

  void _startCountdown() {
    _countdownTimer?.cancel();
    setState(() {
      _secondsLeft = 6;
      _isRetrying = false;
    });
    
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) return;
      if (_secondsLeft <= 1) {
        timer.cancel();
        _handleRetry();
      } else {
        setState(() {
          _secondsLeft--;
        });
      }
    });
  }

  void _handleRetry() async {
    if (widget.onRetry == null || _isRetrying) return;
    
    setState(() {
      _isRetrying = true;
      _retryAttempts++;
    });

    // Brief artificial delay for visual feedback
    await Future.delayed(const Duration(milliseconds: 800));
    
    if (mounted) {
      widget.onRetry!();
      
      // If still error page after retry, restart countdown (up to 5 attempts)
      if (mounted && _retryAttempts < 5) {
        _startCountdown();
      } else {
        setState(() {
          _isRetrying = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Center(
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Beautiful Custom offline illustration
              Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  color: AppColors.danger.withAlpha(isDark ? 15 : 10),
                  shape: BoxShape.circle,
                ),
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    Icon(
                      widget.icon,
                      size: 54,
                      color: AppColors.danger,
                    ),
                    Positioned(
                      right: 28,
                      bottom: 28,
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.surface,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: AppColors.danger.withAlpha(40),
                            width: 1.5,
                          ),
                        ),
                        child: Icon(
                          Icons.refresh_rounded,
                          size: 14,
                          color: AppColors.danger.withAlpha(200),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 28),

              // Title in clean French
              Text(
                widget.title ?? 'Connexion Interrompue',
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: theme.colorScheme.onSurface,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 10),

              // Description French text
              Text(
                widget.message.contains('Failed') || widget.message.isEmpty
                    ? 'Impossible de se connecter aux serveurs SGAU. Veuillez vérifier votre connexion réseau.'
                    : widget.message,
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 13,
                  color: theme.colorScheme.onSurface.withAlpha(160),
                  height: 1.4,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),

              // Auto countdown indicator or loader
              if (widget.onRetry != null) ...[
                if (_isRetrying) ...[
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.primary,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        'Reconnexion en cours...',
                        style: TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                ] else if (widget.autoRetry && _retryAttempts < 5) ...[
                  Text(
                    'Nouvelle tentative automatique dans $_secondsLeft secondes',
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 12,
                      color: theme.colorScheme.onSurface.withAlpha(120),
                    ),
                  ),
                ] else ...[
                  Text(
                    'Nombre maximal de tentatives atteint.',
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 12,
                      color: AppColors.danger.withAlpha(180),
                    ),
                  ),
                ],
                
                const SizedBox(height: 20),

                // Retry Button
                SizedBox(
                  width: 180,
                  height: 46,
                  child: ElevatedButton.icon(
                    onPressed: _isRetrying ? null : _handleRetry,
                    icon: const Icon(Icons.autorenew_rounded, size: 18),
                    label: Text(
                      widget.retryLabel ?? 'Réessayer',
                      style: const TextStyle(
                        fontFamily: 'Inter',
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: theme.colorScheme.primary,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// A compact inline error banner.
class ErrorBanner extends StatelessWidget {
  final String message;
  final VoidCallback? onDismiss;
  final VoidCallback? onRetry;

  const ErrorBanner({
    super.key,
    required this.message,
    this.onDismiss,
    this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.danger.withAlpha(20),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.danger.withAlpha(50)),
      ),
      child: Row(
        children: [
          Icon(Icons.error_outline, size: 20, color: AppColors.danger),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: AppTextStyles.bodySmall.copyWith(color: AppColors.danger),
            ),
          ),
          if (onRetry != null)
            TextButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh, size: 16),
              label: const Text('Réessayer'),
              style: TextButton.styleFrom(
                foregroundColor: AppColors.danger,
                padding: const EdgeInsets.symmetric(horizontal: 8),
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
            ),
          if (onDismiss != null)
            IconButton(
              onPressed: onDismiss,
              icon: Icon(Icons.close, size: 16, color: AppColors.danger),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
              style: IconButton.styleFrom(tapTargetSize: MaterialTapTargetSize.shrinkWrap),
            ),
        ],
      ),
    );
  }
}
