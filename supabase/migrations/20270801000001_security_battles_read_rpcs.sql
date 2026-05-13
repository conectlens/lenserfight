-- Security hardening: public SECURITY DEFINER wrappers for battles schema.
--
-- Removes the need to expose the `battles` schema via PostgREST.
-- Existing public RPCs (fn_submit_vote, fn_get_battle_results, fn_battles_create_rematch,
-- fn_get_trending_battles, fn_get_battle_results, fn_publish_battle, fn_battle_open_voting,
-- fn_battle_close_voting, fn_get_ai_judge_verdicts, fn_battles_finalize, etc.) remain
-- unchanged. This migration only adds wrappers for remaining direct table access.
--
-- Auth context: battles.creator_lenser_id = lensers profile id (not raw auth.uid()).
-- lensers.get_auth_lenser_id() is used throughout.

-- ─── READ: fn_get_battle ─────────────────────────────────────────────────────
-- Look up a battle by id or slug. Draft battles only visible to creator.
-- Granted to anon so share-card routes and public browse work unauthenticated.

CREATE OR REPLACE FUNCTION public.fn_get_battle(
  p_battle_id uuid DEFAULT NULL,
  p_slug      text DEFAULT NULL
)
RETURNS TABLE(
  id                   uuid,
  slug                 text,
  title                text,
  task_prompt          text,
  status               text,
  total_vote_count     integer,
  published_at         timestamptz,
  voting_opens_at      timestamptz,
  voting_closes_at     timestamptz,
  finalized_at         timestamptz,
  battle_type          text,
  voter_eligibility    text,
  handicap_config      jsonb,
  creator_lenser_id    uuid,
  forum_thread_id      text,
  workflow_id          uuid,
  lens_id              uuid,
  execution_starts_at  timestamptz,
  auto_publish         boolean,
  voting_duration_hours integer,
  vote_velocity        numeric,
  og_image_url         text,
  winner_contender_id  uuid,
  parent_battle_id     uuid,
  deleted_at           timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'battles', 'lensers'
AS $$
  SELECT
    b.id, b.slug, b.title, b.task_prompt, b.status, b.total_vote_count,
    b.published_at, b.voting_opens_at, b.voting_closes_at, b.finalized_at,
    b.battle_type, b.voter_eligibility, b.handicap_config, b.creator_lenser_id,
    b.forum_thread_id, b.workflow_id, b.lens_id, b.execution_starts_at,
    b.auto_publish, b.voting_duration_hours, b.vote_velocity, b.og_image_url,
    b.winner_contender_id, b.parent_battle_id, b.deleted_at
  FROM battles.battles b
  WHERE (p_battle_id IS NULL OR b.id   = p_battle_id)
    AND (p_slug      IS NULL OR b.slug = p_slug)
    AND b.deleted_at IS NULL
    AND (
      -- Non-draft battles are public
      b.status <> 'draft'
      -- Drafts are creator-only
      OR b.creator_lenser_id = lensers.get_auth_lenser_id()
    )
  LIMIT 1;
$$;

ALTER FUNCTION public.fn_get_battle(uuid, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_battle(uuid, text) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.fn_get_battle(uuid, text) IS
  'Security wrapper: look up a battle by id or slug. Public battles are visible '
  'to everyone; drafts only to the creator. Returns NULL when not found or '
  'draft-and-not-creator.';

-- ─── READ: fn_get_battle_contenders ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_get_battle_contenders(p_battle_id uuid)
RETURNS TABLE(
  id               uuid,
  battle_id        uuid,
  slot             text,
  contender_type   text,
  display_name     text,
  contender_ref_id uuid,
  contender_status text,
  entry_mode       text,
  joined_at        timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'battles'
AS $$
  SELECT c.id, c.battle_id, c.slot::text, c.contender_type::text, c.display_name,
         c.contender_ref_id, c.contender_status, c.entry_mode,
         c.joined_at
  FROM battles.contenders c
  WHERE c.battle_id = p_battle_id
  ORDER BY c.slot;
$$;

ALTER FUNCTION public.fn_get_battle_contenders(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_battle_contenders(uuid) TO anon, authenticated, service_role;

-- ─── READ: fn_get_battle_submissions ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_get_battle_submissions(p_battle_id uuid)
RETURNS TABLE(
  id              uuid,
  battle_id       uuid,
  contender_id    uuid,
  content_text    text,
  content_url     text,
  status          text,
  submitted_at    timestamptz,
  execution_run_id uuid,
  is_final        boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'battles'
AS $$
  SELECT s.id, s.battle_id, s.contender_id, s.content_text, s.content_url,
         s.status::text, s.submitted_at, s.execution_run_id, s.is_final
  FROM battles.submissions s
  WHERE s.battle_id = p_battle_id;
$$;

ALTER FUNCTION public.fn_get_battle_submissions(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_battle_submissions(uuid) TO anon, authenticated, service_role;

-- ─── READ: fn_get_vote_aggregates ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_get_vote_aggregates(p_battle_id uuid)
RETURNS TABLE(
  battle_id         uuid,
  contender_id      uuid,
  raw_vote_count    integer,
  weighted_vote_sum numeric,
  draw_count        integer,
  rank_position     integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'battles'
AS $$
  SELECT va.battle_id, va.contender_id, va.raw_vote_count,
         va.weighted_vote_sum, va.draw_count, va.rank_position
  FROM battles.vote_aggregates va
  WHERE va.battle_id = p_battle_id;
$$;

ALTER FUNCTION public.fn_get_vote_aggregates(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_vote_aggregates(uuid) TO anon, authenticated, service_role;

-- ─── READ: fn_get_battle_scorecards ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_get_battle_scorecards(p_battle_id uuid)
RETURNS TABLE(
  id                   uuid,
  battle_id            uuid,
  contender_id         uuid,
  rubric_criterion_id  uuid,
  result               text,
  explanation          text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'battles'
AS $$
  SELECT sc.id, sc.battle_id, sc.contender_id, sc.rubric_criterion_id,
         sc.result, sc.explanation
  FROM battles.scorecards sc
  WHERE sc.battle_id = p_battle_id;
$$;

ALTER FUNCTION public.fn_get_battle_scorecards(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_battle_scorecards(uuid) TO anon, authenticated, service_role;

-- ─── READ: fn_get_rubric_criteria ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_get_rubric_criteria(p_criterion_ids uuid[])
RETURNS TABLE(
  id          uuid,
  title       text,
  description text,
  weight      numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'battles'
AS $$
  SELECT rc.id, rc.title, rc.description, rc.weight
  FROM battles.rubric_criteria rc
  WHERE rc.id = ANY(p_criterion_ids);
$$;

ALTER FUNCTION public.fn_get_rubric_criteria(uuid[]) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_rubric_criteria(uuid[]) TO anon, authenticated, service_role;

-- ─── READ: fn_get_my_vote ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_get_my_vote(p_battle_id uuid)
RETURNS TABLE(vote_value text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'battles', 'lensers'
AS $$
  SELECT v.vote_value::text
  FROM battles.votes v
  WHERE v.battle_id       = p_battle_id
    AND v.voter_lenser_id = lensers.get_auth_lenser_id()
  LIMIT 1;
$$;

ALTER FUNCTION public.fn_get_my_vote(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_my_vote(uuid) TO authenticated, service_role;

-- ─── READ: fn_get_ai_handicap_policy ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_get_ai_handicap_policy(p_battle_id uuid)
RETURNS TABLE(
  id                    uuid,
  battle_id             uuid,
  max_tokens_per_second integer,
  injected_delay_ms     integer,
  max_context_tokens    integer,
  allowed_model_tier    text,
  time_budget_ms        integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'battles'
AS $$
  SELECT hp.id, hp.battle_id, hp.max_tokens_per_second, hp.injected_delay_ms,
         hp.max_context_tokens, hp.allowed_model_tier, hp.time_budget_ms
  FROM battles.ai_handicap_policies hp
  WHERE hp.battle_id = p_battle_id
  LIMIT 1;
$$;

ALTER FUNCTION public.fn_get_ai_handicap_policy(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_ai_handicap_policy(uuid) TO anon, authenticated, service_role;

-- ─── READ: fn_get_battle_execution_jobs (creator-scoped) ─────────────────────

CREATE OR REPLACE FUNCTION public.fn_get_battle_execution_jobs(p_battle_id uuid)
RETURNS TABLE(
  id            uuid,
  battle_id     uuid,
  contender_id  uuid,
  slot          text,
  status        text,
  worker_id     text,
  claimed_at    timestamptz,
  completed_at  timestamptz,
  retry_count   integer,
  max_retries   integer,
  error_message text,
  created_at    timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'battles', 'lensers'
AS $$
  SELECT j.id, j.battle_id, j.contender_id, j.slot, j.status, j.worker_id,
         j.claimed_at, j.completed_at, j.retry_count, j.max_retries,
         j.error_message, j.created_at
  FROM battles.battle_execution_jobs j
  JOIN battles.battles b ON b.id = j.battle_id
  WHERE j.battle_id = p_battle_id
    AND (b.creator_lenser_id = lensers.get_auth_lenser_id() OR public.is_admin())
  ORDER BY j.slot;
$$;

ALTER FUNCTION public.fn_get_battle_execution_jobs(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_battle_execution_jobs(uuid) TO authenticated, service_role;

-- ─── READ: fn_get_battle_public_execution_jobs (public view) ─────────────────
-- Delegates to the existing battles.fn_get_public_execution_jobs view function.

CREATE OR REPLACE FUNCTION public.fn_get_battle_public_execution_jobs(p_battle_id uuid)
RETURNS TABLE(
  id           uuid,
  battle_id    uuid,
  slot         text,
  status       text,
  claimed_at   timestamptz,
  completed_at timestamptz,
  retry_count  integer,
  created_at   timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'battles'
AS $$
  SELECT id, battle_id, slot, status, claimed_at, completed_at, retry_count, created_at
  FROM battles.v_execution_jobs_public
  WHERE battle_id = p_battle_id
  ORDER BY slot;
$$;

ALTER FUNCTION public.fn_get_battle_public_execution_jobs(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_battle_public_execution_jobs(uuid) TO anon, authenticated, service_role;

-- ─── READ: fn_list_battle_templates ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_list_battle_templates(
  p_limit  integer     DEFAULT 50,
  p_cursor timestamptz DEFAULT NULL
)
RETURNS TABLE(
  id             uuid,
  title          text,
  description    text,
  task_prompt    text,
  is_public      boolean,
  max_contenders integer,
  created_at     timestamptz,
  updated_at     timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'battles'
AS $$
  SELECT t.id, t.title, t.description, t.task_prompt,
         t.is_public, t.max_contenders, t.created_at, t.updated_at
  FROM battles.templates t
  WHERE t.deleted_at IS NULL
    AND (p_cursor IS NULL OR t.created_at < p_cursor)
  ORDER BY t.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
$$;

ALTER FUNCTION public.fn_list_battle_templates(integer, timestamptz) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_list_battle_templates(integer, timestamptz) TO anon, authenticated, service_role;

-- ─── SCHEMA: contender_lens_assignments.input_snapshot ───────────────────────
-- Stores user-supplied [[param]] values captured at assignment time.
-- NOT NULL DEFAULT '{}' keeps existing rows valid; backward-compat for all callers.

ALTER TABLE battles.contender_lens_assignments
  ADD COLUMN IF NOT EXISTS input_snapshot JSONB NOT NULL DEFAULT '{}';

-- ─── READ: fn_get_lens_assignment ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_get_lens_assignment(p_contender_id uuid)
RETURNS TABLE(
  id             uuid,
  contender_id   uuid,
  battle_id      uuid,
  lens_id        uuid,
  version_id     uuid,
  assigned_at    timestamptz,
  input_snapshot jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'battles'
AS $$
  SELECT la.id, la.contender_id, la.battle_id, la.lens_id, la.version_id,
         la.assigned_at, la.input_snapshot
  FROM battles.contender_lens_assignments la
  WHERE la.contender_id = p_contender_id
  LIMIT 1;
$$;

ALTER FUNCTION public.fn_get_lens_assignment(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_lens_assignment(uuid) TO authenticated, service_role;

-- ─── READ: fn_get_dlq_entries ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_get_dlq_entries(
  p_battle_id      uuid    DEFAULT NULL,
  p_unresolved_only boolean DEFAULT false,
  p_limit          integer DEFAULT 50
)
RETURNS TABLE(
  id            uuid,
  job_id        uuid,
  battle_id     uuid,
  contender_id  uuid,
  slot          text,
  error_code    text,
  error_message text,
  attempt_count integer,
  payload       jsonb,
  resolved_at   timestamptz,
  created_at    timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'battles'
AS $$
  SELECT dl.id, dl.job_id, dl.battle_id, dl.contender_id, dl.slot,
         dl.error_code, dl.error_message, dl.attempt_count, dl.payload,
         dl.resolved_at, dl.created_at
  FROM battles.battle_execution_dead_letters dl
  WHERE (p_battle_id IS NULL       OR dl.battle_id = p_battle_id)
    AND (NOT p_unresolved_only     OR dl.resolved_at IS NULL)
  ORDER BY dl.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
$$;

ALTER FUNCTION public.fn_get_dlq_entries(uuid, boolean, integer) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_dlq_entries(uuid, boolean, integer) TO authenticated, service_role;

-- ─── READ: fn_check_voter_eligibility ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_check_voter_eligibility(
  p_battle_id uuid,
  p_lenser_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'battles', 'lensers'
AS $$
DECLARE
  v_eligibility text;
  v_type        text;
  v_onboarding  text;
BEGIN
  SELECT voter_eligibility INTO v_eligibility
  FROM battles.battles
  WHERE id = p_battle_id;

  IF NOT FOUND THEN RETURN false; END IF;
  IF v_eligibility = 'open' THEN RETURN true; END IF;

  SELECT type, onboarding_step INTO v_type, v_onboarding
  FROM lensers.profiles
  WHERE id = p_lenser_id;

  IF NOT FOUND THEN RETURN false; END IF;

  IF    v_eligibility = 'human_only'      THEN RETURN v_type = 'human';
  ELSIF v_eligibility = 'ai_only'         THEN RETURN v_type = 'ai';
  ELSIF v_eligibility = 'verified_lenser' THEN RETURN v_onboarding = 'completed';
  END IF;

  RETURN true;
END;
$$;

ALTER FUNCTION public.fn_check_voter_eligibility(uuid, uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_check_voter_eligibility(uuid, uuid) TO authenticated, service_role;

-- ─── WRITE: fn_create_battle ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_create_battle(
  p_title           text,
  p_task_prompt     text,
  p_battle_type     text,
  p_voter_eligibility text DEFAULT 'open',
  p_handicap_config jsonb DEFAULT '{}'::jsonb,
  p_workflow_id     uuid  DEFAULT NULL,
  p_lens_id         uuid  DEFAULT NULL
)
RETURNS TABLE(
  id uuid, slug text, title text, task_prompt text, status text,
  total_vote_count integer, published_at timestamptz,
  voting_opens_at timestamptz, voting_closes_at timestamptz,
  battle_type text, voter_eligibility text, handicap_config jsonb,
  creator_lenser_id uuid, forum_thread_id text, workflow_id uuid, lens_id uuid,
  execution_starts_at timestamptz, auto_publish boolean,
  voting_duration_hours integer, vote_velocity numeric, og_image_url text,
  winner_contender_id uuid, parent_battle_id uuid, deleted_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'battles', 'lensers'
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
    workflow_id, lens_id
  ) VALUES (
    p_title, p_task_prompt, p_battle_type, p_voter_eligibility,
    COALESCE(p_handicap_config, '{}'::jsonb), v_lenser_id, v_slug, 'draft',
    p_workflow_id, p_lens_id
  )
  RETURNING
    id, slug, title, task_prompt, status, total_vote_count, published_at,
    voting_opens_at, voting_closes_at, battle_type, voter_eligibility, handicap_config,
    creator_lenser_id, forum_thread_id, workflow_id, lens_id,
    execution_starts_at, auto_publish, voting_duration_hours, vote_velocity, og_image_url,
    winner_contender_id, parent_battle_id, deleted_at;
END;
$$;

ALTER FUNCTION public.fn_create_battle(text, text, text, text, jsonb, uuid, uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_create_battle(text, text, text, text, jsonb, uuid, uuid) TO authenticated, service_role;

-- ─── WRITE: fn_update_battle ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_update_battle(
  p_battle_id         uuid,
  p_title             text  DEFAULT NULL,
  p_task_prompt       text  DEFAULT NULL,
  p_battle_type       text  DEFAULT NULL,
  p_voter_eligibility text  DEFAULT NULL,
  p_handicap_config   jsonb DEFAULT NULL,
  p_workflow_id       uuid  DEFAULT NULL,
  p_lens_id           uuid  DEFAULT NULL,
  p_forum_thread_id   text  DEFAULT NULL
)
RETURNS TABLE(
  id uuid, slug text, title text, task_prompt text, status text,
  total_vote_count integer, published_at timestamptz,
  voting_opens_at timestamptz, voting_closes_at timestamptz,
  battle_type text, voter_eligibility text, handicap_config jsonb,
  creator_lenser_id uuid, forum_thread_id text, workflow_id uuid, lens_id uuid,
  execution_starts_at timestamptz, auto_publish boolean,
  voting_duration_hours integer, vote_velocity numeric, og_image_url text,
  winner_contender_id uuid, parent_battle_id uuid, deleted_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'battles', 'lensers'
AS $$
DECLARE
  v_lenser_id uuid := lensers.get_auth_lenser_id();
BEGIN
  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  UPDATE battles.battles
  SET
    title             = COALESCE(p_title,             title),
    task_prompt       = COALESCE(p_task_prompt,       task_prompt),
    battle_type       = COALESCE(p_battle_type,       battle_type),
    voter_eligibility = COALESCE(p_voter_eligibility, voter_eligibility),
    handicap_config   = COALESCE(p_handicap_config,   handicap_config),
    workflow_id       = COALESCE(p_workflow_id,        workflow_id),
    lens_id           = COALESCE(p_lens_id,            lens_id),
    forum_thread_id   = COALESCE(p_forum_thread_id,   forum_thread_id)
  WHERE id = p_battle_id
    AND creator_lenser_id = v_lenser_id
  RETURNING
    id, slug, title, task_prompt, status, total_vote_count, published_at,
    voting_opens_at, voting_closes_at, battle_type, voter_eligibility, handicap_config,
    creator_lenser_id, forum_thread_id, workflow_id, lens_id,
    execution_starts_at, auto_publish, voting_duration_hours, vote_velocity, og_image_url,
    winner_contender_id, parent_battle_id, deleted_at;
END;
$$;

ALTER FUNCTION public.fn_update_battle(uuid, text, text, text, text, jsonb, uuid, uuid, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_update_battle(uuid, text, text, text, text, jsonb, uuid, uuid, text) TO authenticated, service_role;

-- ─── WRITE: fn_schedule_battle ───────────────────────────────────────────────
-- Legacy direct-update scheduling (execution_starts_at on battles table).
-- Distinct from fn_battle_set_schedule which manages battles.schedules rows.

CREATE OR REPLACE FUNCTION public.fn_schedule_battle(
  p_battle_id            uuid,
  p_execution_starts_at  timestamptz,
  p_voting_duration_hours integer DEFAULT 24,
  p_auto_publish          boolean DEFAULT true
)
RETURNS TABLE(
  id uuid, slug text, title text, task_prompt text, status text,
  total_vote_count integer, published_at timestamptz,
  voting_opens_at timestamptz, voting_closes_at timestamptz,
  battle_type text, voter_eligibility text, handicap_config jsonb,
  creator_lenser_id uuid, forum_thread_id text, workflow_id uuid, lens_id uuid,
  execution_starts_at timestamptz, auto_publish boolean,
  voting_duration_hours integer, vote_velocity numeric, og_image_url text,
  winner_contender_id uuid, parent_battle_id uuid, deleted_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'battles', 'lensers'
AS $$
DECLARE
  v_lenser_id uuid := lensers.get_auth_lenser_id();
BEGIN
  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  UPDATE battles.battles
  SET
    execution_starts_at   = p_execution_starts_at,
    voting_duration_hours = COALESCE(p_voting_duration_hours, 24),
    auto_publish          = COALESCE(p_auto_publish, true)
  WHERE id = p_battle_id
    AND creator_lenser_id = v_lenser_id
  RETURNING
    id, slug, title, task_prompt, status, total_vote_count, published_at,
    voting_opens_at, voting_closes_at, battle_type, voter_eligibility, handicap_config,
    creator_lenser_id, forum_thread_id, workflow_id, lens_id,
    execution_starts_at, auto_publish, voting_duration_hours, vote_velocity, og_image_url,
    winner_contender_id, parent_battle_id, deleted_at;
END;
$$;

ALTER FUNCTION public.fn_schedule_battle(uuid, timestamptz, integer, boolean) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_schedule_battle(uuid, timestamptz, integer, boolean) TO authenticated, service_role;

-- ─── WRITE: fn_post_battle_comment ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_post_battle_comment(
  p_battle_id uuid,
  p_body      text
)
RETURNS TABLE(
  id         uuid,
  battle_id  uuid,
  lenser_id  uuid,
  body       text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'battles', 'lensers'
AS $$
DECLARE
  v_lenser_id uuid := lensers.get_auth_lenser_id();
BEGIN
  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  INSERT INTO battles.comments (battle_id, lenser_id, body)
  VALUES (p_battle_id, v_lenser_id, p_body)
  RETURNING id, battle_id, lenser_id, body, created_at, updated_at;
END;
$$;

ALTER FUNCTION public.fn_post_battle_comment(uuid, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_post_battle_comment(uuid, text) TO authenticated, service_role;

-- ─── WRITE: fn_remove_battle_contender ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_remove_battle_contender(p_contender_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'battles', 'lensers'
AS $$
DECLARE
  v_lenser_id uuid := lensers.get_auth_lenser_id();
BEGIN
  DELETE FROM battles.contenders c
  USING battles.battles b
  WHERE c.id = p_contender_id
    AND c.battle_id = b.id
    AND b.creator_lenser_id = v_lenser_id;
END;
$$;

ALTER FUNCTION public.fn_remove_battle_contender(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_remove_battle_contender(uuid) TO authenticated, service_role;

-- ─── WRITE: fn_invite_battle_contender ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_invite_battle_contender(
  p_battle_id        uuid,
  p_slot             text,
  p_contender_type   text,
  p_contender_ref_id uuid,
  p_display_name     text
)
RETURNS TABLE(
  id               uuid,
  battle_id        uuid,
  slot             text,
  contender_type   text,
  display_name     text,
  contender_ref_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'battles', 'lensers'
AS $$
DECLARE
  v_lenser_id uuid := lensers.get_auth_lenser_id();
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM battles.battles
    WHERE id = p_battle_id AND creator_lenser_id = v_lenser_id
  ) THEN
    RAISE EXCEPTION 'invite_contender_forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  INSERT INTO battles.contenders (
    battle_id, slot, contender_type, contender_ref_id, display_name,
    entry_mode, contender_status
  ) VALUES (
    p_battle_id, p_slot, p_contender_type, p_contender_ref_id, p_display_name,
    'invited', 'pending'
  )
  RETURNING id, battle_id, slot, contender_type, display_name, contender_ref_id;
END;
$$;

ALTER FUNCTION public.fn_invite_battle_contender(uuid, text, text, uuid, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_invite_battle_contender(uuid, text, text, uuid, text) TO authenticated, service_role;

-- ─── WRITE: fn_submit_contender_entry ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_submit_contender_entry(
  p_battle_id    uuid,
  p_contender_id uuid,
  p_content_text text
)
RETURNS TABLE(
  id           uuid,
  battle_id    uuid,
  contender_id uuid,
  content_text text,
  content_url  text,
  status       text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'battles'
AS $$
  INSERT INTO battles.submissions (battle_id, contender_id, content_text, content_url, status)
  VALUES (p_battle_id, p_contender_id, p_content_text, NULL, 'submitted')
  RETURNING id, battle_id, contender_id, content_text, content_url, status;
$$;

ALTER FUNCTION public.fn_submit_contender_entry(uuid, uuid, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_submit_contender_entry(uuid, uuid, text) TO authenticated, service_role;

-- ─── WRITE: fn_assign_lens_to_contender ──────────────────────────────────────
-- p_input_snapshot stores captured [[param]] values (DEFAULT '{}' keeps all
-- existing callers that omit it working without change).

CREATE OR REPLACE FUNCTION public.fn_assign_lens_to_contender(
  p_contender_id   uuid,
  p_battle_id      uuid,
  p_lens_id        uuid,
  p_version_id     uuid  DEFAULT NULL,
  p_input_snapshot jsonb DEFAULT '{}'
)
RETURNS TABLE(
  id             uuid,
  contender_id   uuid,
  battle_id      uuid,
  lens_id        uuid,
  version_id     uuid,
  assigned_at    timestamptz,
  input_snapshot jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'battles'
AS $$
  INSERT INTO battles.contender_lens_assignments
    (contender_id, battle_id, lens_id, version_id, input_snapshot)
  VALUES
    (p_contender_id, p_battle_id, p_lens_id, p_version_id, p_input_snapshot)
  ON CONFLICT (contender_id) DO UPDATE
    SET lens_id        = EXCLUDED.lens_id,
        version_id     = EXCLUDED.version_id,
        input_snapshot = EXCLUDED.input_snapshot
  RETURNING id, contender_id, battle_id, lens_id, version_id, assigned_at, input_snapshot;
$$;

ALTER FUNCTION public.fn_assign_lens_to_contender(uuid, uuid, uuid, uuid, jsonb) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_assign_lens_to_contender(uuid, uuid, uuid, uuid, jsonb) TO authenticated, service_role;

-- ─── WRITE: fn_toggle_battle_template_public ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_toggle_battle_template_public(
  p_template_id uuid,
  p_is_public   boolean
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'battles'
AS $$
  UPDATE battles.templates
  SET is_public  = p_is_public,
      updated_at = now()
  WHERE id = p_template_id;
$$;

ALTER FUNCTION public.fn_toggle_battle_template_public(uuid, boolean) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_toggle_battle_template_public(uuid, boolean) TO authenticated, service_role;

-- ─── SERVICE-ROLE-ONLY: fn_worker_claim_battle_job ───────────────────────────
-- Wrapper so battle-worker.ts can call supabase.rpc('fn_worker_claim_battle_job')
-- without needing .schema('battles'). Returns the same TABLE shape as the
-- underlying battles.fn_claim_battle_execution_job.

CREATE OR REPLACE FUNCTION public.fn_worker_claim_battle_job(p_worker_id text)
RETURNS TABLE(
  job_id                 uuid,
  battle_id              uuid,
  contender_id           uuid,
  slot                   text,
  task_prompt            text,
  provider_key           text,
  model_key              text,
  byok_key_ref_id        text,
  lens_id                uuid,
  version_id             uuid,
  max_tokens             integer,
  temperature            numeric,
  retry_count            integer,
  ai_lenser_id           uuid,
  personality_note       text,
  personality_version_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'battles'
AS $$
BEGIN
  RETURN QUERY SELECT * FROM battles.fn_claim_battle_execution_job(p_worker_id);
END;
$$;

ALTER FUNCTION public.fn_worker_claim_battle_job(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_worker_claim_battle_job(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_worker_claim_battle_job(text) TO service_role;

-- ─── SERVICE-ROLE-ONLY: fn_worker_complete_battle_job ────────────────────────

CREATE OR REPLACE FUNCTION public.fn_worker_complete_battle_job(
  p_job_id      uuid,
  p_status      text,
  p_output_text text DEFAULT NULL,
  p_error       text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'battles'
AS $$
BEGIN
  PERFORM battles.fn_complete_battle_execution_job(p_job_id, p_status, p_output_text, p_error);
END;
$$;

ALTER FUNCTION public.fn_worker_complete_battle_job(uuid, text, text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_worker_complete_battle_job(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_worker_complete_battle_job(uuid, text, text, text) TO service_role;

-- ─── SERVICE-ROLE-ONLY: fn_worker_requeue_battle_job ─────────────────────────

CREATE OR REPLACE FUNCTION public.fn_worker_requeue_battle_job(
  p_job_id     uuid,
  p_backoff_ms integer,
  p_error      text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'battles'
AS $$
BEGIN
  PERFORM battles.fn_requeue_battle_job_with_backoff(p_job_id, p_backoff_ms, p_error);
END;
$$;

ALTER FUNCTION public.fn_worker_requeue_battle_job(uuid, integer, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_worker_requeue_battle_job(uuid, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_worker_requeue_battle_job(uuid, integer, text) TO service_role;

-- ─── SERVICE-ROLE-ONLY: fn_worker_battle_job_to_dlq ──────────────────────────

CREATE OR REPLACE FUNCTION public.fn_worker_battle_job_to_dlq(
  p_job_id     uuid,
  p_error_code text,
  p_error_msg  text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'battles'
AS $$
BEGIN
  RETURN battles.fn_move_battle_job_to_dlq(p_job_id, p_error_code, p_error_msg);
END;
$$;

ALTER FUNCTION public.fn_worker_battle_job_to_dlq(uuid, text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_worker_battle_job_to_dlq(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_worker_battle_job_to_dlq(uuid, text, text) TO service_role;

-- ─── SERVICE-ROLE-ONLY: fn_get_battle_share_card ─────────────────────────────
-- Used by battles-share-card.route.ts for OG image generation.
-- Combines battles + contenders + reputation.elo_battle_log.

CREATE OR REPLACE FUNCTION public.fn_get_battle_share_card(p_slug text)
RETURNS TABLE(
  battle_id           uuid,
  slug                text,
  title               text,
  status              text,
  total_vote_count    integer,
  finalized_at        timestamptz,
  winner_contender_id uuid,
  deleted_at          timestamptz,
  contender_a_id      uuid,
  contender_a_name    text,
  contender_b_id      uuid,
  contender_b_name    text,
  elo_winner_before   numeric,
  elo_winner_after    numeric,
  elo_loser_before    numeric,
  elo_loser_after     numeric,
  elo_is_draw         boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'battles', 'reputation'
AS $$
DECLARE
  v_battle_id uuid;
  v_status    text;
  v_deleted   timestamptz;
BEGIN
  SELECT b.id, b.status, b.deleted_at
  INTO v_battle_id, v_status, v_deleted
  FROM battles.battles b
  WHERE b.slug = p_slug
  LIMIT 1;

  IF NOT FOUND OR v_deleted IS NOT NULL OR v_status = 'draft' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    b.id, b.slug, b.title, b.status, b.total_vote_count, b.finalized_at,
    b.winner_contender_id, b.deleted_at,
    a_c.id, a_c.display_name,
    b_c.id, b_c.display_name,
    el.winner_score_before, el.winner_score_after,
    el.loser_score_before, el.loser_score_after,
    el.is_draw
  FROM battles.battles b
  LEFT JOIN battles.contenders a_c ON a_c.battle_id = b.id AND a_c.slot = 'A'
  LEFT JOIN battles.contenders b_c ON b_c.battle_id = b.id AND b_c.slot = 'B'
  LEFT JOIN reputation.elo_battle_log el ON el.battle_id = b.id
  WHERE b.id = v_battle_id
  LIMIT 1;
END;
$$;

ALTER FUNCTION public.fn_get_battle_share_card(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_get_battle_share_card(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_get_battle_share_card(text) TO service_role;

-- ─── SERVICE-ROLE-ONLY: fn_worker_get_battle_for_og ──────────────────────────
-- Used by generate-battle-og-image edge function.

CREATE OR REPLACE FUNCTION public.fn_worker_get_battle_for_og(p_battle_id uuid)
RETURNS TABLE(
  id uuid, slug text, title text, status text, task_prompt text,
  battle_type text, total_vote_count integer, finalized_at timestamptz,
  winner_contender_id uuid, published_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'battles'
AS $$
  SELECT b.id, b.slug, b.title, b.status, b.task_prompt, b.battle_type,
         b.total_vote_count, b.finalized_at, b.winner_contender_id, b.published_at
  FROM battles.battles b
  WHERE b.id = p_battle_id
  LIMIT 1;
$$;

ALTER FUNCTION public.fn_worker_get_battle_for_og(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_worker_get_battle_for_og(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_worker_get_battle_for_og(uuid) TO service_role;
