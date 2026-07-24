import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/timetable_state_provider.dart';

class TimetableSwipeWrapper extends ConsumerWidget {
  final Widget child;

  const TimetableSwipeWrapper({super.key, required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return GestureDetector(
      onHorizontalDragEnd: (details) {
        if (details.primaryVelocity == null) return;
        final indexProvider = ref.read(selectedDayIndexProvider.notifier);
        final current = ref.read(selectedDayIndexProvider);
        if (details.primaryVelocity! < -50 && current < 6) {
          indexProvider.state = current + 1;
        } else if (details.primaryVelocity! > 50 && current > 0) {
          indexProvider.state = current - 1;
        }
      },
      behavior: HitTestBehavior.translucent,
      child: child,
    );
  }
}
