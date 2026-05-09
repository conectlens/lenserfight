-- Phase U1: Event bus
--
-- Introduces an internal, append-only event log that producer triggers across
-- the platform write into. The event log is the single source of truth that
-- the trigger-rule dispatcher (Phase U2 — see 20270410100000_phase_u_trigger_rules.sql)
-- consumes to drive automation actions: dispatch a workflow, enqueue a webhook,
-- or notify a lenser.
--
-- Design notes
--   * Events are immutable. There are no UPDATE/DELETE policies for non-service
--     callers. Service role bypasses RLS for retention/cleanup jobs.
--   * `source_lenser_id` is denormalized at emit time so that owner-only RLS on
--     SELECT does not require a join into producer tables (battles, agents,
--     lenses, …) which carry their own RLS rules.
--   * Payloads are limited to IDs + timestamps. Producers MUST NOT persist
--     user-supplied content (titles, bodies, prompt text, etc.) into the
--     payload; consumers re-read from the source row when they need detail.
--     This keeps the event log free of PII duplication and avoids privacy
--     leakage if a downstream rule routes the payload to an external webhook.
--
-- Reuse
--   * Webhook delivery (when a trigger rule fires action_kind='webhook') is
--     handled by the existing audit.webhook_outbox + audit.fn_dispatch_webhook_outbox
--     defined in 20270320000000_phase_p_webhook_outbox.sql. This file does
--     NOT replace that pipeline; it only feeds new outbox rows from U2.

-- ─── 1. Schema ───────────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS automation;

GRANT USAGE ON SCHEMA automation TO authenticated, service_role;

COMMENT ON SCHEMA automation IS
  'Phase U: event bus + trigger-rule dispatcher. Producer triggers across the '
  'platform emit rows into automation.events; automation.trigger_rules + the '
  'automation-dispatcher cron drain those events into actions (workflow, '
  'webhook via audit.webhook_outbox, notification via public.fn_insert_notification).';

-- ─── 2. automation.events ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS automation.events (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type         text        NOT NULL,
  source_schema      text        NULL,
  source_table       text        NULL,
  source_id          uuid        NULL,
  source_lenser_id   uuid        NULL,
  payload            jsonb       NOT NULL DEFAULT '{}'::jsonb,
  occurred_at        timestamptz NOT NULL DEFAULT now(),
  recorded_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE automation.events OWNER TO postgres;

COMMENT ON TABLE automation.events IS
  'Phase U1: append-only event log. Producer triggers call automation.fn_emit_event. '
  'source_lenser_id is denormalized at emit time so owner-only RLS does not need '
  'cross-schema joins. Payloads carry IDs and timestamps only; no PII or '
  'user-supplied content.';

COMMENT ON COLUMN automation.events.event_type IS
  'Dot-namespaced event type, e.g. battle.finalized, workflow_run.completed, '
  'workflow_run.failed, approval.timed_out, approval.granted, battle.flagged.';

COMMENT ON COLUMN automation.events.source_lenser_id IS
  'Denormalized owner of the source row at emit time. NULL means system-level / '
  'no obvious owner. Trigger rules with NULL filter ignore ownership.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_automation_events_type_time
  ON automation.events (event_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_automation_events_source_id
  ON automation.events (source_id)
  WHERE source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_automation_events_source_lenser
  ON automation.events (source_lenser_id)
  WHERE source_lenser_id IS NOT NULL;

-- RLS
ALTER TABLE automation.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS automation_events_owner_select ON automation.events;
CREATE POLICY automation_events_owner_select
  ON automation.events
  FOR SELECT
  TO authenticated
  USING (source_lenser_id = auth.uid());

-- No INSERT/UPDATE/DELETE policies for authenticated. service_role bypasses
-- RLS; SECURITY DEFINER functions (fn_emit_event) write rows on behalf of
-- triggers in producer schemas.

-- ─── 3. automation.fn_emit_event ─────────────────────────────────────────────
-- Called by producer triggers. SECURITY DEFINER so triggers running under
-- arbitrary RLS contexts (battle creator, agent owner, etc.) can append.

CREATE OR REPLACE FUNCTION automation.fn_emit_event(
  p_type             text,
  p_source_schema    text,
  p_source_table     text,
  p_source_id        uuid,
  p_payload          jsonb DEFAULT '{}'::jsonb,
  p_source_lenser_id uuid  DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = automation, public, pg_catalog
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO automation.events (
    event_type, source_schema, source_table, source_id,
    source_lenser_id, payload
  )
  VALUES (
    p_type, p_source_schema, p_source_table, p_source_id,
    p_source_lenser_id, COALESCE(p_payload, '{}'::jsonb)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

ALTER FUNCTION automation.fn_emit_event(text, text, text, uuid, jsonb, uuid)
  OWNER TO postgres;

REVOKE ALL ON FUNCTION automation.fn_emit_event(text, text, text, uuid, jsonb, uuid)
  FROM PUBLIC;

-- service_role: dispatcher / backfill / tests.
-- authenticated: required because producer triggers fire under the caller's
--   role (RLS-enabled tables call this from BEFORE/AFTER triggers).
GRANT EXECUTE ON FUNCTION automation.fn_emit_event(text, text, text, uuid, jsonb, uuid)
  TO service_role, authenticated;

COMMENT ON FUNCTION automation.fn_emit_event(text, text, text, uuid, jsonb, uuid) IS
  'Phase U1: append a row to automation.events. SECURITY DEFINER so producer '
  'triggers on RLS-enabled tables can call it. Caller MUST NOT pass PII or '
  'user-supplied content in p_payload — only IDs and timestamps.';

-- ─── 4. Producer triggers ────────────────────────────────────────────────────
-- Each producer is wired with a small AFTER trigger that wraps emission. We
-- DO NOT redefine the existing finalize / decide / dispatcher functions —
-- doing so would duplicate large chunks of platform logic. Instead we attach
-- a sibling trigger on the row itself.

-- 4a. battle.finalized
-- Fires when battles.battles.status transitions to 'closed' (the terminal
-- state set by public.fn_battles_finalize). Payload: winner contender id,
-- finalized_at. Source-lenser is the battle creator.

CREATE OR REPLACE FUNCTION automation.trg_emit_battle_finalized()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = automation, public, pg_catalog
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.status IS DISTINCT FROM NEW.status
     AND NEW.status = 'closed' THEN
    PERFORM automation.fn_emit_event(
      'battle.finalized',
      'battles',
      'battles',
      NEW.id,
      jsonb_build_object(
        'winner_contender_id', NEW.winner_contender_id,
        'finalized_at',        NEW.finalized_at,
        'is_draw',             (NEW.winner_contender_id IS NULL)
      ),
      NEW.creator_lenser_id
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trg_emit_battle_finalized failed for battle %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

ALTER FUNCTION automation.trg_emit_battle_finalized() OWNER TO postgres;

DROP TRIGGER IF EXISTS trg_emit_battle_finalized ON battles.battles;
CREATE TRIGGER trg_emit_battle_finalized
  AFTER UPDATE OF status ON battles.battles
  FOR EACH ROW
  EXECUTE FUNCTION automation.trg_emit_battle_finalized();

COMMENT ON FUNCTION automation.trg_emit_battle_finalized() IS
  'Phase U1 producer: emits battle.finalized into automation.events when '
  'battles.battles.status transitions to closed. Payload contains winner '
  'contender id and finalized_at — no titles or prompts (no PII).';

-- 4b. battle.flagged
-- Fires after audit.moderation_decisions INSERT with decision_type='flagged'.
-- Sibling trigger to existing trg_moderation_decisions_flagged_webhook.

CREATE OR REPLACE FUNCTION automation.trg_emit_moderation_flagged()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = automation, public, pg_catalog
AS $$
BEGIN
  IF NEW.decision_type = 'flagged' THEN
    PERFORM automation.fn_emit_event(
      'battle.flagged',
      NEW.target_entity_schema,
      NEW.target_entity_table,
      NEW.target_entity_id,
      jsonb_build_object(
        'decision_id',     NEW.id,
        'is_ai_moderated', NEW.is_ai_moderated,
        'occurred_at',     NEW.occurred_at
      ),
      NEW.moderator_lenser_id
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trg_emit_moderation_flagged failed for decision %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

ALTER FUNCTION automation.trg_emit_moderation_flagged() OWNER TO postgres;

DROP TRIGGER IF EXISTS trg_emit_moderation_flagged ON audit.moderation_decisions;
CREATE TRIGGER trg_emit_moderation_flagged
  AFTER INSERT ON audit.moderation_decisions
  FOR EACH ROW
  WHEN (NEW.decision_type = 'flagged')
  EXECUTE FUNCTION automation.trg_emit_moderation_flagged();

COMMENT ON FUNCTION automation.trg_emit_moderation_flagged() IS
  'Phase U1 producer: emits battle.flagged into automation.events for any '
  'audit.moderation_decisions INSERT with decision_type=flagged. Reason text '
  'is intentionally NOT included in the payload — it can contain operator '
  'commentary; consumers re-read audit.moderation_decisions when needed.';

-- 4c. workflow_run.completed and workflow_run.failed
-- Fires on lenses.workflow_runs status transitions. Sibling to the existing
-- trg_notify_cron_run_change (which only fires for scheduled runs); this one
-- fires for any run so manual + autonomous + scheduled runs all reach the
-- automation bus.

CREATE OR REPLACE FUNCTION automation.trg_emit_workflow_run_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = automation, public, pg_catalog
AS $$
DECLARE
  v_event_type text;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'completed' THEN
    v_event_type := 'workflow_run.completed';
  ELSIF NEW.status IN ('failed', 'timed_out') THEN
    v_event_type := 'workflow_run.failed';
  ELSE
    RETURN NEW;
  END IF;

  PERFORM automation.fn_emit_event(
    v_event_type,
    'lenses',
    'workflow_runs',
    NEW.id,
    jsonb_build_object(
      'workflow_id',  NEW.workflow_id,
      'status',       NEW.status,
      'trigger_mode', NEW.trigger_mode,
      'started_at',   NEW.started_at,
      'completed_at', NEW.completed_at
    ),
    NEW.triggered_by
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trg_emit_workflow_run_state failed for run %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

ALTER FUNCTION automation.trg_emit_workflow_run_state() OWNER TO postgres;

DROP TRIGGER IF EXISTS trg_emit_workflow_run_state ON lenses.workflow_runs;
CREATE TRIGGER trg_emit_workflow_run_state
  AFTER UPDATE OF status ON lenses.workflow_runs
  FOR EACH ROW
  EXECUTE FUNCTION automation.trg_emit_workflow_run_state();

COMMENT ON FUNCTION automation.trg_emit_workflow_run_state() IS
  'Phase U1 producer: emits workflow_run.completed / workflow_run.failed into '
  'automation.events on lenses.workflow_runs status transitions. Failure also '
  'fires for status=timed_out (terminal failure mode introduced by Phase K). '
  'Payload contains IDs and timestamps; never node outputs or prompt text.';

-- 4d. approval.timed_out
-- Fires when agents.team_runs.approval_status flips to 'timed_out' (set by
-- public.fn_expire_stale_approvals). Sibling trigger keeps the existing
-- function intact.

CREATE OR REPLACE FUNCTION automation.trg_emit_approval_timed_out()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = automation, public, pg_catalog
AS $$
DECLARE
  v_owner_lenser_id uuid;
BEGIN
  IF OLD.approval_status IS DISTINCT FROM NEW.approval_status
     AND NEW.approval_status = 'timed_out' THEN

    -- Resolve the AI lenser's profile_id so source_lenser_id matches the
    -- pattern used by other producers (the lenser the rule owner expects).
    SELECT profile_id INTO v_owner_lenser_id
    FROM   agents.ai_lensers
    WHERE  id = NEW.ai_lenser_id;

    PERFORM automation.fn_emit_event(
      'approval.timed_out',
      'agents',
      'team_runs',
      NEW.id,
      jsonb_build_object(
        'ai_lenser_id',     NEW.ai_lenser_id,
        'team_id',          NEW.team_id,
        'workflow_id',      NEW.workflow_id,
        'workflow_run_id',  NEW.workflow_run_id,
        'expired_at',       NEW.completed_at
      ),
      v_owner_lenser_id
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trg_emit_approval_timed_out failed for team_run %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

ALTER FUNCTION automation.trg_emit_approval_timed_out() OWNER TO postgres;

DROP TRIGGER IF EXISTS trg_emit_approval_timed_out ON agents.team_runs;
CREATE TRIGGER trg_emit_approval_timed_out
  AFTER UPDATE OF approval_status ON agents.team_runs
  FOR EACH ROW
  EXECUTE FUNCTION automation.trg_emit_approval_timed_out();

COMMENT ON FUNCTION automation.trg_emit_approval_timed_out() IS
  'Phase U1 producer: emits approval.timed_out into automation.events when '
  'agents.team_runs.approval_status transitions to timed_out (set by '
  'public.fn_expire_stale_approvals). Payload contains IDs only — the gate '
  'metadata (which may contain operator notes) is intentionally omitted.';

-- 4e. approval.granted
-- Fires on the same approval_status column when transitioning to 'approved'
-- (set by public.fn_decide_approval).

CREATE OR REPLACE FUNCTION automation.trg_emit_approval_granted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = automation, public, pg_catalog
AS $$
DECLARE
  v_owner_lenser_id uuid;
BEGIN
  IF OLD.approval_status IS DISTINCT FROM NEW.approval_status
     AND NEW.approval_status = 'approved' THEN

    SELECT profile_id INTO v_owner_lenser_id
    FROM   agents.ai_lensers
    WHERE  id = NEW.ai_lenser_id;

    PERFORM automation.fn_emit_event(
      'approval.granted',
      'agents',
      'team_runs',
      NEW.id,
      jsonb_build_object(
        'ai_lenser_id',    NEW.ai_lenser_id,
        'team_id',         NEW.team_id,
        'workflow_id',     NEW.workflow_id,
        'workflow_run_id', NEW.workflow_run_id,
        'granted_at',      NEW.updated_at
      ),
      v_owner_lenser_id
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trg_emit_approval_granted failed for team_run %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

ALTER FUNCTION automation.trg_emit_approval_granted() OWNER TO postgres;

DROP TRIGGER IF EXISTS trg_emit_approval_granted ON agents.team_runs;
CREATE TRIGGER trg_emit_approval_granted
  AFTER UPDATE OF approval_status ON agents.team_runs
  FOR EACH ROW
  EXECUTE FUNCTION automation.trg_emit_approval_granted();

COMMENT ON FUNCTION automation.trg_emit_approval_granted() IS
  'Phase U1 producer: emits approval.granted into automation.events when '
  'agents.team_runs.approval_status transitions to approved (set by '
  'public.fn_decide_approval). Reason / modifications are NOT included — '
  'they may contain operator commentary; consumers re-read team_runs.metadata.';

-- TODO(phase-u-followup):
-- The following producers were considered but intentionally left out of U1:
--   * battle.created  — no clear consumer in U2 yet; revisit when battle-vs-battle
--                       chaining is on the roadmap.
--   * approval.rejected — symmetrical to approval.granted; add when a rule
--                         needs the "fail and notify" pattern.
--   * vote.cast       — high write volume; do not emit per-vote without a
--                       decimation strategy.
