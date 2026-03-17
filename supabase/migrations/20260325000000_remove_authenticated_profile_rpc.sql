-- Remove the SECURITY DEFINER RPC that was used to fetch the authenticated lenser's profile.
-- Replaced by a direct RLS-filtered query on lensers.profiles from the client,
-- relying on the existing p_lensers_select_self policy (user_id = auth.uid()).
--
-- NOTE: apps/cli still references this function directly. Update CLI callers before
-- applying this migration to production.
DROP FUNCTION IF EXISTS "public"."fn_lensers_get_authenticated_profile"();
