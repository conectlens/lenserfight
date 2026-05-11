-- =============================================================================
-- Canonical Production Rays
-- =============================================================================
-- Seeds the canonical, public-facing ray vocabulary that the platform ships
-- with on first launch. Every public Lens, Workflow, Agent, and Battle
-- template in supabase/seeds/* attaches at least one of these rays.
--
-- Ray slugs follow the content.tags slug constraint:
--   ^[a-z0-9]+([\-][a-z0-9]+)*$  (2..40 chars)
--
-- The ray route is /ray/:slug — see libs/features/discovery for the React
-- side. Slug stability matters: changing a slug breaks shared URLs.
--
-- Idempotent: ON CONFLICT (slug) DO NOTHING.
-- =============================================================================

INSERT INTO content.tags (slug, visibility) VALUES
  -- ── Tool / platform rays (developer-facing) ──────────────────────────────
  ('github',         'public'),
  ('git',            'public'),
  ('cursor',         'public'),
  ('claude',         'public'),
  ('openai',         'public'),
  ('gemini',         'public'),
  ('google',         'public'),
  ('excel',          'public'),
  ('youtube',        'public'),
  ('blog',           'public'),

  -- ── Discipline / domain rays ─────────────────────────────────────────────
  ('ai',             'public'),
  ('workflow',       'public'),
  ('planning',       'public'),
  ('deep-thinking',  'public'),
  ('research',       'public'),
  ('finance',        'public'),
  ('legal',          'public'),
  ('productivity',   'public'),
  ('startup',        'public'),
  ('content',        'public'),
  ('marketing',      'public'),
  ('analysis',       'public'),

  -- ── Output-format rays ───────────────────────────────────────────────────
  ('text',           'public'),
  ('image',          'public'),
  ('video',          'public'),
  ('audio',          'public'),
  ('table',          'public'),
  ('checklist',      'public'),
  ('script',         'public'),

  -- ── Audience / persona rays ──────────────────────────────────────────────
  ('developer',      'public'),
  ('creator',        'public'),
  ('operator',       'public'),
  ('chainabit',      'public')
ON CONFLICT (slug) DO NOTHING;
