-- Extend fn_claim_battle_execution_job to return agent personality fields.
-- When the contender is an ai_agent, the worker now receives:
--   • ai_lenser_id          — id in agents.ai_lensers (for quota tracking)
--   • personality_note      — free-text role/tone description
--   • personality_version_id — rendered personality lens version (if bound)
--
-- These are then used in battle-worker.ts to build a system prompt for Claude
-- so each AI agent competes with its own distinct personality.

CREATE OR REPLACE FUNCTION battles.fn_claim_battle_execution_job(p_worker_id TEXT)
RETURNS TABLE (
  job_id                UUID,
  battle_id             UUID,
  contender_id          UUID,
  slot                  TEXT,
  task_prompt           TEXT,
  provider_key          TEXT,
  model_key             TEXT,
  byok_key_ref_id       TEXT,
  lens_id               UUID,
  version_id            UUID,
  max_tokens            INT,
  temperature           NUMERIC,
  retry_count           INT,
  -- personality fields (NULL when contender is not an ai_agent)
  ai_lenser_id          UUID,
  personality_note      TEXT,
  personality_version_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, agents, execution, public
AS $$
DECLARE
  v_job  battles.battle_execution_jobs;
BEGIN
  SELECT j.*
  INTO   v_job
  FROM   battles.battle_execution_jobs j
  WHERE  j.status = 'queued'
  ORDER  BY j.created_at
  LIMIT  1
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE battles.battle_execution_jobs
  SET    status     = 'claimed',
         worker_id  = p_worker_id,
         claimed_at = now()
  WHERE  id = v_job.id;

  RETURN QUERY
    SELECT
      v_job.id,
      v_job.battle_id,
      v_job.contender_id,
      v_job.slot,
      b.task_prompt,
      COALESCE(ec.provider_key, ''),
      COALESCE(ec.model_key,    ''),
      ec.byok_key_ref_id,
      cla.lens_id,
      cla.version_id,
      COALESCE(ec.max_tokens,   4096),
      COALESCE(ec.temperature,  0.7),
      v_job.retry_count,
      -- personality: only populated for ai_agent contenders
      al.id                     AS ai_lenser_id,
      al.personality_note       AS personality_note,
      plb.version_id            AS personality_version_id
    FROM battles.battles b
    -- execution config: contender-specific wins over battle-level fallback
    LEFT JOIN execution.execution_configs ec
           ON ec.battle_id    = v_job.battle_id
          AND (ec.contender_id = v_job.contender_id OR ec.contender_id IS NULL)
    -- instruction lens assigned to this contender slot
    LEFT JOIN battles.contender_lens_assignments cla
           ON cla.contender_id = v_job.contender_id
    -- agent identity (only joins when contender_type = 'ai_agent')
    LEFT JOIN battles.contenders con
           ON con.id           = v_job.contender_id
          AND con.contender_type = 'ai_agent'
    LEFT JOIN agents.ai_lensers al
           ON al.profile_id   = con.contender_ref_id
    -- personality lens binding: the default personality-tagged lens for this agent
    LEFT JOIN agents.lens_bindings plb
           ON plb.ai_lenser_id = al.id
          AND plb.is_default   = TRUE
          AND 'personality'   = ANY(plb.category_tags)
    WHERE b.id = v_job.battle_id
    ORDER BY ec.contender_id NULLS LAST   -- contender-specific config wins
    LIMIT 1;
END;
$$;
