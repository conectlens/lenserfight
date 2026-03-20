-- Add typed parameter schema to prompt translations.
-- Stores a JSONB array of PromptParam objects alongside the prompt content.
-- Nullable with empty-array default ensures backward compatibility with existing rows.

ALTER TABLE "content"."prompt_translations"
  ADD COLUMN IF NOT EXISTS "params" jsonb NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN "content"."prompt_translations"."params"
  IS 'Typed parameter schema extracted from {{var}} placeholders. JSON array of PromptParam objects.';
