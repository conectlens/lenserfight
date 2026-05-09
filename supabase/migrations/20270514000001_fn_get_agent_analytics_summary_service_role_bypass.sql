-- =============================================================================
-- Analytics RPC: allow service_role (JWT) to read aggregate summaries
-- =============================================================================
-- PostgREST / Edge callers using the service-role key carry
-- request.jwt.claim.role = 'service_role'. They must bypass the human-owner
-- check while remaining subject to GRANT EXECUTE (not granted to anon).
-- Local pgTAP can simulate the same claim via set_config.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fn_get_agent_analytics_summary(
  p_ai_lenser_id uuid,
  p_days         integer DEFAULT 30,
  p_model_key    text    DEFAULT NULL,
  p_workflow_id  uuid    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, analytics, agents, lenses
AS $$
DECLARE
  v_cost_by_model    jsonb;
  v_cost_time_series jsonb;
  v_eval_quality     jsonb;
  v_workflow_perf    jsonb;
  v_jwt_role text := coalesce(nullif(trim(both from current_setting('request.jwt.claim.role', true)), ''), '');
BEGIN
  -- Ownership guard: human owners pass agents.can_manage_ai_lenser.
  -- Service-role JWT (platform / trusted workers) may read any agent aggregates.
  IF NOT agents.can_manage_ai_lenser(p_ai_lenser_id) THEN
    IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
      RAISE EXCEPTION 'Insufficient privilege'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT jsonb_agg(row_to_json(t)) INTO v_cost_by_model
  FROM (
    SELECT
      model_key,
      provider,
      SUM(total_credits)    AS total_credits,
      SUM(total_tokens_in)  AS total_tokens_in,
      SUM(total_tokens_out) AS total_tokens_out,
      SUM(run_count)        AS run_count
    FROM analytics.agent_cost_daily
    WHERE ai_lenser_id = p_ai_lenser_id
      AND period_date  >= CURRENT_DATE - p_days
      AND (p_model_key IS NULL OR model_key = p_model_key)
    GROUP BY model_key, provider
    ORDER BY SUM(total_credits) DESC
  ) t;

  SELECT jsonb_agg(row_to_json(t)) INTO v_cost_time_series
  FROM (
    SELECT
      period_date,
      SUM(total_credits) AS total_credits
    FROM analytics.agent_cost_daily
    WHERE ai_lenser_id = p_ai_lenser_id
      AND period_date  >= CURRENT_DATE - p_days
      AND (p_model_key IS NULL OR model_key = p_model_key)
    GROUP BY period_date
    ORDER BY period_date
  ) t;

  SELECT jsonb_agg(row_to_json(t)) INTO v_eval_quality
  FROM (
    SELECT
      eqd.period_date,
      e.name                                            AS evaluation_name,
      eqd.pass_count::float / NULLIF(eqd.run_count, 0) AS pass_rate,
      eqd.mean_score
    FROM analytics.eval_quality_daily eqd
    JOIN agents.evaluations e ON e.id = eqd.evaluation_id
    WHERE eqd.ai_lenser_id = p_ai_lenser_id
      AND eqd.period_date  >= CURRENT_DATE - p_days
    ORDER BY eqd.period_date
  ) t;

  SELECT jsonb_agg(row_to_json(t)) INTO v_workflow_perf
  FROM (
    SELECT
      wpd.period_date,
      wf.title                                              AS workflow_title,
      wpd.p50_duration_ms,
      wpd.p95_duration_ms,
      wpd.failed_count::float / NULLIF(wpd.run_count, 0)   AS failure_rate
    FROM analytics.workflow_perf_daily wpd
    JOIN lenses.workflows wf ON wf.id = wpd.workflow_id
    WHERE wpd.ai_lenser_id = p_ai_lenser_id
      AND wpd.period_date  >= CURRENT_DATE - p_days
      AND (p_workflow_id IS NULL OR wpd.workflow_id = p_workflow_id)
    ORDER BY wpd.period_date
  ) t;

  RETURN jsonb_build_object(
    'cost_by_model',    COALESCE(v_cost_by_model,    '[]'::jsonb),
    'cost_time_series', COALESCE(v_cost_time_series, '[]'::jsonb),
    'eval_quality',     COALESCE(v_eval_quality,     '[]'::jsonb),
    'workflow_perf',    COALESCE(v_workflow_perf,    '[]'::jsonb)
  );
END;
$$;

ALTER FUNCTION public.fn_get_agent_analytics_summary(uuid, integer, text, uuid) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.fn_get_agent_analytics_summary(uuid, integer, text, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_get_agent_analytics_summary(uuid, integer, text, uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_get_agent_analytics_summary(uuid, integer, text, uuid) IS
  'Owner-only analytics summary for an AI lenser (human owners via agents.can_manage_ai_lenser). '
  'Callers with request.jwt.claim.role = service_role may read aggregates for any agent (platform / trusted workers). '
  'Returns cost_by_model, cost_time_series, eval_quality, and workflow_perf aggregated over the last p_days days. '
  'Optional p_model_key and p_workflow_id narrow cost and workflow results. '
  'Reads only from analytics.* pre-aggregated tables; never touches raw logs.';
