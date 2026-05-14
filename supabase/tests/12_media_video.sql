-- =============================================================================
-- pgTAP — Phase AN: video metadata columns + modality pricing
-- =============================================================================
BEGIN;

SELECT plan(10);

-- 1. duration_seconds column exists on media.objects
SELECT has_column(
  'media', 'objects', 'duration_seconds',
  'media.objects.duration_seconds column should exist (AN)'
);

-- 2. video_width column exists
SELECT has_column(
  'media', 'objects', 'video_width',
  'media.objects.video_width column should exist (AN)'
);

-- 3. video_height column exists
SELECT has_column(
  'media', 'objects', 'video_height',
  'media.objects.video_height column should exist (AN)'
);

-- 4. duration_seconds must be positive (CHECK constraint)
SELECT throws_ok(
  $$
    INSERT INTO media.objects (
      workspace_id, owner_lenser_id, media_type, name,
      duration_seconds, external_url
    )
    SELECT
      (SELECT id FROM tenancy.workspaces LIMIT 1),
      (SELECT id FROM lensers.profiles LIMIT 1),
      'video',
      'test-zero-duration',
      0,
      'https://example.com/test.mp4'
  $$,
  '23514',
  NULL,
  'duration_seconds = 0 should violate CHECK constraint'
);

-- 5. duration_seconds > 300 is rejected
SELECT throws_ok(
  $$
    INSERT INTO media.objects (
      workspace_id, owner_lenser_id, media_type, name,
      duration_seconds, external_url
    )
    SELECT
      (SELECT id FROM tenancy.workspaces LIMIT 1),
      (SELECT id FROM lensers.profiles LIMIT 1),
      'video',
      'test-too-long-duration',
      301,
      'https://example.com/test.mp4'
  $$,
  '23514',
  NULL,
  'duration_seconds = 301 should violate CHECK constraint'
);

-- 6. duration_seconds = NULL is allowed (images have no duration)
SELECT lives_ok(
  $$
    INSERT INTO media.objects (
      workspace_id, owner_lenser_id, media_type, name,
      duration_seconds, external_url
    )
    SELECT
      (SELECT id FROM tenancy.workspaces LIMIT 1),
      (SELECT id FROM lensers.profiles LIMIT 1),
      'image',
      'test-null-duration',
      NULL,
      'https://example.com/test.png'
  $$,
  'duration_seconds = NULL should be allowed for images'
);

-- 7. Sora pricing row exists in ai.modality_pricing
SELECT ok(
  EXISTS (
    SELECT 1
    FROM ai.modality_pricing mp
    JOIN ai.models m ON m.id = mp.model_id
    JOIN ai.providers p ON p.id = m.provider_id
    WHERE p.key = 'openai'
      AND m.key = 'sora-2.0'
      AND mp.output_modality = 'video'
      AND mp.is_active = TRUE
  ),
  'ai.modality_pricing should have sora-2.0 video pricing row'
);

-- 8. Veo pricing row exists
SELECT ok(
  EXISTS (
    SELECT 1
    FROM ai.modality_pricing mp
    JOIN ai.models m ON m.id = mp.model_id
    JOIN ai.providers p ON p.id = m.provider_id
    WHERE p.key = 'google'
      AND m.key = 'veo-3'
      AND mp.output_modality = 'video'
      AND mp.is_active = TRUE
  ),
  'ai.modality_pricing should have veo-3 video pricing row'
);

-- 9. Kling pricing row exists
SELECT ok(
  EXISTS (
    SELECT 1
    FROM ai.modality_pricing mp
    JOIN ai.models m ON m.id = mp.model_id
    JOIN ai.providers p ON p.id = m.provider_id
    WHERE p.key = 'kling'
      AND m.key = 'kling-2.0'
      AND mp.output_modality = 'video'
      AND mp.is_active = TRUE
  ),
  'ai.modality_pricing should have kling-2.0 video pricing row'
);

-- 10. fn_complete_async_run still executable by service_role
SELECT has_function(
  'execution',
  'fn_complete_async_run',
  ARRAY['uuid', 'text', 'text', 'bigint', 'integer', 'integer', 'numeric'],
  'execution.fn_complete_async_run should exist with AN signature'
);

SELECT finish();
ROLLBACK;
