-- Public wrapper for lenses.fn_update_lens.
-- Fixes PGRST202: PostgREST only exposes functions in the public schema,
-- so the client's rpc('fn_update_lens', ...) was resolving to a non-existent
-- public.fn_update_lens. Mirrors the same pattern as public.fn_create_lens.

CREATE OR REPLACE FUNCTION "public"."fn_update_lens"(
  "p_lens_id"       uuid,
  "p_template_body" text    DEFAULT NULL,
  "p_visibility"    text    DEFAULT NULL,
  "p_title"         text    DEFAULT NULL,
  "p_description"   text    DEFAULT NULL,
  "p_tag_ids"       uuid[]  DEFAULT NULL,
  "p_params"        jsonb   DEFAULT NULL
) RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'lenses', 'content', 'lensers', 'auth'
AS $$
BEGIN
  PERFORM lenses.fn_update_lens(
    p_lens_id       := p_lens_id,
    p_template_body := p_template_body,
    p_visibility    := CASE WHEN p_visibility IS NULL THEN NULL
                            ELSE p_visibility::content.visibility_enum
                       END,
    p_title         := p_title,
    p_description   := p_description,
    p_tag_ids       := p_tag_ids,
    p_params        := p_params
  );
END;
$$;

ALTER FUNCTION "public"."fn_update_lens"(
  uuid, text, text, text, text, uuid[], jsonb
) OWNER TO postgres;

COMMENT ON FUNCTION "public"."fn_update_lens"(uuid, text, text, text, text, uuid[], jsonb) IS
  'Public wrapper for lenses.fn_update_lens. Casts p_visibility text → content.visibility_enum.
   Auth enforced by inner function. Fixes PGRST202 for lensesRepository.updateLens.';

GRANT EXECUTE ON FUNCTION "public"."fn_update_lens"(uuid, text, text, text, text, uuid[], jsonb)
  TO authenticated;
