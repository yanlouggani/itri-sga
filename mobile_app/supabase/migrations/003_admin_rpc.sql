-- ═══════════════════════════════════════════════════════════
-- SGAU — Admin RPC functions (SECURITY DEFINER)
-- Ces fonctions contournent RLS et permettent de gérer
-- auth.users sans la clé service_role
-- ═══════════════════════════════════════════════════════════

-- Créer un utilisateur (auth + public)
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
    id, encrypted_password, email_confirmed_at,
    confirmation_sent_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, instance_id, aud, role,
    is_sso_user, is_anonymous
  ) VALUES (
    new_id, extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('firstName', p_first_name, 'lastName', p_last_name, 'role', p_role, 'email', p_email),
    now(), now(),
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    false, false
  );

  INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (new_id, new_id,
    jsonb_build_object('sub', new_id, 'email', p_email),
    'email', now(), now(), now());

  UPDATE public.users SET "groupId" = p_group_id WHERE id = new_id;

  RETURN new_id;
END;
$$;

-- Supprimer un utilisateur (auth + public, CASCADE)
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

-- Réinitialiser le mot de passe
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
