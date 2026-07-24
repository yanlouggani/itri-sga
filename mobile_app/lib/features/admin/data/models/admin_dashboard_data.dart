import 'package:equatable/equatable.dart';
import '../../../professor/data/models/session_data.dart';

class AdminDashboardData extends Equatable {
  final int totalUsers;
  final int totalStudents;
  final int totalProfessors;
  final int totalModules;
  final int totalRooms;
  final int totalGroups;
  final int totalSessionsToday;
  final int activeSessionsToday;
  final double averageAttendanceRate;
  final List<SessionData> recentSessions;
  final List<String> recentActivities;

  const AdminDashboardData({
    this.totalUsers = 0,
    this.totalStudents = 0,
    this.totalProfessors = 0,
    this.totalModules = 0,
    this.totalRooms = 0,
    this.totalGroups = 0,
    this.totalSessionsToday = 0,
    this.activeSessionsToday = 0,
    this.averageAttendanceRate = 0.0,
    this.recentSessions = const [],
    this.recentActivities = const [],
  });

  factory AdminDashboardData.fromJson(Map<String, dynamic> json) {
    return AdminDashboardData(
      totalUsers: json['totalUsers'] as int? ?? 0,
      totalStudents: json['totalStudents'] as int? ?? 0,
      totalProfessors: json['totalProfessors'] as int? ?? 0,
      totalModules: json['totalModules'] as int? ?? 0,
      totalRooms: json['totalRooms'] as int? ?? 0,
      totalGroups: json['totalGroups'] as int? ?? 0,
      totalSessionsToday: json['totalSessionsToday'] as int? ?? 0,
      activeSessionsToday: json['activeSessionsToday'] as int? ?? 0,
      averageAttendanceRate:
          (json['averageAttendanceRate'] as num?)?.toDouble() ?? 0.0,
      recentSessions: (json['recentSessions'] as List<dynamic>?)
              ?.map((e) => SessionData.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      recentActivities: (json['recentActivities'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'totalUsers': totalUsers,
      'totalStudents': totalStudents,
      'totalProfessors': totalProfessors,
      'totalModules': totalModules,
      'totalRooms': totalRooms,
      'totalGroups': totalGroups,
      'totalSessionsToday': totalSessionsToday,
      'activeSessionsToday': activeSessionsToday,
      'averageAttendanceRate': averageAttendanceRate,
      'recentSessions': recentSessions.map((e) => e.toJson()).toList(),
      'recentActivities': recentActivities,
    };
  }

  AdminDashboardData copyWith({
    int? totalUsers,
    int? totalStudents,
    int? totalProfessors,
    int? totalModules,
    int? totalRooms,
    int? totalGroups,
    int? totalSessionsToday,
    int? activeSessionsToday,
    double? averageAttendanceRate,
    List<SessionData>? recentSessions,
    List<String>? recentActivities,
  }) {
    return AdminDashboardData(
      totalUsers: totalUsers ?? this.totalUsers,
      totalStudents: totalStudents ?? this.totalStudents,
      totalProfessors: totalProfessors ?? this.totalProfessors,
      totalModules: totalModules ?? this.totalModules,
      totalRooms: totalRooms ?? this.totalRooms,
      totalGroups: totalGroups ?? this.totalGroups,
      totalSessionsToday: totalSessionsToday ?? this.totalSessionsToday,
      activeSessionsToday: activeSessionsToday ?? this.activeSessionsToday,
      averageAttendanceRate:
          averageAttendanceRate ?? this.averageAttendanceRate,
      recentSessions: recentSessions ?? this.recentSessions,
      recentActivities: recentActivities ?? this.recentActivities,
    );
  }

  @override
  List<Object?> get props => [
        totalUsers,
        totalStudents,
        totalProfessors,
        totalModules,
        totalRooms,
        totalGroups,
        totalSessionsToday,
        activeSessionsToday,
        averageAttendanceRate,
        recentSessions,
        recentActivities,
      ];
}
