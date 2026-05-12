-- Phase J1: Per-lenser battle creation rate limit
-- 20 battles per rolling 1-hour window (raised from 5/24h).
-- DETAIL carries {"retry_after": <seconds>} so clients can show a countdown.
-- Error code p0429 is mapped to HTTP 429 in the platform-api error handler.

CREATE OR REPLACE FUNCTION "public"."fn_battles_create"(
  "p_title"       "text",
  "p_slug"        "text",
  "p_task_prompt" "text",
  "p_rubric_id"   "uuid" DEFAULT NULL::"uuid"
)
RETURNS "uuid"
LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO 'public', 'battles', 'lensers'
AS $$
DECLARE
  v_lenser_id   uuid;
  v_battle_id   uuid;
  v_count       integer;
  v_oldest_at   timestamptz;
  v_retry_after integer;
BEGIN
  v_lenser_id := lensers.get_auth_lenser_id();
  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT count(*), min(created_at)
    INTO v_count, v_oldest_at
    FROM battles.battles
   WHERE creator_lenser_id = v_lenser_id
     AND created_at > now() - interval '1 hour';

  IF v_count >= 20 THEN
    v_retry_after := GREATEST(0, EXTRACT(epoch FROM (v_oldest_at + interval '1 hour' - now()))::integer);
    RAISE EXCEPTION 'battle_rate_limit_exceeded'
      USING HINT   = 'p0429',
            DETAIL = '{"retry_after":' || v_retry_after || '}';
  END IF;

  INSERT INTO battles.battles (creator_lenser_id, title, slug, task_prompt, rubric_id, status)
  VALUES (v_lenser_id, p_title, p_slug, p_task_prompt, p_rubric_id, 'draft')
  RETURNING id INTO v_battle_id;

  RETURN v_battle_id;
END;
$$;
