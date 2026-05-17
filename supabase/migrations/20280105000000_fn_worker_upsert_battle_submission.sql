-- Phase CT — Worker-side battle submission upsert RPC.
--
-- The battle-worker.ts calls fn_worker_upsert_battle_submission to store both
-- text and generative media (image / video / audio / music) results from
-- AI contenders. This function runs under service_role — it does NOT check
-- auth.uid() — and is intentionally NOT granted to authenticated or anon.
--
-- Parameters
-- ----------
-- p_content_text    : text output (text battles)
-- p_media_url       : public/signed URL from the generative media provider
--                     (sync: image / audio; async-polled: video / music)
-- p_mime_type       : MIME type of the media file (e.g. 'image/png', 'audio/mpeg')
-- p_output_modality : 'text' | 'image' | 'video' | 'audio'
-- p_execution_run_id: optional FK to execution.runs for provenance
-- p_artifact_id     : optional FK to an artifact/task record
-- p_is_final        : whether this is the final, immutable submission
--
-- Content constraint workaround
-- ------------------------------
-- battles.submissions has:
--   CONSTRAINT submissions_content_required CHECK (
--     (status = 'pending') OR (content_text IS NOT NULL) OR (content_url IS NOT NULL)
--   )
-- For media submissions we satisfy this by mirroring p_media_url into content_url.
-- For async-pending submissions (taskId stored in p_artifact_id, no URL yet) we
-- set status = 'pending', which also satisfies the constraint.

CREATE OR REPLACE FUNCTION public.fn_worker_upsert_battle_submission(
  p_battle_id         uuid,
  p_contender_id      uuid,
  p_content_text      text    DEFAULT NULL,
  p_execution_run_id  uuid    DEFAULT NULL,
  p_artifact_id       uuid    DEFAULT NULL,
  p_is_final          boolean DEFAULT true,
  p_media_url         text    DEFAULT NULL,
  p_mime_type         text    DEFAULT NULL,
  p_output_modality   text    DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, battles
AS $$
DECLARE
  v_status        text;
  v_content_url   text;
  v_submitted_at  timestamptz;
BEGIN
  -- Determine status and whether we have a final value to submit.
  -- Async-pending: media_url is NULL (task not yet polled), artifact_id holds
  -- the providerTaskId for the poll worker.
  IF p_content_text IS NOT NULL OR p_media_url IS NOT NULL THEN
    v_status       := 'submitted';
    v_submitted_at := now();
    -- Mirror media_url into content_url to satisfy submissions_content_required.
    v_content_url  := p_media_url;
  ELSE
    -- No content yet: async media task is pending.
    v_status       := 'pending';
    v_submitted_at := NULL;
    v_content_url  := NULL;
  END IF;

  INSERT INTO battles.submissions (
    battle_id,
    contender_id,
    content_text,
    content_url,
    media_url,
    mime_type,
    output_modality,
    execution_run_id,
    artifact_id,
    is_final,
    status,
    source_type,
    submitted_at
  ) VALUES (
    p_battle_id,
    p_contender_id,
    p_content_text,
    v_content_url,
    p_media_url,
    p_mime_type,
    COALESCE(p_output_modality, CASE WHEN p_content_text IS NOT NULL THEN 'text' ELSE NULL END),
    p_execution_run_id,
    p_artifact_id,
    p_is_final,
    v_status,
    'execution_output',
    v_submitted_at
  )
  ON CONFLICT (battle_id, contender_id) DO UPDATE
    SET content_text      = COALESCE(EXCLUDED.content_text,      battles.submissions.content_text),
        content_url       = COALESCE(EXCLUDED.content_url,       battles.submissions.content_url),
        media_url         = COALESCE(EXCLUDED.media_url,         battles.submissions.media_url),
        mime_type         = COALESCE(EXCLUDED.mime_type,         battles.submissions.mime_type),
        output_modality   = COALESCE(EXCLUDED.output_modality,   battles.submissions.output_modality),
        execution_run_id  = COALESCE(EXCLUDED.execution_run_id,  battles.submissions.execution_run_id),
        artifact_id       = COALESCE(EXCLUDED.artifact_id,       battles.submissions.artifact_id),
        is_final          = EXCLUDED.is_final,
        status            = EXCLUDED.status,
        submitted_at      = COALESCE(battles.submissions.submitted_at, EXCLUDED.submitted_at),
        updated_at        = now();
END;
$$;

ALTER FUNCTION public.fn_worker_upsert_battle_submission(
  uuid, uuid, text, uuid, uuid, boolean, text, text, text
) OWNER TO postgres;

-- Service-role only: AI contenders submit via the worker, not via user sessions.
REVOKE ALL ON FUNCTION public.fn_worker_upsert_battle_submission(
  uuid, uuid, text, uuid, uuid, boolean, text, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_worker_upsert_battle_submission(
  uuid, uuid, text, uuid, uuid, boolean, text, text, text
) TO service_role;

COMMENT ON FUNCTION public.fn_worker_upsert_battle_submission(
  uuid, uuid, text, uuid, uuid, boolean, text, text, text
) IS
  'Worker-only (service_role): upsert a battle submission for an AI contender. '
  'Handles text, sync media (image/audio), and async-pending media (video/music) results. '
  'Does not check auth.uid() — callers must run as service_role.';
