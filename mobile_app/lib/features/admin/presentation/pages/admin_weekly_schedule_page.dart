import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/colors.dart';
import '../../../../core/theme/text_styles.dart';
import '../../../../core/utils/extensions.dart';
import '../../../../shared/providers/data_state.dart';
import '../../../auth/data/models/user.dart';
import '../../data/admin_repository.dart';
import '../../data/models/weekly_schedule_entry.dart';
import '../../providers/admin_weekly_schedule_provider.dart';

class AdminWeeklySchedulePage extends ConsumerStatefulWidget {
  const AdminWeeklySchedulePage({super.key});

  @override
  ConsumerState<AdminWeeklySchedulePage> createState() => _AdminWeeklySchedulePageState();
}

class _AdminWeeklySchedulePageState extends ConsumerState<AdminWeeklySchedulePage> {
  static const _dayHeaders = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  Future<WeeklyScheduleEntry?> _showEntryDialog({WeeklyScheduleEntry? entry}) async {
    final isEditing = entry != null;
    final repo = ref.read(adminRepositoryProvider);

    List<({String id, String name})> modules = [];
    List<({String id, String name})> groups = [];
    List<({String id, String name})> rooms = [];
    List<AppUser> professors = [];
    try {
      modules = (await repo.getModules()).map((m) => (id: m.id, name: m.name)).toList();
      groups = (await repo.getGroups()).map((g) => (id: g.id, name: g.name)).toList();
      rooms = (await repo.getRooms()).map((r) => (id: r.id, name: '${r.name} (${r.code})')).toList();
      professors = await repo.getProfessors();
    } catch (_) {}

    final e = entry;
    int selectedDay = e?.dayOfWeek ?? 1;
    String selectedStart = e?.startTime ?? '08:00';
    String selectedEnd = e?.endTime ?? '10:00';
    String? selectedModuleId = (e != null && e.moduleId.isNotEmpty) ? e.moduleId : null;
    String? selectedProfessorId = (e != null && e.professorId.isNotEmpty) ? e.professorId : null;
    String? selectedGroupId = (e != null && e.groupId.isNotEmpty) ? e.groupId : null;
    String? selectedRoomId = (e != null && e.roomId.isNotEmpty) ? e.roomId : null;
    String selectedType = entry?.sessionType ?? 'CM';
    bool isActive = entry?.isActive ?? true;
    DateTime selectedValidFrom = e?.validFrom ?? DateTime.now();
    final formKey = GlobalKey<FormState>();

    final times = List.generate(16, (i) {
      final h = (8 + i).toString().padLeft(2, '0');
      return '$h:00';
    });

    final result = await showDialog<WeeklyScheduleEntry>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setDialogState) {
            return AlertDialog(
              title: Text(isEditing ? "Modifier l'entrée" : 'Ajouter une entrée'),
              content: SizedBox(
                width: 400,
                child: Form(
                  key: formKey,
                  child: SingleChildScrollView(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        DropdownButtonFormField<int>(
                          value: selectedDay,
                          decoration: const InputDecoration(
                            labelText: 'Jour',
                            prefixIcon: Icon(Icons.calendar_view_week_rounded),
                            isDense: true,
                          ),
                          items: List.generate(7, (i) => DropdownMenuItem(
                            value: i,
                            child: Text(_dayHeaders[i]),
                          )),
                          onChanged: (v) {
                            if (v != null) setDialogState(() => selectedDay = v);
                          },
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: DropdownButtonFormField<String>(
                                value: selectedStart,
                                decoration: const InputDecoration(
                                  labelText: 'Début',
                                  prefixIcon: Icon(Icons.schedule_rounded),
                                  isDense: true,
                                ),
                                items: times.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                                onChanged: (v) {
                                  if (v != null) setDialogState(() => selectedStart = v);
                                },
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: DropdownButtonFormField<String>(
                                value: selectedEnd,
                                decoration: const InputDecoration(
                                  labelText: 'Fin',
                                  prefixIcon: Icon(Icons.schedule_rounded),
                                  isDense: true,
                                ),
                                items: times.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                                onChanged: (v) {
                                  if (v != null) setDialogState(() => selectedEnd = v);
                                },
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        DropdownButtonFormField<String>(
                          value: selectedModuleId,
                          decoration: const InputDecoration(
                            labelText: 'Module',
                            prefixIcon: Icon(Icons.menu_book_rounded),
                            isDense: true,
                          ),
                          items: modules.map((m) => DropdownMenuItem(
                            value: m.id,
                            child: Text(m.name, overflow: TextOverflow.ellipsis),
                          )).toList(),
                          onChanged: (v) => setDialogState(() => selectedModuleId = v),
                          validator: (v) => v == null ? 'Requis' : null,
                        ),
                        const SizedBox(height: 12),
                        DropdownButtonFormField<String>(
                          value: selectedProfessorId,
                          decoration: const InputDecoration(
                            labelText: 'Professeur',
                            prefixIcon: Icon(Icons.person_rounded),
                            isDense: true,
                          ),
                          items: professors.map((p) => DropdownMenuItem(
                            value: p.id,
                            child: Text(p.fullName, overflow: TextOverflow.ellipsis),
                          )).toList(),
                          onChanged: (v) => setDialogState(() => selectedProfessorId = v),
                          validator: (v) => v == null ? 'Requis' : null,
                        ),
                        const SizedBox(height: 12),
                        DropdownButtonFormField<String>(
                          value: selectedGroupId,
                          decoration: const InputDecoration(
                            labelText: 'Groupe',
                            prefixIcon: Icon(Icons.group_rounded),
                            isDense: true,
                          ),
                          items: groups.map((g) => DropdownMenuItem(
                            value: g.id,
                            child: Text(g.name, overflow: TextOverflow.ellipsis),
                          )).toList(),
                          onChanged: (v) => setDialogState(() => selectedGroupId = v),
                          validator: (v) => v == null ? 'Requis' : null,
                        ),
                        const SizedBox(height: 12),
                        DropdownButtonFormField<String>(
                          value: selectedRoomId,
                          decoration: const InputDecoration(
                            labelText: 'Salle',
                            prefixIcon: Icon(Icons.meeting_room_rounded),
                            isDense: true,
                          ),
                          items: rooms.map((r) => DropdownMenuItem(
                            value: r.id,
                            child: Text(r.name, overflow: TextOverflow.ellipsis),
                          )).toList(),
                          onChanged: (v) => setDialogState(() => selectedRoomId = v),
                          validator: (v) => v == null ? 'Requis' : null,
                        ),
                        const SizedBox(height: 12),
                        DropdownButtonFormField<String>(
                          value: selectedType,
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
                        InkWell(
                          onTap: () async {
                            final picked = await showDatePicker(
                              context: ctx,
                              initialDate: selectedValidFrom,
                              firstDate: DateTime(2020),
                              lastDate: DateTime(2035),
                              helpText: 'Choisir la date d\'effet',
                            );
                            if (picked != null) {
                              setDialogState(() => selectedValidFrom = picked);
                            }
                          },
                          child: InputDecorator(
                            decoration: const InputDecoration(
                              labelText: 'Date d\'effet',
                              prefixIcon: Icon(Icons.calendar_today_rounded),
                              isDense: true,
                            ),
                            child: Text(
                              '${selectedValidFrom.day.toString().padLeft(2, '0')}/${selectedValidFrom.month.toString().padLeft(2, '0')}/${selectedValidFrom.year}',
                            ),
                          ),
                        ),
                        const SizedBox(height: 4),
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
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(ctx).pop(),
                  child: const Text('Annuler'),
                ),
                FilledButton(
                  onPressed: () async {
                    if (!formKey.currentState!.validate()) return;
                    final newEntry = WeeklyScheduleEntry(
                      id: '',
                      dayOfWeek: selectedDay,
                      startTime: selectedStart,
                      endTime: selectedEnd,
                      moduleId: selectedModuleId!,
                      professorId: selectedProfessorId!,
                      groupId: selectedGroupId!,
                      roomId: selectedRoomId!,
                      sessionType: selectedType,
                      isActive: isActive,
                      validFrom: selectedValidFrom,
                    );
                    Navigator.of(ctx).pop(newEntry);
                  },
                  child: Text(isEditing ? 'Créer version' : 'Créer'),
                ),
              ],
            );
          },
        );
      },
    );
    return result;
  }

  Future<void> _confirmDelete(WeeklyScheduleEntry entry) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirmer la suppression'),
        content: Text('Supprimer cette entrée du ${entry.dayFullLabel} (${entry.startTime}-${entry.endTime}) ?'),
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
      await ref.read(adminWeeklyScheduleProvider.notifier).delete(entry.id);
    }
  }

  Future<void> _onAddOrEdit({WeeklyScheduleEntry? entry}) async {
    final result = await _showEntryDialog(entry: entry);
    if (result == null || !mounted) return;
    final notifier = ref.read(adminWeeklyScheduleProvider.notifier);
    if (entry != null) {
      await notifier.update(entry.id, result, validFrom: result.validFrom);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: const Text('Nouvelle version créée'), backgroundColor: AppColors.success),
        );
      }
    } else {
      await notifier.create(result);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: const Text('Créneau ajouté'), backgroundColor: AppColors.success),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(adminWeeklyScheduleProvider);

    ref.listen(adminWeeklyScheduleProvider, (prev, next) {
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
              Expanded(
                child: Text('Emploi du temps fixe', style: AppTextStyles.headingMedium),
              ),
              FilledButton.icon(
                onPressed: () => _onAddOrEdit(),
                icon: const Icon(Icons.add_rounded, size: 20),
                label: Text(
                  context.isMobile ? '' : 'Ajouter',
                  style: AppTextStyles.buttonMedium,
                ),
              ),
            ],
          ),
        ),
        Expanded(child: _buildBody(state)),
      ],
    );
  }

  Widget _buildBody(AdminDataState<WeeklyScheduleEntry> state) {
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
              Text(state.error!, style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary), textAlign: TextAlign.center),
              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed: () => ref.refresh(adminWeeklyScheduleProvider),
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Réessayer'),
              ),
            ],
          ),
        ),
      );
    }

    if (state.data.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 80, height: 80,
              decoration: BoxDecoration(
                color: AppColors.primary.withAlpha(15),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Icon(Icons.calendar_month_rounded, size: 40, color: AppColors.primary.withAlpha(128)),
            ),
            const SizedBox(height: 20),
            Text('Aucune entrée', style: AppTextStyles.headingSmall),
            const SizedBox(height: 8),
            Text("Ajoutez des créneaux à l'emploi du temps fixe", style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary)),
          ],
        ),
      );
    }

    if (context.isMobile) {
      return RefreshIndicator(
        onRefresh: () { ref.invalidate(adminWeeklyScheduleProvider); return Future.delayed(const Duration(milliseconds: 500)); },
        child: ListView.builder(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          itemCount: state.data.length,
          itemBuilder: (context, index) => _EntryCard(
            entry: state.data[index],
            onTap: () => _onAddOrEdit(entry: state.data[index]),
            onDelete: () => _confirmDelete(state.data[index]),
          ),
        ),
      );
    }

    return _buildDesktopView(state.data);
  }

  Widget _buildDesktopView(List<WeeklyScheduleEntry> entries) {
    final grouped = <int, List<WeeklyScheduleEntry>>{};
    for (final e in entries) {
      grouped.putIfAbsent(e.dayOfWeek, () => []).add(e);
    }
    for (final day in grouped.keys) {
      grouped[day]!.sort((a, b) => a.startTime.compareTo(b.startTime));
    }

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 8),
      children: List.generate(7, (day) {
        final dayEntries = grouped[day] ?? [];
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: ExpansionTile(
            initiallyExpanded: dayEntries.isNotEmpty,
            leading: Container(
              width: 48, height: 48,
              decoration: BoxDecoration(
                color: AppColors.primary.withAlpha(20),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Center(
                child: Text(
                  _dayHeaders[day],
                  style: AppTextStyles.labelLarge.copyWith(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
            title: Text(
              ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'][day],
              style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.w600),
            ),
            subtitle: Text('${dayEntries.length} créneau(x)', style: AppTextStyles.caption),
            children: dayEntries.isEmpty
                ? [
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Text('Aucun créneau', style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary)),
                    ),
                  ]
                : dayEntries.map((e) => _EntryCard(
                    entry: e,
                    onTap: () => _onAddOrEdit(entry: e),
                    onDelete: () => _confirmDelete(e),
                  )).toList(),
          ),
        );
      }),
    );
  }
}

class _EntryCard extends StatelessWidget {
  final WeeklyScheduleEntry entry;
  final VoidCallback onTap;
  final VoidCallback onDelete;

  const _EntryCard({
    required this.entry,
    required this.onTap,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Dismissible(
      key: ValueKey(entry.id),
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
                  width: 60,
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  decoration: BoxDecoration(
                    color: _typeColor.withAlpha(20),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Column(
                    children: [
                      Text(entry.startTime, style: AppTextStyles.caption.copyWith(
                        fontWeight: FontWeight.w700, color: _typeColor,
                      )),
                      Text(entry.endTime, style: AppTextStyles.caption.copyWith(
                        fontSize: 11, color: _typeColor.withAlpha(180),
                      )),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: _typeColor.withAlpha(20),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(entry.sessionType, style: AppTextStyles.caption.copyWith(
                              fontSize: 11, fontWeight: FontWeight.w700, color: _typeColor,
                            )),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(entry.moduleName, style: AppTextStyles.bodyMedium.copyWith(
                              fontWeight: FontWeight.w600,
                            ), maxLines: 1, overflow: TextOverflow.ellipsis),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text('${entry.professorName} • ${entry.groupName} • ${entry.roomName}',
                          style: AppTextStyles.caption, maxLines: 1, overflow: TextOverflow.ellipsis),
                      const SizedBox(height: 2),
                      Text(
                        _validityLabel(entry),
                        style: AppTextStyles.caption.copyWith(fontSize: 10, color: _validityColor(entry)),
                      ),
                    ],
                  ),
                ),
                if (!entry.isActive)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.orange.withAlpha(20),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text('Inactif', style: AppTextStyles.caption.copyWith(
                      fontSize: 11, color: Colors.orange,
                    )),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Color get _typeColor {
    switch (entry.sessionType) {
      case 'CM': return AppColors.primary;
      case 'TD': return AppColors.success;
      case 'TP': return Colors.orange;
      default: return AppColors.textSecondary;
    }
  }

  String _validityLabel(WeeklyScheduleEntry e) {
    final from = e.validFrom != null
        ? '${e.validFrom!.day.toString().padLeft(2, '0')}/${e.validFrom!.month.toString().padLeft(2, '0')}/${e.validFrom!.year}'
        : '?';
    final to = e.validTo != null
        ? '${e.validTo!.day.toString().padLeft(2, '0')}/${e.validTo!.month.toString().padLeft(2, '0')}/${e.validTo!.year}'
        : '∞';
    return 'Valable du $from au $to';
  }

  Color _validityColor(WeeklyScheduleEntry e) {
    if (e.validTo != null && DateTime.now().isAfter(e.validTo!)) return AppColors.danger;
    if (e.validFrom != null && DateTime.now().isBefore(e.validFrom!)) return Colors.orange;
    return AppColors.textSecondary.withAlpha(150);
  }
}
