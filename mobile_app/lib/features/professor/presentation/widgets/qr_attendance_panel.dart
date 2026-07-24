import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../../../core/theme/colors.dart';
import '../../../../core/theme/text_styles.dart';
import '../../providers/active_session_provider.dart';
import 'waiting_room_panel.dart';

/// QR Session Mode — professor projects QR, students self-scan.
/// Shows the current rotating QR token and the waiting room.
class QRAttendancePanel extends ConsumerWidget {
  final String sessionId;

  const QRAttendancePanel({super.key, required this.sessionId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final qrToken = ref.watch(sessionQrTokenProvider(sessionId));
    final session = ref.watch(sessionDataProvider(sessionId));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Instructions card
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.accent.withAlpha(10),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.accent.withAlpha(30)),
          ),
          child: Row(
            children: [
              Icon(Icons.info_outline_rounded,
                  color: AppColors.accent, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Projetez le QR code au tableau. Les étudiants scannent avec leur téléphone pour se présenter.',
                  style: AppTextStyles.bodySmall.copyWith(
                    color: AppColors.accent,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // QR Code display area
        if (qrToken != null) ...[
          Center(
            child: Container(
              width: 260,
              height: 260,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: AppColors.borderLight,
                  width: 2,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withAlpha(15),
                    blurRadius: 20,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Vector QR code with pulse scale transition on rotation
                  AnimatedSwitcher(
                    duration: const Duration(milliseconds: 350),
                    transitionBuilder: (child, animation) {
                      return ScaleTransition(
                        scale: animation,
                        child: FadeTransition(opacity: animation, child: child),
                      );
                    },
                    child: Container(
                      key: ValueKey(qrToken.qrToken),
                      width: 180,
                      height: 180,
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: AppColors.borderLight.withAlpha(80),
                        ),
                      ),
                      child: QrImageView(
                        data: 'SGAU:${qrToken.sessionId}:${qrToken.qrToken}:${qrToken.receivedAt.millisecondsSinceEpoch}',
                        version: QrVersions.auto,
                        size: 164,
                        gapless: false,
                        eyeStyle: const QrEyeStyle(
                          eyeShape: QrEyeShape.square,
                          color: AppColors.primary,
                        ),
                        dataModuleStyle: const QrDataModuleStyle(
                          dataModuleShape: QrDataModuleShape.square,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Token validity indicator
                  _TokenTimer(expiresAt: qrToken.expiresAt),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Center(
            child: Text(
              'Le QR code change toutes les 8 secondes',
              style: AppTextStyles.caption.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
          ),
        ] else ...[
          Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 48),
              child: Column(
                children: [
                  Icon(
                    Icons.qr_code_rounded,
                    size: 64,
                    color: AppColors.textSecondary.withAlpha(80),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Le QR code sera généré automatiquement',
                    style: AppTextStyles.bodyMedium.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'au démarrage de la séance',
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],

        const SizedBox(height: 24),

        // Waiting room
        WaitingRoomPanel(sessionId: sessionId),

        // Session info
        if (session != null) ...[
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.secondary.withAlpha(50),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                Icon(Icons.people_rounded,
                    size: 16, color: AppColors.textSecondary),
                const SizedBox(width: 8),
                Text(
                  '${session.totalStudents} étudiants dans le groupe ${session.groupName}',
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _TokenTimer extends StatelessWidget {
  final DateTime expiresAt;

  const _TokenTimer({required this.expiresAt});

  @override
  Widget build(BuildContext context) {
    final difference = expiresAt.difference(DateTime.now());
    // Safe duration check
    final duration = difference.isNegative ? Duration.zero : difference;

    return TweenAnimationBuilder<double>(
      key: ValueKey(expiresAt), // Recreate tween animation when target time resets!
      tween: Tween(begin: 1.0, end: 0.0),
      duration: duration,
      builder: (context, value, child) {
        final color = value > 0.35
            ? AppColors.sessionActive
            : (value > 0.15
                ? AppColors.warning
                : AppColors.danger);
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(
                value: value,
                strokeWidth: 2.5,
                backgroundColor: color.withAlpha(30),
                valueColor: AlwaysStoppedAnimation<Color>(color),
              ),
            ),
            const SizedBox(width: 8),
            Text(
              '${(value * 8).ceil()}s',
              style: TextStyle(
                fontFamily: 'Inter',
                fontSize: 13,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ],
        );
      },
    );
  }
}
