import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/colors.dart';
import '../../../../core/theme/text_styles.dart';
import '../../../../core/utils/extensions.dart';
import '../../../../shared/providers/data_state.dart';
import '../../data/models/university_group.dart';
import '../../providers/admin_groups_provider.dart';

class AdminGroupsPage extends ConsumerStatefulWidget {
  const AdminGroupsPage({super.key});

  @override
  ConsumerState<AdminGroupsPage> createState() => _AdminGroupsPageState();
}

class _AdminGroupsPageState extends ConsumerState<AdminGroupsPage> {
  final _searchController = TextEditingController();

  List<UniversityGroup> _filter(List<UniversityGroup> groups, String query) {
    if (query.isEmpty) return groups;
    final q = query.toLowerCase();
    return groups.where((g) =>
      g.name.toLowerCase().contains(q) ||
      g.moduleName.toLowerCase().contains(q) ||
      g.levelName.toLowerCase().contains(q),
    ).toList();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _showGroupDialog({UniversityGroup? group}) async {
    final nameController = TextEditingController(text: group?.name ?? '');
    final codeController = TextEditingController(text: group?.moduleName ?? '');
    final departmentController = TextEditingController(text: group?.levelName ?? '');
    final studentCountController = TextEditingController(
      text: group != null ? group.studentCount.toString() : '',
    );
    final isEditing = group != null;
    final levelOptions = ['L1', 'L2', 'L3', 'M1', 'M2'];
    String selectedLevel = group?.levelName ?? levelOptions.first;
    bool isActive = group?.isActive ?? true;
    final formKey = GlobalKey<FormState>();

    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setDialogState) {
            return AlertDialog(
              title: Text(isEditing ? 'Modifier le groupe' : 'Ajouter un groupe'),
              content: Form(
                key: formKey,
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      TextFormField(
                        controller: nameController,
                        decoration: const InputDecoration(
                          labelText: 'Nom',
                          prefixIcon: Icon(Icons.group_outlined),
                        ),
                        validator: (v) => v == null || v.trim().isEmpty ? 'Requis' : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: codeController,
                        decoration: const InputDecoration(
                          labelText: 'Code',
                          prefixIcon: Icon(Icons.tag_outlined),
                        ),
                        validator: (v) => v == null || v.trim().isEmpty ? 'Requis' : null,
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        value: selectedLevel,
                        decoration: const InputDecoration(
                          labelText: 'Niveau',
                          prefixIcon: Icon(Icons.school_outlined),
                        ),
                        items: levelOptions.map(
                          (l) => DropdownMenuItem(
                            value: l,
                            child: Text(l),
                          ),
                        ).toList(),
                        onChanged: (v) {
                          if (v != null) setDialogState(() => selectedLevel = v);
                        },
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: departmentController,
                        decoration: const InputDecoration(
                          labelText: 'Département',
                          prefixIcon: Icon(Icons.business_outlined),
                        ),
                        validator: (v) => v == null || v.trim().isEmpty ? 'Requis' : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: studentCountController,
                        decoration: const InputDecoration(
                          labelText: "Nombre d'étudiants",
                          prefixIcon: Icon(Icons.people_outline),
                        ),
                        keyboardType: TextInputType.number,
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) return 'Requis';
                          if (int.tryParse(v.trim()) == null) return 'Nombre invalide';
                          return null;
                        },
                      ),
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
                        'name': nameController.text.trim(),
                        'code': codeController.text.trim(),
                        'level': selectedLevel,
                        'department': departmentController.text.trim(),
                        'studentCount': int.parse(studentCountController.text.trim()),
                        'isActive': isActive,
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

    if (result != null) {
      final data = UniversityGroup(
        id: group?.id ?? '',
        name: result['name'],
        moduleName: result['code'],
        levelName: result['level'],
        studentCount: result['studentCount'],
        isActive: result['isActive'],
      );
      if (isEditing) {
        await ref.read(adminGroupsProvider.notifier).update(data);
      } else {
        await ref.read(adminGroupsProvider.notifier).create(data);
      }
    }
  }

  Future<void> _confirmDelete(UniversityGroup group) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirmer la suppression'),
        content: Text('Voulez-vous vraiment supprimer le groupe ${group.name} ?'),
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

    if (confirmed == true) {
      await ref.read(adminGroupsProvider.notifier).delete(group.id);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(adminGroupsProvider);
    final filtered = _filter(state.data, _searchController.text.trim());

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
                    hintText: 'Rechercher par nom, code ou département...',
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
                onPressed: () => _showGroupDialog(),
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
          child: _buildBody(context, state, filtered),
        ),
      ],
    );
  }

  Widget _buildBody(BuildContext context, AdminDataState<UniversityGroup> state, List<UniversityGroup> filtered) {
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
              const Text('Erreur', style: AppTextStyles.headingMedium, textAlign: TextAlign.center),
              const SizedBox(height: 8),
              Text(
                state.error!,
                style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed: () => ref.read(adminGroupsProvider.notifier).clearError(),
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Réessayer'),
              ),
            ],
          ),
        ),
      );
    }

    if (filtered.isEmpty) {
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
                  _searchController.text.isEmpty ? Icons.group_outlined : Icons.search_off_rounded,
                  size: 40,
                  color: AppColors.primary.withAlpha(128),
                ),
              ),
              const SizedBox(height: 20),
              Text(
                _searchController.text.isEmpty ? 'Aucun groupe' : 'Aucun résultat',
                style: AppTextStyles.headingSmall,
              ),
              const SizedBox(height: 8),
              Text(
                _searchController.text.isEmpty
                    ? 'Commencez par ajouter un groupe'
                    : 'Aucun groupe ne correspond à votre recherche',
                style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(adminGroupsProvider);
      },
      child: ListView.builder(
        padding: EdgeInsets.symmetric(
          horizontal: context.isMobile ? 16 : 32,
          vertical: 8,
        ),
        itemCount: filtered.length,
        itemBuilder: (context, index) {
          final group = filtered[index];
          return _GroupTile(
            group: group,
            onTap: () => _showGroupDialog(group: group),
            onDelete: () => _confirmDelete(group),
          );
        },
      ),
    );
  }
}

class _GroupTile extends StatelessWidget {
  const _GroupTile({
    required this.group,
    required this.onTap,
    required this.onDelete,
  });

  final UniversityGroup group;
  final VoidCallback onTap;
  final VoidCallback onDelete;

  Color _levelColor() {
    switch (group.levelName) {
      case 'M1':
      case 'M2':
        return AppColors.roleProfessor;
      case 'L3':
        return AppColors.warning;
      default:
        return AppColors.primary;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dismissible(
      key: ValueKey(group.id),
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
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: _levelColor().withAlpha(20),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                    child: Text(
                      group.moduleName.isNotEmpty ? group.moduleName.substring(0, 1).toUpperCase() : 'G',
                      style: TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: _levelColor(),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        group.name,
                        style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.w600),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${group.moduleName} · ${group.levelName}',
                        style: AppTextStyles.caption,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          const Icon(Icons.school_outlined, size: 12, color: AppColors.textSecondary),
                          const SizedBox(width: 3),
                          Text(
                            group.levelName,
                            style: AppTextStyles.caption.copyWith(fontSize: 10),
                          ),
                          const SizedBox(width: 10),
                          const Icon(Icons.people_outline, size: 12, color: AppColors.textSecondary),
                          const SizedBox(width: 3),
                          Text(
                            '${group.studentCount}',
                            style: AppTextStyles.caption.copyWith(fontSize: 10),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(
                    color: group.isActive ? AppColors.success : AppColors.textSecondary,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 4),
                PopupMenuButton<String>(
                  onSelected: (v) {
                    if (v == 'edit') onTap();
                    if (v == 'delete') onDelete();
                  },
                  itemBuilder: (ctx) => [
                    const PopupMenuItem(
                      value: 'edit',
                      child: ListTile(
                        leading: Icon(Icons.edit_rounded, size: 20),
                        title: Text('Modifier'),
                        dense: true,
                        contentPadding: EdgeInsets.zero,
                      ),
                    ),
                    const PopupMenuItem(
                      value: 'delete',
                      child: ListTile(
                        leading: Icon(Icons.delete_rounded, size: 20, color: AppColors.danger),
                        title: Text('Supprimer', style: TextStyle(color: AppColors.danger)),
                        dense: true,
                        contentPadding: EdgeInsets.zero,
                      ),
                    ),
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
