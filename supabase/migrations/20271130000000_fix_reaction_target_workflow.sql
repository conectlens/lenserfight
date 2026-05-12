-- Fix fn_check_reaction_target to support 'workflow' entity_type.
-- The enum already includes 'workflow' and triggers reference it, but the
-- trigger function's CASE was missing the branch, causing a check_violation
-- on any reaction insert targeting a workflow entity.

CREATE OR REPLACE FUNCTION "content"."fn_check_reaction_target"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
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
  ELSIF NEW.entity_type = 'workflow' THEN
    SELECT EXISTS(SELECT 1 FROM lenses.workflows WHERE id = NEW.entity_id) INTO ok;
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
