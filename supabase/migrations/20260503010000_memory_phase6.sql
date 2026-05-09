-- =============================================================================
-- 20260503010000_memory_phase6.sql
-- -----------------------------------------------------------------------------
-- Phase 6: Memory Management Per AI Agent.
--
-- agents.memory_profiles (Phase 4/5) is config-only. This migration adds:
--   * agents.memories            - the actual entry-level memory store
--   * agents.memory_access_logs  - read/write/redact audit trail
--   * fn_write_memory_entry, fn_read_memory_entries, fn_redact_memory_entry,
--     fn_summarize_memory_profile RPCs
--   * agents.memories_v          - memories joined with profile name
--
-- Memory writes are gated by the dispatch hook to only commit on successful
-- runs. Reads are logged so operators can audit what an agent has consumed.
-- =============================================================================

-- ─── agents.memories ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agents.memories (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id          uuid NOT NULL REFERENCES agents.memory_profiles(id) ON DELETE CASCADE,
  ai_lenser_id        uuid NOT NULL REFERENCES agents.ai_lensers(id) ON DELETE CASCADE,
  scope               text NOT NULL CHECK (scope IN ('project','conversation','global')),
  source              text NOT NULL CHECK (source IN ('user','agent','tool','eval','manual')),
  content             text NOT NULL,
  embedding_metadata  jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence          numeric NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  expires_at          timestamptz NULL,
  team_run_id         uuid NULL REFERENCES agents.team_runs(id) ON DELETE SET NULL,
  is_redacted         boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agents_memories_profile_scope
  ON agents.memories (profile_id, scope, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agents_memories_agent_expires
  ON agents.memories (ai_lenser_id, expires_at);

-- ─── agents.memory_access_logs ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agents.memory_access_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id    uuid NOT NULL REFERENCES agents.memories(id) ON DELETE CASCADE,
  team_run_id  uuid NULL REFERENCES agents.team_runs(id) ON DELETE SET NULL,
  action       text NOT NULL CHECK (action IN ('read','write','redact')),
  context      jsonb NOT NULL DEFAULT '{}'::jsonb,
  accessed_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agents_memory_access_logs_memory
  ON agents.memory_access_logs (memory_id, accessed_at DESC);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE agents.memories            ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.memory_access_logs  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS memories_owner_all ON agents.memories;
CREATE POLICY memories_owner_all ON agents.memories
  FOR ALL
  USING (agents.can_manage_ai_lenser(ai_lenser_id))
  WITH CHECK (agents.can_manage_ai_lenser(ai_lenser_id));

DROP POLICY IF EXISTS memory_access_logs_owner_all ON agents.memory_access_logs;
CREATE POLICY memory_access_logs_owner_all ON agents.memory_access_logs
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM agents.memories m
    WHERE m.id = memory_id
      AND agents.can_manage_ai_lenser(m.ai_lenser_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM agents.memories m
    WHERE m.id = memory_id
      AND agents.can_manage_ai_lenser(m.ai_lenser_id)
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON
  agents.memories,
  agents.memory_access_logs
TO authenticated, service_role;

-- ─── RPC: write a memory entry ───────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.fn_write_memory_entry(uuid, text, text, text, numeric, timestamptz, uuid, jsonb);
CREATE OR REPLACE FUNCTION public.fn_write_memory_entry(
  p_profile_id  uuid,
  p_scope       text,
  p_source      text,
  p_content     text,
  p_confidence  numeric DEFAULT 0.5,
  p_expires_at  timestamptz DEFAULT NULL,
  p_team_run_id uuid DEFAULT NULL,
  p_metadata    jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, agents
AS $$
DECLARE
  v_profile agents.memory_profiles;
  v_id      uuid;
BEGIN
  SELECT * INTO v_profile FROM agents.memory_profiles WHERE id = p_profile_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'memory profile not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT agents.can_manage_ai_lenser(v_profile.ai_lenser_id) THEN
    RAISE EXCEPTION 'not authorized for this agent' USING ERRCODE = '42501';
  END IF;

  INSERT INTO agents.memories (
    profile_id, ai_lenser_id, scope, source, content,
    embedding_metadata, confidence, expires_at, team_run_id
  )
  VALUES (
    p_profile_id, v_profile.ai_lenser_id, p_scope, p_source, p_content,
    COALESCE(p_metadata, '{}'::jsonb),
    COALESCE(p_confidence, 0.5),
    p_expires_at,
    p_team_run_id
  )
  RETURNING id INTO v_id;

  INSERT INTO agents.memory_access_logs (memory_id, team_run_id, action, context)
  VALUES (v_id, p_team_run_id, 'write', jsonb_build_object('source', p_source, 'scope', p_scope));

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION
  public.fn_write_memory_entry(uuid, text, text, text, numeric, timestamptz, uuid, jsonb)
  TO authenticated;

-- ─── RPC: read memory entries (ordered, filtered, logged) ────────────────────

DROP FUNCTION IF EXISTS public.fn_read_memory_entries(uuid, text, integer, uuid);
CREATE OR REPLACE FUNCTION public.fn_read_memory_entries(
  p_profile_id  uuid,
  p_scope       text DEFAULT NULL,
  p_limit       integer DEFAULT 10,
  p_team_run_id uuid DEFAULT NULL
)
RETURNS SETOF agents.memories
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, agents
AS $$
DECLARE
  v_profile agents.memory_profiles;
  v_row     agents.memories;
BEGIN
  SELECT * INTO v_profile FROM agents.memory_profiles WHERE id = p_profile_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'memory profile not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT agents.can_manage_ai_lenser(v_profile.ai_lenser_id) THEN
    RAISE EXCEPTION 'not authorized for this agent' USING ERRCODE = '42501';
  END IF;

  FOR v_row IN
    SELECT *
    FROM agents.memories
    WHERE profile_id = p_profile_id
      AND is_redacted = false
      AND (p_scope IS NULL OR scope = p_scope)
      AND (expires_at IS NULL OR expires_at > now())
    ORDER BY confidence DESC, created_at DESC
    LIMIT GREATEST(COALESCE(p_limit, 10), 1)
  LOOP
    INSERT INTO agents.memory_access_logs (memory_id, team_run_id, action, context)
    VALUES (v_row.id, p_team_run_id, 'read',
            jsonb_build_object('scope', p_scope, 'profile_id', p_profile_id));
    RETURN NEXT v_row;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION
  public.fn_read_memory_entries(uuid, text, integer, uuid)
  TO authenticated;

-- ─── RPC: redact a memory entry ──────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.fn_redact_memory_entry(uuid, text);
CREATE OR REPLACE FUNCTION public.fn_redact_memory_entry(
  p_memory_id uuid,
  p_reason    text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, agents
AS $$
DECLARE
  v_mem agents.memories;
BEGIN
  SELECT * INTO v_mem FROM agents.memories WHERE id = p_memory_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'memory not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT agents.can_manage_ai_lenser(v_mem.ai_lenser_id) THEN
    RAISE EXCEPTION 'not authorized for this agent' USING ERRCODE = '42501';
  END IF;

  UPDATE agents.memories
     SET content = '[redacted]',
         is_redacted = true
   WHERE id = p_memory_id;

  INSERT INTO agents.memory_access_logs (memory_id, action, context)
  VALUES (p_memory_id, 'redact', jsonb_build_object('reason', COALESCE(p_reason, '')));
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_redact_memory_entry(uuid, text) TO authenticated;

-- ─── RPC: summarize a memory profile (stub; same signature for future swap) ──

DROP FUNCTION IF EXISTS public.fn_summarize_memory_profile(uuid);
CREATE OR REPLACE FUNCTION public.fn_summarize_memory_profile(
  p_profile_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, agents
AS $$
DECLARE
  v_profile     agents.memory_profiles;
  v_count       integer;
  v_last_at     timestamptz;
  v_scope_stats jsonb;
BEGIN
  SELECT * INTO v_profile FROM agents.memory_profiles WHERE id = p_profile_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'memory profile not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT agents.can_manage_ai_lenser(v_profile.ai_lenser_id) THEN
    RAISE EXCEPTION 'not authorized for this agent' USING ERRCODE = '42501';
  END IF;

  SELECT COUNT(*), MAX(created_at)
    INTO v_count, v_last_at
    FROM agents.memories
   WHERE profile_id = p_profile_id AND is_redacted = false;

  SELECT COALESCE(jsonb_object_agg(scope, c), '{}'::jsonb)
    INTO v_scope_stats
    FROM (
      SELECT scope, COUNT(*) AS c
        FROM agents.memories
       WHERE profile_id = p_profile_id AND is_redacted = false
       GROUP BY scope
    ) s;

  RETURN jsonb_build_object(
    'profile_id',      p_profile_id,
    'count',           COALESCE(v_count, 0),
    'last_written_at', v_last_at,
    'scopes',          v_scope_stats
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_summarize_memory_profile(uuid) TO authenticated;

-- ─── View: memories joined with profile name ─────────────────────────────────

DROP VIEW IF EXISTS agents.memories_v;
CREATE OR REPLACE VIEW agents.memories_v AS
SELECT
  m.id,
  m.profile_id,
  p.name           AS profile_name,
  m.ai_lenser_id,
  m.scope,
  m.source,
  m.content,
  m.embedding_metadata,
  m.confidence,
  m.expires_at,
  m.team_run_id,
  m.is_redacted,
  m.created_at
FROM agents.memories m
JOIN agents.memory_profiles p ON p.id = m.profile_id
WHERE agents.can_manage_ai_lenser(m.ai_lenser_id);

GRANT SELECT ON agents.memories_v TO authenticated, service_role;

-- ─── Comments ────────────────────────────────────────────────────────────────

COMMENT ON TABLE agents.memories IS
  'Per-agent memory entries. Profile carries config; entries carry content. Writes are gated to successful runs; reads are logged.';

COMMENT ON TABLE agents.memory_access_logs IS
  'Audit trail for read/write/redact actions on agents.memories. One row per access.';

COMMENT ON FUNCTION public.fn_summarize_memory_profile(uuid) IS
  'Stub summary returning counts and last write. Replaceable by an LLM/embedding-backed summarizer behind the same signature (Open-Closed).';
