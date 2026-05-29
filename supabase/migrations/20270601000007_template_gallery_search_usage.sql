-- Phase 5: template gallery server-side search/category filtering and 30d usage counts.

BEGIN;

CREATE OR REPLACE VIEW public.v_template_usage_30d AS
WITH template_workflows AS (
  SELECT tm.entity_id AS workflow_id
  FROM content.tag_map tm
  JOIN content.tags t ON t.id = tm.tag_id
  WHERE tm.entity_type = 'workflow'::content.entity_type_enum
    AND t.slug = 'template'
)
SELECT
  tw.workflow_id,
  count(r.id)::integer AS executions_30d
FROM template_workflows tw
LEFT JOIN lenses.workflow_runs r
  ON r.workflow_id = tw.workflow_id
 AND r.created_at >= now() - interval '30 days'
GROUP BY tw.workflow_id;

GRANT SELECT ON public.v_template_usage_30d TO anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.fn_list_template_workflows(integer, integer);

CREATE OR REPLACE FUNCTION public.fn_list_template_workflows(
  p_limit integer DEFAULT 12,
  p_offset integer DEFAULT 0,
  p_search text DEFAULT NULL::text,
  p_category text DEFAULT NULL::text
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
  kinds text[],
  executions_30d integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'lenses', 'content', 'lensers'
AS $$
  WITH bounded AS (
    SELECT LEAST(GREATEST(COALESCE(p_limit, 12), 1), 50) AS lim,
           GREATEST(COALESCE(p_offset, 0), 0) AS off
  ), tmpl AS (
    SELECT tm.entity_id AS workflow_id, tm.created_at AS marked_at
    FROM content.tag_map tm
    JOIN content.tags t ON t.id = tm.tag_id
    WHERE tm.entity_type = 'workflow'::content.entity_type_enum
      AND t.slug = 'template'
  ), typed AS (
    SELECT
      w.id,
      COALESCE(
        (
          SELECT array_agg(DISTINCT t.slug ORDER BY t.slug)
          FROM   lenses.workflow_nodes wn
          JOIN   lenses.lenses   ll  ON ll.id  = wn.lens_id
          JOIN   content.tag_map tm2 ON tm2.entity_id   = ll.id
                                     AND tm2.entity_type = 'lens'::content.entity_type_enum
          JOIN   content.tags    t   ON t.id = tm2.tag_id
                                     AND t.slug IN (
                                       'text','image','video','audio','music',
                                       'research','pdf','transform','orchestration',
                                       'validation','routing',
                                       'code','data','planning','community','documentation'
                                     )
          WHERE  wn.workflow_id = w.id
        ),
        ARRAY[]::text[]
      ) AS kinds
    FROM tmpl
    JOIN lenses.workflows w ON w.id = tmpl.workflow_id
  )
  SELECT
    w.id,
    w.lenser_id,
    w.title,
    w.description,
    w.visibility::text,
    (SELECT count(*) FROM lenses.workflow_nodes wn WHERE wn.workflow_id = w.id) AS node_count,
    w.reaction_totals,
    w.fork_count,
    w.created_at,
    w.updated_at,
    p.handle AS author_handle,
    p.display_name AS author_display_name,
    typed.kinds,
    COALESCE(usage.executions_30d, 0) AS executions_30d
  FROM tmpl
  JOIN lenses.workflows w ON w.id = tmpl.workflow_id
  JOIN typed ON typed.id = w.id
  CROSS JOIN bounded
  LEFT JOIN lensers.profiles p ON p.id = w.lenser_id
  LEFT JOIN public.v_template_usage_30d usage ON usage.workflow_id = w.id
  WHERE w.visibility::text = 'public'
    AND (
      NULLIF(trim(p_search), '') IS NULL
      OR w.title ILIKE '%' || trim(p_search) || '%'
      OR COALESCE(w.description, '') ILIKE '%' || trim(p_search) || '%'
    )
    AND (
      NULLIF(trim(p_category), '') IS NULL
      OR trim(p_category) = ANY(typed.kinds)
    )
  ORDER BY usage.executions_30d DESC NULLS LAST, tmpl.marked_at ASC, w.title ASC
  LIMIT (SELECT lim FROM bounded)
  OFFSET (SELECT off FROM bounded);
$$;

REVOKE ALL ON FUNCTION public.fn_list_template_workflows(integer, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_list_template_workflows(integer, integer, text, text) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.fn_list_template_workflows(integer, integer, text, text) IS
  'Lists curated public template workflows with bounded server-side search/category filtering and 30-day execution counts.';

COMMIT;
