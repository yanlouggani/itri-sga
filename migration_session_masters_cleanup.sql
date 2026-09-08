-- ITRI Academy — NETTOYAGE DU MODÈLE LEGACY weekly_entries
-- ============================================================
-- À EXÉCUTER APRÈS :
--   1. migration_session_masters.sql   (nouveau modèle séries récurrentes)
--   2. migration_session_masters_import.sql (import des données existantes, optionnel)
--
-- Ce script supprime les objets legacy : RPCs, politiques RLS et table weekly_entries.
-- Il est IDEMPOTENT (DROP ... IF EXISTS) et ne touche à aucune donnée de session_masters.

-- 1. RPCs legacy
DROP FUNCTION IF EXISTS insert_entry_atomic(uuid, date, int, text, text, uuid, uuid, text);
DROP FUNCTION IF EXISTS delete_cascade(uuid, int, text, date);
DROP FUNCTION IF EXISTS publish_week(uuid, date);

-- 2. Politiques RLS legacy
DROP POLICY IF EXISTS "Admins full access" ON weekly_entries;
DROP POLICY IF EXISTS "Professors read weekly_entries" ON weekly_entries;
DROP POLICY IF EXISTS "Students read weekly_entries" ON weekly_entries;

-- 3. Table legacy (avec ses index/colonnes via CASCADE)
--    ⚠️ Détruit définitivement l'historique weekly_entries non importé.
DROP TABLE IF EXISTS weekly_entries CASCADE;
