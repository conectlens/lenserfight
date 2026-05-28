-- =============================================================================
-- pgTAP — Phase 30: Critical index presence verification
-- =============================================================================
BEGIN;

SELECT plan(8);

-- 1. battles.battles workflow_id index exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'battles'
      AND tablename  = 'battles'
      AND indexname  = 'battles_workflow_id_idx'
  ),
  'battles.battles should have battles_workflow_id_idx'
);

-- 2. notifications lenser_id+unread index exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename  = 'notifications'
      AND indexname  = 'idx_notifications_lenser_unread'
  ),
  'public.notifications should have idx_notifications_lenser_unread'
);

-- 3. notifications lenser_id+all index exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename  = 'notifications'
      AND indexname  = 'idx_notifications_lenser_all'
  ),
  'public.notifications should have idx_notifications_lenser_all'
);

-- 4. lensers.relationships source_profile_id+target_profile_id accepted index
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'lensers'
      AND tablename  = 'relationships'
      AND indexname  = 'idx_relationships_accepted_active'
  ),
  'lensers.relationships should have idx_relationships_accepted_active'
);

-- 5. lensers.relationships blocked index
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'lensers'
      AND tablename  = 'relationships'
      AND indexname  = 'idx_relationships_blocked'
  ),
  'lensers.relationships should have idx_relationships_blocked'
);

-- 6. lensers.relationships source_status index
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'lensers'
      AND tablename  = 'relationships'
      AND indexname  = 'idx_relationships_source_status'
  ),
  'lensers.relationships should have idx_relationships_source_status'
);

-- 7. lensers.tag_follows lenser_id index
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'lensers'
      AND tablename  = 'tag_follows'
      AND indexname  = 'idx_tag_follows_lenser_id'
  ),
  'lensers.tag_follows should have idx_tag_follows_lenser_id'
);

-- 8. lensers.tag_follows tag_id index
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'lensers'
      AND tablename  = 'tag_follows'
      AND indexname  = 'idx_tag_follows_tag_id'
  ),
  'lensers.tag_follows should have idx_tag_follows_tag_id'
);

SELECT finish();
ROLLBACK;
