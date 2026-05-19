-- Migration: add missing adapter_id column to battles.submissions
--
-- Root cause: fn_battles_submit (9-param overload) performs
--   SET adapter_id = p_adapter_id
-- but the column was never added to the table, producing:
--   ERROR 42703: column "adapter_id" of relation "submissions" does not exist
--
-- Fix: add the column (nullable uuid, no FK constraint to keep it soft).
-- It records which execution runner/adapter produced the submission.
-- NULL for all manual (human) text submissions.

ALTER TABLE battles.submissions
  ADD COLUMN IF NOT EXISTS adapter_id uuid;

COMMENT ON COLUMN battles.submissions.adapter_id IS
  'Execution runner that produced this submission (execution.runners.id). '
  'NULL for manual human entries. Set by fn_battles_submit when p_adapter_id is provided.';
