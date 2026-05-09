-- Phase P4: Owner-scoped moderation decisions RPC
--
-- Surfaces audit.moderation_decisions to a battle creator (owner) without
-- exposing the raw audit table to PostgREST. Used by the CLI and the UI to
-- list moderation events tied to battles the caller created.
--
-- Authorization
--   * SECURITY DEFINER bypasses RLS on audit.moderation_decisions (which has
--     no RLS by design — it is private to service_role).
--   * The function joins to battles.battles and filters to rows the caller
--     created. Non-battle targets (e.g. submissions) are returned only when
--     they belong to a battle the caller owns.
--   * No admin override (lensers.is_admin() is not present in this codebase
--     at the time of writing); the CLI/admin agents go through service_role.
--
-- Filtering
--   * p_status NULL  -> return all decision_types
--   * p_status set   -> filter to that decision_type
--   * p_limit caps result set (default 100, hard max 500).

CREATE OR REPLACE FUNCTION public.fn_get_moderation_decisions_for_owner(
  p_status text DEFAULT NULL,
  p_limit  int  DEFAULT 100
)
RETURNS TABLE (
  decision_id          uuid,
  occurred_at          timestamptz,
  decision_type        text,
  reason               text,
  is_ai_moderated      boolean,
  ai_confidence        numeric,
  moderator_lenser_id  uuid,
  target_entity_schema text,
  target_entity_table  text,
  target_entity_id     uuid,
  battle_id            uuid,
  battle_title         text,
  battle_slug          text,
  is_appealed          boolean,
  appeal_outcome       text
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, audit, battles, lensers
AS $$
DECLARE
  v_caller   uuid := lensers.get_auth_lenser_id();
  v_limit    int  := LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500);
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    md.id                           AS decision_id,
    md.occurred_at,
    md.decision_type,
    md.reason,
    md.is_ai_moderated,
    md.ai_confidence,
    md.moderator_lenser_id,
    md.target_entity_schema,
    md.target_entity_table,
    md.target_entity_id,
    b.id                            AS battle_id,
    b.title                         AS battle_title,
    b.slug                          AS battle_slug,
    md.is_appealed,
    md.appeal_outcome
  FROM audit.moderation_decisions md
  -- Resolve the owning battle whether the target is the battle row itself or
  -- a child entity (contender/submission/etc.) inside the same battle.
  LEFT JOIN battles.battles b ON (
    (md.target_entity_schema = 'battles'
       AND md.target_entity_table = 'battles'
       AND b.id = md.target_entity_id)
    OR
    (md.target_entity_schema = 'battles'
       AND md.target_entity_table IN ('contenders', 'submissions')
       AND b.id = (
         SELECT c.battle_id
         FROM battles.contenders c
         WHERE c.id = md.target_entity_id
       ))
  )
  WHERE b.creator_lenser_id = v_caller
    AND md.decision_type    = COALESCE(p_status, md.decision_type)
  ORDER BY md.occurred_at DESC
  LIMIT v_limit;
END;
$$;

ALTER FUNCTION public.fn_get_moderation_decisions_for_owner(text, int) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.fn_get_moderation_decisions_for_owner(text, int)
  TO authenticated;

COMMENT ON FUNCTION public.fn_get_moderation_decisions_for_owner(text, int) IS
  'Phase P4: returns audit.moderation_decisions rows scoped to battles the '
  'caller created. SECURITY DEFINER; the audit table is otherwise private to '
  'service_role. Optional p_status filters by decision_type.';
