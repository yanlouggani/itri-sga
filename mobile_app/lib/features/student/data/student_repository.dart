import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/supabase/supabase_client_provider.dart';
import '../../../features/professor/data/models/session_data.dart';
import 'models/student_absence.dart';
import 'models/student_dashboard_data.dart';

class StudentRepository {
  final SupabaseClient _supabase;

  StudentRepository(this._supabase);

  Future<StudentDashboardData> getDashboard(String studentId, String groupId) async {
    final today = DateTime.now().toIso8601String().substring(0, 10);
    List<StudentSession> todaySessions = [];

    var effectiveGroupId = groupId;
    if (effectiveGroupId.isEmpty) {
      final enrollmentData = await _supabase
          .from('enrollments')
          .select('groupId')
          .eq('studentId', studentId)
          .maybeSingle();
      if (enrollmentData != null) {
        effectiveGroupId = enrollmentData['groupId'] as String? ?? '';
      }
    }

    if (effectiveGroupId.isNotEmpty) {
      final sessionsData = await _supabase
          .from('sessions')
          .select('*, modules(name), rooms(name)')
          .eq('groupId', effectiveGroupId)
          .eq('sessionDate', today);

      final sessionIds = (sessionsData as List).map((s) => s['id'] as String).toList();

      final attendanceBySession = <String, String>{};
      if (sessionIds.isNotEmpty) {
        final attendanceData = await _supabase
            .from('attendance')
            .select('sessionId, status')
            .eq('studentId', studentId)
            .inFilter('sessionId', sessionIds);
        for (final a in attendanceData as List) {
          attendanceBySession[a['sessionId'] as String] = a['status'] as String? ?? 'unmarked';
        }
      }

      todaySessions = sessionsData.map((e) {
        final modules = e['modules'] as Map?;
        final rooms = e['rooms'] as Map?;
        return StudentSession.fromJson({
          'id': e['id'] ?? '',
          'moduleName': modules?['name'] ?? '',
          'startTime': e['startTime'] ?? '',
          'endTime': e['endTime'] ?? '',
          'roomName': rooms?['name'] ?? '',
          'status': attendanceBySession[e['id'] as String] ?? 'unmarked',
        });
      }).toList();
    }

    final allAttendance = await _supabase
        .from('attendance')
        .select('status, sessions!inner(id, modules(name))')
        .eq('studentId', studentId);

    final moduleCounts = <String, int>{};
    final moduleAbsences = <String, int>{};
    for (final a in allAttendance as List) {
      final status = a['status'] as String? ?? '';
      final session = a['sessions'] as Map? ?? {};
      final mod = session['modules'] as Map?;
      final modName = mod?['name'] as String? ?? 'Unknown';
      moduleCounts[modName] = (moduleCounts[modName] ?? 0) + 1;
      if (status == 'absent' || status == 'late') {
        moduleAbsences[modName] = (moduleAbsences[modName] ?? 0) + 1;
      }
    }

    final absenceSummary = moduleCounts.entries.map((e) {
      final abs = moduleAbsences[e.key] ?? 0;
      return AbsenceSummary(
        moduleName: e.key,
        totalSessions: e.value,
        absences: abs,
      );
    }).toList();

    return StudentDashboardData(
      todaySessions: todaySessions,
      absenceSummary: absenceSummary,
    );
  }

  Future<List<StudentAbsence>> getAbsences(String studentId) async {
    final data = await _supabase
        .from('attendance')
        .select('*, sessions!inner(*, modules(name))')
        .eq('studentId', studentId)
        .neq('status', 'present')
        .order('markedAt', ascending: false);

    return (data as List).map((e) {
      final session = e['sessions'] as Map? ?? {};
      final modules = session['modules'] as Map?;
      return StudentAbsence(
        id: '${e['sessionId']}_${e['studentId']}',
        sessionId: e['sessionId'] as String,
        moduleName: modules?['name'] as String? ?? '',
        sessionDate: session['sessionDate'] as String? ?? '',
        startTime: session['startTime'] as String? ?? '',
        endTime: session['endTime'] as String? ?? '',
        status: (e['status'] as String? ?? 'unmarked').toLowerCase(),
        markedBy: e['markedBy'] as String? ?? '',
        scanMethod: e['scanMethod'] as String?,
        justificationStatus: null,
        justificationFile: null,
      );
    }).toList();
  }

  Future<void> markAttendanceFromScan({
    required String sessionId,
    required String studentId,
    required String status,
    String scanMethod = 'manual',
    bool gpsVerified = false,
    double? gpsLat,
    double? gpsLng,
    String? qrToken,
  }) async {
    await _supabase.from('attendance').upsert({
      'sessionId': sessionId,
      'studentId': studentId,
      'status': status.toLowerCase(),
      'markedBy': 'student',
      'scanMethod': scanMethod,
      'gpsVerified': gpsVerified,
      'gpsLatitude': gpsLat,
      'gpsLongitude': gpsLng,
      'markedAt': DateTime.now().toIso8601String(),
    });
  }

  Future<Map<String, dynamic>> getJustificationStatus(String studentId) async {
    final absences = await getAbsences(studentId);
    int total = 0, justified = 0;
    for (final abs in absences) {
      if (abs.status == 'absent' || abs.status == 'late') total++;
      if (abs.status == 'justified') justified++;
    }
    return {'total': total, 'justified': justified, 'pending': total - justified};
  }

  Future<Map<String, dynamic>?> getStudentEnrollment(String studentId) async {
    final data = await _supabase
        .from('enrollments')
        .select('groupId, groups!inner(name)')
        .eq('studentId', studentId)
        .maybeSingle();
    if (data == null) return null;
    final map = data;
    final groups = map['groups'] as Map?;
    return {
      'groupId': map['groupId'] as String? ?? '',
      'groupName': groups?['name'] as String? ?? '',
    };
  }

  Future<List<SessionData>> getSessionsBetween({
    required String groupName,
    required DateTime start,
    required DateTime end,
  }) async {
    final data = await _supabase
        .from('sessions')
        .select('*, modules(name), groups(name), rooms(name)')
        .eq('groupName', groupName)
        .gte('sessionDate', start.toIso8601String().substring(0, 10))
        .lte('sessionDate', end.toIso8601String().substring(0, 10))
        .order('sessionDate')
        .order('startTime');
    return (data as List).map((e) {
      final map = e as Map<String, dynamic>;
      final modules = map.remove('modules') as Map?;
      final groups = map.remove('groups') as Map?;
      final rooms = map.remove('rooms') as Map?;
      map['moduleName'] = modules?['name'] ?? '';
      map['groupName'] = groups?['name'] ?? '';
      map['roomName'] = rooms?['name'] ?? '';
      return SessionData.fromJson(map);
    }).toList();
  }

  Future<List<Map<String, dynamic>>> getWeeklyScheduleByGroup({
    required String groupId,
    required DateTime weekStart,
    required DateTime weekEnd,
  }) async {
    final data = await _supabase
        .from('weekly_schedule')
        .select('*, modules(name), groups(name), rooms(name)')
        .eq('groupId', groupId)
        .eq('isActive', true)
        .lte('validFrom', weekEnd.toIso8601String().substring(0, 10))
        .or('validTo.is.null,validTo.gte.${weekStart.toIso8601String().substring(0, 10)}')
        .order('dayOfWeek')
        .order('startTime');
    return (data as List).cast<Map<String, dynamic>>();
  }

  Stream<List<SessionData>> sessionsStream() async* {
    while (true) {
      try {
        final data = await _supabase
            .from('sessions')
            .select('*, modules(name), groups(name), rooms(name)')
            .order('sessionDate', ascending: true);
        final sessions = (data as List)
            .map((e) {
              final map = e as Map<String, dynamic>;
              final modules = map.remove('modules') as Map?;
              final groups = map.remove('groups') as Map?;
              final rooms = map.remove('rooms') as Map?;
              map['moduleName'] = modules?['name'] ?? '';
              map['groupName'] = groups?['name'] ?? '';
              map['roomName'] = rooms?['name'] ?? '';
              return SessionData.fromJson(map);
            })
            .toList();
        yield sessions;
      } catch (_) {}
      await Future.delayed(const Duration(seconds: 10));
    }
  }
}

final studentRepositoryProvider = Provider<StudentRepository>((ref) {
  final supabase = ref.watch(supabaseClientProvider);
  return StudentRepository(supabase);
});
