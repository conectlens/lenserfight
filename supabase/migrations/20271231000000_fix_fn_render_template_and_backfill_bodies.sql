-- =============================================================================
-- Fix fn_render_template column refs + backfill seeded template_body values
-- =============================================================================
-- Problem:
--   lenses.fn_render_template referenced columns (key, type, required,
--   default_value, sort_order) that do not exist on lenses.version_parameters.
--   The same class of bug was fixed for fn_clone_lens, fn_run_lens, and
--   fn_validate_inputs in 20270202000000_fix_version_parameters_column_refs.sql
--   but fn_render_template was missed.
--
--   Additionally, all seed files (40, 41, 45, 47, 50) stored template_body using the
--   [[:uuid]] format (via SQL concat: '[[:' || param_uuid || ']]').
--   fn_render_template substitutes [[label]] tokens using the parameter label as
--   key, so [[:uuid]] tokens were never resolved — they passed verbatim to the AI.
--   Seeds have been updated to use [[label]] directly. This migration backfills
--   the already-deployed rows.
--
-- Changes:
--   1. Rewrite fn_render_template: join version_parameters ↔ tools to obtain
--      type/required; use label as the input key; handle both [[label]] and
--      [[:uuid]] bodies for backward compatibility.
--   2. Backfill: convert any version rows whose template_body still contains
--      [[:uuid]] tokens to [[label]] format via fn_render_version_body.
-- =============================================================================

-- ── 1. Fix lenses.fn_render_template ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION "lenses"."fn_render_template"(
    "p_version_id" "uuid",
    "p_inputs"     "jsonb"
) RETURNS "text"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'lenses', 'public'
AS $$
DECLARE
    v_template  text;
    v_rendered  text;
    v_param     record;
    v_val       text;
BEGIN
    -- Fetch the stored template body (may be [[label]] or legacy [[:uuid]] format)
    SELECT template_body
      INTO STRICT v_template
      FROM lenses.versions
     WHERE id = p_version_id;

    v_rendered := v_template;

    -- Join version_parameters → tools to get label, type, required.
    -- Use parameter label as the input key (consistent with fn_create_lens and
    -- fn_validate_inputs as fixed in 20270202000000_fix_version_parameters_column_refs).
    FOR v_param IN
        SELECT vp.id,
               vp.label,
               t.type,
               t.required
          FROM lenses.version_parameters vp
          JOIN lenses.tools t ON t.id = vp.tool_id
         WHERE vp.version_id = p_version_id
         ORDER BY vp.label
    LOOP
        -- Step 1: convert legacy [[:uuid]] token → [[label]] if still present.
        -- This handles rows created via fn_create_lens before this fix.
        v_rendered := replace(
            v_rendered,
            '[[:'|| v_param.id::text ||']]',
            '[[' || v_param.label || ']]'
        );

        -- Step 2: resolve caller-supplied value for this label
        v_val := NULLIF(trim(p_inputs ->> v_param.label), '');

        -- Enforce required parameters
        IF v_val IS NULL AND v_param.required THEN
            RAISE EXCEPTION
                'Required parameter ''%'' is missing or empty',
                v_param.label
                USING ERRCODE = '23514'; -- check_violation
        END IF;

        -- Step 3: substitute [[label]] with the resolved value
        v_rendered := replace(
            v_rendered,
            '[[' || v_param.label || ']]',
            coalesce(v_val, '')
        );
    END LOOP;

    RETURN v_rendered;

EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RAISE EXCEPTION 'Version % not found', p_version_id
            USING ERRCODE = 'P0002';
END;
$$;

COMMENT ON FUNCTION "lenses"."fn_render_template"("p_version_id" "uuid", "p_inputs" "jsonb") IS
'Renders a lens version template_body by substituting [[label]] tokens with
 caller-supplied inputs (p_inputs jsonb keyed by parameter label). Also handles
 legacy [[:uuid]] bodies by converting them to [[label]] first. Joins
 lenses.version_parameters → lenses.tools to resolve type and required.
 Raises 23514 on missing required params. Called by fn_worker_render_template.
 Fixed in 20271231000000: removed refs to non-existent version_parameters columns
 (key, type, required, default_value, sort_order). SECURITY DEFINER.';


-- ── 2. Backfill: convert [[:uuid]] → [[label]] in stored template_body rows ──
-- Uses fn_render_version_body which already does this conversion correctly.
-- Only updates rows that still contain at least one [[:…]] token.
-- Wraps each update in a sub-block so a missing parameter mapping for any
-- single version does not abort the entire backfill.
DO $$
DECLARE
    v_ver RECORD;
    v_new_body text;
BEGIN
    FOR v_ver IN
        SELECT id
          FROM lenses.versions
         WHERE template_body LIKE '%[[:%'
         ORDER BY created_at
    LOOP
        BEGIN
            v_new_body := lenses.fn_render_version_body(v_ver.id);
            IF v_new_body IS NOT NULL AND v_new_body <> (
                SELECT template_body FROM lenses.versions WHERE id = v_ver.id
            ) THEN
                UPDATE lenses.versions
                   SET template_body = v_new_body
                 WHERE id = v_ver.id;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'fn_render_template backfill: could not convert version % — %',
                v_ver.id, SQLERRM;
        END;
    END LOOP;

    RAISE NOTICE 'fn_render_template backfill: completed for versions matching %%[[:%%';
END;
$$;

ANALYZE lenses.versions;
