-- ═══════════════════════════════════════════════════════════
-- SGAU — Seed Sessions & Présences
-- ═══════════════════════════════════════════════════════════
-- 1. Créer les users Auth via Dashboard → Authentication → Add User
--    (admin@sga.com, jean.dupont@sga.com, marie.martin@sga.com,
--     alice.student@sga.com, bob.student@sga.com, charlie.student@sga.com,
--     diana.student@sga.com, eve.student@sga.com, frank.student@sga.com)
--    Mot de passe pour tous : password123
--
-- 2. Copier les UUIDs depuis Authentication → Users
-- 3. Remplacer les TODO_... ci-dessous par les vrais UUIDs
-- 4. Exécuter ce fichier
-- ═══════════════════════════════════════════════════════════

-- ── Mise à jour des rôles ──
UPDATE public.users SET role = 'admin' WHERE email = 'admin@sga.com';
UPDATE public.users SET role = 'professor' WHERE email = 'jean.dupont@sga.com';
UPDATE public.users SET role = 'professor' WHERE email = 'marie.martin@sga.com';

UPDATE public.users SET "groupId" = 'a1000000-0000-0000-0000-000000000001'
WHERE email IN ('alice.student@sga.com', 'bob.student@sga.com');
UPDATE public.users SET "groupId" = 'a1000000-0000-0000-0000-000000000002'
WHERE email IN ('charlie.student@sga.com', 'diana.student@sga.com');
UPDATE public.users SET "groupId" = 'a1000000-0000-0000-0000-000000000003'
WHERE email IN ('eve.student@sga.com', 'frank.student@sga.com');

-- ── REMPLACER LES UUIDs CI-DESSOUS ──
-- À récupérer depuis Supabase Dashboard → Authentication → Users
--
-- Professeurs
-- TODO_PROF_JEAN  ← UUID de jean.dupont@sga.com
-- TODO_PROF_MARIE ← UUID de marie.martin@sga.com
--
-- Étudiants
-- TODO_STUDENT_ALICE    ← UUID de alice.student@sga.com
-- TODO_STUDENT_BOB      ← UUID de bob.student@sga.com
-- TODO_STUDENT_CHARLIE  ← UUID de charlie.student@sga.com
-- TODO_STUDENT_DIANA    ← UUID de diana.student@sga.com
-- TODO_STUDENT_EVE      ← UUID de eve.student@sga.com
-- TODO_STUDENT_FRANK    ← UUID de frank.student@sga.com

INSERT INTO public.sessions
  (id, "moduleId", "roomId", "groupId", "professorId",
   "sessionDate", "startTime", "endTime", status, "currentQrToken",
   "classroomLat", "classroomLng")
VALUES

-- Séance 1 : GLA - M1 GL - 02/03/2026
('d4000000-0000-0000-0000-000000000001',
 'b2000000-0000-0000-0000-000000000001',
 'c3000000-0000-0000-0000-000000000003',
 'a1000000-0000-0000-0000-000000000001',
 'TODO_PROF_JEAN',
 '2026-03-02', '08:30', '11:30', 'completed', 'QR-GLA-001',
 48.8566, 2.3522),

-- Séance 2 : SD - M1 SI - 03/03/2026
('d4000000-0000-0000-0000-000000000002',
 'b2000000-0000-0000-0000-000000000002',
 'c3000000-0000-0000-0000-000000000001',
 'a1000000-0000-0000-0000-000000000002',
 'TODO_PROF_MARIE',
 '2026-03-03', '13:30', '16:30', 'completed', 'QR-SD-001',
 48.8566, 2.3522),

-- Séance 3 : IA - M2 GL - 04/03/2026
('d4000000-0000-0000-0000-000000000003',
 'b2000000-0000-0000-0000-000000000003',
 'c3000000-0000-0000-0000-000000000004',
 'a1000000-0000-0000-0000-000000000003',
 'TODO_PROF_MARIE',
 '2026-03-04', '08:30', '11:30', 'completed', 'QR-IA-001',
 48.8566, 2.3522),

-- Séance 4 : GLA - M1 GL - 09/03/2026
('d4000000-0000-0000-0000-000000000004',
 'b2000000-0000-0000-0000-000000000001',
 'c3000000-0000-0000-0000-000000000003',
 'a1000000-0000-0000-0000-000000000001',
 'TODO_PROF_JEAN',
 '2026-03-09', '08:30', '11:30', 'completed', 'QR-GLA-002',
 48.8566, 2.3522),

-- Séance 5 : BDA - M1 GL - 10/03/2026
('d4000000-0000-0000-0000-000000000005',
 'b2000000-0000-0000-0000-000000000004',
 'c3000000-0000-0000-0000-000000000002',
 'a1000000-0000-0000-0000-000000000001',
 'TODO_PROF_JEAN',
 '2026-03-10', '13:30', '16:30', 'completed', 'QR-BDA-001',
 48.8566, 2.3522),

-- Séance 6 : IA - M1 SI - aujourd'hui (active)
('d4000000-0000-0000-0000-000000000006',
 'b2000000-0000-0000-0000-000000000003',
 'c3000000-0000-0000-0000-000000000001',
 'a1000000-0000-0000-0000-000000000002',
 'TODO_PROF_MARIE',
 CURRENT_DATE, '08:30', '11:30', 'active', 'QR-IA-002',
 48.8566, 2.3522)
ON CONFLICT DO NOTHING;

-- ── Présences ──

-- Séance 1 : Alice présente, Bob en retard
INSERT INTO public.attendance ("studentId", "sessionId", status, "markedBy", "scanMethod", "markedAt") VALUES
('TODO_STUDENT_ALICE', 'd4000000-0000-0000-0000-000000000001', 'present', 'professor', 'qr', '2026-03-02T08:35:00Z'),
('TODO_STUDENT_BOB',   'd4000000-0000-0000-0000-000000000001', 'late',    'professor', 'qr', '2026-03-02T09:15:00Z');

-- Séance 2 : Charlie présent, Diana absente
INSERT INTO public.attendance ("studentId", "sessionId", status, "markedBy", "scanMethod", "markedAt") VALUES
('TODO_STUDENT_CHARLIE', 'd4000000-0000-0000-0000-000000000002', 'present', 'professor', 'qr', '2026-03-03T13:35:00Z'),
('TODO_STUDENT_DIANA',   'd4000000-0000-0000-0000-000000000002', 'absent',  'professor', 'manual', NULL);

-- Séance 3 : Eve présente, Frank absent
INSERT INTO public.attendance ("studentId", "sessionId", status, "markedBy", "scanMethod", "markedAt") VALUES
('TODO_STUDENT_EVE',   'd4000000-0000-0000-0000-000000000003', 'present', 'professor', 'qr', '2026-03-04T08:32:00Z'),
('TODO_STUDENT_FRANK', 'd4000000-0000-0000-0000-000000000003', 'absent',  'professor', 'manual', NULL);

-- Séance 4 : Alice absente, Bob présent
INSERT INTO public.attendance ("studentId", "sessionId", status, "markedBy", "scanMethod", "markedAt") VALUES
('TODO_STUDENT_ALICE', 'd4000000-0000-0000-0000-000000000004', 'absent',  'professor', 'manual', NULL),
('TODO_STUDENT_BOB',   'd4000000-0000-0000-0000-000000000004', 'present', 'professor', 'qr', '2026-03-09T08:33:00Z');

-- Séance 5 : Alice présente, Bob présent
INSERT INTO public.attendance ("studentId", "sessionId", status, "markedBy", "scanMethod", "markedAt") VALUES
('TODO_STUDENT_ALICE', 'd4000000-0000-0000-0000-000000000005', 'present', 'professor', 'qr', '2026-03-10T13:35:00Z'),
('TODO_STUDENT_BOB',   'd4000000-0000-0000-0000-000000000005', 'present', 'professor', 'qr', '2026-03-10T13:32:00Z');
