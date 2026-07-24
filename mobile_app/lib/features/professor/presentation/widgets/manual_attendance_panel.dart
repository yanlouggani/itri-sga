import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/colors.dart';
import '../../../../core/theme/text_styles.dart';
import '../../data/models/attendance_record.dart';
import '../../providers/active_session_provider.dart';
import 'attendance_toggle_tile.dart';

class ManualAttendancePanel extends ConsumerWidget {
  final String sessionId;

  const ManualAttendancePanel({super.key, required this.sessionId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(activeSessionProvider(sessionId));
    final unmarked = state.unmarkedStudents;
    final marked = state.students
        .where((s) => s.status != AttendanceStatus.unmarked)
        .toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Bulk actions
        Row(
          children: [
            _BulkButton(
              icon: Icons.check_circle_rounded,
              label: 'Tout présent',
              color: AppColors.statusPresent,
              onTap: () {
                ref
                    .read(activeSessionProvider(sessionId).notifier)
                    .bulkMarkAll(AttendanceStatus.present);
              },
            ),
            const SizedBox(width: 8),
            _BulkButton(
              icon: Icons.cancel_rounded,
              label: 'Tout absent',
              color: AppColors.statusAbsent,
              onTap: () {
                ref
                    .read(activeSessionProvider(sessionId).notifier)
                    .bulkMarkAll(AttendanceStatus.absent);
              },
            ),
          ],
        ),
        const SizedBox(height: 16),

        // Unmarked students section
        if (unmarked.isNotEmpty) ...[
          Text(
            'À marquer (${unmarked.length})',
            style: AppTextStyles.labelLarge.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 8),
          ...unmarked.map(
            (s) => AttendanceToggleTile(
              sessionId: sessionId,
              student: s,
              isPending: state.pendingUpdates.contains(s.studentId),
            ),
          ),
          const SizedBox(height: 16),
        ],

        // Already marked students section
        if (marked.isNotEmpty) ...[
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Marqués (${marked.length})',
                style: AppTextStyles.labelLarge.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
              TextButton(
                onPressed: () {
                  // Collapse/expand logic can be added here
                },
                child: const Text('Afficher tout'),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ...marked.map(
            (s) => AttendanceToggleTile(
              sessionId: sessionId,
              student: s,
              isPending: state.pendingUpdates.contains(s.studentId),
            ),
          ),
        ],

        if (state.students.isEmpty && !state.isLoading)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 32),
            child: Center(
              child: Text(
                'Aucun étudiant dans ce groupe',
                style: AppTextStyles.bodyMedium.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _BulkButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _BulkButton({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: SizedBox(
        height: 44,
        child: OutlinedButton.icon(
          onPressed: onTap,
          icon: Icon(icon, size: 18, color: color),
          label: Text(
            label,
            style: TextStyle(
              fontFamily: 'Inter',
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
          style: OutlinedButton.styleFrom(
            side: BorderSide(color: color.withAlpha(80)),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
          ),
        ),
      ),
    );
  }
}
