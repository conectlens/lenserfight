-- Migration: V3 - Translation Tables
-- Description: Creates translation tables for `tags`, `prompt_templates`, and `threads`. Migrates existing text into the new localized structure.

-- 1. Tag Translations
CREATE TABLE IF NOT EXISTS "content"."tag_translations" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "tag_id" uuid NOT NULL REFERENCES "content"."tags"("id") ON DELETE CASCADE,
    "language_id" uuid NOT NULL REFERENCES "core"."languages"("id") ON DELETE RESTRICT,
    "name" text NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    UNIQUE("tag_id", "language_id")
);

ALTER TABLE "content"."tag_translations" OWNER TO "postgres";
GRANT ALL ON TABLE "content"."tag_translations" TO anon, authenticated, service_role;

-- Backfill tag names (Defaulting to English language ID)
INSERT INTO "content"."tag_translations" (tag_id, language_id, name)
SELECT 
    t.id, 
    (SELECT id FROM "core"."languages" WHERE code = 'en' LIMIT 1), 
    t.name
FROM "content"."tags" t
ON CONFLICT DO NOTHING;

-- Safely drop old column
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'content' AND table_name = 'tags' AND column_name = 'name') THEN
    ALTER TABLE "content"."tags" DROP COLUMN "name" CASCADE;
  END IF;
END $$;


-- 2. Prompt Translations
CREATE TABLE IF NOT EXISTS "content"."prompt_translations" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "prompt_id" uuid NOT NULL REFERENCES "content"."prompt_templates"("id") ON DELETE CASCADE,
    "language_id" uuid NOT NULL REFERENCES "core"."languages"("id") ON DELETE RESTRICT,
    "title" text NOT NULL,
    "description" text,
    "content" text NOT NULL,
    "is_original" boolean DEFAULT false NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    UNIQUE("prompt_id", "language_id"),
    CONSTRAINT "prompt_trans_content_check" CHECK ((btrim(content) = content) AND (char_length(content) >= 10) AND (char_length(content) <= 20000)),
    CONSTRAINT "prompt_trans_title_check" CHECK ((btrim(title) = title) AND (char_length(title) >= 3) AND (char_length(title) <= 120))
);

ALTER TABLE "content"."prompt_translations" OWNER TO "postgres";
GRANT ALL ON TABLE "content"."prompt_translations" TO anon, authenticated, service_role;

-- Backfill prompts
INSERT INTO "content"."prompt_translations" (prompt_id, language_id, title, description, content, is_original)
SELECT 
    p.id, 
    COALESCE(pr.preferred_language_id, (SELECT id FROM "core"."languages" WHERE code = 'en' LIMIT 1)), 
    p.title,
    p.description,
    p.content,
    true
FROM "content"."prompt_templates" p
LEFT JOIN "lensers"."profiles" pr ON p.lenser_id = pr.id
ON CONFLICT DO NOTHING;

-- Drop old columns
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'content' AND table_name = 'prompt_templates' AND column_name = 'title') THEN
    ALTER TABLE "content"."prompt_templates" DROP COLUMN "title" CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'content' AND table_name = 'prompt_templates' AND column_name = 'description') THEN
    ALTER TABLE "content"."prompt_templates" DROP COLUMN "description" CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'content' AND table_name = 'prompt_templates' AND column_name = 'content') THEN
    ALTER TABLE "content"."prompt_templates" DROP COLUMN "content" CASCADE;
  END IF;
END $$;


-- 3. Thread Translations
CREATE TABLE IF NOT EXISTS "content"."thread_translations" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "thread_id" uuid NOT NULL REFERENCES "content"."threads"("id") ON DELETE CASCADE,
    "language_id" uuid NOT NULL REFERENCES "core"."languages"("id") ON DELETE RESTRICT,
    "title" text NOT NULL,
    "content" text NOT NULL,
    "is_original" boolean DEFAULT false NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    UNIQUE("thread_id", "language_id"),
    CONSTRAINT "thread_trans_content_check" CHECK (char_length(content) >= 1 AND char_length(content) <= 20000),
    CONSTRAINT "thread_trans_title_check" CHECK (char_length(title) >= 1 AND char_length(title) <= 200)
);

ALTER TABLE "content"."thread_translations" OWNER TO "postgres";
GRANT ALL ON TABLE "content"."thread_translations" TO anon, authenticated, service_role;

-- Backfill threads
INSERT INTO "content"."thread_translations" (thread_id, language_id, title, content, is_original)
SELECT 
    t.id, 
    COALESCE(pr.preferred_language_id, (SELECT id FROM "core"."languages" WHERE code = 'en' LIMIT 1)), 
    t.title,
    t.content,
    true
FROM "content"."threads" t
LEFT JOIN "lensers"."profiles" pr ON t.lenser_id = pr.id
ON CONFLICT DO NOTHING;

-- Drop old columns
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'content' AND table_name = 'threads' AND column_name = 'title') THEN
    ALTER TABLE "content"."threads" DROP COLUMN "title" CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'content' AND table_name = 'threads' AND column_name = 'content') THEN
    ALTER TABLE "content"."threads" DROP COLUMN "content" CASCADE;
  END IF;
END $$;

-- 4. Tag Suggestions (AI Twitter-style)
CREATE TABLE IF NOT EXISTS "content"."tag_suggestions" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "entity_type" "content"."entity_type_enum" NOT NULL,
    "entity_id" uuid NOT NULL,
    "tag_id" uuid NOT NULL REFERENCES "content"."tags"("id") ON DELETE CASCADE,
    "confidence_score" numeric NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    "ai_model_id" uuid,
    "status" text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    "created_at" timestamptz DEFAULT now() NOT NULL,
    UNIQUE("entity_type", "entity_id", "tag_id")
);

ALTER TABLE "content"."tag_suggestions" OWNER TO "postgres";
GRANT ALL ON TABLE "content"."tag_suggestions" TO anon, authenticated, service_role;
