# Documentation de synthese (par fichier)

> Portee: dossier code (lib/, test/, assets/, web/) + fichiers racine.

## Fichiers racine

### analysis_options.yaml
- Configuration des regles de lint Flutter (liste tres large) et exclusions d'analyse.

### firebase.json
- Configuration FlutterFire CLI (appId par plateforme, mapping vers lib/firebase_options.dart).

### pubspec.yaml
- Metadonnees projet, dependances (Riverpod, GoRouter, Firebase, Geolocator, Mobile Scanner, Shimmer, QR, Intl, etc.).
- Declaration des assets: assets/images/ et assets/fonts/.

### README.md
- README de base Flutter (non personnalise).

### web/manifest.json
- Manifest PWA (nom, couleurs, orientation, icones, start_url).

## lib/

### lib/main.dart
- `main()`
  - Initialise Flutter, Firebase (avec timeout), PreferencesService (timeout), orientations, system UI.
  - Configure gestion d'erreurs Flutter + async globales.
  - Monte `ProviderScope` avec override `preferencesServiceProvider`, puis `runApp(SGAUApp)`.

### lib/app.dart
- `SGAUApp` (ConsumerWidget)
  - `build()`: initialise `MaterialApp.router` (router GoRouter, theme, locales, delegues).

### lib/firebase_options.dart
- `DefaultFirebaseOptions`
  - `currentPlatform`: retourne `FirebaseOptions` selon plateforme.
  - Constantes: `web`, `android`, `ios`, `macos`, `windows`.

## lib/core/

### lib/core/constants/app_constants.dart
- `AppConstants`
  - Constantes application (nom, version, delais, tailles UI, limites, largeurs sidebar, etc.).

### lib/core/constants/storage_keys.dart
- `StorageKeys`
  - Clés de stockage local (tokens, theme, locale, onboarding, sync).

### lib/core/theme/colors.dart
- `AppColors`
  - Palette UI (primary, semantic, surfaces, borders, roles, gradients, statuts).

### lib/core/theme/text_styles.dart
- `AppTextStyles`
  - Styles typographiques standardises + styles KPI/boutons.

### lib/core/theme/app_theme.dart
- `AppTheme`
  - `light()` / `dark()`: themes Material 3 complets (buttons, inputs, cards, chips, nav, etc.).
  - `_buildTextTheme()` pour map styles -> `TextTheme`.

### lib/core/utils/extensions.dart
- Extensions:
  - `ThemeExtensions` sur `BuildContext`: theme, colorScheme, tailles, breakpoints.
  - `StringExtensions`: `capitalize`, `capitalizeAll`, `initials`, `isValidEmail`, `isValidPhone`, `toTitleCase()`, `truncate()`.
  - `DateTimeExtensions`: formats FR, `isToday/isYesterday/isTomorrow`, `relativeDate`, `isSameDay()`.
  - `DurationExtensions`: `formattedDuration`.
  - `DoubleExtensions`: `percentage`, `currency`.
  - `IntExtensions`: `ordinal`.
  - `EdgeInsetsValues`: helpers d'espacement.

### lib/core/utils/responsive.dart
- `ResponsiveUtils`
  - Breakpoints, detection device/orientation.
  - `value<T>()` pour selection adaptive.
  - Helpers dimensions, padding, colonnes de grid.

### lib/core/storage/preferences_service.dart
- `PreferencesService`
  - `init()`
  - getters/setters: `isDarkMode`, `locale`, `isOnboardingComplete`, `lastSyncTimestamp`.
  - `getString/int/bool`, `setString/int/bool`, `remove()`, `clear()`.

### lib/core/router/route_guards.dart
- `AppRole` enum + `fromString()`.
- `AuthRedirect` (ChangeNotifier)
  - Ecoute `authProvider`, notifie sur changements.
  - `call()` applique redirections auth + roles.
  - `_getDashboardRoute()`.

### lib/core/router/app_router.dart
- `routerProvider` (GoRouter)
  - Routes: splash/login + ShellRoute avec pages admin/professor/student.
  - `_buildPage()` transition fade.
  - `_PlaceholderPage`, `_NotFoundPage`.

### lib/core/location/location_provider.dart
- `LocationState` + `copyWith()`
- `LocationNotifier`
  - `requestLocation()`, `clearError()`.
- `locationProvider` (StateNotifierProvider).

### lib/core/location/geofencing_service.dart
- `GpsStatus` enum
- `GeofencingState` + `copyWith()`
- `GeofencingService`
  - `checkPermission()`, `checkLocation()` (distance + rayon).
- `geofencingServiceProvider`.

### lib/core/firebase/firebase_database_provider.dart
- `kDatabaseURL` constant.
- `firebaseDatabaseProvider` (instance RTDB region forcee).
- `firebaseConnectedProvider` (StreamProvider bool sur `.info/connected`).

## lib/shared/

### lib/shared/providers/theme_provider.dart
- `preferencesServiceProvider`.
- `ThemeModeNotifier` (`toggleTheme()`, `setThemeMode()`)
- `themeModeProvider`, `themeDataProvider` (retourne `AppTheme.light/dark`).

### lib/shared/providers/data_state.dart
- `AdminDataState<T>` generique (data, isLoading, error) + `copyWith()`.

### lib/shared/providers/timetable_state_provider.dart
- Providers: `selectedDayIndexProvider`, `weekOffsetProvider`, `weekStartProvider`, `weekEndProvider`, `selectedDayProvider`.

### lib/shared/widgets/app_scaffold.dart
- `AppScaffold` (layout principal avec sidebar/Drawer).
- `_MainArea`, `_AppHeader` (topbar user + theme + logout), `_MobileDrawer`, `_Sidebar`.
- `_NavItem` + listes `_adminNavItems`, `_professorNavItems`, `_studentNavItems`.
- `_SidebarItem`, `_DrawerItem`.

### lib/shared/widgets/app_icon.dart
- `AppIcon` (wrapper d'icones).
- `StatusDot` (pastille couleur).

### lib/shared/widgets/app_error_widget.dart
- `AppErrorWidget` (ecran erreur avec retry auto + countdown).
- `ErrorBanner` (banniere compacte).

### lib/shared/widgets/responsive_layout.dart
- `ResponsiveLayout` (mobile/tablet/desktop).
- `ContentContainer` (max-width + padding adaptatif).
- `ResponsiveGrid`.
- `HorizontalScrollSection`.

### lib/shared/widgets/loading_shimmer.dart
- `LoadingShimmer` (constructeurs `rectangular` / `circular`).
- `cardSkeleton()`, `listSkeleton()`, `kpisSkeleton()`, `chartSkeleton()`.

### lib/shared/widgets/loading_overlay.dart
- `LoadingOverlay` (overlay plein ecran).
- `ButtonLoadingIndicator`.
- `ShimmerLoading` (animated gradient).

### lib/shared/widgets/empty_state_widget.dart
- `EmptyStateWidget`.
- `EmptyListIndicator`.

### lib/shared/widgets/custom_heatmap.dart
- `HeatmapData`.
- `CustomAbsenceHeatmap` (grid interactif + legendes).
- `_LegendBox`.

### lib/shared/widgets/custom_bar_chart.dart
- `BarChartData`.
- `CustomAnimatedBarChart` (barres animees + tooltips).

### lib/shared/widgets/timetable/timetable_week_header.dart
- `TimetableWeekHeader` (navigation semaines + selection jour).
- `_weekNumber()`.

### lib/shared/widgets/timetable/timetable_swipe_wrapper.dart
- `TimetableSwipeWrapper` (swipe gauche/droite -> changement jour).

### lib/shared/widgets/timetable/timetable_session_card.dart
- `TimetableSessionCard` (fiche seance).
- `_InfoRow` (infos module/groupe/salle).
- `_StatusChip` (etat seance).

### lib/shared/widgets/timetable/timetable_day_view.dart
- `TimetableDayView` (sessions filtrees par jour).
- `_SessionList`, `_EmptyDay`.

## lib/features/auth/

### lib/features/auth/data/models/user.dart
- `AppUser` (Equatable)
  - `fromJson()`, `toJson()`, `copyWith()`.
  - getters `fullName`, `initials`, `isAdmin/isProfessor/isStudent`.

### lib/features/auth/data/auth_repository.dart
- `AuthRepository`
  - `login()` (Firebase Auth + RTDB + creation profil si absent).
  - `logout()`.
  - `currentUser()`.
  - Helpers `_getDefaultRoleFromEmail()`, `_parseNamesFromEmail()`.
- `authRepositoryProvider`.

### lib/features/auth/providers/auth_provider.dart
- `AuthStatus` enum.
- `AuthState` (status, user, error, isInitializing) + `copyWith()`.
- `AuthNotifier`:
  - `_initialize()`, `login()`, `logout()`, `clearError()`.
- Providers: `authProvider`, `isAuthenticatedProvider`, `currentUserProvider`.

### lib/features/auth/presentation/pages/login_page.dart
- `LoginPage` (form email/mdp, erreurs, loading).
- `_handleLogin()`.

### lib/features/auth/presentation/pages/splash_page.dart
- `SplashPage` (animation + timer minimum + navigation selon auth).
- `_checkNavigation()`.

### lib/features/auth/presentation/pages/settings_page.dart
- `SettingsPage` (profil, theme, diagnostics, a propos, logout).
- `_showLogoutDialog()`, `_getRoleLabel()`, `_getRoleColor()`.
- `_CreditRow` (ligne a propos).

## lib/features/student/

### lib/features/student/data/models/student_dashboard_data.dart
- `StudentDashboardData` (sessions du jour + resume absences)
  - getters `overallAbsenceRate`, `totalTodaySessions`, `presentToday`.
- `StudentSession` (fromJson, `formattedTime`).
- `AbsenceSummary` (ratios, `remaining`, `remainingPercent`, `isCritical/isWarning/isSafe`).

### lib/features/student/data/models/student_absence.dart
- `StudentAbsence` (fromJson, getters `isAbsent/isPresent/isLate/isJustified/canJustify`, `formattedDate`).

### lib/features/student/data/student_repository.dart
- `StudentRepository`
  - `getDashboard()` (sessions du jour + resume absences).
  - `getAbsences()`.
  - `markAttendanceFromScan()`.
  - `getJustificationStatus()`.
  - `sessionsStream()`.
- `studentRepositoryProvider`.

### lib/features/student/providers/student_dashboard_provider.dart
- `StudentDashboardState` + `copyWith()`.
- `StudentDashboardNotifier` (`load()`, `clearError()`).
- Providers: `studentDashboardProvider`, `studentDashboardDataProvider`, `studentTodaySessionsProvider`, `studentAbsenceSummaryProvider`.

### lib/features/student/providers/student_absences_provider.dart
- `StudentAbsencesState` + `copyWith()`.
- `StudentAbsencesNotifier` (`load()`, `clearError()`).
- `studentAbsencesProvider`.

### lib/features/student/presentation/pages/student_dashboard_page.dart
- `StudentDashboardPage` (refresh, recherche, sections sessions/absences).
- `_todayLabel()`, `_TodaySessionCard`.

### lib/features/student/presentation/pages/student_timetable_page.dart
- `studentSessionsProvider` (stream sessions).
- `StudentTimetablePage` (filtre par groupe + semaine).

### lib/features/student/presentation/pages/student_absences_page.dart
- `StudentAbsencesPage` (liste + empty state + erreurs).
- `_AbsenceTile`, `_StatusBadge`.

### lib/features/student/presentation/pages/student_qr_page.dart
- `StudentQRPage` (affichage QR statique + infos user).

### lib/features/student/presentation/pages/student_scanner_page.dart
- `StudentScannerPage`
  - Scan QR session, verif GPS, verifs session/token/groupe, marquage presence.
  - `_checkLocation()`, `_onDetect()`, `_processQrCode()`.
  - `_buildStatusPanel()`, `_buildGpsStatus()`.

### lib/features/student/presentation/widgets/session_status_chip.dart
- `SessionStatusChip` (couleur/icone/label selon statut).

### lib/features/student/presentation/widgets/absence_progress_card.dart
- `AbsenceProgressCard` (progression + message selon seuil).

## lib/features/admin/

### lib/features/admin/data/models/admin_dashboard_data.dart
- `AdminDashboardData` (KPI + sessions recentes + activites)
  - `fromJson()`, `toJson()`, `copyWith()`.

### lib/features/admin/data/models/university_group.dart
- `UniversityGroup` (fromJson, toJson, copyWith).

### lib/features/admin/data/models/university_module.dart
- `UniversityModule` (fromJson, toJson, copyWith).

### lib/features/admin/data/models/university_room.dart
- `UniversityRoom` (fromJson, toJson, copyWith).

### lib/features/admin/data/seeding_service.dart
- `SeedingService`
  - `seedAllData()` (nettoyage DB, creation users, groupes, modules, salles, sessions historiques et du jour).

### lib/features/admin/data/admin_repository.dart
- `AdminRepository`
  - Dashboard: `dashboardStream()`.
  - Users: `getAllUsers()`, `createUser()`, `updateUser()`, `deleteUser()`, `resetPassword()`.
  - Modules: `modulesStream()`, `createModule()`, `updateModule()`, `deleteModule()`.
  - Rooms: `roomsStream()`, `createRoom()`, `updateRoom()`, `deleteRoom()`.
  - Groups: `groupsStream()` (log debug + parsing), `createGroup()`, `updateGroup()`, `deleteGroup()`.
  - Sessions: `sessionsStream()`, `getProfessors()`, `createSession()` (verifs conflits), `deleteSession()`.
  - Analytics: `attendanceByGroup()`, `attendanceByModule()`, `busiestRooms()`, `attendanceTrendByWeek()`.
- `adminRepositoryProvider`.

### lib/features/admin/providers/admin_users_provider.dart
- `AdminUsersNotifier` (load/create/update/delete/reset) + `clearError()`.
- `adminUsersProvider`.

### lib/features/admin/providers/admin_rooms_provider.dart
- `AdminRoomsNotifier` (stream rooms + CRUD) + `clearError()`.
- `adminRoomsProvider`.

### lib/features/admin/providers/admin_modules_provider.dart
- `AdminModulesNotifier` (stream modules + CRUD) + `clearError()`.
- `adminModulesProvider`.

### lib/features/admin/providers/admin_groups_provider.dart
- `AdminGroupsNotifier` (stream groups + CRUD) + `clearError()`.
- `adminGroupsProvider`.

### lib/features/admin/providers/admin_dashboard_provider.dart
- `AdminDashboardNotifier` (stream dashboard).
- `adminDashboardProvider`.

### lib/features/admin/presentation/pages/admin_dashboard_page.dart
- `AdminDashboardPage` (KPI, stats, sessions recentes).
- `_Header` (double-tap -> seeding).
- `_SeedingDialog` (progress + logs).
- `_KpiSection`, `_KpiCard`, `_TodayStats`, `_StatCard`, `_RecentSessionsSection`, `_SessionCard`.

### lib/features/admin/presentation/pages/admin_users_page.dart
- `AdminUsersPage` (liste users, recherche, CRUD).
- `_showUserDialog()` (creation/edition + selection groupe).
- `_confirmDelete()`, `_resetPassword()`.
- `_GroupItem`, `_UserTile`.

### lib/features/admin/presentation/pages/admin_modules_page.dart
- `AdminModulesPage` (liste modules, recherche, CRUD).
- `_showModuleDialog()`, `_confirmDelete()`.
- `_ModuleCard`, `_InfoChip`.

### lib/features/admin/presentation/pages/admin_rooms_page.dart
- `AdminRoomsPage` (liste salles, recherche, CRUD).
- `_showRoomDialog()`, `_confirmDelete()`.
- `_RoomTile`, `_InfoChip`, `_AmenityBadge`.

### lib/features/admin/presentation/pages/admin_groups_page.dart
- `AdminGroupsPage` (liste groupes, recherche, CRUD).
- `_showGroupDialog()`, `_confirmDelete()`.
- `_GroupTile`.

### lib/features/admin/presentation/pages/admin_reports_page.dart
- `AdminReportsPage` (stats + charts + sessions du jour).
- `_loadAnalytics()` (attendance par groupe/module, salles, tendance).
- `_SummaryGrid`, `_SummaryCard`, `_BarChartSection`, `_RecentSessionsSection`, `_ReportSessionCard`, `_CountChip`.

### lib/features/admin/presentation/pages/admin_timetable_page.dart
- `adminSessionsProvider` (stream sessions).
- `AdminTimetablePage` (week view + create session).

### lib/features/admin/presentation/pages/admin_settings_page.dart
- `AdminSettingsPage` (profil, theme, a propos).
- `_infoRow()`.

### lib/features/admin/presentation/widgets/admin_session_dialog.dart
- `showCreateSessionDialog()`.
- `_CreateSessionDialog`
  - chargement professeurs, selection module/groupe/salle/prof/date/heure.
  - validations (capacite, ordre horaires).
  - `_save()` -> `AdminRepository.createSession()`.

## lib/features/professor/

### lib/features/professor/data/models/waiting_student.dart
- `WaitingStudent` (fullName, initials).

### lib/features/professor/data/models/session_event.dart
- `SessionEvent` (sealed) + `SessionStartedEvent`, `SessionClosedEvent`, `NewQrTokenEvent`.

### lib/features/professor/data/models/session_data.dart
- `SessionStatus` enum + `fromString()` + `apiValue`.
- `SessionData` (fromJson, toJson, copyWith, getters `formattedTime`, `formattedDate`, `canStart`, `isActive`, `isCompleted`, `canClose`, `totalMarked`).

### lib/features/professor/data/models/qr_token_data.dart
- `QRTokenData` (isExpired, remaining, remainingFraction).

### lib/features/professor/data/models/dashboard_data.dart
- `ProfessorDashboardData` (fromJson, getters `activeSessions`, `upcomingSessions`, `completedSessions`).

### lib/features/professor/data/models/attendance_record.dart
- `AttendanceStatus` enum + `fromString()` + `apiValue`.
- `AttendanceRecord` (fromJson, copyWith).

### lib/features/professor/data/models/attendance_counts.dart
- `AttendanceCounts` (fromJson, fromSocketData, getters `unmarked`, `totalMarked`, `completionRate`, `presentRate`, `absentRate`, copyWith).

### lib/features/professor/data/professor_repository.dart
- `ProfessorRepository`
  - Dashboard: `getDashboard()`.
  - Session: `getSession()`, `startSession()`, `closeSession()`, `postponeSession()`, `cancelSession()`.
  - Attendance: `getSessionAttendance()`, `markAttendance()`, `bulkMarkAttendance()`.
  - QR: `updateQrToken()`.
  - Streams: `sessionStream()`, `attendanceStream()`, `sessionsStream()`.
- `professorRepositoryProvider`.

### lib/features/professor/providers/dashboard_provider.dart
- `DashboardState` + `copyWith()`.
- `DashboardNotifier` (listen realtime sessions today, `startSession()`, `postponeSession()`, `cancelSession()`, `load()`, `clearError()`).
- Providers: `dashboardProvider`, `dashboardDataProvider`, `dashboardActiveSessionsProvider`, `dashboardUpcomingSessionsProvider`, `dashboardCompletedSessionsProvider`.

### lib/features/professor/providers/analytics_provider.dart
- `ProfessorAnalytics`, `ModuleStats`, `SessionStats`.
- `AnalyticsNotifier` (listen sessions par prof, calc stats).
- `analyticsProvider` (family).

### lib/features/professor/providers/active_session_provider.dart
- `AttendanceMode` enum.
- `ActiveSessionState` (students, counts, qr token, modes, flags) + `copyWith()` + getters listes.
- `ActiveSessionNotifier`
  - `_initialize()` (streams session + attendance), `startSession()`, `closeSession()`, `markAttendance()`, `bulkMarkAll()`, `setAttendanceMode()`, `confirmWaitingStudent()`, `kickWaitingStudent()`.
  - QR rotation: `_startQrRotation()`, `_stopQrRotation()`, `_emitNextQrToken()`, `_generateQrToken()`.
- Providers family: `activeSessionProvider`, `sessionCountsProvider`, `sessionStudentsProvider`, `sessionQrTokenProvider`, `sessionStatusProvider`, `sessionDataProvider`, `sessionActiveModeProvider`, `sessionWaitingRoomProvider`.

### lib/features/professor/presentation/pages/professor_dashboard_page.dart
- `ProfessorDashboardPage` (sessions du jour, sections active/a venir/terminees).
- `_SectionHeader`, `_EmptyDay`.

### lib/features/professor/presentation/pages/professor_timetable_page.dart
- `professorSessionsProvider` (stream sessions).
- `ProfessorTimetablePage` (filtre par prof + semaine).

### lib/features/professor/presentation/pages/professor_history_page.dart
- `ProfessorHistoryPage` (liste des seances terminees).
- `_HistoryCard`, `_MiniStat`.

### lib/features/professor/presentation/pages/professor_analytics_page.dart
- `ProfessorAnalyticsPage` (stats + charts + top absents + modules + seances recentes).
- `_StatCard`, `_ModuleCard`, `_SessionCard`, `_MiniStat`, `_AbsentStudentTile`.

### lib/features/professor/presentation/pages/active_session_page.dart
- `ActiveSessionPage` (wrapper et erreurs).
- `_SessionContent` (modes, listening, refresh).
- `_SyncStatusBar`, `_StatusDot`.
- `_SessionHeader` (close dialog + completion dialog).
- `_ReconnectionBanner`.
- `_ModeTabs`, `_ModeTab`.
- `_AttendanceModeContent` (Manual/QR/Scan).
- `_GeofenceSetupButton`, `_PreStartView`, `_CompletedView`.
- extension `_SliverExt`.

### lib/features/professor/presentation/widgets/attendance_toggle_tile.dart
- `AttendanceToggleTile` (toggle present/late/absent).
- `_StatusChip`.

### lib/features/professor/presentation/widgets/waiting_room_panel.dart
- `WaitingRoomPanel`.
- `_WaitingStudentTile` (confirm/retirer).

### lib/features/professor/presentation/widgets/student_scan_panel.dart
- `StudentScanPanel` (placeholder camera + instructions).

### lib/features/professor/presentation/widgets/session_status_badge.dart
- `SessionStatusBadge` (status -> label/couleur).

### lib/features/professor/presentation/widgets/session_card.dart
- `SessionCard` (card seance + actions).
- `_InfoChip`, `_ActionButton`, `_SessionActionsSheet`, `_ActionListTile`.

### lib/features/professor/presentation/widgets/qr_attendance_panel.dart
- `QRAttendancePanel` (QR dynamique + waiting room).
- `_TokenTimer` (compte a rebours).

### lib/features/professor/presentation/widgets/manual_attendance_panel.dart
- `ManualAttendancePanel` (bulk actions + toggles).
- `_BulkButton`.

### lib/features/professor/presentation/widgets/live_counter_bar.dart
- `LiveCounterBar` (progress + compteurs).
- `_ProgressSegment`, `_CounterItem`.

## tests/

### test/app_test.dart
- `App placeholder smoke test` (testWidgets triviale).

### test/widget_test.dart
- `App smoke test` (testWidgets triviale).

## assets/
- Dossiers declares mais vides: assets/images/, assets/fonts/.
