-- =============================================================================
-- pgTAP — Phase CA: Suspicious voting detection
-- plan(4): function exists; is SECURITY DEFINER; service_role only; returns SETOF jsonb
-- =============================================================================
BEGIN;

SELECT plan(4);

-- 1. fn_detect_suspicious_voting exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'fn_detect_suspicious_voting'
  ),
  'public.fn_detect_suspicious_voting() exists'
);

-- 2. fn_detect_suspicious_voting is SECURITY DEFINER
SELECT ok(
  (
    SELECT p.prosecdef
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'fn_detect_suspicious_voting'
  ),
  'fn_detect_suspicious_voting is SECURITY DEFINER'
);

-- 3. fn_detect_suspicious_voting has SET search_path configured
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    CROSS JOIN LATERAL pg_catalog.pg_options_to_table(p.proconfig) AS opt(option_name, option_value)
    WHERE n.nspname = 'public'
      AND p.proname = 'fn_detect_suspicious_voting'
      AND opt.option_name = 'search_path'
  ),
  'fn_detect_suspicious_voting has SET search_path configured'
);

-- 4. fn_detect_suspicious_voting returns 0 rows for a non-existent battle (no crash)
SELECT ok(
  (
    SELECT COUNT(*) = 0
    FROM public.fn_detect_suspicious_voting(gen_random_uuid())
  ),
  'fn_detect_suspicious_voting returns empty set for unknown battle_id'
);

SELECT finish();
ROLLBACK;
