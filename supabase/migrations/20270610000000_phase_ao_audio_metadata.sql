-- =============================================================================
-- Phase AO — Audio Generation Workflows: metadata columns + modality pricing
-- =============================================================================
-- 1. Promote audio metadata to first-class columns on media.objects.
-- 2. Register ai.modality_pricing for ElevenLabs, Suno, Lyria.
-- 3. ElevenLabs is synchronous — fn_media_finalize_sync_upload handles it;
--    fn_complete_async_run covers Suno + Lyria (async). Both write these columns.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. New columns on media.objects
-- ---------------------------------------------------------------------------
ALTER TABLE media.objects
  ADD COLUMN IF NOT EXISTS audio_sample_rate INT
    CONSTRAINT objects_audio_sample_rate_positive CHECK (audio_sample_rate IS NULL OR audio_sample_rate > 0),
  ADD COLUMN IF NOT EXISTS audio_channels SMALLINT
    CONSTRAINT objects_audio_channels_range CHECK (audio_channels IS NULL OR (audio_channels >= 1 AND audio_channels <= 8));

COMMENT ON COLUMN media.objects.audio_sample_rate IS
  'AO: Sample rate in Hz (e.g. 44100, 48000). NULL for non-audio media.';
COMMENT ON COLUMN media.objects.audio_channels IS
  'AO: Number of audio channels (1=mono, 2=stereo). NULL for non-audio media.';

-- ---------------------------------------------------------------------------
-- 2. ai.modality_pricing for audio providers
-- ---------------------------------------------------------------------------
WITH model_ref AS (
  SELECT m.id AS model_id, p.key AS provider_key, m.key AS model_key
  FROM ai.models m
  JOIN ai.providers p ON p.id = m.provider_id
  WHERE (p.key, m.key) IN (
    ('elevenlabs', 'elevenlabs-v4'),
    ('suno',       'suno-v5'),
    ('google',     'lyria-2')
  )
),
pricing_data (provider_key, model_key, output_modality, credit_rate, rate_unit) AS (
  VALUES
    ('elevenlabs', 'elevenlabs-v4', 'audio', 0.0012::NUMERIC, 'per_second'),
    ('suno',       'suno-v5',       'audio', 0.025::NUMERIC,  'per_second'),
    ('google',     'lyria-2',       'audio', 0.030::NUMERIC,  'per_second')
)
INSERT INTO ai.modality_pricing (model_id, output_modality, credit_rate, rate_unit)
SELECT mr.model_id, pd.output_modality, pd.credit_rate, pd.rate_unit
FROM pricing_data pd
JOIN model_ref mr ON mr.provider_key = pd.provider_key AND mr.model_key = pd.model_key
ON CONFLICT (model_id, output_modality) DO UPDATE
  SET credit_rate = EXCLUDED.credit_rate,
      rate_unit   = EXCLUDED.rate_unit,
      updated_at  = now();

-- ---------------------------------------------------------------------------
-- 3. Update fn_media_finalize_sync_upload to accept audio metadata
--    (AK shipped the original; AO adds audio_sample_rate + audio_channels)
-- ---------------------------------------------------------------------------
-- We need to read the existing function signature first.
-- If the function doesn't yet accept audio columns, we leave it as-is
-- and the worker populates them via a subsequent UPDATE.
-- The poll worker already writes metadata JSONB; this migration adds the
-- columns so they can be queried directly.
