import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/colors.dart';
import '../../../../core/utils/extensions.dart';
import '../../../auth/data/models/user.dart';
import '../../data/admin_repository.dart';
import '../../data/models/university_module.dart';
import '../../data/models/university_group.dart';
import '../../data/models/university_room.dart';
import '../../providers/admin_modules_provider.dart';
import '../../providers/admin_groups_provider.dart';
import '../../providers/admin_rooms_provider.dart';

Future<void> showCreateSessionDialog(BuildContext context, WidgetRef ref) {
  return showDialog(
    context: context,
    barrierDismissible: false,
    builder: (ctx) => _CreateSessionDialog(),
  );
}

class _CreateSessionDialog extends ConsumerStatefulWidget {
  @override
  ConsumerState<_CreateSessionDialog> createState() => _CreateSessionDialogState();
}

class _CreateSessionDialogState extends ConsumerState<_CreateSessionDialog> {
  final _formKey = GlobalKey<FormState>();
  final _dateController = TextEditingController();
  final _startTimeController = TextEditingController();
  final _endTimeController = TextEditingController();
  final _sessionTypes = ['CM', 'TD', 'TP'];

  List<AppUser> _professors = [];
  bool _loadingProfessors = true;

  UniversityModule? _selectedModule;
  UniversityGroup? _selectedGroup;
  UniversityRoom? _selectedRoom;
  AppUser? _selectedProfessor;
  String _selectedSessionType = 'CM';
  DateTime? _selectedDate;
  String _selectedStartTime = '';
  String _selectedEndTime = '';

  @override
  void initState() {
    super.initState();
    _loadProfessors();
  }

  Future<void> _loadProfessors() async {
    try {
      final repo = ref.read(adminRepositoryProvider);
      final profs = await repo.getProfessors();
      if (mounted) setState(() { _professors = profs; _loadingProfessors = false; });
    } catch (_) {
      if (mounted) setState(() => _loadingProfessors = false);
    }
  }

  @override
  void dispose() {
    _dateController.dispose();
    _startTimeController.dispose();
    _endTimeController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? DateTime.now(),
      firstDate: DateTime.now().subtract(const Duration(days: 30)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      locale: const Locale('fr'),
    );
    if (picked != null) {
      setState(() {
        _selectedDate = picked;
        _dateController.text = '${picked.day}/${picked.month}/${picked.year}';
      });
    }
  }

  Future<void> _pickTime({required bool isStart}) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.now(),
    );
    if (picked != null) {
      final formatted = '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}';
      setState(() {
        if (isStart) {
          _selectedStartTime = formatted;
          _startTimeController.text = formatted;
        } else {
          _selectedEndTime = formatted;
          _endTimeController.text = formatted;
        }
      });
    }
  }

  Set<String> _compatibleGroupIds = {};

  void _onModuleChanged(String? id) async {
    final modules = ref.read(adminModulesProvider).data;
    final module = id != null ? modules.where((m) => m.id == id).firstOrNull : null;
    setState(() {
      _selectedModule = module;
      _selectedGroup = null;
    });
    if (module != null) {
      try {
        final repo = ref.read(adminRepositoryProvider);
        final ids = await repo.getModuleGroupIds(module.id);
        if (mounted) setState(() => _compatibleGroupIds = ids.toSet());
      } catch (_) {}
    } else {
      setState(() => _compatibleGroupIds = {});
    }
  }

  List<UniversityGroup> _compatibleGroups(List<UniversityGroup> allGroups) {
    if (_selectedModule == null) return allGroups;
    if (_compatibleGroupIds.isEmpty) return allGroups;
    return allGroups.where((g) => _compatibleGroupIds.contains(g.id)).toList();
  }

  // Group → student count for capacity validation
  int get _selectedGroupSize => _selectedGroup?.studentCount ?? 0;

  Future<String?> _save() async {
    if (_selectedDate == null || _selectedStartTime.isEmpty || _selectedEndTime.isEmpty) return null;
    if (_selectedModule == null || _selectedProfessor == null || _selectedRoom == null || _selectedGroup == null) return null;

    try {
      final repo = ref.read(adminRepositoryProvider);
      await repo.createSession(
        moduleId: _selectedModule!.id,
        professorId: _selectedProfessor!.id,
        groupId: _selectedGroup!.id,
        roomId: _selectedRoom!.id,
        sessionDate: _selectedDate!,
        startTime: _selectedStartTime,
        endTime: _selectedEndTime,
        status: 'scheduled',
      );
      return null;
    } catch (e) {
      return e.toString();
    }
  }

  @override
  Widget build(BuildContext context) {
    final modulesState = ref.watch(adminModulesProvider);
    final groupsState = ref.watch(adminGroupsProvider);
    final roomsState = ref.watch(adminRoomsProvider);

    final modules = modulesState.data;
    final allGroups = groupsState.data;
    final rooms = roomsState.data;

    final compatibleGroups = _compatibleGroups(allGroups);

    return AlertDialog(
      title: const Text('Nouvelle séance'),
      content: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: SizedBox(
            width: context.isMobile ? null : 450,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Module
                DropdownButtonFormField<String>(
                  decoration: const InputDecoration(
                    labelText: 'Module',
                    prefixIcon: Icon(Icons.menu_book_rounded),
                  ),
                  items: modules.map((m) => DropdownMenuItem(
                    value: m.id,
                    child: Text(m.name, overflow: TextOverflow.ellipsis),
                  )).toList(),
                  onChanged: _onModuleChanged,
                  validator: (v) => v == null ? 'Requis' : null,
                ),
                const SizedBox(height: 12),

                // Group (filtered by module)
                DropdownButtonFormField<String>(
                  value: _selectedGroup?.id,
                  decoration: const InputDecoration(
                    labelText: 'Groupe',
                    prefixIcon: Icon(Icons.group_outlined),
                  ),
                  items: [
                    const DropdownMenuItem(value: null, child: Text('Sélectionner un groupe')),
                    ...compatibleGroups.map((g) => DropdownMenuItem(
                      value: g.id,
                      child: Text('${g.name} (${g.moduleName}) — ${g.studentCount} étudiants'),
                    )),
                  ],
                  onChanged: (id) {
                    setState(() {
                      _selectedGroup = id != null ? allGroups.where((g) => g.id == id).firstOrNull : null;
                    });
                  },
                  validator: (v) => v == null ? 'Requis' : null,
                ),
                if (_selectedGroup != null && _selectedRoom != null && _selectedGroupSize > _selectedRoom!.capacity)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      'Capacité insuffisante : ${_selectedGroupSize} étudiants pour ${_selectedRoom!.capacity} places',
                      style: TextStyle(fontSize: 11, color: AppColors.danger),
                    ),
                  ),
                const SizedBox(height: 12),

                // Room
                DropdownButtonFormField<String>(
                  value: _selectedRoom?.id,
                  decoration: const InputDecoration(
                    labelText: 'Salle',
                    prefixIcon: Icon(Icons.meeting_room_rounded),
                  ),
                  items: rooms.map((r) => DropdownMenuItem(
                    value: r.id,
                    child: Text('${r.name} (${r.capacity} places)'),
                  )).toList(),
                  onChanged: (id) {
                    setState(() {
                      _selectedRoom = id != null ? rooms.where((r) => r.id == id).firstOrNull : null;
                    });
                  },
                  validator: (v) => v == null ? 'Requis' : null,
                ),
                const SizedBox(height: 12),

                // Professor
                _loadingProfessors
                    ? const LinearProgressIndicator()
                    : DropdownButtonFormField<String>(
                        value: _selectedProfessor?.id,
                        decoration: const InputDecoration(
                          labelText: 'Professeur',
                          prefixIcon: Icon(Icons.person_rounded),
                        ),
                        items: _professors.map((p) => DropdownMenuItem(
                          value: p.id,
                          child: Text(p.fullName),
                        )).toList(),
                        onChanged: (id) {
                          setState(() {
                            _selectedProfessor = id != null ? _professors.where((p) => p.id == id).firstOrNull : null;
                          });
                        },
                        validator: (v) => v == null ? 'Requis' : null,
                      ),
                const SizedBox(height: 12),

                // Session type
                DropdownButtonFormField<String>(
                  value: _selectedSessionType,
                  decoration: const InputDecoration(
                    labelText: 'Type',
                    prefixIcon: Icon(Icons.category_rounded),
                  ),
                  items: _sessionTypes.map((t) => DropdownMenuItem(
                    value: t,
                    child: Text(t),
                  )).toList(),
                  onChanged: (v) {
                    if (v != null) setState(() => _selectedSessionType = v);
                  },
                ),
                const SizedBox(height: 12),

                // Date
                TextFormField(
                  controller: _dateController,
                  decoration: const InputDecoration(
                    labelText: 'Date',
                    prefixIcon: Icon(Icons.calendar_today_rounded),
                  ),
                  readOnly: true,
                  onTap: _pickDate,
                  validator: (v) => _selectedDate == null ? 'Requis' : null,
                ),
                const SizedBox(height: 12),

                // Start/End time
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _startTimeController,
                        decoration: const InputDecoration(
                          labelText: 'Début',
                          prefixIcon: Icon(Icons.access_time_rounded),
                        ),
                        readOnly: true,
                        onTap: () => _pickTime(isStart: true),
                        validator: (v) => _selectedStartTime.isEmpty ? 'Requis' : null,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextFormField(
                        controller: _endTimeController,
                        decoration: const InputDecoration(
                          labelText: 'Fin',
                          prefixIcon: Icon(Icons.access_time_rounded),
                        ),
                        readOnly: true,
                        onTap: () => _pickTime(isStart: false),
                        validator: (v) => _selectedEndTime.isEmpty ? 'Requis' : null,
                      ),
                    ),
                  ],
                ),
                if (_selectedStartTime.isNotEmpty && _selectedEndTime.isNotEmpty && _selectedStartTime.compareTo(_selectedEndTime) >= 0)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      'L\'heure de fin doit être après l\'heure de début',
                      style: TextStyle(fontSize: 11, color: AppColors.danger),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Annuler'),
        ),
        FilledButton.icon(
          icon: const Icon(Icons.save_rounded, size: 18),
          label: const Text('Créer'),
          onPressed: () async {
            if (!_formKey.currentState!.validate()) return;
            if (_selectedStartTime.isNotEmpty && _selectedEndTime.isNotEmpty && _selectedStartTime.compareTo(_selectedEndTime) >= 0) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('L\'heure de fin doit être après l\'heure de début')),
              );
              return;
            }
            final error = await _save();
            if (error != null) {
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(error), backgroundColor: AppColors.danger),
                );
              }
            } else {
              if (context.mounted) {
                Navigator.of(context).pop();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Séance créée avec succès'), backgroundColor: AppColors.success),
                );
              }
            }
          },
        ),
      ],
    );
  }
}
