-- =============================================================================
-- pgTAP — Phase AO: audio metadata columns + modality pricing
-- =============================================================================
BEGIN;

SELECT plan(8);

-- 1. audio_sample_rate column exists
SELECT has_column(
  'media', 'objects', 'audio_sample_rate',
  'media.objects.audio_sample_rate column should exist (AO)'
);

-- 2. audio_channels column exists
SELECT has_column(
  'media', 'objects', 'audio_channels',
  'media.objects.audio_channels column should exist (AO)'
);

-- 3. audio_sample_rate must be positive
SELECT throws_ok(
  $$
    INSERT INTO media.objects (
      workspace_id, owner_lenser_id, media_type, name, audio_sample_rate, external_url
    )
    SELECT
      (SELECT id FROM tenancy.workspaces LIMIT 1),
      (SELECT id FROM lensers.profiles LIMIT 1),
      'audio', 'test-bad-rate', 0, 'https://example.com/test.mp3'
  $$,
  '23514',
  NULL,
  'audio_sample_rate = 0 should violate CHECK constraint'
);

-- 4. ElevenLabs pricing row exists
SELECT ok(
  EXISTS (
    SELECT 1
    FROM ai.modality_pricing mp
    JOIN ai.models m ON m.id = mp.model_id
    JOIN ai.providers p ON p.id = m.provider_id
    WHERE p.key = 'elevenlabs'
      AND m.key = 'elevenlabs-v4'
      AND mp.output_modality = 'audio'
      AND mp.is_active = TRUE
  ),
  'ai.modality_pricing should have elevenlabs-v4 audio pricing row'
);

-- 5. Suno pricing row exists
SELECT ok(
  EXISTS (
    SELECT 1
    FROM ai.modality_pricing mp
    JOIN ai.models m ON m.id = mp.model_id
    JOIN ai.providers p ON p.id = m.provider_id
    WHERE p.key = 'suno'
      AND m.key = 'suno-v5'
      AND mp.output_modality = 'audio'
      AND mp.is_active = TRUE
  ),
  'ai.modality_pricing should have suno-v5 audio pricing row'
);

-- 6. Lyria pricing row exists
SELECT ok(
  EXISTS (
    SELECT 1
    FROM ai.modality_pricing mp
    JOIN ai.models m ON m.id = mp.model_id
    JOIN ai.providers p ON p.id = m.provider_id
    WHERE p.key = 'google'
      AND m.key = 'lyria-2'
      AND mp.output_modality = 'audio'
      AND mp.is_active = TRUE
  ),
  'ai.modality_pricing should have lyria-2 audio pricing row'
);

-- 7. audio_channels range check (< 1 rejected)
SELECT throws_ok(
  $$
    INSERT INTO media.objects (
      workspace_id, owner_lenser_id, media_type, name, audio_channels, external_url
    )
    SELECT
      (SELECT id FROM tenancy.workspaces LIMIT 1),
      (SELECT id FROM lensers.profiles LIMIT 1),
      'audio', 'test-bad-channels', 0, 'https://example.com/test.mp3'
  $$,
  '23514',
  NULL,
  'audio_channels = 0 should violate CHECK constraint'
);

-- 8. Both audio columns NULL is allowed (for non-audio media)
SELECT lives_ok(
  $$
    INSERT INTO media.objects (
      workspace_id, owner_lenser_id, media_type, name,
      audio_sample_rate, audio_channels, external_url
    )
    SELECT
      (SELECT id FROM tenancy.workspaces LIMIT 1),
      (SELECT id FROM lensers.profiles LIMIT 1),
      'image', 'test-image-no-audio', NULL, NULL, 'https://example.com/test.png'
  $$,
  'audio columns NULL is allowed for images'
);

SELECT finish();
ROLLBACK;
