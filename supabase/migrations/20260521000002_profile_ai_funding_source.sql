-- Migration: profile-scoped AI funding source preference
-- Adds explicit funding source column to lensers.preferences so the active profile's
-- chosen AI provider routing (platform credit / cloud BYOK / local BYOK) persists across
-- sessions and is readable server-side by the generate-creation edge function.
--
-- wallet_mode (BYOK|CLOUD) predates this and only tracks two states; this column adds
-- the full three-way FundingSource union including platform_credit.

ALTER TABLE lensers.preferences
  ADD COLUMN IF NOT EXISTS default_ai_funding_source text
    CHECK (default_ai_funding_source IN ('platform_credit', 'user_byok_cloud', 'user_byok_local'))
    DEFAULT 'platform_credit';

-- Reference for local BYOK key ID (opaque string from the browser IndexedDB / gateway).
-- Never contains the actual key — same security model as selected_api_key_id.
ALTER TABLE lensers.preferences
  ADD COLUMN IF NOT EXISTS default_ai_local_key_id text;

-- ─── fn_get_profile_ai_preference ────────────────────────────────────────────
-- Returns AI preference fields for the calling user's own profile only.
-- Called by the generate-creation edge function (server-side) and by the
-- useAICreationGeneration hook (client-side).
-- Returns NULL when no matching row exists (new profile, no preferences yet).

CREATE OR REPLACE FUNCTION lensers.fn_get_profile_ai_preference(p_lenser_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = lensers, auth, public
AS $$
  SELECT jsonb_build_object(
    'default_ai_funding_source', p.default_ai_funding_source,
    'ai_provider_key',           p.ai_provider_key,
    'ai_model_key',              p.ai_model_key,
    'selected_api_key_id',       p.selected_api_key_id,
    'default_ai_local_key_id',   p.default_ai_local_key_id
  )
  FROM lensers.preferences p
  WHERE p.lenser_id = p_lenser_id
    AND p.lenser_id = auth.uid()  -- caller must own the row
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION lensers.fn_get_profile_ai_preference(uuid) TO authenticated;

-- ─── fn_update_profile_ai_preference ─────────────────────────────────────────
-- Persists the profile-level AI preference when the user changes their funding
-- source / model selection in the UI.  Only updates the calling user's own row.

CREATE OR REPLACE FUNCTION lensers.fn_update_profile_ai_preference(
  p_funding_source       text,
  p_provider_key         text,
  p_model_key            text,
  p_selected_api_key_id  uuid,
  p_local_key_id         text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = lensers, auth, public
AS $$
BEGIN
  IF p_funding_source IS NOT NULL AND p_funding_source NOT IN (
    'platform_credit', 'user_byok_cloud', 'user_byok_local'
  ) THEN
    RAISE EXCEPTION 'invalid funding source: %', p_funding_source;
  END IF;

  UPDATE lensers.preferences SET
    default_ai_funding_source = COALESCE(p_funding_source, default_ai_funding_source),
    ai_provider_key            = COALESCE(p_provider_key,   ai_provider_key),
    ai_model_key               = COALESCE(p_model_key,      ai_model_key),
    selected_api_key_id        = p_selected_api_key_id,    -- allow NULL to clear
    default_ai_local_key_id    = p_local_key_id,           -- allow NULL to clear
    updated_at                 = now()
  WHERE lenser_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no preferences row found for calling user';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION lensers.fn_update_profile_ai_preference(text, text, text, uuid, text) TO authenticated;
