-- 20270802000000_perf_missing_rpcs_and_bootstrap.sql
--
-- Fixes four missing public RPCs causing 404 errors, and adds a single-call
-- bootstrap for LensDetailPage to replace 9 sequential HTTP requests.
--
-- Problems fixed:
--   1. fn_get_entity_reaction_status  — 404 on every page that checks user reactions
--   2. fn_get_battle_by_slug          — 404 on battle detail page
--   3. fn_create_lens (public)        — 404 on lens creation flow
--   4. fn_create_ai_lenser (public)   — 404 on agent creation flow
--   5. fn_get_lens_detail_bootstrap   — NEW: replaces 9 RPCs with 1 call

-- ─── 1. fn_get_entity_reaction_status ────────────────────────────────────────
-- Returns one row per reaction_enum value with reacted=true if the current user
-- has that reaction on the target entity.
-- reactionRepository.ts calls this with p_entity_type, p_entity_id.

DROP FUNCTION IF EXISTS public.fn_get_entity_reaction_status(text, uuid);
CREATE OR REPLACE FUNCTION public.fn_get_entity_reaction_status(
  p_entity_type text,
  p_entity_id   uuid
)
RETURNS TABLE(reaction text, reacted boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'content', 'lensers'
AS $$
  SELECT
    rt.reaction::text,
    EXISTS (
      SELECT 1
      FROM content.reactions r
      WHERE r.entity_type::text = p_entity_type
        AND r.entity_id         = p_entity_id
        AND r.lenser_id         = lensers.get_auth_lenser_id()
        AND r.reaction          = rt.reaction
    ) AS reacted
  FROM unnest(enum_range(NULL::content.reaction_enum)) rt(reaction);
$$;

ALTER FUNCTION public.fn_get_entity_reaction_status(text, uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_entity_reaction_status(text, uuid)
  TO authenticated, service_role;
COMMENT ON FUNCTION public.fn_get_entity_reaction_status(text, uuid) IS
  'Returns one row per reaction type with reacted=true if the current user reacted. '
  'Used by reactionRepository.ts getReactions(). Requires authentication.';

-- ─── 2. fn_get_battle_by_slug ────────────────────────────────────────────────
-- battlesRepository.ts calls fn_get_battle_by_slug(p_slug) but the correct
-- function is fn_get_battle(p_battle_id, p_slug). This alias eliminates the 404.

DROP FUNCTION IF EXISTS public.fn_get_battle_by_slug(text);
CREATE OR REPLACE FUNCTION public.fn_get_battle_by_slug(p_slug text)
RETURNS TABLE(
  id                    uuid,
  slug                  text,
  title                 text,
  task_prompt           text,
  status                text,
  total_vote_count      integer,
  published_at          timestamptz,
  voting_opens_at       timestamptz,
  voting_closes_at      timestamptz,
  finalized_at          timestamptz,
  battle_type           text,
  voter_eligibility     text,
  handicap_config       jsonb,
  creator_lenser_id     uuid,
  forum_thread_id       text,
  workflow_id           uuid,
  lens_id               uuid,
  execution_starts_at   timestamptz,
  auto_publish          boolean,
  voting_duration_hours integer,
  vote_velocity         numeric,
  og_image_url          text,
  winner_contender_id   uuid,
  parent_battle_id      uuid,
  deleted_at            timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'battles', 'lensers'
AS $$
  SELECT * FROM public.fn_get_battle(NULL::uuid, p_slug);
$$;

ALTER FUNCTION public.fn_get_battle_by_slug(text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_battle_by_slug(text)
  TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.fn_get_battle_by_slug(text) IS
  'Alias for fn_get_battle(p_slug). Fixes PGRST202 404 in battlesRepository.getBattleBySlug.';

-- ─── 3. fn_create_lens (public wrapper) ──────────────────────────────────────
-- lensesRepository.ts calls public.fn_create_lens but the function lives in
-- the lenses schema. p_visibility is text on the wire, cast internally.

DROP FUNCTION IF EXISTS public.fn_create_lens(text, text, text, text, text, jsonb, uuid[], uuid, uuid);
CREATE OR REPLACE FUNCTION public.fn_create_lens(
  p_visibility               text,
  p_template_body            text,
  p_title                    text,
  p_description              text    DEFAULT NULL,
  p_language_code            text    DEFAULT 'en',
  p_params                   jsonb   DEFAULT '[]'::jsonb,
  p_tag_ids                  uuid[]  DEFAULT '{}'::uuid[],
  p_parent_lens_id           uuid    DEFAULT NULL,
  p_forked_from_execution_id uuid    DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'lenses', 'content', 'lensers', 'auth'
AS $$
DECLARE
  v_id uuid;
BEGIN
  v_id := lenses.fn_create_lens(
    p_visibility               := p_visibility::content.visibility_enum,
    p_template_body            := p_template_body,
    p_title                    := p_title,
    p_description              := p_description,
    p_language_code            := p_language_code,
    p_params                   := p_params,
    p_tag_ids                  := p_tag_ids,
    p_parent_lens_id           := p_parent_lens_id,
    p_forked_from_execution_id := p_forked_from_execution_id
  );
  RETURN v_id;
END;
$$;

ALTER FUNCTION public.fn_create_lens(text, text, text, text, text, jsonb, uuid[], uuid, uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_create_lens(text, text, text, text, text, jsonb, uuid[], uuid, uuid)
  TO authenticated, service_role;
COMMENT ON FUNCTION public.fn_create_lens(text, text, text, text, text, jsonb, uuid[], uuid, uuid) IS
  'Public wrapper for lenses.fn_create_lens. Auth enforced by inner function. '
  'Fixes PGRST202 404 in lensesRepository.createLens.';

-- ─── 4. fn_create_ai_lenser (public wrapper) ─────────────────────────────────
-- agentsRepository.ts calls public.fn_create_ai_lenser but the function lives
-- in the agents schema and was never publicly wrapped.

DROP FUNCTION IF EXISTS public.fn_create_ai_lenser(uuid, text, text, uuid);
CREATE OR REPLACE FUNCTION public.fn_create_ai_lenser(
  p_owner_lenser_id uuid,
  p_handle          text,
  p_display_name    text,
  p_ai_model_id     uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers', 'auth'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  v_result := agents.fn_create_ai_lenser(
    p_owner_lenser_id := p_owner_lenser_id,
    p_handle          := p_handle,
    p_display_name    := p_display_name,
    p_ai_model_id     := p_ai_model_id
  );
  RETURN v_result;
END;
$$;

ALTER FUNCTION public.fn_create_ai_lenser(uuid, text, text, uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_create_ai_lenser(uuid, text, text, uuid)
  TO authenticated, service_role;
COMMENT ON FUNCTION public.fn_create_ai_lenser(uuid, text, text, uuid) IS
  'Public wrapper for agents.fn_create_ai_lenser. Auth enforced by inner function. '
  'Fixes PGRST202 404 in agentsRepository.createAgent.';

-- ─── 5. fn_get_lens_detail_bootstrap ─────────────────────────────────────────
-- Single-call bootstrap for LensDetailPage.
--
-- Replaces these sequential RPCs:
--   fn_get_entity_translation, fn_get_lenser_profile_brief,
--   fn_get_entity_tag_ids + vw_tags_public_stats (2 calls),
--   fn_get_entity_reaction_counts, fn_list_lens_versions,
--   fn_get_lens_version_detail, fn_get_lens_version_parameters
--
-- Returns jsonb with all lens detail data in one roundtrip.
-- Returns {"error":"not_found"} when lens doesn't exist or is not accessible.

DROP FUNCTION IF EXISTS public.fn_get_lens_detail_bootstrap(uuid);
CREATE OR REPLACE FUNCTION public.fn_get_lens_detail_bootstrap(
  p_lens_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'lenses', 'content', 'lensers', 'auth'
AS $$
DECLARE
  v_viewer_id       uuid;
  v_lens            RECORD;
  v_translation     RECORD;
  v_author          RECORD;
  v_tags            jsonb;
  v_reaction_totals jsonb;
  v_user_reactions  jsonb;
  v_latest_ver      RECORD;
  v_params          jsonb;
BEGIN
  v_viewer_id := lensers.get_auth_lenser_id();

  -- Core lens: visibility check (owner sees own, everyone sees public)
  SELECT l.id, l.lenser_id, l.visibility::text, l.parent_lens_id,
         l.forked_from_execution_id, l.head_version_id,
         l.created_at, l.updated_at
  INTO v_lens
  FROM lenses.lenses l
  WHERE l.id = p_lens_id
    AND (
      l.visibility = 'public'::content.visibility_enum
      OR l.lenser_id = v_viewer_id
    );

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  -- Translation: title, description, content (prefers original, then 'en')
  SELECT et.title, et.description, et.content
  INTO v_translation
  FROM content.entity_translations et
  WHERE et.entity_type = 'lens'::content.entity_type_enum
    AND et.entity_id   = p_lens_id
  ORDER BY et.is_original DESC, (et.language_code = 'en') DESC, et.created_at DESC
  LIMIT 1;

  -- Author profile
  SELECT p.id, p.handle, p.display_name, p.avatar_url
  INTO v_author
  FROM lensers.profiles p
  WHERE p.id = v_lens.lenser_id;

  -- Tags via content.tag_map + content.tags
  SELECT COALESCE(
    jsonb_agg(jsonb_build_object('id', t.id, 'slug', t.slug, 'name', t.name)),
    '[]'::jsonb
  )
  INTO v_tags
  FROM content.tag_map tm
  JOIN content.tags t ON t.id = tm.tag_id
  WHERE tm.entity_type::text = 'lens'
    AND tm.entity_id          = p_lens_id;

  -- Reaction counts
  SELECT COALESCE(
    jsonb_object_agg(r.reaction::text, r.cnt),
    '{}'::jsonb
  )
  INTO v_reaction_totals
  FROM (
    SELECT reaction, COUNT(*) AS cnt
    FROM content.reactions
    WHERE entity_type::text = 'lens'
      AND entity_id          = p_lens_id
    GROUP BY reaction
  ) r;

  -- Current user's own reactions (empty if not authenticated)
  IF v_viewer_id IS NOT NULL THEN
    SELECT COALESCE(
      jsonb_object_agg(r.reaction::text, true),
      '{}'::jsonb
    )
    INTO v_user_reactions
    FROM content.reactions r
    WHERE r.entity_type::text = 'lens'
      AND r.entity_id          = p_lens_id
      AND r.lenser_id          = v_viewer_id;
  ELSE
    v_user_reactions := '{}'::jsonb;
  END IF;

  -- Latest published version
  SELECT v.id, v.version_number, v.template_body, v.status::text,
         v.changelog, v.published_at, v.created_at
  INTO v_latest_ver
  FROM lenses.versions v
  WHERE v.lens_id    = p_lens_id
    AND v.status     = 'published'::content.content_status
  ORDER BY v.version_number DESC
  LIMIT 1;

  -- Version parameters for latest published (empty array if no published version)
  IF v_latest_ver.id IS NOT NULL THEN
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id',        vp.id,
          'label',     vp.label,
          'toolId',    vp.tool_id,
          'versionId', vp.version_id,
          'tool',      jsonb_build_object(
            'id',               tk.id,
            'key',              tk.key,
            'label',            tk.label,
            'description',      tk.description,
            'category',         tk.category,
            'type',             tk.type,
            'required',         tk.required,
            'min_length',       tk.min_length,
            'max_length',       tk.max_length,
            'placeholder',      tk.placeholder,
            'help_text',        tk.help_text,
            'validation_schema',tk.validation_schema,
            'options',          tk.options,
            'sort_order',       tk.sort_order,
            'is_system',        tk.is_system,
            'icon',             tk.icon,
            'color',            tk.color
          )
        )
        ORDER BY tk.sort_order, vp.id
      ),
      '[]'::jsonb
    )
    INTO v_params
    FROM lenses.version_parameters vp
    JOIN lenses.tools tk ON tk.id = vp.tool_id
    WHERE vp.version_id = v_latest_ver.id;
  ELSE
    v_params := '[]'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'id',                        v_lens.id,
    'lenser_id',                 v_lens.lenser_id,
    'visibility',                v_lens.visibility,
    'parent_lens_id',            v_lens.parent_lens_id,
    'forked_from_execution_id',  v_lens.forked_from_execution_id,
    'head_version_id',           v_lens.head_version_id,
    'created_at',                v_lens.created_at,
    'updated_at',                v_lens.updated_at,
    'title',                     COALESCE(v_translation.title, 'Untitled'),
    'description',               v_translation.description,
    'content',                   COALESCE(v_translation.content, ''),
    'author_profile',            jsonb_build_object(
                                   'id',           v_author.id,
                                   'handle',       v_author.handle,
                                   'display_name', v_author.display_name,
                                   'avatar_url',   v_author.avatar_url
                                 ),
    'tags',                      COALESCE(v_tags, '[]'::jsonb),
    'reaction_totals',           v_reaction_totals,
    'user_reactions',            v_user_reactions,
    'latest_published_version',  CASE
      WHEN v_latest_ver.id IS NOT NULL THEN jsonb_build_object(
        'id',             v_latest_ver.id,
        'lens_id',        p_lens_id,
        'version_number', v_latest_ver.version_number,
        'template_body',  v_latest_ver.template_body,
        'status',         v_latest_ver.status,
        'changelog',      v_latest_ver.changelog,
        'published_at',   v_latest_ver.published_at,
        'created_at',     v_latest_ver.created_at,
        'parameters',     COALESCE(v_params, '[]'::jsonb)
      )
      ELSE NULL
    END
  );
END;
$$;

ALTER FUNCTION public.fn_get_lens_detail_bootstrap(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_lens_detail_bootstrap(uuid)
  TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.fn_get_lens_detail_bootstrap(uuid) IS
  'Single-call bootstrap for LensDetailPage. Replaces 9 sequential RPCs with one roundtrip. '
  'Returns full lens detail + author + tags + reaction counts + user reactions + latest published version. '
  'STABLE = cacheable. Returns {"error":"not_found"} for inaccessible lenses.';
