-- =============================================================================
-- Phase CG1 — AI Cost Governance & BYOK Hardening (financial safety MVP)
-- =============================================================================
-- Adds the financial-governance plane on top of existing BYOK v2 (BZ), pricing
-- (ai.model_pricing), and quota_snapshots. The migration is bundled and
-- idempotent; rollback is forward-only via billing.runtime_settings.enforce.
--
-- Scope:
--   1.  billing.runtime_settings        — feature-flag singleton (enforce flag)
--   2.  billing.pricing_snapshots       — pinned price at quote time
--   3.  billing.cost_reservations       — durable escrow (the saga state row)
--   4.  billing.ledger_entries          — append-only, hash-chained double-entry
--   5.  billing.budget_policies         — scope-keyed budgets (CG2 populates)
--   6.  billing.provider_circuit_state  — stub for CG6
--   7.  billing.spend_anomalies         — stub for CG7
--   8.  Hash-chain & immutability triggers on ledger_entries
--   9.  RLS: deny-first, service_role-only writes, owner-scoped SELECT
--  10.  fn_cost_quote          (DEFINER, authenticated + service_role)
--  11.  fn_cost_reserve        (DEFINER, service_role)
--  12.  fn_cost_meter_tick     (DEFINER, service_role; CG5 wires worker)
--  13.  fn_cost_commit         (DEFINER, service_role)
--  14.  fn_cost_release        (DEFINER, service_role)
--  15.  fn_cost_expire_reservations (DEFINER, service_role; pg_cron 60s)
--  16.  fn_byok_key_resolve_v2 (DEFINER, service_role) — reservation-bound
--  17.  fn_get_my_cost_reservations (DEFINER, authenticated) — owner UI
--  18.  pg_cron: cg1-cost-reservation-expiry every 60 s
--
-- Backwards compatibility:
--   - The legacy fn_byok_key_resolve(UUID, TEXT, TEXT) is preserved unchanged
--     so existing lf-gatewayd deployments do not break.
--   - When billing.runtime_settings.byok_require_reservation = true (default
--     false), the legacy resolve will raise E_BYOK_CONTEXT_MISSING. Flip the
--     flag only after every worker upgrades to v2.
--
-- Security notes:
--   - All cost-mutating writes go through SECURITY DEFINER RPCs.
--   - Ledger rows are append-only: UPDATE and DELETE are blocked by trigger.
--   - Each ledger row pins prev_hash and recomputes entry_hash server-side,
--     making the chain tamper-evident even by service_role.
--   - The reservation UUID is the unforgeable per-call token (binding model_id,
--     ai_lenser_id, status, held_until) — a strict superset of the threat
--     coverage planned for an HS256 JWT but without secret management in
--     plpgsql. This is documented as a refinement of the CG1 design.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. runtime_settings — singleton feature-flag row
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS billing.runtime_settings (
  id                          smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enforce                     boolean  NOT NULL DEFAULT false,
  byok_require_reservation    boolean  NOT NULL DEFAULT false,
  reservation_default_ttl     interval NOT NULL DEFAULT interval '5 minutes',
  meter_headroom_pct          smallint NOT NULL DEFAULT 10 CHECK (meter_headroom_pct BETWEEN 0 AND 100),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO billing.runtime_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE  billing.runtime_settings IS
  'CG1: singleton runtime config for the cost governance plane. id=1 enforced.';
COMMENT ON COLUMN billing.runtime_settings.enforce IS
  'When false, fn_cost_reserve still records reservations and ledger entries '
  'but does NOT raise on budget violations (shadow mode). Flip to true after '
  'CG2 ships budget policies. Mirrors the BILLING_ENFORCE env flag on workers.';
COMMENT ON COLUMN billing.runtime_settings.byok_require_reservation IS
  'When true, legacy fn_byok_key_resolve (v1) raises E_BYOK_CONTEXT_MISSING; '
  'callers must use fn_byok_key_resolve_v2 with a held reservation_id. Keep '
  'false until every worker (lf-gatewayd, platform-api) ships v2 calls.';

ALTER TABLE billing.runtime_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_runtime_settings_service_all ON billing.runtime_settings;
CREATE POLICY rls_runtime_settings_service_all
  ON billing.runtime_settings
  TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS rls_runtime_settings_auth_read ON billing.runtime_settings;
CREATE POLICY rls_runtime_settings_auth_read
  ON billing.runtime_settings
  FOR SELECT TO authenticated
  USING (true);

REVOKE ALL ON billing.runtime_settings FROM PUBLIC, anon;
GRANT  SELECT ON billing.runtime_settings TO authenticated;
GRANT  SELECT, INSERT, UPDATE ON billing.runtime_settings TO service_role;

-- ---------------------------------------------------------------------------
-- 2. pricing_snapshots — pin the price at quote time
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS billing.pricing_snapshots (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id            uuid NOT NULL REFERENCES ai.models(id) ON DELETE RESTRICT,
  source_pricing_id   uuid NOT NULL REFERENCES ai.model_pricing(id) ON DELETE RESTRICT,
  unit_type           ai.unit_type_enum NOT NULL,
  input_cpm_usd       numeric(20,10) NOT NULL CHECK (input_cpm_usd  >= 0),
  output_cpm_usd      numeric(20,10) NOT NULL CHECK (output_cpm_usd >= 0),
  unit_cost_usd       numeric(20,10),
  credit_rate_usd     numeric(20,10) NOT NULL DEFAULT 0.001 CHECK (credit_rate_usd > 0),
  taken_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pricing_snapshots_model_taken
  ON billing.pricing_snapshots (model_id, taken_at DESC);

COMMENT ON TABLE  billing.pricing_snapshots IS
  'CG1: immutable pin of provider list price at quote time. References the '
  'authoritative ai.model_pricing row so a price change between quote and '
  'commit cannot create or hide spend.';
COMMENT ON COLUMN billing.pricing_snapshots.credit_rate_usd IS
  'USD per platform credit at snapshot time. Default 0.001 = 1000 credits/$. '
  'Per-org overrides land in CG8 via tenancy.orgs.credit_rate_usd_override.';

ALTER TABLE billing.pricing_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_pricing_snapshots_service_all ON billing.pricing_snapshots;
CREATE POLICY rls_pricing_snapshots_service_all
  ON billing.pricing_snapshots
  TO service_role
  USING (true) WITH CHECK (true);

REVOKE ALL ON billing.pricing_snapshots FROM PUBLIC, anon, authenticated;
GRANT  SELECT, INSERT ON billing.pricing_snapshots TO service_role;

-- ---------------------------------------------------------------------------
-- 3. cost_reservations — durable escrow (saga state row)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS billing.cost_reservations (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_lenser_id          uuid NOT NULL REFERENCES agents.ai_lensers(id) ON DELETE RESTRICT,
  actor_id              uuid,                                   -- lensers.profiles.id of human initiator
  org_id                uuid,                                   -- nullable until CG8
  model_id              uuid NOT NULL REFERENCES ai.models(id) ON DELETE RESTRICT,
  provider_key          text NOT NULL,                          -- 'openai' | 'anthropic' | ...
  pricing_snapshot_id   uuid NOT NULL REFERENCES billing.pricing_snapshots(id) ON DELETE RESTRICT,
  reserved_credits      numeric(20,6) NOT NULL CHECK (reserved_credits > 0),
  reserved_usd          numeric(20,6) NOT NULL CHECK (reserved_usd     >= 0),
  running_credits       numeric(20,6) NOT NULL DEFAULT 0 CHECK (running_credits >= 0),
  committed_credits     numeric(20,6) CHECK (committed_credits IS NULL OR committed_credits >= 0),
  committed_usd         numeric(20,6),
  status                text NOT NULL DEFAULT 'held'
                              CHECK (status IN ('held','committed','released','expired')),
  reason_released       text,
  context               jsonb NOT NULL DEFAULT '{}'::jsonb,    -- {battle_id, workflow_run_id, job_id, worker_id}
  idempotency_key       text NOT NULL,
  shadow_mode           boolean NOT NULL DEFAULT false,        -- recorded when enforce=false
  created_at            timestamptz NOT NULL DEFAULT now(),
  held_until            timestamptz NOT NULL,
  committed_at          timestamptz,
  released_at           timestamptz,
  CONSTRAINT cost_reservations_held_future
    CHECK (status <> 'held' OR held_until > created_at),
  CONSTRAINT cost_reservations_idem_unique
    UNIQUE (ai_lenser_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_cost_reservations_lenser_status_created
  ON billing.cost_reservations (ai_lenser_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_cost_reservations_held_until
  ON billing.cost_reservations (held_until)
  WHERE status = 'held';

CREATE INDEX IF NOT EXISTS idx_cost_reservations_lenser_model_status
  ON billing.cost_reservations (ai_lenser_id, model_id, status);

CREATE INDEX IF NOT EXISTS idx_cost_reservations_lenser_created
  ON billing.cost_reservations (ai_lenser_id, created_at DESC);

COMMENT ON TABLE billing.cost_reservations IS
  'CG1: escrow row for one upcoming AI provider call. Lifecycle: '
  'held -> committed | released | expired. The id is the unforgeable per-call '
  'token consumed by fn_byok_key_resolve_v2.';

ALTER TABLE billing.cost_reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_cost_reservations_service_all ON billing.cost_reservations;
CREATE POLICY rls_cost_reservations_service_all
  ON billing.cost_reservations
  TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS rls_cost_reservations_owner_select ON billing.cost_reservations;
CREATE POLICY rls_cost_reservations_owner_select
  ON billing.cost_reservations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM   agents.ai_lensers al
      JOIN   lensers.profiles  p ON p.id = al.profile_id
      WHERE  al.id = billing.cost_reservations.ai_lenser_id
        AND  p.user_id = auth.uid()
    )
  );

REVOKE ALL ON billing.cost_reservations FROM PUBLIC, anon;
GRANT  SELECT ON billing.cost_reservations TO authenticated;
GRANT  SELECT, INSERT, UPDATE ON billing.cost_reservations TO service_role;

-- ---------------------------------------------------------------------------
-- 4. ledger_entries — append-only double-entry, hash-chained
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS billing.ledger_entries (
  id              bigserial PRIMARY KEY,
  reservation_id  uuid NOT NULL REFERENCES billing.cost_reservations(id) ON DELETE RESTRICT,
  ai_lenser_id    uuid NOT NULL,
  org_id          uuid,
  direction       text NOT NULL CHECK (direction IN ('debit_hold','debit_commit','release','adjustment')),
  amount_credits  numeric(20,6) NOT NULL,
  amount_usd      numeric(20,6) NOT NULL,
  prev_hash       bytea,
  entry_hash      bytea NOT NULL,
  recorded_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_lenser_recorded
  ON billing.ledger_entries (ai_lenser_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_reservation
  ON billing.ledger_entries (reservation_id, id);

COMMENT ON TABLE billing.ledger_entries IS
  'CG1: append-only, hash-chained ledger of all credit movements. '
  'Triggers compute entry_hash and block UPDATE/DELETE; an offline '
  'reconciliation job recomputes the chain.';

ALTER TABLE billing.ledger_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_ledger_entries_service_all ON billing.ledger_entries;
CREATE POLICY rls_ledger_entries_service_all
  ON billing.ledger_entries
  TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS rls_ledger_entries_owner_select ON billing.ledger_entries;
CREATE POLICY rls_ledger_entries_owner_select
  ON billing.ledger_entries
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM   agents.ai_lensers al
      JOIN   lensers.profiles  p ON p.id = al.profile_id
      WHERE  al.id = billing.ledger_entries.ai_lenser_id
        AND  p.user_id = auth.uid()
    )
  );

REVOKE ALL ON billing.ledger_entries FROM PUBLIC, anon;
REVOKE ALL ON SEQUENCE billing.ledger_entries_id_seq FROM PUBLIC, anon, authenticated;
GRANT  SELECT ON billing.ledger_entries TO authenticated;
GRANT  SELECT, INSERT ON billing.ledger_entries TO service_role;
GRANT  USAGE ON SEQUENCE billing.ledger_entries_id_seq TO service_role;

-- ── 4a. hash-chain trigger ───────────────────────────────────────────────────
-- entry_hash = sha256( COALESCE(prev_hash, '') ||
--                      canonical_json(reservation_id, direction,
--                                     amount_credits, amount_usd, recorded_at) )
-- prev_hash is auto-loaded from the prior entry for the same reservation.

CREATE OR REPLACE FUNCTION billing.tg_ledger_entries_hash()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = billing, public, pg_catalog
AS $$
DECLARE
  v_prev   bytea;
  v_canon  text;
BEGIN
  SELECT entry_hash INTO v_prev
  FROM   billing.ledger_entries
  WHERE  reservation_id = NEW.reservation_id
  ORDER  BY id DESC
  LIMIT  1;

  NEW.prev_hash := v_prev;  -- NULL for the first entry of the chain

  v_canon := jsonb_build_object(
    'reservation_id', NEW.reservation_id,
    'direction',      NEW.direction,
    'amount_credits', NEW.amount_credits::text,
    'amount_usd',     NEW.amount_usd::text,
    'recorded_at',    extract(epoch from NEW.recorded_at)::text
  )::text;

  NEW.entry_hash := extensions.digest(
    COALESCE(v_prev, ''::bytea) || convert_to(v_canon, 'UTF8'),
    'sha256'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ledger_entries_hash ON billing.ledger_entries;
CREATE TRIGGER trg_ledger_entries_hash
  BEFORE INSERT ON billing.ledger_entries
  FOR EACH ROW EXECUTE FUNCTION billing.tg_ledger_entries_hash();

-- ── 4b. immutability trigger — reject UPDATE / DELETE ────────────────────────

CREATE OR REPLACE FUNCTION billing.tg_ledger_entries_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'billing.ledger_entries is append-only (% blocked)', TG_OP
    USING ERRCODE = 'P0001';
END;
$$;

DROP TRIGGER IF EXISTS trg_ledger_entries_no_update ON billing.ledger_entries;
CREATE TRIGGER trg_ledger_entries_no_update
  BEFORE UPDATE ON billing.ledger_entries
  FOR EACH ROW EXECUTE FUNCTION billing.tg_ledger_entries_immutable();

DROP TRIGGER IF EXISTS trg_ledger_entries_no_delete ON billing.ledger_entries;
CREATE TRIGGER trg_ledger_entries_no_delete
  BEFORE DELETE ON billing.ledger_entries
  FOR EACH ROW EXECUTE FUNCTION billing.tg_ledger_entries_immutable();

-- ---------------------------------------------------------------------------
-- 5. budget_policies — CG2 will populate; create the surface now
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS billing.budget_policies (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope               text NOT NULL CHECK (scope IN ('agent','org','user')),
  scope_id            uuid NOT NULL,
  daily_credits       numeric(20,6),
  monthly_credits     numeric(20,6),
  burst_credits       numeric(20,6),
  soft_threshold_pct  smallint NOT NULL DEFAULT 80
                              CHECK (soft_threshold_pct BETWEEN 1 AND 99),
  hard_action         text NOT NULL DEFAULT 'block'
                              CHECK (hard_action IN ('block','queue','degrade')),
  rpm_limit           integer CHECK (rpm_limit IS NULL OR rpm_limit > 0),
  tpm_limit           integer CHECK (tpm_limit IS NULL OR tpm_limit > 0),
  emergency_kill      boolean NOT NULL DEFAULT false,
  updated_by          uuid,
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT budget_policies_scope_unique UNIQUE (scope, scope_id)
);

COMMENT ON TABLE billing.budget_policies IS
  'CG1: surface only; CG2 wires fn_cost_reserve to consult this table. '
  'In CG1, fn_cost_reserve falls back to agents.policies.spending_limit_credits.';

ALTER TABLE billing.budget_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_budget_policies_service_all ON billing.budget_policies;
CREATE POLICY rls_budget_policies_service_all
  ON billing.budget_policies
  TO service_role
  USING (true) WITH CHECK (true);

REVOKE ALL ON billing.budget_policies FROM PUBLIC, anon, authenticated;
GRANT  SELECT, INSERT, UPDATE ON billing.budget_policies TO service_role;

-- ---------------------------------------------------------------------------
-- 6. provider_circuit_state — CG6 will wire it; surface only
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS billing.provider_circuit_state (
  provider_key      text PRIMARY KEY,
  state             text NOT NULL DEFAULT 'closed'
                          CHECK (state IN ('closed','half_open','open')),
  failure_count     integer NOT NULL DEFAULT 0 CHECK (failure_count >= 0),
  last_failure_at   timestamptz,
  opened_at         timestamptz,
  next_probe_at     timestamptz,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE billing.provider_circuit_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_provider_circuit_service_all ON billing.provider_circuit_state;
CREATE POLICY rls_provider_circuit_service_all
  ON billing.provider_circuit_state
  TO service_role
  USING (true) WITH CHECK (true);

REVOKE ALL ON billing.provider_circuit_state FROM PUBLIC, anon, authenticated;
GRANT  SELECT, INSERT, UPDATE ON billing.provider_circuit_state TO service_role;

-- ---------------------------------------------------------------------------
-- 7. spend_anomalies — CG7 will wire it; surface only
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS billing.spend_anomalies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_lenser_id    uuid NOT NULL REFERENCES agents.ai_lensers(id) ON DELETE CASCADE,
  window_start    timestamptz NOT NULL,
  window_end      timestamptz NOT NULL CHECK (window_end > window_start),
  score           numeric(6,3) NOT NULL,
  signals         jsonb NOT NULL DEFAULT '{}'::jsonb,
  action_taken    text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spend_anomalies_lenser_created
  ON billing.spend_anomalies (ai_lenser_id, created_at DESC);

ALTER TABLE billing.spend_anomalies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_spend_anomalies_service_all ON billing.spend_anomalies;
CREATE POLICY rls_spend_anomalies_service_all
  ON billing.spend_anomalies
  TO service_role
  USING (true) WITH CHECK (true);

REVOKE ALL ON billing.spend_anomalies FROM PUBLIC, anon, authenticated;
GRANT  SELECT, INSERT ON billing.spend_anomalies TO service_role;

-- ---------------------------------------------------------------------------
-- 8. fn_cost_quote — pure-read price quote
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_cost_quote(
  p_model_id             uuid,
  p_est_input_tokens     integer DEFAULT 0,
  p_est_max_output_tokens integer DEFAULT 0,
  p_units                numeric DEFAULT 0
)
RETURNS TABLE (
  pricing_snapshot_id  uuid,
  unit_type            ai.unit_type_enum,
  estimated_usd        numeric,
  estimated_credits    numeric,
  credit_rate_usd      numeric,
  taken_at             timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = billing, ai, public, pg_catalog
AS $$
DECLARE
  v_pricing    ai.model_pricing%ROWTYPE;
  v_snap_id    uuid;
  v_usd        numeric(20,10);
  v_rate       numeric(20,10) := 0.001;       -- TODO(CG8): per-org override
  v_credits    numeric(20,6);
BEGIN
  IF p_model_id IS NULL THEN
    RAISE EXCEPTION 'fn_cost_quote: p_model_id is required'
      USING ERRCODE = '22023';
  END IF;
  IF p_est_input_tokens < 0 OR p_est_max_output_tokens < 0 OR p_units < 0 THEN
    RAISE EXCEPTION 'fn_cost_quote: negative usage not allowed'
      USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO   v_pricing
  FROM   ai.model_pricing
  WHERE  model_id = p_model_id
    AND  effective_from <= now()
    AND  (effective_to IS NULL OR effective_to > now())
  ORDER  BY effective_from DESC
  LIMIT  1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'E_PRICING_UNAVAILABLE: no active price row for model %', p_model_id
      USING ERRCODE = 'P0001';
  END IF;

  IF v_pricing.unit_type = 'tokens' THEN
    v_usd :=
        (p_est_input_tokens::numeric    / 1000.0) * v_pricing.input_cost_per_1k_tokens
      + (p_est_max_output_tokens::numeric / 1000.0) * v_pricing.output_cost_per_1k_tokens;
  ELSE
    v_usd := p_units * COALESCE(v_pricing.cost_per_unit, 0);
  END IF;

  -- Reuse a recent snapshot for the same source pricing row when present
  -- (under 5 min old) to avoid table bloat on hot paths. Alias the table so
  -- the OUT-column `taken_at` does not collide with the table column.
  SELECT ps.id
  INTO   v_snap_id
  FROM   billing.pricing_snapshots ps
  WHERE  ps.source_pricing_id = v_pricing.id
    AND  ps.taken_at > now() - interval '5 minutes'
  ORDER  BY ps.taken_at DESC
  LIMIT  1;

  IF v_snap_id IS NULL THEN
    INSERT INTO billing.pricing_snapshots (
      model_id, source_pricing_id, unit_type,
      input_cpm_usd, output_cpm_usd, unit_cost_usd, credit_rate_usd
    )
    VALUES (
      p_model_id, v_pricing.id, v_pricing.unit_type,
      v_pricing.input_cost_per_1k_tokens,
      v_pricing.output_cost_per_1k_tokens,
      v_pricing.cost_per_unit,
      v_rate
    )
    RETURNING id INTO v_snap_id;
  END IF;

  v_credits := CEIL(v_usd / v_rate);

  RETURN QUERY
  SELECT v_snap_id, v_pricing.unit_type, v_usd::numeric, v_credits, v_rate::numeric, now();
END;
$$;

REVOKE ALL ON FUNCTION public.fn_cost_quote(uuid, integer, integer, numeric) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.fn_cost_quote(uuid, integer, integer, numeric)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_cost_quote IS
  'CG1: returns an estimated dollar/credit cost AND pins a pricing_snapshot row '
  'that fn_cost_reserve will reference. Safe for authenticated callers (read-only '
  'pricing; no side effects beyond the immutable snapshot insert).';

-- ---------------------------------------------------------------------------
-- 9. fn_cost_reserve — escrow reservation; service_role only
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_cost_reserve(
  p_ai_lenser_id        uuid,
  p_pricing_snapshot_id uuid,
  p_reserved_credits    numeric,
  p_reserved_usd        numeric,
  p_provider_key        text,
  p_idempotency_key     text,
  p_context             jsonb DEFAULT '{}'::jsonb,
  p_actor_id            uuid  DEFAULT NULL,
  p_org_id              uuid  DEFAULT NULL,
  p_ttl                 interval DEFAULT NULL
)
RETURNS TABLE (
  reservation_id  uuid,
  status          text,
  held_until      timestamptz,
  shadow_mode     boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = billing, agents, public, pg_catalog
AS $$
DECLARE
  v_settings       billing.runtime_settings%ROWTYPE;
  v_snap           billing.pricing_snapshots%ROWTYPE;
  v_existing       billing.cost_reservations%ROWTYPE;
  v_lenser         agents.ai_lensers%ROWTYPE;
  v_policy_limit   numeric;
  v_already_held   numeric;
  v_already_today  numeric;
  v_kill_switch    boolean;
  v_paused         boolean;
  v_budget_enforce boolean := false;
  v_id             uuid;
  v_ttl            interval;
BEGIN
  IF p_ai_lenser_id IS NULL OR p_pricing_snapshot_id IS NULL
     OR p_reserved_credits IS NULL OR p_provider_key IS NULL
     OR p_idempotency_key IS NULL OR LENGTH(p_idempotency_key) = 0 THEN
    RAISE EXCEPTION 'fn_cost_reserve: missing required parameter'
      USING ERRCODE = '22023';
  END IF;
  IF p_reserved_credits <= 0 THEN
    RAISE EXCEPTION 'fn_cost_reserve: reserved_credits must be > 0'
      USING ERRCODE = '22023';
  END IF;
  IF p_reserved_usd IS NULL OR p_reserved_usd < 0 THEN
    RAISE EXCEPTION 'fn_cost_reserve: reserved_usd must be >= 0'
      USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_settings FROM billing.runtime_settings WHERE id = 1;
  v_ttl := COALESCE(p_ttl, v_settings.reservation_default_ttl);

  -- Idempotency short-circuit — replay returns the original row unchanged.
  SELECT cr.* INTO v_existing
  FROM   billing.cost_reservations cr
  WHERE  cr.ai_lenser_id = p_ai_lenser_id
    AND  cr.idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN QUERY
    SELECT v_existing.id, v_existing.status, v_existing.held_until, v_existing.shadow_mode;
    RETURN;
  END IF;

  SELECT ps.* INTO v_snap FROM billing.pricing_snapshots ps WHERE ps.id = p_pricing_snapshot_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'fn_cost_reserve: pricing_snapshot % not found', p_pricing_snapshot_id
      USING ERRCODE = '23503';
  END IF;

  SELECT al.* INTO v_lenser FROM agents.ai_lensers al WHERE al.id = p_ai_lenser_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'fn_cost_reserve: ai_lenser % not found', p_ai_lenser_id
      USING ERRCODE = '23503';
  END IF;
  IF v_lenser.is_active = false OR v_lenser.suspended_at IS NOT NULL THEN
    RAISE EXCEPTION 'E_AGENT_PAUSED: ai_lenser % is not active', p_ai_lenser_id
      USING ERRCODE = 'P0001';
  END IF;

  -- Workspace kill switch + budget enforcement flag (both on workspace_settings).
  SELECT COALESCE(ws.global_kill_switch, false),
         COALESCE(ws.agent_paused,       false),
         COALESCE(ws.budget_enforce,     false)
  INTO   v_kill_switch, v_paused, v_budget_enforce
  FROM   agents.workspace_settings ws
  WHERE  ws.ai_lenser_id = p_ai_lenser_id;
  IF v_kill_switch OR v_paused THEN
    RAISE EXCEPTION 'E_KILL_SWITCH: workspace or agent is paused'
      USING ERRCODE = 'P0001';
  END IF;

  -- Legacy daily-credit limit (agents.policies.spending_limit_credits).
  -- CG2 supersedes by consulting billing.budget_policies.
  IF v_budget_enforce THEN
    SELECT pol.spending_limit_credits
    INTO   v_policy_limit
    FROM   agents.policies pol
    WHERE  pol.ai_lenser_id = p_ai_lenser_id;
  END IF;

  IF v_policy_limit IS NOT NULL AND v_settings.enforce THEN
    SELECT COALESCE(SUM(cr.reserved_credits), 0)
    INTO   v_already_held
    FROM   billing.cost_reservations cr
    WHERE  cr.ai_lenser_id = p_ai_lenser_id
      AND  cr.status = 'held'
      AND  cr.held_until > now();

    SELECT COALESCE(qs.credits_spent, 0)
    INTO   v_already_today
    FROM   agents.quota_snapshots qs
    WHERE  qs.ai_lenser_id = p_ai_lenser_id
      AND  qs.period_date  = CURRENT_DATE;

    IF (COALESCE(v_already_held, 0) + COALESCE(v_already_today, 0) + p_reserved_credits) > v_policy_limit THEN
      RAISE EXCEPTION
        'E_BUDGET_EXCEEDED: ai_lenser % would breach daily limit % (held=% today=% requested=%)',
        p_ai_lenser_id, v_policy_limit,
        v_already_held, v_already_today, p_reserved_credits
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- Persist reservation + paired debit_hold ledger entry atomically.
  INSERT INTO billing.cost_reservations (
    ai_lenser_id, actor_id, org_id,
    model_id, provider_key, pricing_snapshot_id,
    reserved_credits, reserved_usd,
    status, context, idempotency_key, shadow_mode,
    held_until
  )
  VALUES (
    p_ai_lenser_id, p_actor_id, p_org_id,
    v_snap.model_id, p_provider_key, p_pricing_snapshot_id,
    p_reserved_credits, p_reserved_usd,
    'held', COALESCE(p_context, '{}'::jsonb), p_idempotency_key,
    NOT v_settings.enforce,
    now() + v_ttl
  )
  RETURNING id INTO v_id;

  INSERT INTO billing.ledger_entries (
    reservation_id, ai_lenser_id, org_id, direction,
    amount_credits, amount_usd
  )
  VALUES (
    v_id, p_ai_lenser_id, p_org_id, 'debit_hold',
    p_reserved_credits, p_reserved_usd
  );

  PERFORM automation.fn_emit_event(
    'billing.budget_reserved',
    'billing', 'cost_reservations', v_id,
    jsonb_build_object(
      'ai_lenser_id',     p_ai_lenser_id,
      'reserved_credits', p_reserved_credits,
      'reserved_usd',     p_reserved_usd,
      'provider_key',     p_provider_key,
      'shadow_mode',      NOT v_settings.enforce
    ),
    NULL
  );

  RETURN QUERY
  SELECT v_id, 'held'::text, now() + v_ttl, NOT v_settings.enforce;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_cost_reserve(uuid, uuid, numeric, numeric, text, text, jsonb, uuid, uuid, interval) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.fn_cost_reserve(uuid, uuid, numeric, numeric, text, text, jsonb, uuid, uuid, interval)
  TO service_role;

COMMENT ON FUNCTION public.fn_cost_reserve IS
  'CG1: creates a held reservation + debit_hold ledger entry. Service_role only. '
  'Idempotent on (ai_lenser_id, idempotency_key). Fails closed on budget when '
  'billing.runtime_settings.enforce = true.';

-- ---------------------------------------------------------------------------
-- 10. fn_cost_meter_tick — mid-stream metering (CG5 wires workers)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_cost_meter_tick(
  p_reservation_id  uuid,
  p_running_credits numeric
)
RETURNS TABLE (
  status           text,
  over_limit       boolean,
  reserved_credits numeric,
  running_credits  numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = billing, public, pg_catalog
AS $$
DECLARE
  v_row       billing.cost_reservations%ROWTYPE;
  v_headroom  smallint;
  v_over      boolean := false;
BEGIN
  IF p_reservation_id IS NULL OR p_running_credits IS NULL OR p_running_credits < 0 THEN
    RAISE EXCEPTION 'fn_cost_meter_tick: bad input'
      USING ERRCODE = '22023';
  END IF;

  SELECT cr.* INTO v_row FROM billing.cost_reservations cr
  WHERE cr.id = p_reservation_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'fn_cost_meter_tick: reservation % not found', p_reservation_id
      USING ERRCODE = '23503';
  END IF;
  IF v_row.status <> 'held' THEN
    RAISE EXCEPTION 'fn_cost_meter_tick: reservation % not held (status=%)',
      p_reservation_id, v_row.status
      USING ERRCODE = 'P0001';
  END IF;

  SELECT rs.meter_headroom_pct INTO v_headroom
  FROM billing.runtime_settings rs WHERE rs.id = 1;
  v_over := p_running_credits > v_row.reserved_credits * (1 + v_headroom::numeric / 100);

  UPDATE billing.cost_reservations cr
     SET running_credits = GREATEST(cr.running_credits, p_running_credits)
   WHERE cr.id = p_reservation_id;

  RETURN QUERY
  SELECT v_row.status, v_over, v_row.reserved_credits, GREATEST(v_row.running_credits, p_running_credits);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_cost_meter_tick(uuid, numeric) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.fn_cost_meter_tick(uuid, numeric) TO service_role;

COMMENT ON FUNCTION public.fn_cost_meter_tick IS
  'CG1: monotonically updates running_credits and returns over_limit=true when '
  'running credits exceed reserved * (1 + headroom_pct). CG5 wires workers.';

-- ---------------------------------------------------------------------------
-- 11. fn_cost_commit — finalize spend, settle quota_snapshots
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_cost_commit(
  p_reservation_id    uuid,
  p_actual_credits    numeric,
  p_actual_usd        numeric
)
RETURNS TABLE (
  reservation_id   uuid,
  status           text,
  committed_credits numeric,
  committed_usd    numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = billing, agents, public, pg_catalog
AS $$
DECLARE
  v_row     billing.cost_reservations%ROWTYPE;
  v_credits numeric;
BEGIN
  IF p_reservation_id IS NULL OR p_actual_credits IS NULL OR p_actual_credits < 0
     OR p_actual_usd IS NULL OR p_actual_usd < 0 THEN
    RAISE EXCEPTION 'fn_cost_commit: bad input'
      USING ERRCODE = '22023';
  END IF;

  SELECT cr.* INTO v_row FROM billing.cost_reservations cr
  WHERE cr.id = p_reservation_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'fn_cost_commit: reservation % not found', p_reservation_id
      USING ERRCODE = '23503';
  END IF;
  IF v_row.status = 'committed' THEN
    -- Idempotent: return current state.
    RETURN QUERY
    SELECT v_row.id, v_row.status, v_row.committed_credits, v_row.committed_usd;
    RETURN;
  END IF;
  IF v_row.status <> 'held' THEN
    RAISE EXCEPTION 'fn_cost_commit: reservation % cannot commit from status %',
      p_reservation_id, v_row.status
      USING ERRCODE = 'P0001';
  END IF;

  v_credits := CEIL(p_actual_credits);

  -- Reverse the original hold and post the actual commit (double-entry).
  INSERT INTO billing.ledger_entries (
    reservation_id, ai_lenser_id, org_id, direction, amount_credits, amount_usd
  )
  VALUES
    (v_row.id, v_row.ai_lenser_id, v_row.org_id, 'release',
       -v_row.reserved_credits, -v_row.reserved_usd),
    (v_row.id, v_row.ai_lenser_id, v_row.org_id, 'debit_commit',
       p_actual_credits, p_actual_usd);

  UPDATE billing.cost_reservations cr
     SET status            = 'committed',
         committed_credits = p_actual_credits,
         committed_usd     = p_actual_usd,
         committed_at      = now()
   WHERE cr.id = v_row.id;

  -- Settle into the legacy daily snapshot (kept as a materialized projection
  -- of the ledger so existing budget readers keep working).
  INSERT INTO agents.quota_snapshots AS qs (ai_lenser_id, period_date, credits_spent)
  VALUES (v_row.ai_lenser_id, CURRENT_DATE, v_credits)
  ON CONFLICT (ai_lenser_id, period_date) DO UPDATE
    SET credits_spent = qs.credits_spent + EXCLUDED.credits_spent,
        updated_at    = now();

  PERFORM automation.fn_emit_event(
    'billing.budget_committed',
    'billing', 'cost_reservations', v_row.id,
    jsonb_build_object(
      'ai_lenser_id',      v_row.ai_lenser_id,
      'committed_credits', p_actual_credits,
      'committed_usd',     p_actual_usd
    ),
    NULL
  );

  RETURN QUERY
  SELECT v_row.id, 'committed'::text, p_actual_credits, p_actual_usd;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_cost_commit(uuid, numeric, numeric) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.fn_cost_commit(uuid, numeric, numeric) TO service_role;

COMMENT ON FUNCTION public.fn_cost_commit IS
  'CG1: held -> committed. Posts reversal of debit_hold + new debit_commit. '
  'Settles agents.quota_snapshots so legacy budget readers see the spend. '
  'Idempotent on already-committed reservations.';

-- ---------------------------------------------------------------------------
-- 12. fn_cost_release — abort path; held -> released
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_cost_release(
  p_reservation_id  uuid,
  p_reason          text
)
RETURNS TABLE (
  reservation_id  uuid,
  status          text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = billing, public, pg_catalog
AS $$
DECLARE
  v_row billing.cost_reservations%ROWTYPE;
BEGIN
  IF p_reservation_id IS NULL THEN
    RAISE EXCEPTION 'fn_cost_release: reservation_id required'
      USING ERRCODE = '22023';
  END IF;

  SELECT cr.* INTO v_row FROM billing.cost_reservations cr
  WHERE cr.id = p_reservation_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'fn_cost_release: reservation % not found', p_reservation_id
      USING ERRCODE = '23503';
  END IF;
  IF v_row.status IN ('released','expired') THEN
    RETURN QUERY SELECT v_row.id, v_row.status;
    RETURN;
  END IF;
  IF v_row.status <> 'held' THEN
    RAISE EXCEPTION 'fn_cost_release: reservation % cannot release from status %',
      p_reservation_id, v_row.status
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO billing.ledger_entries (
    reservation_id, ai_lenser_id, org_id, direction, amount_credits, amount_usd
  )
  VALUES (
    v_row.id, v_row.ai_lenser_id, v_row.org_id, 'release',
    -v_row.reserved_credits, -v_row.reserved_usd
  );

  UPDATE billing.cost_reservations cr
     SET status           = 'released',
         reason_released  = p_reason,
         released_at      = now()
   WHERE cr.id = v_row.id;

  PERFORM automation.fn_emit_event(
    'billing.budget_released',
    'billing', 'cost_reservations', v_row.id,
    jsonb_build_object(
      'ai_lenser_id', v_row.ai_lenser_id,
      'reason',       COALESCE(p_reason, ''),
      'amount_credits', v_row.reserved_credits
    ),
    NULL
  );

  RETURN QUERY SELECT v_row.id, 'released'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_cost_release(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.fn_cost_release(uuid, text) TO service_role;

COMMENT ON FUNCTION public.fn_cost_release IS
  'CG1: held -> released. Posts a release ledger entry reversing the hold. '
  'Idempotent on already-released/expired reservations.';

-- ---------------------------------------------------------------------------
-- 13. fn_cost_expire_reservations — cron sweeper (every 60s)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_cost_expire_reservations(p_max_batch integer DEFAULT 200)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = billing, public, pg_catalog
AS $$
DECLARE
  v_id    uuid;
  v_count integer := 0;
BEGIN
  -- Claim with SKIP LOCKED so multiple cron workers cannot collide.
  FOR v_id IN
    SELECT id
    FROM   billing.cost_reservations
    WHERE  status = 'held' AND held_until <= now()
    ORDER  BY held_until
    LIMIT  GREATEST(p_max_batch, 1)
    FOR    UPDATE SKIP LOCKED
  LOOP
    BEGIN
      PERFORM public.fn_cost_release(v_id, 'worker_timeout');
      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Defensive: a failed release for one reservation should not abort the
      -- whole batch. Mark expired without a ledger reversal as a last resort.
      UPDATE billing.cost_reservations
         SET status = 'expired', released_at = now(), reason_released = 'expire_fallback:' || SQLERRM
       WHERE id = v_id AND status = 'held';
    END;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_cost_expire_reservations(integer) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.fn_cost_expire_reservations(integer) TO service_role;

COMMENT ON FUNCTION public.fn_cost_expire_reservations IS
  'CG1: cron-driven sweeper that releases reservations whose held_until passed. '
  'Uses FOR UPDATE SKIP LOCKED for safe concurrent workers.';

-- ---------------------------------------------------------------------------
-- 14. fn_byok_key_resolve_v2 — reservation-bound BYOK access
-- ---------------------------------------------------------------------------
-- Service_role-only. The reservation_id is the per-call unforgeable token; it
-- binds the resolved key to {ai_lenser_id, model_id, provider, status, ttl}.
-- The legacy fn_byok_key_resolve(UUID, TEXT, TEXT) stays in place; flipping
-- billing.runtime_settings.byok_require_reservation = true makes the legacy
-- raise E_BYOK_CONTEXT_MISSING (see step 15).

CREATE OR REPLACE FUNCTION public.fn_byok_key_resolve_v2(
  p_agent_id        uuid,
  p_provider        text,
  p_model_id        text,
  p_reservation_id  uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = execution, billing, agents, ai, public, pg_catalog
AS $$
DECLARE
  v_key   execution.byok_keys%ROWTYPE;
  v_res   billing.cost_reservations%ROWTYPE;
  v_model_key text;
BEGIN
  IF p_reservation_id IS NULL THEN
    RAISE EXCEPTION 'E_BYOK_CONTEXT_MISSING: reservation_id is required'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_res FROM billing.cost_reservations WHERE id = p_reservation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'E_BYOK_CONTEXT_INVALID: reservation % not found', p_reservation_id
      USING ERRCODE = 'P0001';
  END IF;

  IF v_res.status <> 'held' THEN
    RAISE EXCEPTION 'E_BYOK_CONTEXT_INVALID: reservation % is not held (status=%)',
      p_reservation_id, v_res.status
      USING ERRCODE = 'P0001';
  END IF;
  IF v_res.held_until <= now() THEN
    RAISE EXCEPTION 'E_BYOK_CONTEXT_EXPIRED: reservation % held_until passed', p_reservation_id
      USING ERRCODE = 'P0001';
  END IF;
  IF v_res.ai_lenser_id <> p_agent_id THEN
    RAISE EXCEPTION 'E_BYOK_CONTEXT_INVALID: reservation/agent mismatch'
      USING ERRCODE = 'P0001';
  END IF;
  IF v_res.provider_key <> p_provider THEN
    RAISE EXCEPTION 'E_BYOK_CONTEXT_INVALID: reservation/provider mismatch'
      USING ERRCODE = 'P0001';
  END IF;

  -- Optional model binding: if p_model_id is given, it must match the
  -- reservation's model_id (look up via ai.models.key).
  IF p_model_id IS NOT NULL AND LENGTH(p_model_id) > 0 THEN
    SELECT key INTO v_model_key FROM ai.models WHERE id = v_res.model_id;
    IF v_model_key IS DISTINCT FROM p_model_id THEN
      RAISE EXCEPTION 'E_BYOK_CONTEXT_INVALID: reservation/model mismatch (expected %, got %)',
        v_model_key, p_model_id
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  SELECT * INTO v_key
  FROM   execution.byok_keys
  WHERE  agent_id   = p_agent_id
    AND  provider   = p_provider
    AND  revoked_at IS NULL
    AND  (expires_at IS NULL OR expires_at > now());
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF p_model_id IS NOT NULL
     AND v_key.allowed_model_ids IS NOT NULL
     AND NOT (p_model_id = ANY (v_key.allowed_model_ids)) THEN
    RAISE EXCEPTION 'byok_key_resolve_v2: model % is not in allowed_model_ids for provider %',
      p_model_id, p_provider
      USING ERRCODE = 'P0001';
  END IF;

  -- Audit row: prefer caller-supplied model id, else fall back to the model
  -- key bound by the reservation. fn_byok_log_usage demands NOT NULL.
  IF p_model_id IS NOT NULL AND LENGTH(p_model_id) > 0 THEN
    PERFORM public.fn_byok_log_usage(v_key.id, NULL, p_model_id, 0);
  ELSIF v_model_key IS NOT NULL THEN
    PERFORM public.fn_byok_log_usage(v_key.id, NULL, v_model_key, 0);
  ELSE
    SELECT m.key INTO v_model_key FROM ai.models m WHERE m.id = v_res.model_id;
    PERFORM public.fn_byok_log_usage(v_key.id, NULL, COALESCE(v_model_key, 'unknown'), 0);
  END IF;

  RETURN v_key.key_encrypted;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_byok_key_resolve_v2(uuid, text, text, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.fn_byok_key_resolve_v2(uuid, text, text, uuid) TO service_role;

COMMENT ON FUNCTION public.fn_byok_key_resolve_v2 IS
  'CG1: BYOK key resolution bound to a held reservation. The reservation_id '
  'is the per-call unforgeable token. Service_role only. Logs every resolve '
  'to audit.byok_key_usage via fn_byok_log_usage.';

-- ---------------------------------------------------------------------------
-- 15. fn_byok_key_resolve (legacy) — gated by byok_require_reservation flag
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_byok_key_resolve(
  p_agent_id   uuid,
  p_provider   text,
  p_model_id   text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = execution, billing, public, pg_catalog
AS $$
DECLARE
  v_row     execution.byok_keys%ROWTYPE;
  v_require boolean;
BEGIN
  SELECT byok_require_reservation INTO v_require FROM billing.runtime_settings WHERE id = 1;
  IF COALESCE(v_require, false) THEN
    RAISE EXCEPTION 'E_BYOK_CONTEXT_MISSING: legacy fn_byok_key_resolve is disabled; use fn_byok_key_resolve_v2'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_row
  FROM   execution.byok_keys
  WHERE  agent_id   = p_agent_id
    AND  provider   = p_provider
    AND  revoked_at IS NULL
    AND  (expires_at IS NULL OR expires_at > now());

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF p_model_id IS NOT NULL
     AND v_row.allowed_model_ids IS NOT NULL
     AND NOT (p_model_id = ANY (v_row.allowed_model_ids)) THEN
    RAISE EXCEPTION 'byok_key_resolve: model % is not in allowed_model_ids for provider %', p_model_id, p_provider
      USING ERRCODE = 'P0001';
  END IF;

  RETURN v_row.key_encrypted;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_byok_key_resolve(uuid, text, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.fn_byok_key_resolve(uuid, text, text) TO service_role;

COMMENT ON FUNCTION public.fn_byok_key_resolve IS
  'AR / CG1: legacy BYOK resolve. Preserved for backward compatibility with '
  'lf-gatewayd <= 0.10. Raises E_BYOK_CONTEXT_MISSING when '
  'billing.runtime_settings.byok_require_reservation = true.';

-- ---------------------------------------------------------------------------
-- 16. fn_get_my_cost_reservations — owner UI helper
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_get_my_cost_reservations(
  p_limit  integer DEFAULT 50,
  p_status text    DEFAULT NULL
)
RETURNS TABLE (
  id                uuid,
  ai_lenser_id      uuid,
  model_id          uuid,
  provider_key      text,
  reserved_credits  numeric,
  committed_credits numeric,
  status            text,
  created_at        timestamptz,
  held_until        timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = billing, agents, lensers, public, pg_catalog
AS $$
  SELECT r.id, r.ai_lenser_id, r.model_id, r.provider_key,
         r.reserved_credits, r.committed_credits, r.status,
         r.created_at, r.held_until
  FROM   billing.cost_reservations r
  JOIN   agents.ai_lensers al ON al.id = r.ai_lenser_id
  JOIN   lensers.profiles  p  ON p.id  = al.profile_id
  WHERE  p.user_id = auth.uid()
    AND  (p_status IS NULL OR r.status = p_status)
  ORDER  BY r.created_at DESC
  LIMIT  LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
$$;

REVOKE ALL ON FUNCTION public.fn_get_my_cost_reservations(integer, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.fn_get_my_cost_reservations(integer, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_get_my_cost_reservations IS
  'CG1: owner read of own cost reservations. Limit clamped to [1, 200].';

-- ---------------------------------------------------------------------------
-- 17. pg_cron: reservation expiry sweep every 60 s
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cg1-cost-reservation-expiry') THEN
      PERFORM cron.unschedule('cg1-cost-reservation-expiry');
    END IF;

    PERFORM cron.schedule(
      'cg1-cost-reservation-expiry',
      '*/1 * * * *',
      $cron$SELECT public.fn_cost_expire_reservations(200)$cron$
    );
  END IF;
END$$;

-- =============================================================================
-- END Phase CG1
-- =============================================================================
