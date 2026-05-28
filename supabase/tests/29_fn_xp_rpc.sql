-- =============================================================================
-- pgTAP — Phase 29: XP schema and RPC structural coverage
-- =============================================================================
BEGIN;

SELECT plan(10);

-- 1. xp.events table exists
SELECT has_table(
  'xp',
  'events',
  'xp.events table should exist'
);

-- 2. xp.totals table exists
SELECT has_table(
  'xp',
  'totals',
  'xp.totals table should exist'
);

-- 3. xp.seasons table exists
SELECT has_table(
  'xp',
  'seasons',
  'xp.seasons table should exist'
);

-- 4. xp.season_totals table exists
SELECT has_table(
  'xp',
  'season_totals',
  'xp.season_totals table should exist'
);

-- 5. fn_xp_get_self exists (caller-scoped XP summary)
SELECT has_function(
  'public',
  'fn_xp_get_self',
  ARRAY[]::text[],
  'fn_xp_get_self should exist'
);

-- 6. fn_xp_get_history exists with p_lenser_id and p_limit
SELECT has_function(
  'public',
  'fn_xp_get_history',
  ARRAY['uuid', 'integer'],
  'fn_xp_get_history should exist'
);

-- 7. fn_get_leaderboard exists with order/limit/offset params
SELECT has_function(
  'public',
  'fn_get_leaderboard',
  ARRAY['text', 'integer', 'integer'],
  'fn_get_leaderboard should exist'
);

-- 8. execution.fn_xp_apply_safe exists
SELECT has_function(
  'execution',
  'fn_xp_apply_safe',
  ARRAY['uuid', 'text', 'xp.source_enum', 'text', 'uuid', 'uuid'],
  'execution.fn_xp_apply_safe should exist'
);

-- 9. execution.fn_xp_apply_safe is SECURITY DEFINER
SELECT ok(
  (
    SELECT prosecdef
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'execution'
      AND p.proname = 'fn_xp_apply_safe'
  ),
  'execution.fn_xp_apply_safe should be SECURITY DEFINER'
);

-- 10. fn_xp_get_contributions exists
SELECT has_function(
  'public',
  'fn_xp_get_contributions',
  ARRAY['uuid'],
  'fn_xp_get_contributions should exist'
);

SELECT finish();
ROLLBACK;
