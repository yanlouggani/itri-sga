-- ============================================================
-- ITRI Academy — MIGRATION : Modèle "Session Master"
-- ============================================================
-- Remplace le modèle weekly_entries par un modèle de séries récurrentes
-- + exceptions (aligné sur le backend mobile, spec emploi du temps).
--
-- Principe :
--   - session_masters    : une série hebdomadaire (jour + créneau + prof +
--                          salle + groupe + module), bornée dans le temps.
--   - session_exceptions : dérogations ponctuelles (DELETED / MODIFIED)
--                          appliquées à une occurrence précise d'une série.
--   - Aucune ligne matérialisée par semaine : les occurrences d'une semaine
--     sont projetées à la lecture (fonction project_week, voir plus bas).
--
-- À appliquer après migration.sql (la table users, la fonction user_role()
-- et le helper des politiques doivent déjà exister).

-- ============================================================
-- 1. TABLE session_masters (séries récurrentes)
-- ============================================================

create table if not exists session_masters (
  id uuid primary key default gen_random_uuid(),
  series_key text not null,
  parent_master_id uuid references session_masters(id) on delete set null,
  moduleid uuid not null references modules(id) on delete set null,
  professorid uuid not null references users(id) on delete set null,
  groupid uuid not null references groups(id) on delete cascade,
  roomid uuid not null references rooms(id) on delete set null,
  weekday int not null check (weekday between 0 and 6),
  starttime time not null,
  endtime time not null,
  check (endtime > starttime),
  effective_start_date date not null,
  effective_end_date date,
  check (effective_end_date is null or effective_end_date >= effective_start_date),
  status text not null default 'active' check (status in ('active', 'archived')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_session_masters_series on session_masters(series_key);
create index if not exists idx_session_masters_module on session_masters(moduleid);
create index if not exists idx_session_masters_prof on session_masters(professorid);
create index if not exists idx_session_masters_group on session_masters(groupid);
create index if not exists idx_session_masters_room on session_masters(roomid);
create index if not exists idx_session_masters_period on session_masters(weekday, effective_start_date, effective_end_date);

-- ============================================================
-- 2. TABLE session_exceptions (dérogations ponctuelles)
-- ============================================================

create table if not exists session_exceptions (
  id uuid primary key default gen_random_uuid(),
  master_id uuid not null references session_masters(id) on delete cascade,
  occurrence_date date not null,
  type text not null check (type in ('deleted', 'modified')),
  original_date date not null,
  original_start_time time not null,
  original_end_time time not null,
  override_date date,
  override_start_time time,
  override_end_time time,
  override_moduleid uuid references modules(id) on delete set null,
  override_professorid uuid references users(id) on delete set null,
  override_groupid uuid references groups(id) on delete set null,
  override_roomid uuid references rooms(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (master_id, occurrence_date)
);

create index if not exists idx_session_exceptions_date on session_exceptions(occurrence_date);
create index if not exists idx_session_exceptions_type on session_exceptions(type);

-- ============================================================
-- 3. TRIGGERS : mise à jour de updated_at
-- ============================================================

create or replace function touch_session_master()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_session_master_update on session_masters;
create trigger on_session_master_update
  before update on session_masters
  for each row
  execute function touch_session_master();

create or replace function touch_session_exception()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_session_exception_update on session_exceptions;
create trigger on_session_exception_update
  before update on session_exceptions
  for each row
  execute function touch_session_exception();

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================

alter table session_masters enable row level security;
alter table session_exceptions enable row level security;

-- Admins : tout voir / tout modifier (CRUD complet via RPC)
create policy "Admins full access" on session_masters
  for all using (user_role() = 'admin');

create policy "Admins full access" on session_exceptions
  for all using (user_role() = 'admin');

-- Professeurs : lecture de leurs propres séries (liste + conflits)
create policy "Professors read session_masters" on session_masters
  for select using (
    user_role() = 'professor' and professorid = auth.uid()
  );

create policy "Professors read session_exceptions" on session_exceptions
  for select using (
    user_role() = 'professor'
    and exists (
      select 1 from session_masters sm
      where sm.id = session_exceptions.master_id
        and sm.professorid = auth.uid()
    )
  );

-- Étudiants : lecture des séries de leurs groupes
create policy "Students read session_masters" on session_masters
  for select using (
    exists (
      select 1 from enrollments e
      where e.studentid = auth.uid()
        and e.status = 'active'
        and e.groupid = session_masters.groupid
    )
  );

create policy "Students read session_exceptions" on session_exceptions
  for select using (
    exists (
      select 1 from session_masters sm
      join enrollments e
        on e.studentid = auth.uid()
       and e.status = 'active'
       and e.groupid = sm.groupid
      where sm.id = session_exceptions.master_id
    )
  );

-- NOTE : la projection semaine (project_week) est exposée via une fonction
-- SECURITY DEFINER : elle est autorisée pour tous les utilisateurs
-- authentifiés et applique les mêmes règles de visibilité (prof des séries,
-- étudiants inscrits, admins).

-- ============================================================
-- 5. PROJECTION SEMAINE : project_week
-- ============================================================
-- Transpose generateWeeklyOccurrences() du backend mobile.
-- À partir d'une date quelconque de la semaine, normalise au lundi
-- (weekStartsOn = 1) puis projette toutes les occurrences :
--   - séries actives couvrant la semaine (bornes effective_start/end_date) ;
--   - exceptions DELETED retirées, MODIFIED appliquées (heure, date de
--     report, prof, salle, groupe, module en remplacement) ;
--   - report d'une occurrence SORTANT de la semaine vers une date DANS la
--     semaine géré explicitement (amélioration vs backend mobile qui charge
--     uniquement les exceptions dont la date d'origine est dans la semaine).
-- Retourne une ligne jsonb par occurrence (clés camelCase, identiques au
-- contrat mobile).

create or replace function project_week(p_week_start date, p_groupid uuid default null)
returns setof jsonb
language plpgsql
security definer
as $$
declare
  v_week_start date := p_week_start - (extract(dow from p_week_start)::int);
  v_week_end date := v_week_start + 6;
  v_role text;
  v_master record;
  v_day date;
  v_exc record;
  v_visible boolean;
begin
  v_role := public.user_role();

  create temp table if not exists tmp_occurrence (
    master_id uuid,
    series_key text,
    occurrence_date date,
    original_date date,
    original_start_time text,
    original_end_time text,
    start_time text,
    end_time text,
    module_id uuid,
    professor_id uuid,
    group_id uuid,
    room_id uuid,
    weekday int,
    exception_id uuid,
    source_type text
  ) on commit drop;

  truncate tmp_occurrence;

  -- Passe 1 : occurrences régulières de la semaine (avec exception éventuelle)
  for v_master in
    select sm.*
    from session_masters sm
    where sm.status = 'active'
      and sm.effective_start_date <= v_week_end
      and (sm.effective_end_date is null or sm.effective_end_date >= v_week_start)
      and (p_groupid is null or sm.groupid = p_groupid)
      and (
        v_role = 'admin'
        or (v_role = 'professor' and sm.professorid = auth.uid())
        or (v_role = 'student' and exists (
              select 1 from enrollments e
              where e.studentid = auth.uid()
                and e.status = 'active'
                and e.groupid = sm.groupid
            ))
      )
  loop
    for v_day in select v_week_start + s as d from generate_series(0, 6) s
    loop
      if extract(dow from v_day)::int <> v_master.weekday then continue; end if;
      if v_day < v_master.effective_start_date then continue; end if;
      if v_master.effective_end_date is not null and v_day > v_master.effective_end_date then continue; end if;

      select se.id, se.type,
             se.override_date, se.override_start_time, se.override_end_time,
             se.override_moduleid, se.override_professorid, se.override_groupid, se.override_roomid
        into v_exc
        from session_exceptions se
        where se.master_id = v_master.id
          and se.occurrence_date = v_day;

      if v_exc.id is not null and v_exc.type = 'deleted' then continue; end if;

      -- Occurrence reportée hors de la semaine : elle n'appartient plus à
      -- cette projection (elle apparaîtra dans la semaine du report).
      if coalesce(v_exc.override_date, v_day) not between v_week_start and v_week_end then
        continue;
      end if;

      insert into tmp_occurrence (
        master_id, series_key, occurrence_date, original_date,
        original_start_time, original_end_time, start_time, end_time,
        module_id, professor_id, group_id, room_id, weekday, exception_id, source_type
      ) values (
        v_master.id, v_master.series_key,
        coalesce(v_exc.override_date, v_day), v_day,
        to_char(v_master.starttime, 'HH24:MI'), to_char(v_master.endtime, 'HH24:MI'),
        coalesce(to_char(v_exc.override_start_time, 'HH24:MI'), to_char(v_master.starttime, 'HH24:MI')),
        coalesce(to_char(v_exc.override_end_time, 'HH24:MI'), to_char(v_master.endtime, 'HH24:MI')),
        coalesce(v_exc.override_moduleid, v_master.moduleid),
        coalesce(v_exc.override_professorid, v_master.professorid),
        coalesce(v_exc.override_groupid, v_master.groupid),
        coalesce(v_exc.override_roomid, v_master.roomid),
        v_master.weekday,
        v_exc.id,
        case when v_exc.id is null then 'master' else 'exception' end
      );
    end loop;
  end loop;

  -- Passe 2 : occurrences REPORTÉES dans cette semaine depuis une date hors
  -- de la semaine (exception MODIFIED dont la date d'origine est ailleurs).
  for v_exc in
    select se.id, se.master_id, se.occurrence_date, se.override_date,
           se.original_start_time, se.original_end_time,
           se.override_start_time, se.override_end_time,
           se.override_moduleid, se.override_professorid, se.override_groupid, se.override_roomid,
           sm.series_key, sm.starttime, sm.endtime, sm.moduleid, sm.professorid,
           sm.groupid, sm.roomid, sm.weekday
    from session_exceptions se
    join session_masters sm on sm.id = se.master_id
    where se.type = 'modified'
      and se.override_date is not null
      and se.override_date between v_week_start and v_week_end
      and (se.occurrence_date < v_week_start or se.occurrence_date > v_week_end)
      and sm.status = 'active'
      and sm.effective_start_date <= v_week_end
      and (sm.effective_end_date is null or sm.effective_end_date >= v_week_start)
      and (p_groupid is null or sm.groupid = p_groupid)
      and (
        v_role = 'admin'
        or (v_role = 'professor' and sm.professorid = auth.uid())
        or (v_role = 'student' and exists (
              select 1 from enrollments e
              where e.studentid = auth.uid()
                and e.status = 'active'
                and e.groupid = sm.groupid
            ))
      )
  loop
    -- Garde anti-doublon (miroir de alreadyProjected côté mobile)
    if exists (
      select 1 from tmp_occurrence t
      where t.master_id = v_exc.master_id
        and t.original_date = v_exc.occurrence_date
    ) then
      continue;
    end if;

    insert into tmp_occurrence (
      master_id, series_key, occurrence_date, original_date,
      original_start_time, original_end_time, start_time, end_time,
      module_id, professor_id, group_id, room_id, weekday, exception_id, source_type
    ) values (
      v_exc.master_id, v_exc.series_key,
      v_exc.override_date, v_exc.occurrence_date,
      to_char(v_exc.original_start_time, 'HH24:MI'), to_char(v_exc.original_end_time, 'HH24:MI'),
      coalesce(to_char(v_exc.override_start_time, 'HH24:MI'), to_char(v_exc.starttime, 'HH24:MI')),
      coalesce(to_char(v_exc.override_end_time, 'HH24:MI'), to_char(v_exc.endtime, 'HH24:MI')),
      coalesce(v_exc.override_moduleid, v_exc.moduleid),
      coalesce(v_exc.override_professorid, v_exc.professorid),
      coalesce(v_exc.override_groupid, v_exc.groupid),
      coalesce(v_exc.override_roomid, v_exc.roomid),
      v_exc.weekday,
      v_exc.id,
      'exception'
    );
  end loop;

  return query
    select jsonb_build_object(
      'id', case when t.exception_id is null
                 then t.master_id::text || ':' || t.original_date::text
                 else t.master_id::text || ':' || t.original_date::text || ':' || t.exception_id::text
            end,
      'masterId', t.master_id,
      'seriesKey', t.series_key,
      'occurrenceDate', t.occurrence_date::text,
      'originalDate', t.original_date::text,
      'originalStartTime', t.original_start_time,
      'originalEndTime', t.original_end_time,
      'startTime', t.start_time,
      'endTime', t.end_time,
      'moduleId', t.module_id,
      'professorId', t.professor_id,
      'groupId', t.group_id,
      'roomId', t.room_id,
      'weekday', t.weekday,
      'status', 'scheduled',
      'sourceType', t.source_type,
      'exceptionId', t.exception_id,
      'moduleName', coalesce(m.name, ''),
      'professorName', coalesce(p.firstname || ' ' || p.lastname, ''),
      'groupName', coalesce(g.name, ''),
      'roomName', coalesce(r.name, ''),
      'capacity', coalesce(r.capacity, 0)
    )
    from tmp_occurrence t
    left join modules m on m.id = t.module_id
    left join users p on p.id = t.professor_id
    left join groups g on g.id = t.group_id
    left join rooms r on r.id = t.room_id
    order by t.occurrence_date, t.start_time, t.master_id;
end;
$$;

-- ============================================================
-- 6. MOTEUR DE CONFLITS DURS : assert_no_occurrence_conflict
-- ============================================================
-- Transpose assertNoConflict() du backend mobile (spec §5 et §10).
-- Pour une occurrence candidate (master + date + créneau + prof/salle/
-- groupe), vérifie qu'aucune occurrence projetée existante ne chevauche :
--   - même professeur  → CONFLICT_TEACHER
--   - même salle       → CONFLICT_ROOM
--   - même groupe      → CONFLICT_GROUP
-- L'occurrence elle-même (même master + même date d'origine) est ignorée.
-- Appliqué automatiquement par des triggers (INSERT/UPDATE) : aucune requête
-- directe ne peut créer un chevauchement (spec §10).
-- L'erreur levée porte le code comme préfixe "CODE|message" pour permettre
-- au client de mapper facilement sur CONFLICT_TEACHER/ROOM/GROUP.

create or replace function times_overlap(a_start time, a_end time, b_start time, b_end time)
returns boolean
language sql
immutable
as $$
  select a_start < b_end and b_start < a_end;
$$;

create or replace function assert_no_occurrence_conflict(
  p_master_id uuid,
  p_original_date date,
  p_occurrence_date date,
  p_start_time time,
  p_end_time time,
  p_professor_id uuid,
  p_room_id uuid,
  p_group_id uuid,
  p_ignore_exception_id uuid default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_occ jsonb;
begin
  for v_occ in select * from public.project_week(p_occurrence_date, null)
  loop
    if (v_occ->>'masterId')::uuid = p_master_id
       and (v_occ->>'originalDate')::text = p_original_date::text then
      continue;
    end if;
    if p_ignore_exception_id is not null
       and (v_occ->>'exceptionId')::uuid = p_ignore_exception_id then
      continue;
    end if;
    if (v_occ->>'occurrenceDate')::text <> p_occurrence_date::text then
      continue;
    end if;
    if not times_overlap(
      p_start_time, p_end_time,
      (v_occ->>'startTime')::time, (v_occ->>'endTime')::time
    ) then
      continue;
    end if;

    if p_professor_id is not null and (v_occ->>'professorId')::uuid = p_professor_id then
      raise exception 'CONFLICT_TEACHER|Professeur déjà occupé sur ce créneau (% % - %)',
        (v_occ->>'startTime'), (v_occ->>'endTime'), (v_occ->>'moduleName');
    end if;
    if p_room_id is not null and (v_occ->>'roomId')::uuid = p_room_id then
      raise exception 'CONFLICT_ROOM|Salle déjà occupée sur ce créneau';
    end if;
    if p_group_id is not null and (v_occ->>'groupId')::uuid = p_group_id then
      raise exception 'CONFLICT_GROUP|Groupe a déjà un cours sur ce créneau';
    end if;
  end loop;
end;
$$;

-- Trigger : aucune série active ne peut créer de chevauchement
-- Vérifie la première occurrence de la série (miroir de createSeries/editSeriesFromDate).
create or replace function enforce_master_no_conflict()
returns trigger
language plpgsql
security definer
as $$
declare
  v_first_date date;
begin
  if new.status <> 'active' then return new; end if;

  -- première date >= effective_start_date dont le jour correspond au weekday
  v_first_date := new.effective_start_date
    + ((new.weekday - extract(dow from new.effective_start_date)::int + 7) % 7);

  perform public.assert_no_occurrence_conflict(
    new.id, v_first_date, v_first_date,
    new.starttime, new.endtime, new.professorid, new.roomid, new.groupid
  );

  return new;
end;
$$;

drop trigger if exists enforce_master_no_conflict_trigger on session_masters;
create trigger enforce_master_no_conflict_trigger
  before insert or update of status, weekday, starttime, endtime,
    professorid, roomid, groupid, effective_start_date, effective_end_date
  on session_masters
  for each row
  execute function enforce_master_no_conflict();

-- Trigger : aucune exception MODIFIED ne peut créer de chevauchement
-- (les DELETED retirent simplement une occurrence : aucun contrôle).
create or replace function enforce_exception_no_conflict()
returns trigger
language plpgsql
security definer
as $$
declare
  v_master record;
  v_occ_date date;
  v_start_time time;
  v_end_time time;
  v_prof uuid;
  v_room uuid;
  v_grp uuid;
begin
  if new.type = 'deleted' then return new; end if;

  select * into v_master from session_masters where id = new.master_id;
  if not found then return new; end if;

  v_occ_date := coalesce(new.override_date, new.occurrence_date);
  v_start_time := coalesce(new.override_start_time, v_master.starttime);
  v_end_time := coalesce(new.override_end_time, v_master.endtime);
  v_prof := coalesce(new.override_professorid, v_master.professorid);
  v_room := coalesce(new.override_roomid, v_master.roomid);
  v_grp := coalesce(new.override_groupid, v_master.groupid);

  perform public.assert_no_occurrence_conflict(
    new.master_id, new.occurrence_date, v_occ_date,
    v_start_time, v_end_time, v_prof, v_room, v_grp,
    p_ignore_exception_id => new.id
  );

  return new;
end;
$$;

drop trigger if exists enforce_exception_no_conflict_trigger on session_exceptions;
create trigger enforce_exception_no_conflict_trigger
  before insert or update of type, occurrence_date, override_date,
    override_start_time, override_end_time, override_moduleid,
    override_professorid, override_groupid, override_roomid
  on session_exceptions
  for each row
  execute function enforce_exception_no_conflict();

-- ============================================================
-- 7. RPC CRUD : séries + occurrences + split + archive
-- ============================================================
-- Transpose RecurringSessionService du backend mobile. Toutes les fonctions
-- sont SECURITY DEFINER et réservées aux administrateurs (require_admin).
-- Le contrôle des conflits est délégué aux triggers (§6) : toute écriture
-- invalide est rejetée atomiquement par la base.

create or replace function require_admin()
returns void
language plpgsql
security definer
as $$
begin
  if public.user_role() <> 'admin' then
    raise exception 'FORBIDDEN|Accès réservé aux administrateurs';
  end if;
end;
$$;

-- Sérialisation d'une série
create or replace function master_to_json(p_id uuid)
returns jsonb
language sql
security definer
stable
as $$
  select jsonb_build_object(
    'id', sm.id,
    'seriesKey', sm.series_key,
    'parentMasterId', sm.parent_master_id,
    'moduleId', sm.moduleid,
    'professorId', sm.professorid,
    'groupId', sm.groupid,
    'roomId', sm.roomid,
    'weekday', sm.weekday,
    'startTime', to_char(sm.starttime, 'HH24:MI'),
    'endTime', to_char(sm.endtime, 'HH24:MI'),
    'effectiveStartDate', sm.effective_start_date::text,
    'effectiveEndDate', sm.effective_end_date::text,
    'status', sm.status,
    'archivedAt', sm.archived_at,
    'moduleName', coalesce(m.name, ''),
    'professorName', coalesce(p.firstname || ' ' || p.lastname, ''),
    'groupName', coalesce(g.name, ''),
    'roomName', coalesce(r.name, '')
  )
  from session_masters sm
  left join modules m on m.id = sm.moduleid
  left join users p on p.id = sm.professorid
  left join groups g on g.id = sm.groupid
  left join rooms r on r.id = sm.roomid
  where sm.id = p_id;
$$;

-- Sérialisation d'une exception
create or replace function exception_to_json(p_id uuid)
returns jsonb
language sql
security definer
stable
as $$
  select jsonb_build_object(
    'id', se.id,
    'masterId', se.master_id,
    'occurrenceDate', se.occurrence_date::text,
    'type', se.type,
    'originalDate', se.original_date::text,
    'originalStartTime', to_char(se.original_start_time, 'HH24:MI'),
    'originalEndTime', to_char(se.original_end_time, 'HH24:MI'),
    'overrideDate', case when se.override_date is null then null else se.override_date::text end,
    'overrideStartTime', case when se.override_start_time is null then null else to_char(se.override_start_time, 'HH24:MI') end,
    'overrideEndTime', case when se.override_end_time is null then null else to_char(se.override_end_time, 'HH24:MI') end,
    'overrideModuleId', se.override_moduleid,
    'overrideProfessorId', se.override_professorid,
    'overrideGroupId', se.override_groupid,
    'overrideRoomId', se.override_roomid,
    'note', se.note
  )
  from session_exceptions se
  where se.id = p_id;
$$;

-- ------------------------------------------------------------
-- create_series : crée une série récurrente (status 'active').
-- Conflits contrôlés par le trigger enforce_master_no_conflict
-- (première occurrence projetée de la série).
-- ------------------------------------------------------------
create or replace function create_series(
  p_moduleid uuid,
  p_professorid uuid,
  p_groupid uuid,
  p_roomid uuid,
  p_weekday int,
  p_start_time time,
  p_end_time time,
  p_effective_start_date date,
  p_effective_end_date date default null,
  p_series_key text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_series_key text;
  v_id uuid;
begin
  perform public.require_admin();

  if p_moduleid is null or p_professorid is null or p_groupid is null
     or p_roomid is null or p_weekday is null or p_start_time is null
     or p_end_time is null or p_effective_start_date is null then
    raise exception 'INVALID_SCOPE|Champs obligatoires manquants';
  end if;
  if p_weekday not between 0 and 6 then
    raise exception 'INVALID_SCOPE|Jour de semaine invalide';
  end if;
  if p_end_time <= p_start_time then
    raise exception 'INVALID_SCOPE|L''heure de fin doit être postérieure au début';
  end if;
  if p_effective_end_date is not null and p_effective_end_date < p_effective_start_date then
    raise exception 'INVALID_SCOPE|La date de fin est antérieure au début';
  end if;

  v_series_key := coalesce(
    p_series_key,
    'series_' || floor(extract(epoch from clock_timestamp()) * 1000)::text
      || '_' || substr(md5(random()::text), 1, 6)
  );

  insert into session_masters (
    series_key, moduleid, professorid, groupid, roomid, weekday,
    starttime, endtime, effective_start_date, effective_end_date
  ) values (
    v_series_key, p_moduleid, p_professorid, p_groupid, p_roomid, p_weekday,
    p_start_time, p_end_time, p_effective_start_date, p_effective_end_date
  )
  returning id into v_id;

  return public.master_to_json(v_id);
end;
$$;

-- ------------------------------------------------------------
-- edit_occurrence : modifie une occurrence précise (exception
-- MODIFIED, upsert). Verrouille les occurrences passées.
-- ------------------------------------------------------------
create or replace function edit_occurrence(
  p_master_id uuid,
  p_occurrence_date date,
  p_override_date date default null,
  p_start_time time default null,
  p_end_time time default null,
  p_moduleid uuid default null,
  p_professorid uuid default null,
  p_groupid uuid default null,
  p_roomid uuid default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_master record;
  v_id uuid;
begin
  perform public.require_admin();

  select * into v_master from session_masters where id = p_master_id;
  if not found then
    raise exception 'SERIES_NOT_FOUND|Série introuvable';
  end if;

  if p_occurrence_date < current_date then
    raise exception 'PAST_OCCURRENCE_LOCKED|Les séances passées sont verrouillées';
  end if;

  insert into session_exceptions (
    master_id, occurrence_date, type, original_date,
    original_start_time, original_end_time,
    override_date, override_start_time, override_end_time,
    override_moduleid, override_professorid, override_groupid, override_roomid, note
  ) values (
    p_master_id, p_occurrence_date, 'modified', p_occurrence_date,
    v_master.starttime, v_master.endtime,
    p_override_date, p_start_time, p_end_time,
    p_moduleid, p_professorid, p_groupid, p_roomid, p_note
  )
  on conflict (master_id, occurrence_date) do update set
    type = 'modified',
    override_date = excluded.override_date,
    override_start_time = excluded.override_start_time,
    override_end_time = excluded.override_end_time,
    override_moduleid = excluded.override_moduleid,
    override_professorid = excluded.override_professorid,
    override_groupid = excluded.override_groupid,
    override_roomid = excluded.override_roomid,
    note = excluded.note,
    updated_at = now()
  returning id into v_id;

  return public.exception_to_json(v_id);
end;
$$;

-- ------------------------------------------------------------
-- delete_occurrence : annule une occurrence précise (exception
-- DELETED). Verrouille les occurrences passées.
-- ------------------------------------------------------------
create or replace function delete_occurrence(
  p_master_id uuid,
  p_occurrence_date date,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_master record;
  v_id uuid;
begin
  perform public.require_admin();

  select * into v_master from session_masters where id = p_master_id;
  if not found then
    raise exception 'SERIES_NOT_FOUND|Série introuvable';
  end if;

  if p_occurrence_date < current_date then
    raise exception 'PAST_OCCURRENCE_LOCKED|Les séances passées sont verrouillées';
  end if;

  insert into session_exceptions (
    master_id, occurrence_date, type, original_date,
    original_start_time, original_end_time,
    override_date, override_start_time, override_end_time,
    override_moduleid, override_professorid, override_groupid, override_roomid, note
  ) values (
    p_master_id, p_occurrence_date, 'deleted', p_occurrence_date,
    v_master.starttime, v_master.endtime,
    null, null, null,
    null, null, null, null, p_note
  )
  on conflict (master_id, occurrence_date) do update set
    type = 'deleted',
    override_date = null,
    override_start_time = null,
    override_end_time = null,
    override_moduleid = null,
    override_professorid = null,
    override_groupid = null,
    override_roomid = null,
    note = excluded.note,
    updated_at = now()
  returning id into v_id;

  return public.exception_to_json(v_id);
end;
$$;

-- ------------------------------------------------------------
-- edit_series_from_date : applique des changements à une série
-- à partir d'une date pivot.
--   - from_date == effective_start_date : mise à jour directe ;
--   - sinon : split — la série courante est clôturée la veille
--     de from_date et une nouvelle série (parent_master_id)
--     reprend avec les changements.
-- ------------------------------------------------------------
create or replace function edit_series_from_date(
  p_master_id uuid,
  p_from_date date,
  p_moduleid uuid default null,
  p_professorid uuid default null,
  p_groupid uuid default null,
  p_roomid uuid default null,
  p_weekday int default null,
  p_start_time time default null,
  p_end_time time default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_master record;
  v_is_direct boolean;
  v_child_id uuid;
begin
  perform public.require_admin();

  select * into v_master from session_masters where id = p_master_id;
  if not found then
    raise exception 'SERIES_NOT_FOUND|Série introuvable';
  end if;

  if p_from_date < current_date then
    raise exception 'PAST_OCCURRENCE_LOCKED|Les séances passées sont verrouillées';
  end if;

  v_is_direct := (p_from_date <= v_master.effective_start_date);

  if v_is_direct then
    update session_masters set
      moduleid = coalesce(p_moduleid, moduleid),
      professorid = coalesce(p_professorid, professorid),
      groupid = coalesce(p_groupid, groupid),
      roomid = coalesce(p_roomid, roomid),
      weekday = coalesce(p_weekday, weekday),
      starttime = coalesce(p_start_time, starttime),
      endtime = coalesce(p_end_time, endtime),
      updated_at = now()
    where id = p_master_id;

    return jsonb_build_object(
      'master', public.master_to_json(p_master_id),
      'split', false,
      'predecessor', null
    );
  end if;

  -- Split : la série actuelle s'arrête la veille de la date pivot
  update session_masters
  set effective_end_date = p_from_date - 1,
      updated_at = now()
  where id = p_master_id;

  -- Nouvelle série (filiale) à partir de la date pivot
  insert into session_masters (
    series_key, parent_master_id, moduleid, professorid, groupid, roomid, weekday,
    starttime, endtime, effective_start_date, effective_end_date
  ) values (
    v_master.series_key, v_master.id,
    coalesce(p_moduleid, v_master.moduleid),
    coalesce(p_professorid, v_master.professorid),
    coalesce(p_groupid, v_master.groupid),
    coalesce(p_roomid, v_master.roomid),
    coalesce(p_weekday, v_master.weekday),
    coalesce(p_start_time, v_master.starttime),
    coalesce(p_end_time, v_master.endtime),
    p_from_date, null
  )
  returning id into v_child_id;

  return jsonb_build_object(
    'master', public.master_to_json(v_child_id),
    'split', true,
    'predecessor', public.master_to_json(p_master_id)
  );
end;
$$;

-- ------------------------------------------------------------
-- delete_series_from_date : clôture une série la veille de la
-- date pivot (les occurrences suivantes disparaissent).
-- ------------------------------------------------------------
create or replace function delete_series_from_date(p_master_id uuid, p_from_date date)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_master record;
  v_now timestamptz := now();
begin
  perform public.require_admin();

  select * into v_master from session_masters where id = p_master_id;
  if not found then
    raise exception 'SERIES_NOT_FOUND|Série introuvable';
  end if;

  if p_from_date < current_date then
    raise exception 'PAST_OCCURRENCE_LOCKED|Les séances passées sont verrouillées';
  end if;

  -- Suppression à partir de la toute première occurrence (ou avant) :
  -- rien ne subsiste avant la date pivot → la série (et ses filiales)
  -- est archivée au lieu de violer la contrainte effective_end_date >=
  -- effective_start_date.
  if p_from_date <= v_master.effective_start_date then
    update session_masters
    set status = 'archived',
        archived_at = v_now,
        effective_end_date = null,
        updated_at = v_now
    where series_key = v_master.series_key
      and status = 'active';

    return jsonb_build_object('master', null, 'archived', true);
  end if;

  update session_masters
  set effective_end_date = p_from_date - 1,
      updated_at = now()
  where id = p_master_id;

  return jsonb_build_object('master', public.master_to_json(p_master_id), 'archived', false);
end;
$$;

-- ------------------------------------------------------------
-- archive_series : archive toute la série (toutes ses filiales)
-- pour une série donnée.
-- ------------------------------------------------------------
create or replace function archive_series(p_master_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_master record;
  v_now timestamptz := now();
begin
  perform public.require_admin();

  select * into v_master from session_masters where id = p_master_id;
  if not found then
    raise exception 'SERIES_NOT_FOUND|Série introuvable';
  end if;

  update session_masters
  set status = 'archived',
      archived_at = v_now,
      updated_at = v_now
  where series_key = v_master.series_key
    and status = 'active';

  return jsonb_build_object(
    'seriesKey', v_master.series_key,
    'archivedAt', v_now,
    'masters', (
      select jsonb_agg(public.master_to_json(id))
      from session_masters
      where series_key = v_master.series_key
        and archived_at = v_now
    )
  );
end;
$$;
