-- Security hardening: public SECURITY DEFINER wrappers for content and lensers schemas.
--
-- Covers: threadsRepository, reactionRepository, tagRepository, lenserRepository,
-- xpRepository (badge fetch), and any component that accesses lensers.profiles,
-- content.threads, content.thread_replies, content.reactions, content.tag_map,
-- or content.entity_translations directly.

-- ─── LENSERS SCHEMA ──────────────────────────────────────────────────────────

-- ─── 1. fn_get_lenser_profile_brief ──────────────────────────────────────────
-- Minimal profile lookup by handle OR id (pass exactly one).
-- Used for author enrichment in threadsRepository, reactionRepository, etc.

CREATE OR REPLACE FUNCTION public.fn_get_lenser_profile_brief(
  p_handle    text DEFAULT NULL,
  p_lenser_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id           uuid,
  handle       text,
  display_name text,
  avatar_url   text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'lensers'
AS $$
  SELECT p.id, p.handle, p.display_name, p.avatar_url
  FROM lensers.profiles p
  WHERE
    (p_handle    IS NOT NULL AND p.handle = p_handle)
    OR
    (p_lenser_id IS NOT NULL AND p.id = p_lenser_id)
  LIMIT 1;
$$;

ALTER FUNCTION public.fn_get_lenser_profile_brief(text, uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_lenser_profile_brief(text, uuid)
  TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.fn_get_lenser_profile_brief(text, uuid) IS
  'Security wrapper: minimal profile (id, handle, display_name, avatar_url) '
  'by handle OR lenser_id. Pass exactly one parameter.';

-- ─── 2. fn_get_lenser_profiles_brief_batch ───────────────────────────────────
-- Batch version of the above for N-lenser enrichment in threads / reactions.

CREATE OR REPLACE FUNCTION public.fn_get_lenser_profiles_brief_batch(p_lenser_ids uuid[])
RETURNS TABLE(
  id           uuid,
  handle       text,
  display_name text,
  avatar_url   text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'lensers'
AS $$
  SELECT p.id, p.handle, p.display_name, p.avatar_url
  FROM lensers.profiles p
  WHERE p.id = ANY(p_lenser_ids);
$$;

ALTER FUNCTION public.fn_get_lenser_profiles_brief_batch(uuid[]) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_lenser_profiles_brief_batch(uuid[])
  TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.fn_get_lenser_profiles_brief_batch(uuid[]) IS
  'Security wrapper: batch-fetch minimal profile tuples for an array of lenser IDs.';

-- ─── 3. fn_get_auth_profile_gate ─────────────────────────────────────────────
-- Returns the gate fields for the authenticated user's profile.
-- Replaces: .schema('lensers').from('profiles').select('status, deletion_requested_at, ...')
--   .eq('user_id', user.id) in lenserRepository.getAuthenticatedProfileGate.

CREATE OR REPLACE FUNCTION public.fn_get_auth_profile_gate()
RETURNS TABLE(
  status                 text,
  deletion_requested_at  timestamptz,
  deletion_deadline_at   timestamptz,
  onboarding_step        text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'lensers'
AS $$
  SELECT p.status, p.deletion_requested_at, p.deletion_deadline_at, p.onboarding_step
  FROM lensers.profiles p
  WHERE p.user_id = auth.uid()
  LIMIT 1;
$$;

ALTER FUNCTION public.fn_get_auth_profile_gate() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_auth_profile_gate()
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_get_auth_profile_gate() IS
  'Security wrapper: return status/deletion/onboarding gate fields for the current user''s profile.';

-- ─── 4. fn_get_recently_active_lensers ───────────────────────────────────────
-- List recently active human profiles (lenserRepository.getRecentlyActive).

CREATE OR REPLACE FUNCTION public.fn_get_recently_active_lensers(p_limit integer DEFAULT 20)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'lensers'
AS $$
  SELECT COALESCE(jsonb_agg(to_jsonb(p.*) ORDER BY p.last_active_at DESC), '[]'::jsonb)
  FROM lensers.profiles p
  WHERE p.status = 'active'
    AND p.deletion_requested_at IS NULL
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100);
$$;

ALTER FUNCTION public.fn_get_recently_active_lensers(integer) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_recently_active_lensers(integer)
  TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.fn_get_recently_active_lensers(integer) IS
  'Security wrapper: return recently active lensers as a jsonb array, max 100.';

-- ─── 5. fn_get_lenser_by_id_full ─────────────────────────────────────────────
-- Full profile row by ID (lenserRepository.getLenserById).

CREATE OR REPLACE FUNCTION public.fn_get_lenser_by_id_full(p_lenser_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'lensers'
AS $$
  SELECT to_jsonb(p.*)
  FROM lensers.profiles p
  WHERE p.id = p_lenser_id
  LIMIT 1;
$$;

ALTER FUNCTION public.fn_get_lenser_by_id_full(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_lenser_by_id_full(uuid)
  TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.fn_get_lenser_by_id_full(uuid) IS
  'Security wrapper: full lensers.profiles row as jsonb by lenser ID.';

-- ─── 6. fn_get_lenser_badges ─────────────────────────────────────────────────
-- All badges for a lenser (xpRepository.getBadges, lenserRepository).

CREATE OR REPLACE FUNCTION public.fn_get_lenser_badges(p_lenser_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'lensers'
AS $$
  SELECT COALESCE(jsonb_agg(to_jsonb(b.*) ORDER BY b.awarded_at DESC), '[]'::jsonb)
  FROM lensers.badges b
  WHERE b.lenser_id = p_lenser_id;
$$;

ALTER FUNCTION public.fn_get_lenser_badges(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_lenser_badges(uuid)
  TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.fn_get_lenser_badges(uuid) IS
  'Security wrapper: return all badge rows for a lenser as a jsonb array ordered by awarded_at DESC.';

-- ─── 7. fn_get_lenser_language_preference ────────────────────────────────────
-- Current user's preferred language (tagRepository.createTag language resolution).

CREATE OR REPLACE FUNCTION public.fn_get_lenser_language_preference()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'lensers'
AS $$
  SELECT pr.language
  FROM lensers.preferences pr
  WHERE pr.lenser_id = lensers.get_auth_lenser_id()
  LIMIT 1;
$$;

ALTER FUNCTION public.fn_get_lenser_language_preference() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_lenser_language_preference()
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_get_lenser_language_preference() IS
  'Security wrapper: return the preferred language from the current user''s profile preferences jsonb.';

-- ─── CONTENT SCHEMA — READS ──────────────────────────────────────────────────

-- ─── 8. fn_get_entity_tag_ids ────────────────────────────────────────────────
-- Tag IDs mapped to an entity (threadsRepository.getTagsForEntity, lensesRepository).

CREATE OR REPLACE FUNCTION public.fn_get_entity_tag_ids(
  p_entity_type text,
  p_entity_id   uuid
)
RETURNS TABLE(tag_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'content'
AS $$
  SELECT tm.tag_id
  FROM content.tag_map tm
  WHERE tm.entity_type::text = p_entity_type
    AND tm.entity_id   = p_entity_id;
$$;

ALTER FUNCTION public.fn_get_entity_tag_ids(text, uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_entity_tag_ids(text, uuid)
  TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.fn_get_entity_tag_ids(text, uuid) IS
  'Security wrapper: return tag UUIDs mapped to an entity.';

-- ─── 9. fn_get_entity_reaction_counts ────────────────────────────────────────
-- Reaction type → count map for a single entity (threadsRepository, reactionRepository).

CREATE OR REPLACE FUNCTION public.fn_get_entity_reaction_counts(
  p_entity_type text,
  p_entity_id   uuid
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'content'
AS $$
  SELECT COALESCE(
    jsonb_object_agg(r.reaction, r.cnt),
    '{}'::jsonb
  )
  FROM (
    SELECT reaction, COUNT(*) AS cnt
    FROM content.reactions
    WHERE entity_type::text = p_entity_type
      AND entity_id   = p_entity_id
    GROUP BY reaction
  ) r;
$$;

ALTER FUNCTION public.fn_get_entity_reaction_counts(text, uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_entity_reaction_counts(text, uuid)
  TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.fn_get_entity_reaction_counts(text, uuid) IS
  'Security wrapper: return a jsonb map of reaction → count for a single entity.';

-- ─── 10. fn_get_batch_entity_reactions ───────────────────────────────────────
-- Raw reaction rows for many entity IDs (threadsRepository reply reaction batch,
-- reactionRepository.getBatchUserReactions).

CREATE OR REPLACE FUNCTION public.fn_get_batch_entity_reactions(
  p_entity_type text,
  p_entity_ids  uuid[]
)
RETURNS TABLE(
  entity_id   uuid,
  lenser_id   uuid,
  reaction    text,
  created_at  timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'content'
AS $$
  SELECT r.entity_id, r.lenser_id, r.reaction, r.created_at
  FROM content.reactions r
  WHERE r.entity_type::text = p_entity_type
    AND r.entity_id   = ANY(p_entity_ids);
$$;

ALTER FUNCTION public.fn_get_batch_entity_reactions(text, uuid[]) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_batch_entity_reactions(text, uuid[])
  TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.fn_get_batch_entity_reactions(text, uuid[]) IS
  'Security wrapper: return all reaction rows for an array of entity IDs (same type).';

-- ─── 11. fn_get_user_entity_reaction ─────────────────────────────────────────
-- Current user's reaction on a single entity (reactionRepository.getUserReaction).

CREATE OR REPLACE FUNCTION public.fn_get_user_entity_reaction(
  p_entity_type text,
  p_entity_id   uuid
)
RETURNS TABLE(
  entity_id  uuid,
  reaction   text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'content', 'lensers'
AS $$
  SELECT r.entity_id, r.reaction, r.created_at
  FROM content.reactions r
  WHERE r.entity_type::text = p_entity_type
    AND r.entity_id   = p_entity_id
    AND r.lenser_id   = lensers.get_auth_lenser_id();
$$;

ALTER FUNCTION public.fn_get_user_entity_reaction(text, uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_user_entity_reaction(text, uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_get_user_entity_reaction(text, uuid) IS
  'Security wrapper: return the current user''s reaction row for a single entity.';

-- ─── 12. fn_get_thread_by_id_private ─────────────────────────────────────────
-- Private thread lookup for the owner (threadsRepository.getThreadById fallback,
-- getByLenser private). Only returns the row if caller owns it.

CREATE OR REPLACE FUNCTION public.fn_get_thread_by_id_private(p_thread_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'content', 'lensers'
AS $$
  SELECT to_jsonb(t.*)
  FROM content.threads t
  WHERE t.id = p_thread_id
    AND t.lenser_id = lensers.get_auth_lenser_id()
  LIMIT 1;
$$;

ALTER FUNCTION public.fn_get_thread_by_id_private(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_thread_by_id_private(uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_get_thread_by_id_private(uuid) IS
  'Security wrapper: fetch a private/draft thread owned by the current user. '
  'Returns NULL if not found or not owned.';

-- ─── 13. fn_get_lenser_threads_private ───────────────────────────────────────
-- Private threads for the current user's own profile view (threadsRepository.getByLenser
-- private path).

CREATE OR REPLACE FUNCTION public.fn_get_lenser_threads_private(
  p_lenser_id uuid,
  p_limit     integer DEFAULT 20,
  p_offset    integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'content', 'lensers'
AS $$
  SELECT COALESCE(
    jsonb_agg(to_jsonb(t.*) ORDER BY t.created_at DESC),
    '[]'::jsonb
  )
  FROM content.threads t
  WHERE t.lenser_id = p_lenser_id
    AND t.lenser_id = lensers.get_auth_lenser_id()
  LIMIT  LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

ALTER FUNCTION public.fn_get_lenser_threads_private(uuid, integer, integer) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_lenser_threads_private(uuid, integer, integer)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_get_lenser_threads_private(uuid, integer, integer) IS
  'Security wrapper: paginated private thread list owned by the current user. '
  'Returns empty array if p_lenser_id != caller.';

-- ─── 14. fn_get_thread_replies_private ───────────────────────────────────────
-- Replies on a private thread (threadsRepository.getThreadReplies private path).

CREATE OR REPLACE FUNCTION public.fn_get_thread_replies_private(
  p_thread_id uuid,
  p_limit     integer DEFAULT 50,
  p_offset    integer DEFAULT 0
)
RETURNS TABLE(
  id             uuid,
  thread_id      uuid,
  parent_reply_id uuid,
  lenser_id      uuid,
  content        text,
  created_at     timestamptz,
  deleted_at     timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'content', 'lensers'
AS $$
  SELECT r.id, r.thread_id, r.parent_reply_id, r.lenser_id,
         r.content, r.created_at, r.deleted_at
  FROM content.thread_replies r
  JOIN content.threads t ON t.id = r.thread_id
  WHERE r.thread_id = p_thread_id
    AND t.lenser_id = lensers.get_auth_lenser_id()
  ORDER BY r.created_at ASC
  LIMIT  LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

ALTER FUNCTION public.fn_get_thread_replies_private(uuid, integer, integer) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_thread_replies_private(uuid, integer, integer)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_get_thread_replies_private(uuid, integer, integer) IS
  'Security wrapper: paginated replies for a private thread owned by the current user.';

-- ─── 15. fn_get_entity_translation ───────────────────────────────────────────
-- Fetch the original translation for any translatable entity
-- (threadsRepository.buildOwnerThreadRecord).

CREATE OR REPLACE FUNCTION public.fn_get_entity_translation(
  p_entity_type text,
  p_entity_id   uuid
)
RETURNS TABLE(
  title       text,
  description text,
  content     text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'content'
AS $$
  SELECT et.title, et.description, et.content
  FROM content.entity_translations et
  WHERE et.entity_type::text = p_entity_type
    AND et.entity_id   = p_entity_id
    AND et.is_original = true
  LIMIT 1;
$$;

ALTER FUNCTION public.fn_get_entity_translation(text, uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_entity_translation(text, uuid)
  TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.fn_get_entity_translation(text, uuid) IS
  'Security wrapper: fetch the original (is_original=true) translation for any entity.';

-- ─── 16. fn_get_lenser_reaction_history ──────────────────────────────────────
-- Paginated reaction history for a lenser (reactionRepository.getLenserHistory).

CREATE OR REPLACE FUNCTION public.fn_get_lenser_reaction_history(
  p_lenser_id uuid,
  p_limit     integer DEFAULT 20,
  p_offset    integer DEFAULT 0
)
RETURNS TABLE(
  entity_id   uuid,
  entity_type text,
  lenser_id   uuid,
  reaction    text,
  created_at  timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'content', 'lensers'
AS $$
  SELECT r.entity_id, r.entity_type, r.lenser_id, r.reaction, r.created_at
  FROM content.reactions r
  WHERE r.lenser_id = p_lenser_id
  ORDER BY r.created_at DESC
  LIMIT  LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

ALTER FUNCTION public.fn_get_lenser_reaction_history(uuid, integer, integer) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_lenser_reaction_history(uuid, integer, integer)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_get_lenser_reaction_history(uuid, integer, integer) IS
  'Security wrapper: paginated reaction history for a lenser, ordered by created_at DESC.';

-- ─── CONTENT SCHEMA — WRITES ─────────────────────────────────────────────────

-- ─── 17. fn_create_thread_reply ──────────────────────────────────────────────
-- Insert a thread reply (threadsRepository.createReply).

CREATE OR REPLACE FUNCTION public.fn_create_thread_reply(
  p_thread_id      uuid,
  p_content        text,
  p_parent_reply_id uuid DEFAULT NULL
)
RETURNS TABLE(id uuid, lenser_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'content', 'lensers'
AS $$
  INSERT INTO content.thread_replies (thread_id, lenser_id, content, parent_reply_id)
  VALUES (p_thread_id, lensers.get_auth_lenser_id(), p_content, p_parent_reply_id)
  RETURNING id, lenser_id;
$$;

ALTER FUNCTION public.fn_create_thread_reply(uuid, text, uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_create_thread_reply(uuid, text, uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_create_thread_reply(uuid, text, uuid) IS
  'Security wrapper: insert a reply into a thread as the current user. '
  'Returns the new reply id and lenser_id.';

-- ─── 18. fn_update_thread_visibility ─────────────────────────────────────────
-- Update a thread's visibility (threadsRepository.updateThread).

CREATE OR REPLACE FUNCTION public.fn_update_thread_visibility(
  p_thread_id uuid,
  p_visibility text
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'content', 'lensers'
AS $$
  UPDATE content.threads
  SET    visibility = p_visibility::content.visibility_enum,
         updated_at = now()
  WHERE  id        = p_thread_id
    AND  lenser_id = lensers.get_auth_lenser_id();
$$;

ALTER FUNCTION public.fn_update_thread_visibility(uuid, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_update_thread_visibility(uuid, text)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_update_thread_visibility(uuid, text) IS
  'Security wrapper: update visibility on a thread owned by the current user.';

-- ─── 19. fn_update_thread_translation ────────────────────────────────────────
-- Update the original translation (title + content) for a thread
-- (threadsRepository.updateThread entity_translations path).

CREATE OR REPLACE FUNCTION public.fn_update_thread_translation(
  p_thread_id uuid,
  p_title     text,
  p_content   text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'content', 'lensers'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM content.threads
    WHERE id = p_thread_id AND lenser_id = lensers.get_auth_lenser_id()
  ) THEN
    RETURN;
  END IF;

  UPDATE content.entity_translations
  SET    title      = p_title,
         content    = p_content,
         updated_at = now()
  WHERE  entity_type::text = 'thread'
    AND  entity_id   = p_thread_id
    AND  is_original = true;
END;
$$;

ALTER FUNCTION public.fn_update_thread_translation(uuid, text, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_update_thread_translation(uuid, text, text)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_update_thread_translation(uuid, text, text) IS
  'Security wrapper: update title and content of the original translation for a thread '
  'owned by the current user.';

-- ─── 20. fn_remap_thread_tags ─────────────────────────────────────────────────
-- Replace all tag mappings for a thread atomically (threadsRepository.updateThread tag path).

CREATE OR REPLACE FUNCTION public.fn_remap_thread_tags(
  p_thread_id uuid,
  p_tag_ids   uuid[]
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'content', 'lensers'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM content.threads
    WHERE id = p_thread_id AND lenser_id = lensers.get_auth_lenser_id()
  ) THEN
    RETURN;
  END IF;

  DELETE FROM content.tag_map
  WHERE entity_type::text = 'thread' AND entity_id = p_thread_id;

  IF p_tag_ids IS NOT NULL AND array_length(p_tag_ids, 1) > 0 THEN
    INSERT INTO content.tag_map (entity_type, entity_id, tag_id)
    SELECT 'thread', p_thread_id, unnest(p_tag_ids)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

ALTER FUNCTION public.fn_remap_thread_tags(uuid, uuid[]) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_remap_thread_tags(uuid, uuid[])
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_remap_thread_tags(uuid, uuid[]) IS
  'Security wrapper: atomically replace all tag mappings for a thread owned by the current user.';

-- ─── 21. fn_delete_thread ────────────────────────────────────────────────────
-- Delete a thread owned by the current user (threadsRepository.deleteThread).

CREATE OR REPLACE FUNCTION public.fn_delete_thread(p_thread_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'content', 'lensers'
AS $$
  DELETE FROM content.threads
  WHERE id        = p_thread_id
    AND lenser_id = lensers.get_auth_lenser_id();
$$;

ALTER FUNCTION public.fn_delete_thread(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_delete_thread(uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_delete_thread(uuid) IS
  'Security wrapper: delete a thread owned by the current user. Silently no-ops if not owned.';

-- ─── 22. fn_delete_thread_reply ──────────────────────────────────────────────
-- Delete a thread reply owned by the current user (threadsRepository.deleteReply).

CREATE OR REPLACE FUNCTION public.fn_delete_thread_reply(p_reply_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'content', 'lensers'
AS $$
  DELETE FROM content.thread_replies
  WHERE id        = p_reply_id
    AND lenser_id = lensers.get_auth_lenser_id();
$$;

ALTER FUNCTION public.fn_delete_thread_reply(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_delete_thread_reply(uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_delete_thread_reply(uuid) IS
  'Security wrapper: delete a thread reply owned by the current user. Silently no-ops if not owned.';
