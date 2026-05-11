-- 20270801000008_security_patch_missing_rpcs.sql
-- Adds public SECURITY DEFINER wrappers for functions that were missing from
-- the initial 8-migration security lockdown (20270801000000–20270801000007).
-- All functions in this file expose non-public schema data via the public schema
-- so PostgREST can route calls without exposing internal schema structure.

-- ─── 1. Battle utility ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_get_latest_draft_battle_by_workflow(
  p_workflow_id uuid
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'battles', 'lensers'
AS $$
  SELECT to_jsonb(b.*)
  FROM battles.battles b
  WHERE b.workflow_id = p_workflow_id
    AND b.status::text = 'draft'
    AND b.creator_lenser_id = lensers.get_auth_lenser_id()
  ORDER BY b.created_at DESC
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.fn_get_latest_draft_battle_by_workflow(uuid) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_battles_link_forum_thread(
  p_battle_id      uuid,
  p_forum_thread_id uuid
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'battles', 'lensers'
AS $$
  UPDATE battles.battles
  SET forum_thread_id = p_forum_thread_id
  WHERE id = p_battle_id
    AND creator_lenser_id = lensers.get_auth_lenser_id();
$$;
GRANT EXECUTE ON FUNCTION public.fn_battles_link_forum_thread(uuid, uuid) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_get_battle_execution_config(
  p_battle_id uuid
)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'battles', 'lensers'
AS $$
  SELECT to_jsonb(ec.*)
  FROM battles.execution_configs ec
  WHERE ec.battle_id = p_battle_id
    AND EXISTS (
      SELECT 1 FROM battles.battles b
      WHERE b.id = ec.battle_id
        AND (b.creator_lenser_id = lensers.get_auth_lenser_id()
             OR b.status::text IN ('published', 'closed'))
    );
$$;
GRANT EXECUTE ON FUNCTION public.fn_get_battle_execution_config(uuid) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_upsert_battle_execution_config(
  p_battle_id      uuid,
  p_contender_id   uuid,
  p_provider_key   text,
  p_model_key      text,
  p_model_id       uuid        DEFAULT NULL,
  p_funding_source text        DEFAULT 'platform_credit',
  p_byok_key_ref_id uuid       DEFAULT NULL,
  p_max_tokens     integer     DEFAULT 4096,
  p_temperature    numeric     DEFAULT 0.70
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'battles', 'lensers'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Ensure caller owns the battle
  IF NOT EXISTS (
    SELECT 1 FROM battles.battles b
    WHERE b.id = p_battle_id
      AND b.creator_lenser_id = lensers.get_auth_lenser_id()
  ) THEN
    RAISE EXCEPTION 'upsert_battle_execution_config_forbidden' USING ERRCODE = '42501';
  END IF;

  INSERT INTO battles.execution_configs
    (battle_id, contender_id, provider_key, model_key, model_id, funding_source,
     byok_key_ref_id, max_tokens, temperature)
  VALUES
    (p_battle_id, p_contender_id, p_provider_key, p_model_key, p_model_id,
     p_funding_source, p_byok_key_ref_id, p_max_tokens, p_temperature)
  ON CONFLICT (battle_id, contender_id)
  DO UPDATE SET
    provider_key   = EXCLUDED.provider_key,
    model_key      = EXCLUDED.model_key,
    model_id       = EXCLUDED.model_id,
    funding_source = EXCLUDED.funding_source,
    byok_key_ref_id = EXCLUDED.byok_key_ref_id,
    max_tokens     = EXCLUDED.max_tokens,
    temperature    = EXCLUDED.temperature,
    updated_at     = now()
  RETURNING to_jsonb(battles.execution_configs.*) INTO v_result;

  RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.fn_upsert_battle_execution_config(uuid, uuid, text, text, uuid, text, uuid, integer, numeric) TO authenticated, service_role;

-- ─── 2. Tournament functions ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_get_tournament_by_slug(p_slug text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'battles'
AS $$
  SELECT to_jsonb(t.*)
  FROM battles.tournaments t
  WHERE t.slug = p_slug
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.fn_get_tournament_by_slug(text) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_list_tournaments(
  p_limit  integer DEFAULT 50,
  p_cursor timestamptz DEFAULT NULL
)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'battles'
AS $$
  SELECT to_jsonb(t.*)
  FROM battles.tournaments t
  WHERE (p_cursor IS NULL OR t.created_at < p_cursor)
  ORDER BY t.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
$$;
GRANT EXECUTE ON FUNCTION public.fn_list_tournaments(integer, timestamptz) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_get_tournament_contenders(p_tournament_id uuid)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'battles'
AS $$
  SELECT to_jsonb(tc.*)
  FROM battles.tournament_contenders tc
  WHERE tc.tournament_id = p_tournament_id
  ORDER BY tc.seed NULLS LAST, tc.created_at;
$$;
GRANT EXECUTE ON FUNCTION public.fn_get_tournament_contenders(uuid) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- fn_advance_tournament is in battles schema; expose via public wrapper.

CREATE OR REPLACE FUNCTION public.fn_advance_tournament(p_match_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'battles', 'lensers'
AS $$
BEGIN
  PERFORM battles.fn_advance_tournament(p_match_id);
END;
$$;
REVOKE ALL ON FUNCTION public.fn_advance_tournament(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_advance_tournament(uuid) TO service_role;

-- ─── 4. Global lenserboard ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_get_global_lenserboard(
  p_limit integer DEFAULT 50
)
RETURNS TABLE(
  lenser_id          uuid,
  handle             text,
  display_name       text,
  avatar_url         text,
  total_wins         bigint,
  total_battles      bigint,
  win_rate           numeric,
  total_votes_received bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'battles', 'lensers', 'reputation'
AS $$
  SELECT
    lp.id                                                                  AS lenser_id,
    lp.handle,
    lp.display_name,
    lp.avatar_url,
    COUNT(c.id) FILTER (WHERE b.winner_contender_id = c.id)               AS total_wins,
    COUNT(c.id)                                                            AS total_battles,
    CASE WHEN COUNT(c.id) > 0
         THEN ROUND(
           COUNT(c.id) FILTER (WHERE b.winner_contender_id = c.id)::numeric
           / COUNT(c.id)::numeric, 4)
         ELSE 0::numeric
    END                                                                    AS win_rate,
    COALESCE(SUM(va.raw_vote_count), 0)                                    AS total_votes_received
  FROM lensers.profiles lp
  JOIN battles.contenders c ON c.contender_ref_id = lp.id
  JOIN battles.battles b
    ON b.id = c.battle_id AND b.status::text IN ('published', 'closed')
  LEFT JOIN battles.vote_aggregates va ON va.contender_id = c.id
  GROUP BY lp.id, lp.handle, lp.display_name, lp.avatar_url
  HAVING COUNT(c.id) > 0
  ORDER BY total_wins DESC, total_battles DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
$$;
GRANT EXECUTE ON FUNCTION public.fn_get_global_lenserboard(integer) TO authenticated, service_role;

-- ─── 5. Contender ratings alias ───────────────────────────────────────────────
-- fn_get_contender_ratings (plural) is called by TypeScript; migration 6
-- created fn_get_contender_rating (singular). Provide plural alias.

CREATE OR REPLACE FUNCTION public.fn_get_contender_ratings(
  p_lenser_id uuid,
  p_limit     integer DEFAULT 20
)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'reputation'
AS $$
  SELECT to_jsonb(r.*)
  FROM public.fn_get_contender_rating(p_lenser_id) r
  LIMIT LEAST(GREATEST(p_limit, 1), 100);
$$;
GRANT EXECUTE ON FUNCTION public.fn_get_contender_ratings(uuid, integer) TO authenticated, service_role;

-- ─── 6. Battle DLQ wrappers (service_role only) ───────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_retry_dead_letter_battle_job(p_dead_letter_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'battles'
AS $$
BEGIN
  PERFORM battles.fn_retry_dead_letter_battle_job(p_dead_letter_id);
END;
$$;
REVOKE ALL ON FUNCTION public.fn_retry_dead_letter_battle_job(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_retry_dead_letter_battle_job(uuid) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_requeue_battle_job_with_backoff(
  p_job_id     uuid,
  p_backoff_ms integer,
  p_error      text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'battles'
AS $$
BEGIN
  PERFORM battles.fn_requeue_battle_job_with_backoff(p_job_id, p_backoff_ms, p_error);
END;
$$;
REVOKE ALL ON FUNCTION public.fn_requeue_battle_job_with_backoff(uuid, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_requeue_battle_job_with_backoff(uuid, integer, text) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_move_battle_job_to_dlq(
  p_job_id    uuid,
  p_error_code text DEFAULT NULL,
  p_error_msg  text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'battles'
AS $$
DECLARE
  v_dlq_id uuid;
BEGIN
  SELECT battles.fn_move_battle_job_to_dlq(p_job_id, p_error_code, p_error_msg)
  INTO v_dlq_id;
  RETURN v_dlq_id;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_move_battle_job_to_dlq(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_move_battle_job_to_dlq(uuid, text, text) TO service_role;

-- ─── 7. AI judge verdicts public wrapper ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_get_ai_judge_verdicts(p_battle_id uuid)
RETURNS TABLE(
  id           uuid,
  contender_id uuid,
  criterion_id uuid,
  score        numeric,
  rationale    text,
  model_key    text,
  run_id       uuid,
  created_at   timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'battles'
AS $$
  SELECT id, contender_id, criterion_id, score, rationale, model_key, run_id, created_at
  FROM battles.fn_get_ai_judge_verdicts(p_battle_id);
$$;
GRANT EXECUTE ON FUNCTION public.fn_get_ai_judge_verdicts(uuid) TO authenticated, service_role;

-- ─── 8. DLQ counts + templates recurrence ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_get_dlq_counts()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'battles', 'lenses'
AS $$
  SELECT jsonb_build_object(
    'battle_dlq_count',
    (SELECT COUNT(*) FROM battles.battle_execution_dead_letters WHERE resolved_at IS NULL),
    'workflow_dlq_count',
    (SELECT COUNT(*) FROM lenses.workflow_run_dead_letters WHERE resolved_at IS NULL)
  );
$$;
REVOKE ALL ON FUNCTION public.fn_get_dlq_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_get_dlq_counts() TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_templates_set_recurrence(
  p_template_id             uuid,
  p_recurrence_rule         text,
  p_next_run_at             timestamptz DEFAULT NULL,
  p_auto_start_delay_hours  integer     DEFAULT 1
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'battles', 'lensers'
AS $$
  UPDATE battles.templates
  SET recurrence_rule = p_recurrence_rule,
      next_run_at     = COALESCE(p_next_run_at, now())
  WHERE id = p_template_id
    AND creator_lenser_id = lensers.get_auth_lenser_id();
$$;
GRANT EXECUTE ON FUNCTION public.fn_templates_set_recurrence(uuid, text, timestamptz, integer) TO authenticated, service_role;

-- ─── 9. Team run: claim + status update ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_worker_claim_team_run()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'agents'
AS $$
DECLARE
  v_run jsonb;
BEGIN
  UPDATE agents.team_runs
  SET status     = 'running',
      started_at = COALESCE(started_at, now()),
      updated_at = now()
  WHERE id = (
    SELECT id FROM agents.team_runs
    WHERE status = 'pending'
    ORDER BY created_at
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING to_jsonb(agents.team_runs.*) INTO v_run;

  RETURN v_run;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_worker_claim_team_run() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_worker_claim_team_run() TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- fn_worker_update_team_run_status is an alias for fn_worker_update_team_run
-- (same signature and semantics).

CREATE OR REPLACE FUNCTION public.fn_worker_update_team_run_status(
  p_team_run_id  uuid,
  p_status       text,
  p_completed_at timestamptz DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'agents'
AS $$
  SELECT public.fn_worker_update_team_run(p_team_run_id, p_status, p_completed_at);
$$;
REVOKE ALL ON FUNCTION public.fn_worker_update_team_run_status(uuid, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_worker_update_team_run_status(uuid, text, timestamptz) TO service_role;

-- ─── 10. Workflow phases + tasks CRUD ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_list_workflow_phases(p_workflow_id uuid)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'lenses', 'lensers'
AS $$
  SELECT to_jsonb(wp.*)
  FROM lenses.workflow_phases wp
  JOIN lenses.workflows w ON w.id = wp.workflow_id
  WHERE wp.workflow_id = p_workflow_id
    AND w.lenser_id = lensers.get_auth_lenser_id()
  ORDER BY wp.ordinal, wp.created_at;
$$;
GRANT EXECUTE ON FUNCTION public.fn_list_workflow_phases(uuid) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_upsert_workflow_phase(
  p_workflow_id  uuid,
  p_title        text,
  p_description  text        DEFAULT NULL,
  p_ordinal      integer     DEFAULT 0,
  p_id           uuid        DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'lenses', 'lensers'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM lenses.workflows w
    WHERE w.id = p_workflow_id AND w.lenser_id = lensers.get_auth_lenser_id()
  ) THEN
    RAISE EXCEPTION 'upsert_workflow_phase_forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_id IS NOT NULL THEN
    UPDATE lenses.workflow_phases
    SET title = p_title, description = p_description, ordinal = p_ordinal, updated_at = now()
    WHERE id = p_id AND workflow_id = p_workflow_id
    RETURNING to_jsonb(lenses.workflow_phases.*) INTO v_result;
  END IF;

  IF v_result IS NULL THEN
    INSERT INTO lenses.workflow_phases (workflow_id, title, description, ordinal)
    VALUES (p_workflow_id, p_title, p_description, p_ordinal)
    RETURNING to_jsonb(lenses.workflow_phases.*) INTO v_result;
  END IF;

  RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.fn_upsert_workflow_phase(uuid, text, text, integer, uuid) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_delete_workflow_phase(p_phase_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'lenses', 'lensers'
AS $$
  DELETE FROM lenses.workflow_phases wp
  USING lenses.workflows w
  WHERE wp.id = p_phase_id
    AND wp.workflow_id = w.id
    AND w.lenser_id = lensers.get_auth_lenser_id();
$$;
GRANT EXECUTE ON FUNCTION public.fn_delete_workflow_phase(uuid) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_list_workflow_tasks(p_phase_id uuid)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'lenses', 'lensers'
AS $$
  SELECT to_jsonb(wt.*)
  FROM lenses.workflow_tasks wt
  JOIN lenses.workflows w ON w.id = wt.workflow_id
  WHERE wt.phase_id = p_phase_id
    AND w.lenser_id = lensers.get_auth_lenser_id()
  ORDER BY wt.ordinal, wt.created_at;
$$;
GRANT EXECUTE ON FUNCTION public.fn_list_workflow_tasks(uuid) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_upsert_workflow_task(
  p_phase_id    uuid,
  p_workflow_id uuid,
  p_title       text,
  p_prompt_text text     DEFAULT NULL,
  p_output_type text     DEFAULT 'text',
  p_model_hint  text     DEFAULT NULL,
  p_ordinal     integer  DEFAULT 0,
  p_id          uuid     DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'lenses', 'lensers'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM lenses.workflows w
    WHERE w.id = p_workflow_id AND w.lenser_id = lensers.get_auth_lenser_id()
  ) THEN
    RAISE EXCEPTION 'upsert_workflow_task_forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_id IS NOT NULL THEN
    UPDATE lenses.workflow_tasks
    SET title = p_title, prompt_text = p_prompt_text, output_type = p_output_type,
        model_hint = p_model_hint, ordinal = p_ordinal, updated_at = now()
    WHERE id = p_id AND phase_id = p_phase_id
    RETURNING to_jsonb(lenses.workflow_tasks.*) INTO v_result;
  END IF;

  IF v_result IS NULL THEN
    INSERT INTO lenses.workflow_tasks
      (phase_id, workflow_id, title, prompt_text, output_type, model_hint, ordinal)
    VALUES (p_phase_id, p_workflow_id, p_title, p_prompt_text, p_output_type, p_model_hint, p_ordinal)
    RETURNING to_jsonb(lenses.workflow_tasks.*) INTO v_result;
  END IF;

  RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.fn_upsert_workflow_task(uuid, uuid, text, text, text, text, integer, uuid) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_delete_workflow_task(p_task_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'lenses', 'lensers'
AS $$
  DELETE FROM lenses.workflow_tasks wt
  USING lenses.workflows w
  WHERE wt.id = p_task_id
    AND wt.workflow_id = w.id
    AND w.lenser_id = lensers.get_auth_lenser_id();
$$;
GRANT EXECUTE ON FUNCTION public.fn_delete_workflow_task(uuid) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Reorder phases: batch update ordinals

CREATE OR REPLACE FUNCTION public.fn_reorder_workflow_phases(
  p_workflow_id uuid,
  p_ordered_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'lenses', 'lensers'
AS $$
DECLARE
  v_id   uuid;
  v_idx  integer := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM lenses.workflows w
    WHERE w.id = p_workflow_id AND w.lenser_id = lensers.get_auth_lenser_id()
  ) THEN
    RAISE EXCEPTION 'reorder_phases_forbidden' USING ERRCODE = '42501';
  END IF;

  FOREACH v_id IN ARRAY p_ordered_ids LOOP
    UPDATE lenses.workflow_phases SET ordinal = v_idx WHERE id = v_id AND workflow_id = p_workflow_id;
    v_idx := v_idx + 1;
  END LOOP;
END;
$$;
GRANT EXECUTE ON FUNCTION public.fn_reorder_workflow_phases(uuid, uuid[]) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Reorder tasks: batch update ordinals

CREATE OR REPLACE FUNCTION public.fn_reorder_workflow_tasks(
  p_phase_id    uuid,
  p_ordered_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'lenses', 'lensers'
AS $$
DECLARE
  v_id   uuid;
  v_idx  integer := 0;
BEGIN
  -- Verify ownership via phase → workflow
  IF NOT EXISTS (
    SELECT 1 FROM lenses.workflow_phases wp
    JOIN lenses.workflows w ON w.id = wp.workflow_id
    WHERE wp.id = p_phase_id AND w.lenser_id = lensers.get_auth_lenser_id()
  ) THEN
    RAISE EXCEPTION 'reorder_tasks_forbidden' USING ERRCODE = '42501';
  END IF;

  FOREACH v_id IN ARRAY p_ordered_ids LOOP
    UPDATE lenses.workflow_tasks SET ordinal = v_idx WHERE id = v_id AND phase_id = p_phase_id;
    v_idx := v_idx + 1;
  END LOOP;
END;
$$;
GRANT EXECUTE ON FUNCTION public.fn_reorder_workflow_tasks(uuid, uuid[]) TO authenticated, service_role;

-- ─── 11. Run reports + incidents ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_get_run_report(p_report_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
  SELECT to_jsonb(rr.*)
  FROM agents.run_reports rr
  WHERE rr.id = p_report_id
    AND (
      rr.ai_lenser_id IN (
        SELECT o.ai_lenser_id FROM agents.ownerships o
        WHERE o.owner_lenser_id = lensers.get_auth_lenser_id()
          AND o.revoked_at IS NULL
      )
      OR public.fn_is_super_admin()
    )
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.fn_get_run_report(uuid) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_list_run_incidents(
  p_run_report_id uuid,
  p_severity      text    DEFAULT NULL,
  p_resolved      boolean DEFAULT NULL,
  p_limit         integer DEFAULT 100
)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
  SELECT to_jsonb(ri.*)
  FROM agents.run_incidents ri
  JOIN agents.run_reports rr ON rr.id = ri.run_report_id
  WHERE ri.run_report_id = p_run_report_id
    AND (p_severity IS NULL OR ri.severity::text = p_severity)
    AND (p_resolved IS NULL
         OR (p_resolved = true AND ri.resolved_at IS NOT NULL)
         OR (p_resolved = false AND ri.resolved_at IS NULL))
    AND (
      rr.ai_lenser_id IN (
        SELECT o.ai_lenser_id FROM agents.ownerships o
        WHERE o.owner_lenser_id = lensers.get_auth_lenser_id()
          AND o.revoked_at IS NULL
      )
      OR public.fn_is_super_admin()
    )
  ORDER BY ri.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500);
$$;
GRANT EXECUTE ON FUNCTION public.fn_list_run_incidents(uuid, text, boolean, integer) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_resolve_run_incident(
  p_incident_id uuid,
  p_resolution  text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
  UPDATE agents.run_incidents ri
  SET resolved_at = now(), resolution = p_resolution
  FROM agents.run_reports rr
  WHERE ri.id = p_incident_id
    AND ri.run_report_id = rr.id
    AND rr.ai_lenser_id IN (
      SELECT o.ai_lenser_id FROM agents.ownerships o
      WHERE o.owner_lenser_id = lensers.get_auth_lenser_id()
        AND o.revoked_at IS NULL
    );
$$;
GRANT EXECUTE ON FUNCTION public.fn_resolve_run_incident(uuid, text) TO authenticated, service_role;

-- ─── 12. Agent workspace list helpers ────────────────────────────────────────
-- These complement fn_create_workspace_record / fn_upsert_workspace_item
-- for read operations not covered by migration 2.

CREATE OR REPLACE FUNCTION public.fn_list_memory_profiles(p_ai_lenser_id uuid)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
  SELECT to_jsonb(mp.*)
  FROM agents.memory_profiles mp
  WHERE mp.ai_lenser_id = p_ai_lenser_id
    AND (
      p_ai_lenser_id IN (
        SELECT o.ai_lenser_id FROM agents.ownerships o
        WHERE o.owner_lenser_id = lensers.get_auth_lenser_id() AND o.revoked_at IS NULL
      )
      OR public.fn_is_super_admin()
    )
  ORDER BY mp.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.fn_list_memory_profiles(uuid) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_list_personality_profiles(p_ai_lenser_id uuid)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
  SELECT to_jsonb(pp.*)
  FROM agents.personality_profiles pp
  WHERE pp.ai_lenser_id = p_ai_lenser_id
    AND (
      p_ai_lenser_id IN (
        SELECT o.ai_lenser_id FROM agents.ownerships o
        WHERE o.owner_lenser_id = lensers.get_auth_lenser_id() AND o.revoked_at IS NULL
      )
      OR public.fn_is_super_admin()
    )
  ORDER BY pp.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.fn_list_personality_profiles(uuid) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_list_tool_profiles(p_ai_lenser_id uuid)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
  SELECT to_jsonb(tp.*)
  FROM agents.tool_profiles tp
  WHERE tp.ai_lenser_id = p_ai_lenser_id
    AND (
      p_ai_lenser_id IN (
        SELECT o.ai_lenser_id FROM agents.ownerships o
        WHERE o.owner_lenser_id = lensers.get_auth_lenser_id() AND o.revoked_at IS NULL
      )
      OR public.fn_is_super_admin()
    )
  ORDER BY tp.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.fn_list_tool_profiles(uuid) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_list_model_profiles(p_ai_lenser_id uuid)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
  SELECT to_jsonb(mop.*)
  FROM agents.model_profiles mop
  WHERE mop.ai_lenser_id = p_ai_lenser_id
    AND (
      p_ai_lenser_id IN (
        SELECT o.ai_lenser_id FROM agents.ownerships o
        WHERE o.owner_lenser_id = lensers.get_auth_lenser_id() AND o.revoked_at IS NULL
      )
      OR public.fn_is_super_admin()
    )
  ORDER BY mop.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.fn_list_model_profiles(uuid) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_upsert_agent_run_step(
  p_team_run_id          uuid,
  p_workflow_node_id     uuid,
  p_lane                 integer,
  p_title                text,
  p_status               text,
  p_current_task         text       DEFAULT NULL,
  p_recent_output_summary text      DEFAULT NULL,
  p_blocker_summary      text       DEFAULT NULL,
  p_started_at           timestamptz DEFAULT NULL,
  p_completed_at         timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'agents'
AS $$
DECLARE
  v_existing_id uuid;
  v_result      jsonb;
BEGIN
  SELECT id INTO v_existing_id
  FROM agents.agent_run_steps
  WHERE team_run_id = p_team_run_id AND workflow_node_id = p_workflow_node_id
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE agents.agent_run_steps
    SET status                = p_status,
        title                 = p_title,
        current_task          = COALESCE(p_current_task, current_task),
        recent_output_summary = COALESCE(p_recent_output_summary, recent_output_summary),
        blocker_summary       = COALESCE(p_blocker_summary, blocker_summary),
        completed_at          = COALESCE(p_completed_at, completed_at),
        updated_at            = now()
    WHERE id = v_existing_id
    RETURNING to_jsonb(agents.agent_run_steps.*) INTO v_result;
  ELSE
    INSERT INTO agents.agent_run_steps
      (team_run_id, workflow_node_id, lane, title, status,
       current_task, recent_output_summary, blocker_summary,
       started_at, completed_at)
    VALUES
      (p_team_run_id, p_workflow_node_id, p_lane, p_title, p_status,
       p_current_task, p_recent_output_summary, p_blocker_summary,
       COALESCE(p_started_at, now()), p_completed_at)
    RETURNING to_jsonb(agents.agent_run_steps.*) INTO v_result;
  END IF;

  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_upsert_agent_run_step(uuid, uuid, integer, text, text, text, text, text, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_upsert_agent_run_step(uuid, uuid, integer, text, text, text, text, text, timestamptz, timestamptz) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_create_team_run(
  p_ai_lenser_id          uuid,
  p_workflow_id           uuid        DEFAULT NULL,
  p_workflow_run_id       uuid        DEFAULT NULL,
  p_workflow_assignment_id uuid       DEFAULT NULL,
  p_team_id               uuid        DEFAULT NULL,
  p_approval_status       text        DEFAULT 'pending'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'agents'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  INSERT INTO agents.team_runs
    (ai_lenser_id, workflow_id, workflow_run_id, workflow_assignment_id,
     team_id, status, approval_status, started_at)
  VALUES
    (p_ai_lenser_id, p_workflow_id, p_workflow_run_id, p_workflow_assignment_id,
     p_team_id, 'running', p_approval_status, now())
  RETURNING to_jsonb(agents.team_runs.*) INTO v_result;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_create_team_run(uuid, uuid, uuid, uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_create_team_run(uuid, uuid, uuid, uuid, uuid, text) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_update_team_run_status(
  p_team_run_id  uuid,
  p_status       text,
  p_completed_at timestamptz DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'agents'
AS $$
  SELECT public.fn_worker_update_team_run(p_team_run_id, p_status, p_completed_at);
$$;
GRANT EXECUTE ON FUNCTION public.fn_update_team_run_status(uuid, text, timestamptz) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_append_team_run_event(
  p_team_run_id uuid,
  p_event_type  text,
  p_payload     jsonb
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'agents'
AS $$
  INSERT INTO agents.agent_run_events (team_run_id, event_type, payload, occurred_at)
  VALUES (p_team_run_id, p_event_type, p_payload, now());
$$;
REVOKE ALL ON FUNCTION public.fn_append_team_run_event(uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_append_team_run_event(uuid, text, jsonb) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_create_evaluation_rubric(
  p_evaluation_id uuid,
  p_criteria      jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
DECLARE
  v_next_version integer;
  v_result       jsonb;
BEGIN
  -- Mark existing rubrics as not current
  UPDATE agents.evaluation_rubrics
  SET is_current = false
  WHERE evaluation_id = p_evaluation_id;

  -- Get next version
  SELECT COALESCE(MAX(version), 0) + 1 INTO v_next_version
  FROM agents.evaluation_rubrics
  WHERE evaluation_id = p_evaluation_id;

  INSERT INTO agents.evaluation_rubrics (evaluation_id, version, criteria, is_current)
  VALUES (p_evaluation_id, v_next_version, p_criteria, true)
  RETURNING to_jsonb(agents.evaluation_rubrics.*) INTO v_result;

  RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.fn_create_evaluation_rubric(uuid, jsonb) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_set_evaluation_baseline(
  p_evaluation_id uuid,
  p_run_id        uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'agents'
AS $$
DECLARE
  v_score  numeric;
  v_result jsonb;
BEGIN
  SELECT score INTO v_score FROM agents.evaluation_runs WHERE id = p_run_id;

  INSERT INTO agents.evaluation_baselines (evaluation_id, run_id, score)
  VALUES (p_evaluation_id, p_run_id, v_score)
  ON CONFLICT (evaluation_id)
  DO UPDATE SET run_id = EXCLUDED.run_id, score = EXCLUDED.score
  RETURNING to_jsonb(agents.evaluation_baselines.*) INTO v_result;

  RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.fn_set_evaluation_baseline(uuid, uuid) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_create_evaluation_with_cases(
  p_owner_lenser_id uuid,
  p_ai_lenser_id    uuid,
  p_target_type     text,
  p_target_id       uuid,
  p_name            text,
  p_description     text  DEFAULT NULL,
  p_scoring_rules   jsonb DEFAULT '{}',
  p_dataset_uri     text  DEFAULT NULL,
  p_cases           jsonb DEFAULT '[]'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'agents'
AS $$
DECLARE
  v_eval_id uuid;
  v_case    jsonb;
  v_result  jsonb;
BEGIN
  INSERT INTO agents.evaluations
    (owner_lenser_id, ai_lenser_id, target_type, target_id, name, description, scoring_rules, dataset_uri)
  VALUES
    (p_owner_lenser_id, p_ai_lenser_id, p_target_type, p_target_id, p_name, p_description,
     COALESCE(p_scoring_rules, '{}'), p_dataset_uri)
  RETURNING id, to_jsonb(agents.evaluations.*) INTO v_eval_id, v_result;

  IF jsonb_array_length(COALESCE(p_cases, '[]'::jsonb)) > 0 THEN
    FOR v_case IN SELECT * FROM jsonb_array_elements(p_cases) LOOP
      INSERT INTO agents.evaluation_cases
        (evaluation_id, input, expected, weight, tags)
      VALUES (
        v_eval_id,
        v_case->'input',
        v_case->'expected',
        COALESCE((v_case->>'weight')::integer, 1),
        COALESCE(ARRAY(SELECT jsonb_array_elements_text(v_case->'tags')), '{}')
      );
    END LOOP;
  END IF;

  RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.fn_create_evaluation_with_cases(uuid, uuid, text, uuid, text, text, jsonb, text, jsonb) TO authenticated, service_role;

-- ─── Workflow tasks by workflow (for listTasksByWorkflow) ─────────────────────

CREATE OR REPLACE FUNCTION public.fn_list_workflow_tasks_by_workflow(p_workflow_id uuid)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'lenses', 'lensers'
AS $$
  SELECT to_jsonb(wt.*)
  FROM lenses.workflow_tasks wt
  JOIN lenses.workflows w ON w.id = wt.workflow_id
  WHERE wt.workflow_id = p_workflow_id
    AND w.lenser_id = lensers.get_auth_lenser_id()
  ORDER BY wt.ordinal, wt.created_at;
$$;
GRANT EXECUTE ON FUNCTION public.fn_list_workflow_tasks_by_workflow(uuid) TO authenticated, service_role;
