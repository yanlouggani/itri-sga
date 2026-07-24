import 'package:flutter_riverpod/flutter_riverpod.dart';

final selectedDayIndexProvider = StateProvider<int>((ref) {
  final now = DateTime.now();
  return now.weekday - 1;
});

final weekOffsetProvider = StateProvider<int>((ref) => 0);

final weekStartProvider = Provider<DateTime>((ref) {
  final offset = ref.watch(weekOffsetProvider);
  final now = DateTime.now();
  final weekStart = now.subtract(Duration(days: now.weekday - 1));
  return weekStart.add(Duration(days: offset * 7));
});

final weekEndProvider = Provider<DateTime>((ref) {
  final start = ref.watch(weekStartProvider);
  return start.add(const Duration(days: 6));
});

final selectedDayProvider = Provider<DateTime>((ref) {
  final start = ref.watch(weekStartProvider);
  final dayIndex = ref.watch(selectedDayIndexProvider);
  return start.add(Duration(days: dayIndex));
});
