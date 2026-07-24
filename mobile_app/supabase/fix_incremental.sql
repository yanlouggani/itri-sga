-- ═══════════════════════════════════════════════════════════
-- SGAU — Fix incrémental (sans casser la base existante)
-- ═══════════════════════════════════════════════════════════

-- ── 1. Ajouter is_admin() si pas déjà présente ──
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin');
END;
$$;

-- ── 2. Admin RPC functions ──
CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_email TEXT, p_password TEXT,
  p_first_name TEXT, p_last_name TEXT,
  p_role TEXT, p_group_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE new_id UUID;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Only admins can create users'; END IF;
  new_id := gen_random_uuid();

  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at,
    confirmation_sent_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, instance_id, aud, role,
    is_sso_user, is_anonymous)
  VALUES (new_id, p_email, extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('firstName', p_first_name, 'lastName', p_last_name, 'role', p_role),
    now(), now(),
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    false, false);

  INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (new_id, new_id,
    jsonb_build_object('sub', new_id, 'email', p_email),
    'email', now(), now(), now());

  UPDATE public.users SET "groupId" = p_group_id WHERE id = new_id;
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_user(p_uid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Only admins can delete users'; END IF;
  DELETE FROM auth.users WHERE id = p_uid;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reset_password(p_uid UUID, p_new_password TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Only admins can reset passwords'; END IF;
  UPDATE auth.users SET encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf')), updated_at = now()
  WHERE id = p_uid;
END;
$$;

-- Confirmer l'email d'un utilisateur (après signUp)
CREATE OR REPLACE FUNCTION public.admin_confirm_user(p_uid UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Only admins'; END IF;
  UPDATE auth.users SET email_confirmed_at = now() WHERE id = p_uid;
END;
$$;

-- ── 3. Fix CHECK constraints (UPPERCASE → lowercase) ──
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_status_check;
ALTER TABLE public.sessions ADD CONSTRAINT sessions_status_check
  CHECK (status IN ('scheduled','active','completed','postponed','cancelled'));

ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_status_check;
ALTER TABLE public.attendance ADD CONSTRAINT attendance_status_check
  CHECK (status IN ('unmarked','present','absent','late','justified','excused'));

ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_markedBy_check;
ALTER TABLE public.attendance ADD CONSTRAINT attendance_markedBy_check
  CHECK ("markedBy" IN ('professor','student','admin','system'));

ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_scanMethod_check;
ALTER TABLE public.attendance ADD CONSTRAINT attendance_scanMethod_check
  CHECK ("scanMethod" IN ('manual','qr','qr_session','qr_student','import'));

-- ── 4. Mettre à jour les données existantes (UPPERCASE → lowercase) ──
UPDATE public.sessions SET status = lower(status) WHERE status != lower(status);
UPDATE public.attendance SET status = lower(status) WHERE status != lower(status);
UPDATE public.attendance SET "markedBy" = lower("markedBy") WHERE "markedBy" != lower("markedBy");
UPDATE public.attendance SET "scanMethod" = lower("scanMethod") WHERE "scanMethod" != lower("scanMethod");

-- ── 5. Remplacer les RLS policies (récursion → is_admin()) ──
DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own" ON public.users FOR SELECT
  USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users FOR UPDATE
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Groups
DROP POLICY IF EXISTS "groups_insert" ON public.groups;
CREATE POLICY "groups_insert" ON public.groups FOR INSERT WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "groups_update" ON public.groups;
CREATE POLICY "groups_update" ON public.groups FOR UPDATE USING (public.is_admin());
DROP POLICY IF EXISTS "groups_delete" ON public.groups;
CREATE POLICY "groups_delete" ON public.groups FOR DELETE USING (public.is_admin());

-- Modules
DROP POLICY IF EXISTS "modules_insert" ON public.modules;
CREATE POLICY "modules_insert" ON public.modules FOR INSERT WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "modules_update" ON public.modules;
CREATE POLICY "modules_update" ON public.modules FOR UPDATE USING (public.is_admin());
DROP POLICY IF EXISTS "modules_delete" ON public.modules;
CREATE POLICY "modules_delete" ON public.modules FOR DELETE USING (public.is_admin());

-- Module groups
DROP POLICY IF EXISTS "module_groups_select" ON public.module_groups;
CREATE POLICY "module_groups_select" ON public.module_groups FOR SELECT
  USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "module_groups_insert" ON public.module_groups;
CREATE POLICY "module_groups_insert" ON public.module_groups FOR INSERT WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "module_groups_update" ON public.module_groups;
CREATE POLICY "module_groups_update" ON public.module_groups FOR UPDATE USING (public.is_admin());
DROP POLICY IF EXISTS "module_groups_delete" ON public.module_groups;
CREATE POLICY "module_groups_delete" ON public.module_groups FOR DELETE USING (public.is_admin());

-- Rooms
DROP POLICY IF EXISTS "rooms_insert" ON public.rooms;
CREATE POLICY "rooms_insert" ON public.rooms FOR INSERT WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "rooms_update" ON public.rooms;
CREATE POLICY "rooms_update" ON public.rooms FOR UPDATE USING (public.is_admin());
DROP POLICY IF EXISTS "rooms_delete" ON public.rooms;
CREATE POLICY "rooms_delete" ON public.rooms FOR DELETE USING (public.is_admin());

-- Sessions
DROP POLICY IF EXISTS "sessions_select" ON public.sessions;
CREATE POLICY "sessions_select" ON public.sessions FOR SELECT
  USING ("professorId" = auth.uid()
    OR "groupId" IN (SELECT "groupId" FROM public.users WHERE id = auth.uid())
    OR public.is_admin());
DROP POLICY IF EXISTS "sessions_insert" ON public.sessions;
CREATE POLICY "sessions_insert" ON public.sessions FOR INSERT
  WITH CHECK ("professorId" = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "sessions_update" ON public.sessions;
CREATE POLICY "sessions_update" ON public.sessions FOR UPDATE
  USING ("professorId" = auth.uid() OR public.is_admin());

-- Attendance
DROP POLICY IF EXISTS "attendance_select" ON public.attendance;
CREATE POLICY "attendance_select" ON public.attendance FOR SELECT
  USING ("studentId" = auth.uid()
    OR "sessionId" IN (SELECT id FROM public.sessions WHERE "professorId" = auth.uid())
    OR public.is_admin());
DROP POLICY IF EXISTS "attendance_insert" ON public.attendance;
CREATE POLICY "attendance_insert" ON public.attendance FOR INSERT
  WITH CHECK ("sessionId" IN (SELECT id FROM public.sessions WHERE "professorId" = auth.uid())
    OR public.is_admin());
DROP POLICY IF EXISTS "attendance_update" ON public.attendance;
CREATE POLICY "attendance_update" ON public.attendance FOR UPDATE
  USING ("sessionId" IN (SELECT id FROM public.sessions WHERE "professorId" = auth.uid())
    OR public.is_admin());

-- ── 6. RPC analytics (idempotent) ──
CREATE OR REPLACE FUNCTION public.attendance_by_group()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result JSON;
BEGIN
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
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO result
  FROM (SELECT to_char(s."sessionDate", 'YYYY"-W"IW') AS "name", COUNT(*)::int AS "count"
    FROM public.attendance a JOIN public.sessions s ON s.id = a."sessionId"
    WHERE a.status IN ('absent', 'late')
    GROUP BY to_char(s."sessionDate", 'YYYY"-W"IW') ORDER BY "name") t;
  RETURN result;
END; $$;
