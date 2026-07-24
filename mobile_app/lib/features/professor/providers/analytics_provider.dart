import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/supabase/supabase_client_provider.dart';

class ProfessorAnalytics {
  final int totalSessions;
  final double attendanceRate;
  final int totalPresent;
  final int totalAbsent;
  final int totalLate;
  final List<ModuleStats> moduleStats;
  final List<SessionStats> recentSessions;

  const ProfessorAnalytics({
    this.totalSessions = 0,
    this.attendanceRate = 0.0,
    this.totalPresent = 0,
    this.totalAbsent = 0,
    this.totalLate = 0,
    this.moduleStats = const [],
    this.recentSessions = const [],
  });
}

class ModuleStats {
  final String moduleName;
  final int sessions;
  final int present;
  final int absent;
  final double rate;

  const ModuleStats({
    required this.moduleName,
    this.sessions = 0,
    this.present = 0,
    this.absent = 0,
    this.rate = 0.0,
  });
}

class SessionStats {
  final String sessionId;
  final String moduleName;
  final String sessionDate;
  final int presentCount;
  final int absentCount;
  final int lateCount;
  final int totalStudents;

  const SessionStats({
    required this.sessionId,
    required this.moduleName,
    required this.sessionDate,
    this.presentCount = 0,
    this.absentCount = 0,
    this.lateCount = 0,
    this.totalStudents = 0,
  });
}

class AnalyticsNotifier extends StateNotifier<ProfessorAnalytics> {
  final String _professorId;
  final SupabaseClient _supabase;
  Timer? _pollTimer;

  AnalyticsNotifier(this._supabase, this._professorId)
      : super(const ProfessorAnalytics()) {
    _load();
    _pollTimer = Timer.periodic(const Duration(seconds: 12), (_) => _load());
  }

  Future<void> _load() async {
    final data = await _supabase
        .from('sessions')
        .select('*, modules(name)')
        .eq('professorId', _professorId);

    final sessions = (data as List).map((e) => e as Map<String, dynamic>).toList();

    final total = sessions.length;
    int present = 0, absent = 0, late = 0;
    final modulePresent = <String, int>{};
    final moduleAbsent = <String, int>{};
    final moduleCount = <String, int>{};

    for (final s in sessions) {
      final p = s['presentCount'] as int? ?? 0;
      final a = s['absentCount'] as int? ?? 0;
      final l = s['lateCount'] as int? ?? 0;
      present += p;
      absent += a;
      late += l;

      final mod = s['modules'] as Map?;
      final modName = mod?['name'] as String? ?? '';
      modulePresent[modName] = (modulePresent[modName] ?? 0) + p;
      moduleAbsent[modName] = (moduleAbsent[modName] ?? 0) + a;
      moduleCount[modName] = (moduleCount[modName] ?? 0) + 1;
    }

    final totalStudents = present + absent + late;
    final rate = totalStudents > 0 ? (present / totalStudents) * 100 : 0.0;

    final moduleStats = moduleCount.entries.map((e) {
      final mp = modulePresent[e.key] ?? 0;
      final ma = moduleAbsent[e.key] ?? 0;
      final mt = mp + ma;
      return ModuleStats(
        moduleName: e.key,
        sessions: e.value,
        present: mp,
        absent: ma,
        rate: mt > 0 ? (mp / mt) * 100 : 0.0,
      );
    }).toList();

    sessions.sort((a, b) {
      final da = a['sessionDate'] as String? ?? '';
      final db = b['sessionDate'] as String? ?? '';
      return db.compareTo(da);
    });
    final recent = sessions.take(20).map((s) {
      final mod = s['modules'] as Map?;
      final p = s['presentCount'] as int? ?? 0;
      final a = s['absentCount'] as int? ?? 0;
      final l = s['lateCount'] as int? ?? 0;
      return SessionStats(
        sessionId: s['id'] as String? ?? '',
        moduleName: mod?['name'] as String? ?? '',
        sessionDate: s['sessionDate'] as String? ?? '',
        presentCount: p,
        absentCount: a,
        lateCount: l,
        totalStudents: p + a + l,
      );
    }).toList();

    state = ProfessorAnalytics(
      totalSessions: total,
      attendanceRate: rate,
      totalPresent: present,
      totalAbsent: absent,
      totalLate: late,
      moduleStats: moduleStats,
      recentSessions: recent,
    );
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }
}

final analyticsProvider =
    StateNotifierProvider.family<AnalyticsNotifier, ProfessorAnalytics, String>(
  (ref, professorId) {
    final supabase = ref.watch(supabaseClientProvider);
    return AnalyticsNotifier(supabase, professorId);
  },
);
