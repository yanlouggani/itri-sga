import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/colors.dart';
import '../../../../core/theme/text_styles.dart';
import '../../data/models/session_data.dart';
import '../../providers/dashboard_provider.dart';
import 'session_status_badge.dart';

class SessionCard extends StatelessWidget {
  final SessionData session;
  final bool showActions;

  const SessionCard({
    super.key,
    required this.session,
    this.showActions = true,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () {
          context.go('/professor/session/${session.id}');
        },
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header row
              Row(
                children: [
                  // Module icon
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: _typeColor.withAlpha(20),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      _typeIcon,
                      color: _typeColor,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 12),

                  // Module + type
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          session.moduleName,
                          style: AppTextStyles.bodyMedium.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${session.sessionType} · ${session.groupName}',
                          style: AppTextStyles.caption,
                        ),
                      ],
                    ),
                  ),

                  // Status badge
                  SessionStatusBadge(status: session.status),
                ],
              ),
              const SizedBox(height: 12),

              // Time, room, date row
              Row(
                children: [
                  _InfoChip(
                    icon: Icons.access_time_rounded,
                    text: session.formattedTime,
                  ),
                  const SizedBox(width: 12),
                  _InfoChip(
                    icon: Icons.meeting_room_rounded,
                    text: session.roomName,
                  ),
                  const SizedBox(width: 12),
                  _InfoChip(
                    icon: Icons.calendar_today_rounded,
                    text: session.formattedDate,
                  ),
                ],
              ),

              // Action buttons
              if (showActions && session.canStart) ...[
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: SizedBox(
                        height: 40,
                        child: ElevatedButton.icon(
                          onPressed: () {
                            context.go('/professor/session/${session.id}');
                          },
                          icon: const Icon(Icons.play_arrow_rounded, size: 18),
                          label: const Text('Ouvrir la séance'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.sessionActive,
                            foregroundColor: Colors.white,
                            textStyle: AppTextStyles.buttonMedium,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    _ActionButton(
                      icon: Icons.more_horiz_rounded,
                      onPressed: () => _showActionsSheet(context),
                    ),
                  ],
                ),
              ],
              if (session.isActive) ...[
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  height: 40,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      context.go('/professor/session/${session.id}');
                    },
                    icon: const Icon(Icons.login_rounded, size: 18),
                    label: const Text('Rejoindre la séance'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.sessionActive,
                      foregroundColor: Colors.white,
                      textStyle: AppTextStyles.buttonMedium,
                    ),
                  ),
                ),
              ],
              if (session.isCompleted) ...[
                const SizedBox(height: 12),
                Row(
                  children: [
                    _InfoChip(
                      icon: Icons.check_circle_rounded,
                      text: '${session.presentCount} présents',
                      color: AppColors.statusPresent,
                    ),
                    const SizedBox(width: 8),
                    _InfoChip(
                      icon: Icons.cancel_rounded,
                      text: '${session.absentCount} absents',
                      color: AppColors.statusAbsent,
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Color get _typeColor {
    switch (session.sessionType) {
      case 'Cours':
        return AppColors.accent;
      case 'TD':
        return AppColors.warning;
      case 'TP':
        return AppColors.success;
      default:
        return AppColors.textSecondary;
    }
  }

  IconData get _typeIcon {
    switch (session.sessionType) {
      case 'Cours':
        return Icons.menu_book_rounded;
      case 'TD':
        return Icons.group_work_rounded;
      case 'TP':
        return Icons.computer_rounded;
      default:
        return Icons.school_rounded;
    }
  }

  void _showActionsSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => _SessionActionsSheet(session: session),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String text;
  final Color? color;

  const _InfoChip({
    required this.icon,
    required this.text,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveColor = color ?? AppColors.textSecondary;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: effectiveColor),
        const SizedBox(width: 4),
        Text(
          text,
          style: TextStyle(
            fontFamily: 'Inter',
            fontSize: 12,
            color: effectiveColor,
          ),
        ),
      ],
    );
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onPressed;

  const _ActionButton({required this.icon, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 40,
      height: 40,
      child: OutlinedButton(
        onPressed: onPressed,
        style: OutlinedButton.styleFrom(
          padding: EdgeInsets.zero,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
        child: Icon(icon, size: 20),
      ),
    );
  }
}

class _SessionActionsSheet extends ConsumerWidget {
  final SessionData session;
  const _SessionActionsSheet({required this.session});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.outlineVariant,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              session.moduleName,
              style: AppTextStyles.headingSmall,
            ),
            Text(
              session.formattedTime,
              style: AppTextStyles.bodyMedium.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 20),
            if (session.canStart)
              _ActionListTile(
                icon: Icons.play_arrow_rounded,
                label: 'Ouvrir la séance',
                color: AppColors.sessionActive,
                onTap: () async {
                  Navigator.pop(context);
                  final notifier = ref.read(dashboardProvider.notifier);
                  await notifier.startSession(session.id);
                },
              ),
            _ActionListTile(
              icon: Icons.schedule_rounded,
              label: 'Reporter la séance',
              color: AppColors.sessionPostponed,
              onTap: () async {
                Navigator.pop(context);
                final notifier = ref.read(dashboardProvider.notifier);
                await notifier.postponeSession(session.id);
              },
            ),
            _ActionListTile(
              icon: Icons.cancel_outlined,
              label: 'Annuler la séance',
              color: AppColors.sessionCancelled,
              onTap: () async {
                Navigator.pop(context);
                final confirmed = await showDialog<bool>(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: const Text('Confirmer l\'annulation'),
                    content: Text(
                      'Voulez-vous vraiment annuler la séance de ${session.moduleName} ?',
                    ),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(ctx, false),
                        child: const Text('Non'),
                      ),
                      ElevatedButton(
                        onPressed: () => Navigator.pop(ctx, true),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.danger,
                        ),
                        child: const Text('Annuler la séance'),
                      ),
                    ],
                  ),
                );
                if (confirmed == true) {
                  final notifier = ref.read(dashboardProvider.notifier);
                  await notifier.cancelSession(session.id);
                }
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}

class _ActionListTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _ActionListTile({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: color.withAlpha(20),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, color: color, size: 22),
      ),
      title: Text(label, style: AppTextStyles.bodyMedium),
      trailing: Icon(Icons.chevron_right_rounded,
          color: AppColors.textSecondary, size: 20),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      onTap: onTap,
    );
  }
}
