-- Fix: follower_count and following_count were being incremented/decremented twice
-- on every follow/unfollow action because two triggers were both updating
-- analytics.lenser_stats:
--
--   1. trg_follows_sync_counts (on lensers.follows) → fn_sync_follow_counts
--   2. trg_relationships_sync_counts (on lensers.relationships) → fn_sync_relationship_counts
--
-- fn_request_follow writes to BOTH tables (dual-write for legacy reads).
-- fn_remove_follow writes to BOTH tables (dual-delete for legacy reads).
--
-- lensers.relationships is the source of truth for follow state and counts.
-- lensers.follows is a legacy mirror kept only for discovery/ranking queries.
-- Dropping the trigger on lensers.follows removes the double-count.

DROP TRIGGER IF EXISTS "trg_follows_sync_counts" ON "lensers"."follows";
