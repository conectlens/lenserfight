-- Security hardening: public SECURITY DEFINER wrappers for media and execution schemas.
--
-- Covers: mediaRepository (media.objects, media.attachments),
-- media-proxy.route.ts (media.objects select for redirect),
-- async-media-poll-worker.ts (execution.runs UPDATE on failure).
-- Note: fn_worker_insert_workflow_media_object (scheduled-workflow-worker)
-- is in 20270801000003 to co-locate it with the workflow graph functions.

-- ─── 1. fn_list_media_objects ────────────────────────────────────────────────
-- List active media objects for the current user (mediaRepository.getByOwner).
-- Keyset-paginated by created_at DESC.

CREATE OR REPLACE FUNCTION public.fn_list_media_objects(
  p_limit  integer     DEFAULT 200,
  p_cursor timestamptz DEFAULT NULL
)
RETURNS TABLE(
  id              uuid,
  workspace_id    uuid,
  owner_lenser_id uuid,
  bucket          text,
  object_key      text,
  external_url    text,
  mime_type       text,
  media_type      text,
  name            text,
  content_text    text,
  byte_size       bigint,
  visibility      text,
  lifecycle_state text,
  metadata        jsonb,
  created_at      timestamptz,
  updated_at      timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'media', 'lensers'
AS $$
  SELECT
    o.id, o.workspace_id, o.owner_lenser_id, o.bucket, o.object_key,
    o.external_url, o.mime_type, o.media_type, o.name, o.content_text,
    o.byte_size, o.visibility, o.lifecycle_state, o.metadata,
    o.created_at, o.updated_at
  FROM media.objects o
  WHERE o.owner_lenser_id = lensers.get_auth_lenser_id()
    AND o.lifecycle_state <> 'deleted'
    AND (p_cursor IS NULL OR o.created_at < p_cursor)
  ORDER BY o.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 200), 1), 500);
$$;

ALTER FUNCTION public.fn_list_media_objects(integer, timestamptz) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_list_media_objects(integer, timestamptz)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_list_media_objects(integer, timestamptz) IS
  'Security wrapper: list non-deleted media objects owned by the current user. '
  'Keyset-paginated by created_at DESC. Max 500 rows per call.';

-- ─── 2. fn_get_media_object ───────────────────────────────────────────────────
-- Get a single media object by ID (mediaRepository.getById, media-proxy.route.ts).
-- Returns the row regardless of who owns it — visibility and lifecycle_state
-- are used by the caller to enforce access (public vs. private, active vs. deleted).

CREATE OR REPLACE FUNCTION public.fn_get_media_object(p_object_id uuid)
RETURNS TABLE(
  id              uuid,
  workspace_id    uuid,
  owner_lenser_id uuid,
  bucket          text,
  object_key      text,
  external_url    text,
  mime_type       text,
  media_type      text,
  name            text,
  content_text    text,
  byte_size       bigint,
  visibility      text,
  lifecycle_state text,
  metadata        jsonb,
  created_at      timestamptz,
  updated_at      timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'media', 'lensers'
AS $$
  SELECT
    o.id, o.workspace_id, o.owner_lenser_id, o.bucket, o.object_key,
    o.external_url, o.mime_type, o.media_type, o.name, o.content_text,
    o.byte_size, o.visibility, o.lifecycle_state, o.metadata,
    o.created_at, o.updated_at
  FROM media.objects o
  WHERE o.id = p_object_id
    AND (
      o.owner_lenser_id = lensers.get_auth_lenser_id()
      OR o.visibility   = 'public'
    );
$$;

ALTER FUNCTION public.fn_get_media_object(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_media_object(uuid)
  TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.fn_get_media_object(uuid) IS
  'Security wrapper: fetch a media object row by ID. '
  'Returns the row if the caller owns it OR it is public. '
  'Callers must check lifecycle_state and visibility themselves.';

-- ─── 3. fn_create_media_object ───────────────────────────────────────────────
-- Insert a new media object (mediaRepository.create).
-- lifecycle_state auto-computed: 'active' when content or URL is provided, else 'pending'.

CREATE OR REPLACE FUNCTION public.fn_create_media_object(
  p_workspace_id uuid,
  p_media_type   text,
  p_mime_type    text,
  p_name         text,
  p_content_text text  DEFAULT NULL,
  p_external_url text  DEFAULT NULL
)
RETURNS TABLE(
  id              uuid,
  workspace_id    uuid,
  owner_lenser_id uuid,
  bucket          text,
  object_key      text,
  external_url    text,
  mime_type       text,
  media_type      text,
  name            text,
  content_text    text,
  byte_size       bigint,
  visibility      text,
  lifecycle_state text,
  metadata        jsonb,
  created_at      timestamptz,
  updated_at      timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'media', 'lensers'
AS $$
  INSERT INTO media.objects
    (workspace_id, owner_lenser_id, media_type, mime_type, name,
     content_text, external_url, lifecycle_state)
  VALUES (
    p_workspace_id, lensers.get_auth_lenser_id(), p_media_type, p_mime_type, p_name,
    p_content_text, p_external_url,
    CASE WHEN p_content_text IS NOT NULL OR p_external_url IS NOT NULL
         THEN 'active' ELSE 'pending' END
  )
  RETURNING
    id, workspace_id, owner_lenser_id, bucket, object_key, external_url,
    mime_type, media_type, name, content_text, byte_size, visibility,
    lifecycle_state, metadata, created_at, updated_at;
$$;

ALTER FUNCTION public.fn_create_media_object(uuid, text, text, text, text, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_create_media_object(uuid, text, text, text, text, text)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_create_media_object(uuid, text, text, text, text, text) IS
  'Security wrapper: insert a media.objects row for the current user. '
  'lifecycle_state is auto-set to "active" when content or URL is provided, else "pending".';

-- ─── 4. fn_get_entity_media_attachments ──────────────────────────────────────
-- List media attachments for any entity with nested object data
-- (mediaRepository.getAttachmentsForEntity).

CREATE OR REPLACE FUNCTION public.fn_get_entity_media_attachments(
  p_entity_type text,
  p_entity_id   uuid
)
RETURNS TABLE(
  attachment_id uuid,
  object_id     uuid,
  entity_type   text,
  entity_id     uuid,
  binding_key   text,
  attached_at   timestamptz,
  -- nested object fields
  bucket          text,
  object_key      text,
  external_url    text,
  mime_type       text,
  media_type      text,
  name            text,
  byte_size       bigint,
  visibility      text,
  lifecycle_state text,
  metadata        jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'media'
AS $$
  SELECT
    a.id           AS attachment_id,
    a.object_id,
    a.entity_type,
    a.entity_id,
    a.binding_key,
    a.attached_at,
    o.bucket, o.object_key, o.external_url, o.mime_type, o.media_type,
    o.name, o.byte_size, o.visibility, o.lifecycle_state, o.metadata
  FROM media.attachments a
  JOIN media.objects o ON o.id = a.object_id
  WHERE a.entity_type = p_entity_type
    AND a.entity_id   = p_entity_id;
$$;

ALTER FUNCTION public.fn_get_entity_media_attachments(text, uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_entity_media_attachments(text, uuid)
  TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.fn_get_entity_media_attachments(text, uuid) IS
  'Security wrapper: list media attachments for an entity with nested object metadata.';

-- ─── WORKER-ONLY ─────────────────────────────────────────────────────────────

-- ─── 5. fn_worker_fail_execution_run ─────────────────────────────────────────
-- Mark an execution run as failed (async-media-poll-worker.ts).
-- Replaces direct .schema('execution').from('runs').update().eq('id', run_id).

CREATE OR REPLACE FUNCTION public.fn_worker_fail_execution_run(
  p_run_id       uuid,
  p_error_code   text DEFAULT 'provider_failed',
  p_error_message text DEFAULT 'Provider reported failure'
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'execution'
AS $$
  UPDATE execution.runs
  SET    status        = 'failed',
         completed_at  = now(),
         error_code    = p_error_code,
         error_message = p_error_message
  WHERE  id = p_run_id;
$$;

ALTER FUNCTION public.fn_worker_fail_execution_run(uuid, text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_worker_fail_execution_run(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_worker_fail_execution_run(uuid, text, text) TO service_role;

COMMENT ON FUNCTION public.fn_worker_fail_execution_run(uuid, text, text) IS
  'Worker-only: mark an execution run as failed with an error code and message.';
