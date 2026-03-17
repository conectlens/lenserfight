-- Migration: grant_vw_lensers_score_permissions
-- Problem: vw_lensers_score is accessed by views and functions that may be called
--          by anonymous users (e.g., views that build public leaderboards/rankings).
--          Without explicit SELECT grants on the view for the "anon" and "authenticated"
--          roles, PostgreSQL raises "permission denied" (42501).
--
-- Fix: Grant SELECT on vw_lensers_score to anon and authenticated roles.
--      The view itself filters to only public, active lensers (deletion_requested_at IS NULL),
--      so exposure is already bounded by the view definition.

BEGIN;

GRANT SELECT ON TABLE "lensers"."vw_lensers_score" TO "anon";
GRANT SELECT ON TABLE "lensers"."vw_lensers_score" TO "authenticated";
GRANT SELECT ON TABLE "lensers"."vw_lensers_score" TO "service_role";

COMMIT;
