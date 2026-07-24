import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/colors.dart';
import '../../../../core/theme/text_styles.dart';
import '../../../../core/utils/extensions.dart';
import '../../../../shared/providers/data_state.dart';
import '../../data/models/university_module.dart';
import '../../providers/admin_modules_provider.dart';

class AdminModulesPage extends ConsumerStatefulWidget {
  const AdminModulesPage({super.key});

  @override
  ConsumerState<AdminModulesPage> createState() => _AdminModulesPageState();
}

class _AdminModulesPageState extends ConsumerState<AdminModulesPage> {
  final _searchController = TextEditingController();

  List<UniversityModule> _filter(List<UniversityModule> modules, String query) {
    if (query.isEmpty) return modules;
    final q = query.toLowerCase();
    return modules.where((m) =>
      m.name.toLowerCase().contains(q)
    ).toList();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _showModuleDialog({UniversityModule? module}) async {
    final isEditing = module != null;
    final nameController = TextEditingController(text: module?.name ?? '');
    bool isActive = module?.isActive ?? true;
    final formKey = GlobalKey<FormState>();

    final result = await showDialog<UniversityModule>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setDialogState) {
            return AlertDialog(
              title: Text(isEditing ? "Modifier le module" : 'Ajouter un module'),
              content: Form(
                key: formKey,
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      TextFormField(
                        controller: nameController,
                        decoration: const InputDecoration(
                          labelText: 'Nom du module',
                          prefixIcon: Icon(Icons.book_outlined),
                        ),
                        validator: (v) => v == null || v.trim().isEmpty ? 'Requis' : null,
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
                      final now = DateTime.now().millisecondsSinceEpoch.toString();
                      Navigator.of(ctx).pop(UniversityModule(
                        id: module?.id ?? now,
                        name: nameController.text.trim(),
                        isActive: isActive,
                      ));
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
        await ref.read(adminModulesProvider.notifier).update(result);
      } else {
        await ref.read(adminModulesProvider.notifier).create(result);
      }
    }
  }

  Future<void> _confirmDelete(UniversityModule module) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirmer la suppression'),
        content: Text('Voulez-vous vraiment supprimer le module "${module.name}" ?'),
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
      await ref.read(adminModulesProvider.notifier).delete(module.id);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(adminModulesProvider);
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
                    hintText: 'Rechercher par nom ou code...',
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
                onPressed: () => _showModuleDialog(),
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
        Expanded(child: _buildBody(state, filtered)),
      ],
    );
  }

  Widget _buildBody(AdminDataState<UniversityModule> state, List<UniversityModule> filtered) {
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
                onPressed: () => ref.refresh(adminModulesProvider),
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
                  _searchController.text.isEmpty
                      ? Icons.book_outlined
                      : Icons.search_off_rounded,
                  size: 40,
                  color: AppColors.primary.withAlpha(128),
                ),
              ),
              const SizedBox(height: 20),
              Text(
                _searchController.text.isEmpty ? 'Aucun module' : 'Aucun résultat',
                style: AppTextStyles.headingSmall,
              ),
              const SizedBox(height: 8),
              Text(
                _searchController.text.isEmpty
                    ? 'Commencez par ajouter un module'
                    : 'Aucun module ne correspond à votre recherche',
                style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () {
        ref.invalidate(adminModulesProvider);
        return Future.delayed(const Duration(milliseconds: 500));
      },
      child: ListView.builder(
        padding: EdgeInsets.symmetric(
          horizontal: context.isMobile ? 16 : 32,
          vertical: 8,
        ),
        itemCount: filtered.length,
        itemBuilder: (context, index) {
          final module = filtered[index];
          return _ModuleCard(
            module: module,
            onTap: () => _showModuleDialog(module: module),
            onDelete: () => _confirmDelete(module),
          );
        },
      ),
    );
  }
}

class _ModuleCard extends StatelessWidget {
  final UniversityModule module;
  final VoidCallback onTap;
  final VoidCallback onDelete;

  const _ModuleCard({
    required this.module,
    required this.onTap,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Dismissible(
      key: ValueKey(module.id),
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
                Expanded(
                  child: Text(
                    module.name,
                    style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.w600),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Container(
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(
                    color: module.isActive ? AppColors.success : AppColors.textSecondary,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  module.isActive ? 'Actif' : 'Inactif',
                  style: AppTextStyles.caption.copyWith(
                    color: module.isActive ? AppColors.success : AppColors.textSecondary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}


