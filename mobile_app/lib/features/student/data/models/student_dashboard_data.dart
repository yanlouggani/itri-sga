import 'package:equatable/equatable.dart';

class StudentDashboardData extends Equatable {
  final List<StudentSession> todaySessions;
  final List<AbsenceSummary> absenceSummary;

  const StudentDashboardData({
    this.todaySessions = const [],
    this.absenceSummary = const [],
  });

  factory StudentDashboardData.fromJson(Map<String, dynamic> json) {
    final sessions = (json['todaySessions'] as List<dynamic>?) ?? [];
    final absences = (json['absenceSummary'] as List<dynamic>?) ?? [];
    return StudentDashboardData(
      todaySessions: sessions
          .map((e) => StudentSession.fromJson(e as Map<String, dynamic>))
          .toList(),
      absenceSummary: absences
          .map((e) => AbsenceSummary.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  double get overallAbsenceRate {
    if (absenceSummary.isEmpty) return 0;
    final total = absenceSummary.fold<int>(0, (s, a) => s + a.totalSessions);
    final absences = absenceSummary.fold<int>(0, (s, a) => s + a.absences);
    return total > 0 ? (absences / total) * 100 : 0;
  }

  int get totalTodaySessions => todaySessions.length;
  int get presentToday =>
      todaySessions.where((s) => s.status == 'present').length;

  @override
  List<Object?> get props => [todaySessions, absenceSummary];
}

class StudentSession extends Equatable {
  final String id;
  final String moduleName;
  final String startTime;
  final String endTime;
  final String roomName;
  final String status;

  const StudentSession({
    required this.id,
    this.moduleName = '',
    this.startTime = '',
    this.endTime = '',
    this.roomName = '',
    this.status = 'unmarked',
  });

  factory StudentSession.fromJson(Map<String, dynamic> json) {
    return StudentSession(
      id: json['id'] as String? ?? '',
      moduleName: json['moduleName'] as String? ?? '',
      startTime: json['startTime'] as String? ?? '',
      endTime: json['endTime'] as String? ?? '',
      roomName: json['roomName'] as String? ?? '',
      status: json['status'] as String? ?? 'unmarked',
    );
  }

  String get formattedTime => '$startTime - $endTime';

  @override
  List<Object?> get props => [id, moduleName, startTime, endTime, roomName, status];
}

class AbsenceSummary extends Equatable {
  final String moduleName;
  final int totalSessions;
  final int absences;
  final int maxAllowed;
  final double absenceRate;

  const AbsenceSummary({
    required this.moduleName,
    this.totalSessions = 0,
    this.absences = 0,
    this.maxAllowed = 6,
    this.absenceRate = 0,
  });

  factory AbsenceSummary.fromJson(Map<String, dynamic> json) {
    return AbsenceSummary(
      moduleName: json['moduleName'] as String? ?? '',
      totalSessions: json['totalSessions'] as int? ?? 0,
      absences: json['absences'] as int? ?? 0,
      maxAllowed: json['maxAllowed'] as int? ?? 6,
      absenceRate: (json['absenceRate'] as num?)?.toDouble() ?? 0,
    );
  }

  double get remaining => (maxAllowed - absences).toDouble();
  double get utilizationRatio => maxAllowed > 0 ? absences / maxAllowed : 0.0;
  int get remainingPercent => maxAllowed > 0
      ? ((remaining / maxAllowed) * 100).round().clamp(0, 100)
      : 0;

  bool get isCritical => utilizationRatio >= 0.75;
  bool get isWarning => utilizationRatio >= 0.50 && utilizationRatio < 0.75;
  bool get isSafe => utilizationRatio < 0.50;

  @override
  List<Object?> get props => [moduleName, totalSessions, absences, maxAllowed, absenceRate];
}
