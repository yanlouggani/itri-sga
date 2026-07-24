import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/supabase/supabase_client_provider.dart';
import 'models/attendance_record.dart';
import 'models/dashboard_data.dart';
import 'models/session_data.dart';

class ProfessorRepository {
  final SupabaseClient _supabase;

  ProfessorRepository(this._supabase);

  // ── Dashboard ──

  SessionData _mapSession(Map<String, dynamic> e) {
    final modules = e.remove('modules') as Map?;
    final groups = e.remove('groups') as Map?;
    final rooms = e.remove('rooms') as Map?;
    e['moduleName'] = modules?['name'] ?? '';
    e['groupName'] = groups?['name'] ?? '';
    e['roomName'] = rooms?['name'] ?? '';
    return SessionData.fromJson(e);
  }

  Future<ProfessorDashboardData> getDashboard(String professorId) async {
    final today = DateTime.now().toIso8601String().substring(0, 10);

    final sessions = await _supabase
        .from('sessions')
        .select('*, modules(name), groups(name), rooms(name)')
        .eq('professorId', professorId)
        .eq('sessionDate', today);

    final todaySessions = (sessions as List)
        .map((e) => _mapSession(e as Map<String, dynamic>))
        .toList();

    return ProfessorDashboardData(todaySessions: todaySessions);
  }

  // ── Session CRUD ──

  Future<SessionData> getSession(String sessionId) async {
    final data = await _supabase
        .from('sessions')
        .select('*, modules(name), groups(name), rooms(name)')
        .eq('id', sessionId)
        .single();
    return _mapSession(data);
  }

  Future<SessionData> startSession(String sessionId) async {
    final data = await _supabase.rpc('start_session', params: {
      'p_session_id': sessionId,
    });
    // Recharger la séance créée/activée
    return getSession(data as String);
  }

  Future<void> closeSession(String sessionId) async {
    final attendance = await getSessionAttendance(sessionId);
    int present = 0, absent = 0, late = 0;
    for (final rec in attendance) {
      switch (rec.status) {
        case AttendanceStatus.present: present++;
        case AttendanceStatus.absent: absent++;
        case AttendanceStatus.late: late++;
        default: break;
      }
    }
    await _supabase.from('sessions').update({
      'status': 'completed',
      'presentCount': present,
      'absentCount': absent,
      'lateCount': late,
    }).eq('id', sessionId);
  }

  Future<void> postponeSession(String sessionId) async {
    await _supabase.from('sessions').update({'status': 'postponed'}).eq('id', sessionId);
  }

  Future<void> cancelSession(String sessionId) async {
    await _supabase.from('sessions').update({'status': 'cancelled'}).eq('id', sessionId);
  }

  /// Crée une session à partir d'un créneau du planning pour une date donnée.
  /// [cancelled] = true → session annulée ; false → session complétée (rétroactif).
  Future<String> createSessionForDate(String scheduleId, DateTime date, {bool cancelled = false}) async {
    final data = await _supabase.rpc('create_session_for_date', params: {
      'p_schedule_id': scheduleId,
      'p_date': date.toIso8601String().substring(0, 10),
      'p_cancelled': cancelled,
    });
    return data as String;
  }

  /// Charge les entrées du planning hebdomadaire pour un professeur,
  /// filtrées par validFrom/validTo pour une semaine donnée.
  Future<List<Map<String, dynamic>>> getWeeklySchedule(String professorId,
      {required DateTime weekStart, required DateTime weekEnd}) async {
    final data = await _supabase
        .from('weekly_schedule')
        .select('*, modules(name), groups(name), rooms(name)')
        .eq('professorId', professorId)
        .eq('isActive', true)
        .lte('validFrom', weekEnd.toIso8601String().substring(0, 10))
        .or('validTo.is.null,validTo.gte.${weekStart.toIso8601String().substring(0, 10)}')
        .order('dayOfWeek')
        .order('startTime');
    return (data as List).cast<Map<String, dynamic>>();
  }

  // ── Attendance ──

  Future<List<AttendanceRecord>> getSessionAttendance(String sessionId) async {
    final data = await _supabase
        .from('attendance')
        .select('*, users!attendance_studentId_fkey(firstName, lastName)')
        .eq('sessionId', sessionId);

    return (data as List).map((e) {
      final user = e['users'] as Map? ?? {};
      final markedAtStr = e['markedAt'] as String?;
      return AttendanceRecord(
        id: e['studentId'] as String,
        studentId: e['studentId'] as String,
        sessionId: sessionId,
        status: AttendanceStatus.fromString(e['status'] as String? ?? 'unmarked'),
        studentName: '${user['firstName'] ?? ''} ${user['lastName'] ?? ''}'.trim(),
        markedBy: e['markedBy'] as String? ?? 'professor',
        scanMethod: e['scanMethod'] as String?,
        gpsVerified: e['gpsVerified'] as bool? ?? false,
        lateMinutes: e['lateMinutes'] as int?,
        markedAt: markedAtStr != null ? DateTime.tryParse(markedAtStr) : null,
      );
    }).toList();
  }

  Future<void> markAttendance({
    required String sessionId,
    required String studentId,
    required String status,
    int? lateMinutes,
    String markedBy = 'professor',
    String scanMethod = 'manual',
    bool gpsVerified = false,
  }) async {
    await _supabase.from('attendance').upsert({
      'sessionId': sessionId,
      'studentId': studentId,
      'status': status.toLowerCase(),
      'markedBy': markedBy,
      'scanMethod': scanMethod,
      'gpsVerified': gpsVerified,
      'lateMinutes': lateMinutes,
      'markedAt': DateTime.now().toIso8601String(),
    });
  }

  Future<void> bulkMarkAttendance({
    required String sessionId,
    required List<Map<String, dynamic>> attendances,
    String markedBy = 'professor',
  }) async {
    for (final att in attendances) {
      await markAttendance(
        sessionId: sessionId,
        studentId: att['studentId'] as String,
        status: att['status'] as String,
        lateMinutes: att['lateMinutes'] as int?,
        markedBy: markedBy,
        scanMethod: att['scanMethod'] as String? ?? 'manual',
      );
    }
  }

  Future<void> updateQrToken(String sessionId, String token, int expiresAt) async {
    await _supabase.from('sessions').update({
      'currentQrToken': token,
      'qrTokenExpiresAt': DateTime.fromMillisecondsSinceEpoch(expiresAt).toIso8601String(),
    }).eq('id', sessionId);
  }

  // ── Polling streams (migration placeholder — will be replaced by Realtime channels) ──

  Stream<SessionData> sessionStream(String sessionId) async* {
    while (true) {
      try {
        yield await getSession(sessionId);
      } catch (_) {}
      await Future.delayed(const Duration(seconds: 5));
    }
  }

  Stream<List<AttendanceRecord>> attendanceStream(String sessionId) async* {
    while (true) {
      try {
        yield await getSessionAttendance(sessionId);
      } catch (_) {}
      await Future.delayed(const Duration(seconds: 5));
    }
  }

  Future<List<SessionData>> getSessionsBetween({
    required String professorId,
    required DateTime start,
    required DateTime end,
  }) async {
    final data = await _supabase
        .from('sessions')
        .select('*, modules(name), groups(name), rooms(name)')
        .eq('professorId', professorId)
        .gte('sessionDate', start.toIso8601String().substring(0, 10))
        .lte('sessionDate', end.toIso8601String().substring(0, 10))
        .order('sessionDate')
        .order('startTime');
    return (data as List)
        .map((e) => _mapSession(e as Map<String, dynamic>))
        .toList();
  }

  Stream<List<SessionData>> sessionsStream() async* {
    while (true) {
      try {
        final data = await _supabase
            .from('sessions')
            .select('*, modules(name), groups(name), rooms(name)')
            .order('sessionDate', ascending: true);
        final sessions = (data as List)
            .map((e) => _mapSession(e as Map<String, dynamic>))
            .toList();
        yield sessions;
      } catch (_) {}
      await Future.delayed(const Duration(seconds: 10));
    }
  }
}

final professorRepositoryProvider = Provider<ProfessorRepository>((ref) {
  final supabase = ref.watch(supabaseClientProvider);
  return ProfessorRepository(supabase);
});
