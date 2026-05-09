-- Expand ai.models capabilities_check constraint to include generative media
-- capability values used by video, audio, and music generation models.

ALTER TABLE ai.models
  DROP CONSTRAINT IF EXISTS models_capabilities_check;

ALTER TABLE ai.models
  ADD CONSTRAINT models_capabilities_check CHECK (
    capabilities <@ ARRAY[
      'chat',
      'reasoning',
      'tools',
      'vision',
      'json_schema',
      'image_generation',
      'video_generation',
      'audio_generation',
      'music_generation',
      'code',
      'text',
      'image',
      'music'
    ]::text[]
  );
