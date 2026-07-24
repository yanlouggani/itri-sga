import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/colors.dart';
import '../../../../core/theme/text_styles.dart';
import '../../../../core/utils/extensions.dart';
import '../../../../shared/providers/data_state.dart';
import '../../data/models/university_room.dart';
import '../../providers/admin_rooms_provider.dart';

class AdminRoomsPage extends ConsumerStatefulWidget {
  const AdminRoomsPage({super.key});

  @override
  ConsumerState<AdminRoomsPage> createState() => _AdminRoomsPageState();
}

class _AdminRoomsPageState extends ConsumerState<AdminRoomsPage> {
  final _searchController = TextEditingController();

  List<UniversityRoom> _filter(List<UniversityRoom> rooms, String query) {
    if (query.isEmpty) return rooms;
    final q = query.toLowerCase();
    return rooms.where((r) =>
      r.name.toLowerCase().contains(q) ||
      r.code.toLowerCase().contains(q) ||
      r.building.toLowerCase().contains(q)
    ).toList();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _showRoomDialog({UniversityRoom? room}) async {
    final nameController = TextEditingController(text: room?.name ?? '');
    final codeController = TextEditingController(text: room?.code ?? '');
    final buildingController = TextEditingController(text: room?.building ?? '');
    final capacityController = TextEditingController(
      text: room != null ? room.capacity.toString() : '',
    );
    final floorController = TextEditingController(
      text: room != null ? room.floor.toString() : '',
    );
    final isEditing = room != null;
    bool hasProjector = room?.hasProjector ?? false;
    bool hasComputers = room?.hasComputers ?? false;
    bool isActive = room?.isActive ?? true;
    final formKey = GlobalKey<FormState>();

    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setDialogState) {
            return AlertDialog(
              title: Text(isEditing ? "Modifier la salle" : 'Ajouter une salle'),
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
                          prefixIcon: Icon(Icons.meeting_room_outlined),
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
                      TextFormField(
                        controller: buildingController,
                        decoration: const InputDecoration(
                          labelText: 'Bâtiment',
                          prefixIcon: Icon(Icons.business_outlined),
                        ),
                        validator: (v) => v == null || v.trim().isEmpty ? 'Requis' : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: capacityController,
                        decoration: const InputDecoration(
                          labelText: 'Capacité',
                          prefixIcon: Icon(Icons.people_outline),
                        ),
                        keyboardType: TextInputType.number,
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) return 'Requis';
                          final n = int.tryParse(v);
                          if (n == null || n <= 0) return 'Nombre valide requis';
                          return null;
                        },
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: floorController,
                        decoration: const InputDecoration(
                          labelText: 'Étage',
                          prefixIcon: Icon(Icons.stairs_outlined),
                        ),
                        keyboardType: TextInputType.number,
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) return 'Requis';
                          if (int.tryParse(v) == null) return 'Nombre valide requis';
                          return null;
                        },
                      ),
                      const SizedBox(height: 8),
                      SwitchListTile(
                        title: const Text('Projecteur'),
                        subtitle: const Text('Équipé d\'un projecteur'),
                        value: hasProjector,
                        onChanged: (v) => setDialogState(() => hasProjector = v),
                        secondary: Icon(
                          Icons.videocam_outlined,
                          color: hasProjector ? AppColors.primary : AppColors.textSecondary,
                        ),
                        contentPadding: EdgeInsets.zero,
                      ),
                      SwitchListTile(
                        title: const Text('Ordinateurs'),
                        subtitle: const Text('Équipé d\'ordinateurs'),
                        value: hasComputers,
                        onChanged: (v) => setDialogState(() => hasComputers = v),
                        secondary: Icon(
                          Icons.computer_outlined,
                          color: hasComputers ? AppColors.primary : AppColors.textSecondary,
                        ),
                        contentPadding: EdgeInsets.zero,
                      ),
                      SwitchListTile(
                        title: const Text('Active'),
                        subtitle: const Text('Salle disponible pour les réservations'),
                        value: isActive,
                        onChanged: (v) => setDialogState(() => isActive = v),
                        secondary: Icon(
                          Icons.check_circle_outline,
                          color: isActive ? AppColors.success : AppColors.textSecondary,
                        ),
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
                        'code': codeController.text.trim().toUpperCase(),
                        'building': buildingController.text.trim(),
                        'capacity': int.parse(capacityController.text.trim()),
                        'floor': int.parse(floorController.text.trim()),
                        'hasProjector': hasProjector,
                        'hasComputers': hasComputers,
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
      final notifier = ref.read(adminRoomsProvider.notifier);
      if (isEditing) {
        await notifier.update(room.copyWith(
          name: result['name'],
          code: result['code'],
          building: result['building'],
          capacity: result['capacity'],
          floor: result['floor'],
          hasProjector: result['hasProjector'],
          hasComputers: result['hasComputers'],
          isActive: result['isActive'],
        ));
      } else {
        await notifier.create(UniversityRoom(
          id: '',
          name: result['name'],
          code: result['code'],
          building: result['building'],
          capacity: result['capacity'],
          floor: result['floor'],
          hasProjector: result['hasProjector'],
          hasComputers: result['hasComputers'],
          isActive: result['isActive'],
        ));
      }
    }
  }

  Future<void> _confirmDelete(UniversityRoom room) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirmer la suppression'),
        content: Text("Voulez-vous vraiment supprimer la salle ${room.name} (${room.code}) ?"),
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
      await ref.read(adminRoomsProvider.notifier).delete(room.id);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(adminRoomsProvider);
    final rooms = _filter(state.data, _searchController.text.trim());

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
                    hintText: 'Rechercher par nom, code ou bâtiment...',
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
                onPressed: () => _showRoomDialog(),
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
        Expanded(child: _buildBody(context, state, rooms)),
      ],
    );
  }

  Widget _buildBody(
    BuildContext context,
    AdminDataState<UniversityRoom> state,
    List<UniversityRoom> rooms,
  ) {
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
                onPressed: () => ref.invalidate(adminRoomsProvider),
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Réessayer'),
              ),
            ],
          ),
        ),
      );
    }

    if (rooms.isEmpty) {
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
                  _searchController.text.isEmpty
                      ? Icons.meeting_room_outlined
                      : Icons.search_off_rounded,
                  size: 40,
                  color: AppColors.primary.withAlpha(128),
                ),
              ),
              const SizedBox(height: 20),
              Text(
                _searchController.text.isEmpty ? 'Aucune salle' : 'Aucun résultat',
                style: AppTextStyles.headingSmall,
              ),
              const SizedBox(height: 8),
              Text(
                _searchController.text.isEmpty
                    ? 'Commencez par ajouter une salle'
                    : 'Aucune salle ne correspond à votre recherche',
                style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(adminRoomsProvider),
      child: ListView.builder(
        padding: EdgeInsets.symmetric(
          horizontal: context.isMobile ? 16 : 32,
          vertical: 8,
        ),
        itemCount: rooms.length,
        itemBuilder: (context, index) {
          final room = rooms[index];
          return _RoomTile(
            room: room,
            onTap: () => _showRoomDialog(room: room),
            onDelete: () => _confirmDelete(room),
          );
        },
      ),
    );
  }
}

class _RoomTile extends StatelessWidget {
  final UniversityRoom room;
  final VoidCallback onTap;
  final VoidCallback onDelete;

  const _RoomTile({
    required this.room,
    required this.onTap,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Dismissible(
      key: ValueKey(room.id),
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
                  backgroundColor: AppColors.primary.withAlpha(20),
                  child: Text(
                    room.code.length >= 2 ? room.code.substring(0, 2).toUpperCase() : room.code.toUpperCase(),
                    style: const TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primary,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              room.name,
                              style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.w600),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withAlpha(15),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              room.code,
                              style: const TextStyle(
                                fontFamily: 'Inter',
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          _InfoChip(icon: Icons.business_outlined, label: room.building),
                          const SizedBox(width: 8),
                          _InfoChip(
                            icon: Icons.stairs_outlined,
                            label: 'Étage ${room.floor}',
                          ),
                          const SizedBox(width: 8),
                          _InfoChip(
                            icon: Icons.people_outline,
                            label: '${room.capacity}',
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          _AmenityBadge(
                            icon: Icons.videocam_outlined,
                            active: room.hasProjector,
                            label: 'Projecteur',
                          ),
                          const SizedBox(width: 8),
                          _AmenityBadge(
                            icon: Icons.computer_outlined,
                            active: room.hasComputers,
                            label: 'Ordinateurs',
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
                    color: room.isActive ? AppColors.success : AppColors.textSecondary,
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

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String label;

  const _InfoChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 13, color: AppColors.textSecondary),
        const SizedBox(width: 3),
        Text(
          label,
          style: AppTextStyles.caption,
        ),
      ],
    );
  }
}

class _AmenityBadge extends StatelessWidget {
  final IconData icon;
  final bool active;
  final String label;

  const _AmenityBadge({
    required this.icon,
    required this.active,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    final color = active ? AppColors.success : AppColors.textSecondary;
    final bgColor = active ? AppColors.success.withAlpha(15) : AppColors.textSecondary.withAlpha(10);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 3),
          Text(
            label,
            style: TextStyle(
              fontFamily: 'Inter',
              fontSize: 10,
              fontWeight: FontWeight.w500,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
