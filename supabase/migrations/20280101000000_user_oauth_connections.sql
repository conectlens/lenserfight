-- OAuth Connector Phase 1: user_oauth_connections table
--
-- Stores per-user OAuth connections to external providers (Google first).
-- Tokens are stored as Supabase Vault secrets; this table holds only
-- metadata and vault secret references. Never store raw tokens here.
--
-- Design notes:
--   - Separate from connectors.connectors (platform API connectors for
--     external systems calling LenserFight). This table is the inverse:
--     LenserFight calling external services on behalf of users.
--   - Separate from workflow_integration_credentials (PGP blob, workflow-
--     scoped). OAuth lifecycle requires structured expiry + refresh model.
--   - ref column ('google.gmail.primary') is the stable identifier used in
--     [[:connector:google.gmail.primary]] expression syntax.
--
-- Rollback strategy:
--   1. Revoke all connections first (fn_oauth_revoke_connection per row),
--      which nullifies vault secret usage tracking.
--   2. DROP TABLE IF EXISTS public.user_oauth_connections CASCADE;
--   3. Orphaned vault.secrets named 'oauth_access_*' and 'oauth_refresh_*'
--      must be deleted manually via vault admin access.
--   Re-running is idempotent (IF NOT EXISTS guards).

CREATE TABLE IF NOT EXISTS public.user_oauth_connections (
  id                uuid        NOT NULL DEFAULT gen_random_uuid(),
  lenser_id         uuid        NOT NULL,
  workspace_id      uuid        NOT NULL,
  provider          text        NOT NULL,
  capability        text        NOT NULL,
  connection_label  text        NOT NULL,
  ref               text        NOT NULL,
  auth_strategy     text        NOT NULL DEFAULT 'oauth2',
  provider_config   jsonb       NOT NULL DEFAULT '{}'::jsonb,
  access_token_id   uuid        NOT NULL,
  refresh_token_id  uuid,
  granted_scopes    text[]      NOT NULL DEFAULT '{}',
  expires_at        timestamptz,
  is_active         boolean     NOT NULL DEFAULT true,
  revoked_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT user_oauth_connections_pkey PRIMARY KEY (id),

  CONSTRAINT user_oauth_connections_lenser_fk
    FOREIGN KEY (lenser_id)
    REFERENCES lensers.profiles(id)
    ON DELETE CASCADE,

  CONSTRAINT user_oauth_connections_workspace_fk
    FOREIGN KEY (workspace_id)
    REFERENCES tenancy.workspaces(id)
    ON DELETE CASCADE,

  -- Stable ref uniqueness per user: 'google.gmail.primary' is one connection
  CONSTRAINT uoc_unique_ref_per_lenser
    UNIQUE (lenser_id, workspace_id, ref),

  -- Only known providers (extend with new CHECK constraint in future migration)
  CONSTRAINT uoc_provider_check
    CHECK (provider IN (
      'notion', 'google', 'asana', 'monday', 'zapier', 'slack', 'github',
      'gitlab', 'jira', 'linear', 'trello', 'airtable', 'hubspot',
      'salesforce', 'discord', 'microsoft_teams', 'microsoft_outlook',
      'microsoft_onedrive', 'microsoft_excel', 'dropbox', 'box',
      'calendly', 'clickup', 'todoist', 'custom_http'
    )),

  -- Only known Google capabilities (additive; extend in future migration)
  CONSTRAINT uoc_capability_check
    CHECK (capability IN (
      'database', 'page', 'gmail', 'drive', 'sheets', 'docs', 'calendar',
      'tasks', 'boards', 'webhooks', 'chat', 'repos', 'issues', 'projects',
      'lists', 'records', 'crm', 'messages', 'channels', 'files', 'events',
      'http'
    )),

  CONSTRAINT uoc_auth_strategy_check
    CHECK (auth_strategy IN ('oauth2', 'api_key', 'webhook', 'none')),

  -- Label format: lowercase alphanumeric + hyphen/underscore, 1-48 chars
  CONSTRAINT uoc_label_format
    CHECK (connection_label ~ '^[a-z0-9][a-z0-9_-]{0,47}$'),

  -- Ref format: provider.capability.label with max 120 chars
  CONSTRAINT uoc_ref_format
    CHECK (
      ref ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*\.[a-z0-9][a-z0-9_-]{0,47}$'
      AND char_length(ref) <= 120
    ),

  -- Revoked connections must have revoked_at set
  CONSTRAINT uoc_revoke_consistency
    CHECK (
      (is_active = true AND revoked_at IS NULL)
      OR (is_active = false AND revoked_at IS NOT NULL)
    )
);

COMMENT ON TABLE public.user_oauth_connections IS
  'Per-user OAuth connections to external providers. '
  'Tokens stored in Supabase Vault (never in this table). '
  'The ref column is the stable identifier for [[:connector:ref]] expression syntax. '
  'All writes go through SECURITY DEFINER RPCs; direct INSERT/UPDATE/DELETE '
  'is revoked from the authenticated role.';

COMMENT ON COLUMN public.user_oauth_connections.ref IS
  'Stable connector reference slug, e.g. ''google.gmail.primary''. '
  'Used as the key in [[:connector:google.gmail.primary]] expressions.';

COMMENT ON COLUMN public.user_oauth_connections.access_token_id IS
  'vault.secrets.id for the OAuth access token. Decrypted only server-side.';

COMMENT ON COLUMN public.user_oauth_connections.refresh_token_id IS
  'vault.secrets.id for the OAuth refresh token. Null if provider does not issue one.';

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_uoc_lenser_active
  ON public.user_oauth_connections (lenser_id)
  WHERE is_active = true AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_uoc_ref_active
  ON public.user_oauth_connections (ref)
  WHERE is_active = true AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_uoc_lenser_provider
  ON public.user_oauth_connections (lenser_id, provider)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_uoc_workspace_lenser_ref_active
  ON public.user_oauth_connections (workspace_id, lenser_id, ref)
  WHERE is_active = true AND revoked_at IS NULL;

-- ── Row Level Security ────────────────────────────────────────────────────────
-- All reads and writes go through SECURITY DEFINER RPCs so browser clients
-- never receive Vault secret identifiers or raw provider config fields.
-- All direct table access is reserved for service_role (execution workers,
-- Edge Functions, and migrations).

ALTER TABLE public.user_oauth_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "uoc_owner_select"
  ON public.user_oauth_connections
  FOR SELECT
  USING (
    lenser_id = (
      SELECT id FROM lensers.profiles WHERE user_id = auth.uid()
    )
  );

-- Block direct table access from browser roles. Safe user-facing reads go
-- through fn_oauth_list_connections, which returns sanitized metadata only.
REVOKE ALL
  ON public.user_oauth_connections
  FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.user_oauth_connections
  TO service_role;
