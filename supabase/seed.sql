-- ==============================================================================
-- LenserFight Community Edition — Seed Data
-- Contains only OSS-safe schemas: lensers, lenses, content, media, agents, ai,
-- execution, tenancy. Private schemas (battles, billing, xp, analytics, etc.)
-- are excluded.
-- ==============================================================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', 'public, extensions', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- Core data
\ir seeds/02_auth_users.sql
\ir seeds/03_lenser_profiles.sql

-- AI providers and models
\ir seeds/04_ai_providers.sql
\ir seeds/04b_ai_models.sql
\ir seeds/07_ai_models.sql
\ir seeds/07_ai_lensers.sql

-- Content and workspace data
\ir seeds/13_workspaces.sql
\ir seeds/14_media_objects.sql
\ir seeds/15_lens_tools.sql
\ir seeds/16_origin_types.sql

-- Scale test data (OSS schemas only)
\ir seeds/20_scale_setup.sql
\ir seeds/21_scale_auth_users.sql
\ir seeds/22_scale_profiles.sql
\ir seeds/23_scale_tags.sql
\ir seeds/24_scale_threads.sql
\ir seeds/25_scale_lenses.sql
\ir seeds/26_scale_tag_map.sql
\ir seeds/27_scale_replies.sql
\ir seeds/28_scale_follows.sql
\ir seeds/29_scale_reactions.sql
\ir seeds/31_scale_backfill.sql
\ir seeds/32_scale_workflows.sql
