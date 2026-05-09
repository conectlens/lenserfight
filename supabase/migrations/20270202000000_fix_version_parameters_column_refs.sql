-- Fix: fn_clone_lens, fn_run_lens (both overloads), and fn_validate_inputs all
-- reference columns (key, type, required, default_value, placeholder, help_text,
-- validation_schema, options, sort_order) that do not exist on
-- lenses.version_parameters. Those properties live on lenses.tools, joined via
-- version_parameters.tool_id. The parameter's human-readable label serves as the
-- input-key for p_inputs lookup (consistent with how fn_create_lens stores params).

-- ── lenses.fn_clone_lens ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "lenses"."fn_clone_lens"("p_source_lens_id" "uuid", "p_version_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'content', 'lensers', 'public'
    AS $$
DECLARE
  v_caller_id       uuid;
  v_src_vis         content.visibility_enum;
  v_src_status      content.content_status;
  v_template        text;
  v_title           text;
  v_description     text;
  v_language        text;
  v_resolved_ver_id uuid;
  v_new_lens_id     uuid;
  v_new_version     lenses.versions;
BEGIN
  -- Auth check
  v_caller_id := lensers.get_auth_lenser_id();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Fork cooldown: max one fork per 5 minutes per user
  IF EXISTS (
    SELECT 1 FROM lenses.lenses
    WHERE lenser_id = v_caller_id
      AND parent_lens_id IS NOT NULL
      AND created_at > NOW() - INTERVAL '5 minutes'
  ) THEN
    RAISE EXCEPTION 'rate_limit_exceeded'
      USING DETAIL = 'You can only fork a lens once every 5 minutes.',
            ERRCODE = 'P0429';
  END IF;

  -- Source lens must be public + published
  SELECT l.visibility, l.status
    INTO v_src_vis, v_src_status
    FROM lenses.lenses l
   WHERE l.id = p_source_lens_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source lens % not found', p_source_lens_id
      USING ERRCODE = 'no_data_found';
  END IF;

  IF v_src_vis <> 'public'::"content"."visibility_enum"
     OR v_src_status <> 'published'::"content"."content_status" THEN
    RAISE EXCEPTION 'Cannot clone: source lens must be public and published'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Resolve template_body + version id from specific published version or latest published
  IF p_version_id IS NOT NULL THEN
    SELECT v.id, v.template_body
      INTO v_resolved_ver_id, v_template
      FROM lenses.versions v
     WHERE v.id      = p_version_id
       AND v.lens_id = p_source_lens_id
       AND v.status  = 'published'::"content"."content_status";

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Published version % not found for lens %',
        p_version_id, p_source_lens_id
        USING ERRCODE = 'no_data_found';
    END IF;
  ELSE
    SELECT v.id, v.template_body
      INTO v_resolved_ver_id, v_template
      FROM lenses.versions v
     WHERE v.lens_id = p_source_lens_id
       AND v.status  = 'published'::"content"."content_status"
     ORDER BY v.version_number DESC
     LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No published version found for lens %', p_source_lens_id
        USING ERRCODE = 'no_data_found';
    END IF;
  END IF;

  -- Resolve original translation
  SELECT t.title, t.description, t.language_code
    INTO v_title, v_description, v_language
    FROM content.entity_translations t
   WHERE t.entity_id   = p_source_lens_id
     AND t.entity_type = 'lens'::"content"."entity_type_enum"
     AND t.is_original = true
   LIMIT 1;

  -- Create the new (cloned) lens record — record which version it was forked from
  INSERT INTO lenses.lenses (
    lenser_id, visibility, status,
    parent_lens_id, forked_from_version_id
  ) VALUES (
    v_caller_id,
    'private'::"content"."visibility_enum",
    'published'::"content"."content_status",
    p_source_lens_id,
    v_resolved_ver_id
  )
  RETURNING id INTO v_new_lens_id;

  -- Create initial draft version via upsert (brand-new lens has no prior versions)
  v_new_version := lenses.fn_upsert_draft_version(
    v_new_lens_id,
    v_template,
    'Cloned from ' || coalesce(v_title, 'Untitled')
  );

  -- Set HEAD
  UPDATE lenses.lenses
     SET head_version_id = v_new_version.id
   WHERE id = v_new_lens_id;

  -- Clone version_parameters (label + tool_id) from source version → new version
  INSERT INTO lenses.version_parameters (version_id, label, tool_id)
  SELECT v_new_version.id, vp.label, vp.tool_id
  FROM lenses.version_parameters vp
  WHERE vp.version_id = v_resolved_ver_id
  LIMIT 200;

  -- Clone steps (version-specific + global)
  INSERT INTO lenses.steps (
    lens_id, version_id,
    ordinal, step_type, instruction,
    model_id, input_map, output_key, sub_lens_id
  )
  SELECT
    v_new_lens_id,
    v_new_version.id,
    s.ordinal, s.step_type, s.instruction,
    s.model_id, s.input_map, s.output_key, s.sub_lens_id
  FROM lenses.steps s
  WHERE s.lens_id = p_source_lens_id
    AND (
      p_version_id IS NULL
      OR s.version_id = p_version_id
      OR s.version_id IS NULL
    )
  LIMIT 500;

  -- Copy translation with "Fork of" prefix
  INSERT INTO content.entity_translations (
    entity_type, entity_id, language_code, is_original,
    title, description, content
  ) VALUES (
    'lens'::"content"."entity_type_enum",
    v_new_lens_id,
    coalesce(v_language, 'en'),
    true,
    'Fork of ' || coalesce(v_title, 'Untitled'),
    v_description,
    v_template
  );

  -- Copy tag associations
  INSERT INTO content.tag_map (entity_type, entity_id, tag_id)
  SELECT
    'lens'::"content"."entity_type_enum",
    v_new_lens_id,
    tm.tag_id
  FROM content.tag_map tm
  WHERE tm.entity_type = 'lens'::"content"."entity_type_enum"
    AND tm.entity_id   = p_source_lens_id
  LIMIT 50;

  RETURN v_new_lens_id;
END;
$$;

COMMENT ON FUNCTION "lenses"."fn_clone_lens"("p_source_lens_id" "uuid", "p_version_id" "uuid") IS 'Forks a public published lens into a private draft clone owned by the caller.
   Sets head_version_id and forked_from_version_id (the specific version cloned).
   Clones: version_parameters (label + tool_id), steps (version-specific + global),
   translation (''Fork of'' prefix), and tag associations. SECURITY DEFINER: ownership
   and visibility checked internally.';


-- ── execution.fn_run_lens (6-arg) ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "execution"."fn_run_lens"("p_lens_id" "uuid", "p_version_id" "uuid", "p_model_id" "uuid", "p_inputs" "jsonb" DEFAULT '{}'::"jsonb", "p_funding_source" "text" DEFAULT 'platform_credit'::"text", "p_byok_key_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'execution', 'lenses', 'lensers', 'tenancy', 'public'
    AS $$
DECLARE
  v_lenser_id    uuid := "lensers"."get_auth_lenser_id"();
  v_workspace_id uuid;
  v_request_id   uuid;
  v_run_id       uuid;
  v_param_rec    RECORD;
  v_value        text;
BEGIN
  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Verify the lens exists and is accessible by the caller
  IF NOT EXISTS (
    SELECT 1 FROM "lenses"."lenses" l
    WHERE  l."id" = p_lens_id
      AND  (l."visibility" = 'public' OR l."lenser_id" = v_lenser_id)
  ) THEN
    RAISE EXCEPTION 'Lens % not found or access denied', p_lens_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- Validate inputs against version_parameters schema (DB-level enforcement)
  -- Raises check_violation if required params missing, types incompatible, or
  -- select values not in options. No-op if p_version_id IS NULL.
  PERFORM "lenses"."fn_validate_inputs"(p_version_id, p_inputs);

  -- Resolve workspace: fall back to lenser's personal workspace
  v_workspace_id := (
    SELECT "w"."id"
    FROM   "tenancy"."workspaces" w
    WHERE  "w"."owner_lenser_id" = v_lenser_id
      AND  "w"."type"            = 'personal'
      AND  "w"."status"          = 'active'
    ORDER  BY "w"."created_at" ASC
    LIMIT  1
  );

  -- Create execution request
  INSERT INTO "execution"."requests" (
    "requester_lenser_id",
    "lens_id",
    "version_id",
    "model_id",
    "input_snapshot",
    "funding_source",
    "byok_key_ref_id",
    "origin_type",
    "runtime_origin"
  ) VALUES (
    v_lenser_id,
    p_lens_id,
    p_version_id,
    p_model_id,
    p_inputs,
    p_funding_source,
    p_byok_key_id,
    'web',
    'cloud'
  )
  RETURNING "id" INTO v_request_id;

  -- Create execution run (queued → picked up by cloud worker)
  INSERT INTO "execution"."runs" (
    "request_id",
    "model_id",
    "status",
    "created_at"
  ) VALUES (
    v_request_id,
    p_model_id,
    'queued',
    now()
  )
  RETURNING "id" INTO v_run_id;

  -- Upsert used parameter values into lenses.version_parameter_contents so the
  -- user's last-used inputs are persisted per (parameter, workspace, lenser).
  -- Input keys are matched by parameter label (consistent with fn_create_lens).
  IF p_version_id IS NOT NULL AND v_workspace_id IS NOT NULL THEN
    FOR v_param_rec IN
      SELECT vp."id", vp."label" AS "key"
      FROM   "lenses"."version_parameters" vp
      WHERE  vp."version_id" = p_version_id
      LIMIT  200
    LOOP
      v_value := p_inputs->>v_param_rec."key";
      CONTINUE WHEN v_value IS NULL;

      INSERT INTO "lenses"."version_parameter_contents" (
        "parameter_id",
        "lenser_id",
        "workspace_id",
        "contents"
      ) VALUES (
        v_param_rec."id",
        v_lenser_id,
        v_workspace_id,
        jsonb_build_object('value', v_value)
      )
      ON CONFLICT ("parameter_id", "workspace_id", "lenser_id")
      DO UPDATE SET
        "contents"   = jsonb_build_object('value', v_value),
        "updated_at" = now();
    END LOOP;
  END IF;

  RETURN v_run_id;
END;
$$;

COMMENT ON FUNCTION "execution"."fn_run_lens"("p_lens_id" "uuid", "p_version_id" "uuid", "p_model_id" "uuid", "p_inputs" "jsonb", "p_funding_source" "text", "p_byok_key_id" "uuid") IS 'SECURITY DEFINER: Creates execution.requests (with version_id) and execution.runs atomically. Validates p_inputs against lenses.version_parameters before creating the request — rejects missing required params, type mismatches, and invalid select values. Upserts supplied parameter values into lenses.version_parameter_contents so the user''s last-used inputs are persisted per (parameter, workspace, lenser). Returns the run_id. Caller must be authenticated. Lens must be public or owned by caller.';


-- ── execution.fn_run_lens (7-arg) ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "execution"."fn_run_lens"("p_lens_id" "uuid", "p_version_id" "uuid", "p_model_id" "uuid", "p_inputs" "jsonb" DEFAULT '{}'::"jsonb", "p_funding_source" "text" DEFAULT 'platform_credit'::"text", "p_byok_key_id" "uuid" DEFAULT NULL::"uuid", "p_workspace_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'execution', 'lenses', 'lensers', 'tenancy', 'public'
    AS $$
DECLARE
  v_lenser_id    uuid := "lensers"."get_auth_lenser_id"();
  v_workspace_id uuid;
  v_request_id   uuid;
  v_run_id       uuid;
  v_param_rec    RECORD;
  v_value        text;
BEGIN
  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Verify the lens exists and is accessible by the caller
  IF NOT EXISTS (
    SELECT 1 FROM "lenses"."lenses" l
    WHERE  l."id" = p_lens_id
      AND  (l."visibility" = 'public' OR l."lenser_id" = v_lenser_id)
  ) THEN
    RAISE EXCEPTION 'Lens % not found or access denied', p_lens_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- Validate inputs against version_parameters schema
  -- (required presence, type compatibility, select enum membership)
  PERFORM "lenses"."fn_validate_inputs"(p_version_id, p_inputs);

  -- Resolve workspace: use provided value or fall back to lenser's personal workspace
  v_workspace_id := COALESCE(p_workspace_id, (
    SELECT "w"."id"
    FROM   "tenancy"."workspaces" w
    WHERE  "w"."owner_lenser_id" = v_lenser_id
      AND  "w"."type"            = 'personal'
      AND  "w"."status"          = 'active'
    ORDER  BY "w"."created_at" ASC
    LIMIT  1
  ));

  -- Create execution request
  INSERT INTO "execution"."requests" (
    "requester_lenser_id",
    "lens_id",
    "version_id",
    "model_id",
    "input_snapshot",
    "funding_source",
    "byok_key_ref_id",
    "workspace_id",
    "origin_type",
    "runtime_origin"
  ) VALUES (
    v_lenser_id,
    p_lens_id,
    p_version_id,
    p_model_id,
    p_inputs,
    p_funding_source,
    p_byok_key_id,
    v_workspace_id,
    'web',
    'cloud'
  )
  RETURNING "id" INTO v_request_id;

  -- Create execution run (queued → picked up by cloud worker)
  INSERT INTO "execution"."runs" (
    "request_id",
    "model_id",
    "status",
    "created_at"
  ) VALUES (
    v_request_id,
    p_model_id,
    'queued',
    now()
  )
  RETURNING "id" INTO v_run_id;

  -- Upsert used parameter values into lenses.version_parameter_contents.
  -- Input keys are matched by parameter label (consistent with fn_create_lens).
  IF p_version_id IS NOT NULL AND v_workspace_id IS NOT NULL THEN
    FOR v_param_rec IN
      SELECT vp."id", vp."label" AS "key"
      FROM   "lenses"."version_parameters" vp
      WHERE  vp."version_id" = p_version_id
      LIMIT  200
    LOOP
      v_value := p_inputs->>v_param_rec."key";
      CONTINUE WHEN v_value IS NULL;

      INSERT INTO "lenses"."version_parameter_contents" (
        "parameter_id",
        "lenser_id",
        "workspace_id",
        "contents"
      ) VALUES (
        v_param_rec."id",
        v_lenser_id,
        v_workspace_id,
        jsonb_build_object('value', v_value)
      )
      ON CONFLICT ("parameter_id", "workspace_id", "lenser_id")
      DO UPDATE SET
        "contents"   = jsonb_build_object('value', v_value),
        "updated_at" = now();
    END LOOP;
  END IF;

  RETURN v_run_id;
END;
$$;

COMMENT ON FUNCTION "execution"."fn_run_lens"("p_lens_id" "uuid", "p_version_id" "uuid", "p_model_id" "uuid", "p_inputs" "jsonb", "p_funding_source" "text", "p_byok_key_id" "uuid", "p_workspace_id" "uuid") IS 'SECURITY DEFINER: Creates execution.requests (with version_id) and execution.runs atomically. Validates p_inputs against lenses.version_parameters before creating the request. Upserts supplied parameter values into lenses.version_parameter_contents. Returns the run_id. Caller must be authenticated. Lens must be public or owned by caller.';


-- ── lenses.fn_validate_inputs ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "lenses"."fn_validate_inputs"("p_version_id" "uuid", "p_inputs" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'media', 'lensers', 'public'
    AS $_$
DECLARE
  vp          RECORD;
  v_raw       text;
  v_schema    jsonb;
  v_min       numeric;
  v_max       numeric;
  v_num       numeric;
  v_caller_id uuid;
BEGIN
  -- No version → nothing to validate (allow ad-hoc / legacy requests)
  IF p_version_id IS NULL THEN
    RETURN;
  END IF;

  v_caller_id := "lensers"."get_auth_lenser_id"();

  -- Join tools to get type, required, options, validation_schema.
  -- Use parameter label as the input key (consistent with fn_create_lens).
  FOR vp IN
    SELECT
      vp_row."label"              AS "key",
      t."type"                    AS "type",
      t."required"                AS "required",
      t."options"                 AS "options",
      t."validation_schema"       AS "validation_schema"
    FROM   "lenses"."version_parameters" vp_row
    JOIN   "lenses"."tools"              t ON t."id" = vp_row."tool_id"
    WHERE  vp_row."version_id" = p_version_id
    ORDER  BY t."sort_order", vp_row."label"
    LIMIT  200
  LOOP
    v_raw    := "p_inputs"->>vp."key";
    v_schema := vp."validation_schema";

    -- 1. Required field must be present and non-empty
    IF vp."required" AND (v_raw IS NULL OR trim(v_raw) = '') THEN
      RAISE EXCEPTION 'Required parameter "%" is missing or empty', vp."key"
        USING ERRCODE = 'check_violation';
    END IF;

    -- Skip type checks for absent optional parameters
    CONTINUE WHEN v_raw IS NULL OR trim(v_raw) = '';

    -- 2. Type-compatibility check + schema enforcement
    BEGIN
      CASE vp."type"

        -- ── Legacy numeric ───────────────────────────────────────────────
        WHEN 'number' THEN
          v_num := v_raw::"numeric";
          IF v_schema IS NOT NULL THEN
            IF v_schema->>'min' IS NOT NULL THEN
              v_min := (v_schema->>'min')::"numeric";
              IF v_num < v_min THEN
                RAISE EXCEPTION 'Parameter "%" value % is below minimum %',
                  vp."key", v_num, v_min USING ERRCODE = 'check_violation';
              END IF;
            END IF;
            IF v_schema->>'max' IS NOT NULL THEN
              v_max := (v_schema->>'max')::"numeric";
              IF v_num > v_max THEN
                RAISE EXCEPTION 'Parameter "%" value % exceeds maximum %',
                  vp."key", v_num, v_max USING ERRCODE = 'check_violation';
              END IF;
            END IF;
          END IF;

        -- ── Integer ──────────────────────────────────────────────────────
        WHEN 'integer' THEN
          v_num := v_raw::"bigint";
          IF v_schema IS NOT NULL THEN
            IF v_schema->>'min' IS NOT NULL THEN
              v_min := (v_schema->>'min')::"numeric";
              IF v_num < v_min THEN
                RAISE EXCEPTION 'Parameter "%" value % is below minimum %',
                  vp."key", v_num, v_min USING ERRCODE = 'check_violation';
              END IF;
            END IF;
            IF v_schema->>'max' IS NOT NULL THEN
              v_max := (v_schema->>'max')::"numeric";
              IF v_num > v_max THEN
                RAISE EXCEPTION 'Parameter "%" value % exceeds maximum %',
                  vp."key", v_num, v_max USING ERRCODE = 'check_violation';
              END IF;
            END IF;
          END IF;

        -- ── Float ────────────────────────────────────────────────────────
        WHEN 'float' THEN
          v_num := v_raw::"double precision";
          IF v_schema IS NOT NULL THEN
            IF v_schema->>'min' IS NOT NULL THEN
              v_min := (v_schema->>'min')::"numeric";
              IF v_num < v_min THEN
                RAISE EXCEPTION 'Parameter "%" value % is below minimum %',
                  vp."key", v_num, v_min USING ERRCODE = 'check_violation';
              END IF;
            END IF;
            IF v_schema->>'max' IS NOT NULL THEN
              v_max := (v_schema->>'max')::"numeric";
              IF v_num > v_max THEN
                RAISE EXCEPTION 'Parameter "%" value % exceeds maximum %',
                  vp."key", v_num, v_max USING ERRCODE = 'check_violation';
              END IF;
            END IF;
          END IF;

        -- ── Decimal / Numeric ─────────────────────────────────────────────
        WHEN 'decimal' THEN
          v_num := v_raw::"numeric";
          IF v_schema IS NOT NULL THEN
            IF v_schema->>'min' IS NOT NULL THEN
              v_min := (v_schema->>'min')::"numeric";
              IF v_num < v_min THEN
                RAISE EXCEPTION 'Parameter "%" value % is below minimum %',
                  vp."key", v_num, v_min USING ERRCODE = 'check_violation';
              END IF;
            END IF;
            IF v_schema->>'max' IS NOT NULL THEN
              v_max := (v_schema->>'max')::"numeric";
              IF v_num > v_max THEN
                RAISE EXCEPTION 'Parameter "%" value % exceeds maximum %',
                  vp."key", v_num, v_max USING ERRCODE = 'check_violation';
              END IF;
            END IF;
          END IF;

        -- ── Boolean ───────────────────────────────────────────────────────
        WHEN 'boolean' THEN
          IF lower(v_raw) NOT IN ('true', 'false', '1', '0') THEN
            RAISE EXCEPTION
              'Parameter "%" must be a boolean value (true/false), got: %',
              vp."key", v_raw
              USING ERRCODE = 'check_violation';
          END IF;

        -- ── JSON ──────────────────────────────────────────────────────────
        WHEN 'json' THEN
          PERFORM v_raw::"jsonb";

        -- ── Select (enum membership) ──────────────────────────────────────
        WHEN 'select' THEN
          IF vp."options" IS NOT NULL
             AND jsonb_typeof(vp."options") = 'array'
             AND NOT EXISTS (
               SELECT 1
               FROM   jsonb_array_elements(vp."options") opt
               WHERE  opt->>'value' = v_raw
             ) THEN
            RAISE EXCEPTION
              'Parameter "%" value "%" is not in the allowed options list',
              vp."key", v_raw
              USING ERRCODE = 'check_violation';
          END IF;

        -- ── URL ───────────────────────────────────────────────────────────
        WHEN 'url' THEN
          -- Must start with http:// or https:// (no scheme injection)
          IF v_raw !~ '^https?://' THEN
            RAISE EXCEPTION
              'Parameter "%" must be a valid URL starting with http:// or https://, got: %',
              vp."key", left(v_raw, 100)
              USING ERRCODE = 'check_violation';
          END IF;
          -- Optional: allowedSchemes from validation_schema
          IF v_schema IS NOT NULL AND v_schema->'urlScheme' IS NOT NULL
             AND jsonb_typeof(v_schema->'urlScheme') = 'array'
             AND NOT EXISTS (
               SELECT 1
               FROM   jsonb_array_elements_text(v_schema->'urlScheme') scheme
               WHERE  lower(v_raw) LIKE lower(scheme) || '://%'
             ) THEN
            RAISE EXCEPTION
              'Parameter "%" URL scheme is not allowed',
              vp."key"
              USING ERRCODE = 'check_violation';
          END IF;

        -- ── Date ──────────────────────────────────────────────────────────
        WHEN 'date' THEN
          PERFORM v_raw::"date";

        -- ── Datetime ──────────────────────────────────────────────────────
        WHEN 'datetime' THEN
          PERFORM v_raw::"timestamptz";

        -- ── File (attachment) ─────────────────────────────────────────────
        WHEN 'file' THEN
          -- Value must be a valid UUID
          IF v_raw !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
            RAISE EXCEPTION
              'Parameter "%" must be a media object UUID, got invalid value',
              vp."key"
              USING ERRCODE = 'check_violation';
          END IF;
          -- Referenced media.objects row must exist and be owned by the caller
          IF v_caller_id IS NOT NULL THEN
            IF NOT EXISTS (
              SELECT 1
              FROM   "media"."objects" mo
              WHERE  mo."id"               = v_raw::"uuid"
                AND  mo."owner_lenser_id"  = v_caller_id
                AND  mo."lifecycle_state" IN ('pending', 'active')
            ) THEN
              RAISE EXCEPTION
                'Parameter "%" references a media object that does not exist or is not accessible',
                vp."key"
                USING ERRCODE = 'check_violation';
            END IF;
          END IF;

        ELSE
          NULL;  -- 'text', 'textarea': no structural enforcement
      END CASE;

    EXCEPTION
      WHEN invalid_text_representation
        OR numeric_value_out_of_range
        OR invalid_parameter_value
        OR invalid_datetime_format
      THEN
        RAISE EXCEPTION
          'Parameter "%" has an invalid value for type "%": %',
          vp."key", vp."type", left(v_raw, 200)
          USING ERRCODE = 'check_violation';
    END;
  END LOOP;
END;
$_$;

COMMENT ON FUNCTION "lenses"."fn_validate_inputs"("p_version_id" "uuid", "p_inputs" "jsonb") IS 'GRASP Information Expert: validates execution inputs against the declared version_parameters for a given lens version. Joins lenses.tools via tool_id to resolve type, required, options, and validation_schema. Uses parameter label as the input key. Supports types: text, textarea, number, integer, float, decimal, boolean, json, select, url (regex + scheme allowlist), date, datetime, file (UUID + caller-owned media.objects row). Called by execution.fn_run_lens. SECURITY DEFINER.';
