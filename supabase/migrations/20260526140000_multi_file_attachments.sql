-- Multi-file lens parameters: allow multiple media.attachments per binding_key.

-- 1. lenses.tools: add `files` type
ALTER TABLE lenses.tools DROP CONSTRAINT IF EXISTS tools_type_check;
ALTER TABLE lenses.tools ADD CONSTRAINT tools_type_check CHECK (
  type = ANY (ARRAY[
    'text', 'textarea', 'json', 'number', 'integer', 'float', 'decimal', 'boolean',
    'select', 'multiselect', 'url', 'date', 'datetime', 'file', 'files',
    'execution_artifact_ids', 'battle_ids', 'media_attachment_ids'
  ]::text[])
);

INSERT INTO lenses.tools (
  key, label, description, category, type,
  required, min_length, max_length,
  placeholder, help_text,
  sort_order, is_system, icon, color
) VALUES (
  'media_files',
  'File Attachments',
  'Upload multiple images, PDFs, or other media for multimodal models.',
  'media', 'files',
  false, 0, 10000,
  NULL,
  'Attach one or more files (up to platform limits).',
  12, true, 'files', '#475569'
)
ON CONFLICT (key) DO NOTHING;

-- 2. media.attachments: multiple objects per binding_key
ALTER TABLE media.attachments DROP CONSTRAINT IF EXISTS attachments_entity_binding_unique;
ALTER TABLE media.attachments
  ADD CONSTRAINT attachments_entity_object_unique
  UNIQUE (entity_type, entity_id, binding_key, object_id);

-- 3. fn_media_bind_attachment: insert-only (no replace on binding_key)
CREATE OR REPLACE FUNCTION public.fn_media_bind_attachment(
  p_object_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_binding_key text DEFAULT '_default'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = media, lensers, public
AS $$
DECLARE
  v_owner uuid;
  v_attachment_id uuid;
BEGIN
  SELECT owner_lenser_id INTO v_owner
  FROM media.objects WHERE id = p_object_id;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Media object not found: %', p_object_id;
  END IF;

  IF v_owner <> lensers.get_auth_lenser_id() THEN
    RAISE EXCEPTION 'Permission denied: not object owner';
  END IF;

  INSERT INTO media.attachments (object_id, entity_type, entity_id, binding_key, attached_by)
  VALUES (p_object_id, p_entity_type, p_entity_id, p_binding_key, lensers.get_auth_lenser_id())
  ON CONFLICT (entity_type, entity_id, binding_key, object_id)
  DO UPDATE SET attached_by = EXCLUDED.attached_by, attached_at = now()
  RETURNING id INTO v_attachment_id;

  RETURN v_attachment_id;
END;
$$;

COMMENT ON FUNCTION public.fn_media_bind_attachment(uuid, text, uuid, text) IS
  'Binds a media object to an entity. Multiple objects may share the same binding_key (multi-file params).';

-- 4. Unbind a single object from a binding
CREATE OR REPLACE FUNCTION public.fn_media_unbind_attachment_object(
  p_entity_type text,
  p_entity_id uuid,
  p_binding_key text,
  p_object_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = media, lensers, public
AS $$
BEGIN
  DELETE FROM media.attachments
  WHERE entity_type = p_entity_type
    AND entity_id = p_entity_id
    AND binding_key = p_binding_key
    AND object_id = p_object_id
    AND attached_by = lensers.get_auth_lenser_id();
END;
$$;

COMMENT ON FUNCTION public.fn_media_unbind_attachment_object(text, uuid, text, uuid) IS
  'Removes one media object binding for the current user (multi-file param remove).';

REVOKE ALL ON FUNCTION public.fn_media_unbind_attachment_object(text, uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_media_unbind_attachment_object(text, uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_media_unbind_attachment_object(text, uuid, text, uuid) TO service_role;

-- 5. execution.request_attachments: multiple rows per binding_key
ALTER TABLE execution.request_attachments
  DROP CONSTRAINT IF EXISTS request_attachments_request_key_unique;

ALTER TABLE execution.request_attachments
  ADD CONSTRAINT request_attachments_request_object_unique
  UNIQUE (request_id, media_object_id);
