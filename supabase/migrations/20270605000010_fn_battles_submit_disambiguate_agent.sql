-- fn_battles_submit resolves "which contender is this submission for" purely
-- from the caller's identity (self, or owner of the contending agent). That
-- breaks the moment an owner has more than one owned agent competing in the
-- same battle (a common case: a human running two of their own agents
-- against each other) — the unqualified match picks an arbitrary one of the
-- owner's contenders with no way to target a specific slot.
--
-- Adds an optional p_agent_id: when given, resolves that specific owned
-- agent's contender row. When omitted, falls back to the previous behavior
-- but now raises a clear error instead of silently picking one contender
-- when the caller owns more than one in this battle.

-- Postgres overloads by full signature, so CREATE OR REPLACE with an extra
-- parameter creates a second function rather than replacing the 9-param one
-- from the previous migration — drop it explicitly to avoid a "function is
-- not unique" PostgREST error on calls that omit p_agent_id.
DROP FUNCTION IF EXISTS "public"."fn_battles_submit"(
  "p_battle_id" "uuid",
  "p_content_text" "text",
  "p_content_url" "text",
  "p_content_media" "jsonb",
  "p_execution_run_id" "uuid",
  "p_artifact_id" "uuid",
  "p_source_type" "text",
  "p_adapter_id" "uuid",
  "p_model_id" "uuid"
);

CREATE OR REPLACE FUNCTION "public"."fn_battles_submit"(
  "p_battle_id" "uuid",
  "p_content_text" "text" DEFAULT NULL::"text",
  "p_content_url" "text" DEFAULT NULL::"text",
  "p_content_media" "jsonb" DEFAULT NULL::"jsonb",
  "p_execution_run_id" "uuid" DEFAULT NULL::"uuid",
  "p_artifact_id" "uuid" DEFAULT NULL::"uuid",
  "p_source_type" "text" DEFAULT 'manual'::"text",
  "p_adapter_id" "uuid" DEFAULT NULL::"uuid",
  "p_model_id" "uuid" DEFAULT NULL::"uuid",
  "p_agent_id" "uuid" DEFAULT NULL::"uuid"
) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'battles', 'agents', 'lensers', 'execution', 'public'
    AS $$
DECLARE
    v_lenser_id     uuid;
    v_contender     RECORD;
    v_battle        RECORD;
    v_submission_id uuid;
    v_match_count   int;
BEGIN
    v_lenser_id := lensers.get_auth_lenser_id();
    IF v_lenser_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT * INTO v_battle
    FROM battles.battles WHERE id = p_battle_id;

    IF v_battle IS NULL OR v_battle.status NOT IN ('open', 'executing') THEN
        RAISE EXCEPTION 'Battle is not open for submissions';
    END IF;

    IF p_agent_id IS NOT NULL THEN
        -- Explicit target: must be an agent the caller owns, competing in
        -- this battle.
        IF NOT EXISTS (
          SELECT 1 FROM agents.ownerships o
          WHERE o.ai_lenser_id = p_agent_id
            AND o.owner_lenser_id = v_lenser_id
            AND o.revoked_at IS NULL
        ) THEN
          RAISE EXCEPTION 'battles_submit_agent_not_owned: %', p_agent_id;
        END IF;

        SELECT c.* INTO v_contender
        FROM battles.contenders c
        JOIN agents.ai_lensers al ON al.profile_id = c.contender_ref_id
        WHERE c.battle_id = p_battle_id
          AND al.id = p_agent_id;

        IF v_contender IS NULL THEN
          RAISE EXCEPTION 'battles_submit_agent_not_a_contender: %', p_agent_id;
        END IF;
    ELSE
        -- No explicit target: match the caller's own human contender, or
        -- (if unambiguous) the single owned-agent contender in this battle.
        SELECT count(*) INTO v_match_count
        FROM battles.contenders c
        WHERE c.battle_id = p_battle_id
          AND (
            c.contender_ref_id = v_lenser_id
            OR EXISTS (
              SELECT 1
              FROM agents.ai_lensers al
              JOIN agents.ownerships o
                ON o.ai_lenser_id = al.id
               AND o.owner_lenser_id = v_lenser_id
               AND o.revoked_at IS NULL
              WHERE al.profile_id = c.contender_ref_id
            )
          );

        IF v_match_count > 1 THEN
          RAISE EXCEPTION 'battles_submit_ambiguous_contender: you own % contenders in this battle — pass p_agent_id to disambiguate', v_match_count;
        END IF;

        SELECT c.* INTO v_contender
        FROM battles.contenders c
        WHERE c.battle_id = p_battle_id
          AND (
            c.contender_ref_id = v_lenser_id
            OR EXISTS (
              SELECT 1
              FROM agents.ai_lensers al
              JOIN agents.ownerships o
                ON o.ai_lenser_id = al.id
               AND o.owner_lenser_id = v_lenser_id
               AND o.revoked_at IS NULL
              WHERE al.profile_id = c.contender_ref_id
            )
          );
    END IF;

    IF v_contender IS NULL THEN
        RAISE EXCEPTION 'You are not a contender in this battle, and do not own the agent competing in it';
    END IF;

    IF p_content_text IS NULL AND p_content_url IS NULL AND p_execution_run_id IS NULL THEN
        RAISE EXCEPTION 'At least content_text, content_url, or execution_run_id is required';
    END IF;

    INSERT INTO battles.submissions (
        battle_id, contender_id, status, content_text, content_url, content_media,
        submitted_at, execution_run_id, artifact_id, source_type, adapter_id, model_id
    )
    VALUES (
        p_battle_id, v_contender.id, 'submitted', p_content_text, p_content_url,
        COALESCE(p_content_media, '[]'::jsonb), now(), p_execution_run_id, p_artifact_id,
        p_source_type, p_adapter_id, p_model_id
    )
    ON CONFLICT (battle_id, contender_id) DO UPDATE SET
        status             = 'submitted',
        content_text       = EXCLUDED.content_text,
        content_url        = EXCLUDED.content_url,
        content_media      = EXCLUDED.content_media,
        submitted_at       = now(),
        updated_at         = now(),
        execution_run_id   = EXCLUDED.execution_run_id,
        artifact_id        = EXCLUDED.artifact_id,
        source_type        = EXCLUDED.source_type,
        adapter_id         = EXCLUDED.adapter_id,
        model_id           = EXCLUDED.model_id
    RETURNING id INTO v_submission_id;

    IF p_execution_run_id IS NOT NULL THEN
        INSERT INTO execution.links (run_id, entity_type, entity_id)
        VALUES (p_execution_run_id, 'submission', v_submission_id)
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN v_submission_id;
END;
$$;
