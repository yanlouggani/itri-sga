-- ═══════════════════════════════════════════════════════════
-- SGAU v2 — Fix trigger handle_new_user + RPC admin_finalize_user
-- ═══════════════════════════════════════════════════════════

-- ── 1. Fix trigger: NEW.email peut être NULL (colonne générée) ──
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

-- ── 2. RPC fallback pour finaliser la création utilisateur ──
-- SECURITY DEFINER permet de contourner le manque de RLS sur auth.users
CREATE OR REPLACE FUNCTION public.admin_finalize_user(
  p_uid UUID,
  p_group_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_meta JSONB;
  v_email TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
  v_role TEXT;
BEGIN
  SELECT raw_user_meta_data, email
  INTO v_meta, v_email
  FROM auth.users
  WHERE id = p_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Utilisateur introuvable dans auth.users';
  END IF;

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

COMMENT ON FUNCTION public.admin_finalize_user IS
  'Finalise la création d''un utilisateur : upsert dans public.users avec le rôle et le groupe';
