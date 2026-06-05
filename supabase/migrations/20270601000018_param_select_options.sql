-- Migration: persist per-param select/multiselect options
-- 0. Add options column to version_parameters (if not already present)
-- 1. fn_create_lens  — store options from p_params JSON
-- 2. fn_update_lens  — same
-- 3. fn_get_version_params_with_tools — return COALESCE(vp.options, t.options)
--    so param-level options override the shared tool defaults

ALTER TABLE lenses.version_parameters
  ADD COLUMN IF NOT EXISTS "options" jsonb DEFAULT NULL;

-- ──────────────────────────────────────────────────────────────
-- 1. fn_create_lens
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "lenses"."fn_create_lens"(
  "p_visibility"              "content"."visibility_enum",
  "p_template_body"           "text",
  "p_title"                   "text",
  "p_description"             "text"    DEFAULT NULL::"text",
  "p_language_code"           "text"    DEFAULT 'en'::"text",
  "p_params"                  "jsonb"   DEFAULT '[]'::"jsonb",
  "p_tag_ids"                 "uuid"[]  DEFAULT '{}'::"uuid"[],
  "p_parent_lens_id"          "uuid"    DEFAULT NULL::"uuid",
  "p_forked_from_execution_id" "uuid"   DEFAULT NULL::"uuid"
) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'content', 'lensers', 'public'
    AS $$
DECLARE
  v_caller_id   uuid;
  v_new_lens_id uuid;
  v_new_version lenses.versions;
  v_tag_id      uuid;
  v_param       jsonb;
  v_param_id    uuid;
  v_text_tool   uuid;
  v_uuid_body   text;
BEGIN
  v_caller_id := lensers.get_auth_lenser_id();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF length(trim(p_template_body)) < 50 THEN
    RAISE EXCEPTION 'template_body must be at least 50 characters (got %)',
      length(trim(p_template_body)) USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO lenses.lenses (
    lenser_id, visibility, status,
    parent_lens_id, forked_from_execution_id
  ) VALUES (
    v_caller_id, p_visibility, 'published'::content.content_status,
    p_parent_lens_id, p_forked_from_execution_id
  ) RETURNING id INTO v_new_lens_id;

  v_new_version := lenses.fn_create_draft_version(
    v_new_lens_id, p_template_body, 'Initial version'
  );

  UPDATE lenses.lenses SET head_version_id = v_new_version.id WHERE id = v_new_lens_id;

  v_uuid_body := p_template_body;

  IF p_params IS NOT NULL AND jsonb_array_length(p_params) > 0 THEN
    SELECT id INTO v_text_tool FROM lenses.tools WHERE key = 'text' LIMIT 1;

    FOR v_param IN SELECT * FROM jsonb_array_elements(p_params) LOOP
      INSERT INTO lenses.version_parameters (version_id, label, tool_id, options)
      VALUES (
        v_new_version.id,
        v_param->>'label',
        COALESCE(NULLIF(v_param->>'tool_id', '')::uuid, v_text_tool),
        CASE
          WHEN v_param->'options' IS NOT NULL
           AND jsonb_typeof(v_param->'options') = 'array'
          THEN v_param->'options'
          ELSE NULL
        END
      )
      RETURNING id INTO v_param_id;

      v_uuid_body := replace(
        v_uuid_body,
        '[[' || (v_param->>'label') || ']]',
        '[[:'|| v_param_id::text ||']]'
      );
    END LOOP;

    UPDATE lenses.versions SET template_body = v_uuid_body WHERE id = v_new_version.id;
  END IF;

  INSERT INTO content.entity_translations (
    entity_type, entity_id, language_code, is_original,
    title, description, content
  ) VALUES (
    'lens'::content.entity_type_enum, v_new_lens_id,
    COALESCE(p_language_code, 'en'), true,
    p_title, p_description, p_template_body
  );

  IF p_tag_ids IS NOT NULL AND array_length(p_tag_ids, 1) > 0 THEN
    FOREACH v_tag_id IN ARRAY p_tag_ids LOOP
      INSERT INTO content.tag_map (entity_type, entity_id, tag_id)
      VALUES ('lens'::content.entity_type_enum, v_new_lens_id, v_tag_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  RETURN v_new_lens_id;
END;
$$;

COMMENT ON FUNCTION "lenses"."fn_create_lens"(
  "content"."visibility_enum","text","text","text","text","jsonb","uuid"[],"uuid","uuid"
) IS 'GRASP Creator: creates a lens with its initial draft version, version_parameters (including per-param options for select/multiselect), translation, and tag associations atomically. p_params is a jsonb array of {label, tool_id, optional, options} objects. SECURITY DEFINER: auth checked internally.';


-- ──────────────────────────────────────────────────────────────
-- 2. fn_update_lens
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "lenses"."fn_update_lens"(
  "p_lens_id"       "uuid",
  "p_template_body" "text"                      DEFAULT NULL::"text",
  "p_visibility"    "content"."visibility_enum" DEFAULT NULL::"content"."visibility_enum",
  "p_title"         "text"                      DEFAULT NULL::"text",
  "p_description"   "text"                      DEFAULT NULL::"text",
  "p_tag_ids"       "uuid"[]                    DEFAULT NULL::"uuid"[],
  "p_params"        "jsonb"                     DEFAULT NULL::"jsonb"
) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'content', 'lensers', 'public'
    AS $$
DECLARE
  v_caller_id   uuid;
  v_owner_id    uuid;
  v_tag_id      uuid;
  v_new_version lenses.versions;
  v_param       jsonb;
  v_param_id    uuid;
  v_text_tool   uuid;
  v_uuid_body   text;
BEGIN
  v_caller_id := lensers.get_auth_lenser_id();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT lenser_id INTO v_owner_id FROM lenses.lenses WHERE id = p_lens_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lens not found: %', p_lens_id USING ERRCODE = 'no_data_found';
  END IF;
  IF v_owner_id <> v_caller_id THEN
    RAISE EXCEPTION 'Permission denied: you do not own this lens' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_visibility IS NOT NULL THEN
    UPDATE lenses.lenses SET visibility = p_visibility WHERE id = p_lens_id;
  END IF;

  IF p_template_body IS NOT NULL THEN
    IF length(trim(p_template_body)) < 50 THEN
      RAISE EXCEPTION 'template_body must be at least 50 characters (got %)',
        length(trim(p_template_body)) USING ERRCODE = 'check_violation';
    END IF;

    v_new_version := lenses.fn_create_draft_version(p_lens_id, p_template_body, 'Updated via lens edit');

    v_uuid_body := p_template_body;

    IF p_params IS NOT NULL AND jsonb_array_length(p_params) > 0 THEN
      SELECT id INTO v_text_tool FROM lenses.tools WHERE key = 'text' LIMIT 1;

      FOR v_param IN SELECT * FROM jsonb_array_elements(p_params) LOOP
        INSERT INTO lenses.version_parameters (version_id, label, tool_id, options)
        VALUES (
          v_new_version.id,
          v_param->>'label',
          COALESCE(NULLIF(v_param->>'tool_id', '')::uuid, v_text_tool),
          CASE
            WHEN v_param->'options' IS NOT NULL
             AND jsonb_typeof(v_param->'options') = 'array'
            THEN v_param->'options'
            ELSE NULL
          END
        )
        RETURNING id INTO v_param_id;

        v_uuid_body := replace(
          v_uuid_body,
          '[[' || (v_param->>'label') || ']]',
          '[[:'|| v_param_id::text ||']]'
        );
      END LOOP;

      UPDATE lenses.versions SET template_body = v_uuid_body WHERE id = v_new_version.id;
    END IF;
  END IF;

  IF p_title IS NOT NULL OR p_description IS NOT NULL OR p_template_body IS NOT NULL THEN
    UPDATE content.entity_translations
    SET
      title       = COALESCE(p_title,        title),
      description = COALESCE(p_description,  description),
      content     = COALESCE(p_template_body, content)
    WHERE entity_type = 'lens'::content.entity_type_enum
      AND entity_id   = p_lens_id
      AND is_original = true;
  END IF;

  IF p_tag_ids IS NOT NULL THEN
    DELETE FROM content.tag_map
    WHERE entity_type = 'lens'::content.entity_type_enum AND entity_id = p_lens_id;

    IF array_length(p_tag_ids, 1) > 0 THEN
      FOREACH v_tag_id IN ARRAY p_tag_ids LOOP
        INSERT INTO content.tag_map (entity_type, entity_id, tag_id)
        VALUES ('lens'::content.entity_type_enum, p_lens_id, v_tag_id)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;
  END IF;
END;
$$;


-- ──────────────────────────────────────────────────────────────
-- 3. fn_get_version_params_with_tools
--    COALESCE(vp.options, t.options) — param-level options win
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "lenses"."fn_get_version_params_with_tools"("p_version_id" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'public'
    AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id',        vp.id,
        'version_id', vp.version_id,
        'label',     vp.label,
        'tool_id',   vp.tool_id,
        'tool', jsonb_build_object(
          'id',               t.id,
          'key',              t.key,
          'label',            t.label,
          'description',      t.description,
          'category',         t.category,
          'type',             t.type,
          'required',         t.required,
          'min_length',       t.min_length,
          'max_length',       t.max_length,
          'placeholder',      t.placeholder,
          'help_text',        t.help_text,
          'validation_schema', t.validation_schema,
          'options',          COALESCE(vp.options, t.options),
          'sort_order',       t.sort_order,
          'is_system',        t.is_system,
          'icon',             t.icon,
          'color',            t.color
        )
      )
      ORDER BY t.sort_order, vp.label
    ),
    '[]'::jsonb
  )
  FROM  lenses.version_parameters vp
  JOIN  lenses.tools t ON t.id = vp.tool_id
  WHERE vp.version_id = p_version_id;
$$;
