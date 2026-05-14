-- =============================================================================
-- pgTAP — Phase AP: multimodal manifest + modality guard
-- =============================================================================
BEGIN;

SELECT plan(6);

-- 1. media_manifest column exists on lenses.workflow_runs
SELECT has_column(
  'lenses', 'workflow_runs', 'media_manifest',
  'lenses.workflow_runs.media_manifest column should exist (AP)'
);

-- 2. media_manifest defaults to empty array
SELECT ok(
  (
    SELECT column_default = '''[]''::jsonb'
    FROM information_schema.columns
    WHERE table_schema = 'lenses'
      AND table_name = 'workflow_runs'
      AND column_name = 'media_manifest'
  ),
  'media_manifest should default to empty JSON array'
);

-- 3. fn_append_workflow_run_media exists
SELECT has_function(
  'public',
  'fn_append_workflow_run_media',
  ARRAY['uuid', 'uuid', 'text', 'text', 'text'],
  'fn_append_workflow_run_media should exist with correct signature'
);

-- 4. fn_assert_modality_allowed exists
SELECT has_function(
  'public',
  'fn_assert_modality_allowed',
  ARRAY['uuid', 'text'],
  'fn_assert_modality_allowed should exist with correct signature'
);

-- 5. fn_assert_modality_allowed raises for disallowed modality
-- Create a temp agent without any policies (allowed_output_modalities defaults to ['text'])
SELECT throws_ok(
  $test$
    DO $do$
    DECLARE
      v_agent_id UUID;
    BEGIN
      -- Use a random UUID that has no agents.policies row → modality check fails
      v_agent_id := '00000000-0000-0000-0000-000000000099'::uuid;
      PERFORM public.fn_assert_modality_allowed(v_agent_id, 'video');
    END;
    $do$
  $test$,
  'P0001',
  NULL,
  'fn_assert_modality_allowed should raise P0001 for unknown agent + video modality'
);

-- 6. fn_append_workflow_run_media is granted to service_role only
SELECT ok(
  NOT has_function_privilege('authenticated', 'public.fn_append_workflow_run_media(uuid,uuid,text,text,text)', 'EXECUTE'),
  'fn_append_workflow_run_media should NOT be executable by authenticated role'
);

SELECT finish();
ROLLBACK;
