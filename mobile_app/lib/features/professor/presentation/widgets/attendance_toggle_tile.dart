import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/colors.dart';
import '../../../../core/theme/text_styles.dart';
import '../../data/models/attendance_record.dart';
import '../../providers/active_session_provider.dart';

class AttendanceToggleTile extends ConsumerWidget {
  final String sessionId;
  final AttendanceRecord student;
  final bool isPending;

  const AttendanceToggleTile({
    super.key,
    required this.sessionId,
    required this.student,
    this.isPending = false,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isLate = student.status == AttendanceStatus.late;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      margin: const EdgeInsets.only(bottom: 4),
      decoration: BoxDecoration(
        color: _backgroundColor(context),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: _borderColor(context),
          width: isPending ? 1.5 : 1,
        ),
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(10),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          child: Row(
            children: [
              // Student avatar
              CircleAvatar(
                radius: 18,
                backgroundColor: _statusColor.withAlpha(25),
                child: Text(
                  student.studentName.isNotEmpty
                      ? student.studentName.split(' ').map((s) => s.isNotEmpty ? s[0] : '').take(2).join().toUpperCase()
                      : '?',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: _statusColor,
                  ),
                ),
              ),
              const SizedBox(width: 12),

              // Student info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      student.studentName,
                      style: AppTextStyles.bodyMedium.copyWith(
                        fontWeight: FontWeight.w500,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      student.studentIdentifier,
                      style: AppTextStyles.caption,
                    ),
                  ],
                ),
              ),

              if (isPending)
                const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              else
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _StatusChip(
                      icon: Icons.check_circle_rounded,
                      color: AppColors.statusPresent,
                      label: 'P',
                      isSelected: student.status == AttendanceStatus.present,
                      onTap: () => _mark(ref, AttendanceStatus.present),
                    ),
                    const SizedBox(width: 6),
                    _StatusChip(
                      icon: Icons.access_time_rounded,
                      color: AppColors.statusLate,
                      label: 'R',
                      isSelected: isLate,
                      onTap: () => _markLate(ref),
                    ),
                    const SizedBox(width: 6),
                    _StatusChip(
                      icon: Icons.cancel_rounded,
                      color: AppColors.statusAbsent,
                      label: 'A',
                      isSelected: student.status == AttendanceStatus.absent,
                      onTap: () => _mark(ref, AttendanceStatus.absent),
                    ),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }

  void _mark(WidgetRef ref, AttendanceStatus status) {
    ref.read(activeSessionProvider(sessionId).notifier).markAttendance(
          studentId: student.studentId,
          status: status,
        );
  }

  void _markLate(WidgetRef ref) {
    if (student.status == AttendanceStatus.late) {
      _mark(ref, AttendanceStatus.unmarked);
    } else {
      _mark(ref, AttendanceStatus.late);
    }
  }

  Color get _statusColor {
    switch (student.status) {
      case AttendanceStatus.present:
        return AppColors.statusPresent;
      case AttendanceStatus.absent:
        return AppColors.statusAbsent;
      case AttendanceStatus.late:
        return AppColors.statusLate;
      default:
        return AppColors.textSecondary;
    }
  }

  Color _backgroundColor(BuildContext context) {
    if (student.status == AttendanceStatus.unmarked) {
      return Colors.transparent;
    }
    return _statusColor.withAlpha(10);
  }

  Color _borderColor(BuildContext context) {
    if (student.status == AttendanceStatus.unmarked) {
      return Theme.of(context).colorScheme.outlineVariant.withAlpha(40);
    }
    return _statusColor.withAlpha(50);
  }
}

class _StatusChip extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _StatusChip({
    required this.icon,
    required this.color,
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          color: isSelected ? color : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected ? color : color.withAlpha(80),
            width: isSelected ? 0 : 1.5,
          ),
        ),
        child: isSelected
            ? Icon(Icons.check_rounded, size: 18, color: Colors.white)
            : Center(
                child: Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: color,
                  ),
                ),
              ),
      ),
    );
  }
}
