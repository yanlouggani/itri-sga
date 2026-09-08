-- ============================================================
-- ITRI Academy — Migration complète Supabase
-- ============================================================

-- 1. TABLES PRINCIPALES
-- ============================================================

-- Utilisateurs (liée à auth.users via trigger)
create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  firstname text not null default '',
  lastname text not null default '',
  role text not null check (role in ('admin', 'professor', 'student')) default 'student',
  identifier text,
  isactive boolean not null default true,
  createdat timestamptz not null default now()
);

-- Domaines de formation (Langues, Informatique, Robotique, Soutien…)
create table if not exists domains (
  id uuid primary key,
  name text not null,
  isactive boolean not null default true
);

-- Modules / Formations (Français, Anglais, Python, Robotique…)
create table if not exists modules (
  id uuid primary key,
  name text not null,
  domainid uuid references domains(id) on delete set null,
  isactive boolean not null default true
);

-- Groupes (rattachés directement à une formation)
create table if not exists groups (
  id uuid primary key,
  name text not null,
  moduleid uuid references modules(id) on delete set null,
  isactive boolean not null default true
);

-- Inscriptions (many-to-many students ↔ groups)
create table if not exists enrollments (
  id uuid primary key,
  studentid uuid not null references users(id) on delete cascade,
  groupid uuid not null references groups(id) on delete cascade,
  status text not null check (status in ('active', 'completed', 'dropped')) default 'active',
  enrolledat timestamptz not null default now(),
  unique (studentid, groupid)
);

-- Salles
create table if not exists rooms (
  id uuid primary key,
  name text not null,
  capacity int,
  isactive boolean not null default true
);

-- Créneaux horaires
create table if not exists time_slots (
  id uuid primary key,
  label text not null,
  start_time time not null,
  end_time time not null,
  order_index int not null
);

-- Liaison professeurs ↔ groupes (N:N, l'admin choisit quel prof pour chaque créneau)
create table if not exists professor_groups (
  professorid uuid not null references users(id) on delete cascade,
  groupid uuid not null references groups(id) on delete cascade,
  primary key (professorid, groupid)
);

-- NOTE (DÉPRÉCIÉ) : l'emploi du temps est désormais géré par le modèle « séries
-- récurrentes » (session_masters / session_exceptions), cf. migration_session_masters.sql.
-- La table weekly_entries et ses RPCs (insert_entry_atomic, delete_cascade, publish_week)
-- sont conservées uniquement comme historique et pour l'import de données existantes
-- (migration_session_masters_import.sql). Pour les bases neuves, NE PAS créer weekly_entries.

-- Emploi du temps hebdomadaire (template)
create table if not exists weekly_schedule (
  id uuid primary key,
  day_of_week int not null check (day_of_week between 1 and 7),
  start_time time not null,
  end_time time not null,
  moduleid uuid references modules(id) on delete set null,
  professorid uuid references users(id) on delete set null,
  roomid uuid references rooms(id) on delete set null,
  groupid uuid references groups(id) on delete cascade,
  session_type text not null default 'TD' check (session_type in ('CM', 'TD', 'TP')),
  isactive boolean not null default true,
  valid_from date,
  valid_to date,
  time_slot_id uuid references time_slots(id) on delete set null,
  version_no int not null default 1,
  created_by uuid references users(id),
  updated_by uuid references users(id),
  createdat timestamptz not null default now(),
  updatedat timestamptz not null default now()
);

-- Séances (générées depuis weekly_schedule)
create table if not exists sessions (
  id uuid primary key,
  groupid uuid references groups(id) on delete set null,
  moduleid uuid references modules(id) on delete set null,
  professorid uuid references users(id) on delete set null,
  roomid uuid references rooms(id) on delete set null,
  session_date date not null,
  start_time time not null,
  end_time time not null,
  session_type text not null default 'TD' check (session_type in ('CM', 'TD', 'TP')),
  status text not null default 'SCHEDULED' check (status in ('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
  present_count int not null default 0,
  absent_count int not null default 0,
  total_students int not null default 0,
  weekly_schedule_entry_id uuid references weekly_schedule(id) on delete set null,
  createdat timestamptz not null default now()
);

-- Présences
create table if not exists attendance (
  id uuid primary key,
  studentid uuid not null references users(id) on delete cascade,
  sessionid uuid not null references sessions(id) on delete cascade,
  status text not null check (status in ('present', 'absent', 'late', 'justified')) default 'absent',
  markedat timestamptz not null default now(),
  schedule_entry_id uuid not null references weekly_schedule(id) on delete cascade,
  unique (studentid, sessionid)
);

-- Professeurs ↔ Modules (affectation)
create table if not exists professor_modules (
  id uuid primary key,
  professorid uuid not null references users(id) on delete cascade,
  moduleid uuid not null references modules(id) on delete cascade,
  unique (professorid, moduleid)
);

-- Dérogations / overrides de séance
create table if not exists session_overrides (
  id uuid primary key,
  sessionid uuid not null references sessions(id) on delete cascade,
  previous_professor_id uuid references users(id),
  previous_room_id uuid references rooms(id),
  previous_start_time time,
  previous_end_time time,
  reason text,
  overridden_by uuid references users(id),
  overriddenat timestamptz not null default now()
);

-- Index
create index if not exists idx_users_role on users(role);
create index if not exists idx_users_email on users(email);
create index if not exists idx_enrollments_student on enrollments(studentid);
create index if not exists idx_enrollments_group on enrollments(groupid);
create index if not exists idx_sessions_date on sessions(session_date);
create index if not exists idx_sessions_group on sessions(groupid);
create index if not exists idx_attendance_student on attendance(studentid);
create index if not exists idx_attendance_session on attendance(sessionid);
create index if not exists idx_weekly_schedule_day on weekly_schedule(day_of_week);
create index if not exists idx_weekly_schedule_group on weekly_schedule(groupid);

-- ============================================================
-- 2. FONCTIONS RPC
-- ============================================================

-- Démarrer une séance (professeur)
create or replace function start_session(p_session_id uuid default null)
returns uuid
language plpgsql
security definer
as $$
declare
  v_session_id uuid;
  v_professor_id uuid;
begin
  select id into v_professor_id from users where id = auth.uid() and role = 'professor';
  if not found then raise exception 'Only professors can start sessions'; end if;

  if p_session_id is null then
    select ws.id into v_session_id
    from weekly_schedule ws
    where ws.professorid = v_professor_id
      and ws.isactive = true
      and not exists (
        select 1 from sessions s
        where s.professorid = v_professor_id
          and s.session_date = current_date
          and s.status = 'ACTIVE'
      )
    limit 1;

    if not found then raise exception 'No available session to start'; end if;

    insert into sessions (id, groupid, moduleid, professorid, roomid, session_date, start_time, end_time, session_type, status, total_students)
    select gen_random_uuid(), ws.groupid, ws.moduleid, ws.professorid, ws.roomid, current_date, ws.start_time, ws.end_time, ws.session_type, 'ACTIVE',
      (select count(*) from enrollments where groupid = ws.groupid and status = 'active')
    from weekly_schedule ws where ws.id = v_session_id
    returning id into v_session_id;
  else
    update sessions s set status = 'ACTIVE'
    where s.id = p_session_id and s.professorid = v_professor_id
    returning s.id into v_session_id;
  end if;

  return v_session_id;
end;
$$;

-- Clôturer une séance
create or replace function close_session(p_session_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update sessions
  set status = 'COMPLETED'
  where id = p_session_id
    and status = 'ACTIVE';
end;
$$;

-- Finaliser un utilisateur (admin crée user dans auth puis finalise)
create or replace function admin_finalize_user(
  p_id uuid,
  p_email text,
  p_firstname text,
  p_lastname text,
  p_role text,
  p_identifier text default null
)
returns void
language plpgsql
security definer
as $$
begin
  insert into users (id, email, firstname, lastname, role, identifier, isactive)
  values (p_id, p_email, p_firstname, p_lastname, p_role, p_identifier, true)
  on conflict (id) do update set
    email = excluded.email,
    firstname = excluded.firstname,
    lastname = excluded.lastname,
    role = excluded.role,
    identifier = excluded.identifier,
    isactive = true;
end;
$$;

-- ============================================================
-- 3. TRIGGERS
-- ============================================================

-- Copier l'utilisateur depuis auth.users vers public.users automatiquement
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.users (id, email, firstname, lastname, role, isactive)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'firstName', ''),
    coalesce(new.raw_user_meta_data ->> 'lastName', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'student'),
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function handle_new_user();

-- Sync email si modifié dans auth.users
create or replace function sync_user_email()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.users set email = new.email where id = new.id;
  return new;
end;
$$;

create or replace trigger on_auth_user_email_update
  after update of email on auth.users
  for each row
  execute function sync_user_email();

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================

alter table users enable row level security;
alter table domains enable row level security;
alter table modules enable row level security;
alter table groups enable row level security;
alter table enrollments enable row level security;
alter table rooms enable row level security;
alter table time_slots enable row level security;
alter table weekly_schedule enable row level security;
alter table sessions enable row level security;
alter table attendance enable row level security;
alter table professor_modules enable row level security;
alter table professor_groups enable row level security;
alter table session_overrides enable row level security;

-- Helper: vérifier le rôle depuis la table users
create or replace function user_role() returns text
language sql stable security definer
as $$
  select role from public.users where id = auth.uid();
$$;

do $$ begin
  execute (
    select string_agg(format('drop policy if exists %I on %I.%I;', policyname, schemaname, tablename), ' ')
    from pg_policies where schemaname = 'public'
  );
end $$;

-- Admins : tout voir / tout modifier
create policy "Admins full access" on users
  for all using (user_role() = 'admin');

create policy "Admins full access" on domains
  for all using (user_role() = 'admin');

create policy "Admins full access" on modules
  for all using (user_role() = 'admin');

create policy "Admins full access" on groups
  for all using (user_role() = 'admin');

create policy "Admins full access" on enrollments
  for all using (user_role() = 'admin');

create policy "Admins full access" on rooms
  for all using (user_role() = 'admin');

create policy "Admins full access" on time_slots
  for all using (user_role() = 'admin');

create policy "Admins full access" on weekly_schedule
  for all using (user_role() = 'admin');

create policy "Admins full access" on sessions
  for all using (user_role() = 'admin');

create policy "Admins full access" on attendance
  for all using (user_role() = 'admin');

create policy "Admins full access" on professor_modules
  for all using (user_role() = 'admin');

create policy "Admins full access" on professor_groups
  for all using (user_role() = 'admin');

create policy "Professors read groups" on professor_groups
  for select using (user_role() = 'professor');

-- NOTE (DÉPRÉCIÉ) : politiques weekly_entries supprimées (modèle remplacé par
-- session_masters / session_exceptions, voir migration_session_masters.sql).
create policy "Admins full access" on session_overrides
  for all using (user_role() = 'admin');

-- Professeurs : lecture des groupes/élèves/emploi du temps
create policy "Professors read groups" on groups
  for select using (user_role() = 'professor');

create policy "Professors read enrollments" on enrollments
  for select using (user_role() = 'professor');

create policy "Professors read users" on users
  for select using (user_role() = 'professor');

create policy "Professors read schedule" on weekly_schedule
  for select using (user_role() = 'professor');

create policy "Professors read sessions" on sessions
  for all using (user_role() = 'professor');

create policy "Professors manage attendance" on attendance
  for all using (user_role() = 'professor');

create policy "Professors read modules" on modules
  for select using (user_role() = 'professor');

create policy "Professors read rooms" on rooms
  for select using (user_role() = 'professor');

-- Étudiants : lecture de leurs propres données
create policy "Students read own" on users
  for select using (id = auth.uid());

create policy "Students read own enrollments" on enrollments
  for select using (studentid = auth.uid());

create policy "Students read own attendance" on attendance
  for select using (studentid = auth.uid());

create policy "Students read schedule" on weekly_schedule
  for select using (
    exists (
      select 1 from enrollments
      where enrollments.studentid = auth.uid()
      and enrollments.groupid = weekly_schedule.groupid
    )
  );

create policy "Students read sessions" on sessions
  for select using (
    exists (
      select 1 from enrollments
      where enrollments.studentid = auth.uid()
      and enrollments.groupid = sessions.groupid
    )
  );

create policy "Students read groups" on groups
  for select using (
    exists (
      select 1 from enrollments
      where enrollments.studentid = auth.uid()
      and enrollments.groupid = groups.id
    )
  );

create policy "Students read modules" on modules
  for select using (true);

create policy "Students read rooms" on rooms
  for select using (true);

create policy "Students read time_slots" on time_slots
  for select using (true);

create policy "Students read domains" on domains
  for select using (true);


-- 6. SEED DATA (optionnel)
-- ============================================================

insert into time_slots (id, label, start_time, end_time, order_index) values
  (gen_random_uuid(), '08:00–09:30', '08:00:00', '09:30:00', 1),
  (gen_random_uuid(), '09:40–11:10', '09:40:00', '11:10:00', 2),
  (gen_random_uuid(), '11:20–12:50', '11:20:00', '12:50:00', 3),
  (gen_random_uuid(), '13:30–15:00', '13:30:00', '15:00:00', 4),
  (gen_random_uuid(), '15:10–16:40', '15:10:00', '16:40:00', 5),
  (gen_random_uuid(), '16:50–18:20', '16:50:00', '18:20:00', 6);

insert into domains (id, name, isactive) values
  (gen_random_uuid(), 'Langues', true),
  (gen_random_uuid(), 'Informatique', true),
  (gen_random_uuid(), 'Robotique', true),
  (gen_random_uuid(), 'Développement', true),
  (gen_random_uuid(), 'Soutien scolaire', true);

insert into modules (id, name, domainid, isactive)
  select gen_random_uuid(), 'Français', id, true from domains where name = 'Langues';
insert into modules (id, name, domainid, isactive)
  select gen_random_uuid(), 'Anglais', id, true from domains where name = 'Langues';
insert into modules (id, name, domainid, isactive)
  select gen_random_uuid(), 'Arabe', id, true from domains where name = 'Langues';
insert into modules (id, name, domainid, isactive)
  select gen_random_uuid(), 'Espagnol', id, true from domains where name = 'Langues';
insert into modules (id, name, domainid, isactive)
  select gen_random_uuid(), 'Python', id, true from domains where name = 'Informatique';
insert into modules (id, name, domainid, isactive)
  select gen_random_uuid(), 'Développement Web', id, true from domains where name = 'Développement';
insert into modules (id, name, domainid, isactive)
  select gen_random_uuid(), 'Développement Mobile', id, true from domains where name = 'Développement';
insert into modules (id, name, domainid, isactive)
  select gen_random_uuid(), 'Robotique', id, true from domains where name = 'Robotique';
insert into modules (id, name, domainid, isactive)
  select gen_random_uuid(), 'Mathématiques', id, true from domains where name = 'Soutien scolaire';
insert into modules (id, name, domainid, isactive)
  select gen_random_uuid(), 'Physique-Chimie', id, true from domains where name = 'Soutien scolaire';


-- ============================================================
-- MIGRATION : Système de statuts, audit, absences, vacances
-- ============================================================

-- 1. (DÉPRÉCIÉ) champs status/replaced_by/replaces : appartenaient au modèle weekly_entries,
--    remplacé par session_masters / session_exceptions (migration_session_masters.sql).

-- 2. Table d'audit
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('create', 'update', 'delete', 'cancel', 'restore', 'publish')),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  user_name text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_date ON audit_log (created_at DESC);

-- 3. Table des absences formateurs
CREATE TABLE IF NOT EXISTS professor_absences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professorid uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date_start date NOT NULL,
  date_end date NOT NULL,
  reason text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  replacement_professorid uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prof_absences_prof ON professor_absences (professorid);
CREATE INDEX IF NOT EXISTS idx_prof_absences_dates ON professor_absences (date_start, date_end);

-- 4. Table des jours fériés / vacances
CREATE TABLE IF NOT EXISTS holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  date_start date NOT NULL,
  date_end date NOT NULL,
  type text NOT NULL DEFAULT 'holiday' CHECK (type IN ('holiday', 'vacation', 'bridge', 'event')),
  isactive boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_holidays_dates ON holidays (date_start, date_end);

-- 5. RLS pour les nouvelles tables
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE professor_absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

-- Audit log : admin peut tout voir, autres users ne voient que leurs propres entrées
CREATE POLICY "audit_admin_all" ON audit_log FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);
CREATE POLICY "audit_user_read" ON audit_log FOR SELECT USING (
  user_id = auth.uid()
);

-- Professor absences : admin CRUD, prof peut voir les siennes
CREATE POLICY "absences_admin_all" ON professor_absences FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);
CREATE POLICY "absences_prof_read" ON professor_absences FOR SELECT USING (
  professorid = auth.uid()
);

-- Holidays : tout le monde peut lire, admin peut modifier
CREATE POLICY "holidays_read" ON holidays FOR SELECT USING (true);
CREATE POLICY "holidays_admin_all" ON holidays FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);


-- ============================================================
-- RPCs (DÉPRÉCIÉ)
-- ============================================================
-- Les RPCs insert_entry_atomic / delete_cascade / publish_week opéraient sur le modèle
-- weekly_entries, remplacé par les séries récurrentes (session_masters / session_exceptions).
-- Les nouvelles RPCs (create_series, edit_occurrence, delete_occurrence, edit_series_from_date,
-- delete_series_from_date, archive_series, project_week) sont définies dans
-- migration_session_masters.sql. Le nettoyage de ces objets en base existante est fourni par
-- migration_session_masters_cleanup.sql.
