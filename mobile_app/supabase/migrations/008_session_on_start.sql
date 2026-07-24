-- ── 008 : Création/activation d'une séance + création des lignes d'appel ──

CREATE OR REPLACE FUNCTION public.populate_session_attendance(p_session_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_group_id UUID;
BEGIN
  SELECT "groupId" INTO v_group_id FROM public.sessions WHERE id = p_session_id;
  IF NOT FOUND THEN RETURN; END IF;

  INSERT INTO public.attendance ("sessionId", "studentId", status, "markedBy", "markedAt")
  SELECT p_session_id, u.id, 'UNMARKED', 'system', now()
  FROM public.users u
  WHERE u."groupId" = v_group_id
    AND u.role = 'student'
    AND u."isActive" = true
    AND NOT EXISTS (
      SELECT 1 FROM public.attendance a
      WHERE a."sessionId" = p_session_id AND a."studentId" = u.id
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.start_session(
  p_session_id UUID DEFAULT NULL
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
BEGIN
  -- 1. Si un session_id est fourni, essayer de l'activer
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

  -- 2. Chercher dans weekly_schedule une entrée correspondant à aujourd'hui
  SELECT ws.* INTO v_sched
  FROM public.weekly_schedule ws
  WHERE ws."professorId" = auth.uid()
    AND ws."dayOfWeek" = EXTRACT(DOW FROM CURRENT_DATE)::INTEGER
    AND ws."isActive" = true
  ORDER BY ws."startTime"
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aucune séance programmée pour aujourd''hui';
  END IF;

  -- 3. Déterminer le groupe cible
  IF v_sched."sessionType" = 'CM' THEN
    SELECT id INTO v_group_id FROM public.groups
    WHERE "sectionId" = v_sched."sectionId" AND "isActive" = true
    ORDER BY name LIMIT 1;
  ELSE
    v_group_id := v_sched."groupId";
  END IF;

  -- 4. Vérifier si une séance existe déjà pour ce créneau aujourd'hui
  SELECT id INTO v_session FROM public.sessions
  WHERE "moduleId" = v_sched."moduleId"
    AND "groupId" = v_group_id
    AND "sessionDate" = CURRENT_DATE
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
    CURRENT_DATE, v_sched."startTime", v_sched."endTime",
    v_sched."sessionType", 'active',
    md5(random()::text || clock_timestamp()::text) || md5(random()::text || clock_timestamp()::text), now() + interval '8 seconds'
  )
  RETURNING id INTO v_new_id;

  PERFORM public.populate_session_attendance(v_new_id);

  RETURN v_new_id;
END;
$$;

COMMENT ON FUNCTION public.start_session IS 'Active ou crée une séance + populate les lignes d''appel';

-- RPC : clôturer une séance (professeur)
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
      "lateCount" = v_late
  WHERE id = p_session_id AND "professorId" = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Séance non trouvée ou non autorisée';
  END IF;
END;
$$;
