-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  password_hash TEXT,
  invitation_token TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  profile_id TEXT,
  text TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('single', 'multiple', 'scale', 'boolean')),
  options JSONB DEFAULT '[]',
  dimension TEXT,
  weight INTEGER DEFAULT 1,
  order_index INTEGER DEFAULT 0,
  section TEXT DEFAULT 'general'
);

-- Audit sessions table
CREATE TABLE IF NOT EXISTS audit_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL,
  current_question_index INTEGER DEFAULT 0,
  answers JSONB DEFAULT '{}',
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Audits table
CREATE TABLE IF NOT EXISTS audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  profile_id TEXT NOT NULL,
  answers JSONB,
  scores JSONB,
  ai_analysis TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_invitation_token ON users(invitation_token);
CREATE INDEX IF NOT EXISTS idx_questions_profile_id ON questions(profile_id);
CREATE INDEX IF NOT EXISTS idx_questions_section ON questions(section);
CREATE INDEX IF NOT EXISTS idx_audit_sessions_user_id ON audit_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_sessions_status ON audit_sessions(status);
CREATE INDEX IF NOT EXISTS idx_audits_user_id ON audits(user_id);
CREATE INDEX IF NOT EXISTS idx_audits_company_id ON audits(company_id);

-- AI Conversational chat sessions
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL,
  messages JSONB DEFAULT '[]',
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  scores JSONB,
  ai_analysis TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user_id ON ai_chat_sessions(user_id);
