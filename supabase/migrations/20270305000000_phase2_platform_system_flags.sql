-- Phase 2.9: Platform-level system flags table and autonomy kill switch seed
--
-- platform.system_flags is a key-value store for platform operators to toggle
-- system-level behaviours without a code deploy. Currently used by
-- fn_dispatch_scheduled_workflows_with_approval (from 20270301000000) to honour
-- the autonomy_dispatch_enabled kill switch.

CREATE SCHEMA IF NOT EXISTS platform;

CREATE TABLE IF NOT EXISTS platform.system_flags (
  key        text        PRIMARY KEY,
  value      jsonb       NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid        REFERENCES lensers.profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE platform.system_flags IS
  'Platform-level feature/kill-switch flags. Keyed by name, value is jsonb. '
  'service_role has full access; authenticated users have read-only access.';

-- service_role has full access (pg_cron, admin scripts, etc.)
ALTER TABLE platform.system_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY system_flags_read
  ON platform.system_flags
  FOR SELECT
  TO authenticated
  USING (true);

-- Writes are blocked for authenticated users — use a privileged migration or admin script
CREATE POLICY system_flags_deny_write
  ON platform.system_flags
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- Seed: enable autonomous dispatch by default
INSERT INTO platform.system_flags (key, value)
VALUES ('autonomy_dispatch_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;
