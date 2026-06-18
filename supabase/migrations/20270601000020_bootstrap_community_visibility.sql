-- fn_get_lens_detail_bootstrap: extend visibility check to include community lenses.
--
-- Previously only 'public' lenses (or lenses owned by the caller) were returned.
-- Community lenses (visibility = 'community') are shared with authenticated API
-- consumers but were excluded, causing 404 when external partners (e.g. Chainabit)
-- tried to fetch params for a community-visibility lens.

DROP FUNCTION IF EXISTS public.fn_get_lens_detail_bootstrap(uuid);

CREATE FUNCTION public.fn_get_lens_detail_bootstrap(p_lens_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
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

  -- Core lens: visibility check (owner sees own; everyone sees public + community)
  SELECT l.id, l.lenser_id, l.visibility::text, l.parent_lens_id,
         l.forked_from_execution_id, l.head_version_id,
         l.created_at, l.updated_at
  INTO v_lens
  FROM lenses.lenses l
  WHERE l.id = p_lens_id
    AND (
      l.visibility IN ('public'::content.visibility_enum, 'community'::content.visibility_enum)
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

  -- Tags via content.tag_map + content.tags + content.tag_translations (en fallback -> slug)
  SELECT COALESCE(
    jsonb_agg(jsonb_build_object(
      'id',   t.id,
      'slug', t.slug,
      'name', COALESCE(tt_en.name, t.slug)
    )),
    '[]'::jsonb
  )
  INTO v_tags
  FROM content.tag_map tm
  JOIN content.tags t ON t.id = tm.tag_id
  LEFT JOIN content.tag_translations tt_en
    ON tt_en.tag_id = t.id AND tt_en.language_code = 'en'
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
            'id',                tk.id,
            'key',               tk.key,
            'label',             tk.label,
            'description',       tk.description,
            'category',          tk.category,
            'type',              tk.type,
            'required',          tk.required,
            'min_length',        tk.min_length,
            'max_length',        tk.max_length,
            'placeholder',       tk.placeholder,
            'help_text',         tk.help_text,
            'validation_schema', tk.validation_schema,
            'options',           COALESCE(vp.options, tk.options),
            'sort_order',        tk.sort_order,
            'is_system',         tk.is_system,
            'icon',              tk.icon,
            'color',             tk.color
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
GRANT ALL ON FUNCTION public.fn_get_lens_detail_bootstrap(uuid) TO anon, authenticated;
