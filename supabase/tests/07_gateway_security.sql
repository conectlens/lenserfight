-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 07_gateway_security.sql
-- Trust Gateway pre-OSS database hardening checks.
--
-- Run via: supabase db test --db-url $LOCAL_DB_URL
-- All changes are rolled back — safe to run against any environment.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

SELECT plan(17);

-- ── Migration floor / core objects ──────────────────────────────────────────
SELECT has_table('devices', 'sync_outbox', 'devices.sync_outbox exists');
SELECT has_table('devices', 'sync_watermarks', 'devices.sync_watermarks exists');
SELECT has_table('devices', 'nonce_cache', 'devices.nonce_cache exists');
SELECT has_table('execution', 'attestation_verifications', 'execution.attestation_verifications exists');

SELECT has_function(
  'execution',
  'fn_verify_attestation_signature',
  ARRAY['uuid', 'bytea', 'bytea'],
  'server-side attestation signature verifier exists'
);

SELECT has_function(
  'execution',
  'fn_record_signed_attestation',
  ARRAY['uuid', 'uuid', 'timestamp with time zone', 'text', 'text', 'text', 'text', 'text', 'text', 'text', 'text', 'boolean'],
  'signed attestation record+verify function exists'
);

SELECT has_function(
  'audit',
  'fn_chain_verify',
  ARRAY['uuid', 'text'],
  'gateway audit chain verification function exists'
);

-- ── RLS policies and grants ─────────────────────────────────────────────────
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'execution'
      AND tablename = 'attestation_verifications'
      AND policyname = 'att_verifications_owner_select'
      AND cmd = 'SELECT'
  ),
  'attestation_verifications owner SELECT policy exists'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE table_schema = 'execution'
      AND table_name = 'attestation_verifications'
      AND grantee IN ('anon', 'authenticated')
      AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE')
  ),
  'attestation_verifications has no direct anon/authenticated write grants'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM information_schema.routine_privileges
    WHERE routine_schema = 'audit'
      AND routine_name = 'fn_chain_verify'
      AND grantee = 'authenticated'
      AND privilege_type = 'EXECUTE'
  ),
  'authenticated can execute audit.fn_chain_verify through ownership gate'
);

-- Authenticated callers with no JWT-owned Lenser cannot verify arbitrary chains.
SET LOCAL ROLE authenticated;
SELECT throws_ok(
  $$SELECT * FROM audit.fn_chain_verify('00000000-0000-0000-0000-000000000001'::uuid, 'gateway')$$,
  '42501',
  'chain_verify_owner_required%',
  'authenticated non-owner cannot verify another Lenser gateway chain'
);
RESET ROLE;

-- ── SECURITY DEFINER search_path hardening ──────────────────────────────────
SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.prosecdef
      AND n.nspname IN ('devices', 'execution', 'audit')
      AND p.proname IN (
        'fn_sync_push',
        'fn_sync_pull',
        'fn_acquire_leader_lease',
        'fn_record_signed_attestation',
        'fn_verify_attestation_signature',
        'fn_chain_verify',
        'fn_append_gateway_event',
        'fn_xp_apply_safe'
      )
      AND NOT EXISTS (
        SELECT 1 FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) AS c
        WHERE c LIKE 'search_path=%'
      )
  ),
  'gateway SECURITY DEFINER functions set an explicit search_path'
);

-- ── Lease renewal fix is present in function source ─────────────────────────
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'devices'
      AND p.proname = 'fn_acquire_leader_lease'
      AND p.prosrc LIKE '%device_id = EXCLUDED.device_id%'
  ),
  'leader lease function renews when the same holder reacquires before expiry'
);

-- ── XP and audit triggers are installed ─────────────────────────────────────
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'xp_on_full_trust'
      AND tgrelid = 'execution.trust_evaluations'::regclass
      AND NOT tgisinternal
  ),
  'fully trusted XP trigger is installed'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'chain_on_attestation_verified'
      AND tgrelid = 'execution.attestation_verifications'::regclass
      AND NOT tgisinternal
  ),
  'attestation verification audit-chain trigger is installed'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'chain_on_device_trust_changed'
      AND tgrelid = 'devices.registered_devices'::regclass
      AND NOT tgisinternal
  ),
  'device trust change audit-chain trigger is installed'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = 'audit.hash_chains'::regclass
      AND attname = 'chain_kind'
      AND NOT attisdropped
  ),
  'audit.hash_chains has chain_kind column'
);

SELECT * FROM finish();

ROLLBACK;
