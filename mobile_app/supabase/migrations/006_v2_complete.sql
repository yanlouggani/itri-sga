-- ═══════════════════════════════════════════════════════════
-- SGAU v2 — Migration complète
-- Niveaux / Sections / Groupes + EDT + Sécurité
-- ═══════════════════════════════════════════════════════════
-- À exécuter DANS L'ORDRE après 001_schema.sql
-- ═══════════════════════════════════════════════════════════

-- ── 1. REVOKE anon (sécurité) ──
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- ── 2. Niveaux ──
CREATE TABLE IF NOT EXISTS public.levels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- ── 3. Sections ──
CREATE TABLE IF NOT EXISTS public.sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "levelId" UUID NOT NULL REFERENCES public.levels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now(),
  UNIQUE ("levelId", "code")
);

-- ── 4. Modifier groups ──
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS "levelId" UUID REFERENCES public.levels(id) ON DELETE CASCADE;
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS "sectionId" UUID REFERENCES public.sections(id) ON DELETE CASCADE;
ALTER TABLE public.groups DROP COLUMN IF EXISTS level;
ALTER TABLE public.groups DROP COLUMN IF EXISTS department;

-- ── 5. Levels_modules (remplace module_groups) ──
CREATE TABLE IF NOT EXISTS public.levels_modules (
  "levelId" UUID NOT NULL REFERENCES public.levels(id) ON DELETE CASCADE,
  "moduleId" UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  PRIMARY KEY ("levelId", "moduleId")
);

-- ── 6. Supprimer module_groups ──
DROP TABLE IF EXISTS public.module_groups CASCADE;

-- ── 7. Professor_modules ──
CREATE TABLE IF NOT EXISTS public.professor_modules (
  "professorId" UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  "moduleId" UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  "sessionType" TEXT NOT NULL DEFAULT 'CM' CHECK ("sessionType" IN ('CM', 'TD', 'TP')),
  PRIMARY KEY ("professorId", "moduleId", "sessionType")
);

-- ── 8. Weekly_schedule ──
CREATE TABLE IF NOT EXISTS public.weekly_schedule (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "dayOfWeek" INTEGER NOT NULL CHECK ("dayOfWeek" BETWEEN 0 AND 6),
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "levelId" UUID NOT NULL REFERENCES public.levels(id),
  "moduleId" UUID NOT NULL REFERENCES public.modules(id),
  "professorId" UUID NOT NULL REFERENCES public.users(id),
  "roomId" UUID NOT NULL REFERENCES public.rooms(id),
  "sessionType" TEXT NOT NULL DEFAULT 'CM' CHECK ("sessionType" IN ('CM', 'TD', 'TP')),
  "sectionId" UUID REFERENCES public.sections(id) ON DELETE CASCADE,
  "groupId" UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT cm_has_section CHECK (
    ("sessionType" = 'CM' AND "sectionId" IS NOT NULL AND "groupId" IS NULL)
    OR
    ("sessionType" IN ('TD', 'TP') AND "groupId" IS NOT NULL AND "sectionId" IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_weekly_schedule_day ON public.weekly_schedule("dayOfWeek");
CREATE INDEX IF NOT EXISTS idx_weekly_schedule_section ON public.weekly_schedule("sectionId");
CREATE INDEX IF NOT EXISTS idx_weekly_schedule_group ON public.weekly_schedule("groupId");

-- ── 9. Fix trigger handle_new_user ──
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, email, "firstName", "lastName", role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.raw_user_meta_data ->> 'email', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'firstName', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'lastName', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'student')
  );
  RETURN NEW;
END;
$$;

-- ── 10. Fonctions analytics (sécurisées) ──
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
    WHERE a.status IN ('ABSENT', 'LATE')
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
    WHERE a.status IN ('ABSENT', 'LATE')
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
    WHERE a.status IN ('ABSENT', 'LATE')
    GROUP BY to_char(s."sessionDate", 'YYYY"-W"IW') ORDER BY "name") t;
  RETURN result;
END; $$;

-- ── 11. RPC admin_finalize_user ──
CREATE OR REPLACE FUNCTION public.admin_finalize_user(
  p_uid UUID,
  p_group_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_meta JSONB;
  v_email TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
  v_role TEXT;
BEGIN
  SELECT raw_user_meta_data, email INTO v_meta, v_email
  FROM auth.users WHERE id = p_uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Utilisateur introuvable dans auth.users'; END IF;

  v_first_name := COALESCE(v_meta ->> 'firstName', '');
  v_last_name  := COALESCE(v_meta ->> 'lastName', '');
  v_role       := COALESCE(v_meta ->> 'role', 'student');

  INSERT INTO public.users (id, email, "firstName", "lastName", role, "groupId")
  VALUES (p_uid, v_email, v_first_name, v_last_name, v_role, p_group_id)
  ON CONFLICT (id) DO UPDATE SET
    "firstName" = EXCLUDED."firstName",
    "lastName"  = EXCLUDED."lastName",
    role        = EXCLUDED.role,
    "groupId"   = COALESCE(EXCLUDED."groupId", public.users."groupId");
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_finalize_user TO authenticated;

-- ── 12. RPC generate_sessions_from_schedule ──
CREATE OR REPLACE FUNCTION public.generate_sessions_from_schedule(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  rec RECORD;
  grp RECORD;
  cur_date DATE;
  day_idx INTEGER;
  created_count INTEGER := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Seuls les administrateurs peuvent générer les séances';
  END IF;

  cur_date := p_start_date;
  WHILE cur_date <= p_end_date LOOP
    day_idx := EXTRACT(DOW FROM cur_date)::INTEGER;

    FOR rec IN
      SELECT * FROM public.weekly_schedule
      WHERE "dayOfWeek" = day_idx AND "isActive" = true
    LOOP
      IF rec."sessionType" = 'CM' THEN
        -- CM : créer une séance par groupe dans la section
        FOR grp IN SELECT id FROM public.groups WHERE "sectionId" = rec."sectionId" AND "isActive" = true LOOP
          INSERT INTO public.sessions (
            "moduleId", "professorId", "groupId", "roomId",
            "sessionDate", "startTime", "endTime", "sessionType", status
          ) VALUES (
            rec."moduleId", rec."professorId", grp.id, rec."roomId",
            cur_date, rec."startTime", rec."endTime", rec."sessionType", 'SCHEDULED'
          ) ON CONFLICT DO NOTHING;
          created_count := created_count + 1;
        END LOOP;
      ELSE
        -- TD/TP : une séance pour le groupe
        INSERT INTO public.sessions (
          "moduleId", "professorId", "groupId", "roomId",
          "sessionDate", "startTime", "endTime", "sessionType", status
        ) VALUES (
          rec."moduleId", rec."professorId", rec."groupId", rec."roomId",
          cur_date, rec."startTime", rec."endTime", rec."sessionType", 'SCHEDULED'
        ) ON CONFLICT DO NOTHING;
        created_count := created_count + 1;
      END IF;
    END LOOP;

    cur_date := cur_date + 1;
  END LOOP;

  RETURN created_count;
END;
$$;

-- ── 13. RPC admin_delete_user ──
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_uid UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Seuls les admins peuvent supprimer'; END IF;
  DELETE FROM public.weekly_schedule WHERE "professorId" = p_uid;
  DELETE FROM public.sessions WHERE "professorId" = p_uid;
  DELETE FROM auth.users WHERE id = p_uid;
END;
$$;

-- ── 14. RLS : Enable sur les nouvelles tables ──
ALTER TABLE IF EXISTS public.levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.levels_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.professor_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.weekly_schedule ENABLE ROW LEVEL SECURITY;

-- ── 15. RLS : Niveaux ──
DROP POLICY IF EXISTS "levels_select" ON public.levels;
DROP POLICY IF EXISTS "levels_insert" ON public.levels;
DROP POLICY IF EXISTS "levels_update" ON public.levels;
DROP POLICY IF EXISTS "levels_delete" ON public.levels;

CREATE POLICY "levels_select" ON public.levels FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "levels_insert" ON public.levels FOR INSERT
  WITH CHECK (public.is_admin());
CREATE POLICY "levels_update" ON public.levels FOR UPDATE
  USING (public.is_admin());
CREATE POLICY "levels_delete" ON public.levels FOR DELETE
  USING (public.is_admin());

-- ── 16. RLS : Sections ──
DROP POLICY IF EXISTS "sections_select" ON public.sections;
DROP POLICY IF EXISTS "sections_insert" ON public.sections;
DROP POLICY IF EXISTS "sections_update" ON public.sections;
DROP POLICY IF EXISTS "sections_delete" ON public.sections;

CREATE POLICY "sections_select" ON public.sections FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "sections_insert" ON public.sections FOR INSERT
  WITH CHECK (public.is_admin());
CREATE POLICY "sections_update" ON public.sections FOR UPDATE
  USING (public.is_admin());
CREATE POLICY "sections_delete" ON public.sections FOR DELETE
  USING (public.is_admin());

-- ── 17. RLS : Groups (mise à jour) ──
DROP POLICY IF EXISTS "groups_select" ON public.groups;
DROP POLICY IF EXISTS "groups_insert" ON public.groups;
DROP POLICY IF EXISTS "groups_update" ON public.groups;
DROP POLICY IF EXISTS "groups_delete" ON public.groups;

CREATE POLICY "groups_select" ON public.groups FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "groups_insert" ON public.groups FOR INSERT
  WITH CHECK (public.is_admin());
CREATE POLICY "groups_update" ON public.groups FOR UPDATE
  USING (public.is_admin());
CREATE POLICY "groups_delete" ON public.groups FOR DELETE
  USING (public.is_admin());

-- ── 18. RLS : Levels_modules ──
DROP POLICY IF EXISTS "levels_modules_select" ON public.levels_modules;
DROP POLICY IF EXISTS "levels_modules_insert" ON public.levels_modules;
DROP POLICY IF EXISTS "levels_modules_delete" ON public.levels_modules;

CREATE POLICY "levels_modules_select" ON public.levels_modules FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "levels_modules_insert" ON public.levels_modules FOR INSERT
  WITH CHECK (public.is_admin());
CREATE POLICY "levels_modules_delete" ON public.levels_modules FOR DELETE
  USING (public.is_admin());

-- ── 19. RLS : Professor_modules ──
DROP POLICY IF EXISTS "professor_modules_select" ON public.professor_modules;
DROP POLICY IF EXISTS "professor_modules_insert" ON public.professor_modules;
DROP POLICY IF EXISTS "professor_modules_delete" ON public.professor_modules;

CREATE POLICY "professor_modules_select" ON public.professor_modules FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "professor_modules_insert" ON public.professor_modules FOR INSERT
  WITH CHECK (public.is_admin());
CREATE POLICY "professor_modules_delete" ON public.professor_modules FOR DELETE
  USING (public.is_admin());

-- ── 20. RLS : Weekly_schedule ──
DROP POLICY IF EXISTS "weekly_schedule_select" ON public.weekly_schedule;
DROP POLICY IF EXISTS "weekly_schedule_insert" ON public.weekly_schedule;
DROP POLICY IF EXISTS "weekly_schedule_update" ON public.weekly_schedule;
DROP POLICY IF EXISTS "weekly_schedule_delete" ON public.weekly_schedule;

CREATE POLICY "weekly_schedule_select" ON public.weekly_schedule FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "weekly_schedule_insert" ON public.weekly_schedule FOR INSERT
  WITH CHECK (public.is_admin());
CREATE POLICY "weekly_schedule_update" ON public.weekly_schedule FOR UPDATE
  USING (public.is_admin());
CREATE POLICY "weekly_schedule_delete" ON public.weekly_schedule FOR DELETE
  USING (public.is_admin());
