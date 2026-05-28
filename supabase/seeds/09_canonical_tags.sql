-- =============================================================================
-- 09. CANONICAL CONTENT TAGS
-- =============================================================================
-- Bootstraps the content.tags + content.tag_translations rows that every
-- subsequent seed (40_, 41_, 42_, 45_, 47_, 48_, 50_) reads via
--   SELECT id INTO v_tag_* FROM content.tags WHERE slug = '<slug>';
--
-- Without these rows the lens/workflow template seeds silently abort (RETURN
-- early), leaving lenses.lenses empty, which causes the FK constraint
--   fk_wf_nodes_lens → lenses.lenses(id)
-- to fire when workflow_nodes inserts try to reference them.
--
-- Idempotent: ON CONFLICT DO NOTHING on both tables.
-- All slugs are lowercase, hyphen-separated (satisfying tags_slug_format_check).
-- =============================================================================

DO $seed$
DECLARE
  v_id uuid;

  -- slug, English display name
  tags text[][] := ARRAY[
    ARRAY['ai',            'AI'],
    ARRAY['analysis',      'Analysis'],
    ARRAY['audio',         'Audio'],
    ARRAY['blog',          'Blog'],
    ARRAY['chainabit',     'Chainabit'],
    ARRAY['checklist',     'Checklist'],
    ARRAY['claude',        'Claude'],
    ARRAY['code',          'Code'],
    ARRAY['community',     'Community'],
    ARRAY['content',       'Content'],
    ARRAY['creator',       'Creator'],
    ARRAY['cursor',        'Cursor'],
    ARRAY['data',          'Data'],
    ARRAY['deep-thinking', 'Deep Thinking'],
    ARRAY['developer',     'Developer'],
    ARRAY['documentation', 'Documentation'],
    ARRAY['excel',         'Excel'],
    ARRAY['finance',       'Finance'],
    ARRAY['gemini',        'Gemini'],
    ARRAY['git',           'Git'],
    ARRAY['github',        'GitHub'],
    ARRAY['google',        'Google'],
    ARRAY['image',         'Image'],
    ARRAY['legal',         'Legal'],
    ARRAY['marketing',     'Marketing'],
    ARRAY['openai',        'OpenAI'],
    ARRAY['operator',      'Operator'],
    ARRAY['orchestration', 'Orchestration'],
    ARRAY['pdf',           'PDF'],
    ARRAY['planning',      'Planning'],
    ARRAY['productivity',  'Productivity'],
    ARRAY['research',      'Research'],
    ARRAY['routing',       'Routing'],
    ARRAY['script',        'Script'],
    ARRAY['startup',       'Startup'],
    ARRAY['table',         'Table'],
    ARRAY['template',      'Template'],
    ARRAY['text',          'Text'],
    ARRAY['transform',     'Transform'],
    ARRAY['validation',    'Validation'],
    ARRAY['video',         'Video'],
    ARRAY['workflow',      'Workflow'],
    ARRAY['youtube',       'YouTube']
  ];
  rec text[];
BEGIN
  FOREACH rec SLICE 1 IN ARRAY tags LOOP
    INSERT INTO content.tags (slug, visibility)
    VALUES (rec[1], 'public')
    ON CONFLICT ON CONSTRAINT tags_slug_key DO NOTHING
    RETURNING id INTO v_id;

    -- If the tag already existed, look up its id
    IF v_id IS NULL THEN
      SELECT id INTO v_id FROM content.tags WHERE slug = rec[1];
    END IF;

    INSERT INTO content.tag_translations (tag_id, language_code, name)
    VALUES (v_id, 'en', rec[2])
    ON CONFLICT ON CONSTRAINT tag_translations_tag_id_language_id_key DO NOTHING;
  END LOOP;
END;
$seed$;
