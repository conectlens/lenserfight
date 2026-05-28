-- =============================================================================
-- 1. CORE LANGUAGES
-- =============================================================================

INSERT INTO core.languages (code, name, native_name, direction, is_active)
VALUES
  ('ar', 'Arabic', 'العربية', 'rtl', true),
  ('de', 'German', 'Deutsch', 'ltr', true),
  ('en', 'English', 'English', 'ltr', true),
  ('es', 'Spanish', 'Español', 'ltr', true),
  ('fr', 'French', 'Français', 'ltr', true),
  ('it', 'Italian', 'Italiano', 'ltr', true),
  ('ja', 'Japanese', '日本語', 'ltr', true),
  ('ko', 'Korean', '한국어', 'ltr', true),
  ('pt', 'Portuguese', 'Português', 'ltr', true),
  ('ru', 'Russian', 'Русский', 'ltr', true),
  ('tr', 'Turkish', 'Türkçe', 'ltr', true),
  ('zh', 'Chinese', '中文', 'ltr', true),
  ('zh-CN', 'Chinese (Simplified)', '简体中文', 'ltr', true),
  ('zh-TW', 'Chinese (Traditional)', '繁體中文', 'ltr', true)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    native_name = EXCLUDED.native_name,
    direction = EXCLUDED.direction,
    is_active = EXCLUDED.is_active;
