-- Migration: V4 - De-Polymorph Reactions
-- Description: Replaces the polymorphic `content.reactions` table with explicit relational tables.

-- 1. Prompt Reactions
CREATE TABLE IF NOT EXISTS "content"."prompt_reactions" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "prompt_id" uuid NOT NULL REFERENCES "content"."prompt_templates"("id") ON DELETE CASCADE,
    "user_id" uuid NOT NULL,
    "reaction" "content"."reaction_enum" NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    UNIQUE("prompt_id", "user_id", "reaction")
);

ALTER TABLE "content"."prompt_reactions" OWNER TO "postgres";
GRANT ALL ON TABLE "content"."prompt_reactions" TO anon, authenticated, service_role;

-- 2. Thread Reactions
CREATE TABLE IF NOT EXISTS "content"."thread_reactions" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "thread_id" uuid NOT NULL REFERENCES "content"."threads"("id") ON DELETE CASCADE,
    "user_id" uuid NOT NULL,
    "reaction" "content"."reaction_enum" NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    UNIQUE("thread_id", "user_id", "reaction")
);

ALTER TABLE "content"."thread_reactions" OWNER TO "postgres";
GRANT ALL ON TABLE "content"."thread_reactions" TO anon, authenticated, service_role;

-- 3. Thread Reply Reactions
CREATE TABLE IF NOT EXISTS "content"."thread_reply_reactions" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "reply_id" uuid NOT NULL REFERENCES "content"."thread_replies"("id") ON DELETE CASCADE,
    "user_id" uuid NOT NULL,
    "reaction" "content"."reaction_enum" NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    UNIQUE("reply_id", "user_id", "reaction")
);

ALTER TABLE "content"."thread_reply_reactions" OWNER TO "postgres";
GRANT ALL ON TABLE "content"."thread_reply_reactions" TO anon, authenticated, service_role;

-- 4. Backfill Data
-- We selectively insert records based on existing `target_type`
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'content' AND table_name = 'reactions') THEN
    
    INSERT INTO "content"."prompt_reactions" (prompt_id, user_id, reaction, created_at)
    SELECT target_id, user_id, reaction, created_at
    FROM "content"."reactions"
    WHERE target_type = 'prompt_template'
    ON CONFLICT DO NOTHING;

    INSERT INTO "content"."thread_reactions" (thread_id, user_id, reaction, created_at)
    SELECT target_id, user_id, reaction, created_at
    FROM "content"."reactions"
    WHERE target_type = 'thread'
    ON CONFLICT DO NOTHING;

    INSERT INTO "content"."thread_reply_reactions" (reply_id, user_id, reaction, created_at)
    SELECT target_id, user_id, reaction, created_at
    FROM "content"."reactions"
    WHERE target_type = 'thread_reply'
    ON CONFLICT DO NOTHING;

  END IF;
END $$;

-- 5. Drop old table safely
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'content' AND table_name = 'reactions') THEN
    DROP TABLE "content"."reactions" CASCADE;
  END IF;
END $$;
