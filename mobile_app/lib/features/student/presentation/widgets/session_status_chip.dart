import 'package:flutter/material.dart';
import '../../../../core/theme/colors.dart';

class SessionStatusChip extends StatelessWidget {
  final String status;
  final double fontSize;

  const SessionStatusChip({
    super.key,
    required this.status,
    this.fontSize = 11,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: _color.withAlpha(20),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: _color.withAlpha(60)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(_icon, size: fontSize, color: _color),
          const SizedBox(width: 3),
          Text(
            _label,
            style: TextStyle(
              fontFamily: 'Inter',
              fontSize: fontSize,
              fontWeight: FontWeight.w600,
              color: _color,
            ),
          ),
        ],
      ),
    );
  }

  Color get _color {
    switch (status) {
      case 'present':
        return AppColors.statusPresent;
      case 'absent':
        return AppColors.statusAbsent;
      case 'late':
        return AppColors.statusLate;
      case 'justified':
        return AppColors.statusJustified;
      case 'unmarked':
        return AppColors.textSecondary;
      case 'pending':
        return AppColors.warning;
      default:
        return AppColors.textSecondary;
    }
  }

  IconData get _icon {
    switch (status) {
      case 'present':
        return Icons.check_circle_rounded;
      case 'absent':
        return Icons.cancel_rounded;
      case 'late':
        return Icons.access_time_rounded;
      case 'justified':
        return Icons.shield_rounded;
      case 'unmarked':
        return Icons.hourglass_empty_rounded;
      case 'pending':
        return Icons.schedule_rounded;
      default:
        return Icons.help_outline_rounded;
    }
  }

  String get _label {
    switch (status) {
      case 'present':
        return 'Présent';
      case 'absent':
        return 'Absent';
      case 'late':
        return 'Retard';
      case 'justified':
        return 'Justifié';
      case 'unmarked':
        return 'En attente';
      case 'pending':
        return 'En cours';
      default:
        return status;
    }
  }
}
