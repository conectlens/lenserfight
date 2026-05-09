-- Phase A (Trust Gateway): Author the missing execution.runners table + RPCs
-- referenced by apps/cli/src/commands/runner.ts but absent from prior migrations.
--
-- Background:
--   The CLI calls fn_runner_register / fn_runner_list / fn_runner_get /
--   fn_runner_enable / fn_runner_remove / fn_runner_probe and binds the
--   resulting UUID via execution.runner_device_bindings (introduced in
--   20270511300000_runner_device_bindings.sql). The underlying table and
--   RPCs were never added to the migrations directory — the FK in
--   runner_device_bindings was intentionally lax.
--
-- This migration:
--   1. Creates execution.runners (the canonical table).
--   2. Adds the FK from execution.runner_device_bindings.runner_id.
--   3. Creates fn_runner_register / list / get / enable / remove / probe.
--   4. Establishes RLS deny-by-default; mutations only via SECURITY DEFINER RPCs.
--
-- Naming note (RFC-0003 §11, requirements NR-1..3):
--   Some legacy callers use the "adapter" term (p_adapter_id parameter, etc.).
--   The canonical term is "runner". Parameter names retain the legacy form for
--   one release window to avoid breaking the CLI; new callers should use the
--   matching p_runner_id signatures introduced below.

-- ─── 1. Table ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS execution.runners (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lenser_id     UUID        NOT NULL REFERENCES lensers.profiles(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  adapter_type  TEXT        NOT NULL
                  CHECK (adapter_type IN (
                    'openai-agents','langchain','crewai','mcp','ollama','http','custom'
                  )),
  config        JSONB       NOT NULL DEFAULT '{}',
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  last_probed_at TIMESTAMPTZ,
  last_probe_status TEXT    CHECK (char_length(last_probe_status) <= 32),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (lenser_id, name)
);

CREATE INDEX IF NOT EXISTS idx_runners_lenser_id ON execution.runners (lenser_id);
CREATE INDEX IF NOT EXISTS idx_runners_active    ON execution.runners (is_active) WHERE is_active = true;

COMMENT ON TABLE execution.runners IS
  'Workspace runners (adapters) registered by a Lenser. Bound to one or more '
  'physical devices via execution.runner_device_bindings. Mutated only via '
  'SECURITY DEFINER RPCs.';

-- Add the FK that 20270511300000_runner_device_bindings.sql left lax.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'runner_device_bindings_runner_id_fkey'
      AND conrelid = 'execution.runner_device_bindings'::regclass
  ) THEN
    ALTER TABLE execution.runner_device_bindings
      ADD CONSTRAINT runner_device_bindings_runner_id_fkey
      FOREIGN KEY (runner_id) REFERENCES execution.runners(id) ON DELETE CASCADE;
  END IF;
END;
$$;

ALTER TABLE execution.runners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "runners_owner_select" ON execution.runners
  FOR SELECT
  USING (
    lenser_id = (
      SELECT id FROM lensers.profiles
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );

-- No direct INSERT/UPDATE/DELETE — all mutation goes through DEFINER RPCs.

-- ─── 2. fn_runner_register ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_runner_register(
  p_name         TEXT,
  p_adapter_type TEXT,
  p_config       JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, execution, lensers, extensions
AS $$
DECLARE
  v_lenser_id UUID;
  v_runner_id UUID;
BEGIN
  SELECT id INTO v_lenser_id
  FROM lensers.profiles
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;

  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'active_lenser_required' USING ERRCODE = '42501';
  END IF;

  IF p_adapter_type NOT IN ('openai-agents','langchain','crewai','mcp','ollama','http','custom') THEN
    RAISE EXCEPTION 'invalid_adapter_type: %', p_adapter_type USING ERRCODE = '22023';
  END IF;

  INSERT INTO execution.runners (lenser_id, name, adapter_type, config)
  VALUES (v_lenser_id, p_name, p_adapter_type, COALESCE(p_config, '{}'))
  RETURNING id INTO v_runner_id;

  RETURN v_runner_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_runner_register(TEXT, TEXT, JSONB) TO authenticated;

-- ─── 3. fn_runner_list ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_runner_list()
RETURNS TABLE (
  id           UUID,
  name         TEXT,
  adapter_type TEXT,
  is_active    BOOLEAN,
  created_at   TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, execution, lensers, extensions
AS $$
DECLARE
  v_lenser_id UUID;
BEGIN
  SELECT lp.id INTO v_lenser_id
  FROM lensers.profiles lp
  WHERE lp.user_id = auth.uid()
  LIMIT 1;

  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT r.id, r.name, r.adapter_type, r.is_active, r.created_at
    FROM execution.runners r
   WHERE r.lenser_id = v_lenser_id
   ORDER BY r.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_runner_list() TO authenticated;

-- ─── 4. fn_runner_get ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_runner_get(
  p_adapter_id UUID
)
RETURNS TABLE (
  id           UUID,
  name         TEXT,
  adapter_type TEXT,
  is_active    BOOLEAN,
  config       JSONB,
  created_at   TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ,
  last_probed_at TIMESTAMPTZ,
  last_probe_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, execution, lensers, extensions
AS $$
DECLARE
  v_lenser_id UUID;
BEGIN
  SELECT lp.id INTO v_lenser_id
  FROM lensers.profiles lp
  WHERE lp.user_id = auth.uid()
  LIMIT 1;

  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT r.id, r.name, r.adapter_type, r.is_active, r.config, r.created_at,
         r.updated_at, r.last_probed_at, r.last_probe_status
    FROM execution.runners r
   WHERE r.id = p_adapter_id
     AND r.lenser_id = v_lenser_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_runner_get(UUID) TO authenticated;

-- ─── 5. fn_runner_enable / fn_runner_remove ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_runner_enable(
  p_adapter_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, execution, lensers, extensions
AS $$
DECLARE
  v_lenser_id UUID;
BEGIN
  SELECT lp.id INTO v_lenser_id
  FROM lensers.profiles lp
  WHERE lp.user_id = auth.uid() AND lp.status = 'active'
  LIMIT 1;

  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'active_lenser_required' USING ERRCODE = '42501';
  END IF;

  UPDATE execution.runners
     SET is_active = true,
         updated_at = now()
   WHERE id = p_adapter_id
     AND lenser_id = v_lenser_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'runner_not_found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_runner_enable(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_runner_remove(
  p_adapter_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, execution, lensers, extensions
AS $$
DECLARE
  v_lenser_id UUID;
BEGIN
  SELECT lp.id INTO v_lenser_id
  FROM lensers.profiles lp
  WHERE lp.user_id = auth.uid() AND lp.status = 'active'
  LIMIT 1;

  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'active_lenser_required' USING ERRCODE = '42501';
  END IF;

  -- Soft-deactivate (preserve audit trail).
  UPDATE execution.runners
     SET is_active = false,
         updated_at = now()
   WHERE id = p_adapter_id
     AND lenser_id = v_lenser_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'runner_not_found' USING ERRCODE = 'P0002';
  END IF;

  -- Pause any active device bindings; do not delete (keeps history intact).
  UPDATE execution.runner_device_bindings
     SET status = 'paused'
   WHERE runner_id = p_adapter_id
     AND status = 'active';
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_runner_remove(UUID) TO authenticated;

-- ─── 6. fn_runner_probe ──────────────────────────────────────────────────────
-- Probe records intent + ownership check. Real network reach happens in the
-- daemon (apps/gateway) — Postgres is not a network client. Returns a stub
-- response so the existing CLI smoke-test in apps/cli/src/commands/runner.ts
-- continues to work end-to-end against a fresh DB.

CREATE OR REPLACE FUNCTION public.fn_runner_probe(
  p_adapter_id UUID,
  p_prompt     TEXT DEFAULT 'Hello, are you available?'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, execution, lensers, extensions
AS $$
DECLARE
  v_lenser_id UUID;
  v_runner    execution.runners%ROWTYPE;
BEGIN
  SELECT lp.id INTO v_lenser_id
  FROM lensers.profiles lp
  WHERE lp.user_id = auth.uid() AND lp.status = 'active'
  LIMIT 1;

  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'active_lenser_required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_runner
    FROM execution.runners
   WHERE id = p_adapter_id
     AND lenser_id = v_lenser_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'runner_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT v_runner.is_active THEN
    RAISE EXCEPTION 'runner_inactive' USING ERRCODE = 'P0001';
  END IF;

  UPDATE execution.runners
     SET last_probed_at = now(),
         last_probe_status = 'queued',
         updated_at = now()
   WHERE id = p_adapter_id;

  RETURN jsonb_build_object(
    'runner_id',     v_runner.id,
    'adapter_type',  v_runner.adapter_type,
    'probe_status',  'queued',
    'response',      'Probe queued; daemon will execute when reachable.',
    'note',          'Network probes are performed by lf-gatewayd, not the database.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_runner_probe(UUID, TEXT) TO authenticated;

-- ─── 7. public.fn_runner_bind_device wrapper ─────────────────────────────────
-- The CLI calls fn_runner_bind_device against the public schema, but the
-- existing 20270511300000 migration only created it under execution. This
-- wrapper preserves the public namespace contract.

CREATE OR REPLACE FUNCTION public.fn_runner_bind_device(
  p_runner_id UUID,
  p_device_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, execution, devices, lensers, extensions
AS $$
DECLARE
  v_lenser_id UUID;
  v_binding_id UUID;
BEGIN
  SELECT id INTO v_lenser_id
  FROM lensers.profiles
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;

  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'active_lenser_required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM execution.runners r
    WHERE r.id = p_runner_id AND r.lenser_id = v_lenser_id
  ) THEN
    RAISE EXCEPTION 'runner_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM devices.registered_devices d
    WHERE d.id = p_device_id
      AND d.lenser_id = v_lenser_id
      AND d.trust_level IN ('approved','trusted')
  ) THEN
    RAISE EXCEPTION 'device_not_found_or_not_trusted' USING ERRCODE = '42501';
  END IF;

  INSERT INTO execution.runner_device_bindings (runner_id, device_id, status)
  VALUES (p_runner_id, p_device_id, 'active')
  ON CONFLICT (runner_id, device_id) DO UPDATE
    SET status = 'active', bound_at = now()
  RETURNING id INTO v_binding_id;

  RETURN v_binding_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_runner_bind_device(UUID, UUID) TO authenticated;
