-- =============================================================================
-- Seed invariants — assertions about the seeded demo data itself.
-- Runs last, after every data seed has loaded.
--
-- Unlike 00_ci_guard.sql this is deliberately not gated on app.environment.
-- That setting is applied by scripts/seed-ci.sh and scripts/seed-local.sh, but
-- `supabase db reset` applies seed.sql without it — which is precisely the path
-- CI takes — so gating here would disable the check where it is needed most.
-- These invariants hold in every environment, so they are enforced everywhere.
-- =============================================================================

-- ── No demo battle may sit past its own voting deadline ─────────────────────
--
-- fn_worker_run_finalize_cycle sweeps every battle in voting or scoring whose
-- voting_closes_at has passed. A demo battle parked mid-vote with a hardcoded
-- absolute date is therefore a time bomb: it is correct when authored and
-- silently becomes finalize-eligible once real time overtakes the date. The
-- failure surfaces far from the cause — as an off-by-N count in the finalize
-- e2e test, on pull requests that never touched a seed file.
--
-- Express the window relatively (now() - interval '2 days', now() + interval
-- '2 days') so it travels with wall-clock time. Battles intentionally left in a
-- terminal state (published, closed) may keep historical absolute dates; the
-- finalize predicate never re-evaluates them.

DO $$
DECLARE
  v_count INT;
  v_ids   TEXT;
BEGIN
  SELECT count(*), string_agg(id::text, ', ' ORDER BY voting_closes_at)
    INTO v_count, v_ids
  FROM battles.battles
  WHERE status IN ('voting', 'scoring')
    AND voting_closes_at IS NOT NULL
    AND voting_closes_at <= now()
    AND deleted_at IS NULL;

  IF v_count > 0 THEN
    RAISE EXCEPTION
      'SEED_GUARD: % seeded battle(s) are in voting/scoring with a voting_closes_at '
      'already in the past, so fn_worker_run_finalize_cycle would finalize them: %. '
      'Replace the hardcoded timestamp with a relative expression such as '
      'now() + interval ''2 days'' in supabase/seeds/.',
      v_count, v_ids
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;
