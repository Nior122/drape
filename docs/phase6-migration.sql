-- ============================================================
-- Phase 6 — Collaboration & Production Operating System
-- Database Migration Script
-- Run against the existing Drape PostgreSQL database
-- ============================================================

-- ── Enums ──────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE project_status AS ENUM ('NEW_REQUEST','CONSULTATION','DESIGN_BRIEF','DESIGNING','CLIENT_REVIEW','APPROVED','PATTERN_CUTTING','PRODUCTION','QUALITY_CHECK','PACKAGING','DELIVERY','COMPLETED','ARCHIVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE project_priority AS ENUM ('LOW','MEDIUM','HIGH','URGENT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE team_role AS ENUM ('OWNER','MANAGER','DESIGNER','PATTERN_MAKER','TAILOR','PRODUCTION_STAFF','QUALITY_INSPECTOR','ASSISTANT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE team_member_status AS ENUM ('INVITED','ACTIVE','REMOVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE task_status AS ENUM ('TODO','IN_PROGRESS','REVIEW','DONE','BLOCKED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE task_priority AS ENUM ('LOW','MEDIUM','HIGH','URGENT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE calendar_event_type AS ENUM ('MEETING','CONSULTATION','DEADLINE','FITTING','DELIVERY','MILESTONE','OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE project_file_category AS ENUM ('IMAGE','SKETCH','VIDEO','PDF','TECH_PACK','PRODUCTION_GUIDE','INVOICE','MOOD_BOARD','CONTRACT','OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE collaboration_type AS ENUM ('COMMENT','APPROVAL','REJECTION','REVISION_REQUEST','REFERENCE_UPLOAD'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE project_approval_status AS ENUM ('PENDING','APPROVED','REJECTED','CHANGES_REQUESTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Projects ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  client_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  designer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status project_status NOT NULL DEFAULT 'NEW_REQUEST',
  priority project_priority NOT NULL DEFAULT 'MEDIUM',
  budget INTEGER,
  currency TEXT NOT NULL DEFAULT 'NGN',
  due_date TIMESTAMPTZ,
  estimated_days INTEGER,
  tags TEXT[] DEFAULT '{}',
  colour TEXT DEFAULT '#C08B4E',
  status_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS projects_designer_idx ON projects(designer_id);
CREATE INDEX IF NOT EXISTS projects_client_idx ON projects(client_id);
CREATE INDEX IF NOT EXISTS projects_status_idx ON projects(status);

-- ── Team Members ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  studio_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  email TEXT,
  role team_role NOT NULL DEFAULT 'ASSISTANT',
  permissions JSONB DEFAULT '[]',
  status team_member_status NOT NULL DEFAULT 'INVITED',
  invited_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS team_members_studio_idx ON team_members(studio_id);
CREATE INDEX IF NOT EXISTS team_members_user_idx ON team_members(user_id);

-- ── Project Tasks ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_tasks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES project_tasks(id) ON DELETE CASCADE,
  assignee_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'TODO',
  priority task_priority NOT NULL DEFAULT 'MEDIUM',
  due_date TIMESTAMPTZ,
  estimated_minutes INTEGER,
  actual_minutes INTEGER,
  checklist JSONB DEFAULT '[]',
  dependencies TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  recurring_pattern TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS project_tasks_project_idx ON project_tasks(project_id);
CREATE INDEX IF NOT EXISTS project_tasks_assignee_idx ON project_tasks(assignee_id);
CREATE INDEX IF NOT EXISTS project_tasks_status_idx ON project_tasks(status);

-- ── Calendar Events ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type calendar_event_type NOT NULL DEFAULT 'OTHER',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  location TEXT,
  notes TEXT,
  attendees JSONB DEFAULT '[]',
  is_all_day BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS calendar_events_user_idx ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS calendar_events_project_idx ON calendar_events(project_id);
CREATE INDEX IF NOT EXISTS calendar_events_start_idx ON calendar_events(start_time);

-- ── Activity Logs ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS activity_logs_project_idx ON activity_logs(project_id);
CREATE INDEX IF NOT EXISTS activity_logs_user_idx ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS activity_logs_created_idx ON activity_logs(created_at);

-- ── Project Files ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_files (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  uploaded_by_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES project_files(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category project_file_category NOT NULL DEFAULT 'OTHER',
  mime_type TEXT,
  file_size INTEGER,
  path TEXT NOT NULL,
  thumbnail_path TEXT,
  folder TEXT DEFAULT '/',
  tags TEXT[] DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS project_files_project_idx ON project_files(project_id);
CREATE INDEX IF NOT EXISTS project_files_category_idx ON project_files(category);

-- ── Project Notes (internal) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS project_notes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  mentions TEXT[] DEFAULT '{}',
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS project_notes_project_idx ON project_notes(project_id);

-- ── Project Collaboration (client-facing) ──────────────────────
CREATE TABLE IF NOT EXISTS project_collaboration (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type collaboration_type NOT NULL DEFAULT 'COMMENT',
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS project_collab_project_idx ON project_collaboration(project_id);

-- ── Project Approvals ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_approvals (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  requested_by_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  decided_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  attachments JSONB DEFAULT '[]',
  status project_approval_status NOT NULL DEFAULT 'PENDING',
  comment TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS project_approvals_project_idx ON project_approvals(project_id);
CREATE INDEX IF NOT EXISTS project_approvals_status_idx ON project_approvals(status);

-- ── Project Timeline (milestones) ──────────────────────────────
CREATE TABLE IF NOT EXISTS project_timeline (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS project_timeline_project_idx ON project_timeline(project_id);

-- ── Automation Rules ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS automation_rules (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  studio_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger TEXT NOT NULL,
  conditions JSONB DEFAULT '{}',
  actions JSONB DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  run_count INTEGER NOT NULL DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS automation_rules_studio_idx ON automation_rules(studio_id);

-- ============================================================
-- END OF PHASE 6 MIGRATION
-- ============================================================
