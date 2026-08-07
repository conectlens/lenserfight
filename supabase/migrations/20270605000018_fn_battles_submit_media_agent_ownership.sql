-- fn_battles_submit_media's ownership check only matched
-- battles.contender_entity_map.profile_id = auth.uid() — but
-- contender_entity_map.profile_id is populated ONLY for human contenders
-- (NULL for ai_model/ai_agent, which use ai_lenser_id instead — see
-- 20260520100000_fix_contender_entity_map_ai_resolution.sql). So a human
-- who owns an AI agent contender could never submit media on its behalf,
-- the same bug already fixed for fn_battles_submit's text/url path.
--
-- Fix: also accept ownership via agents.ownerships when the contender's
-- entity-map row resolves to an ai_lenser_id the caller owns.
--
-- Also fixes a second, pre-existing bug: v_uid was bound to raw auth.uid()
-- (auth.users.id) and compared directly against
-- contender_entity_map.profile_id (lensers.profiles.id) — two different id
-- spaces that are never equal (profiles.id is a separately generated uuid,
-- linked to auth.uid() via profiles.user_id). The human-contender ownership
-- path was therefore just as broken as the AI-agent one. Resolved via
-- lensers.get_auth_lenser_id(), the standard helper used everywhere else in
-- this codebase for this exact translation.

CREATE OR REPLACE FUNCTION "public"."fn_battles_submit_media"(
  "p_battle_id" "uuid",
  "p_contender_id" "uuid",
  "p_media_url" "text",
  "p_mime_type" "text",
  "p_output_modality" "text"
) RETURNS "battles"."submissions"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles', 'agents', 'lensers', 'extensions'
    AS $$
DECLARE
  v_uid       UUID := lensers.get_auth_lenser_id();
  v_row       battles.submissions%ROWTYPE;
  v_is_owner  BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;
  IF p_output_modality IS NULL
     OR p_output_modality NOT IN ('image', 'video', 'audio') THEN
    RAISE EXCEPTION 'invalid_output_modality: %', p_output_modality
      USING ERRCODE = '22023';
  END IF;
  IF p_media_url IS NULL OR char_length(p_media_url) = 0 THEN
    RAISE EXCEPTION 'media_url_required' USING ERRCODE = '22023';
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM battles.contenders c
      JOIN battles.contender_entity_map cem ON cem.contender_id = c.id
     WHERE c.id           = p_contender_id
       AND c.battle_id    = p_battle_id
       AND (
         cem.profile_id = v_uid
         OR EXISTS (
           SELECT 1
           FROM agents.ownerships o
           WHERE o.ai_lenser_id = cem.ai_lenser_id
             AND o.owner_lenser_id = v_uid
             AND o.revoked_at IS NULL
         )
       )
  )
  INTO v_is_owner;

  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'contender_not_owned' USING ERRCODE = '42501';
  END IF;

  INSERT INTO battles.submissions (
    battle_id,
    contender_id,
    content_url,
    media_url,
    mime_type,
    output_modality,
    status
  ) VALUES (
    p_battle_id,
    p_contender_id,
    p_media_url,
    p_media_url,
    p_mime_type,
    p_output_modality,
    'submitted'
  )
  ON CONFLICT (battle_id, contender_id) DO UPDATE
    SET content_url     = EXCLUDED.content_url,
        media_url       = EXCLUDED.media_url,
        mime_type       = EXCLUDED.mime_type,
        output_modality = EXCLUDED.output_modality,
        status          = 'submitted',
        submitted_at    = COALESCE(battles.submissions.submitted_at, now())
  RETURNING * INTO v_row;

  RETURN v_row;
END $$;
