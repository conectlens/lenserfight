-- Short-lived opaque tokens for media-content edge proxy (external clipboard / providers).

CREATE TABLE IF NOT EXISTS media.access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id uuid NOT NULL REFERENCES media.objects(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_media_access_tokens_hash
  ON media.access_tokens (token_hash);

CREATE INDEX IF NOT EXISTS idx_media_access_tokens_object_expires
  ON media.access_tokens (object_id, expires_at);

ALTER TABLE media.access_tokens ENABLE ROW LEVEL SECURITY;

-- No direct client access; edge uses service_role.
CREATE POLICY media_access_tokens_deny_all ON media.access_tokens
  FOR ALL
  USING (false);

CREATE OR REPLACE FUNCTION public.fn_create_media_access_token(
  p_object_id uuid,
  p_ttl_seconds integer DEFAULT 3600
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, media, lensers, extensions
AS $$
DECLARE
  v_owner uuid;
  v_token_plain text;
  v_token_hash text;
  v_ttl integer;
BEGIN
  v_ttl := GREATEST(60, LEAST(COALESCE(p_ttl_seconds, 3600), 86400));

  SELECT o.owner_lenser_id INTO v_owner
  FROM media.objects o
  WHERE o.id = p_object_id
    AND o.lifecycle_state <> 'deleted'
    AND (
      o.owner_lenser_id = lensers.get_auth_lenser_id()
      OR o.visibility = 'public'
    );

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'media_object_not_found_or_denied' USING ERRCODE = 'P0001';
  END IF;

  v_token_plain := encode(gen_random_bytes(32), 'hex');
  v_token_hash := encode(extensions.digest(v_token_plain, 'sha256'), 'hex');

  INSERT INTO media.access_tokens (object_id, token_hash, expires_at)
  VALUES (p_object_id, v_token_hash, now() + (v_ttl || ' seconds')::interval);

  RETURN v_token_plain;
END;
$$;

COMMENT ON FUNCTION public.fn_create_media_access_token(uuid, integer) IS
  'Creates a short-lived opaque token for media-content edge proxy. Owner or public object only.';

REVOKE ALL ON FUNCTION public.fn_create_media_access_token(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_create_media_access_token(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_create_media_access_token(uuid, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.fn_resolve_media_access_token(
  p_object_id uuid,
  p_token_plain text
)
RETURNS TABLE(
  bucket text,
  object_key text,
  mime_type text,
  external_url text,
  lifecycle_state text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, media, extensions
AS $$
DECLARE
  v_hash text;
BEGIN
  v_hash := encode(extensions.digest(p_token_plain, 'sha256'), 'hex');

  IF NOT EXISTS (
    SELECT 1
    FROM media.access_tokens t
    WHERE t.object_id = p_object_id
      AND t.token_hash = v_hash
      AND t.expires_at > now()
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT o.bucket, o.object_key, o.mime_type, o.external_url, o.lifecycle_state
  FROM media.objects o
  WHERE o.id = p_object_id
    AND o.lifecycle_state <> 'deleted';
END;
$$;

COMMENT ON FUNCTION public.fn_resolve_media_access_token(uuid, text) IS
  'Validates media access token and returns storage location for edge media-content proxy.';

REVOKE ALL ON FUNCTION public.fn_resolve_media_access_token(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_resolve_media_access_token(uuid, text) TO service_role;
