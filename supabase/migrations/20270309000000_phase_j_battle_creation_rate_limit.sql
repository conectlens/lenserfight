-- Phase J1: Per-lenser daily battle creation rate limit
-- Rejects the 6th+ battle created by the same lenser in a rolling 24-hour window.
-- Error code p0429 is mapped to HTTP 429 in the platform-api error handler.

CREATE OR REPLACE FUNCTION "public"."fn_battles_create"(
  "p_title"     "text",
  "p_slug"      "text",
  "p_task_prompt" "text",
  "p_rubric_id" "uuid" DEFAULT NULL::"uuid"
)
RETURNS "uuid"
LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO 'public', 'battles', 'lensers'
AS $$
DECLARE
  v_lenser_id uuid;
  v_battle_id uuid;
  v_count     integer;
BEGIN
  v_lenser_id := lensers.get_auth_lenser_id();
  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT count(*) INTO v_count
  FROM battles.battles
  WHERE creator_lenser_id = v_lenser_id
    AND created_at > now() - interval '24 hours';

  IF v_count >= 5 THEN
    RAISE EXCEPTION 'battle_rate_limit_exceeded'
      USING HINT = 'p0429';
  END IF;

  INSERT INTO battles.battles (creator_lenser_id, title, slug, task_prompt, rubric_id, status)
  VALUES (v_lenser_id, p_title, p_slug, p_task_prompt, p_rubric_id, 'draft')
  RETURNING id INTO v_battle_id;

  RETURN v_battle_id;
END;
$$;
