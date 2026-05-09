-- Phase Z7: Enforce existence of polymorphic reaction targets.
-- content.reactions.entity_id is a UUID with no FK because the parent type
-- varies (lens / thread / thread_reply). Without a check, parent deletions
-- leave orphan rows that inflate counts.
--
-- Approach: add a trigger that verifies the (entity_type, entity_id)
-- target exists at INSERT/UPDATE time. Cleanup orphans first into
-- audit.orphaned_reactions for review.
--
-- A future migration can replace the trigger with per-type nullable FK
-- columns + CHECK exactly-one-set; that requires app-layer changes so it
-- is deferred.

CREATE SCHEMA IF NOT EXISTS audit;

CREATE TABLE IF NOT EXISTS audit.orphaned_reactions (
  id           uuid,
  entity_type  text,
  entity_id    uuid,
  lenser_id    uuid,
  reaction     text,
  archived_at  timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF to_regclass('content.reactions') IS NULL THEN RETURN; END IF;

  -- Park existing orphans, then delete them so the new trigger can be safely
  -- applied. The mapping below covers the documented entity_type values.
  WITH orphans AS (
    SELECT r.id, r.entity_type, r.entity_id, r.lenser_id, r.reaction
    FROM content.reactions r
    WHERE
      (r.entity_type = 'lens'
        AND NOT EXISTS (SELECT 1 FROM lenses.lenses        l WHERE l.id  = r.entity_id))
      OR (r.entity_type = 'thread'
        AND NOT EXISTS (SELECT 1 FROM content.threads      t WHERE t.id  = r.entity_id))
      OR (r.entity_type = 'thread_reply'
        AND NOT EXISTS (SELECT 1 FROM content.thread_replies p WHERE p.id = r.entity_id))
  ),
  parked AS (
    INSERT INTO audit.orphaned_reactions (id, entity_type, entity_id, lenser_id, reaction)
    SELECT id, entity_type, entity_id, lenser_id, reaction FROM orphans
    RETURNING id
  )
  DELETE FROM content.reactions r
  USING parked p WHERE r.id = p.id;
END $$;

CREATE OR REPLACE FUNCTION content.fn_check_reaction_target()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  ok boolean;
BEGIN
  IF NEW.entity_type = 'lens' THEN
    SELECT EXISTS(SELECT 1 FROM lenses.lenses WHERE id = NEW.entity_id) INTO ok;
  ELSIF NEW.entity_type = 'thread' THEN
    SELECT EXISTS(SELECT 1 FROM content.threads WHERE id = NEW.entity_id) INTO ok;
  ELSIF NEW.entity_type = 'thread_reply' THEN
    SELECT EXISTS(SELECT 1 FROM content.thread_replies WHERE id = NEW.entity_id) INTO ok;
  ELSE
    RAISE EXCEPTION 'unsupported reaction entity_type: %', NEW.entity_type
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT ok THEN
    RAISE EXCEPTION 'reaction target %/% does not exist', NEW.entity_type, NEW.entity_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  RETURN NEW;
END $$;

DO $$
BEGIN
  IF to_regclass('content.reactions') IS NULL THEN RETURN; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_check_reaction_target'
      AND tgrelid = 'content.reactions'::regclass
  ) THEN
    EXECUTE $t$
      CREATE TRIGGER trg_check_reaction_target
      BEFORE INSERT OR UPDATE OF entity_type, entity_id ON content.reactions
      FOR EACH ROW EXECUTE FUNCTION content.fn_check_reaction_target()
    $t$;
  END IF;
END $$;
