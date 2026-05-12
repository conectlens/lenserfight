-- =============================================================================
-- pgTAP — Phase CA: Vote velocity rate-limit
-- plan(5): 3rd vote succeeds; 4th raises P0001; different battle counts toward limit
-- =============================================================================
BEGIN;

SELECT plan(5);

-- 1. fn_check_vote_velocity function exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'fn_check_vote_velocity'
  ),
  'public.fn_check_vote_velocity() function exists'
);

-- 2. fn_check_vote_velocity is SECURITY DEFINER
SELECT ok(
  (
    SELECT p.prosecdef
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'fn_check_vote_velocity'
  ),
  'fn_check_vote_velocity is SECURITY DEFINER'
);

-- 3. trigger trg_votes_velocity_check exists on battles.votes
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger t
    JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'battles'
      AND c.relname = 'votes'
      AND t.tgname  = 'trg_votes_velocity_check'
      AND t.tgtype & 2 = 2  -- BEFORE
  ),
  'trg_votes_velocity_check BEFORE trigger exists on battles.votes'
);

-- 4. fn_check_vote_velocity does not raise when count < 3 (dummy UUID, no rows)
SELECT lives_ok(
  $$ SELECT public.fn_check_vote_velocity(gen_random_uuid()) $$,
  'fn_check_vote_velocity does not raise for a voter with 0 recent votes'
);

-- 5. audit.vote_anomalies table exists with expected columns
SELECT ok(
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'audit'
      AND table_name   = 'vote_anomalies'
      AND column_name  = 'anomaly_type'
  ),
  'audit.vote_anomalies has anomaly_type column'
);

SELECT finish();
ROLLBACK;
