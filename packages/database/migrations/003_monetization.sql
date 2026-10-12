-- Monetization enforcement + free manual notes. Additive, safe to re-run.

-- Usage metering with a dedupe key to avoid double-charging.
ALTER TABLE usage_records ADD COLUMN IF NOT EXISTS dedupe_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_dedupe_key
  ON usage_records (dedupe_key) WHERE dedupe_key IS NOT NULL;
-- Index for monthly allowance lookups.
CREATE INDEX IF NOT EXISTS idx_usage_user_resource_period
  ON usage_records (user_id, resource_type, recorded_at DESC);

-- Summary provenance: ai, template, or manual.
ALTER TABLE meeting_summaries ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'ai';

-- Free manual notes: a meeting can be typed content only.
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS agenda TEXT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS objectives TEXT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS meeting_date TIMESTAMPTZ;

-- Index for manual-note listing.
CREATE INDEX IF NOT EXISTS idx_meetings_user_content
  ON meetings (user_id, created_at DESC) WHERE content IS NOT NULL;

-- Refresh plan limits/features. Read server-side only.
INSERT INTO plans (id, name, slug, price_monthly, price_annual, limits, features, active) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'Free', 'free', 0, 0,
   '{"transcriptionMinutes": 60, "storageGB": 1, "meetings": 10, "exports": 5, "aiTokens": 100000, "teamMembers": 1, "manualNotes": "unlimited", "templates": "basic"}',
   '["Unlimited manual meeting notes", "Basic templates (business, team, client)", "Organize notes into minutes (no AI required)", "Search and edit saved notes", "5 basic exports/month", "60 min/month AI transcription trial (only when AI is configured)", "1GB storage"]',
   true),
  ('550e8400-e29b-41d4-a716-446655440001', 'Pro', 'pro', 9.99, 99.99,
   '{"transcriptionMinutes": 500, "storageGB": 10, "meetings": 100, "exports": 50, "aiTokens": 1000000, "teamMembers": 1, "manualNotes": "unlimited", "templates": "all"}',
   '["Everything in Free", "500 min/month AI transcription", "AI summaries and action-item extraction", "Multilingual transcription with English summaries", "All templates + professional PDF/DOCX exports", "50 exports/month", "10GB storage"]',
   true),
  ('550e8400-e29b-41d4-a716-446655440002', 'Business', 'business', 29.99, 299.99,
   '{"transcriptionMinutes": 2000, "storageGB": 100, "meetings": 1000, "exports": 500, "aiTokens": 10000000, "teamMembers": 50, "manualNotes": "unlimited", "templates": "all"}',
   '["Everything in Pro", "2000 min/month AI transcription", "Shared workspaces and team collaboration", "Team-level usage limits and reporting", "Centralized billing and administration", "500 exports/month", "100GB storage"]',
   true)
ON CONFLICT (slug) DO UPDATE
  SET limits = EXCLUDED.limits,
      features = EXCLUDED.features,
      price_monthly = EXCLUDED.price_monthly,
      price_annual = EXCLUDED.price_annual,
      active = EXCLUDED.active;
