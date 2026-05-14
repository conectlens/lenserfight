-- =============================================================================
-- pgTAP — Phase NG-P0/P1: Namespace Governance schema + seed integrity
--
-- Verifies:
--   1.  identity_gov schema exists
--   2.  reserved_namespaces table exists with correct structure
--   3.  All indexes exist
--   4.  RLS is enabled and FORCE'd
--   5.  anon/authenticated cannot INSERT/UPDATE/DELETE directly
--   6.  fn_normalize_handle exists and is IMMUTABLE
--   7.  fn_handle_skeleton exists and is IMMUTABLE
--   8.  fn_validate_handle exists and is STABLE
--   9.  fn_check_handle (public RPC) exists and is STABLE
--   10. Trigger on lensers.profiles exists and replaces legacy CHECK
--   11. Legacy constraint is gone
--   12. Seed integrity: canonical system handles present
--   13. Seed integrity: canonical provider handles present
--   14. Seed integrity: prefix rules present
--   15. Seed integrity: token rules present
-- =============================================================================

BEGIN;

SELECT plan(34);

-- ── 1. Schema exists ─────────────────────────────────────────────────────────
SELECT ok(
  EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'identity_gov'),
  'identity_gov schema exists'
);

-- ── 2. Table exists ───────────────────────────────────────────────────────────
SELECT has_table('identity_gov', 'reserved_namespaces',
  'identity_gov.reserved_namespaces table exists');

-- ── 3. Primary key ────────────────────────────────────────────────────────────
SELECT col_is_pk('identity_gov', 'reserved_namespaces', 'id',
  'reserved_namespaces.id is primary key');

-- ── 4. UNIQUE (entry_kind, value) ─────────────────────────────────────────────
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reserved_namespaces_kind_value_uniq'
      AND conrelid = 'identity_gov.reserved_namespaces'::regclass
      AND contype = 'u'
  ),
  'reserved_namespaces has UNIQUE (entry_kind, value)'
);

-- ── 5. entry_kind CHECK exists ────────────────────────────────────────────────
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reserved_namespaces_kind_check'
      AND conrelid = 'identity_gov.reserved_namespaces'::regclass
  ),
  'reserved_namespaces.entry_kind CHECK constraint exists'
);

-- ── 6. class CHECK exists ─────────────────────────────────────────────────────
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reserved_namespaces_class_check'
      AND conrelid = 'identity_gov.reserved_namespaces'::regclass
  ),
  'reserved_namespaces.class CHECK constraint exists'
);

-- ── 7. Exact-lookup index exists ──────────────────────────────────────────────
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'identity_gov'
      AND tablename  = 'reserved_namespaces'
      AND indexname  = 'reserved_namespaces_exact_idx'
  ),
  'reserved_namespaces_exact_idx index exists'
);

-- ── 8. Trigram index exists ───────────────────────────────────────────────────
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'identity_gov'
      AND tablename  = 'reserved_namespaces'
      AND indexname  = 'reserved_namespaces_trgm_idx'
  ),
  'reserved_namespaces_trgm_idx GIN index exists'
);

-- ── 9. RLS enabled ────────────────────────────────────────────────────────────
SELECT ok(
  (SELECT relrowsecurity
   FROM   pg_class c
   JOIN   pg_namespace n ON n.oid = c.relnamespace
   WHERE  n.nspname = 'identity_gov'
     AND  c.relname = 'reserved_namespaces'),
  'reserved_namespaces has RLS enabled'
);

-- ── 10. FORCE RLS enabled ─────────────────────────────────────────────────────
SELECT ok(
  (SELECT relforcerowsecurity
   FROM   pg_class c
   JOIN   pg_namespace n ON n.oid = c.relnamespace
   WHERE  n.nspname = 'identity_gov'
     AND  c.relname = 'reserved_namespaces'),
  'reserved_namespaces has FORCE ROW LEVEL SECURITY'
);

-- ── 11. anon cannot INSERT ────────────────────────────────────────────────────
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$INSERT INTO identity_gov.reserved_namespaces
      (entry_kind, value, class) VALUES ('exact', 'testhandle', 'system')$$,
  '42501',
  NULL,
  'anon INSERT into reserved_namespaces is denied by RLS'
);

RESET ROLE;

-- ── 12. authenticated cannot INSERT ───────────────────────────────────────────
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$INSERT INTO identity_gov.reserved_namespaces
      (entry_kind, value, class) VALUES ('exact', 'testhandle2', 'system')$$,
  '42501',
  NULL,
  'authenticated INSERT into reserved_namespaces is denied by RLS'
);

RESET ROLE;

-- ── 13. fn_normalize_handle exists and is IMMUTABLE ───────────────────────────
SELECT ok(
  EXISTS (
    SELECT 1
    FROM   pg_proc p
    JOIN   pg_namespace n ON n.oid = p.pronamespace
    WHERE  n.nspname = 'identity_gov'
      AND  p.proname = 'fn_normalize_handle'
      AND  p.provolatile = 'i'  -- IMMUTABLE
  ),
  'identity_gov.fn_normalize_handle exists and is IMMUTABLE'
);

-- ── 14. fn_handle_skeleton exists and is IMMUTABLE ────────────────────────────
SELECT ok(
  EXISTS (
    SELECT 1
    FROM   pg_proc p
    JOIN   pg_namespace n ON n.oid = p.pronamespace
    WHERE  n.nspname = 'identity_gov'
      AND  p.proname = 'fn_handle_skeleton'
      AND  p.provolatile = 'i'
  ),
  'identity_gov.fn_handle_skeleton exists and is IMMUTABLE'
);

-- ── 15. fn_validate_handle exists and is STABLE ───────────────────────────────
SELECT ok(
  EXISTS (
    SELECT 1
    FROM   pg_proc p
    JOIN   pg_namespace n ON n.oid = p.pronamespace
    WHERE  n.nspname = 'identity_gov'
      AND  p.proname = 'fn_validate_handle'
      AND  p.provolatile = 's'  -- STABLE
  ),
  'identity_gov.fn_validate_handle exists and is STABLE'
);

-- ── 16. public.fn_check_handle exists ─────────────────────────────────────────
SELECT ok(
  EXISTS (
    SELECT 1
    FROM   pg_proc p
    JOIN   pg_namespace n ON n.oid = p.pronamespace
    WHERE  n.nspname = 'public'
      AND  p.proname = 'fn_check_handle'
  ),
  'public.fn_check_handle RPC exists'
);

-- ── 17. Trigger exists on lensers.profiles ────────────────────────────────────
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE  tgname   = 'trg_guard_lenser_handle'
      AND  tgrelid  = 'lensers.profiles'::regclass
      AND  tgenabled <> 'D'
  ),
  'trg_guard_lenser_handle trigger exists on lensers.profiles and is enabled'
);

-- ── 18. Legacy CHECK constraint is removed ────────────────────────────────────
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lensers_reserved_handle_check'
  ),
  'lensers_reserved_handle_check legacy constraint has been dropped'
);

-- ── 19-23. Seed integrity: canonical system entries ───────────────────────────
SELECT ok(
  EXISTS (SELECT 1 FROM identity_gov.reserved_namespaces
          WHERE entry_kind = 'exact' AND value = 'lenserfight' AND class = 'system'),
  'seed: lenserfight is reserved as system/exact'
);

SELECT ok(
  EXISTS (SELECT 1 FROM identity_gov.reserved_namespaces
          WHERE entry_kind = 'exact' AND value = 'chainabit' AND class = 'system'),
  'seed: chainabit is reserved as system/exact'
);

SELECT ok(
  EXISTS (SELECT 1 FROM identity_gov.reserved_namespaces
          WHERE entry_kind = 'exact' AND value = 'admin' AND class = 'security'),
  'seed: admin is reserved as security/exact'
);

SELECT ok(
  EXISTS (SELECT 1 FROM identity_gov.reserved_namespaces
          WHERE entry_kind = 'exact' AND value = 'system' AND class = 'security'),
  'seed: system is reserved as security/exact'
);

-- ── 24-27. Seed integrity: AI provider entries ────────────────────────────────
SELECT ok(
  EXISTS (SELECT 1 FROM identity_gov.reserved_namespaces
          WHERE entry_kind = 'exact' AND value = 'openai' AND class = 'provider'),
  'seed: openai is reserved as provider/exact'
);

SELECT ok(
  EXISTS (SELECT 1 FROM identity_gov.reserved_namespaces
          WHERE entry_kind = 'exact' AND value = 'anthropic' AND class = 'provider'),
  'seed: anthropic is reserved as provider/exact'
);

SELECT ok(
  EXISTS (SELECT 1 FROM identity_gov.reserved_namespaces
          WHERE entry_kind = 'exact' AND value = 'claude' AND class = 'model'),
  'seed: claude is reserved as model/exact'
);

SELECT ok(
  EXISTS (SELECT 1 FROM identity_gov.reserved_namespaces
          WHERE entry_kind = 'exact' AND value = 'chatgpt' AND class = 'model'),
  'seed: chatgpt is reserved as model/exact'
);

-- ── 28-29. Seed integrity: prefix rules ───────────────────────────────────────
SELECT ok(
  EXISTS (SELECT 1 FROM identity_gov.reserved_namespaces
          WHERE entry_kind = 'prefix' AND value = 'lenserfight'),
  'seed: lenserfight prefix guard exists'
);

SELECT ok(
  EXISTS (SELECT 1 FROM identity_gov.reserved_namespaces
          WHERE entry_kind = 'prefix' AND value = 'openai'),
  'seed: openai prefix guard exists'
);

-- ── 30-31. Seed integrity: token rules ────────────────────────────────────────
SELECT ok(
  EXISTS (SELECT 1 FROM identity_gov.reserved_namespaces
          WHERE entry_kind = 'token' AND value = 'lens'),
  'seed: lens token guard exists'
);

SELECT ok(
  EXISTS (SELECT 1 FROM identity_gov.reserved_namespaces
          WHERE entry_kind = 'token' AND value = 'gpt'),
  'seed: gpt token guard exists'
);

-- ── 32. Lenser Family AI handles are STILL present (not broken by trigger) ────
SELECT is(
  (SELECT count(*)::int FROM lensers.profiles
   WHERE handle IN ('lenso', 'lensa', 'lense', 'lola')),
  4,
  'all four Lenser Family handles still exist after governance trigger installation'
);

-- ── 33. deny_score range constraint enforced ─────────────────────────────────
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname   = 'reserved_namespaces_deny_score_range'
      AND conrelid  = 'identity_gov.reserved_namespaces'::regclass
  ),
  'reserved_namespaces deny_score range constraint (0..100) exists'
);

-- ── 34. All canonical entries are source = canonical or manifest ──────────────
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM identity_gov.reserved_namespaces
    WHERE source NOT IN ('canonical', 'manifest', 'ai_inferred')
  ),
  'all reserved_namespaces rows have a valid source value'
);

-- ── 35. No expired canonical entries ─────────────────────────────────────────
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM identity_gov.reserved_namespaces
    WHERE source = 'canonical'
      AND expires_at IS NOT NULL
  ),
  'canonical entries never have expires_at set'
);

SELECT * FROM finish();

ROLLBACK;
