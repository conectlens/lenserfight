-- Migration: workflow webhook URL RPCs
-- Adds webhook_secret to lenses.workflows and three RPCs:
--   fn_get_workflow_webhook_config  (service_role only — called by the edge function)
--   fn_get_workflow_webhook_url     (authenticated owner — returns URL + secret status)
--   fn_rotate_webhook_secret        (authenticated owner — regenerates secret)

-- ── 1. Add webhook_secret column ─────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'lenses'
      AND table_name   = 'workflows'
      AND column_name  = 'webhook_secret'
  ) THEN
    ALTER TABLE lenses.workflows ADD COLUMN webhook_secret text;
  END IF;
END $$;

-- ── 2. fn_get_workflow_webhook_config ─────────────────────────────────────────
-- Called by the workflow-webhook edge function with service_role credentials.
-- Returns NULL when the workflow does not exist so the function can 404.
CREATE OR REPLACE FUNCTION public.fn_get_workflow_webhook_config(p_workflow_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_row record;
BEGIN
  SELECT id, owner_id, webhook_secret, is_active
  INTO v_row
  FROM lenses.workflows
  WHERE id = p_workflow_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'workflow_id',    v_row.id,
    'owner_id',       v_row.owner_id,
    'webhook_secret', v_row.webhook_secret,
    'is_active',      v_row.is_active
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_get_workflow_webhook_config(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.fn_get_workflow_webhook_config(uuid) TO service_role;

-- ── 3. fn_get_workflow_webhook_url ────────────────────────────────────────────
-- Returns the webhook URL and whether a secret is currently set.
-- Reads app.supabase_url from pg config (set in Supabase secrets → postgres config).
CREATE OR REPLACE FUNCTION public.fn_get_workflow_webhook_url(p_workflow_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_row      record;
  v_base_url text;
BEGIN
  SELECT id, owner_id, webhook_secret
  INTO v_row
  FROM lenses.workflows
  WHERE id = p_workflow_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'workflow not found';
  END IF;

  IF v_row.owner_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'access denied';
  END IF;

  v_base_url := current_setting('app.supabase_url', true);

  RETURN jsonb_build_object(
    'webhook_url', v_base_url || '/functions/v1/workflow-webhook/' || p_workflow_id::text,
    'has_secret',  v_row.webhook_secret IS NOT NULL,
    'workflow_id', p_workflow_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_get_workflow_webhook_url(uuid) TO authenticated;

-- ── 4. fn_rotate_webhook_secret ───────────────────────────────────────────────
-- Generates a new 64-char hex secret and stores it. Returns the new secret
-- once — the caller must copy it immediately (not stored retrievably afterward).
CREATE OR REPLACE FUNCTION public.fn_rotate_webhook_secret(p_workflow_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_owner_id uuid;
  v_secret   text;
BEGIN
  SELECT owner_id INTO v_owner_id
  FROM lenses.workflows
  WHERE id = p_workflow_id;

  IF NOT FOUND OR v_owner_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'access denied';
  END IF;

  v_secret := encode(gen_random_bytes(32), 'hex');

  UPDATE lenses.workflows
  SET webhook_secret = v_secret
  WHERE id = p_workflow_id;

  RETURN v_secret;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_rotate_webhook_secret(uuid) TO authenticated;
