-- ============================================================
-- PolyCollab Supabase Complete Schema (Idempotent)
-- Run this in Supabase SQL Editor to safely rebuild all tables.
-- Uses CREATE TABLE IF NOT EXISTS — safe to re-run at any time.
-- ============================================================

-- ============================================================
-- 1. PROFILES TABLE (Extends Supabase Auth users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL DEFAULT '',
  primary_email TEXT UNIQUE NOT NULL,
  title TEXT DEFAULT 'Full Stack Engineer',
  location TEXT DEFAULT 'Remote',
  bio TEXT DEFAULT '',
  github_url TEXT,
  website_url TEXT,
  avatar_url TEXT DEFAULT 'https://ui-avatars.com/api/?name=Builder&background=6366f1&color=fff&size=128',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. TECH STACK SKILLS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profile_tech_stacks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'languages', 'frontend', 'backend'
  skill_name TEXT NOT NULL
);

-- ============================================================
-- 3. PROFESSIONAL EXPERIENCE & ROLES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profile_experiences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  title TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN DEFAULT FALSE,
  achievements TEXT
);

-- ============================================================
-- 4. USER PORTFOLIO PROJECTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profile_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'Completed',
  tech_tags TEXT,
  project_url TEXT
);

-- ============================================================
-- 5. USER WORK PREFERENCES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profile_preferences (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  project_style TEXT DEFAULT 'Early Stage',
  role_interaction TEXT DEFAULT 'Tech Lead',
  communication_preference TEXT DEFAULT 'Async First'
);

-- ============================================================
-- 6. PLATFORM PROJECTS CATALOG
-- ============================================================
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT DEFAULT 'Open', -- 'Open', 'In Progress', 'Completed', 'Draft'
  level TEXT DEFAULT 'Intermediate',
  description TEXT,
  team_capacity INT DEFAULT 5,
  builders_count INT DEFAULT 1,
  tech_stack TEXT[],
  stage TEXT DEFAULT 'In Development',
  goal TEXT,
  duration TEXT,
  commitment TEXT,
  communication TEXT,
  visibility TEXT DEFAULT 'Public',
  ref_link TEXT,
  creator_name TEXT,
  creator_avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. PROJECT ROLES (openings per role per project)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.project_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  openings INT DEFAULT 1,
  description TEXT
);

-- ============================================================
-- 8. PROJECT APPLICATIONS
-- Full fields required by /api/applications endpoint
-- ============================================================
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  applicant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_applied TEXT NOT NULL,
  status TEXT DEFAULT 'Under Review',
  why_join TEXT,
  experience TEXT,
  links TEXT[],
  comm_pref TEXT,
  comm_handle TEXT,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. SUPPORT TICKETS
-- (Emails always go to admin — user email is metadata only)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  user_name TEXT,
  subject TEXT NOT NULL,
  category TEXT DEFAULT 'Technical',
  priority TEXT DEFAULT 'Medium',
  status TEXT DEFAULT 'Open',
  description TEXT,
  attachment_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. TICKET REPLIES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ticket_replies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id TEXT REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. OTP CODES
-- Stores signup OTPs temporarily (cleared after verification)
-- Also used for forgot-password OTPs (replaces in-memory Map)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.otp_codes (
  email TEXT PRIMARY KEY,
  otp_code TEXT NOT NULL,
  password TEXT,          -- stores hashed/plain password during signup flow
  otp_type TEXT DEFAULT 'signup', -- 'signup' | 'reset'
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 12. KEEP ALIVE LOGS
-- Pinged by cron-job.org every 5 minutes to prevent Supabase
-- free-tier project from pausing due to inactivity.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.keep_alive_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT DEFAULT 'cron-job.org',
  pinged_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTE: The following are intentionally NOT in the database.
-- They are handled purely via localStorage on the client:
--   • bookmarks     → polycollab_bookmarked_projects_*, bookmarked_builders_*
--   • notifications → polycollab_notifications_list
--   • build_sprints → polycollab_build_sprints (if used)
--   • messages      → not implemented yet
-- ============================================================

-- ============================================================
-- ROW LEVEL SECURITY — Enable on all tables
-- ============================================================
ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_tech_stacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_projects    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_roles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_replies      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_codes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keep_alive_logs     ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- Using service_role key on backend bypasses RLS anyway,
-- but these allow anon key access from frontend where needed.
-- ============================================================

-- Profiles
DROP POLICY IF EXISTS "Public Read Access Profiles"   ON public.profiles;
DROP POLICY IF EXISTS "Public Insert Access Profiles"  ON public.profiles;
DROP POLICY IF EXISTS "Public Update Access Profiles"  ON public.profiles;
DROP POLICY IF EXISTS "Public Delete Access Profiles"  ON public.profiles;
CREATE POLICY "Public Read Access Profiles"   ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Public Insert Access Profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access Profiles" ON public.profiles FOR UPDATE USING (true);
CREATE POLICY "Public Delete Access Profiles" ON public.profiles FOR DELETE USING (true);

-- Projects
DROP POLICY IF EXISTS "Public Read Access Projects"   ON public.projects;
DROP POLICY IF EXISTS "Public Insert Access Projects"  ON public.projects;
DROP POLICY IF EXISTS "Public Update Access Projects"  ON public.projects;
DROP POLICY IF EXISTS "Public Delete Access Projects"  ON public.projects;
CREATE POLICY "Public Read Access Projects"   ON public.projects FOR SELECT USING (true);
CREATE POLICY "Public Insert Access Projects" ON public.projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access Projects" ON public.projects FOR UPDATE USING (true);
CREATE POLICY "Public Delete Access Projects" ON public.projects FOR DELETE USING (true);

-- All other tables: full public access (backend uses service_role anyway)
DROP POLICY IF EXISTS "Public Access Project Roles"        ON public.project_roles;
DROP POLICY IF EXISTS "Public Access Applications"         ON public.applications;
DROP POLICY IF EXISTS "Public Access Support Tickets"      ON public.support_tickets;
DROP POLICY IF EXISTS "Public Access Ticket Replies"       ON public.ticket_replies;
DROP POLICY IF EXISTS "Public Access Tech Stacks"          ON public.profile_tech_stacks;
DROP POLICY IF EXISTS "Public Access Experiences"          ON public.profile_experiences;
DROP POLICY IF EXISTS "Public Access Profile Projects"     ON public.profile_projects;
DROP POLICY IF EXISTS "Public Access Profile Preferences"  ON public.profile_preferences;
DROP POLICY IF EXISTS "Public Access OTP Codes"            ON public.otp_codes;
DROP POLICY IF EXISTS "Public Access Keep Alive Logs"      ON public.keep_alive_logs;

CREATE POLICY "Public Access Project Roles"        ON public.project_roles       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Applications"         ON public.applications         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Support Tickets"      ON public.support_tickets      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Ticket Replies"       ON public.ticket_replies       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Tech Stacks"          ON public.profile_tech_stacks  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Experiences"          ON public.profile_experiences  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Profile Projects"     ON public.profile_projects     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Profile Preferences"  ON public.profile_preferences  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access OTP Codes"            ON public.otp_codes            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Keep Alive Logs"      ON public.keep_alive_logs      FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- DONE — All tables created, RLS enabled, policies set.
-- Run this script in Supabase SQL Editor after resuming project.
-- ============================================================
