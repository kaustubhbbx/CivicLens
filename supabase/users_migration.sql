-- ═══════════════════════════════════════════════════════════════════════════
-- CivicLens — Users Table for Clerk + Supabase Role System
-- Run this script in Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── USERS TABLE ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clerk_id    TEXT UNIQUE NOT NULL,
  email       TEXT,
  role        TEXT DEFAULT 'citizen' CHECK (role IN ('citizen', 'admin')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow reading user data (for role checks)
CREATE POLICY "Anyone can read users" ON users FOR SELECT USING (true);

-- Allow inserting new users (for Clerk sync)
CREATE POLICY "Anyone can insert users" ON users FOR INSERT WITH CHECK (true);

-- Allow updating user data
CREATE POLICY "Anyone can update users" ON users FOR UPDATE USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users (clerk_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

-- ═══════════════════════════════════════════════════════════════════════════
-- To make a user an admin, run:
-- UPDATE users SET role = 'admin' WHERE email = 'your-admin@email.com';
-- ═══════════════════════════════════════════════════════════════════════════
