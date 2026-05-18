-- Phase CU (cont.) — Service-role RPCs for edge functions and worker
--
-- 1. fn_worker_get_battle_for_judge
--    The ai-judge-battle edge function previously used direct PostgREST table
--    queries against the battles schema with an invalid '&schema=battles' query
--    parameter. The battles schema is NOT exposed via PostgREST (by design,
--    since migration 20270801000001 locked it down). Direct table access
--    returns empty arrays silently, breaking AI judging.
--    Fix: expose a dedicated service-role-only RPC that returns the exact columns
--    the edge function needs (title, task_prompt, ai_judge_model_key, ai_judge_prompt).
--
-- 2. fn_worker_run_auto_promote_cycle
--    battle-auto-promote-worker.ts used svc.from('battles') which targets
--    public.battles (does not exist — the table is in battles.battles which is
--    not REST-exposed). The query returns zero rows so the worker never promotes
--    any battles. pg_cron already handles auto-promote every 5 min, but the
--    worker provides defense-in-depth and fills sub-minute gaps.
--    Fix: wrap the bulk promote logic in a service-role-only RPC.

-- ─── 1. fn_worker_get_battle_for_judge ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_worker_get_battle_for_judge(p_battle_id uuid)
RETURNS TABLE (
  id                  uuid,
  title               text,
  task_prompt         text,
  ai_judge_model_key  text,
  ai_judge_prompt     text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public', 'battles'
AS $$
  SELECT
    b.id,
    b.title,
    b.task_prompt,
    b.ai_judge_model_key,
    b.ai_judge_prompt
  FROM battles.battles b
  WHERE b.id = p_battle_id
  LIMIT 1;
$$;

ALTER  FUNCTION public.fn_worker_get_battle_for_judge(uuid) OWNER TO postgres;
REVOKE ALL     ON FUNCTION public.fn_worker_get_battle_for_judge(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.fn_worker_get_battle_for_judge(uuid) TO service_role;

COMMENT ON FUNCTION public.fn_worker_get_battle_for_judge(uuid) IS
  'CU: Returns battle fields required by the ai-judge-battle edge function. '
  'service_role only — replaces the invalid direct PostgREST table access '
  'that was silently returning empty results because the battles schema is '
  'not REST-exposed.';

-- ─── 2. fn_worker_run_auto_promote_cycle ─────────────────────────────────────
--
-- Replicates the pg_cron auto-promote sweep as a callable RPC so the Node.js
-- worker can trigger it on its own interval without direct table access.
-- Returns the count of battles successfully promoted draft → open.

CREATE OR REPLACE FUNCTION public.fn_worker_run_auto_promote_cycle()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'battles', 'public'
AS $$
DECLARE
  r         RECORD;
  promoted  integer := 0;
BEGIN
  FOR r IN
    SELECT id
    FROM   battles.battles
    WHERE  status      = 'draft'
      AND  auto_promote = TRUE
  LOOP
    BEGIN
      IF public.fn_battles_auto_promote(r.id) THEN
        promoted := promoted + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'fn_worker_run_auto_promote_cycle: battle % failed: %', r.id, SQLERRM;
    END;
  END LOOP;

  RETURN promoted;
END;
$$;

ALTER  FUNCTION public.fn_worker_run_auto_promote_cycle() OWNER TO postgres;
REVOKE ALL     ON FUNCTION public.fn_worker_run_auto_promote_cycle() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.fn_worker_run_auto_promote_cycle() TO service_role;

COMMENT ON FUNCTION public.fn_worker_run_auto_promote_cycle() IS
  'CU: Wraps the auto-promote sweep for the Node.js worker. Replaces the '
  'direct svc.from(''battles'') query that targeted public.battles (which '
  'does not exist; the table is in battles.battles, not REST-exposed). '
  'Returns the number of battles promoted draft → open this cycle.';
