-- ── 009 : Période de validité weekly_schedule + création rétroactive ──

-- 1. Ajouter validFrom / validTo
ALTER TABLE IF EXISTS public.weekly_schedule
  ADD COLUMN IF NOT EXISTS "validFrom" DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS "validTo" DATE;

-- Remplir validFrom pour les entrées existantes (date de création) validFrom déjà la date courante
UPDATE public.weekly_schedule SET "validFrom" = "createdAt"::DATE WHERE "validFrom" IS NULL;

-- Index pour les recherches par date
CREATE INDEX IF NOT EXISTS idx_weekly_schedule_validity ON public.weekly_schedule("validFrom", "validTo");

-- 2. RPC : créer une session sur une date spécifique (rétroactif ou ad-hoc)
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

  -- Vérifier si une session existe déjà pour ce créneau à cette date
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

  INSERT INTO public.sessions (
    "moduleId", "professorId", "groupId", "roomId",
    "sessionDate", "startTime", "endTime", "sessionType", status
  ) VALUES (
    v_sched."moduleId", v_sched."professorId", v_group_id, v_sched."roomId",
    p_date, v_sched."startTime", v_sched."endTime", v_sched."sessionType", v_status
  )
  RETURNING id INTO v_session_id;

  PERFORM public.populate_session_attendance(v_session_id);

  RETURN v_session_id;
END;
$$;

-- 3. Mettre à jour start_session pour filtrer par validFrom/validTo
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
            "qrTokenExpiresAt" = now() + interval '8 seconds'
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
          "qrTokenExpiresAt" = now() + interval '8 seconds'
    WHERE id = v_session.id;
    PERFORM public.populate_session_attendance(v_session.id);
    RETURN v_session.id;
  END IF;

  -- 5. Créer la séance
  INSERT INTO public.sessions (
    "moduleId", "professorId", "groupId", "roomId",
    "sessionDate", "startTime", "endTime", "sessionType", status,
    "currentQrToken", "qrTokenExpiresAt"
  ) VALUES (
    v_sched."moduleId", auth.uid(), v_group_id, v_sched."roomId",
    v_target_date, v_sched."startTime", v_sched."endTime",
    v_sched."sessionType", 'active',
    md5(random()::text || clock_timestamp()::text) || md5(random()::text || clock_timestamp()::text), now() + interval '8 seconds'
  )
  RETURNING id INTO v_new_id;

  PERFORM public.populate_session_attendance(v_new_id);

  RETURN v_new_id;
END;
$$;

COMMENT ON FUNCTION public.start_session IS 'Active ou crée une séance. Peut prendre une date pour rétroactif.';
COMMENT ON FUNCTION public.create_session_for_date IS 'Crée une session complétée ou annulée à une date donnée depuis le planning.';
