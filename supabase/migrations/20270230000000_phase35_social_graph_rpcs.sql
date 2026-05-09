-- Phase L35: Social graph — additive RPCs only
-- Existing RPCs (NOT redefined here):
--   fn_request_follow(p_target_profile_id UUID) → follow/request
--   fn_remove_follow(p_target_profile_id UUID)  → unfollow / cancel request
--   fn_accept_follow_request(p_source_profile_id UUID) → accept
--   fn_reject_follow_request(p_source_profile_id UUID) → reject
--   fn_lensers_is_following(p_target_id UUID) → boolean (accepted only)
--   fn_lensers_get_follows(p_lenser_id, p_type, p_limit, p_offset) → list
--   fn_lensers_follow / fn_lensers_unfollow → legacy wrappers
--
-- This migration only adds functions that are genuinely absent.

-- ── fn_get_follow_status ─────────────────────────────────────────────────────
-- Returns 'none', 'pending', or 'following' for caller→target.
-- fn_lensers_is_following only returns boolean (accepted only), so this adds
-- the pending state awareness needed for the FollowButton display.

CREATE OR REPLACE FUNCTION public.fn_get_follow_status(p_target_profile_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, lensers, auth
AS $$
  SELECT COALESCE(
    (SELECT
       CASE r.status
         WHEN 'pending'  THEN 'pending'
         WHEN 'accepted' THEN 'following'
       END
     FROM lensers.relationships r
     JOIN lensers.profiles src ON src.id = r.source_profile_id AND src.user_id = auth.uid()
     WHERE r.target_profile_id = p_target_profile_id
       AND r.removed_at IS NULL
     LIMIT 1),
    'none'
  )
$$;

REVOKE ALL ON FUNCTION public.fn_get_follow_status(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_get_follow_status(UUID) TO authenticated;
