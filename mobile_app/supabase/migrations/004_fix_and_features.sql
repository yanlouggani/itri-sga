-- ═══════════════════════════════════════════════════════════
-- SGAU v2 — Sécurité + Nouvelles fonctionnalités
-- ═══════════════════════════════════════════════════════════

-- ── 1. REVOKE GRANT ALL de anon (sécurité critique) ──
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- ── 2. Analytics RPC : ajouter vérification admin/prof ──
CREATE OR REPLACE FUNCTION public.attendance_by_group()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result JSON;
BEGIN
  IF NOT public.is_admin() AND NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'professor') THEN
    RAISE EXCEPTION 'Accès réservé aux admins et professeurs';
  END IF;
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO result
  FROM (SELECT g.name, COUNT(*)::int AS "count"
    FROM public.attendance a JOIN public.sessions s ON s.id = a."sessionId"
    JOIN public.groups g ON g.id = s."groupId"
    WHERE a.status IN ('absent', 'late')
    GROUP BY g.name ORDER BY "count" DESC) t;
  RETURN result;
END; $$;

CREATE OR REPLACE FUNCTION public.attendance_by_module()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result JSON;
BEGIN
  IF NOT public.is_admin() AND NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'professor') THEN
    RAISE EXCEPTION 'Accès réservé aux admins et professeurs';
  END IF;
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO result
  FROM (SELECT m.name, COUNT(*)::int AS "count"
    FROM public.attendance a JOIN public.sessions s ON s.id = a."sessionId"
    JOIN public.modules m ON m.id = s."moduleId"
    WHERE a.status IN ('absent', 'late')
    GROUP BY m.name ORDER BY "count" DESC) t;
  RETURN result;
END; $$;

CREATE OR REPLACE FUNCTION public.busiest_rooms()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result JSON;
BEGIN
  IF NOT public.is_admin() AND NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'professor') THEN
    RAISE EXCEPTION 'Accès réservé aux admins et professeurs';
  END IF;
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO result
  FROM (SELECT r.name, COUNT(*)::int AS "count"
    FROM public.sessions s JOIN public.rooms r ON r.id = s."roomId"
    GROUP BY r.name ORDER BY "count" DESC) t;
  RETURN result;
END; $$;

CREATE OR REPLACE FUNCTION public.attendance_trend()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result JSON;
BEGIN
  IF NOT public.is_admin() AND NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'professor') THEN
    RAISE EXCEPTION 'Accès réservé aux admins et professeurs';
  END IF;
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO result
  FROM (SELECT to_char(s."sessionDate", 'YYYY"-W"IW') AS "name", COUNT(*)::int AS "count"
    FROM public.attendance a JOIN public.sessions s ON s.id = a."sessionId"
    WHERE a.status IN ('absent', 'late')
    GROUP BY to_char(s."sessionDate", 'YYYY"-W"IW') ORDER BY "name") t;
  RETURN result;
END; $$;

-- ── 3. Table professor_modules ──
CREATE TABLE IF NOT EXISTS public.professor_modules (
  "professorId" UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  "moduleId" UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  "sessionType" TEXT NOT NULL DEFAULT 'CM' CHECK ("sessionType" IN ('CM', 'TD', 'TP')),
  PRIMARY KEY ("professorId", "moduleId", "sessionType")
);

ALTER TABLE public.professor_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "professor_modules_select" ON public.professor_modules FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "professor_modules_insert" ON public.professor_modules FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "professor_modules_delete" ON public.professor_modules FOR DELETE
  USING (public.is_admin());

-- ── 4. Table weekly_schedule (emploi du temps fixe) ──
CREATE TABLE IF NOT EXISTS public.weekly_schedule (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "dayOfWeek" INTEGER NOT NULL CHECK ("dayOfWeek" BETWEEN 0 AND 6),
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "moduleId" UUID NOT NULL REFERENCES public.modules(id),
  "professorId" UUID NOT NULL REFERENCES public.users(id),
  "groupId" UUID NOT NULL REFERENCES public.groups(id),
  "roomId" UUID NOT NULL REFERENCES public.rooms(id),
  "sessionType" TEXT NOT NULL DEFAULT 'CM' CHECK ("sessionType" IN ('CM', 'TD', 'TP')),
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weekly_schedule_day ON public.weekly_schedule("dayOfWeek");
CREATE INDEX IF NOT EXISTS idx_weekly_schedule_group ON public.weekly_schedule("groupId");
CREATE INDEX IF NOT EXISTS idx_weekly_schedule_professor ON public.weekly_schedule("professorId");

ALTER TABLE public.weekly_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "weekly_schedule_select" ON public.weekly_schedule FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "weekly_schedule_insert" ON public.weekly_schedule FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "weekly_schedule_update" ON public.weekly_schedule FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "weekly_schedule_delete" ON public.weekly_schedule FOR DELETE
  USING (public.is_admin());

-- ── 5. RPC pour générer les séances depuis l'EDT ──
CREATE OR REPLACE FUNCTION public.generate_sessions_from_schedule(
  p_start_date DATE,
  p_end_date DATE,
  p_schedule_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  rec RECORD;
  current_date DATE;
  day_idx INTEGER;
  created_count INTEGER := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can generate sessions';
  END IF;

  current_date := p_start_date;
  WHILE current_date <= p_end_date LOOP
    day_idx := EXTRACT(DOW FROM current_date)::INTEGER;

    FOR rec IN
      SELECT * FROM public.weekly_schedule
      WHERE "dayOfWeek" = day_idx
        AND "isActive" = true
        AND (p_schedule_ids IS NULL OR id = ANY(p_schedule_ids))
    LOOP
      INSERT INTO public.sessions (
        "moduleId", "professorId", "groupId", "roomId",
        "sessionDate", "startTime", "endTime", "sessionType", status
      ) VALUES (
        rec."moduleId", rec."professorId", rec."groupId", rec."roomId",
        current_date, rec."startTime", rec."endTime", rec."sessionType", 'scheduled'
      ) ON CONFLICT DO NOTHING;
      created_count := created_count + 1;
    END LOOP;

    current_date := current_date + 1;
  END LOOP;

  RETURN created_count;
END;
$$;
