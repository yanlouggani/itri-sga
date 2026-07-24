import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/colors.dart';
import '../../../../core/theme/text_styles.dart';
import '../../data/models/waiting_student.dart';
import '../../providers/active_session_provider.dart';

class WaitingRoomPanel extends ConsumerWidget {
  final String sessionId;

  const WaitingRoomPanel({super.key, required this.sessionId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final waitingStudents = ref.watch(sessionWaitingRoomProvider(sessionId));

    if (waitingStudents.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: AppColors.warning.withAlpha(20),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.hourglass_top_rounded,
                      size: 14, color: AppColors.warning),
                  const SizedBox(width: 4),
                  Text(
                    'Salle d\'attente',
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppColors.warning,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Text(
              '${waitingStudents.length} étudiant${waitingStudents.length > 1 ? 's' : ''}',
              style: AppTextStyles.bodySmall.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ...waitingStudents.map(
          (student) => _WaitingStudentTile(
            sessionId: sessionId,
            student: student,
          ),
        ),
      ],
    );
  }
}

class _WaitingStudentTile extends ConsumerWidget {
  final String sessionId;
  final WaitingStudent student;

  const _WaitingStudentTile({
    required this.sessionId,
    required this.student,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      margin: const EdgeInsets.only(bottom: 6),
      decoration: BoxDecoration(
        color: AppColors.warning.withAlpha(8),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: AppColors.warning.withAlpha(30),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        child: Row(
          children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: AppColors.warning.withAlpha(25),
              child: Text(
                student.initials,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.warning,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    student.fullName,
                    style: AppTextStyles.bodyMedium.copyWith(
                      fontWeight: FontWeight.w500,
                      color: AppColors.warning,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    'En attente',
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.warning.withAlpha(180),
                    ),
                  ),
                ],
              ),
            ),
            // Confirm button
            SizedBox(
              height: 32,
              child: ElevatedButton.icon(
                onPressed: () {
                  ref
                      .read(activeSessionProvider(sessionId).notifier)
                      .confirmWaitingStudent(student.userId);
                },
                icon: const Icon(Icons.check_rounded, size: 16),
                label: const Text('Confirmer'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.statusPresent,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  textStyle: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 6),
            // Kick button
            SizedBox(
              height: 32,
              child: OutlinedButton(
                onPressed: () {
                  ref
                      .read(activeSessionProvider(sessionId).notifier)
                      .kickWaitingStudent(student.userId);
                },
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.statusAbsent,
                  side: BorderSide(color: AppColors.statusAbsent.withAlpha(80)),
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: Text(
                  'Retirer',
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
