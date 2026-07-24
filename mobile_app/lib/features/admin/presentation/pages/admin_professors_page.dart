import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/colors.dart';
import '../../../../core/theme/text_styles.dart';
import '../../../../core/utils/extensions.dart';
import '../../../auth/data/models/user.dart';
import '../../data/admin_repository.dart';
import '../../data/models/professor_assignment.dart';
import '../../providers/admin_modules_provider.dart';
import '../../providers/admin_professor_assignments_provider.dart';

class AdminProfessorsPage extends ConsumerStatefulWidget {
  const AdminProfessorsPage({super.key});

  @override
  ConsumerState<AdminProfessorsPage> createState() => _AdminProfessorsPageState();
}

class _AdminProfessorsPageState extends ConsumerState<AdminProfessorsPage> {
  List<AppUser> _professors = [];
  bool _loadingProfessors = true;

  @override
  void initState() {
    super.initState();
    _loadProfessors();
  }

  Future<void> _loadProfessors() async {
    try {
      final repo = ref.read(adminRepositoryProvider);
      final users = await repo.getProfessors();
      if (mounted) setState(() { _professors = users; _loadingProfessors = false; });
    } catch (_) {
      if (mounted) setState(() => _loadingProfessors = false);
    }
  }

  Future<void> _showAssignmentDialog(AppUser professor) async {
    final modulesState = ref.read(adminModulesProvider);
    final assignments = ref.read(adminProfessorAssignmentsProvider).data
        .where((a) => a.professorId == professor.id)
        .toList();

    String? selectedModuleId;
    String selectedType = 'CM';

    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setDialogState) {
            return AlertDialog(
              title: Text('Affectations — ${professor.fullName}'),
              content: SizedBox(
                width: 400,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Modules assignés :', style: AppTextStyles.labelLarge),
                    const SizedBox(height: 8),
                    if (assignments.isEmpty)
                      const Padding(
                        padding: EdgeInsets.all(8),
                        child: Text('Aucune affectation',
                            style: TextStyle(color: AppColors.textSecondary)),
                      )
                    else
                      ...assignments.map((a) => Card(
                        margin: const EdgeInsets.only(bottom: 4),
                        child: ListTile(
                          dense: true,
                          title: Text('${a.moduleName} (${a.sessionType})',
                              style: AppTextStyles.bodySmall),
                          trailing: IconButton(
                            icon: const Icon(Icons.delete_rounded, size: 18,
                                color: AppColors.danger),
                            onPressed: () {
                              ref.read(adminProfessorAssignmentsProvider.notifier)
                                  .delete(professor.id, a.moduleId, a.sessionType);
                              setDialogState(() {});
                            },
                          ),
                        ),
                      )),
                    const Divider(height: 24),
                    Text('Ajouter une affectation :', style: AppTextStyles.labelLarge),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      decoration: const InputDecoration(
                        labelText: 'Module',
                        prefixIcon: Icon(Icons.menu_book_rounded),
                        isDense: true,
                      ),
                      items: modulesState.data.map((m) => DropdownMenuItem(
                        value: m.id,
                        child: Text(m.name, overflow: TextOverflow.ellipsis),
                      )).toList(),
                      onChanged: (v) => setDialogState(() => selectedModuleId = v),
                      validator: (v) => v == null ? 'Requis' : null,
                    ),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      value: 'CM',
                      decoration: const InputDecoration(
                        labelText: 'Type',
                        prefixIcon: Icon(Icons.category_rounded),
                        isDense: true,
                      ),
                      items: const [
                        DropdownMenuItem(value: 'CM', child: Text('CM')),
                        DropdownMenuItem(value: 'TD', child: Text('TD')),
                        DropdownMenuItem(value: 'TP', child: Text('TP')),
                      ],
                      onChanged: (v) {
                        if (v != null) setDialogState(() => selectedType = v);
                      },
                    ),
                    const SizedBox(height: 12),
                    FilledButton.icon(
                      onPressed: () {
                        if (selectedModuleId == null) return;
                        ref.read(adminProfessorAssignmentsProvider.notifier).create(
                          ProfessorAssignment(
                            professorId: professor.id,
                            moduleId: selectedModuleId!,
                            sessionType: selectedType,
                          ),
                        );
                        setDialogState(() {});
                      },
                      icon: const Icon(Icons.add_rounded, size: 18),
                      label: const Text('Ajouter'),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(ctx).pop(),
                  child: const Text('Fermer'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final assignmentsState = ref.watch(adminProfessorAssignmentsProvider);
    ref.listen(adminProfessorAssignmentsProvider, (prev, next) {
      if (next.error != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: ${next.error}'), backgroundColor: AppColors.danger),
        );
      }
    });

    return Column(
      children: [
        Padding(
          padding: EdgeInsets.fromLTRB(
            context.isMobile ? 16 : 32,
            context.isMobile ? 16 : 24,
            context.isMobile ? 16 : 32,
            12,
          ),
          child: Row(
            children: [
              Text('Affectations des professeurs', style: AppTextStyles.headingMedium),
            ],
          ),
        ),
        Expanded(
          child: _loadingProfessors
              ? const Center(child: CircularProgressIndicator())
              : RefreshIndicator(
                  onRefresh: _loadProfessors,
                  child: ListView.builder(
                    padding: EdgeInsets.symmetric(
                      horizontal: context.isMobile ? 16 : 32,
                    ),
                    itemCount: _professors.length,
                    itemBuilder: (context, index) {
                      final prof = _professors[index];
                      final profAssignments = assignmentsState.data
                          .where((a) => a.professorId == prof.id)
                          .toList();
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: InkWell(
                          onTap: () => _showAssignmentDialog(prof),
                          borderRadius: BorderRadius.circular(12),
                          child: Padding(
                            padding: const EdgeInsets.all(14),
                            child: Row(
                              children: [
                                CircleAvatar(
                                  radius: 22,
                                  backgroundColor: AppColors.roleProfessor.withAlpha(30),
                                  child: Text(prof.initials,
                                      style: TextStyle(color: AppColors.roleProfessor)),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(prof.fullName,
                                          style: AppTextStyles.bodyMedium
                                              .copyWith(fontWeight: FontWeight.w600)),
                                      const SizedBox(height: 4),
                                      Text(
                                        profAssignments.isEmpty
                                            ? 'Aucun module assigné'
                                            : profAssignments
                                                .map((a) => '${a.moduleName} (${a.sessionType})')
                                                .join(', '),
                                        style: AppTextStyles.caption,
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ],
                                  ),
                                ),
                                const Icon(Icons.chevron_right_rounded, size: 20,
                                    color: AppColors.textSecondary),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
        ),
      ],
    );
  }
}
