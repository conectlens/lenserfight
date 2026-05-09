-- Phase J2: Battle creator moderation override RPC
-- Allows the battle creator to approve or reject a flagged submission.
-- Only the creator_lenser_id of the battle may call this function (enforced in-function).

CREATE OR REPLACE FUNCTION "public"."fn_decide_moderation_override"(
  "p_battle_id"  "uuid",
  "p_entry_id"   "uuid",   -- battles.submissions.id
  "p_decision"   "text",   -- 'allow' | 'reject'
  "p_reason"     "text"
)
RETURNS "void"
LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO 'public', 'battles', 'audit', 'lensers'
AS $$
DECLARE
  v_lenser_id        uuid;
  v_creator_lenser_id uuid;
  v_decision_type    text;
  v_new_status       battles.submission_status_enum;
BEGIN
  IF p_decision NOT IN ('allow', 'reject') THEN
    RAISE EXCEPTION 'Invalid decision: must be ''allow'' or ''reject''';
  END IF;

  v_lenser_id := lensers.get_auth_lenser_id();
  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Verify caller is the battle creator
  SELECT creator_lenser_id INTO v_creator_lenser_id
  FROM battles.battles
  WHERE id = p_battle_id;

  IF v_creator_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Battle not found: %', p_battle_id;
  END IF;

  IF v_creator_lenser_id <> v_lenser_id THEN
    RAISE EXCEPTION 'Only the battle creator may override moderation decisions'
      USING ERRCODE = '42501';
  END IF;

  -- Map decision to enum values
  IF p_decision = 'allow' THEN
    v_decision_type := 'restored';
    v_new_status    := 'submitted';
  ELSE
    v_decision_type := 'rejected';
    v_new_status    := 'disqualified';
  END IF;

  -- Update the submission status
  UPDATE battles.submissions
  SET status = v_new_status,
      updated_at = now()
  WHERE id = p_entry_id
    AND battle_id = p_battle_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found: %', p_entry_id;
  END IF;

  -- Audit the decision
  INSERT INTO audit.moderation_decisions (
    target_entity_schema,
    target_entity_table,
    target_entity_id,
    decision_type,
    reason,
    moderator_lenser_id,
    is_ai_moderated
  ) VALUES (
    'battles',
    'submissions',
    p_entry_id,
    v_decision_type,
    p_reason,
    v_lenser_id,
    false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION "public"."fn_decide_moderation_override"("uuid", "uuid", "text", "text")
  TO "authenticated";
