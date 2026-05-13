-- Migration: add fn_list_agent_incidents and fn_list_policy_evaluations
-- Both functions were called by the frontend but never defined.
-- fn_list_agent_incidents: lists run_incidents for a given ai_lenser_id (overview + reports).
-- fn_list_policy_evaluations: lists policy_evaluations for a given ai_lenser_id (approvals + overview deny log).

-- ─── fn_list_agent_incidents ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION "public"."fn_list_agent_incidents"(
  "p_ai_lenser_id" "uuid",
  "p_limit"        integer                     DEFAULT 20,
  "p_cursor"       timestamp with time zone    DEFAULT NULL::timestamp with time zone
)
RETURNS SETOF "jsonb"
LANGUAGE "sql"
STABLE
SECURITY DEFINER
SET "search_path" TO 'public', 'agents', 'lensers'
AS $$
  SELECT to_jsonb(ri.*)
  FROM   agents.run_incidents ri
  WHERE  ri.ai_lenser_id = p_ai_lenser_id
    AND  (p_cursor IS NULL OR ri.created_at < p_cursor)
    AND  (
           agents.can_manage_ai_lenser(p_ai_lenser_id)
           OR public.fn_is_super_admin()
         )
  ORDER BY ri.created_at DESC
  LIMIT  LEAST(GREATEST(COALESCE(p_limit, 20), 1), 200);
$$;

ALTER FUNCTION "public"."fn_list_agent_incidents"(
  "uuid", integer, timestamp with time zone
) OWNER TO "postgres";

COMMENT ON FUNCTION "public"."fn_list_agent_incidents"(
  "uuid", integer, timestamp with time zone
) IS 'Keyset-paginated list of run_incidents for an AI lenser. Returns up to p_limit rows (max 200) ordered by created_at DESC. Caller must own the agent or be a super admin.';

GRANT ALL ON FUNCTION "public"."fn_list_agent_incidents"(
  "uuid", integer, timestamp with time zone
) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_list_agent_incidents"(
  "uuid", integer, timestamp with time zone
) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_list_agent_incidents"(
  "uuid", integer, timestamp with time zone
) TO "service_role";


-- ─── fn_list_policy_evaluations ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION "public"."fn_list_policy_evaluations"(
  "p_ai_lenser_id" "uuid",
  "p_limit"        integer                     DEFAULT 100,
  "p_cursor"       timestamp with time zone    DEFAULT NULL::timestamp with time zone
)
RETURNS SETOF "jsonb"
LANGUAGE "sql"
STABLE
SECURITY DEFINER
SET "search_path" TO 'public', 'agents', 'lensers'
AS $$
  SELECT to_jsonb(pe.*)
  FROM   agents.policy_evaluations pe
  WHERE  pe.ai_lenser_id = p_ai_lenser_id
    AND  (p_cursor IS NULL OR pe.evaluated_at < p_cursor)
    AND  (
           agents.can_manage_ai_lenser(p_ai_lenser_id)
           OR public.fn_is_super_admin()
         )
  ORDER BY pe.evaluated_at DESC
  LIMIT  LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500);
$$;

ALTER FUNCTION "public"."fn_list_policy_evaluations"(
  "uuid", integer, timestamp with time zone
) OWNER TO "postgres";

COMMENT ON FUNCTION "public"."fn_list_policy_evaluations"(
  "uuid", integer, timestamp with time zone
) IS 'Keyset-paginated list of policy_evaluations for an AI lenser ordered by evaluated_at DESC. Returns up to p_limit rows (max 500). Caller must own the agent or be a super admin.';

GRANT ALL ON FUNCTION "public"."fn_list_policy_evaluations"(
  "uuid", integer, timestamp with time zone
) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_list_policy_evaluations"(
  "uuid", integer, timestamp with time zone
) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_list_policy_evaluations"(
  "uuid", integer, timestamp with time zone
) TO "service_role";
