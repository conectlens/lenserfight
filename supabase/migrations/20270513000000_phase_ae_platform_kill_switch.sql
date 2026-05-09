-- Phase AE: Platform-wide kill switch infrastructure
-- Separate from the per-agent kill switch (agents.workspace_settings.global_kill_switch).
-- This provides admin-level emergency stops scoped to run/battle/agent/system.
-- All autonomous pg_cron lifecycle functions call fn_kill_switch_active() at entry.

-- ─── Schema ─────────────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS admin;

-- ─── Table ──────────────────────────────────────────────────────────────────

CREATE TABLE admin.kill_switches (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  scope        TEXT        NOT NULL CHECK (scope IN ('run', 'battle', 'agent', 'system')),
  target_id    UUID,       -- NULL means scope applies to all targets of that scope type
  operator_id  UUID        NOT NULL REFERENCES lensers.profiles(id) ON DELETE RESTRICT,
  reason       TEXT        NOT NULL CHECK (char_length(reason) >= 3),
  expires_at   TIMESTAMPTZ,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lifted_at    TIMESTAMPTZ,
  CONSTRAINT kill_switch_target_or_system
    CHECK (scope = 'system' OR target_id IS NOT NULL)
);

CREATE INDEX idx_kill_switches_active
  ON admin.kill_switches (scope, target_id)
  WHERE lifted_at IS NULL;

COMMENT ON TABLE admin.kill_switches IS
  'Platform-wide emergency stops. scope=system halts all autonomous operations. '
  'Append-only via RPCs; never updated directly.';

-- ─── RLS: deny all direct access ────────────────────────────────────────────

ALTER TABLE admin.kill_switches ENABLE ROW LEVEL SECURITY;
-- No policies — all access via SECURITY DEFINER RPCs only.
-- Service role can read for internal pg_cron use.
GRANT SELECT ON admin.kill_switches TO service_role;

-- ─── fn_kill_switch_active ──────────────────────────────────────────────────
-- Returns TRUE when an active (non-lifted, non-expired) kill switch matches.
-- Checks system-wide first, then scope+target. Safe to call from any function.

CREATE OR REPLACE FUNCTION public.fn_kill_switch_active(
  p_scope     TEXT,
  p_target_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = admin, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   admin.kill_switches ks
    WHERE  ks.lifted_at IS NULL
    AND    (ks.expires_at IS NULL OR ks.expires_at > now())
    AND    (
             -- System-wide switch halts everything
             ks.scope = 'system'
             OR
             -- Scope + target match
             (ks.scope = p_scope AND ks.target_id = p_target_id)
           )
  );
$$;

GRANT EXECUTE ON FUNCTION public.fn_kill_switch_active(TEXT, UUID) TO authenticated, service_role;

-- ─── fn_kill_switch_activate ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_kill_switch_activate(
  p_scope      TEXT,
  p_target_id  UUID    DEFAULT NULL,
  p_reason     TEXT    DEFAULT 'emergency stop',
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = admin, public, lensers
AS $$
DECLARE
  v_operator_id UUID;
  v_switch_id   UUID;
BEGIN
  -- Admin-only
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'kill_switch_activate_forbidden: admin role required';
  END IF;

  SELECT id INTO v_operator_id
  FROM   lensers.profiles
  WHERE  user_id = auth.uid()
  LIMIT  1;

  IF v_operator_id IS NULL THEN
    RAISE EXCEPTION 'kill_switch_activate_no_profile: lenser profile not found';
  END IF;

  INSERT INTO admin.kill_switches (scope, target_id, operator_id, reason, expires_at)
  VALUES (p_scope, p_target_id, v_operator_id, p_reason, p_expires_at)
  RETURNING id INTO v_switch_id;

  -- Audit trail
  INSERT INTO audit.events (event_type, actor_type, actor_id, severity, payload)
  VALUES (
    'kill_switch.activated',
    'lenser',
    v_operator_id,
    'warn',
    jsonb_build_object(
      'switch_id', v_switch_id,
      'scope',     p_scope,
      'target_id', p_target_id,
      'reason',    p_reason
    )
  );

  RETURN v_switch_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_kill_switch_activate(TEXT, UUID, TEXT, TIMESTAMPTZ) TO authenticated;

-- ─── fn_kill_switch_lift ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_kill_switch_lift(p_switch_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = admin, public, lensers
AS $$
DECLARE
  v_operator_id UUID;
  v_switch      admin.kill_switches%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'kill_switch_lift_forbidden: admin role required';
  END IF;

  SELECT * INTO v_switch FROM admin.kill_switches WHERE id = p_switch_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'kill_switch_not_found: %', p_switch_id;
  END IF;

  IF v_switch.lifted_at IS NOT NULL THEN
    RAISE EXCEPTION 'kill_switch_already_lifted: %', p_switch_id;
  END IF;

  UPDATE admin.kill_switches SET lifted_at = now() WHERE id = p_switch_id;

  SELECT id INTO v_operator_id
  FROM   lensers.profiles
  WHERE  user_id = auth.uid()
  LIMIT  1;

  INSERT INTO audit.events (event_type, actor_type, actor_id, severity, payload)
  VALUES (
    'kill_switch.lifted',
    'lenser',
    v_operator_id,
    'info',
    jsonb_build_object(
      'switch_id',     p_switch_id,
      'original_scope', v_switch.scope,
      'target_id',     v_switch.target_id
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_kill_switch_lift(UUID) TO authenticated;

-- ─── fn_kill_switch_list ────────────────────────────────────────────────────
-- Admin-only: list active kill switches.

CREATE OR REPLACE FUNCTION public.fn_kill_switch_list()
RETURNS TABLE (
  id           UUID,
  scope        TEXT,
  target_id    UUID,
  reason       TEXT,
  expires_at   TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  lifted_at    TIMESTAMPTZ,
  operator_handle TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = admin, public, lensers
AS $$
  SELECT
    ks.id,
    ks.scope,
    ks.target_id,
    ks.reason,
    ks.expires_at,
    ks.activated_at,
    ks.lifted_at,
    p.handle AS operator_handle
  FROM  admin.kill_switches ks
  LEFT  JOIN lensers.profiles p ON p.id = ks.operator_id
  ORDER BY ks.activated_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.fn_kill_switch_list() TO authenticated;
