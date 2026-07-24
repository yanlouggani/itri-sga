import 'package:equatable/equatable.dart';
import 'session_data.dart';

class ProfessorDashboardData extends Equatable {
  final List<SessionData> todaySessions;
  final int totalModules;
  final double averagePresenceRate;

  const ProfessorDashboardData({
    required this.todaySessions,
    this.totalModules = 0,
    this.averagePresenceRate = 0.0,
  });

  factory ProfessorDashboardData.fromJson(Map<String, dynamic> json) {
    final data = json['data'] as Map<String, dynamic>? ?? json;
    final sessionsList = data['sessions'] as List<dynamic>? ??
        data['todaySessions'] as List<dynamic>? ??
        [];

    return ProfessorDashboardData(
      todaySessions: sessionsList
          .map((e) => SessionData.fromJson(e as Map<String, dynamic>))
          .toList(),
      totalModules: data['total_modules'] as int? ??
          data['totalModules'] as int? ??
          0,
      averagePresenceRate: (data['average_presence_rate'] as num? ??
              data['averagePresenceRate'] as num? ??
              0.0)
          .toDouble(),
    );
  }

  List<SessionData> get activeSessions =>
      todaySessions.where((s) => s.isActive).toList();

  List<SessionData> get upcomingSessions =>
      todaySessions.where((s) => s.canStart).toList();

  List<SessionData> get completedSessions =>
      todaySessions.where((s) => s.isCompleted).toList();

  @override
  List<Object?> get props =>
      [todaySessions, totalModules, averagePresenceRate];
}
