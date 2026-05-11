-- fn_get_entity_reactions_by_lenser was called in reactionRepository.ts but never defined.
-- Supports three call patterns:
--   1. entity_id + lenser_id   → reactions by a specific lenser on a specific entity
--   2. entity_id only          → all reactions on a specific entity
--   3. lenser_id only          → reaction history for a specific lenser across all entities of that type

DROP FUNCTION IF EXISTS public.fn_get_entity_reactions_by_lenser(text, uuid, uuid);

CREATE OR REPLACE FUNCTION public.fn_get_entity_reactions_by_lenser(
  p_entity_type text,
  p_entity_id   uuid DEFAULT NULL,
  p_lenser_id   uuid DEFAULT NULL
) RETURNS TABLE(
  id          uuid,
  entity_type text,
  entity_id   uuid,
  lenser_id   uuid,
  reaction    text,
  created_at  timestamptz
)
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path TO 'public', 'content'
AS $$
  SELECT
    r.id,
    r.entity_type::text,
    r.entity_id,
    r.lenser_id,
    r.reaction::text,
    r.created_at
  FROM content.reactions r
  WHERE r.entity_type::text = p_entity_type
    AND (p_entity_id IS NULL OR r.entity_id = p_entity_id)
    AND (p_lenser_id IS NULL OR r.lenser_id = p_lenser_id);
$$;

ALTER FUNCTION public.fn_get_entity_reactions_by_lenser(text, uuid, uuid) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.fn_get_entity_reactions_by_lenser(text, uuid, uuid)
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.fn_get_entity_reactions_by_lenser(text, uuid, uuid) IS
  'Flexible reaction query: filter by entity_type (required), entity_id (optional), and/or lenser_id (optional). Used by reactionRepository getReactionsFor, getBatchUserReactions, and getLenserHistory.';
