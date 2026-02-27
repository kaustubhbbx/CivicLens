-- ═══════════════════════════════════════════════════════════════════════════
-- CivicLens — Complete Supabase Setup SQL
-- Run this ENTIRE script in Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. ADD image_url COLUMN TO EXISTING complaints TABLE ────────────────
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS image_url TEXT;

-- ─── 2. ACTIVITY LOGS TABLE ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_logs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type            TEXT NOT NULL CHECK (type IN ('AI', 'SYSTEM', 'ROUTE', 'SLA', 'VOTE', 'STATUS')),
  message         TEXT NOT NULL,
  complaint_uid   TEXT,
  level           TEXT DEFAULT 'info' CHECK (level IN ('info', 'warn', 'error', 'success')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read logs" ON activity_logs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert logs" ON activity_logs FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_logs_created_at ON activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_type ON activity_logs (type);
CREATE INDEX IF NOT EXISTS idx_logs_complaint ON activity_logs (complaint_uid);

-- ─── 3. STORAGE BUCKET (complaint-media) ─────────────────────────────────
-- NOTE: The bucket itself must be created in Supabase Dashboard → Storage
-- Click "New bucket" → Name: complaint-media → Toggle "Public bucket" ON
--
-- The policies below enable public read + upload:

INSERT INTO storage.buckets (id, name, public)
VALUES ('complaint-media', 'complaint-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read complaint media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'complaint-media');

CREATE POLICY "Public upload complaint media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'complaint-media');

-- ═══════════════════════════════════════════════════════════════════════════
-- DONE! After running, refresh localhost:5173 and submit a complaint.
-- ═══════════════════════════════════════════════════════════════════════════
