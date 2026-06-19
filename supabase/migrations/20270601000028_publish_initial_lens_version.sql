-- Fix: public/community lenses should have their initial version published immediately.
--
-- Root cause:
--   fn_create_lens (migration 019) calls fn_create_draft_version, which always inserts
--   a lenses.versions row with status = 'draft'. The lens row itself is created with
--   status = 'published', but every RPC that serves non-owners (fn_get_lens_detail_bootstrap,
--   fn_get_lens_version_detail, fn_get_lens_version_parameters) gates access on
--   v.status = 'published'. Result: a brand-new public lens always has
--   latest_published_version = null for anonymous/non-owner viewers.
--
-- Fix:
--   1. Update fn_create_lens to publish the initial version automatically for any
--      visibility != 'private'.
--   2. Backfill existing public/community lenses whose head version is still a draft
--      (no published version exists for them at all).

-- ── 1. fn_create_lens: auto-publish initial version for non-private lenses ───

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

  -- Immediately publish the initial version for non-private lenses so that
  -- anonymous and non-owner viewers can access the content right away.
  IF p_visibility != 'private'::content.visibility_enum THEN
    UPDATE lenses.versions
    SET status = 'published'::content.content_status, published_at = now()
    WHERE id = v_new_version.id;
  END IF;

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

ALTER FUNCTION lenses.fn_create_lens(
  content.visibility_enum, text, text, text, text, jsonb, uuid[], uuid, uuid
) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION lenses.fn_create_lens(
  content.visibility_enum, text, text, text, text, jsonb, uuid[], uuid, uuid
) TO authenticated, service_role;

-- ── 2. Backfill: publish head version for existing public/community lenses ───
--
-- Targets lenses where:
--   - visibility is public or community
--   - no published version exists
--   - head_version_id points to a draft version
--
-- Safe to run multiple times (WHERE v.status = 'draft' guard prevents double-publish).

UPDATE lenses.versions v
SET
  status       = 'published'::content.content_status,
  published_at = COALESCE(v.created_at, now())
FROM lenses.lenses l
WHERE l.head_version_id = v.id
  AND l.visibility IN (
    'public'::content.visibility_enum,
    'community'::content.visibility_enum
  )
  AND v.status = 'draft'::content.content_status
  AND NOT EXISTS (
    SELECT 1
    FROM lenses.versions pv
    WHERE pv.lens_id = l.id
      AND pv.status  = 'published'::content.content_status
  );
