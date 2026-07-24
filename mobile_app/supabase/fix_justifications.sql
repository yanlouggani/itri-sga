-- Fix submit_justification: lowercase status + also allow 'late'
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
    AND status IN ('absent', 'late')
    AND ("justificationStatus" IS NULL OR "justificationStatus" = 'REJECTED');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Impossible de justifier : absence non trouvée ou déjà justifiée';
  END IF;
END;
$$;

-- Fix process_justification: lowercase 'justified'
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
      status = 'justified',
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

-- Add justificationFile column for storing uploaded PDF URL
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS "justificationFile" TEXT;
