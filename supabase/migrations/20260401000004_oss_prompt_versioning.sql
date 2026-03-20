-- M4: Prompt versioning columns for Prompt Laboratory
-- Adds nullable parent_prompt_id (fork lineage) and forked_from_execution_id
-- (execution run that seeded the fork content).
--
-- Blast radius: 2 nullable columns + 1 partial index.
-- No view changes required: new columns are excluded from vw_prompt_templates_public
-- narrow-select list and are only read by direct table queries in the lab feature.
-- No data backfill needed (NULL = root prompt).

ALTER TABLE "content"."prompt_templates"
  ADD COLUMN IF NOT EXISTS "parent_prompt_id"         uuid NULL
    REFERENCES "content"."prompt_templates"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "forked_from_execution_id" uuid NULL
    REFERENCES "execution"."runs"("id") ON DELETE SET NULL;

COMMENT ON COLUMN "content"."prompt_templates"."parent_prompt_id"
  IS 'Fork lineage: points to the prompt this was derived from. NULL = root prompt.';
COMMENT ON COLUMN "content"."prompt_templates"."forked_from_execution_id"
  IS 'Execution run whose primary artifact content seeded this fork. NULL = manual fork or root.';

-- Only index non-root prompts to keep the index small.
CREATE INDEX IF NOT EXISTS "idx_prompt_templates_parent"
  ON "content"."prompt_templates" ("parent_prompt_id")
  WHERE "parent_prompt_id" IS NOT NULL;
