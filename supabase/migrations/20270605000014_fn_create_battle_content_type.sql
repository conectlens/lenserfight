-- fn_create_battle (the richer battle-creation RPC, the only one that
-- accepts battle_type/lens_id/workflow_id) never accepted content_type, so
-- every battle created through it defaulted to the table's content_type
-- default ('text') regardless of what kind of output the bound lens
-- actually produces — e.g. an image-generation lens attached to a battle
-- still marked 'text'. Adds an optional p_content_type, defaulting to the
-- previous implicit behavior so existing callers are unaffected.

-- Both the added output column (content_type) and the added input parameter
-- create a distinct signature from Postgres's point of view — CREATE OR
-- REPLACE cannot change a function's return type, and would otherwise leave
-- the old 7-param overload active alongside this one (PGRST203 ambiguity,
-- same class of bug fixed for fn_battles_join/fn_battles_submit earlier).
DROP FUNCTION IF EXISTS "public"."fn_create_battle"(
  "p_title" "text",
  "p_task_prompt" "text",
  "p_battle_type" "text",
  "p_voter_eligibility" "text",
  "p_handicap_config" "jsonb",
  "p_workflow_id" "uuid",
  "p_lens_id" "uuid"
);

CREATE OR REPLACE FUNCTION "public"."fn_create_battle"(
  "p_title" "text",
  "p_task_prompt" "text",
  "p_battle_type" "text",
  "p_voter_eligibility" "text" DEFAULT 'open'::"text",
  "p_handicap_config" "jsonb" DEFAULT '{}'::"jsonb",
  "p_workflow_id" "uuid" DEFAULT NULL::"uuid",
  "p_lens_id" "uuid" DEFAULT NULL::"uuid",
  "p_content_type" "text" DEFAULT 'text'::"text"
) RETURNS TABLE(
  "id" "uuid", "slug" "text", "title" "text", "task_prompt" "text", "status" "text",
  "total_vote_count" integer, "published_at" timestamp with time zone,
  "voting_opens_at" timestamp with time zone, "voting_closes_at" timestamp with time zone,
  "battle_type" "text", "voter_eligibility" "text", "handicap_config" "jsonb",
  "creator_lenser_id" "uuid", "forum_thread_id" "text", "workflow_id" "uuid", "lens_id" "uuid",
  "execution_starts_at" timestamp with time zone, "auto_publish" boolean,
  "voting_duration_hours" integer, "vote_velocity" numeric, "og_image_url" "text",
  "winner_contender_id" "uuid", "parent_battle_id" "uuid", "deleted_at" timestamp with time zone,
  "content_type" "text"
)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles', 'lensers'
    AS $$
DECLARE
  v_lenser_id uuid := lensers.get_auth_lenser_id();
  v_slug      text;
BEGIN
  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;

  v_slug := lower(regexp_replace(p_title, '[^a-z0-9\s-]', '', 'gi'));
  v_slug := regexp_replace(v_slug, '\s+', '-', 'g');
  v_slug := regexp_replace(v_slug, '-+', '-', 'g');
  v_slug := left(v_slug, 80) || '-' || substr(md5(random()::text), 1, 6);

  RETURN QUERY
  INSERT INTO battles.battles (
    title, task_prompt, battle_type, voter_eligibility,
    handicap_config, creator_lenser_id, slug, status,
    workflow_id, lens_id, content_type
  ) VALUES (
    p_title, p_task_prompt, p_battle_type, p_voter_eligibility,
    COALESCE(p_handicap_config, '{}'::jsonb), v_lenser_id, v_slug, 'draft',
    p_workflow_id, p_lens_id, COALESCE(p_content_type, 'text')
  )
  RETURNING
    id, slug, title, task_prompt, status, total_vote_count, published_at,
    voting_opens_at, voting_closes_at, battle_type, voter_eligibility, handicap_config,
    creator_lenser_id, forum_thread_id, workflow_id, lens_id,
    execution_starts_at, auto_publish, voting_duration_hours, vote_velocity, og_image_url,
    winner_contender_id, parent_battle_id, deleted_at, content_type;
END;
$$;
