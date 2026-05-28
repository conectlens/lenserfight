-- ─────────────────────────────────────────────────────────────────────────────
-- Fix pgTAP smoke test failures (tests 86-98)
--
-- 1. Seed singleton rows required by tests 86 and 87
-- 2. Revoke anon from privileged execution-control functions (test 86)
-- 3. Revoke anon from snapshot functions (test 98)
-- 4. Revoke authenticated from fn_oauth_resolve_connection (test 96)
-- 5. Explicit REVOKE anon from functions that only had REVOKE FROM PUBLIC (tests 97)
-- 6. Add display_name column to agents.ai_lensers (test 94)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Singleton rows ────────────────────────────────────────────────────────

INSERT INTO admin.execution_control (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO billing.runtime_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- ── 2. Revoke anon from execution-control functions ──────────────────────────

REVOKE ALL ON FUNCTION public.fn_emergency_stop(text, boolean)         FROM anon;
REVOKE ALL ON FUNCTION public.fn_cancel_all_active_runs(text)           FROM anon;
REVOKE ALL ON FUNCTION public.fn_queue_freeze(text)                     FROM anon;
REVOKE ALL ON FUNCTION public.fn_queue_unfreeze()                       FROM anon;

-- ── 3. Revoke anon from agent snapshot functions ─────────────────────────────

REVOKE ALL ON FUNCTION public.fn_redacted_agent_snapshot(uuid)          FROM anon;
REVOKE ALL ON FUNCTION public.fn_redacted_agent_snapshot_hash(uuid)     FROM anon;

-- ── 4. Revoke authenticated from service-role-only OAuth RPC ─────────────────

REVOKE ALL ON FUNCTION public.fn_oauth_resolve_connection(uuid, text, text[], uuid) FROM authenticated;

-- ── 5. Explicit anon revokes (REVOKE FROM PUBLIC alone is not enough when
--       anon inherits via the pre-existing PUBLIC grant in remote_schema) ─────

REVOKE ALL ON FUNCTION public.fn_resolve_handle_to_email(text)          FROM anon;
REVOKE ALL ON FUNCTION public.fn_list_agent_incidents(uuid, integer, timestamp with time zone) FROM anon;
REVOKE ALL ON FUNCTION public.fn_list_policy_evaluations(uuid, integer, timestamp with time zone) FROM anon;
REVOKE ALL ON FUNCTION public.fn_switch_active_lenser(uuid)             FROM anon;
REVOKE ALL ON FUNCTION public.fn_lensers_sync_social_links(jsonb)       FROM anon;

-- ── 6. Add display_name column to agents.ai_lensers ─────────────────────────
-- Test 94 inserts with display_name; the column was missing from the table.

ALTER TABLE agents.ai_lensers
  ADD COLUMN IF NOT EXISTS display_name text;
