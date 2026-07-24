import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/colors.dart';
import '../../../../core/theme/text_styles.dart';
import '../../providers/active_session_provider.dart';

class LiveCounterBar extends ConsumerWidget {
  final String sessionId;

  const LiveCounterBar({super.key, required this.sessionId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final counts = ref.watch(sessionCountsProvider(sessionId));
    final total = counts.total;

    if (total == 0) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Theme.of(context).colorScheme.outlineVariant.withAlpha(50),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Progress bar
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: SizedBox(
              height: 8,
              child: Row(
                children: [
                  _ProgressSegment(
                    fraction: counts.present / total,
                    color: AppColors.statusPresent,
                  ),
                  _ProgressSegment(
                    fraction: counts.late / total,
                    color: AppColors.statusLate,
                  ),
                  _ProgressSegment(
                    fraction: counts.absent / total,
                    color: AppColors.statusAbsent,
                  ),
                  _ProgressSegment(
                    fraction: counts.unmarked / total,
                    color: AppColors.textSecondary.withAlpha(50),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 10),

          // Counters
          Row(
            children: [
              _CounterItem(
                icon: Icons.check_circle_rounded,
                color: AppColors.statusPresent,
                count: counts.present,
                label: 'Présents',
              ),
              const SizedBox(width: 16),
              _CounterItem(
                icon: Icons.access_time_rounded,
                color: AppColors.statusLate,
                count: counts.late,
                label: 'Retards',
              ),
              const SizedBox(width: 16),
              _CounterItem(
                icon: Icons.cancel_rounded,
                color: AppColors.statusAbsent,
                count: counts.absent,
                label: 'Absents',
              ),
              const Spacer(),
              _CounterItem(
                icon: Icons.hourglass_empty_rounded,
                color: AppColors.textSecondary,
                count: counts.unmarked,
                label: 'Restants',
              ),
            ],
          ),
          if (counts.waiting > 0) ...[
            const SizedBox(height: 6),
            Row(
              children: [
                Icon(Icons.hourglass_top_rounded,
                    size: 14, color: AppColors.warning),
                const SizedBox(width: 4),
                Text(
                  '${counts.waiting} en attente de confirmation',
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.warning,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _ProgressSegment extends StatelessWidget {
  final double fraction;
  final Color color;

  const _ProgressSegment({required this.fraction, required this.color});

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      duration: const Duration(milliseconds: 700),
      curve: Curves.easeOutCubic,
      tween: Tween<double>(begin: 0.0, end: fraction),
      builder: (context, animatedFraction, child) {
        if (animatedFraction <= 0.001) return const SizedBox.shrink();
        return Flexible(
          flex: (animatedFraction * 1000).round().clamp(1, 1000),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            color: color,
          ),
        );
      },
    );
  }
}

class _CounterItem extends StatelessWidget {
  final IconData icon;
  final Color color;
  final int count;
  final String label;

  const _CounterItem({
    required this.icon,
    required this.color,
    required this.count,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: color),
        const SizedBox(width: 4),
        TweenAnimationBuilder<double>(
          duration: const Duration(milliseconds: 600),
          curve: Curves.easeOutCubic,
          tween: Tween<double>(begin: 0.0, end: count.toDouble()),
          builder: (context, value, child) {
            return Text(
              '${value.round()}',
              style: AppTextStyles.labelLarge.copyWith(
                fontWeight: FontWeight.w700,
              ),
            );
          },
        ),
        const SizedBox(width: 3),
        Text(
          label,
          style: AppTextStyles.caption,
        ),
      ],
    );
  }
}
