-- ── 007 : Justification d'absences ──
-- Colonnes de justification sur attendance
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS "justificationReason" TEXT;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS "justificationStatus" TEXT DEFAULT NULL CHECK ("justificationStatus" IN ('PENDING','APPROVED','REJECTED'));
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS "justificationSubmittedAt" TIMESTAMPTZ;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS "justificationProcessedAt" TIMESTAMPTZ;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS "justificationProcessedBy" UUID REFERENCES public.users(id);

-- RLS : permettre à l'étudiant de soumettre une justification
DROP POLICY IF EXISTS "attendance_justify_update" ON public.attendance;
CREATE POLICY "attendance_justify_update" ON public.attendance FOR UPDATE
  USING ("studentId" = auth.uid())
  WITH CHECK (
    "studentId" = auth.uid()
    AND "justificationStatus" IS DISTINCT FROM 'APPROVED'
  );

-- RPC : soumettre une justification (étudiant)
CREATE OR REPLACE FUNCTION public.submit_justification(
  p_session_id UUID,
  p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  UPDATE public.attendance
  SET
    "justificationReason" = p_reason,
    "justificationStatus" = 'PENDING',
    "justificationSubmittedAt" = now()
  WHERE
    "sessionId" = p_session_id
    AND "studentId" = auth.uid()
    AND status = 'ABSENT'
    AND ("justificationStatus" IS NULL OR "justificationStatus" = 'REJECTED');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Impossible de justifier : absence non trouvée ou déjà justifiée';
  END IF;
END;
$$;

-- RPC : traiter une justification (admin)
CREATE OR REPLACE FUNCTION public.process_justification(
  p_session_id UUID,
  p_student_id UUID,
  p_approve BOOLEAN,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Seuls les administrateurs peuvent traiter les justifications';
  END IF;

  IF p_approve THEN
    UPDATE public.attendance
    SET
      status = 'JUSTIFIED',
      "justificationStatus" = 'APPROVED',
      "justificationProcessedAt" = now(),
      "justificationProcessedBy" = auth.uid()
    WHERE
      "sessionId" = p_session_id
      AND "studentId" = p_student_id
      AND "justificationStatus" = 'PENDING';
  ELSE
    UPDATE public.attendance
    SET
      "justificationStatus" = 'REJECTED',
      "justificationProcessedAt" = now(),
      "justificationProcessedBy" = auth.uid()
    WHERE
      "sessionId" = p_session_id
      AND "studentId" = p_student_id
      AND "justificationStatus" = 'PENDING';
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Demande de justification non trouvée';
  END IF;
END;
$$;
