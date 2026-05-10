-- =============================================================================
-- Phase AT — Media Privacy & Governance
-- =============================================================================
-- 1. expires_at + access_count columns on media.objects
-- 2. fn_delete_media_object — owner soft-delete with audit trail
-- 3. fn_toggle_media_visibility — owner visibility toggle with audit trail
-- 4. fn_transfer_media_ownership — service_role only (used when agent deleted)
-- 5. fn_media_proxy_log — service_role only; increments access_count
-- 6. fn_expire_media_objects — archives objects past expires_at; service_role
-- 7. pg_cron: media-expiry (daily 02:00)
-- 8. Audit trigger on visibility change
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. New columns
-- ---------------------------------------------------------------------------
ALTER TABLE media.objects
  ADD COLUMN IF NOT EXISTS expires_at   TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS access_count INT         NOT NULL DEFAULT 0;

COMMENT ON COLUMN media.objects.expires_at IS
  'AT: When set, fn_expire_media_objects will archive this object after this timestamp.';

COMMENT ON COLUMN media.objects.access_count IS
  'AT: Running count of proxy-routed accesses. Incremented by fn_media_proxy_log.';

-- ---------------------------------------------------------------------------
-- 2. fn_delete_media_object — authenticated, owner-only soft delete
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_delete_media_object(p_object_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = media, audit, public
AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  SELECT owner_lenser_id INTO v_owner_id
  FROM media.objects
  WHERE id = p_object_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'media_object_not_found: %', p_object_id USING ERRCODE = 'P0001';
  END IF;

  IF v_owner_id != auth.uid() THEN
    RAISE EXCEPTION 'media_delete_forbidden: caller does not own object %', p_object_id
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE media.objects
  SET lifecycle_state = 'deleted'
  WHERE id = p_object_id;

  INSERT INTO audit.events (event_type, actor_type, severity, payload)
  VALUES (
    'media.object_deleted',
    'user',
    'info',
    jsonb_build_object('object_id', p_object_id, 'deleted_by', auth.uid(), 'deleted_at', now())
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_delete_media_object(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_delete_media_object(UUID) TO authenticated;

COMMENT ON FUNCTION public.fn_delete_media_object IS
  'AT: Soft-deletes a media object (lifecycle_state=deleted). Owner only. '
  'Writes audit.events row. SECURITY DEFINER.';

-- ---------------------------------------------------------------------------
-- 3. fn_toggle_media_visibility
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_toggle_media_visibility(
  p_object_id  UUID,
  p_visibility TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = media, audit, public
AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  IF p_visibility NOT IN ('public', 'private', 'unlisted') THEN
    RAISE EXCEPTION 'Invalid visibility value: %. Must be public, private, or unlisted', p_visibility
      USING ERRCODE = 'P0001';
  END IF;

  SELECT owner_lenser_id INTO v_owner_id
  FROM media.objects
  WHERE id = p_object_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'media_object_not_found: %', p_object_id USING ERRCODE = 'P0001';
  END IF;

  IF v_owner_id != auth.uid() THEN
    RAISE EXCEPTION 'media_visibility_forbidden: caller does not own object %', p_object_id
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE media.objects
  SET visibility = p_visibility
  WHERE id = p_object_id;

  -- Audit row written by trg_media_audit_visibility trigger (see below)
END;
$$;

REVOKE ALL ON FUNCTION public.fn_toggle_media_visibility(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_toggle_media_visibility(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION public.fn_toggle_media_visibility IS
  'AT: Toggles visibility of a media object. Owner only. '
  'The audit trigger writes audit.events. SECURITY DEFINER.';

-- ---------------------------------------------------------------------------
-- 4. fn_transfer_media_ownership — service_role only
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_transfer_media_ownership(
  p_object_id   UUID,
  p_new_owner_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = media, public
AS $$
BEGIN
  UPDATE media.objects
  SET owner_lenser_id = p_new_owner_id
  WHERE id = p_object_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'media_object_not_found: %', p_object_id USING ERRCODE = 'P0001';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_transfer_media_ownership(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_transfer_media_ownership(UUID, UUID) TO service_role;

COMMENT ON FUNCTION public.fn_transfer_media_ownership IS
  'AT: Transfers media object ownership. Service_role only (used on agent deletion). '
  'SECURITY DEFINER.';

-- ---------------------------------------------------------------------------
-- 5. fn_media_proxy_log — increments access_count
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_media_proxy_log(p_object_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = media, public
AS $$
BEGIN
  UPDATE media.objects
  SET access_count = access_count + 1
  WHERE id = p_object_id;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_media_proxy_log(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_media_proxy_log(UUID) TO service_role;

COMMENT ON FUNCTION public.fn_media_proxy_log IS
  'AT: Increments media.objects.access_count. Called by media-proxy route after successful '
  'signed URL generation. Fire-and-forget; errors do not affect the proxy response. '
  'SECURITY DEFINER; service_role only.';

-- ---------------------------------------------------------------------------
-- 6. fn_expire_media_objects — archive objects past expires_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_expire_media_objects()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = media, audit, public
AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE media.objects
  SET lifecycle_state = 'archived'
  WHERE expires_at < now()
    AND lifecycle_state NOT IN ('deleted', 'archived');

  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count > 0 THEN
    INSERT INTO audit.events (event_type, actor_type, severity, payload)
    VALUES (
      'media.objects_expired',
      'system',
      'info',
      jsonb_build_object('archived_count', v_count, 'archived_at', now())
    );
  END IF;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_expire_media_objects() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_expire_media_objects() TO service_role;

COMMENT ON FUNCTION public.fn_expire_media_objects IS
  'AT: Sets lifecycle_state=archived for objects past expires_at. '
  'Called by pg_cron daily at 02:00. SECURITY DEFINER; service_role only.';

-- ---------------------------------------------------------------------------
-- 7. pg_cron schedule
-- ---------------------------------------------------------------------------
SELECT cron.schedule(
  'media-expiry',
  '0 2 * * *',
  $$SELECT public.fn_expire_media_objects()$$
);

-- ---------------------------------------------------------------------------
-- 8. Audit trigger on visibility change
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION media.trg_fn_audit_visibility()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = media, audit, public
AS $$
BEGIN
  IF OLD.visibility IS DISTINCT FROM NEW.visibility THEN
    INSERT INTO audit.events (event_type, actor_type, severity, payload)
    VALUES (
      'media.visibility_changed',
      'user',
      'info',
      jsonb_build_object(
        'object_id',      NEW.id,
        'old_visibility', OLD.visibility,
        'new_visibility', NEW.visibility,
        'changed_at',     now()
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_media_audit_visibility ON media.objects;
CREATE TRIGGER trg_media_audit_visibility
  AFTER UPDATE ON media.objects
  FOR EACH ROW EXECUTE FUNCTION media.trg_fn_audit_visibility();

COMMENT ON TRIGGER trg_media_audit_visibility ON media.objects IS
  'AT: Writes audit.events row when visibility changes.';
