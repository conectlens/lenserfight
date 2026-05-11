-- ─────────────────────────────────────────────────────────────────────────────
-- Phase BA — D11: state machine trigger doesn't permit transitions to/from
-- the `executing` status, which fn_auto_start_battles and
-- fn_complete_battle_execution_job both perform.
--
-- Surfaced by pgTAP 35_automation_lifecycle.sql:
--   WARNING: INVALID_STATUS_TRANSITION: Cannot transition battle from open
--            to executing (battle_id=…)
--
-- Original trigger allowed: draft→open, open→voting, voting→scoring,
-- scoring→closed, closed→published, published→archived. The `executing`
-- state is in the enum but the trigger doesn't reach it, leaving battle
-- automation un-runnable.
--
-- Fix: extend the trigger to allow:
--   open      → executing   (fn_auto_start_battles)
--   open      → voting      (kept: AI-judge-only direct path)
--   executing → voting      (fn_complete_battle_execution_job)
--   executing → archived    (manual cancel during execution)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION battles.trg_enforce_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    v_valid boolean;
BEGIN
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    v_valid := CASE OLD.status::text
        WHEN 'draft'     THEN NEW.status::text IN ('open', 'archived')
        WHEN 'open'      THEN NEW.status::text IN ('executing', 'voting', 'archived')
        WHEN 'executing' THEN NEW.status::text IN ('voting', 'archived')
        WHEN 'voting'    THEN NEW.status::text IN ('scoring', 'archived')
        WHEN 'scoring'   THEN NEW.status::text IN ('closed')
        WHEN 'closed'    THEN NEW.status::text IN ('published')
        WHEN 'published' THEN NEW.status::text IN ('archived')
        WHEN 'archived'  THEN false
        ELSE false
    END;

    IF NOT v_valid THEN
        RAISE EXCEPTION 'INVALID_STATUS_TRANSITION: Cannot transition battle from % to % (battle_id=%)',
            OLD.status, NEW.status, OLD.id;
    END IF;

    RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION battles.trg_enforce_status_transition() IS
  'D11 fix: extends the legal transition map with executing state so '
  'fn_auto_start_battles (open→executing) and fn_complete_battle_execution_job '
  '(executing→voting) succeed. Also adds archived as a safety exit from open, '
  'executing, and voting for manual cancellation.';
