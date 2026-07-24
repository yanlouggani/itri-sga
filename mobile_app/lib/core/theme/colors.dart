import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // ── Primary Palette ──
  static const Color primary = Color(0xFFE8533F);
  static const Color primaryLight = Color(0xFFFF7A6B);
  static const Color primaryDark = Color(0xFF42256F);

  // ── Secondary ──
  static const Color secondary = Color(0xFFF5F5F5);
  static const Color accent = Color(0xFFE8533F);

  // ── Semantic ──
  static const Color success = Color(0xFF27AE60);
  static const Color warning = Color(0xFFF39C12);
  static const Color danger = Color(0xFFE74C3C);
  static const Color info = Color(0xFF3498DB);

  // ── Text ──
  static const Color textPrimary = Color(0xFF1A1A1A);
  static const Color textSecondary = Color(0xFF8C8C8C);
  static const Color textOnPrimary = Color(0xFFFFFFFF);

  // ── Surfaces ──
  static const Color surfaceLight = Color(0xFFFFFFFF);
  static const Color surfaceDark = Color(0xFF1A1A1A);
  static const Color backgroundLight = Color(0xFFFAFAFA);
  static const Color backgroundDark = Color(0xFF121212);

  // ── Borders ──
  static const Color borderLight = Color(0xFFE5E5E5);
  static const Color borderDark = Color(0xFF2E2E2E);

  // ── Status Badges ──
  static const Color statusPresent = Color(0xFF27AE60);
  static const Color statusAbsent = Color(0xFFE74C3C);
  static const Color statusLate = Color(0xFFF39C12);
  static const Color statusJustified = Color(0xFFE67E22);
  static const Color statusExcused = Color(0xFF95A5A6);
  static const Color statusPending = Color(0xFFF1C40F);
  static const Color statusApproved = Color(0xFF27AE60);
  static const Color statusRejected = Color(0xFFE74C3C);

  // ── Session Status ──
  static const Color sessionScheduled = Color(0xFF3498DB);
  static const Color sessionActive = Color(0xFF27AE60);
  static const Color sessionCompleted = Color(0xFF7F8C8D);
  static const Color sessionCancelled = Color(0xFFE74C3C);
  static const Color sessionPostponed = Color(0xFFF39C12);

  // ── Roles ──
  static const Color roleAdmin = Color(0xFFE8533F);
  static const Color roleProfessor = Color(0xFF42256F);
  static const Color roleStudent = Color(0xFF27AE60);

  // ── Premium Gradients ──
  static const List<Color> gradientPrimary = [Color(0xFFE8533F), Color(0xFF42256F)];
  static const List<Color> gradientAccent = [Color(0xFFE8533F), Color(0xFFFF7A6B)];
  static const List<Color> gradientSuccess = [Color(0xFF27AE60), Color(0xFF2ECC71)];
  static const List<Color> gradientWarning = [Color(0xFFF39C12), Color(0xFFF1C40F)];
  static const List<Color> gradientDanger = [Color(0xFFE74C3C), Color(0xFFEC7063)];
  static const List<Color> gradientInfo = [Color(0xFF3498DB), Color(0xFF5DADE2)];
  static const List<Color> gradientSlate = [Color(0xFF2C3E50), Color(0xFF4F6F8F)];
}
