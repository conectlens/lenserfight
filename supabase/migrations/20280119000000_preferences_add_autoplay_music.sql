-- Migration: add autoplay_music preference column
-- Adds a boolean flag to lensers.preferences that controls whether
-- the Arena Soundtrack autoplays on Battle Detail pages.
-- Default true so existing users keep music on by default.

ALTER TABLE lensers.preferences
  ADD COLUMN IF NOT EXISTS autoplay_music boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN lensers.preferences.autoplay_music IS
  'When true, the LenserFight arena soundtrack autoplays on Battle Detail pages.';
