-- PolyCollab Supabase Idempotent Database Schema
-- Run this complete script in Supabase SQL Editor to reset and build all tables cleanly without errors.

-- 1. Drop existing tables safely to prevent 42P07 relation errors
DROP TABLE IF EXISTS ticket_replies CASCADE;
DROP TABLE IF EXISTS support_tickets CASCADE;
DROP TABLE IF EXISTS project_roles CASCADE;
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS profile_preferences CASCADE;
DROP TABLE IF EXISTS profile_projects CASCADE;
DROP TABLE IF EXISTS profile_experiences CASCADE;
DROP TABLE IF EXISTS profile_tech_stacks CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS bookmarks CASCADE;
DROP TABLE IF EXISTS build_sprints CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;

-- 2. Create Profiles Table (Stores user profiles)
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  primary_email TEXT UNIQUE NOT NULL,
  title TEXT DEFAULT 'Full Stack Engineer',
  location TEXT DEFAULT 'San Francisco, CA',
  bio TEXT DEFAULT 'Specializing in distributed systems and scalable web platforms.',
  github_url TEXT,
  website_url TEXT,
  avatar_url TEXT DEFAULT 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tech Stack Table
CREATE TABLE profile_tech_stacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'languages', 'frontend', 'backend'
  skill_name TEXT NOT NULL
);

-- 4. Work Experience Table
CREATE TABLE profile_experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  title TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN DEFAULT FALSE,
  achievements TEXT
);

-- 5. User Portfolio Projects Table
CREATE TABLE profile_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'Completed',
  tech_tags TEXT,
  project_url TEXT
);

-- 6. User Onboarding Preferences Table
CREATE TABLE profile_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  project_style TEXT DEFAULT 'Early Stage',
  role_interaction TEXT DEFAULT 'Tech Lead',
  communication_preference TEXT DEFAULT 'Async First'
);

-- 7. Platform Projects Table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
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

-- 8. Project Roles Table
CREATE TABLE project_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  openings INT DEFAULT 1,
  description TEXT
);

-- 9. Project Applications Table
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  applicant_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role_applied TEXT NOT NULL,
  status TEXT DEFAULT 'Under Review',
  why_join TEXT,
  experience TEXT,
  links TEXT[],
  comm_pref TEXT,
  comm_handle TEXT,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Support Tickets Table
CREATE TABLE support_tickets (
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

-- 11. Ticket Replies Table
CREATE TABLE ticket_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id TEXT REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Enable Row Level Security & Allow Public Read/Write Access for Setup
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_tech_stacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Access Profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Public Insert Access Profiles" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access Profiles" ON profiles FOR UPDATE USING (true);

CREATE POLICY "Public Read Access Projects" ON projects FOR SELECT USING (true);
CREATE POLICY "Public Insert Access Projects" ON projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access Projects" ON projects FOR UPDATE USING (true);
CREATE POLICY "Public Delete Access Projects" ON projects FOR DELETE USING (true);

CREATE POLICY "Public Access Project Roles" ON project_roles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Applications" ON applications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Support Tickets" ON support_tickets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Ticket Replies" ON ticket_replies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Tech Stacks" ON profile_tech_stacks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Experiences" ON profile_experiences FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Profile Projects" ON profile_projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Profile Preferences" ON profile_preferences FOR ALL USING (true) WITH CHECK (true);

-- 13. No seed data. (Fake projects removed as requested)
