-- SGAU Supabase Migration v1
-- PostgreSQL schema compatible with Flutter models (camelCase columns)

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Enums as TEXT with CHECK constraints ──

-- ── Groups ──
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

-- ── Users (extends auth.users) ──
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

-- ── Auto-create public.users row on signup ──
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

-- ── Modules ──
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

-- Module-Group junction (many-to-many)
CREATE TABLE public.module_groups (
  "moduleId" UUID REFERENCES public.modules(id) ON DELETE CASCADE,
  "groupId" UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  PRIMARY KEY ("moduleId", "groupId")
);

-- ── Rooms ──
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

-- ── Sessions ──
CREATE TABLE public.sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "moduleId" UUID NOT NULL REFERENCES public.modules(id),
  "professorId" UUID NOT NULL REFERENCES public.users(id),
  "groupId" UUID NOT NULL REFERENCES public.groups(id),
  "roomId" UUID NOT NULL REFERENCES public.rooms(id),
  "sessionDate" DATE NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED','ACTIVE','COMPLETED','POSTPONED','CANCELLED')),
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

-- ── Attendance ──
CREATE TABLE public.attendance (
  "sessionId" UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  "studentId" UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'UNMARKED' CHECK (status IN ('UNMARKED','PRESENT','ABSENT','LATE','JUSTIFIED')),
  "markedBy" TEXT NOT NULL DEFAULT 'PROFESSOR' CHECK ("markedBy" IN ('PROFESSOR','STUDENT','ADMIN','SYSTEM')),
  "scanMethod" TEXT NOT NULL DEFAULT 'MANUAL' CHECK ("scanMethod" IN ('MANUAL','QR','QR_SESSION','QR_STUDENT','IMPORT')),
  "gpsVerified" BOOLEAN DEFAULT false,
  "gpsLatitude" DOUBLE PRECISION,
  "gpsLongitude" DOUBLE PRECISION,
  "lateMinutes" INTEGER,
  "markedAt" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("sessionId", "studentId")
);

CREATE INDEX idx_attendance_student ON public.attendance("studentId");
CREATE INDEX idx_attendance_status ON public.attendance(status);

-- ── Enable Row Level Security ──
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- ── Helper function: is_admin (SECURITY DEFINER bypasses RLS) ──
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin');
$$;

-- ── RLS Policies ──

-- Users: can read own row; admins can read all; users can update own
CREATE POLICY "users_select_own" ON public.users FOR SELECT
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "users_update_own" ON public.users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Groups: all authenticated users can read; only admins can write
CREATE POLICY "groups_select" ON public.groups FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "groups_insert" ON public.groups FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "groups_update" ON public.groups FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "groups_delete" ON public.groups FOR DELETE
  USING (public.is_admin());

-- Modules: all authenticated can read; admin write
CREATE POLICY "modules_select" ON public.modules FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "modules_insert" ON public.modules FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "modules_update" ON public.modules FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "modules_delete" ON public.modules FOR DELETE
  USING (public.is_admin());

-- Rooms: all authenticated can read; admin write
CREATE POLICY "rooms_select" ON public.rooms FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "rooms_insert" ON public.rooms FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "rooms_update" ON public.rooms FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "rooms_delete" ON public.rooms FOR DELETE
  USING (public.is_admin());

-- Sessions: professors see own; students see their group; admins see all
CREATE POLICY "sessions_select" ON public.sessions FOR SELECT
  USING (
    "professorId" = auth.uid()
    OR "groupId" IN (SELECT "groupId" FROM public.users WHERE id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "sessions_insert" ON public.sessions FOR INSERT
  WITH CHECK (
    "professorId" = auth.uid()
    OR public.is_admin()
  );

CREATE POLICY "sessions_update" ON public.sessions FOR UPDATE
  USING (
    "professorId" = auth.uid()
    OR public.is_admin()
  );

-- Attendance: students see own; professors see their sessions; admins see all
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
