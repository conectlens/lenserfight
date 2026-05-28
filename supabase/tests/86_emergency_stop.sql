-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 86_emergency_stop.sql
-- Verifies the Emergency Stop / Execution Control layer added in migrations
-- 20280120000000_emergency_stop_execution_control.sql  (Migration 1)
-- 20280121000000_execution_ttl_circuit_breaker.sql     (Migration 2)
--
-- Coverage:
--   1.  admin.execution_control table exists
--   2.  Singleton row pre-seeded (count = 1)
--   3.  fn_get_execution_status() function exists
--   4.  fn_get_execution_status() returns system_kill_switch_active key
--   5.  fn_get_execution_status() returns queue_frozen key
--   6.  fn_queue_freeze(text) function exists
--   7.  fn_queue_unfreeze() function exists
--   8.  fn_cancel_all_active_runs(text) function exists
--   9.  fn_emergency_stop(text, boolean) function exists
--   10. anon cannot call fn_emergency_stop (privilege check)
--   11. anon cannot call fn_cancel_all_active_runs (privilege check)
--   12. anon cannot call fn_queue_freeze (privilege check)
--   13. anon cannot call fn_queue_unfreeze (privilege check)
--   14. fn_timeout_stale_runs(integer) exists (Migration 2)
--   15. service_role is granted fn_timeout_stale_runs_safe (privilege check)
--   16. execution_control rejects id != 1 (CHECK violation)
--   17. queue_frozen defaults to false in fn_get_execution_status
--   18. fn_timeout_stale_runs_safe() exists (cron wrapper)
--
-- All changes rolled back.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

SELECT plan(18);

-- ── Test 1: admin.execution_control table exists ─────────────────────────────

SELECT has_table(
  'admin',
  'execution_control',
  'admin.execution_control table exists (Migration 1)'
);

-- ── Test 2: Singleton row pre-seeded ─────────────────────────────────────────

SELECT ok(
  (SELECT COUNT(*) FROM admin.execution_control) = 1,
  'admin.execution_control has exactly 1 row (singleton)'
);

-- ── Test 3: fn_get_execution_status function exists ──────────────────────────

SELECT has_function(
  'public',
  'fn_get_execution_status',
  ARRAY[]::TEXT[],
  'fn_get_execution_status() function exists'
);

-- ── Test 4: Returns system_kill_switch_active key ────────────────────────────

SELECT ok(
  (SELECT public.fn_get_execution_status() ? 'system_kill_switch_active'),
  'fn_get_execution_status() result contains system_kill_switch_active key'
);

-- ── Test 5: Returns queue_frozen key ─────────────────────────────────────────

SELECT ok(
  (SELECT public.fn_get_execution_status() ? 'queue_frozen'),
  'fn_get_execution_status() result contains queue_frozen key'
);

-- ── Test 6: fn_queue_freeze(text) function exists ────────────────────────────

SELECT has_function(
  'public',
  'fn_queue_freeze',
  ARRAY['text'],
  'fn_queue_freeze(text) function exists'
);

-- ── Test 7: fn_queue_unfreeze() function exists ───────────────────────────────

SELECT has_function(
  'public',
  'fn_queue_unfreeze',
  ARRAY[]::TEXT[],
  'fn_queue_unfreeze() function exists'
);

-- ── Test 8: fn_cancel_all_active_runs(text) function exists ──────────────────

SELECT has_function(
  'public',
  'fn_cancel_all_active_runs',
  ARRAY['text'],
  'fn_cancel_all_active_runs(text) function exists'
);

-- ── Test 9: fn_emergency_stop(text, boolean) function exists ─────────────────

SELECT has_function(
  'public',
  'fn_emergency_stop',
  ARRAY['text', 'boolean'],
  'fn_emergency_stop(text, boolean) function exists'
);

-- ── Test 10: anon cannot call fn_emergency_stop ───────────────────────────────

SELECT ok(
  NOT has_function_privilege(
    'anon',
    'public.fn_emergency_stop(text, boolean)',
    'EXECUTE'
  ),
  'anon role does not have EXECUTE on fn_emergency_stop'
);

-- ── Test 11: anon cannot call fn_cancel_all_active_runs ───────────────────────

SELECT ok(
  NOT has_function_privilege(
    'anon',
    'public.fn_cancel_all_active_runs(text)',
    'EXECUTE'
  ),
  'anon role does not have EXECUTE on fn_cancel_all_active_runs'
);

-- ── Test 12: anon cannot call fn_queue_freeze ────────────────────────────────

SELECT ok(
  NOT has_function_privilege(
    'anon',
    'public.fn_queue_freeze(text)',
    'EXECUTE'
  ),
  'anon role does not have EXECUTE on fn_queue_freeze'
);

-- ── Test 13: anon cannot call fn_queue_unfreeze ──────────────────────────────

SELECT ok(
  NOT has_function_privilege(
    'anon',
    'public.fn_queue_unfreeze()',
    'EXECUTE'
  ),
  'anon role does not have EXECUTE on fn_queue_unfreeze'
);

-- ── Test 14: fn_timeout_stale_runs(integer) exists ───────────────────────────

SELECT has_function(
  'public',
  'fn_timeout_stale_runs',
  ARRAY['integer'],
  'fn_timeout_stale_runs(integer) function exists (Migration 2)'
);

-- ── Test 15: service_role has EXECUTE on fn_timeout_stale_runs_safe ──────────

SELECT ok(
  has_function_privilege(
    'service_role',
    'public.fn_timeout_stale_runs_safe()',
    'EXECUTE'
  ),
  'service_role has EXECUTE on fn_timeout_stale_runs_safe'
);

-- ── Test 16: execution_control rejects id != 1 (CHECK violation) ─────────────

SELECT throws_ok(
  $$ INSERT INTO admin.execution_control (id) VALUES (2) $$,
  '23514',
  NULL,
  'execution_control CHECK(id = 1) rejects id = 2'
);

-- ── Test 17: queue_frozen defaults to false in fn_get_execution_status ────────

SELECT ok(
  (SELECT (public.fn_get_execution_status()->>'queue_frozen')::boolean) = false,
  'fn_get_execution_status() reports queue_frozen = false when not frozen'
);

-- ── Test 18: fn_timeout_stale_runs_safe() (cron wrapper) exists ──────────────

SELECT has_function(
  'public',
  'fn_timeout_stale_runs_safe',
  ARRAY[]::TEXT[],
  'fn_timeout_stale_runs_safe() cron wrapper exists'
);

SELECT * FROM finish();
ROLLBACK;
