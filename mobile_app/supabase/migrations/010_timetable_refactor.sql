-- ═══════════════════════════════════════════════════════════════
-- SGAU v2.1 — Refonte planning : time_slots + session_overrides
-- Ajouté : time_slots (référentiel), session_overrides (exceptions)
-- Colonnes : weeklyScheduleEntryId + sourceMode sur sessions
-- ═══════════════════════════════════════════════════════════════

-- ── 1. TIME_SLOTS : référentiel des créneaux ──
CREATE TABLE IF NOT EXISTS public.time_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "orderIndex" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.time_slots IS 'Créneaux horaires de référence utilisés dans le planning';

-- Insérer les créneaux standards (8h→20h, pas de 30min)
INSERT INTO public.time_slots (label, "startTime", "endTime", "orderIndex") VALUES
  ('08:00–09:30', '08:00', '09:30', 1),
  ('09:40–11:10', '09:40', '11:10', 2),
  ('11:20–12:50', '11:20', '12:50', 3),
  ('13:00–14:30', '13:00', '14:30', 4),
  ('14:40–16:10', '14:40', '16:10', 5),
  ('16:20–17:50', '16:20', '17:50', 6),
  ('18:00–19:30', '18:00', '19:30', 7)
ON CONFLICT DO NOTHING;

ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "time_slots_select" ON public.time_slots;
DROP POLICY IF EXISTS "time_slots_insert" ON public.time_slots;
DROP POLICY IF EXISTS "time_slots_update" ON public.time_slots;
DROP POLICY IF EXISTS "time_slots_delete" ON public.time_slots;

CREATE POLICY "time_slots_select" ON public.time_slots FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "time_slots_insert" ON public.time_slots FOR INSERT
  WITH CHECK (public.is_admin());
CREATE POLICY "time_slots_update" ON public.time_slots FOR UPDATE
  USING (public.is_admin());
CREATE POLICY "time_slots_delete" ON public.time_slots FOR DELETE
  USING (public.is_admin());

-- ── 2. SESSION_OVERRIDES : exceptions de planning ──
CREATE TABLE IF NOT EXISTS public.session_overrides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "scheduleEntryId" UUID NOT NULL REFERENCES public.weekly_schedule(id) ON DELETE CASCADE,
  "overrideDate" DATE NOT NULL,
  "overrideType" TEXT NOT NULL CHECK ("overrideType" IN ('cancel', 'move', 'room_change', 'teacher_change')),
  "newDayOfWeek" INTEGER CHECK ("newDayOfWeek" BETWEEN 0 AND 6),
  "newTimeSlotId" UUID REFERENCES public.time_slots(id),
  "newTeacherId" UUID REFERENCES public.users(id),
  "newRoomId" UUID REFERENCES public.rooms(id),
  reason TEXT,
  "createdBy" UUID NOT NULL REFERENCES public.users(id),
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  UNIQUE ("scheduleEntryId", "overrideDate", "overrideType")
);

COMMENT ON TABLE public.session_overrides IS 'Exceptions ponctuelles au planning hebdomadaire (annulation, déplacement, changement salle/enseignant)';

CREATE INDEX IF NOT EXISTS idx_session_overrides_date ON public.session_overrides("overrideDate");
CREATE INDEX IF NOT EXISTS idx_session_overrides_entry ON public.session_overrides("scheduleEntryId");

ALTER TABLE public.session_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session_overrides_select" ON public.session_overrides;
DROP POLICY IF EXISTS "session_overrides_insert" ON public.session_overrides;
DROP POLICY IF EXISTS "session_overrides_update" ON public.session_overrides;
DROP POLICY IF EXISTS "session_overrides_delete" ON public.session_overrides;

CREATE POLICY "session_overrides_select" ON public.session_overrides FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "session_overrides_insert" ON public.session_overrides FOR INSERT
  WITH CHECK (public.is_admin());
CREATE POLICY "session_overrides_update" ON public.session_overrides FOR UPDATE
  USING (public.is_admin());
CREATE POLICY "session_overrides_delete" ON public.session_overrides FOR DELETE
  USING (public.is_admin());

-- ── 3. Ajouter des colonnes à weekly_schedule ──
ALTER TABLE IF EXISTS public.weekly_schedule
  ADD COLUMN IF NOT EXISTS "timeSlotId" UUID REFERENCES public.time_slots(id),
  ADD COLUMN IF NOT EXISTS "versionNo" INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "createdBy" UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS "updatedBy" UUID REFERENCES public.users(id);

COMMENT ON COLUMN public.weekly_schedule."versionNo"   IS 'Incrémenté à chaque modification (nouvelle version)';
COMMENT ON COLUMN public.weekly_schedule."timeSlotId"   IS 'Créneau de référence (optionnel, startTime/endTime restent la source)';
COMMENT ON COLUMN public.weekly_schedule."createdBy"    IS 'Admin qui a créé l''entrée';
COMMENT ON COLUMN public.weekly_schedule."updatedBy"    IS 'Admin qui a modifié l''entrée';

-- Rendre groupId obligatoire (plus de planning sans groupe)
-- Les CM sont planifiés par section → on garde sectionId optionnel
-- Mais groupId devient la clé centrale
ALTER TABLE public.weekly_schedule ALTER COLUMN "groupId" DROP NOT NULL;
ALTER TABLE public.weekly_schedule ALTER COLUMN "sectionId" DROP NOT NULL;

-- ── 4. Ajouter des colonnes à sessions ──
ALTER TABLE IF EXISTS public.sessions
  ADD COLUMN IF NOT EXISTS "weeklyScheduleEntryId" UUID REFERENCES public.weekly_schedule(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "sourceMode" TEXT DEFAULT 'realtime'
    CHECK ("sourceMode" IN ('realtime', 'retroactive', 'override', 'manual')),
  ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "startedBy" UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS "closedBy" UUID REFERENCES public.users(id);

COMMENT ON COLUMN public.sessions."weeklyScheduleEntryId" IS 'Lien vers le créneau planning qui a généré cette séance';
COMMENT ON COLUMN public.sessions."sourceMode" IS 'Comment la séance a été créée : realtime, retroactive, override, manual';
COMMENT ON COLUMN public.sessions."startedAt" IS 'Moment où le professeur a démarré la séance';
COMMENT ON COLUMN public.sessions."closedAt" IS 'Moment où le professeur a clôturé la séance';
COMMENT ON COLUMN public.sessions."startedBy" IS 'Professeur qui a démarré';
COMMENT ON COLUMN public.sessions."closedBy" IS 'Professeur qui a clôturé';

CREATE INDEX IF NOT EXISTS idx_sessions_weekly_entry ON public.sessions("weeklyScheduleEntryId");

-- ── 5. Ajouter source à attendance ──
ALTER TABLE IF EXISTS public.attendance
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual'
    CHECK (source IN ('manual', 'qr', 'import', 'system'));

-- ── 6. Mettre à jour start_session ──
-- Ajoute weeklyScheduleEntryId + sourceMode = 'realtime' + startedAt/startedBy
CREATE OR REPLACE FUNCTION public.start_session(
  p_session_id UUID DEFAULT NULL,
  p_date DATE DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_session RECORD;
  v_sched RECORD;
  v_group_id UUID;
  v_new_id UUID;
  v_target_date DATE;
BEGIN
  v_target_date := COALESCE(p_date, CURRENT_DATE);

  -- 1. Si un session_id est fourni, l'activer
  IF p_session_id IS NOT NULL THEN
    SELECT id, status, "professorId" INTO v_session FROM public.sessions WHERE id = p_session_id;
    IF FOUND THEN
      IF v_session."professorId" <> auth.uid() THEN
        RAISE EXCEPTION 'Cette séance ne vous appartient pas';
      END IF;
      UPDATE public.sessions
        SET status = 'active',
            "currentQrToken" = md5(random()::text || clock_timestamp()::text) || md5(random()::text || clock_timestamp()::text),
            "qrTokenExpiresAt" = now() + interval '8 seconds',
            "startedAt" = COALESCE("startedAt", now()),
            "startedBy" = COALESCE("startedBy", auth.uid())
      WHERE id = p_session_id;
      PERFORM public.populate_session_attendance(p_session_id);
      RETURN p_session_id;
    END IF;
  END IF;

  -- 2. Chercher une entrée weekly_schedule valide à la date cible
  SELECT ws.* INTO v_sched
  FROM public.weekly_schedule ws
  WHERE ws."professorId" = auth.uid()
    AND ws."dayOfWeek" = EXTRACT(DOW FROM v_target_date)::INTEGER
    AND ws."validFrom" <= v_target_date
    AND (ws."validTo" IS NULL OR ws."validTo" >= v_target_date)
    AND ws."isActive" = true
  ORDER BY ws."startTime"
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aucune séance programmée pour cette date';
  END IF;

  -- 3. Déterminer le groupe cible
  IF v_sched."sessionType" = 'CM' THEN
    SELECT id INTO v_group_id FROM public.groups
    WHERE "sectionId" = v_sched."sectionId" AND "isActive" = true
    ORDER BY name LIMIT 1;
  ELSE
    v_group_id := v_sched."groupId";
  END IF;

  -- 4. Vérifier si une séance existe déjà
  SELECT id INTO v_session FROM public.sessions
  WHERE "moduleId" = v_sched."moduleId"
    AND "groupId" = v_group_id
    AND "sessionDate" = v_target_date
    AND "startTime" = v_sched."startTime"
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.sessions
      SET status = 'active',
          "currentQrToken" = md5(random()::text || clock_timestamp()::text) || md5(random()::text || clock_timestamp()::text),
          "qrTokenExpiresAt" = now() + interval '8 seconds',
          "startedAt" = COALESCE("startedAt", now()),
          "startedBy" = COALESCE("startedBy", auth.uid())
    WHERE id = v_session.id;
    PERFORM public.populate_session_attendance(v_session.id);
    RETURN v_session.id;
  END IF;

  -- 5. Créer la séance avec lien vers le planning
  INSERT INTO public.sessions (
    "moduleId", "professorId", "groupId", "roomId",
    "sessionDate", "startTime", "endTime", "sessionType", status,
    "weeklyScheduleEntryId", "sourceMode", "startedAt", "startedBy",
    "currentQrToken", "qrTokenExpiresAt"
  ) VALUES (
    v_sched."moduleId", auth.uid(), v_group_id, v_sched."roomId",
    v_target_date, v_sched."startTime", v_sched."endTime",
    v_sched."sessionType", 'active',
    v_sched.id, 'realtime', now(), auth.uid(),
    md5(random()::text || clock_timestamp()::text) || md5(random()::text || clock_timestamp()::text),
    now() + interval '8 seconds'
  )
  RETURNING id INTO v_new_id;

  PERFORM public.populate_session_attendance(v_new_id);

  RETURN v_new_id;
END;
$$;

-- ── 7. Mettre à jour create_session_for_date ──
-- Ajoute weeklyScheduleEntryId + sourceMode approprié
CREATE OR REPLACE FUNCTION public.create_session_for_date(
  p_schedule_id UUID,
  p_date DATE,
  p_cancelled BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_sched RECORD;
  v_group_id UUID;
  v_session_id UUID;
  v_status TEXT;
  v_source TEXT;
BEGIN
  SELECT * INTO v_sched FROM public.weekly_schedule WHERE id = p_schedule_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entrée du planning introuvable';
  END IF;

  IF v_sched."professorId" <> auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  IF v_sched."sessionType" = 'CM' THEN
    SELECT id INTO v_group_id FROM public.groups
    WHERE "sectionId" = v_sched."sectionId" AND "isActive" = true
    ORDER BY name LIMIT 1;
  ELSE
    v_group_id := v_sched."groupId";
  END IF;

  -- Vérifier si une session existe déjà
  SELECT id INTO v_session_id FROM public.sessions
  WHERE "moduleId" = v_sched."moduleId"
    AND "groupId" = v_group_id
    AND "sessionDate" = p_date
    AND "startTime" = v_sched."startTime"
  LIMIT 1;

  IF FOUND THEN
    RETURN v_session_id;
  END IF;

  v_status := CASE WHEN p_cancelled THEN 'cancelled' ELSE 'completed' END;
  v_source := CASE WHEN p_cancelled THEN 'override' ELSE 'retroactive' END;

  INSERT INTO public.sessions (
    "moduleId", "professorId", "groupId", "roomId",
    "sessionDate", "startTime", "endTime", "sessionType", status,
    "weeklyScheduleEntryId", "sourceMode"
  ) VALUES (
    v_sched."moduleId", v_sched."professorId", v_group_id, v_sched."roomId",
    p_date, v_sched."startTime", v_sched."endTime", v_sched."sessionType", v_status,
    v_sched.id, v_source
  )
  RETURNING id INTO v_session_id;

  PERFORM public.populate_session_attendance(v_session_id);

  RETURN v_session_id;
END;
$$;

-- ── 8. Mettre à jour close_session ──
-- Ajoute closedAt/closedBy
CREATE OR REPLACE FUNCTION public.close_session(
  p_session_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_pres INTEGER;
  v_abs INTEGER;
  v_late INTEGER;
BEGIN
  SELECT COUNT(*) FILTER (WHERE status = 'PRESENT'),
         COUNT(*) FILTER (WHERE status = 'ABSENT'),
         COUNT(*) FILTER (WHERE status = 'LATE')
  INTO v_pres, v_abs, v_late
  FROM public.attendance
  WHERE "sessionId" = p_session_id;

  UPDATE public.sessions
  SET status = 'completed',
      "presentCount" = v_pres,
      "absentCount" = v_abs,
      "lateCount" = v_late,
      "closedAt" = now(),
      "closedBy" = auth.uid()
  WHERE id = p_session_id AND "professorId" = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Séance non trouvée ou non autorisée';
  END IF;
END;
$$;

-- ── 9. Rendu planning : fonction de fusion pour une semaine ──
-- Retourne les entrées du planning + overrides + sessions pour un groupe
CREATE OR REPLACE FUNCTION public.get_group_timetable(
  p_group_id UUID,
  p_week_start DATE,
  p_week_end DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_result JSON;
BEGIN
  WITH week_dates AS (
    -- Générer tous les jours de la semaine
    SELECT d::DATE AS day_date, EXTRACT(DOW FROM d)::INTEGER AS dow
    FROM generate_series(p_week_start, p_week_end, '1 day'::interval) d
  ),
  valid_entries AS (
    SELECT ws.*, m.name AS module_name, u."firstName" || ' ' || u."lastName" AS professor_name,
           r.name AS room_name, COALESCE(g.name, sec.name) AS target_name
    FROM public.weekly_schedule ws
    LEFT JOIN public.groups g ON g.id = ws."groupId"
    LEFT JOIN public.sections sec ON sec.id = ws."sectionId"
    JOIN public.modules m ON m.id = ws."moduleId"
    JOIN public.users u ON u.id = ws."professorId"
    JOIN public.rooms r ON r.id = ws."roomId"
    WHERE ws."groupId" = p_group_id
      AND ws."isActive" = true
      AND ws."validFrom" <= p_week_end
      AND (ws."validTo" IS NULL OR ws."validTo" >= p_week_start)
  ),
  projected AS (
    SELECT ve.*, wd.day_date
    FROM valid_entries ve
    JOIN week_dates wd ON wd.dow = ve."dayOfWeek"
  ),
  with_overrides AS (
    SELECT p.*,
           so."overrideType" AS ovr_type,
           so.reason AS ovr_reason,
           so."newRoomId" AS ovr_room_id,
           so."newTeacherId" AS ovr_teacher_id
    FROM projected p
    LEFT JOIN public.session_overrides so
      ON so."scheduleEntryId" = p.id
      AND so."overrideDate" = p.day_date
  ),
  with_sessions AS (
    SELECT wo.*,
           s.id AS session_id,
           s.status AS session_status,
           s."sessionDate" AS session_date_actual,
           s."startTime" AS session_start,
           s."endTime" AS session_end,
           s."sourceMode" AS session_source
    FROM with_overrides wo
    LEFT JOIN public.sessions s
      ON s."weeklyScheduleEntryId" = wo.id
      AND s."sessionDate" = wo.day_date
      AND s."groupId" = p_group_id
  )
  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.day_date, t."startTime"), '[]'::json) INTO v_result
  FROM (SELECT * FROM with_sessions) t;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_group_timetable IS 'Rendu planning complet pour un groupe sur une semaine : fusionne weekly_schedule + overrides + sessions';

-- ── 10. Mettre à jour admin_delete_user ──
-- Nettoie aussi session_overrides
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_uid UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Seuls les admins peuvent supprimer'; END IF;
  DELETE FROM public.session_overrides WHERE "createdBy" = p_uid;
  DELETE FROM public.weekly_schedule WHERE "professorId" = p_uid OR "createdBy" = p_uid;
  DELETE FROM public.sessions WHERE "professorId" = p_uid;
  DELETE FROM auth.users WHERE id = p_uid;
END;
$$;

-- ── 11. RLS : mettre à jour les politiques pour les nouvelles colonnes ──
-- sessions : RLS inchangée, les nouvelles colonnes ne changent pas les permissions
-- attendance : RLS inchangée

-- ── 12. Supprimer l'ancien RPC generate_sessions_from_schedule (obsolète) ──
DROP FUNCTION IF EXISTS public.generate_sessions_from_schedule;

-- ── 13. Marquer la migration ──
CREATE TABLE IF NOT EXISTS public._migrations (
  name TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public._migrations (name, applied_at) VALUES
  ('010_timetable_refactor', now())
ON CONFLICT (name) DO NOTHING;
