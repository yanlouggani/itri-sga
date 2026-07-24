import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/colors.dart';
import '../../../../core/theme/text_styles.dart';

/// Student Scan Mode — professor uses camera to scan student QR codes.
/// Placeholder for the camera-based scanning UI.
/// Full implementation requires the `mobile_scanner` package.
class StudentScanPanel extends ConsumerWidget {
  final String sessionId;

  const StudentScanPanel({super.key, required this.sessionId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.success.withAlpha(10),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.success.withAlpha(30)),
          ),
          child: Row(
            children: [
              Icon(Icons.qr_code_scanner_rounded,
                  color: AppColors.success, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Scannez le QR code sur la carte étudiante pour marquer la présence.',
                  style: AppTextStyles.bodySmall.copyWith(
                    color: AppColors.success,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),

        // Camera viewfinder placeholder
        Center(
          child: Container(
            width: 300,
            height: 300,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: AppColors.primary.withAlpha(60),
                width: 2,
              ),
              color: AppColors.backgroundDark,
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.qr_code_scanner_rounded,
                  size: 80,
                  color: Colors.white.withAlpha(120),
                ),
                const SizedBox(height: 16),
                Text(
                  'Caméra prête',
                  style: TextStyle(
                    fontFamily: 'Inter',
                    color: Colors.white.withAlpha(180),
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Scannez un QR étudiant',
                  style: TextStyle(
                    fontFamily: 'Inter',
                    color: Colors.white.withAlpha(100),
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 24),

        // Recent scans
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.secondary.withAlpha(50),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              Icon(Icons.info_outline_rounded,
                  size: 16, color: AppColors.textSecondary),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Les étudiants scannés seront automatiquement marqués présents.',
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
