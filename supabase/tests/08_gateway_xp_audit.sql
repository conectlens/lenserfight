-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 08_gateway_xp_audit.sql
-- Verifies pre-OSS Trust Gateway XP and audit-chain wiring.
--
-- Run via: supabase db test --db-url $LOCAL_DB_URL
-- All changes are rolled back — safe to run against any environment.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

SELECT plan(10);

SELECT ok(
  EXISTS (
    SELECT 1 FROM xp.rules
    WHERE action_key = 'VERIFIED_LOCAL_EXECUTION_COMPLETED'
      AND is_active = true
  ),
  'VERIFIED_LOCAL_EXECUTION_COMPLETED XP rule is active'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM xp.rules
    WHERE action_key = 'BATTLE_SUBMISSION_COMPLETED'
      AND is_active = true
  ),
  'BATTLE_SUBMISSION_COMPLETED XP rule is active'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'execution'
      AND p.proname = 'fn_xp_on_full_trust'
      AND p.prosrc LIKE '%OLD.trust_level = ''fully_trusted''%'
  ),
  'full-trust XP trigger is idempotent on already fully_trusted rows'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'execution'
      AND p.proname = 'fn_xp_on_submission_evaluated'
      AND p.prosrc LIKE '%TG_OP <> ''INSERT''%'
  ),
  'submission completed XP trigger only awards on initial evaluation insert'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'execution'
      AND p.proname = 'fn_xp_apply_safe'
      AND p.prosecdef
  ),
  'XP application wrapper is SECURITY DEFINER'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'execution'
      AND p.proname = 'fn_xp_apply_safe'
      AND p.prosrc LIKE '%RAISE NOTICE%'
  ),
  'XP wrapper emits NOTICE when xp.apply fails'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'audit'
      AND p.proname = 'fn_append_gateway_event_safe'
      AND p.prosrc LIKE '%RAISE NOTICE%'
  ),
  'audit chain safe append emits NOTICE on failure'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'audit'
      AND p.proname = 'fn_chain_verify'
      AND p.prosrc LIKE '%payload_hash_mismatch%'
      AND p.prosrc LIKE '%prev_hash_mismatch%'
  ),
  'chain verifier reports payload and previous-hash mismatches'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'audit'
      AND p.proname = 'fn_append_gateway_event'
      AND p.prosrc LIKE '%pg_advisory_xact_lock%'
  ),
  'gateway hash chain append serializes sequence allocation'
);

SELECT ok(
  (
    SELECT count(*)::int
    FROM pg_trigger
    WHERE tgname IN (
      'xp_on_device_registered',
      'xp_on_device_trust_elevated',
      'xp_on_runner_bound',
      'xp_on_full_trust',
      'xp_on_submission_evaluated',
      'chain_on_device_registered',
      'chain_on_device_trust_changed',
      'chain_on_attestation_verified'
    )
  ) = 8,
  'all gateway XP and audit-chain triggers are installed'
);

SELECT * FROM finish();

ROLLBACK;
