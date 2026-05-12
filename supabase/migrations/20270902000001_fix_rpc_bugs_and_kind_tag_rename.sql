-- =============================================================================
-- Fix: fn_create_workspace_record scalar error, fn_clone_lens missing from
-- PostgREST schema cache, and strip kind prefix from tag slugs entirely.
--
-- 1. Strip kind-* / kind:* prefixes → plain slug  (kind-text → text, etc.)
-- 2. Fix fn_list_template_workflows: replace LIKE 'kind-%' with explicit IN list
-- 3. Fix fn_create_workspace_record: replace $1 USING binding with %L literal
--    to avoid "cannot call populate_composite on a scalar" (error 22023)
-- 4. Re-create public.fn_clone_lens wrapper (idempotent) and reload PostgREST
-- =============================================================================


-- ─── 1. Strip kind prefix from tag slugs ──────────────────────────────────────
-- Some kind-* slugs collide with canonical plain slugs already inserted by
-- 20270812000000_canonical_production_tags.sql (e.g. kind-text → text already
-- exists). For those, we redirect all FK references to the canonical row then
-- delete the kind-* row. For non-colliding slugs we rename directly.

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Colliding slugs: redirect references then delete the kind-* duplicate
  FOR r IN
    SELECT k.id AS kind_id, plain.id AS plain_id
    FROM   content.tags k
    JOIN   content.tags plain ON plain.slug = substr(k.slug, 6)
    WHERE  k.slug LIKE 'kind-%'
  LOOP
    UPDATE content.tag_map          SET tag_id = r.plain_id WHERE tag_id = r.kind_id;
    UPDATE content.tag_suggestions  SET tag_id = r.plain_id WHERE tag_id = r.kind_id;
    UPDATE content.tag_translations SET tag_id = r.plain_id WHERE tag_id = r.kind_id;
    UPDATE lensers.tag_follows      SET tag_id = r.plain_id WHERE tag_id = r.kind_id;
    DELETE FROM content.tags WHERE id = r.kind_id;
  END LOOP;

  -- Non-colliding slugs: safe to rename directly
  UPDATE content.tags
  SET    slug = substr(slug, 6)
  WHERE  slug LIKE 'kind-%';

  -- Handle kind: prefix (colon variant) — same pattern
  FOR r IN
    SELECT k.id AS kind_id, plain.id AS plain_id
    FROM   content.tags k
    JOIN   content.tags plain ON plain.slug = substr(k.slug, 6)
    WHERE  k.slug LIKE 'kind:%'
  LOOP
    UPDATE content.tag_map          SET tag_id = r.plain_id WHERE tag_id = r.kind_id;
    UPDATE content.tag_suggestions  SET tag_id = r.plain_id WHERE tag_id = r.kind_id;
    UPDATE content.tag_translations SET tag_id = r.plain_id WHERE tag_id = r.kind_id;
    UPDATE lensers.tag_follows      SET tag_id = r.plain_id WHERE tag_id = r.kind_id;
    DELETE FROM content.tags WHERE id = r.kind_id;
  END LOOP;

  UPDATE content.tags
  SET    slug = substr(slug, 6)
  WHERE  slug LIKE 'kind:%';
END;
$$;


-- ─── 2. Fix fn_list_template_workflows ────────────────────────────────────────
-- Replace the now-broken LIKE 'kind-%' pattern with an explicit IN list.
CREATE OR REPLACE FUNCTION public.fn_list_template_workflows(
  p_limit  integer DEFAULT 12,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id                  uuid,
  lenser_id           uuid,
  title               text,
  description         text,
  visibility          text,
  node_count          bigint,
  reaction_totals     jsonb,
  fork_count          integer,
  created_at          timestamptz,
  updated_at          timestamptz,
  author_handle       text,
  author_display_name text,
  kinds               text[]
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
    p.handle             AS author_handle,
    p.display_name       AS author_display_name,
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
  FROM  tmpl
  JOIN  lenses.workflows   w ON w.id  = tmpl.workflow_id
  LEFT JOIN lensers.profiles p ON p.id = w.lenser_id
  WHERE w.visibility::text = 'public'
  ORDER BY tmpl.marked_at ASC, w.title ASC
  LIMIT  p_limit
  OFFSET p_offset;
$$;

ALTER FUNCTION public.fn_list_template_workflows(integer, integer) OWNER TO postgres;


-- ─── 3. Fix fn_create_workspace_record ────────────────────────────────────────
-- Root cause: PostgREST can forward the JSONB parameter as an opaque scalar in
-- some call paths, causing jsonb_populate_record to raise error 22023
-- "cannot call populate_composite on a scalar".
-- Fix: embed the value as a quoted literal (%L::jsonb) instead of $1 USING.
CREATE OR REPLACE FUNCTION public.fn_create_workspace_record(
  p_table_name text,
  p_data       jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF p_table_name NOT IN (
    'personality_profiles', 'memory_profiles', 'tool_profiles', 'model_profiles',
    'workflow_assignments', 'evaluation_cases', 'evaluation_rubrics',
    'evaluation_baselines', 'tools_registry', 'evaluations',
    'team_members', 'team_edges', 'agent_run_events', 'agent_run_steps'
  ) THEN
    RAISE EXCEPTION 'create_forbidden: table % not in allowlist', p_table_name
      USING ERRCODE = '42501';
  END IF;

  EXECUTE format(
    'INSERT INTO agents.%I SELECT * FROM jsonb_populate_record(null::agents.%I, %L::jsonb) RETURNING to_jsonb(%I.*)',
    p_table_name,
    p_table_name,
    p_data::text,
    p_table_name
  ) INTO v_result;

  RETURN v_result;
END;
$$;

ALTER FUNCTION public.fn_create_workspace_record(text, jsonb) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_create_workspace_record(text, jsonb) TO authenticated, service_role;


-- ─── 4. Re-create public.fn_clone_lens (idempotent) ──────────────────────────
-- PostgREST can only call public.* functions; lenses.fn_clone_lens is the real
-- implementation. This wrapper ensures the function is visible in the schema
-- cache regardless of whether migration 20270901000017 applied cleanly.
CREATE OR REPLACE FUNCTION public.fn_clone_lens(
  p_source_lens_id uuid,
  p_version_id     uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'lenses', 'lensers', 'content'
AS $$
  SELECT lenses.fn_clone_lens(p_source_lens_id, p_version_id);
$$;

ALTER FUNCTION public.fn_clone_lens(uuid, uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_clone_lens(uuid, uuid) TO authenticated;


-- ─── 5. Reload PostgREST schema cache ────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
