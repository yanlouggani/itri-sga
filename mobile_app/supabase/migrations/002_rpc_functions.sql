-- SGAU Supabase RPC Functions for Analytics

-- 1. Absences par groupe
-- Retourne: [{name: "Master 1 - GL", count: 5}, ...]
CREATE OR REPLACE FUNCTION public.attendance_by_group()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  INTO result
  FROM (
    SELECT g.name, COUNT(*)::int AS "count"
    FROM public.attendance a
    JOIN public.sessions s ON s.id = a."sessionId"
    JOIN public.groups g ON g.id = s."groupId"
    WHERE a.status IN ('ABSENT', 'LATE')
    GROUP BY g.name
    ORDER BY "count" DESC
  ) t;
  RETURN result;
END;
$$;

-- 2. Absences par module
-- Retourne: [{name: "Génie Logiciel Avancé", count: 3}, ...]
CREATE OR REPLACE FUNCTION public.attendance_by_module()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  INTO result
  FROM (
    SELECT m.name, COUNT(*)::int AS "count"
    FROM public.attendance a
    JOIN public.sessions s ON s.id = a."sessionId"
    JOIN public.modules m ON m.id = s."moduleId"
    WHERE a.status IN ('ABSENT', 'LATE')
    GROUP BY m.name
    ORDER BY "count" DESC
  ) t;
  RETURN result;
END;
$$;

-- 3. Salles les plus utilisées
-- Retourne: [{name: "Amphithéâtre B", count: 12}, ...]
CREATE OR REPLACE FUNCTION public.busiest_rooms()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  INTO result
  FROM (
    SELECT r.name, COUNT(*)::int AS "count"
    FROM public.sessions s
    JOIN public.rooms r ON r.id = s."roomId"
    GROUP BY r.name
    ORDER BY "count" DESC
  ) t;
  RETURN result;
END;
$$;

-- 4. Tendance des absences par semaine
-- Retourne: [{name: "2026-W21", count: 8}, ...]
CREATE OR REPLACE FUNCTION public.attendance_trend()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  INTO result
  FROM (
    SELECT
      to_char(s."sessionDate", 'YYYY"-W"IW') AS "name",
      COUNT(*)::int AS "count"
    FROM public.attendance a
    JOIN public.sessions s ON s.id = a."sessionId"
    WHERE a.status IN ('ABSENT', 'LATE')
    GROUP BY to_char(s."sessionDate", 'YYYY"-W"IW')
    ORDER BY "name"
  ) t;
  RETURN result;
END;
$$;
