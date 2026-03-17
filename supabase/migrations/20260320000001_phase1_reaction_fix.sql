-- =============================================================================
-- Phase 1: Reaction Enum Fix + fn_content_reactions_toggle Rewrite
--
-- Bug 1: content.reaction_enum has {like, dislike, saved, copy} but the
--   frontend uses {like, love, clap, saved, copy}. love and clap don't exist
--   in the DB — any attempt to use them fails with a type error.
--
-- Bug 2: fn_content_reactions_toggle returns {status: 'added'|'removed'} but
--   the service layer reads result.added (boolean). This is always undefined,
--   breaking reaction toggle UI state for all users.
--
-- Fix: Add 'love' and 'clap' to the enum (cannot remove 'dislike' safely
--   without recreating the type — deferred to Phase 2 after data check).
--   Rewrite fn_content_reactions_toggle to return {added: bool, counts: {...}}.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Extend content.reaction_enum with missing values
--    ADD VALUE cannot run inside a transaction block; it is auto-committed.
--    IF NOT EXISTS prevents errors on re-run.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TYPE "content"."reaction_enum" ADD VALUE IF NOT EXISTS 'love';
ALTER TYPE "content"."reaction_enum" ADD VALUE IF NOT EXISTS 'clap';


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Rewrite fn_content_reactions_toggle
--    Old return: jsonb_build_object('status', 'added'|'removed')
--    New return: jsonb_build_object('added', bool, 'counts', {reaction: count})
--
--    The function routes to the correct per-entity reaction table based on
--    p_target_type. Inline branching (no dynamic SQL) keeps it safe and fast.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "public"."fn_content_reactions_toggle"(
  "p_target_type" "text",
  "p_target_id"   "uuid",
  "p_reaction"    "content"."reaction_enum"
)
RETURNS "jsonb"
  LANGUAGE "plpgsql"
  SECURITY DEFINER
  SET "search_path" TO 'public', 'content', 'lensers', 'auth'
AS $$
DECLARE
  v_user_id uuid;
  v_added   boolean;
  v_counts  jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_target_type NOT IN ('thread', 'thread_reply', 'prompt_template') THEN
    RAISE EXCEPTION 'Invalid target_type: %', p_target_type;
  END IF;

  -- ── thread ────────────────────────────────────────────────────────────────
  IF p_target_type = 'thread' THEN
    IF EXISTS (
      SELECT 1 FROM content.thread_reactions
      WHERE thread_id = p_target_id
        AND user_id   = v_user_id
        AND reaction  = p_reaction
    ) THEN
      DELETE FROM content.thread_reactions
      WHERE thread_id = p_target_id
        AND user_id   = v_user_id
        AND reaction  = p_reaction;
      v_added := false;
    ELSE
      INSERT INTO content.thread_reactions (thread_id, user_id, reaction)
      VALUES (p_target_id, v_user_id, p_reaction);
      v_added := true;
    END IF;

    SELECT COALESCE(jsonb_object_agg(reaction, cnt), '{}'::jsonb) INTO v_counts
    FROM (
      SELECT reaction, COUNT(*)::int AS cnt
      FROM content.thread_reactions
      WHERE thread_id = p_target_id
      GROUP BY reaction
    ) s;

  -- ── thread_reply ──────────────────────────────────────────────────────────
  ELSIF p_target_type = 'thread_reply' THEN
    IF EXISTS (
      SELECT 1 FROM content.thread_reply_reactions
      WHERE reply_id = p_target_id
        AND user_id  = v_user_id
        AND reaction = p_reaction
    ) THEN
      DELETE FROM content.thread_reply_reactions
      WHERE reply_id = p_target_id
        AND user_id  = v_user_id
        AND reaction = p_reaction;
      v_added := false;
    ELSE
      INSERT INTO content.thread_reply_reactions (reply_id, user_id, reaction)
      VALUES (p_target_id, v_user_id, p_reaction);
      v_added := true;
    END IF;

    SELECT COALESCE(jsonb_object_agg(reaction, cnt), '{}'::jsonb) INTO v_counts
    FROM (
      SELECT reaction, COUNT(*)::int AS cnt
      FROM content.thread_reply_reactions
      WHERE reply_id = p_target_id
      GROUP BY reaction
    ) s;

  -- ── prompt_template ───────────────────────────────────────────────────────
  ELSE
    IF EXISTS (
      SELECT 1 FROM content.prompt_reactions
      WHERE prompt_id = p_target_id
        AND user_id   = v_user_id
        AND reaction  = p_reaction
    ) THEN
      DELETE FROM content.prompt_reactions
      WHERE prompt_id = p_target_id
        AND user_id   = v_user_id
        AND reaction  = p_reaction;
      v_added := false;
    ELSE
      INSERT INTO content.prompt_reactions (prompt_id, user_id, reaction)
      VALUES (p_target_id, v_user_id, p_reaction);
      v_added := true;
    END IF;

    SELECT COALESCE(jsonb_object_agg(reaction, cnt), '{}'::jsonb) INTO v_counts
    FROM (
      SELECT reaction, COUNT(*)::int AS cnt
      FROM content.prompt_reactions
      WHERE prompt_id = p_target_id
      GROUP BY reaction
    ) s;
  END IF;

  RETURN jsonb_build_object(
    'added',  v_added,
    'counts', v_counts
  );
END;
$$;

ALTER FUNCTION "public"."fn_content_reactions_toggle"(text, uuid, "content"."reaction_enum") OWNER TO "postgres";

-- Grants unchanged from original
REVOKE ALL ON FUNCTION "public"."fn_content_reactions_toggle"(text, uuid, "content"."reaction_enum") FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."fn_content_reactions_toggle"(text, uuid, "content"."reaction_enum") TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."fn_content_reactions_toggle"(text, uuid, "content"."reaction_enum") TO "service_role";

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
