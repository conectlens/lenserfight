-- =============================================================================
-- Open Source Workflows: Template workflows & template listing RPC
-- =============================================================================
-- Ships alongside the 7-stage lens chain seed (supabase/seeds/40_lens_chain_templates.sql).
-- Templates are discovered by the content.tag_map row that pairs a workflow with
-- the canonical `template` content.tags row. The RPC below powers the
-- "Start from template" strip on the WorkflowsPage.
-- =============================================================================

-- Idempotent helper: ensure the `template` tag exists in content.tags.
INSERT INTO content.tags (slug)
VALUES ('template')
ON CONFLICT (slug) DO NOTHING;

-- Idempotent helper: ensure each kind:* tag exists (the seeds expect them).
INSERT INTO content.tags (slug)
VALUES
  ('kind-text'),
  ('kind-image'),
  ('kind-video'),
  ('kind-research'),
  ('kind-pdf'),
  ('kind-transform'),
  ('kind-orchestration'),
  ('kind-validation'),
  ('kind-routing')
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- fn_list_template_workflows
-- ---------------------------------------------------------------------------
-- Returns public workflows that carry the `template` content.tag_map row,
-- ordered by curated position (tag_map.created_at ASC) then title. Callable by
-- both authenticated and anonymous visitors so the marketing page can preload
-- the strip before login.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_list_template_workflows(
  p_limit integer DEFAULT 12,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  lenser_id uuid,
  title text,
  description text,
  visibility text,
  node_count bigint,
  reaction_totals jsonb,
  fork_count integer,
  created_at timestamptz,
  updated_at timestamptz,
  author_handle text,
  author_display_name text,
  kinds text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'lenses', 'content', 'lensers'
AS $$
  WITH tmpl AS (
    SELECT tm.entity_id AS workflow_id, tm.created_at AS marked_at
    FROM content.tag_map tm
    JOIN content.tags t ON t.id = tm.tag_id
    WHERE tm.entity_type = 'workflow'::content.entity_type_enum
      AND t.slug = 'template'
  )
  SELECT
    w.id,
    w.lenser_id,
    w.title,
    w.description,
    w.visibility::text,
    (
      SELECT count(*) FROM lenses.workflow_nodes wn WHERE wn.workflow_id = w.id
    ) AS node_count,
    w.reaction_totals,
    w.fork_count,
    w.created_at,
    w.updated_at,
    p.handle AS author_handle,
    p.display_name AS author_display_name,
    COALESCE(
      (
        SELECT array_agg(DISTINCT t.slug ORDER BY t.slug)
        FROM lenses.workflow_nodes wn
        JOIN lenses.lenses ll ON ll.id = wn.lens_id
        JOIN content.tag_map tm2 ON tm2.entity_id = ll.id AND tm2.entity_type = 'lens'::content.entity_type_enum
        JOIN content.tags t ON t.id = tm2.tag_id AND t.slug LIKE 'kind-%'
        WHERE wn.workflow_id = w.id
      ),
      ARRAY[]::text[]
    ) AS kinds
  FROM tmpl
  JOIN lenses.workflows w ON w.id = tmpl.workflow_id
  LEFT JOIN lensers.profiles p ON p.id = w.lenser_id
  WHERE w.visibility::text = 'public'
  ORDER BY tmpl.marked_at ASC, w.title ASC
  LIMIT p_limit
  OFFSET p_offset;
$$;

ALTER FUNCTION public.fn_list_template_workflows(integer, integer) OWNER TO postgres;

COMMENT ON FUNCTION public.fn_list_template_workflows(integer, integer) IS
'Lists curated template workflows that power the "Start from template" strip on WorkflowsPage. A workflow is considered a template when it has a content.tag_map row linking it to the `template` tag.';

GRANT EXECUTE ON FUNCTION public.fn_list_template_workflows(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_list_template_workflows(integer, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.fn_list_template_workflows(integer, integer) TO service_role;
