-- Migration 007: Social Graph Schema Evolution
-- Extends enums, creates relationships table, adds deletion_deadline_at, extends stats

-- ─── 1.1 Extend enums ────────────────────────────────────────────────────────

ALTER TYPE lensers.lenser_status ADD VALUE IF NOT EXISTS 'pending_deletion';
ALTER TYPE lensers.lenser_status ADD VALUE IF NOT EXISTS 'deleted';

CREATE TYPE lensers.relationship_status AS ENUM (
  'pending',
  'accepted',
  'rejected',
  'blocked',
  'removed'
);

CREATE TYPE lensers.profile_access_level AS ENUM (
  'FULL_PROFILE',
  'RESTRICTED_PROFILE',
  'OWNER_RECOVERY_PROFILE',
  'UNAVAILABLE_PROFILE'
);

-- ─── 1.2 Create lensers.relationships table ──────────────────────────────────

CREATE TABLE lensers.relationships (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_profile_id uuid NOT NULL REFERENCES lensers.profiles(id) ON DELETE CASCADE,
  target_profile_id uuid NOT NULL REFERENCES lensers.profiles(id) ON DELETE CASCADE,
  status            lensers.relationship_status NOT NULL DEFAULT 'pending',
  requested_at      timestamptz NOT NULL DEFAULT now(),
  responded_at      timestamptz,
  accepted_at       timestamptz,
  removed_at        timestamptz,
  is_close_circle   boolean NOT NULL DEFAULT false,
  CONSTRAINT uq_relationship UNIQUE (source_profile_id, target_profile_id),
  CONSTRAINT chk_no_self_rel CHECK (source_profile_id <> target_profile_id)
);

ALTER TABLE lensers.relationships ENABLE ROW LEVEL SECURITY;

-- ─── 1.3 Indexes ─────────────────────────────────────────────────────────────

CREATE INDEX idx_relationships_source_status
  ON lensers.relationships (source_profile_id, status);

CREATE INDEX idx_relationships_target_status
  ON lensers.relationships (target_profile_id, status);

CREATE INDEX idx_relationships_active
  ON lensers.relationships (source_profile_id, target_profile_id)
  WHERE status IN ('pending', 'accepted');

CREATE INDEX idx_relationships_blocked
  ON lensers.relationships (source_profile_id, target_profile_id)
  WHERE status = 'blocked';

-- ─── 1.4 Add deletion_deadline_at to profiles ────────────────────────────────

ALTER TABLE lensers.profiles
  ADD COLUMN IF NOT EXISTS deletion_deadline_at timestamptz;

-- ─── 1.5 Extend analytics.lenser_stats ───────────────────────────────────────

ALTER TABLE analytics.lenser_stats
  ADD COLUMN IF NOT EXISTS mutuals_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS badges_count  int NOT NULL DEFAULT 0;

-- ─── 1.6 Backfill from lensers.follows → lensers.relationships ──────────────
-- Insert all existing follows as accepted relationships

INSERT INTO lensers.relationships (source_profile_id, target_profile_id, status, requested_at, accepted_at)
SELECT
  f.follower_id,
  f.following_id,
  'accepted'::lensers.relationship_status,
  f.created_at,
  f.created_at
FROM lensers.follows f
ON CONFLICT (source_profile_id, target_profile_id) DO NOTHING;

-- Verification query (run manually to confirm counts match):
-- SELECT
--   (SELECT count(*) FROM lensers.follows) AS follows_count,
--   (SELECT count(*) FROM lensers.relationships WHERE status = 'accepted') AS relationships_count;

-- NOTE: Do NOT drop lensers.follows yet — dual-read period

-- ─── 1.7 RLS policies on lensers.relationships ──────────────────────────────

-- Owner read: source or target matches current lenser
CREATE POLICY relationships_select ON lensers.relationships
  FOR SELECT
  USING (
    source_profile_id IN (SELECT id FROM lensers.profiles WHERE user_id = auth.uid())
    OR
    target_profile_id IN (SELECT id FROM lensers.profiles WHERE user_id = auth.uid())
  );

-- No direct INSERT/UPDATE/DELETE — all through SECURITY DEFINER RPCs

-- ─── 1.8 Update RLS on lensers.profiles ──────────────────────────────────────
-- Owner always reads own profile (for recovery flows)
-- Active public profiles readable by everyone
-- Private active profiles readable by authenticated users (access branching at RPC level)

DROP POLICY IF EXISTS profiles_select ON lensers.profiles;

CREATE POLICY profiles_select ON lensers.profiles
  FOR SELECT
  USING (
    -- Owner always sees own profile (for recovery/deactivation flows)
    (user_id = auth.uid())
    OR
    -- Active public/community profiles visible to everyone
    (
      status = 'active'::lensers.lenser_status
      AND deletion_requested_at IS NULL
      AND visibility IN ('public'::lensers.lenser_visibility, 'community'::lensers.lenser_visibility)
    )
    OR
    -- Active private profiles visible to authenticated users (full vs restricted at RPC level)
    (
      status = 'active'::lensers.lenser_status
      AND deletion_requested_at IS NULL
      AND visibility = 'private'::lensers.lenser_visibility
      AND auth.uid() IS NOT NULL
    )
  );
