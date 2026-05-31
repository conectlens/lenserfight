-- ─── Workflow slug support ───────────────────────────────────────────────────
-- Adds a stable, unique slug to lenses.workflows so CLI users can reference
-- workflows by :my-slug or @:my-slug instead of bare UUIDs.

-- 1. Add the column (nullable first so we can backfill before adding NOT NULL)
ALTER TABLE lenses.workflows
  ADD COLUMN IF NOT EXISTS slug text;

-- 2. Slug generator: lower-case title words joined by dashes + 6-char UUID suffix
CREATE OR REPLACE FUNCTION lenses.fn_generate_workflow_slug(p_title text, p_id uuid)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    SUBSTR(
      REGEXP_REPLACE(
        REGEXP_REPLACE(LOWER(TRIM(p_title)), '[^a-z0-9]+', '-', 'g'),
        '^-+|-+$', '', 'g'
      ),
      1, 74
    ) || '-' || SUBSTR(REPLACE(p_id::text, '-', ''), 1, 6)
$$;

-- 3. Backfill existing rows
UPDATE lenses.workflows
SET slug = lenses.fn_generate_workflow_slug(title, id)
WHERE slug IS NULL;

-- 4. Enforce NOT NULL + uniqueness now that all rows are populated
ALTER TABLE lenses.workflows
  ALTER COLUMN slug SET NOT NULL,
  ADD CONSTRAINT uq_lenses_workflows_slug UNIQUE (slug);

-- 5. Trigger function: auto-set slug on INSERT if caller did not supply one
CREATE OR REPLACE FUNCTION lenses.fn_trg_workflow_set_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := lenses.fn_generate_workflow_slug(NEW.title, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workflow_set_slug ON lenses.workflows;
CREATE TRIGGER trg_workflow_set_slug
  BEFORE INSERT ON lenses.workflows
  FOR EACH ROW EXECUTE FUNCTION lenses.fn_trg_workflow_set_slug();

-- ─── fn_get_workflow ─────────────────────────────────────────────────────────
-- Owner-only resolver: accepts UUID string or slug, returns full workflow row.
-- The CLI strips @: / : prefixes before calling this function.

CREATE OR REPLACE FUNCTION "public"."fn_get_workflow"("p_ref" "text")
RETURNS "jsonb"
LANGUAGE "plpgsql"
STABLE
SECURITY DEFINER
SET "search_path" TO 'public', 'lenses', 'lensers'
AS $$
DECLARE
  v_lenser_id uuid;
  v_result    jsonb;
BEGIN
  v_lenser_id := lensers.get_auth_lenser_id();
  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'id',                 w.id,
    'slug',               w.slug,
    'title',              w.title,
    'description',        w.description,
    'visibility',         w.visibility,
    'battle_count',       w.battle_count,
    'fork_count',         w.fork_count,
    'lenser_id',          w.lenser_id,
    'parent_workflow_id', w.parent_workflow_id,
    'head_version_id',    w.head_version_id,
    'created_at',         w.created_at,
    'updated_at',         w.updated_at,
    'archived_at',        w.archived_at,
    'deleted_at',         w.deleted_at
  )
  INTO v_result
  FROM lenses.workflows w
  WHERE w.deleted_at IS NULL
    AND w.lenser_id = v_lenser_id
    AND (
      (p_ref ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       AND w.id = p_ref::uuid)
      OR w.slug = p_ref
    );

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Workflow not found: %', p_ref USING ERRCODE = 'P0002';
  END IF;

  RETURN v_result;
END;
$$;

ALTER FUNCTION "public"."fn_get_workflow"("p_ref" "text") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."fn_get_workflow"("p_ref" "text") IS
  'Owner-only workflow resolver. p_ref accepts UUID or slug. Used by CLI to resolve :slug and @:slug references.';
GRANT ALL ON FUNCTION "public"."fn_get_workflow"("p_ref" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_workflow"("p_ref" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_workflow"("p_ref" "text") TO "service_role";

-- ─── Update fn_create_workflow to return slug ────────────────────────────────
-- DROP required: PostgreSQL rejects CREATE OR REPLACE when RETURNS TABLE changes.

DROP FUNCTION IF EXISTS "public"."fn_create_workflow"("text", "text", "text");

CREATE OR REPLACE FUNCTION "public"."fn_create_workflow"(
  "p_title"       "text",
  "p_description" "text" DEFAULT NULL::"text",
  "p_visibility"  "text" DEFAULT 'public'::"text"
)
RETURNS TABLE(
  "id"          "uuid",
  "slug"        "text",
  "lenser_id"   "uuid",
  "title"       "text",
  "description" "text",
  "visibility"  "text",
  "battle_count" integer,
  "created_at"  timestamp with time zone,
  "updated_at"  timestamp with time zone
)
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" TO 'lenses', 'lensers', 'public'
AS $$
DECLARE
  v_lenser_id uuid;
BEGIN
  v_lenser_id := lensers.get_auth_lenser_id();
  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  INSERT INTO lenses.workflows (lenser_id, title, description, visibility)
  VALUES (v_lenser_id, p_title, p_description, p_visibility)
  RETURNING
    lenses.workflows.id,
    lenses.workflows.slug,
    lenses.workflows.lenser_id,
    lenses.workflows.title,
    lenses.workflows.description,
    lenses.workflows.visibility,
    lenses.workflows.battle_count,
    lenses.workflows.created_at,
    lenses.workflows.updated_at;
END;
$$;

ALTER FUNCTION "public"."fn_create_workflow"("p_title" "text", "p_description" "text", "p_visibility" "text") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."fn_create_workflow"("p_title" "text", "p_description" "text", "p_visibility" "text") IS
  'Creates a workflow with auto-generated slug. Returns slug so CLI can display it immediately.';
GRANT ALL ON FUNCTION "public"."fn_create_workflow"("p_title" "text", "p_description" "text", "p_visibility" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_create_workflow"("p_title" "text", "p_description" "text", "p_visibility" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_create_workflow"("p_title" "text", "p_description" "text", "p_visibility" "text") TO "service_role";

-- ─── Update fn_get_my_workflows to include slug ──────────────────────────────
-- DROP required: PostgreSQL rejects CREATE OR REPLACE when RETURNS TABLE changes.

DROP FUNCTION IF EXISTS "public"."fn_get_my_workflows"("uuid", integer, integer, "text", "text", "text");

CREATE OR REPLACE FUNCTION "public"."fn_get_my_workflows"(
  "p_lenser_id" "uuid",
  "p_offset"    integer DEFAULT 0,
  "p_limit"     integer DEFAULT 12,
  "p_visibility" "text" DEFAULT NULL::"text",
  "p_sort"      "text" DEFAULT 'updated_at'::"text",
  "p_search"    "text" DEFAULT NULL::"text"
)
RETURNS TABLE(
  "id"                "uuid",
  "slug"              "text",
  "lenser_id"         "uuid",
  "title"             "text",
  "description"       "text",
  "visibility"        "text",
  "battle_count"      integer,
  "node_count"        bigint,
  "reaction_totals"   "jsonb",
  "fork_count"        integer,
  "parent_workflow_id" "uuid",
  "created_at"        timestamp with time zone,
  "updated_at"        timestamp with time zone
)
LANGUAGE "sql"
STABLE
SECURITY DEFINER
SET "search_path" TO 'public', 'lenses'
AS $$
  SELECT
    w.id,
    w.slug,
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
  LIMIT LEAST(p_limit, 200)
  OFFSET p_offset;
$$;

ALTER FUNCTION "public"."fn_get_my_workflows"("p_lenser_id" "uuid", "p_offset" integer, "p_limit" integer, "p_visibility" "text", "p_sort" "text", "p_search" "text") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."fn_get_my_workflows"("p_lenser_id" "uuid", "p_offset" integer, "p_limit" integer, "p_visibility" "text", "p_sort" "text", "p_search" "text") IS
  'Paginated list of caller-owned workflows including slug. Used by CLI workflow list command.';
GRANT ALL ON FUNCTION "public"."fn_get_my_workflows"("p_lenser_id" "uuid", "p_offset" integer, "p_limit" integer, "p_visibility" "text", "p_sort" "text", "p_search" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_my_workflows"("p_lenser_id" "uuid", "p_offset" integer, "p_limit" integer, "p_visibility" "text", "p_sort" "text", "p_search" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_my_workflows"("p_lenser_id" "uuid", "p_offset" integer, "p_limit" integer, "p_visibility" "text", "p_sort" "text", "p_search" "text") TO "service_role";
