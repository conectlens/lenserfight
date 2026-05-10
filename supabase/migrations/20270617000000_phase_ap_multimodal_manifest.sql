-- =============================================================================
-- Phase AP — Multimodal / Combined Workflows
-- =============================================================================
-- 1. media_manifest JSONB column on lenses.workflow_runs — ordered list of
--    {object_id, media_type, mime_type, node_id, added_at} populated by the
--    application layer (WorkflowExecutionService) on node completion.
--    Application-level write is preferred over a cross-schema trigger here
--    because the chain execution.artifact_medias → artifacts → runs →
--    lenses.workflow_node_results → lenses.workflow_runs is four tables long
--    and fragile to future schema changes.
--
-- 2. fn_append_workflow_run_media — service_role RPC called by the worker
--    to append a media manifest entry atomically.
--
-- 3. fn_assert_modality_allowed — pre-dispatch guard; raises modality_not_allowed
--    when the agent policy does not permit the requested output modality.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. media_manifest column
-- ---------------------------------------------------------------------------
ALTER TABLE lenses.workflow_runs
  ADD COLUMN IF NOT EXISTS media_manifest JSONB NOT NULL DEFAULT '[]'::JSONB;

COMMENT ON COLUMN lenses.workflow_runs.media_manifest IS
  'AP: Ordered list of media produced by this run. Each entry: '
  '{object_id, media_type, mime_type, node_id, added_at}. '
  'Populated by fn_append_workflow_run_media via WorkflowExecutionService.';

-- ---------------------------------------------------------------------------
-- 2. fn_append_workflow_run_media — worker appends one entry at a time
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_append_workflow_run_media(
  p_run_id     UUID,
  p_object_id  UUID,
  p_media_type TEXT,
  p_mime_type  TEXT,
  p_node_id    TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = lenses, media, public
AS $$
BEGIN
  UPDATE lenses.workflow_runs
  SET media_manifest = media_manifest || jsonb_build_object(
    'object_id',  p_object_id,
    'media_type', p_media_type,
    'mime_type',  p_mime_type,
    'node_id',    p_node_id,
    'added_at',   now()
  )
  WHERE id = p_run_id;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_append_workflow_run_media(UUID, UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_append_workflow_run_media(UUID, UUID, TEXT, TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION public.fn_append_workflow_run_media IS
  'AP: Appends a media object entry to lenses.workflow_runs.media_manifest. '
  'Called by the WorkflowExecutionService after fn_complete_async_run succeeds. '
  'SECURITY DEFINER; service_role only.';

-- ---------------------------------------------------------------------------
-- 3. fn_assert_modality_allowed — pre-dispatch guard
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_assert_modality_allowed(
  p_agent_id UUID,
  p_modality TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = agents, public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM agents.policies ap
    WHERE ap.ai_lenser_id = p_agent_id
      AND p_modality = ANY(ap.allowed_output_modalities)
  ) THEN
    RAISE EXCEPTION 'modality_not_allowed: agent % cannot produce % output. '
      'Update agents.policies.allowed_output_modalities to unlock.', p_agent_id, p_modality
    USING ERRCODE = 'P0001';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_assert_modality_allowed(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_assert_modality_allowed(UUID, TEXT) TO service_role;

COMMENT ON FUNCTION public.fn_assert_modality_allowed IS
  'AP: Raises modality_not_allowed if p_modality is not in agents.policies.allowed_output_modalities '
  'for p_agent_id. Called by WorkflowExecutionService before dispatching any non-text generative node. '
  'SECURITY DEFINER; service_role only.';
