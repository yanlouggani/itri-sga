-- ═══════════════════════════════════════════════════════════
-- Fix remaining uppercase → lowercase in RPC functions
-- Apply AFTER fix_incremental.sql and ALL migrations
-- ═══════════════════════════════════════════════════════════

-- 1. populate_session_attendance — 'UNMARKED' → 'unmarked'
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
  SELECT p_session_id, u.id, 'unmarked', 'system', now()
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

-- 2. close_session — lowercase status comparisons
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
  SELECT COUNT(*) FILTER (WHERE status = 'present'),
         COUNT(*) FILTER (WHERE status = 'absent'),
         COUNT(*) FILTER (WHERE status = 'late')
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

-- 3. RLS policy: Allow admin to UPDATE users (needed for groupId assignment)
DROP POLICY IF EXISTS "users_update_admin" ON public.users;
CREATE POLICY "users_update_admin" ON public.users FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4. RLS policy: Allow authenticated users to view other users (needed for attendance student names)
DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own" ON public.users FOR SELECT
  USING (auth.role() = 'authenticated');
