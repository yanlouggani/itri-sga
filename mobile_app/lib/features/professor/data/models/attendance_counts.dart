import 'package:equatable/equatable.dart';

class AttendanceCounts extends Equatable {
  final int total;
  final int present;
  final int absent;
  final int late;
  final int waiting;

  const AttendanceCounts({
    this.total = 0,
    this.present = 0,
    this.absent = 0,
    this.late = 0,
    this.waiting = 0,
  });

  factory AttendanceCounts.fromJson(Map<String, dynamic> json) {
    return AttendanceCounts(
      total: json['total'] as int? ?? 0,
      present: json['present'] as int? ?? 0,
      absent: json['absent'] as int? ?? 0,
      late: json['late'] as int? ?? 0,
      waiting: json['waiting'] as int? ?? 0,
    );
  }

  factory AttendanceCounts.fromSocketData(Map<String, dynamic> data) {
    return AttendanceCounts(
      total: data['total'] as int? ?? 0,
      present: data['present'] as int? ?? 0,
      absent: data['absent'] as int? ?? 0,
      late: data['late'] as int? ?? 0,
      waiting: data['waiting'] as int? ?? 0,
    );
  }

  int get unmarked => total - present - absent - late;
  int get totalMarked => present + absent + late;
  double get completionRate => total > 0 ? totalMarked / total : 0.0;
  double get presentRate => total > 0 ? present / total : 0.0;
  double get absentRate => total > 0 ? absent / total : 0.0;

  AttendanceCounts copyWith({
    int? total,
    int? present,
    int? absent,
    int? late,
    int? waiting,
  }) {
    return AttendanceCounts(
      total: total ?? this.total,
      present: present ?? this.present,
      absent: absent ?? this.absent,
      late: late ?? this.late,
      waiting: waiting ?? this.waiting,
    );
  }

  @override
  List<Object?> get props => [total, present, absent, late, waiting];
}
