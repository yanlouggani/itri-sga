import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/colors.dart';
import '../../../../core/theme/text_styles.dart';
import '../../../features/professor/data/models/timetable_item.dart';
import '../../providers/timetable_state_provider.dart';
import 'timetable_session_card.dart';

class TimetableDayView extends ConsumerWidget {
  final List<TimetableItem> allItems;
  final void Function(TimetableItem item)? onItemTap;

  const TimetableDayView({
    super.key,
    required this.allItems,
    this.onItemTap,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selectedDay = ref.watch(selectedDayProvider);

    final dayItems = allItems.where((item) =>
      item.sessionDate.year == selectedDay.year &&
      item.sessionDate.month == selectedDay.month &&
      item.sessionDate.day == selectedDay.day,
    ).toList()
      ..sort((a, b) => a.startTime.compareTo(b.startTime));

    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 300),
        switchInCurve: Curves.easeInOut,
        switchOutCurve: Curves.easeInOut,
        transitionBuilder: (child, animation) {
          return FadeTransition(
            opacity: animation,
            child: child,
          );
        },
        child: dayItems.isEmpty
            ? _EmptyDay(key: ValueKey('empty_${selectedDay.millisecondsSinceEpoch}'))
            : _SessionList(
                key: ValueKey('items_${selectedDay.millisecondsSinceEpoch}'),
                items: dayItems,
                onItemTap: onItemTap,
              ),
      ),
    );
  }
}

class _SessionList extends StatelessWidget {
  final List<TimetableItem> items;
  final void Function(TimetableItem item)? onItemTap;

  const _SessionList({
    super.key,
    required this.items,
    this.onItemTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: items.length,
      itemBuilder: (context, index) {
        return TimetableSessionCard(
          item: items[index],
          onTap: onItemTap != null ? () => onItemTap!(items[index]) : null,
        );
      },
    );
  }
}

class _EmptyDay extends StatelessWidget {
  const _EmptyDay({super.key});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 32),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: AppColors.textSecondary.withAlpha(15),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Icon(
                  Icons.event_busy_rounded,
                  size: 36,
                  color: AppColors.textSecondary.withAlpha(100),
                ),
              ),
              const SizedBox(height: 20),
              Text(
                "Aucune séance prévue pour cette journée",
                style: AppTextStyles.bodyMedium.copyWith(
                  color: AppColors.textSecondary,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
