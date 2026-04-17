-- Include node_count in workflow list RPCs to avoid per-card node fetches (N+1).

CREATE OR REPLACE FUNCTION public.fn_get_my_workflows(
  p_lenser_id uuid,
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 12,
  p_visibility text DEFAULT NULL,
  p_sort text DEFAULT 'updated_at',
  p_search text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  lenser_id uuid,
  title text,
  description text,
  visibility text,
  battle_count integer,
  node_count bigint,
  reaction_totals jsonb,
  fork_count integer,
  parent_workflow_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'lenses'
AS $$
  SELECT
    w.id,
    w.lenser_id,
    w.title,
    w.description,
    w.visibility::text,
    w.battle_count,
    (
      SELECT count(*)
      FROM lenses.workflow_nodes wn
      WHERE wn.workflow_id = w.id
    ) AS node_count,
    w.reaction_totals,
    w.fork_count,
    w.parent_workflow_id,
    w.created_at,
    w.updated_at
  FROM lenses.workflows w
  WHERE w.lenser_id = p_lenser_id
    AND (p_visibility IS NULL OR w.visibility::text = p_visibility)
    AND (p_search IS NULL OR w.title ILIKE '%' || p_search || '%')
  ORDER BY
    CASE WHEN p_sort = 'updated_at' THEN EXTRACT(EPOCH FROM w.updated_at) END DESC,
    CASE WHEN p_sort = 'created_at' THEN EXTRACT(EPOCH FROM w.created_at) END DESC,
    CASE WHEN p_sort = 'battle_count' THEN w.battle_count::float END DESC NULLS LAST,
    w.updated_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

CREATE OR REPLACE FUNCTION public.fn_workflows_get_popular(
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 12,
  p_search text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  lenser_id uuid,
  title text,
  description text,
  visibility text,
  battle_count integer,
  node_count bigint,
  reaction_totals jsonb,
  fork_count integer,
  parent_workflow_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  hot_score double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'lenses'
AS $$
  SELECT
    w.id,
    w.lenser_id,
    w.title,
    w.description,
    w.visibility::text,
    w.battle_count,
    (
      SELECT count(*)
      FROM lenses.workflow_nodes wn
      WHERE wn.workflow_id = w.id
    ) AS node_count,
    w.reaction_totals,
    w.fork_count,
    w.parent_workflow_id,
    w.created_at,
    w.updated_at,
    log(
      GREATEST(
        1,
        5.0 * w.battle_count
        + 3.0 * w.fork_count
        + 4.0 * COALESCE((w.reaction_totals->>'copy')::int, 0)
        + 2.0 * COALESCE((w.reaction_totals->>'like')::int, 0)
        + 1.0 * COALESCE((w.reaction_totals->>'saved')::int, 0)
      )
    ) / NULLIF(
      pow((extract(epoch FROM now() - w.created_at) / 3600.0 + 2), 1.5),
      0
    ) AS hot_score
  FROM lenses.workflows w
  WHERE w.visibility::text = 'public'
    AND (p_search IS NULL OR w.title ILIKE '%' || p_search || '%')
  ORDER BY hot_score DESC, w.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;
