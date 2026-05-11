-- =============================================================================
-- 44. COMMUNITY PROFILE RE-ATTRIBUTION (legacy)
-- =============================================================================
-- The @lenserfight, @conectlens, and @chainabit profiles are now seeded by
-- the production seed in 02_auth_users.sql + 03_lenser_profiles.sql. Their
-- canonical UUIDs are b2000000-…-001 / -002 / -003 respectively.
--
-- This file remains as a thin compatibility shim that re-attributes the
-- community-facing Thread Starter and Challenge Creator lenses from any
-- transient AI author back to @conectlens, preserving the original GRASP
-- "communities are lensers" intent without re-seeding duplicate identities.
-- =============================================================================

DO $$
DECLARE
  v_conectlens_id  uuid := 'b2000000-0000-0000-0000-000000000003';
  v_thread_lens    uuid := '41000000-0001-000c-0001-000000000001';
  v_challenge_lens uuid := '41000000-0001-000d-0001-000000000001';
BEGIN
  IF EXISTS (SELECT 1 FROM lensers.profiles WHERE id = v_conectlens_id)
  AND EXISTS (SELECT 1 FROM lenses.lenses WHERE id = v_thread_lens)
  THEN
    UPDATE lenses.lenses
    SET lenser_id = v_conectlens_id
    WHERE id IN (v_thread_lens, v_challenge_lens)
    AND lenser_id IS DISTINCT FROM v_conectlens_id;
  END IF;
END
$$;

ANALYZE lensers.profiles;
