-- Fix: add explicit DENY ALL RLS policies to tables that have RLS enabled
-- but no policies, silencing the rls_enabled_no_policy linter warnings.
--
-- All six tables intentionally block direct client access — reads/writes
-- go through SECURITY DEFINER RPCs or service_role only. Adding a named
-- policy with a FALSE predicate makes the intent explicit and machine-readable.
--
-- Tables covered:
--   admin.kill_switches               – admin RPCs only (fn_kill_switch_*)
--   connectors.connectors             – service_role + DEFINER RPCs only
--   connectors.connector_tokens       – service_role + DEFINER RPCs only
--   devices.nonce_cache               – DEFINER RPCs only (replay protection)
--   execution.byok_keys               – service_role + trusted workers only
--   execution.runner_device_bindings  – DEFINER RPCs only (fn_runner_bind_device)

-- ─── admin.kill_switches ────────────────────────────────────────────────────

CREATE POLICY "kill_switches_deny_all"
  ON admin.kill_switches
  AS RESTRICTIVE
  FOR ALL
  TO authenticated, anon
  USING (false);

-- ─── connectors.connectors ──────────────────────────────────────────────────

CREATE POLICY "connectors_deny_all"
  ON connectors.connectors
  AS RESTRICTIVE
  FOR ALL
  TO authenticated, anon
  USING (false);

-- ─── connectors.connector_tokens ────────────────────────────────────────────

CREATE POLICY "connector_tokens_deny_all"
  ON connectors.connector_tokens
  AS RESTRICTIVE
  FOR ALL
  TO authenticated, anon
  USING (false);

-- ─── devices.nonce_cache ─────────────────────────────────────────────────────

CREATE POLICY "nonce_cache_deny_all"
  ON devices.nonce_cache
  AS RESTRICTIVE
  FOR ALL
  TO authenticated, anon
  USING (false);

-- ─── execution.byok_keys ─────────────────────────────────────────────────────

CREATE POLICY "byok_keys_deny_all"
  ON execution.byok_keys
  AS RESTRICTIVE
  FOR ALL
  TO authenticated, anon
  USING (false);

-- ─── execution.runner_device_bindings ────────────────────────────────────────

CREATE POLICY "runner_device_bindings_deny_all"
  ON execution.runner_device_bindings
  AS RESTRICTIVE
  FOR ALL
  TO authenticated, anon
  USING (false);
