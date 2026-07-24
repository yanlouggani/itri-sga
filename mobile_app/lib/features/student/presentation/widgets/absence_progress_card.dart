import 'package:flutter/material.dart';
import '../../../../core/theme/colors.dart';
import '../../../../core/theme/text_styles.dart';
import '../../data/models/student_dashboard_data.dart';

class AbsenceProgressCard extends StatelessWidget {
  final AbsenceSummary summary;
  const AbsenceProgressCard({super.key, required this.summary});

  @override
  Widget build(BuildContext context) {
    final level = summary.utilizationRatio;
    final color = level >= 0.75
        ? AppColors.danger
        : (level >= 0.50 ? AppColors.warning : AppColors.success);

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(summary.moduleName,
                      style: AppTextStyles.bodyMedium.copyWith(
                          fontWeight: FontWeight.w600),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: color.withAlpha(20),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    '${summary.absences}/${summary.maxAllowed}',
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: color,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),

            // Progress bar
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: SizedBox(
                height: 8,
                child: Stack(
                  children: [
                    Container(color: AppColors.secondary),
                    FractionallySizedBox(
                      widthFactor: summary.utilizationRatio.clamp(0.0, 1.0),
                      child: Container(color: color),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 8),

            // Status message
            Row(
              children: [
                Icon(
                  summary.isCritical
                      ? Icons.dangerous_rounded
                      : (summary.isWarning
                          ? Icons.warning_amber_rounded
                          : Icons.check_circle_rounded),
                  size: 14,
                  color: color,
                ),
                const SizedBox(width: 6),
                Text(
                  _message,
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 11,
                    color: color,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String get _message {
    if (summary.isCritical) {
      return 'Seuil critique dépassé ! Contactez l\'administration.';
    } else if (summary.isWarning) {
      return 'Attention : ${summary.remaining.toInt()} absence${summary.remaining > 1 ? 's' : ''} restante${summary.remaining > 1 ? 's' : ''} avant le seuil.';
    } else {
      return '${summary.remaining.toInt()} absence${summary.remaining > 1 ? 's' : ''} restante${summary.remaining > 1 ? 's' : ''} sur ${summary.maxAllowed} autorisées.';
    }
  }
}
