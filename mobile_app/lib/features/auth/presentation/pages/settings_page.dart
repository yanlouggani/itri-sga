import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_constants.dart';
import '../../../../core/api/api_health_provider.dart';
import '../../../../core/theme/colors.dart';
import '../../../../core/theme/text_styles.dart';
import '../../../../shared/providers/theme_provider.dart';
import '../../providers/auth_provider.dart';

class SettingsPage extends ConsumerWidget {
  const SettingsPage({super.key});

  void _showLogoutDialog(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text(
          'Déconnexion',
          style: TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.bold),
        ),
        content: const Text(
          'Êtes-vous sûr de vouloir vous déconnecter de votre compte ?',
          style: TextStyle(fontFamily: 'Inter'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text(
              'Annuler',
              style: TextStyle(fontFamily: 'Inter', color: AppColors.textSecondary),
            ),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context); // Close dialog
              ref.read(authProvider.notifier).logout();
              context.go('/login');
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.danger,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: const Text(
              'Se déconnecter',
              style: TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final user = ref.watch(currentUserProvider);
    final isDark = theme.brightness == Brightness.dark;
    final isConnected = ref.watch(apiHealthProvider).value ?? true;

    if (user == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      body: ListView(
        padding: const EdgeInsets.all(20.0),
        children: [
          // Screen Title
          Text('Paramètres & À propos', style: AppTextStyles.headingMedium),
          const SizedBox(height: 24),

          // User Profile Card
          Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: BorderSide(color: theme.colorScheme.outlineVariant.withAlpha(50)),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 30,
                    backgroundColor: _getRoleColor(user.role),
                    child: Text(
                      user.initials,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          user.fullName,
                          style: const TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          user.email,
                          style: TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 13,
                            color: theme.colorScheme.onSurface.withAlpha(140),
                          ),
                        ),
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: _getRoleColor(user.role).withAlpha(20),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            _getRoleLabel(user.role),
                            style: TextStyle(
                              fontFamily: 'Inter',
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: _getRoleColor(user.role),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),

          // Settings Section
          Text('Préférences', style: AppTextStyles.labelLarge),
          const SizedBox(height: 8),
          
          // Dark Mode Toggle
          Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: BorderSide(color: theme.colorScheme.outlineVariant.withAlpha(40)),
            ),
            child: ListTile(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              leading: Icon(
                isDark ? Icons.dark_mode_rounded : Icons.light_mode_rounded,
                color: theme.colorScheme.primary,
              ),
              title: const Text(
                'Mode Sombre',
                style: TextStyle(fontFamily: 'Inter', fontSize: 14, fontWeight: FontWeight.w600),
              ),
              subtitle: Text(
                'Activer ou désactiver le thème sombre',
                style: TextStyle(fontFamily: 'Inter', fontSize: 12, color: theme.colorScheme.onSurface.withAlpha(120)),
              ),
              trailing: Switch.adaptive(
                value: isDark,
                onChanged: (_) => ref.read(themeModeProvider.notifier).toggleTheme(),
              ),
            ),
          ),
          const SizedBox(height: 20),

          // Technical Diagnostics Section
          Text('Diagnostic Réseau', style: AppTextStyles.labelLarge),
          const SizedBox(height: 8),
          Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: BorderSide(color: theme.colorScheme.outlineVariant.withAlpha(40)),
            ),
            child: Column(
              children: [
                ListTile(
                  leading: Icon(
                    Icons.cloud_sync_rounded,
                    color: isConnected ? AppColors.success : AppColors.danger,
                  ),
                  title: const Text(
                    'Base de Données RTDB',
                    style: TextStyle(fontFamily: 'Inter', fontSize: 14, fontWeight: FontWeight.w600),
                  ),
                  subtitle: Text(
                    isConnected ? 'Connecté au serveur API' : 'Déconnecté / Mode Hors-ligne',
                    style: TextStyle(fontFamily: 'Inter', fontSize: 12, color: theme.colorScheme.onSurface.withAlpha(120)),
                  ),
                  trailing: Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      color: isConnected ? AppColors.success : AppColors.danger,
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
                const Divider(height: 1, indent: 56),
                ListTile(
                  leading: const Icon(Icons.location_on_rounded, color: AppColors.primary),
                  title: const Text(
                    'Géolocalisation & Geofencing',
                    style: TextStyle(fontFamily: 'Inter', fontSize: 14, fontWeight: FontWeight.w600),
                  ),
                  subtitle: Text(
                    'Rayon de validation requis : 50 mètres',
                    style: TextStyle(fontFamily: 'Inter', fontSize: 12, color: theme.colorScheme.onSurface.withAlpha(120)),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // About Section
          Text('À propos', style: AppTextStyles.labelLarge),
          const SizedBox(height: 8),
          Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: BorderSide(color: theme.colorScheme.outlineVariant.withAlpha(40)),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primary.withAlpha(20),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(Icons.school_rounded, color: theme.colorScheme.primary, size: 24),
                      ),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            AppConstants.appName,
                            style: const TextStyle(fontFamily: 'Inter', fontSize: 15, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'École de Langues et de Formation',
                            style: TextStyle(fontFamily: 'Inter', fontSize: 11, color: theme.colorScheme.onSurface.withAlpha(120)),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  const Divider(height: 1),
                  const SizedBox(height: 12),
                  const _CreditRow(label: 'Version de l\'application', value: 'v1.2.0 (Stable)'),
                  const _CreditRow(label: 'Établissement', value: 'ITRI Academy'),
                  const _CreditRow(label: 'Développeur principal', value: 'Ouadah Walid & Louggani Yan & Mazari Redha'),
                  const _CreditRow(label: 'Backend architecture', value: 'Supabase + PostgreSQL'),
                ],
              ),
            ),
          ),
          const SizedBox(height: 32),

          // Logout Button
          SizedBox(
            height: 48,
            child: OutlinedButton.icon(
              onPressed: () => _showLogoutDialog(context, ref),
              icon: const Icon(Icons.logout_rounded, color: AppColors.danger, size: 18),
              label: const Text(
                'Se déconnecter',
                style: TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.bold, color: AppColors.danger),
              ),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: AppColors.danger, width: 1.2),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Center(
            child: Text(
              '© 2026 ITRI Academy. Tous droits réservés.',
              style: TextStyle(
                fontFamily: 'Inter',
                fontSize: 10,
                color: theme.colorScheme.onSurface.withAlpha(100),
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _getRoleLabel(String role) {
    switch (role) {
      case 'admin':
        return 'ADMINISTRATEUR';
      case 'professor':
        return 'PROFESSEUR';
      case 'student':
        return 'ÉTUDIANT';
      default:
        return role.toUpperCase();
    }
  }

  Color _getRoleColor(String role) {
    switch (role) {
      case 'admin':
        return AppColors.roleAdmin;
      case 'professor':
        return AppColors.roleProfessor;
      case 'student':
        return AppColors.roleStudent;
      default:
        return AppColors.primary;
    }
  }
}

class _CreditRow extends StatelessWidget {
  final String label;
  final String value;

  const _CreditRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(fontFamily: 'Inter', fontSize: 12, color: theme.colorScheme.onSurface.withAlpha(140)),
          ),
          Text(
            value,
            style: const TextStyle(fontFamily: 'Inter', fontSize: 12, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}
