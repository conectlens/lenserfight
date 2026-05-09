-- Phase Z2: Dedupe and lock down social-interaction join tables.
-- CRITICAL findings:
--   * battles.votes        — duplicate votes corrupt vote_aggregates
--   * content.reactions    — duplicate reactions double-count likes
--   * lensers.tag_follows  — duplicate follow rows
--
-- Strategy: (1) record duplicates into audit.dedupe_log for review,
--           (2) DELETE duplicates keeping the earliest row,
--           (3) ADD UNIQUE constraint guarded by NOT EXISTS so the
--               migration is idempotent on re-apply.
--
-- All three steps run in a single transaction per table — partial
-- failure leaves the original state intact.

CREATE SCHEMA IF NOT EXISTS audit;

CREATE TABLE IF NOT EXISTS audit.dedupe_log (
  id           bigserial PRIMARY KEY,
  table_name   text NOT NULL,
  removed_pk   text NOT NULL,
  kept_pk      text NOT NULL,
  dedupe_key   jsonb NOT NULL,
  removed_at   timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- battles.votes — UNIQUE (battle_id, voter_lenser_id, voted_contender_id)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('battles.votes') IS NULL THEN
    RAISE NOTICE 'battles.votes not present, skipping'; RETURN;
  END IF;

  WITH ranked AS (
    SELECT id, battle_id, voter_lenser_id, voted_contender_id, created_at,
           row_number() OVER (
             PARTITION BY battle_id, voter_lenser_id, voted_contender_id
             ORDER BY created_at ASC, id ASC
           ) AS rn,
           first_value(id) OVER (
             PARTITION BY battle_id, voter_lenser_id, voted_contender_id
             ORDER BY created_at ASC, id ASC
           )::text AS keeper
    FROM battles.votes
  ),
  logged AS (
    INSERT INTO audit.dedupe_log (table_name, removed_pk, kept_pk, dedupe_key)
    SELECT 'battles.votes', id::text, keeper,
           jsonb_build_object(
             'battle_id', battle_id,
             'voter_lenser_id', voter_lenser_id,
             'voted_contender_id', voted_contender_id)
    FROM ranked WHERE rn > 1
    RETURNING removed_pk
  )
  DELETE FROM battles.votes v
  USING logged l
  WHERE v.id::text = l.removed_pk;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'votes_unique_voter_per_contender'
      AND conrelid = 'battles.votes'::regclass
  ) THEN
    ALTER TABLE battles.votes
      ADD CONSTRAINT votes_unique_voter_per_contender
      UNIQUE (battle_id, voter_lenser_id, voted_contender_id);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- content.reactions — UNIQUE (entity_type, entity_id, lenser_id, reaction)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('content.reactions') IS NULL THEN
    RAISE NOTICE 'content.reactions not present, skipping'; RETURN;
  END IF;

  WITH ranked AS (
    SELECT id, entity_type, entity_id, lenser_id, reaction, created_at,
           row_number() OVER (
             PARTITION BY entity_type, entity_id, lenser_id, reaction
             ORDER BY created_at ASC, id ASC
           ) AS rn,
           first_value(id) OVER (
             PARTITION BY entity_type, entity_id, lenser_id, reaction
             ORDER BY created_at ASC, id ASC
           )::text AS keeper
    FROM content.reactions
  ),
  logged AS (
    INSERT INTO audit.dedupe_log (table_name, removed_pk, kept_pk, dedupe_key)
    SELECT 'content.reactions', id::text, keeper,
           jsonb_build_object(
             'entity_type', entity_type,
             'entity_id', entity_id,
             'lenser_id', lenser_id,
             'reaction', reaction)
    FROM ranked WHERE rn > 1
    RETURNING removed_pk
  )
  DELETE FROM content.reactions r
  USING logged l
  WHERE r.id::text = l.removed_pk;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reactions_unique_per_user'
      AND conrelid = 'content.reactions'::regclass
  ) THEN
    ALTER TABLE content.reactions
      ADD CONSTRAINT reactions_unique_per_user
      UNIQUE (entity_type, entity_id, lenser_id, reaction);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- lensers.tag_follows — UNIQUE (lenser_id, tag_id)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('lensers.tag_follows') IS NULL THEN
    RAISE NOTICE 'lensers.tag_follows not present, skipping'; RETURN;
  END IF;

  WITH ranked AS (
    SELECT ctid, lenser_id, tag_id,
           row_number() OVER (
             PARTITION BY lenser_id, tag_id
             ORDER BY ctid
           ) AS rn
    FROM lensers.tag_follows
  )
  DELETE FROM lensers.tag_follows tf
  USING ranked r
  WHERE tf.ctid = r.ctid AND r.rn > 1;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tag_follows_unique'
      AND conrelid = 'lensers.tag_follows'::regclass
  ) THEN
    ALTER TABLE lensers.tag_follows
      ADD CONSTRAINT tag_follows_unique UNIQUE (lenser_id, tag_id);
  END IF;
END $$;
