-- =============================================================================
-- Phase CB gap fixes — wire P1/P2 unresolved risks from XP Seasons v2:
--
--   P1a: WORKFLOW_RUN_RECEIVED trigger — fires when another lenser runs a
--        public workflow you own.
--   P1b: TUTORIAL_COMPLETED / WALKTHROUGH_COMPLETED — tutorial_completions
--        table + RPC + trigger so completion is server-side verified.
--   P2:  Season is_active auto-flip — pg_cron job that activates the next
--        season when starts_at passes and deactivates expired ones.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- P1a: WORKFLOW_RUN_RECEIVED
-- Fires on every INSERT into lenses.workflow_runs where:
--   - the workflow is public
--   - triggered_by IS NOT NULL (real user, not schedule/subflow)
--   - triggered_by != workflow owner (must be a different lenser)
-- Awards XP to the workflow owner (not the runner).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION lenses.fn_xp_on_workflow_run_received()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = lenses, xp, execution, public, extensions
AS $$
DECLARE
  v_owner_lenser_id UUID;
  v_forum_app       CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Only award when a real user triggers a run (not schedule/subflow/system)
  IF NEW.triggered_by IS NULL THEN
    RETURN NEW;
  END IF;

  -- Look up the workflow owner and check visibility in one query
  SELECT w.lenser_id INTO v_owner_lenser_id
  FROM lenses.workflows w
  WHERE w.id = NEW.workflow_id
    AND w.visibility = 'public'
    AND w.lenser_id IS DISTINCT FROM NEW.triggered_by;

  IF v_owner_lenser_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM execution.fn_xp_apply_safe(
    v_owner_lenser_id,
    'WORKFLOW_RUN_RECEIVED',
    'system'::xp.source_enum,
    'workflow_run',
    NEW.id,
    v_forum_app
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'fn_xp_on_workflow_run_received: % (run=%)', SQLERRM, NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS xp_on_workflow_run_received ON lenses.workflow_runs;
CREATE TRIGGER xp_on_workflow_run_received
  AFTER INSERT ON lenses.workflow_runs
  FOR EACH ROW EXECUTE FUNCTION lenses.fn_xp_on_workflow_run_received();

COMMENT ON TRIGGER xp_on_workflow_run_received ON lenses.workflow_runs IS
  'CB-P1a: Awards WORKFLOW_RUN_RECEIVED XP to the workflow owner when another lenser runs their public workflow.';

-- ---------------------------------------------------------------------------
-- P1b: TUTORIAL_COMPLETED / WALKTHROUGH_COMPLETED
--
-- lenses.tutorial_completions — server-side completion record.
-- One row per (lenser_id, tutorial_slug, kind). A trigger fires the XP award
-- on INSERT so the XP path is fully server-side: the client calls
-- fn_mark_tutorial_complete() which writes the row; the trigger mints XP.
--
-- kind: 'tutorial' → TUTORIAL_COMPLETED, 'walkthrough' → WALKTHROUGH_COMPLETED
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lenses.tutorial_completions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lenser_id    UUID        NOT NULL REFERENCES lensers.profiles(id) ON DELETE CASCADE,
  tutorial_slug TEXT       NOT NULL,
  kind         TEXT        NOT NULL DEFAULT 'tutorial'
                           CHECK (kind IN ('tutorial', 'walkthrough')),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tutorial_completions_lenser_slug_kind_unique
    UNIQUE (lenser_id, tutorial_slug, kind)
);

ALTER TABLE lenses.tutorial_completions OWNER TO postgres;

COMMENT ON TABLE lenses.tutorial_completions IS
  'CB-P1b: Server-side record of tutorial/walkthrough completions. The unique constraint ensures one-time XP per (lenser, slug, kind).';

-- RLS: owners can read their own rows; service_role writes via fn_mark_tutorial_complete
ALTER TABLE lenses.tutorial_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tutorial_completions_owner_read"
  ON lenses.tutorial_completions FOR SELECT
  TO authenticated
  USING (lenser_id = lensers.get_auth_lenser_id());

-- Index for per-lenser lookups
CREATE INDEX IF NOT EXISTS idx_tutorial_completions_lenser
  ON lenses.tutorial_completions (lenser_id, kind);

-- Trigger function — fires on INSERT, converts kind to rule key
CREATE OR REPLACE FUNCTION lenses.fn_xp_on_tutorial_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = lenses, xp, execution, public, extensions
AS $$
DECLARE
  v_rule_key  TEXT;
  v_forum_app CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  v_rule_key := CASE NEW.kind
    WHEN 'tutorial'     THEN 'TUTORIAL_COMPLETED'
    WHEN 'walkthrough'  THEN 'WALKTHROUGH_COMPLETED'
    ELSE NULL
  END;

  IF v_rule_key IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM execution.fn_xp_apply_safe(
    NEW.lenser_id,
    v_rule_key,
    'system'::xp.source_enum,
    'tutorial_completion',
    NEW.id,
    v_forum_app
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'fn_xp_on_tutorial_completed: % (completion=%)', SQLERRM, NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS xp_on_tutorial_completed ON lenses.tutorial_completions;
CREATE TRIGGER xp_on_tutorial_completed
  AFTER INSERT ON lenses.tutorial_completions
  FOR EACH ROW EXECUTE FUNCTION lenses.fn_xp_on_tutorial_completed();

COMMENT ON TRIGGER xp_on_tutorial_completed ON lenses.tutorial_completions IS
  'CB-P1b: Awards TUTORIAL_COMPLETED or WALKTHROUGH_COMPLETED XP on server-side insert.';

-- RPC callable by authenticated users to mark a tutorial/walkthrough done.
-- The unique constraint makes this idempotent — duplicate calls are silently
-- ignored (ON CONFLICT DO NOTHING), so callers never need to check first.
CREATE OR REPLACE FUNCTION public.fn_mark_tutorial_complete(
  p_tutorial_slug TEXT,
  p_kind          TEXT DEFAULT 'tutorial'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = lenses, lensers, xp, public, extensions
AS $$
DECLARE
  v_lenser_id UUID;
  v_row_id    UUID;
  v_inserted  BOOLEAN := false;
BEGIN
  IF p_kind NOT IN ('tutorial', 'walkthrough') THEN
    RAISE EXCEPTION 'invalid_kind'
      USING ERRCODE = '22023',
            DETAIL  = 'kind must be ''tutorial'' or ''walkthrough''',
            HINT    = 'invalid_kind';
  END IF;

  v_lenser_id := lensers.get_auth_lenser_id();
  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'permission_denied'
      USING ERRCODE = '42501',
            DETAIL  = 'Must be authenticated.',
            HINT    = 'permission_denied';
  END IF;

  INSERT INTO lenses.tutorial_completions (lenser_id, tutorial_slug, kind)
  VALUES (v_lenser_id, p_tutorial_slug, p_kind)
  ON CONFLICT (lenser_id, tutorial_slug, kind) DO NOTHING
  RETURNING id INTO v_row_id;

  v_inserted := v_row_id IS NOT NULL;

  RETURN jsonb_build_object(
    'inserted',       v_inserted,
    'tutorial_slug',  p_tutorial_slug,
    'kind',           p_kind
  );
END;
$$;

COMMENT ON FUNCTION public.fn_mark_tutorial_complete IS
  'CB-P1b: Marks a tutorial or walkthrough as complete for the calling lenser. Idempotent. Fires XP award trigger on first completion. SECURITY DEFINER.';

GRANT EXECUTE ON FUNCTION public.fn_mark_tutorial_complete(text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- P2: Season is_active auto-flip via pg_cron
--
-- fn_xp_auto_activate_seasons — idempotent, advisory-locked function that:
--   1. Deactivates seasons whose ends_at has passed.
--   2. Activates seasons whose starts_at has passed and ends_at has not (per app).
--      Only activates if no season is currently active for that app, to respect
--      the no-overlap exclusion constraint.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION xp.fn_xp_auto_activate_seasons()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = xp, public
AS $$
DECLARE
  v_deactivated INT := 0;
  v_activated   INT := 0;
BEGIN
  -- 1. Deactivate expired seasons
  UPDATE xp.seasons
  SET is_active = false
  WHERE is_active = true
    AND ends_at IS NOT NULL
    AND ends_at < now();
  GET DIAGNOSTICS v_deactivated = ROW_COUNT;

  -- 2. Activate seasons that should now be running (starts_at passed, not ended,
  --    and no currently-active season exists for that app).
  --    Process one candidate per app at a time (oldest starts_at first) to avoid
  --    violating the no-overlap exclusion constraint.
  WITH candidates AS (
    SELECT
      s.id,
      s.app_id,
      ROW_NUMBER() OVER (PARTITION BY s.app_id ORDER BY s.starts_at) AS rn
    FROM xp.seasons s
    WHERE s.is_active = false
      AND s.starts_at <= now()
      AND (s.ends_at IS NULL OR s.ends_at > now())
      AND NOT EXISTS (
        SELECT 1 FROM xp.seasons a
        WHERE a.app_id   = s.app_id
          AND a.is_active = true
      )
  )
  UPDATE xp.seasons s
  SET is_active = true
  FROM candidates c
  WHERE c.id = s.id
    AND c.rn = 1;
  GET DIAGNOSTICS v_activated = ROW_COUNT;

  IF v_deactivated > 0 OR v_activated > 0 THEN
    RAISE NOTICE 'fn_xp_auto_activate_seasons: deactivated=%, activated=%', v_deactivated, v_activated;
  END IF;
END;
$$;

COMMENT ON FUNCTION xp.fn_xp_auto_activate_seasons IS
  'CB-P2: Deactivates expired seasons and activates ready ones. Called by pg_cron. Idempotent and advisory-locked via automation.fn_run_with_lock.';

-- Safe wrapper (advisory-locked) for the pg_cron schedule
CREATE OR REPLACE FUNCTION xp.fn_xp_auto_activate_seasons_safe()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = xp, automation, public
AS $$
BEGIN
  PERFORM automation.fn_run_with_lock(
    'xp-auto-activate-seasons',
    'SELECT xp.fn_xp_auto_activate_seasons()'
  );
END;
$$;

COMMENT ON FUNCTION xp.fn_xp_auto_activate_seasons_safe IS
  'CB-P2: Advisory-lock wrapper for fn_xp_auto_activate_seasons. Called by pg_cron every hour.';

GRANT EXECUTE ON FUNCTION xp.fn_xp_auto_activate_seasons      TO service_role;
GRANT EXECUTE ON FUNCTION xp.fn_xp_auto_activate_seasons_safe TO service_role;

-- Register pg_cron job — runs hourly, advisory-locked via _safe wrapper
SELECT cron.unschedule(jobid)
FROM   cron.job
WHERE  jobname = 'xp-auto-activate-seasons';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'xp' AND p.proname = 'fn_xp_auto_activate_seasons_safe'
  ) THEN
    PERFORM cron.schedule(
      'xp-auto-activate-seasons',
      '0 * * * *',
      'SELECT xp.fn_xp_auto_activate_seasons_safe()'
    );
  END IF;
END $$;
