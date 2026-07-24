# Documentation Admin (detaillee)

## Portee
- Dossier admin: lib/features/admin/**
- Dependances admin: routage, garde d'acces, layout principal, et state generique utilises par l'admin.
- Ce document est structure par fichier, avec classes, fonctions, et flux principaux.

---

## Routage et acces admin (dependances)

### lib/core/router/app_router.dart
- routerProvider (GoRouter)
  - Cree la config de routage globale, avec redirection via AuthRedirect.
  - ShellRoute pour encapsuler toutes les pages rolees (admin/professor/student) dans AppScaffold.
  - Routes admin:
    - /admin -> redirect /admin/dashboard
    - /admin/dashboard -> AdminDashboardPage
    - /admin/users -> AdminUsersPage
    - /admin/modules -> AdminModulesPage
    - /admin/rooms -> AdminRoomsPage
    - /admin/groups -> AdminGroupsPage
    - /admin/timetable -> AdminTimetablePage
    - /admin/reports -> AdminReportsPage
    - /admin/settings -> SettingsPage (page commune auth)
  - _buildPage(): transition Fade (200 ms) pour uniformiser la navigation.
  - _PlaceholderPage / _NotFoundPage: pages generiques hors admin.

### lib/core/router/route_guards.dart
- enum AppRole
  - fromString() convertit 'admin'/'professor'/'student' en enum; leve erreur si role inconnu.
- class AuthRedirect (ChangeNotifier)
  - Ecoute authProvider via ProviderSubscription, notifie sur changements.
  - call(context, state):
    - Ne redirige pas depuis /splash (SplashPage gere sa logique).
    - Si auth en initialisation: pas de redirect.
    - Si non connecte et pas sur /login: redirect /login.
    - Si connecte et sur /login: redirige vers dashboard selon role.
    - Controle d'acces par role: si /admin et role != admin, redirige vers dashboard role.
  - _getDashboardRoute(): mapping role -> route dashboard.

### lib/shared/widgets/app_scaffold.dart
- AppScaffold
  - Layout global (Row). Sidebar sur desktop/tablet, Drawer sur mobile.
- _MainArea
  - AppBar standard (_AppHeader) + body.
- _AppHeader
  - Affiche nom app en mobile, icone notif, toggle theme, infos user (nom + role + initials), bouton logout.
  - logout() appelle authProvider.notifier.logout() puis go('/login').
- _MobileDrawer
  - Drawer mobile base sur _getNavItems(role) et GoRouterState.matchedLocation.
- _Sidebar
  - Navigation fixe desktop. Liste des items admin/professor/student selon role.
- _NavItem
  - Def d'un item navigation (icon, label, path).
- _adminNavItems
  - Dashboard, Utilisateurs, Groupes, Salles, Emploi du temps, Rapports, Modules, Parametres.
- _SidebarItem / _DrawerItem
  - Elements UI de navigation avec style actif/inactif.

### lib/shared/providers/data_state.dart
- class AdminDataState<T>
  - data: List<T> (par defaut vide)
  - isLoading: bool (par defaut true)
  - error: String?
  - copyWith(): support clearError pour reset propre des erreurs.
  - Utilise par les providers admin CRUD.

---

## Donnees admin (models)

### lib/features/admin/data/models/admin_dashboard_data.dart
- class AdminDashboardData (Equatable)
  - Champs KPI: totalUsers, totalStudents, totalProfessors, totalModules, totalRooms, totalGroups.
  - Champs jour: totalSessionsToday, activeSessionsToday, averageAttendanceRate.
  - recentSessions: List<SessionData>
  - recentActivities: List<String>
- fromJson(): parse toutes les valeurs, recentSessions mappe vers SessionData.
- toJson(): serialise KPI + sessions + activities.
- copyWith(): facilite mise a jour partielle.
- props: equality par tous les champs.

### lib/features/admin/data/models/university_group.dart
- class UniversityGroup (Equatable)
  - id, name, code, level, department, studentCount, isActive.
- fromJson(): mappe les champs, fallback sur valeurs par defaut.
- toJson(): serialisation standard.
- copyWith(): mise a jour partielle.
- props: equality par tous les champs.

### lib/features/admin/data/models/university_module.dart
- class UniversityModule (Equatable)
  - id, name, code, description, credits, totalHours, isActive, groupIds.
- fromJson(): groupIds mappe depuis List<dynamic>.
- toJson(): serialisation standard.
- copyWith(): mise a jour partielle.
- props: equality par tous les champs.

### lib/features/admin/data/models/university_room.dart
- class UniversityRoom (Equatable)
  - id, name, code, capacity, building, floor, hasProjector, hasComputers, isActive.
- fromJson(): parse numeriques et booleens, fallback par defaut.
- toJson(): serialisation standard.
- copyWith(): mise a jour partielle.
- props: equality par tous les champs.

---

## Acces donnees admin (repository)

### lib/features/admin/data/admin_repository.dart
- class AdminRepository
  - _auth: FirebaseAuth instance.
  - _database: FirebaseDatabase.
  - _root: ref de base.
  - Refs utilises: users, modules, rooms, groups, sessions.

- Dashboard
  - dashboardStream():
    - Ecoute /sessions (onValue) et calcule KPIs.
    - Compte users/modules/rooms/groups via get().
    - Re-scan des roles pour total students/professors.
    - Filtre sessions du jour par date ISO (YYYY-MM-DD).
    - Calcule activeSessions, totalPresent, totalMarked, avgRate.
    - Retourne AdminDashboardData (sessions limitees a 10).

- Users
  - getAllUsers():
    - Lit /users, mappe en AppUser (ajoute id = key), tri par fullName.
  - createUser():
    - Cree compte Firebase Auth (email/password).
    - Cree node /users/{uid} (role, isActive, groupId/groupName optionnels).
  - updateUser(uid, data): update du node /users/{uid}.
  - deleteUser(uid): remove /users/{uid}.
  - resetPassword(email): sendPasswordResetEmail.

- Modules
  - modulesStream():
    - Stream sur /modules, map en UniversityModule, tri par name.
  - createModule(module): push() + set avec id.
  - updateModule(module): update /modules/{id}.
  - deleteModule(id): remove.

- Rooms
  - roomsStream():
    - Stream sur /rooms, map en UniversityRoom, tri par name.
  - createRoom(room): push() + set.
  - updateRoom(room): update /rooms/{id}.
  - deleteRoom(id): remove.

- Groups
  - groupsStream():
    - Stream sur /groups avec debug prints.
    - Verifie snapshot.exists, type Map, parse chaque entry.
    - Log detaille si entry invalide.
    - Tri par name.
  - createGroup(group): push() + set.
  - updateGroup(group): update /groups/{id}.
  - deleteGroup(id): remove.

- Sessions
  - sessionsStream():
    - Stream sur /sessions, map en SessionData, tri par sessionDate.
  - getProfessors(): filtre users role == 'professor'.
  - createSession(session):
    - Charge toutes les sessions de la meme date.
    - Verifie conflits:
      - meme salle et chevauchement horaire
      - meme professeur et chevauchement horaire
      - meme groupe et chevauchement horaire
    - Si conflit -> throw Exception avec message.
    - Sinon push() + set.
  - deleteSession(id): remove.
  - _timesOverlap(startA, endA, startB, endB): comparaison string HH:mm.

- Analytics (enhanced)
  - attendanceByGroup():
    - Parcourt /attendance, recupere groupName de la session.
    - Compte absences + retards (status == absent/late).
  - attendanceByModule():
    - Idem mais par moduleName.
  - busiestRooms():
    - Compte occurrences roomName dans /sessions.
  - attendanceTrendByWeek():
    - Regroupe absences/retards par semaine ISO (YYYY-Wxx).
    - _weekNumber(): calcule numero de semaine.

- Provider
  - adminRepositoryProvider: expose AdminRepository via firebaseDatabaseProvider.

---

## Services de seeding

### lib/features/admin/data/seeding_service.dart
- class SeedingService
  - seedAllData({onProgress})
    - Initialise app Firebase secondaire (SGAUSeeder) pour creer des comptes.
    - Etape 1: nettoyage nodes users/modules/rooms/groups/sessions/attendance.
    - Etape 2: creation d'utilisateurs (admin, profs, etudiants) dans Auth + RTDB.
      - Mot de passe par defaut: "password".
      - Si email deja utilise: signIn pour recuperer uid.
    - Etape 3: creation des groupes (Master 1 GL/RSD, Licence 3 SI).
    - Etape 4: creation des modules (INF401..INF406) avec credits/heures.
    - Etape 5: creation des salles (amphi, salles, lab) avec capacite/amenities.
    - Etape 6: generation historique presence:
      - Boucle sur ~25 jours passes (hors week-end).
      - 2 sessions/jour (matin M1 GL, aprem M1 RSD).
      - Generation attendance par etudiant (present/late/absent).
      - Ecrit /attendance et /sessions (status completed).
    - Etape 7: creation des sessions du jour + presence initiale unmarked.
    - Fin: fermeture de l'app secondaire.

---

## Providers admin (state management)

### lib/features/admin/providers/admin_dashboard_provider.dart
- AdminDashboardNotifier (StateNotifier<AdminDashboardData?>)
  - Souscrit a dashboardStream(); state = data.
  - On error: state = null.
  - dispose(): cancel subscription.
- adminDashboardProvider: expose le notifier.

### lib/features/admin/providers/admin_users_provider.dart
- AdminUsersNotifier (StateNotifier<AdminDataState<AppUser>>)
  - loadUsers(): charge tous les users (set isLoading).
  - createUser(): cree user via repository + reload.
  - updateUser(): update via repository + reload.
  - deleteUser(): delete via repository + reload.
  - resetPassword(): envoie email reset.
  - clearError(): reset error.
- adminUsersProvider: expose le notifier.

### lib/features/admin/providers/admin_groups_provider.dart
- AdminGroupsNotifier (StateNotifier<AdminDataState<UniversityGroup>>)
  - Souscrit a groupsStream (log debug).
  - create/update/delete deleguent au repository.
  - clearError() / dispose().
- adminGroupsProvider: expose le notifier.

### lib/features/admin/providers/admin_modules_provider.dart
- AdminModulesNotifier (StateNotifier<AdminDataState<UniversityModule>>)
  - Souscrit a modulesStream.
  - create/update/delete deleguent au repository.
  - clearError() / dispose().
- adminModulesProvider: expose le notifier.

### lib/features/admin/providers/admin_rooms_provider.dart
- AdminRoomsNotifier (StateNotifier<AdminDataState<UniversityRoom>>)
  - Souscrit a roomsStream.
  - create/update/delete deleguent au repository.
  - clearError() / dispose().
- adminRoomsProvider: expose le notifier.

---

## UI Admin (pages)

### lib/features/admin/presentation/pages/admin_dashboard_page.dart
- AdminDashboardPage
  - Watch adminDashboardProvider.
  - RefreshIndicator -> ref.invalidate(adminDashboardProvider).
  - Sections: _Header, _KpiSection, _TodayStats, _RecentSessionsSection.

- _Header
  - Affiche date locale (jours/mois en FR).
  - Double-tap declenche un seeding complet:
    - Dialogue de confirmation.
    - Lance _SeedingDialog (progress + logs).
    - Invalide adminDashboardProvider si succes.

- _SeedingDialog
  - Lance SeedingService.seedAllData() a l'init.
  - UI avec etat: en cours, success, erreur.
  - Logger scroll auto dans un panel type console.
  - Bouton Fermer renvoie success si fini.

- _KpiSection
  - Rend cartes KPI (utilisateurs, etudiants, professeurs, modules, salles, groupes).
  - Responsive: colonne sur mobile, wrap sur desktop.

- _TodayStats
  - Statistiques du jour (seances, en cours, taux presence).

- _RecentSessionsSection
  - Liste des sessions recentes.
  - _SessionCard: module, groupe, salle, date/heure + badge statut.

### lib/features/admin/presentation/pages/admin_users_page.dart
- AdminUsersPage (stateful)
  - Barre recherche par nom/email.
  - Bouton Ajouter -> _showUserDialog.
  - _buildBody():
    - Loading, error (avec retry), empty state.
    - Liste des users filtres.

- _showUserDialog({user?})
  - Mode creation/edition.
  - Champs: prenom, nom, email, mot de passe (creation), role, actif.
  - Si role == student: selection groupe avec filtre + liste scrollable.
  - Retourne map; appelle createUser() ou updateUser().

- _confirmDelete(user)
  - Dialogue de confirmation, puis deleteUser().

- _resetPassword(user)
  - Dialogue de confirmation, puis resetPassword().
  - Snackbar success.

- _GroupItem
  - Item selection groupe (highlight si selectionne).

- _UserTile
  - Card swipe delete + menu (edit/reset/delete).
  - Affiche initials, fullName, email, groupName si student.
  - Pastille active/inactive.

### lib/features/admin/presentation/pages/admin_groups_page.dart
- AdminGroupsPage (stateful)
  - Recherche par nom/code/departement.
  - _showGroupDialog({group?}):
    - Champs: name, code, level (L1..M2), department, studentCount, isActive.
    - Retourne map -> UniversityGroup.
    - create() ou update().
  - _confirmDelete(group) -> delete().
  - _buildBody():
    - Loading, error (retry), empty state.
    - Liste swipe delete.

- _GroupTile
  - Card avec code, nom, dept, level, studentCount, pastille active.
  - Menu edit/delete.

### lib/features/admin/presentation/pages/admin_modules_page.dart
- AdminModulesPage (stateful)
  - Recherche par nom/code.
  - _showModuleDialog({module?}):
    - Champs: name, code, description, credits, totalHours, isActive.
    - Retourne UniversityModule (id timestamp si creation).
    - create() ou update().
  - _confirmDelete(module) -> delete().
  - _buildBody():
    - Loading, error (retry), empty state.
    - Liste swipe delete.

- _ModuleCard
  - Card avec code, nom, description, credits, totalHours, etat actif.

### lib/features/admin/presentation/pages/admin_rooms_page.dart
- AdminRoomsPage (stateful)
  - Recherche par nom/code/batiment.
  - _showRoomDialog({room?}):
    - Champs: name, code, building, capacity, floor.
    - Switches: hasProjector, hasComputers, isActive.
    - create() ou update().
  - _confirmDelete(room) -> delete().
  - _buildBody():
    - Loading, error (retry), empty state.
    - Liste swipe delete.

- _RoomTile
  - Card avec code, nom, batiment, etage, capacite, amenities.
  - Pastille active/inactive + menu edit/delete.

### lib/features/admin/presentation/pages/admin_reports_page.dart
- AdminReportsPage (stateful)
  - initState() -> _loadAnalytics() (par repository).
  - _loadAnalytics():
    - attendanceByGroup, attendanceByModule, busiestRooms, attendanceTrendByWeek.
  - build():
    - Resumes calcules depuis adminDashboardProvider.
    - Section "Analyses detaillees" avec graphes barres.

- _SummaryGrid
  - Calculs: totalSessions, totalPresent/Absent/Late, totalMarked, overallRate.
  - _rateColor(): code couleur selon taux.

- _BarChartSection
  - Carte avec barres (LinearProgressIndicator) sur top 10.

- _RecentSessionsSection
  - Liste des sessions du jour.

- _ReportSessionCard
  - Detail par session: taux de presence, barre, chips compteurs.

### lib/features/admin/presentation/pages/admin_timetable_page.dart
- adminSessionsProvider
  - StreamProvider<List<SessionData>> vers sessionsStream().
- AdminTimetablePage
  - RefreshIndicator -> ref.invalidate(adminSessionsProvider).
  - Header + bouton "Nouvelle seance" -> showCreateSessionDialog().
  - TimetableWeekHeader + TimetableDayView (weekSessions filtrees par weekStart/weekEnd).
  - Affiche compteur de seances semaine.

### lib/features/admin/presentation/pages/admin_settings_page.dart
- AdminSettingsPage (ConsumerWidget)
  - Sections: compte (avatar + nom/email), apparence (toggle theme), a propos.
  - _infoRow(): ligne label/valeur.
  - Note: route admin settings pointe vers SettingsPage (auth), pas cette page.

---

## Widgets admin

### lib/features/admin/presentation/widgets/admin_session_dialog.dart
- showCreateSessionDialog(context, ref)
  - Ouvre un AlertDialog non dismissible.

- _CreateSessionDialogState
  - Charge professeurs via adminRepository.getProfessors().
  - Form fields:
    - Module (Dropdown) -> filtre groupes compatibles (groupIds).
    - Groupe (Dropdown) -> validation capacite vs salle.
    - Salle (Dropdown).
    - Professeur (Dropdown).
    - Type (CM/TD/TP).
    - Date (DatePicker).
    - Debut/Fin (TimePicker).
  - Validations:
    - Champs requis.
    - Heure fin > heure debut.
    - Capacite salle >= taille groupe.
  - _save(): cree SessionData (lat/lng/geofence par defaut), appelle createSession().
  - UI de resultat:
    - Snackbar erreur si conflit/exception.
    - Snackbar succes + fermeture dialog.

---

## Liens utiles (dependances utilisees)
- lib/shared/widgets/timetable/* (TimetableWeekHeader, TimetableDayView, TimetableSwipeWrapper)
- lib/shared/widgets/loading_shimmer.dart
- lib/shared/providers/timetable_state_provider.dart
- lib/shared/providers/theme_provider.dart
- lib/features/auth/providers/auth_provider.dart
- lib/features/auth/presentation/pages/settings_page.dart (route admin settings)
