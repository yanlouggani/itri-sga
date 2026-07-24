import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/colors.dart';
import '../../../../core/theme/text_styles.dart';

class StudentQRPage extends ConsumerWidget {
  const StudentQRPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.construction_rounded, size: 64,
                color: AppColors.textSecondary.withAlpha(100)),
            const SizedBox(height: 20),
            Text('Fonctionnalité suspendue',
                style: AppTextStyles.headingSmall.copyWith(
                    color: AppColors.textPrimary)),
            const SizedBox(height: 8),
            Text(
              'Le QR code n\'est plus disponible pour le moment. Veuillez utiliser le marquage manuel par le professeur.',
              textAlign: TextAlign.center,
              style: AppTextStyles.bodyMedium.copyWith(
                  color: AppColors.textSecondary)),
            const SizedBox(height: 32),
            ElevatedButton.icon(
              onPressed: () => context.go('/student/dashboard'),
              icon: const Icon(Icons.arrow_back_rounded),
              label: const Text('Retour au tableau de bord'),
            ),
          ],
        ),
      ),
    );
  }
}
