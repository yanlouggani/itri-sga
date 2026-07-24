import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/colors.dart';
import '../../../../core/theme/text_styles.dart';
import '../../../../core/utils/extensions.dart';
import '../../../../shared/providers/data_state.dart';
import '../../../auth/data/models/user.dart';
import '../../data/models/university_group.dart';
import '../../providers/admin_groups_provider.dart';
import '../../providers/admin_users_provider.dart';

class AdminUsersPage extends ConsumerStatefulWidget {
  const AdminUsersPage({super.key});

  @override
  ConsumerState<AdminUsersPage> createState() => _AdminUsersPageState();
}

class _AdminUsersPageState extends ConsumerState<AdminUsersPage> {
  final _searchController = TextEditingController();

  List<AppUser> _filterUsers(List<AppUser> users, String query) {
    if (query.isEmpty) return users;
    final q = query.toLowerCase();
    return users.where((u) =>
      u.fullName.toLowerCase().contains(q) ||
      u.email.toLowerCase().contains(q)
    ).toList();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Color _roleColor(String role) {
    switch (role) {
      case 'admin':
        return AppColors.roleAdmin;
      case 'professor':
        return AppColors.roleProfessor;
      case 'student':
        return AppColors.roleStudent;
      default:
        return AppColors.textSecondary;
    }
  }

  String _roleLabel(String role) {
    switch (role) {
      case 'admin':
        return 'Administrateur';
      case 'professor':
        return 'Professeur';
      case 'student':
        return 'Étudiant';
      default:
        return role;
    }
  }

  Future<void> _showUserDialog({AppUser? user}) async {
    final emailController = TextEditingController(text: user?.email ?? '');
    final passwordController = TextEditingController();
    final firstNameController = TextEditingController(text: user?.firstName ?? '');
    final lastNameController = TextEditingController(text: user?.lastName ?? '');
    final groupSearchController = TextEditingController();
    final isEditing = user != null;
    String selectedRole = user?.role ?? 'student';
    bool isActive = user?.isActive ?? true;
    String? selectedGroupId;
    String? selectedGroupName;
    final formKey = GlobalKey<FormState>();

    try {
      final result = await showDialog<Map<String, dynamic>>(
        context: context,
        barrierDismissible: false,
        builder: (ctx) {
          final groupsState = ref.watch(adminGroupsProvider);
          final allGroups = groupsState.data;
          final groupsLoading = groupsState.isLoading;

          debugPrint('[AdminUsers] Dialog opened. allGroups length: ${allGroups.length}, isLoading: $groupsLoading, isEditing: $isEditing');

          return StatefulBuilder(
            builder: (ctx, setDialogState) {
              final query = groupSearchController.text;
              final filteredGroups = query.isEmpty
                  ? allGroups
                  : allGroups.where((g) =>
                      g.name.toLowerCase().contains(query.toLowerCase()) ||
                      g.moduleName.toLowerCase().contains(query.toLowerCase())
                    ).toList();

              debugPrint('[AdminUsers] Groups filter applied. query: "$query", total: ${allGroups.length}, filtered: ${filteredGroups.length}');

              return AlertDialog(
                title: Text(isEditing ? "Modifier l'utilisateur" : 'Ajouter un utilisateur'),
                content: Form(
                  key: formKey,
                  child: SingleChildScrollView(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        TextFormField(
                          controller: firstNameController,
                          decoration: const InputDecoration(
                            labelText: 'Prénom',
                            prefixIcon: Icon(Icons.person_outline),
                          ),
                          validator: (v) => v == null || v.trim().isEmpty ? 'Requis' : null,
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: lastNameController,
                          decoration: const InputDecoration(
                            labelText: 'Nom',
                            prefixIcon: Icon(Icons.person_outline),
                          ),
                          validator: (v) => v == null || v.trim().isEmpty ? 'Requis' : null,
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: emailController,
                          decoration: const InputDecoration(
                            labelText: 'Email',
                            prefixIcon: Icon(Icons.email_outlined),
                          ),
                          keyboardType: TextInputType.emailAddress,
                          validator: (v) {
                            if (v == null || v.trim().isEmpty) return 'Requis';
                            if (!v.contains('@')) return 'Email invalide';
                            return null;
                          },
                        ),
                        if (!isEditing) ...[
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: passwordController,
                            decoration: const InputDecoration(
                              labelText: 'Mot de passe',
                              prefixIcon: Icon(Icons.lock_outline),
                            ),
                            obscureText: true,
                            validator: (v) {
                              if (!isEditing && (v == null || v.length < 6)) {
                                return 'Minimum 6 caractères';
                              }
                              return null;
                            },
                          ),
                        ],
                        const SizedBox(height: 12),
                        DropdownButtonFormField<String>(
                          value: selectedRole,
                          decoration: const InputDecoration(
                            labelText: 'Rôle',
                            prefixIcon: Icon(Icons.badge_outlined),
                          ),
                          items: const [
                            DropdownMenuItem(value: 'admin', child: Text('Administrateur')),
                            DropdownMenuItem(value: 'professor', child: Text('Professeur')),
                            DropdownMenuItem(value: 'student', child: Text('Étudiant')),
                          ],
                          onChanged: (v) {
                            if (v != null) {
                              setDialogState(() => selectedRole = v);
                            }
                          },
                        ),
                        if (selectedRole == 'student') ...[
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: groupSearchController,
                            decoration: InputDecoration(
                              labelText: 'Groupe',
                              prefixIcon: const Icon(Icons.group_outlined),
                              suffixIcon: selectedGroupId != null
                                  ? IconButton(
                                      icon: const Icon(Icons.close_rounded, size: 18),
                                      onPressed: () {
                                        setDialogState(() {
                                          selectedGroupId = null;
                                          selectedGroupName = null;
                                          groupSearchController.clear();
                                        });
                                      },
                                    )
                                  : null,
                            ),
                            onChanged: (_) => setDialogState(() {}),
                          ),
                          const SizedBox(height: 4),
                          if (selectedGroupId != null && query.isEmpty)
                            Padding(
                              padding: const EdgeInsets.only(left: 12, bottom: 4),
                              child: Text(
                                'Sélectionné : $selectedGroupName',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: AppColors.success.withAlpha(180),
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                          Container(
                            constraints: const BoxConstraints(maxHeight: 180),
                            decoration: BoxDecoration(
                              color: context.colorScheme.surfaceContainerHighest.withAlpha(40),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: context.colorScheme.outlineVariant.withAlpha(80),
                              ),
                            ),
                            child: groupsLoading && allGroups.isEmpty
                                ? const Center(
                                    child: Padding(
                                      padding: EdgeInsets.all(16),
                                      child: SizedBox(
                                        width: 24,
                                        height: 24,
                                        child: CircularProgressIndicator(strokeWidth: 2),
                                      ),
                                    ),
                                  )
                                : filteredGroups.isEmpty
                                    ? Padding(
                                        padding: const EdgeInsets.all(16),
                                        child: Center(
                                          child: Text(
                                            query.isNotEmpty && allGroups.isNotEmpty
                                                ? 'Aucun groupe trouvé'
                                                : 'Aucun groupe disponible',
                                            style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                                          ),
                                        ),
                                      )
                                    : SingleChildScrollView(
                                        padding: EdgeInsets.zero,
                                        child: Column(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            for (final g in filteredGroups)
                                              _GroupItem(
                                                group: g,
                                                isSelected: g.id == selectedGroupId,
                                                onTap: () {
                                                  debugPrint('[AdminUsers] Group selected: id=${g.id}, name=${g.name}, moduleName=${g.moduleName}');
                                                  setDialogState(() {
                                                    selectedGroupId = g.id;
                                                    selectedGroupName = g.name;
                                                    groupSearchController.clear();
                                                  });
                                                },
                                              ),
                                          ],
                                        ),
                                      ),
                          ),
                        ],
                        const SizedBox(height: 12),
                        SwitchListTile(
                          title: const Text('Actif'),
                          value: isActive,
                          onChanged: (v) => setDialogState(() => isActive = v),
                          contentPadding: EdgeInsets.zero,
                        ),
                      ],
                    ),
                  ),
                ),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.of(ctx).pop(),
                    child: const Text('Annuler'),
                  ),
                  FilledButton(
                    onPressed: () {
                      if (formKey.currentState!.validate()) {
                        Navigator.of(ctx).pop({
                          'email': emailController.text.trim(),
                          if (!isEditing) 'password': passwordController.text,
                          'firstName': firstNameController.text.trim(),
                          'lastName': lastNameController.text.trim(),
                          'role': selectedRole,
                          'isActive': isActive,
                          'groupId': selectedGroupId,
                          'groupName': selectedGroupName,
                        });
                      }
                    },
                    child: Text(isEditing ? 'Enregistrer' : 'Créer'),
                  ),
                ],
              );
            },
          );
        },
      );

      if (result != null && mounted) {
        if (isEditing) {
          final data = <String, dynamic>{
            'email': result['email'],
            'firstName': result['firstName'],
            'lastName': result['lastName'],
            'role': result['role'],
            'isActive': result['isActive'],
          };
          await ref.read(adminUsersProvider.notifier).updateUser(user.id, data);
        } else {
          await ref.read(adminUsersProvider.notifier).createUser(
            email: result['email'],
            password: result['password'],
            firstName: result['firstName'],
            lastName: result['lastName'],
            role: result['role'],
          );
        }
      }
    } finally {
      emailController.dispose();
      passwordController.dispose();
      firstNameController.dispose();
      lastNameController.dispose();
      groupSearchController.dispose();
    }
  }

  Future<void> _confirmDelete(AppUser user) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirmer la suppression'),
        content: Text("Voulez-vous vraiment supprimer l'utilisateur ${user.fullName} ?"),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Annuler'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      await ref.read(adminUsersProvider.notifier).deleteUser(user.id);
    }
  }

  Future<void> _resetPassword(AppUser user) async {
    final passwordController = TextEditingController();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Réinitialiser le mot de passe'),
        content: TextField(
          controller: passwordController,
          decoration: const InputDecoration(
            labelText: 'Nouveau mot de passe',
            prefixIcon: Icon(Icons.lock_outline),
          ),
          obscureText: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Mettre à jour'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      final newPassword = passwordController.text.trim();
      if (newPassword.isEmpty) return;
      await ref.read(adminUsersProvider.notifier).resetPassword(user.id, newPassword);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Mot de passe mis à jour')),
        );
      }
    }
    passwordController.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(adminUsersProvider);
    final filteredUsers = _filterUsers(state.data, _searchController.text.trim());

    return Column(
      children: [
        Padding(
          padding: EdgeInsets.fromLTRB(
            context.isMobile ? 16 : 32,
            context.isMobile ? 16 : 24,
            context.isMobile ? 16 : 32,
            0,
          ),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Rechercher par nom ou email...',
                    prefixIcon: const Icon(Icons.search_rounded),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear_rounded),
                            onPressed: () {
                              _searchController.clear();
                              setState(() {});
                            },
                          )
                        : null,
                    isDense: true,
                  ),
                  onChanged: (_) => setState(() {}),
                ),
              ),
              const SizedBox(width: 12),
              FilledButton.icon(
                onPressed: () => _showUserDialog(),
                icon: const Icon(Icons.add_rounded, size: 20),
                label: Text(
                  context.isMobile ? '' : 'Ajouter',
                  style: AppTextStyles.buttonMedium,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Expanded(
          child: _buildBody(context, state, filteredUsers),
        ),
      ],
    );
  }

  Widget _buildBody(BuildContext context, AdminDataState<AppUser> state, List<AppUser> filteredUsers) {
    if (state.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state.error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.error_outline_rounded, size: 64, color: AppColors.danger.withAlpha(150)),
              const SizedBox(height: 16),
              Text('Erreur', style: AppTextStyles.headingMedium, textAlign: TextAlign.center),
              const SizedBox(height: 8),
              Text(
                state.error!,
                style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed: () => ref.read(adminUsersProvider.notifier).loadUsers(),
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Réessayer'),
              ),
            ],
          ),
        ),
      );
    }

    if (filteredUsers.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: AppColors.primary.withAlpha(15),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Icon(
                  _searchController.text.isEmpty ? Icons.people_outline_rounded : Icons.search_off_rounded,
                  size: 40,
                  color: AppColors.primary.withAlpha(128),
                ),
              ),
              const SizedBox(height: 20),
              Text(
                _searchController.text.isEmpty ? 'Aucun utilisateur' : 'Aucun résultat',
                style: AppTextStyles.headingSmall,
              ),
              const SizedBox(height: 8),
              Text(
                _searchController.text.isEmpty
                    ? 'Commencez par ajouter un utilisateur'
                    : 'Aucun utilisateur ne correspond à votre recherche',
                style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(adminUsersProvider.notifier).loadUsers(),
      child: ListView.builder(
        padding: EdgeInsets.symmetric(
          horizontal: context.isMobile ? 16 : 32,
          vertical: 8,
        ),
        itemCount: filteredUsers.length,
        itemBuilder: (context, index) {
          final u = filteredUsers[index];
          return _UserTile(
            user: u,
            roleColor: _roleColor(u.role),
            roleLabel: _roleLabel(u.role),
            onTap: () => _showUserDialog(user: u),
            onDelete: () => _confirmDelete(u),
            onResetPassword: () => _resetPassword(u),
          );
        },
      ),
    );
  }
}

class _GroupItem extends StatelessWidget {
  final UniversityGroup group;
  final bool isSelected;
  final VoidCallback onTap;

  const _GroupItem({
    required this.group,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary.withAlpha(15) : null,
          border: Border(
            bottom: BorderSide(
              color: context.colorScheme.outlineVariant.withAlpha(40),
            ),
          ),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    group.name,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${group.moduleName} — ${group.studentCount} étudiants',
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            if (isSelected)
              const Icon(
                Icons.check_circle_rounded,
                size: 18,
                color: AppColors.primary,
              ),
          ],
        ),
      ),
    );
  }
}

class _UserTile extends StatelessWidget {
  final AppUser user;
  final Color roleColor;
  final String roleLabel;
  final VoidCallback onTap;
  final VoidCallback onDelete;
  final VoidCallback onResetPassword;

  const _UserTile({
    required this.user,
    required this.roleColor,
    required this.roleLabel,
    required this.onTap,
    required this.onDelete,
    required this.onResetPassword,
  });

  @override
  Widget build(BuildContext context) {
    return Dismissible(
      key: ValueKey(user.id),
      direction: DismissDirection.endToStart,
      confirmDismiss: (_) async {
        onDelete();
        return false;
      },
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        margin: const EdgeInsets.only(bottom: 8),
        decoration: BoxDecoration(
          color: AppColors.danger,
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Icon(Icons.delete_rounded, color: Colors.white, size: 28),
      ),
      child: Card(
        margin: const EdgeInsets.only(bottom: 8),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 22,
                  backgroundColor: roleColor.withAlpha(30),
                  child: Text(
                    user.initials,
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: roleColor,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user.fullName,
                        style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.w600),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        user.email,
                        style: AppTextStyles.caption,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: roleColor.withAlpha(20),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    roleLabel,
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: roleColor,
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                Container(
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(
                    color: user.isActive ? AppColors.success : AppColors.textSecondary,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 4),
                PopupMenuButton<String>(
                  onSelected: (v) {
                    if (v == 'edit') onTap();
                    if (v == 'reset') onResetPassword();
                    if (v == 'delete') onDelete();
                  },
                  itemBuilder: (ctx) => [
                    const PopupMenuItem(value: 'edit', child: ListTile(
                      leading: Icon(Icons.edit_rounded, size: 20),
                      title: Text('Modifier'),
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                    )),
                    const PopupMenuItem(value: 'reset', child: ListTile(
                      leading: Icon(Icons.lock_reset_rounded, size: 20),
                      title: Text('Réinitialiser mot de passe'),
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                    )),
                    const PopupMenuItem(value: 'delete', child: ListTile(
                      leading: Icon(Icons.delete_rounded, size: 20, color: AppColors.danger),
                      title: Text('Supprimer', style: TextStyle(color: AppColors.danger)),
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                    )),
                  ],
                  icon: const Icon(Icons.more_vert_rounded, size: 20),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
