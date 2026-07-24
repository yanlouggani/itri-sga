-- ═══════════════════════════════════════════════════════════
-- SGAU — Migration + Seed complet (PostgreSQL / Supabase)
-- ═══════════════════════════════════════════════════════════
-- Exécute ce fichier dans le SQL Editor de Supabase.
-- Ensuite : créer les users Auth via le Dashboard, puis
-- remplacer les TODO_USER_ID dans 003_sessions_data.sql.
-- ═══════════════════════════════════════════════════════════

-- ── 1. Nettoyage (idempotent — safe si tables absentes) ──
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.attendance_trend();
DROP FUNCTION IF EXISTS public.busiest_rooms();
DROP FUNCTION IF EXISTS public.attendance_by_module();
DROP FUNCTION IF EXISTS public.attendance_by_group();
DROP FUNCTION IF EXISTS public.is_admin();

DROP TABLE IF EXISTS public.attendance CASCADE;
DROP TABLE IF EXISTS public.sessions CASCADE;
DROP TABLE IF EXISTS public.rooms CASCADE;
DROP TABLE IF EXISTS public.module_groups CASCADE;
DROP TABLE IF EXISTS public.modules CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.groups CASCADE;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 2. Tables ──

CREATE TABLE public.groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  level TEXT NOT NULL,
  department TEXT NOT NULL,
  "studentCount" INTEGER DEFAULT 0,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'professor', 'student')),
  identifier TEXT,
  "groupId" UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_users_role ON public.users(role);

-- Auto-create public.users row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, email, "firstName", "lastName", role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'firstName', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'lastName', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'student')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.modules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  credits INTEGER,
  "totalHours" INTEGER,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.module_groups (
  "moduleId" UUID REFERENCES public.modules(id) ON DELETE CASCADE,
  "groupId" UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  PRIMARY KEY ("moduleId", "groupId")
);

CREATE TABLE public.rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  building TEXT,
  floor INTEGER,
  "hasProjector" BOOLEAN DEFAULT false,
  "hasComputers" BOOLEAN DEFAULT false,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "moduleId" UUID NOT NULL REFERENCES public.modules(id),
  "professorId" UUID NOT NULL REFERENCES public.users(id),
  "groupId" UUID NOT NULL REFERENCES public.groups(id),
  "roomId" UUID NOT NULL REFERENCES public.rooms(id),
  "sessionDate" DATE NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','active','completed','postponed','cancelled')),
  "currentQrToken" TEXT,
  "qrTokenExpiresAt" TIMESTAMPTZ,
  "presentCount" INTEGER DEFAULT 0,
  "absentCount" INTEGER DEFAULT 0,
  "lateCount" INTEGER DEFAULT 0,
  "sessionType" TEXT DEFAULT '',
  "totalStudents" INTEGER DEFAULT 0,
  "classroomLat" DOUBLE PRECISION,
  "classroomLng" DOUBLE PRECISION,
  "geofenceRadius" DOUBLE PRECISION DEFAULT 50,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_sessions_date ON public.sessions("sessionDate");
CREATE INDEX idx_sessions_professor ON public.sessions("professorId");
CREATE INDEX idx_sessions_group ON public.sessions("groupId");

CREATE TABLE public.attendance (
  "sessionId" UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  "studentId" UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'unmarked'
    CHECK (status IN ('unmarked','present','absent','late','justified','excused')),
  "markedBy" TEXT NOT NULL DEFAULT 'professor'
    CHECK ("markedBy" IN ('professor','student','admin','system')),
  "scanMethod" TEXT NOT NULL DEFAULT 'manual'
    CHECK ("scanMethod" IN ('manual','qr','qr_session','qr_student','import')),
  "gpsVerified" BOOLEAN DEFAULT false,
  "gpsLatitude" DOUBLE PRECISION,
  "gpsLongitude" DOUBLE PRECISION,
  "lateMinutes" INTEGER,
  "markedAt" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("sessionId", "studentId")
);
CREATE INDEX idx_attendance_student ON public.attendance("studentId");
CREATE INDEX idx_attendance_status ON public.attendance(status);

-- ── 3. RLS ──

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin');
$$;

CREATE POLICY "users_select_own" ON public.users FOR SELECT
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "users_update_own" ON public.users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "groups_select" ON public.groups FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "groups_insert" ON public.groups FOR INSERT
  WITH CHECK (public.is_admin());
CREATE POLICY "groups_update" ON public.groups FOR UPDATE
  USING (public.is_admin());
CREATE POLICY "groups_delete" ON public.groups FOR DELETE
  USING (public.is_admin());

CREATE POLICY "modules_select" ON public.modules FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "modules_insert" ON public.modules FOR INSERT
  WITH CHECK (public.is_admin());
CREATE POLICY "modules_update" ON public.modules FOR UPDATE
  USING (public.is_admin());
CREATE POLICY "modules_delete" ON public.modules FOR DELETE
  USING (public.is_admin());

CREATE POLICY "module_groups_select" ON public.module_groups FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "module_groups_insert" ON public.module_groups FOR INSERT
  WITH CHECK (public.is_admin());
CREATE POLICY "module_groups_update" ON public.module_groups FOR UPDATE
  USING (public.is_admin());
CREATE POLICY "module_groups_delete" ON public.module_groups FOR DELETE
  USING (public.is_admin());

CREATE POLICY "rooms_select" ON public.rooms FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "rooms_insert" ON public.rooms FOR INSERT
  WITH CHECK (public.is_admin());
CREATE POLICY "rooms_update" ON public.rooms FOR UPDATE
  USING (public.is_admin());
CREATE POLICY "rooms_delete" ON public.rooms FOR DELETE
  USING (public.is_admin());

CREATE POLICY "sessions_select" ON public.sessions FOR SELECT
  USING (
    "professorId" = auth.uid()
    OR "groupId" IN (SELECT "groupId" FROM public.users WHERE id = auth.uid())
    OR public.is_admin()
  );
CREATE POLICY "sessions_insert" ON public.sessions FOR INSERT
  WITH CHECK ("professorId" = auth.uid() OR public.is_admin());
CREATE POLICY "sessions_update" ON public.sessions FOR UPDATE
  USING ("professorId" = auth.uid() OR public.is_admin());

CREATE POLICY "attendance_select" ON public.attendance FOR SELECT
  USING (
    "studentId" = auth.uid()
    OR "sessionId" IN (SELECT id FROM public.sessions WHERE "professorId" = auth.uid())
    OR public.is_admin()
  );
CREATE POLICY "attendance_insert" ON public.attendance FOR INSERT
  WITH CHECK (
    "sessionId" IN (SELECT id FROM public.sessions WHERE "professorId" = auth.uid())
    OR public.is_admin()
  );
CREATE POLICY "attendance_update" ON public.attendance FOR UPDATE
  USING (
    "sessionId" IN (SELECT id FROM public.sessions WHERE "professorId" = auth.uid())
    OR public.is_admin()
  );

-- ── 4. RPC Analytics ──

CREATE OR REPLACE FUNCTION public.attendance_by_group()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE result JSON;
BEGIN
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO result
  FROM (
    SELECT g.name, COUNT(*)::int AS "count"
    FROM public.attendance a
    JOIN public.sessions s ON s.id = a."sessionId"
    JOIN public.groups g ON g.id = s."groupId"
    WHERE a.status IN ('absent', 'late')
    GROUP BY g.name ORDER BY "count" DESC
  ) t;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.attendance_by_module()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE result JSON;
BEGIN
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO result
  FROM (
    SELECT m.name, COUNT(*)::int AS "count"
    FROM public.attendance a
    JOIN public.sessions s ON s.id = a."sessionId"
    JOIN public.modules m ON m.id = s."moduleId"
    WHERE a.status IN ('absent', 'late')
    GROUP BY m.name ORDER BY "count" DESC
  ) t;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.busiest_rooms()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE result JSON;
BEGIN
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO result
  FROM (
    SELECT r.name, COUNT(*)::int AS "count"
    FROM public.sessions s
    JOIN public.rooms r ON r.id = s."roomId"
    GROUP BY r.name ORDER BY "count" DESC
  ) t;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.attendance_trend()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE result JSON;
BEGIN
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO result
  FROM (
    SELECT to_char(s."sessionDate", 'YYYY"-W"IW') AS "name", COUNT(*)::int AS "count"
    FROM public.attendance a
    JOIN public.sessions s ON s.id = a."sessionId"
    WHERE a.status IN ('absent', 'late')
    GROUP BY to_char(s."sessionDate", 'YYYY"-W"IW')
    ORDER BY "name"
  ) t;
  RETURN result;
END;
$$;

-- ── 5. Seed : données de référence ──

INSERT INTO public.groups (id, name, code, level, department, "studentCount", "isActive") VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Master 1 - GL', 'M1-GL', 'M1', 'GL', 25, true),
  ('a1000000-0000-0000-0000-000000000002', 'Master 1 - SI', 'M1-SI', 'M1', 'SI', 20, true),
  ('a1000000-0000-0000-0000-000000000003', 'Master 2 - GL', 'M2-GL', 'M2', 'GL', 18, true)
ON CONFLICT DO NOTHING;

INSERT INTO public.modules (id, name, code, description, "isActive") VALUES
  ('b2000000-0000-0000-0000-000000000001', 'Génie Logiciel Avancé', 'GLA', 'Conception et architecture logicielle', true),
  ('b2000000-0000-0000-0000-000000000002', 'Systèmes Distribués', 'SD', 'Middleware, RPC, transactions réparties', true),
  ('b2000000-0000-0000-0000-000000000003', 'Intelligence Artificielle', 'IA', 'Apprentissage automatique et Deep Learning', true),
  ('b2000000-0000-0000-0000-000000000004', 'Bases de Données Avancées', 'BDA', 'NoSQL, optimisation, data mining', true)
ON CONFLICT DO NOTHING;

INSERT INTO public.module_groups ("moduleId", "groupId") VALUES
  ('b2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001'),
  ('b2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003'),
  ('b2000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001'),
  ('b2000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002'),
  ('b2000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000002'),
  ('b2000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003'),
  ('b2000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001'),
  ('b2000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000002')
ON CONFLICT DO NOTHING;

INSERT INTO public.rooms (id, name, code, capacity, "isActive") VALUES
  ('c3000000-0000-0000-0000-000000000001', 'Amphithéâtre A', 'AMPHI-A', 100, true),
  ('c3000000-0000-0000-0000-000000000002', 'Amphithéâtre B', 'AMPHI-B', 80, true),
  ('c3000000-0000-0000-0000-000000000003', 'Salle TP 101', 'TP-101', 30, true),
  ('c3000000-0000-0000-0000-000000000004', 'Salle TP 102', 'TP-102', 30, true)
ON CONFLICT DO NOTHING;

-- ── 6. Admin RPC functions (gestion auth.users sans service_role) ──

CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_email TEXT,
  p_password TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_role TEXT,
  p_group_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can create users';
  END IF;
  new_id := gen_random_uuid();

  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at,
    confirmation_sent_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, instance_id, aud, role,
    is_sso_user, is_anonymous
  ) VALUES (
    new_id, p_email, extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('firstName', p_first_name, 'lastName', p_last_name, 'role', p_role),
    now(), now(),
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    false, false
  );

  INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (
    new_id, new_id,
    jsonb_build_object('sub', new_id, 'email', p_email),
    'email', now(), now(), now()
  );

  -- Le trigger on_auth_user_created insère déjà dans public.users avec les meta données
  UPDATE public.users SET "groupId" = p_group_id WHERE id = new_id;
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_user(p_uid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;
  DELETE FROM auth.users WHERE id = p_uid;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reset_password(p_uid UUID, p_new_password TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can reset passwords';
  END IF;
  UPDATE auth.users
  SET encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
      updated_at = now()
  WHERE id = p_uid;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_confirm_user(p_uid UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Only admins'; END IF;
  UPDATE auth.users SET email_confirmed_at = now() WHERE id = p_uid;
END;
$$;
