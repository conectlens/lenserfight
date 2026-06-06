-- Fix regressions introduced in 20270601000018_param_select_options.sql.
--
-- That migration, while adding per-param `options`, accidentally:
--   1. Replaced the robust lenses.fn_replace_param_label_token() (case-insensitive,
--      tolerant of [[label!]] optional markers and surrounding whitespace) with a
--      naive replace('[[' || label || ']]', ...). Exact-match replace cannot rewrite
--      optional [[label!]] tokens, so they linger as named tokens in the stored body.
--      The Lab form derives its visible params from named tokens in the body and skips
--      [[:uuid]] refs — so only the (un-rewritten) optional params rendered.
--   2. Dropped the `optional` column from the version_parameters INSERT, so every param
--      was saved optional = false.
--   3. Dropped the 'optional' field from fn_get_version_params_with_tools output.
--
-- This migration restores all three behaviours WITHOUT losing the new `options` support.
-- (It also restores the head_version_id update in fn_update_lens, dropped in 18.)
-- Existing draft bodies saved with mixed tokens are repaired naturally on the next save;
-- the Lab form is also hardened client-side to resolve [[:uuid]] refs defensively.

-- ──────────────────────────────────────────────────────────────
-- 1. fn_create_lens — robust token rewrite + optional + options
-- ──────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS lenses.fn_create_lens(
  content.visibility_enum, text, text, text, text, jsonb, uuid[], uuid, uuid
);
CREATE OR REPLACE FUNCTION lenses.fn_create_lens(
  p_visibility               content.visibility_enum,
  p_template_body            text,
  p_title                    text,
  p_description              text    DEFAULT NULL,
  p_language_code            text    DEFAULT 'en',
  p_params                   jsonb   DEFAULT '[]'::jsonb,
  p_tag_ids                  uuid[]  DEFAULT '{}'::uuid[],
  p_parent_lens_id           uuid    DEFAULT NULL,
  p_forked_from_execution_id uuid    DEFAULT NULL
) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'lenses', 'content', 'lensers', 'public'
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
      INSERT INTO lenses.version_parameters (version_id, label, tool_id, optional, options)
      VALUES (
        v_new_version.id,
        v_param->>'label',
        COALESCE(NULLIF(v_param->>'tool_id', '')::uuid, v_text_tool),
        COALESCE((v_param->>'optional')::boolean, false),
        CASE
          WHEN v_param->'options' IS NOT NULL
           AND jsonb_typeof(v_param->'options') = 'array'
          THEN v_param->'options'
          ELSE NULL
        END
      )
      RETURNING id INTO v_param_id;

      v_uuid_body := lenses.fn_replace_param_label_token(
        v_uuid_body,
        v_param->>'label',
        '[[:' || v_param_id::text || ']]'
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

COMMENT ON FUNCTION lenses.fn_create_lens(
  content.visibility_enum, text, text, text, text, jsonb, uuid[], uuid, uuid
) IS 'GRASP Creator: creates a lens with its initial draft version, version_parameters (optional flag + per-param options for select/multiselect), translation, and tag associations atomically. p_params is a jsonb array of {label, tool_id, optional, options} objects. Token rewrite uses fn_replace_param_label_token so [[label!]] optional tokens are rewritten too. SECURITY DEFINER: auth checked internally.';

-- Restore owner + grants (DROP above reset them); SECURITY DEFINER runs as owner.
ALTER FUNCTION lenses.fn_create_lens(
  content.visibility_enum, text, text, text, text, jsonb, uuid[], uuid, uuid
) OWNER TO postgres;
GRANT ALL ON FUNCTION lenses.fn_create_lens(
  content.visibility_enum, text, text, text, text, jsonb, uuid[], uuid, uuid
) TO authenticated;


-- ──────────────────────────────────────────────────────────────
-- 2. fn_update_lens — robust token rewrite + optional + options + HEAD update
-- ──────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS lenses.fn_update_lens(
  uuid, text, content.visibility_enum, text, text, uuid[], jsonb
);
CREATE OR REPLACE FUNCTION lenses.fn_update_lens(
  p_lens_id       uuid,
  p_template_body text                      DEFAULT NULL,
  p_visibility    content.visibility_enum   DEFAULT NULL,
  p_title         text                      DEFAULT NULL,
  p_description   text                      DEFAULT NULL,
  p_tag_ids       uuid[]                    DEFAULT NULL,
  p_params        jsonb                     DEFAULT NULL
) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'lenses', 'content', 'lensers', 'public'
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
        INSERT INTO lenses.version_parameters (version_id, label, tool_id, optional, options)
        VALUES (
          v_new_version.id,
          v_param->>'label',
          COALESCE(NULLIF(v_param->>'tool_id', '')::uuid, v_text_tool),
          COALESCE((v_param->>'optional')::boolean, false),
          CASE
            WHEN v_param->'options' IS NOT NULL
             AND jsonb_typeof(v_param->'options') = 'array'
            THEN v_param->'options'
            ELSE NULL
          END
        )
        RETURNING id INTO v_param_id;

        v_uuid_body := lenses.fn_replace_param_label_token(
          v_uuid_body,
          v_param->>'label',
          '[[:' || v_param_id::text || ']]'
        );
      END LOOP;

      UPDATE lenses.versions SET template_body = v_uuid_body WHERE id = v_new_version.id;
    END IF;

    UPDATE lenses.lenses SET head_version_id = v_new_version.id WHERE id = p_lens_id;
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


-- Restore owner + grants for fn_update_lens (DROP above reset them).
ALTER FUNCTION lenses.fn_update_lens(
  uuid, text, content.visibility_enum, text, text, uuid[], jsonb
) OWNER TO postgres;
GRANT ALL ON FUNCTION lenses.fn_update_lens(
  uuid, text, content.visibility_enum, text, text, uuid[], jsonb
) TO authenticated;


-- ──────────────────────────────────────────────────────────────
-- 3. fn_get_version_params_with_tools — restore 'optional', keep COALESCE(options)
-- ──────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS lenses.fn_get_version_params_with_tools(uuid);
CREATE OR REPLACE FUNCTION lenses.fn_get_version_params_with_tools(p_version_id uuid) RETURNS jsonb
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'lenses', 'public'
    AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id',         vp.id,
        'version_id', vp.version_id,
        'label',      vp.label,
        'tool_id',    vp.tool_id,
        'optional',   COALESCE(vp.optional, false),
        'tool', jsonb_build_object(
          'id',                t.id,
          'key',               t.key,
          'label',             t.label,
          'description',       t.description,
          'category',          t.category,
          'type',              t.type,
          'required',          t.required,
          'min_length',        t.min_length,
          'max_length',        t.max_length,
          'placeholder',       t.placeholder,
          'help_text',         t.help_text,
          'validation_schema', t.validation_schema,
          'options',           COALESCE(vp.options, t.options),
          'sort_order',        t.sort_order,
          'is_system',         t.is_system,
          'icon',              t.icon,
          'color',             t.color
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

-- Restore owner + grants for fn_get_version_params_with_tools (DROP above reset them).
ALTER FUNCTION lenses.fn_get_version_params_with_tools(uuid) OWNER TO postgres;
GRANT ALL ON FUNCTION lenses.fn_get_version_params_with_tools(uuid) TO anon, authenticated;
