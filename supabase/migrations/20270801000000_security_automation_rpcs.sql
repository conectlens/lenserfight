-- Security hardening: public SECURITY DEFINER wrappers for automation schema.
--
-- Removes the need to expose `automation` schema via PostgREST.
-- Clients call these public RPCs instead of accessing automation.* tables directly.
--
-- Auth: automation.trigger_rules.lenser_id = auth.uid() (stores raw auth UID,
-- not a lenser profile id — matches the existing RLS policies in this schema).

-- ─── 1. fn_list_automation_rules ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_list_automation_rules(
  p_limit  integer     DEFAULT 100,
  p_cursor timestamptz DEFAULT NULL
)
RETURNS TABLE(
  id               uuid,
  lenser_id        uuid,
  name             text,
  match_event_type text,
  match_filter     jsonb,
  action_kind      text,
  action_config    jsonb,
  is_active        boolean,
  created_at       timestamptz,
  updated_at       timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'automation'
AS $$
  SELECT
    tr.id,
    tr.lenser_id,
    tr.name,
    tr.match_event_type,
    tr.match_filter,
    tr.action_kind,
    tr.action_config,
    tr.is_active,
    tr.created_at,
    tr.updated_at
  FROM automation.trigger_rules tr
  WHERE tr.lenser_id = auth.uid()
    AND (p_cursor IS NULL OR tr.created_at < p_cursor)
  ORDER BY tr.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 200);
$$;

ALTER FUNCTION public.fn_list_automation_rules(integer, timestamptz) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_list_automation_rules(integer, timestamptz)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_list_automation_rules(integer, timestamptz) IS
  'Security wrapper: list automation trigger rules for the current user. '
  'Keyset-paginated by created_at DESC. Max 200 rows per call.';

-- ─── 2. fn_get_rule_dispatch_summary ─────────────────────────────────────────
-- Replaces client-side aggregation in useRuleDispatchHistory.ts.

CREATE OR REPLACE FUNCTION public.fn_get_rule_dispatch_summary(
  p_days integer DEFAULT 30
)
RETURNS TABLE(
  rule_id           uuid,
  dispatched_count  bigint,
  failed_count      bigint,
  skipped_count     bigint,
  queued_count      bigint,
  last_attempted_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'automation'
AS $$
  SELECT
    ed.rule_id,
    COUNT(*) FILTER (WHERE ed.status = 'dispatched') AS dispatched_count,
    COUNT(*) FILTER (WHERE ed.status = 'failed')     AS failed_count,
    COUNT(*) FILTER (WHERE ed.status = 'skipped')    AS skipped_count,
    COUNT(*) FILTER (WHERE ed.status = 'queued')     AS queued_count,
    MAX(ed.attempted_at)                             AS last_attempted_at
  FROM automation.event_dispatches ed
  JOIN automation.trigger_rules tr ON tr.id = ed.rule_id
  WHERE tr.lenser_id = auth.uid()
    AND ed.attempted_at >= (now() - (COALESCE(p_days, 30) || ' days')::interval)
  GROUP BY ed.rule_id;
$$;

ALTER FUNCTION public.fn_get_rule_dispatch_summary(integer) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_rule_dispatch_summary(integer)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_get_rule_dispatch_summary(integer) IS
  'Security wrapper: aggregate dispatch counts per rule for the current user '
  'over the last p_days days (default 30). Replaces client-side fan-out query.';

-- ─── 3. fn_toggle_automation_rule ────────────────────────────────────────────
-- Returns the updated row so callers can update local cache without re-fetch.

CREATE OR REPLACE FUNCTION public.fn_toggle_automation_rule(
  p_rule_id   uuid,
  p_is_active boolean
)
RETURNS TABLE(
  id               uuid,
  lenser_id        uuid,
  name             text,
  match_event_type text,
  match_filter     jsonb,
  action_kind      text,
  action_config    jsonb,
  is_active        boolean,
  created_at       timestamptz,
  updated_at       timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'automation'
AS $$
  UPDATE automation.trigger_rules
  SET    is_active  = p_is_active,
         updated_at = now()
  WHERE  id        = p_rule_id
    AND  lenser_id = auth.uid()
  RETURNING
    id, lenser_id, name, match_event_type, match_filter,
    action_kind, action_config, is_active, created_at, updated_at;
$$;

ALTER FUNCTION public.fn_toggle_automation_rule(uuid, boolean) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_toggle_automation_rule(uuid, boolean)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_toggle_automation_rule(uuid, boolean) IS
  'Security wrapper: set is_active on a trigger rule owned by the current user. '
  'Returns the updated row. No-ops silently if the rule does not belong to the caller.';

-- ─── 4. fn_delete_automation_rule ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_delete_automation_rule(p_rule_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'automation'
AS $$
  DELETE FROM automation.trigger_rules
  WHERE  id        = p_rule_id
    AND  lenser_id = auth.uid();
$$;

ALTER FUNCTION public.fn_delete_automation_rule(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_delete_automation_rule(uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_delete_automation_rule(uuid) IS
  'Security wrapper: delete a trigger rule owned by the current user. '
  'Silently no-ops if the rule does not belong to the caller.';
