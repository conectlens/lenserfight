


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "agents";


ALTER SCHEMA "agents" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "ai";


ALTER SCHEMA "ai" OWNER TO "postgres";








CREATE SCHEMA IF NOT EXISTS "content";


ALTER SCHEMA "content" OWNER TO "postgres";



CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE SCHEMA IF NOT EXISTS "execution";


ALTER SCHEMA "execution" OWNER TO "postgres";



CREATE SCHEMA IF NOT EXISTS "lensers";


ALTER SCHEMA "lensers" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "lenses";


ALTER SCHEMA "lenses" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "media";


ALTER SCHEMA "media" OWNER TO "postgres";


COMMENT ON SCHEMA "media" IS 'Normalized media/file storage layer. Replaces ai.resources as the canonical file registry. Workspace-scoped with explicit lifecycle, visibility, and attachment bindings.';



CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";







COMMENT ON SCHEMA "public" IS 'standard public schema';





CREATE SCHEMA IF NOT EXISTS "tenancy";


ALTER SCHEMA "tenancy" OWNER TO "postgres";


COMMENT ON SCHEMA "tenancy" IS 'Workspace tenancy: workspaces, members, roles. Every tenant-owned resource references a workspace_id.';





CREATE EXTENSION IF NOT EXISTS "btree_gist" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "ai"."ai_capability_enum" AS ENUM (
    'text',
    'image',
    'code',
    'music'
);


ALTER TYPE "ai"."ai_capability_enum" OWNER TO "postgres";


CREATE TYPE "ai"."key_scope_enum" AS ENUM (
    'agent',
    'user',
    'team'
);


ALTER TYPE "ai"."key_scope_enum" OWNER TO "postgres";


COMMENT ON TYPE "ai"."key_scope_enum" IS 'Scope of an ai.keys BYOK API key: agent (scoped to an AI actor), user (scoped to a lenser), team (scoped to a team/org).';



CREATE TYPE "ai"."key_status_enum" AS ENUM (
    'active',
    'revoked',
    'expired'
);


ALTER TYPE "ai"."key_status_enum" OWNER TO "postgres";


COMMENT ON TYPE "ai"."key_status_enum" IS 'Lifecycle status of an ai.keys BYOK API key.';



CREATE TYPE "ai"."media_type" AS ENUM (
    'text',
    'image',
    'audio',
    'video',
    'document',
    'json',
    'binary'
);


ALTER TYPE "ai"."media_type" OWNER TO "postgres";


CREATE TYPE "ai"."model_tier_enum" AS ENUM (
    'free',
    'paid',
    'enterprise'
);


ALTER TYPE "ai"."model_tier_enum" OWNER TO "postgres";


COMMENT ON TYPE "ai"."model_tier_enum" IS 'Access tier for AI models (free, paid, enterprise). Relocates public.pricing_tier_enum to the ai schema where it conceptually belongs. Use ai.model_tier_enum for all new code.';



CREATE TYPE "ai"."provider_enum" AS ENUM (
    'openai',
    'anthropic',
    'google',
    'custom',
    'xai',
    'meta',
    'mistral',
    'local'
);


ALTER TYPE "ai"."provider_enum" OWNER TO "postgres";


CREATE TYPE "ai"."resource_type" AS ENUM (
    'attachment',
    'dataset',
    'example',
    'reference'
);


ALTER TYPE "ai"."resource_type" OWNER TO "postgres";


CREATE TYPE "ai"."unit_type_enum" AS ENUM (
    'tokens',
    'image',
    'video_second',
    'audio_second'
);


ALTER TYPE "ai"."unit_type_enum" OWNER TO "postgres";


COMMENT ON TYPE "ai"."unit_type_enum" IS 'Billing unit type for AI model pricing. Replaces text CHECK constraint ''model_pricing_unit_type_check'' on ai.model_pricing.unit_type.';



CREATE TYPE "content"."content_status" AS ENUM (
    'draft',
    'published',
    'archived'
);


ALTER TYPE "content"."content_status" OWNER TO "postgres";


CREATE TYPE "content"."entity_type_enum" AS ENUM (
    'thread',
    'lens',
    'battle',
    'thread_reply',
    'workflow'
);


ALTER TYPE "content"."entity_type_enum" OWNER TO "postgres";


CREATE TYPE "content"."payment_method_enum" AS ENUM (
    'byok',
    'wallet',
    'free'
);


ALTER TYPE "content"."payment_method_enum" OWNER TO "postgres";


CREATE TYPE "content"."reaction_enum" AS ENUM (
    'like',
    'dislike',
    'saved',
    'copy',
    'love',
    'clap'
);


ALTER TYPE "content"."reaction_enum" OWNER TO "postgres";


CREATE TYPE "content"."report_reason_enum" AS ENUM (
    'spam',
    'harassment',
    'misinformation',
    'off_topic',
    'other'
);


ALTER TYPE "content"."report_reason_enum" OWNER TO "postgres";


COMMENT ON TYPE "content"."report_reason_enum" IS 'Valid reasons for content reports. Replaces text CHECK constraint ''reports_reason_check'' on content.reports.reason.';



CREATE TYPE "content"."suggestion_status_enum" AS ENUM (
    'pending',
    'accepted',
    'rejected'
);


ALTER TYPE "content"."suggestion_status_enum" OWNER TO "postgres";


CREATE TYPE "content"."tag_visibility_enum" AS ENUM (
    'public',
    'private',
    'hidden'
);


ALTER TYPE "content"."tag_visibility_enum" OWNER TO "postgres";


CREATE TYPE "content"."thread_reply_status" AS ENUM (
    'published',
    'hidden',
    'deleted'
);


ALTER TYPE "content"."thread_reply_status" OWNER TO "postgres";


CREATE TYPE "content"."thread_visibility" AS ENUM (
    'public',
    'community',
    'private'
);


ALTER TYPE "content"."thread_visibility" OWNER TO "postgres";


CREATE TYPE "content"."visibility_enum" AS ENUM (
    'public',
    'community',
    'private'
);


ALTER TYPE "content"."visibility_enum" OWNER TO "postgres";


CREATE TYPE "lensers"."group_member_role_enum" AS ENUM (
    'admin',
    'moderator',
    'member',
    'judge'
);


ALTER TYPE "lensers"."group_member_role_enum" OWNER TO "postgres";


CREATE TYPE "lensers"."group_type_enum" AS ENUM (
    'community',
    'team'
);


ALTER TYPE "lensers"."group_type_enum" OWNER TO "postgres";


CREATE TYPE "lensers"."group_visibility_enum" AS ENUM (
    'public',
    'private',
    'invite_only'
);


ALTER TYPE "lensers"."group_visibility_enum" OWNER TO "postgres";


CREATE TYPE "lensers"."lenser_badge_category" AS ENUM (
    'prestige',
    'achievement'
);


ALTER TYPE "lensers"."lenser_badge_category" OWNER TO "postgres";


CREATE TYPE "lensers"."lenser_badge_type" AS ENUM (
    'system',
    'community',
    'challenge',
    'prestige_first_10',
    'prestige_first_100',
    'prestige_first_1000',
    'achievement_xp_level',
    'achievement_xp_milestone',
    'COUNTRY_TOP_1',
    'COUNTRY_TOP_10',
    'COUNTRY_TOP_100',
    'FOUNDING_10',
    'FOUNDING_100',
    'FOUNDING_1000'
);


ALTER TYPE "lensers"."lenser_badge_type" OWNER TO "postgres";


CREATE TYPE "lensers"."lenser_social_platform" AS ENUM (
    'Behance',
    'Dribbble',
    'GitHub',
    'Instagram',
    'LinkedIn',
    'Twitch',
    'Website',
    'X',
    'Twitter',
    'Youtube',
    'Facebook'
);


ALTER TYPE "lensers"."lenser_social_platform" OWNER TO "postgres";


CREATE TYPE "lensers"."lenser_status" AS ENUM (
    'active',
    'suspended',
    'deactivated',
    'pending_deletion',
    'deleted'
);


ALTER TYPE "lensers"."lenser_status" OWNER TO "postgres";


CREATE TYPE "lensers"."lenser_type" AS ENUM (
    'human',
    'ai'
);


ALTER TYPE "lensers"."lenser_type" OWNER TO "postgres";


CREATE TYPE "lensers"."lenser_visibility" AS ENUM (
    'public',
    'community',
    'private'
);


ALTER TYPE "lensers"."lenser_visibility" OWNER TO "postgres";


CREATE TYPE "lensers"."profile_access_level" AS ENUM (
    'FULL_PROFILE',
    'RESTRICTED_PROFILE',
    'OWNER_RECOVERY_PROFILE',
    'UNAVAILABLE_PROFILE'
);


ALTER TYPE "lensers"."profile_access_level" OWNER TO "postgres";


CREATE TYPE "lensers"."relationship_status" AS ENUM (
    'pending',
    'accepted',
    'rejected',
    'blocked',
    'removed'
);


ALTER TYPE "lensers"."relationship_status" OWNER TO "postgres";


CREATE TYPE "lensers"."wallet_mode_enum" AS ENUM (
    'CLOUD',
    'BYOK',
    'LOCAL'
);


ALTER TYPE "lensers"."wallet_mode_enum" OWNER TO "postgres";


COMMENT ON TYPE "lensers"."wallet_mode_enum" IS 'Wallet/billing mode for a lenser: CLOUD = platform credits, BYOK = bring-your-own-key, LOCAL = self-hosted inference.';



CREATE TYPE "public"."page_view_target_enum" AS ENUM (
    'thread',
    'thread_reply',
    'lens',
    'profile',
    'page',
    'battle'
);


ALTER TYPE "public"."page_view_target_enum" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "agents"."fn_agent_action"("p_ai_lenser_id" "uuid", "p_action_type" "text", "p_context_type" "text" DEFAULT NULL::"text", "p_context_id" "uuid" DEFAULT NULL::"uuid", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'agents', 'public'
    AS $$
DECLARE
  v_policy agents.policies%ROWTYPE;
  v_quota  agents.quota_snapshots%ROWTYPE;
  v_result text := 'success';
BEGIN
  -- Load policy
  SELECT * INTO v_policy
  FROM agents.policies WHERE ai_lenser_id = p_ai_lenser_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no_policy_for_agent: %', p_ai_lenser_id;
  END IF;

  -- Policy gate
  IF p_action_type = 'join_battle'   AND NOT v_policy.can_join_battles   THEN v_result := 'blocked_by_policy'; END IF;
  IF p_action_type = 'cast_vote'     AND NOT v_policy.can_vote            THEN v_result := 'blocked_by_policy'; END IF;
  IF p_action_type = 'create_battle' AND NOT v_policy.can_create_battles  THEN v_result := 'blocked_by_policy'; END IF;

  -- Quota check (only if policy allows)
  IF v_result = 'success' THEN
    -- Lazily create today's quota row
    INSERT INTO agents.quota_snapshots (ai_lenser_id, period_date)
    VALUES (p_ai_lenser_id, CURRENT_DATE)
    ON CONFLICT (ai_lenser_id, period_date) DO NOTHING;

    SELECT * INTO v_quota
    FROM agents.quota_snapshots
    WHERE ai_lenser_id = p_ai_lenser_id AND period_date = CURRENT_DATE;

    IF p_action_type = 'join_battle'
       AND v_policy.max_daily_battles > 0
       AND v_quota.battles_used >= v_policy.max_daily_battles
    THEN
      v_result := 'throttled';
    END IF;

    IF p_action_type = 'cast_vote'
       AND v_policy.max_daily_votes > 0
       AND v_quota.votes_used >= v_policy.max_daily_votes
    THEN
      v_result := 'throttled';
    END IF;
  END IF;

  -- Always log (including blocked and throttled outcomes)
  INSERT INTO agents.action_logs (
    ai_lenser_id, action_type, context_ref_type, context_ref_id, result, metadata
  )
  VALUES (
    p_ai_lenser_id, p_action_type, p_context_type, p_context_id, v_result, p_metadata
  );

  -- Update quota counters only on success
  IF v_result = 'success' THEN
    UPDATE agents.quota_snapshots SET
      battles_used  = battles_used  + CASE WHEN p_action_type = 'join_battle' THEN 1 ELSE 0 END,
      votes_used    = votes_used    + CASE WHEN p_action_type = 'cast_vote'   THEN 1 ELSE 0 END,
      updated_at    = now()
    WHERE ai_lenser_id = p_ai_lenser_id AND period_date = CURRENT_DATE;
  END IF;

  RETURN jsonb_build_object(
    'result',  v_result,
    'action',  p_action_type,
    'agent_id', p_ai_lenser_id
  );
END;
$$;


ALTER FUNCTION "agents"."fn_agent_action"("p_ai_lenser_id" "uuid", "p_action_type" "text", "p_context_type" "text", "p_context_id" "uuid", "p_metadata" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "agents"."fn_agent_action"("p_ai_lenser_id" "uuid", "p_action_type" "text", "p_context_type" "text", "p_context_id" "uuid", "p_metadata" "jsonb") IS 'Single entry point for all AI Lenser autonomous actions. Evaluates policy constraints, daily quota limits, logs the outcome, and increments quota counters on success. Returns: {result: success|blocked_by_policy|throttled|failed, action, agent_id}.';



ALTER FUNCTION "agents"."fn_create_ai_lenser"("p_owner_lenser_id" "uuid", "p_handle" "text", "p_display_name" "text", "p_ai_model_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "agents"."fn_update_agent_policy"("p_ai_lenser_id" "uuid", "p_updates" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'agents', 'lensers', 'public'
    AS $$
DECLARE
  v_caller_id uuid;
  v_is_owner  boolean;
  v_policy_id uuid;
BEGIN
  -- Auth check
  v_caller_id := lensers.get_auth_lenser_id();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Ownership check: caller must be owner or co_owner of this AI lenser
  SELECT EXISTS (
    SELECT 1 FROM agents.ownerships
    WHERE ai_lenser_id = p_ai_lenser_id
      AND owner_lenser_id = v_caller_id
      AND role IN ('owner', 'co_owner')
      AND revoked_at IS NULL
  ) INTO v_is_owner;

  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'Only the agent owner or co-owner can update policies'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Get existing policy
  SELECT id INTO v_policy_id
  FROM agents.policies
  WHERE ai_lenser_id = p_ai_lenser_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No policy found for this AI lenser'
      USING ERRCODE = 'no_data_found';
  END IF;

  -- Apply allowed updates
  UPDATE agents.policies SET
    can_join_battles       = coalesce((p_updates ->> 'can_join_battles')::boolean, can_join_battles),
    can_vote               = coalesce((p_updates ->> 'can_vote')::boolean, can_vote),
    can_create_battles     = coalesce((p_updates ->> 'can_create_battles')::boolean, can_create_battles),
    can_receive_sponsorship = coalesce((p_updates ->> 'can_receive_sponsorship')::boolean, can_receive_sponsorship),
    model_binding_mode     = coalesce(
      CASE WHEN p_updates ? 'model_binding_mode' THEN (p_updates ->> 'model_binding_mode')::text END,
      model_binding_mode
    ),
    max_daily_battles      = coalesce((p_updates ->> 'max_daily_battles')::integer, max_daily_battles),
    max_daily_votes        = coalesce((p_updates ->> 'max_daily_votes')::integer, max_daily_votes),
    spending_limit_credits = coalesce((p_updates ->> 'spending_limit_credits')::integer, spending_limit_credits),
    is_public_policy       = coalesce((p_updates ->> 'is_public_policy')::boolean, is_public_policy),
    updated_at             = now()
  WHERE id = v_policy_id;

  RETURN jsonb_build_object('updated', true, 'policy_id', v_policy_id);
END;
$$;


ALTER FUNCTION "agents"."fn_update_agent_policy"("p_ai_lenser_id" "uuid", "p_updates" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "ai"."cascade_provider_deactivation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'ai', 'public'
    AS $$
BEGIN
    IF OLD.is_active = true AND NEW.is_active = false THEN
        UPDATE ai.models
        SET is_active = false
        WHERE provider_id = NEW.id
          AND is_active   = true;

        RAISE NOTICE 'Provider % deactivated: % model(s) set inactive', NEW.key, FOUND;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "ai"."cascade_provider_deactivation"() OWNER TO "postgres";


COMMENT ON FUNCTION "ai"."cascade_provider_deactivation"() IS 'Trigger function: when a provider is deactivated (is_active → false), automatically sets is_active = false on all of its active models. Runs SECURITY DEFINER so it always has write access to ai.models regardless of invoker.';



CREATE OR REPLACE FUNCTION "ai"."enforce_active_provider_for_model"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'ai', 'public'
    AS $$
DECLARE
    v_provider_active boolean;
    v_provider_key    text;
BEGIN
    IF NEW.is_active = true THEN
        SELECT p.is_active, p.key
          INTO v_provider_active, v_provider_key
          FROM ai.providers p
         WHERE p.id = NEW.provider_id;

        IF v_provider_active IS NOT TRUE THEN
            RAISE EXCEPTION
                'Cannot activate model "%" — provider "%" (id=%) is inactive or does not exist. '
                'Activate the provider first.',
                NEW.key,
                COALESCE(v_provider_key, 'unknown'),
                NEW.provider_id
            USING ERRCODE = 'P0001';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "ai"."enforce_active_provider_for_model"() OWNER TO "postgres";


COMMENT ON FUNCTION "ai"."enforce_active_provider_for_model"() IS 'Trigger function: prevents any role from activating a model whose provider is inactive. Raises P0001 with a descriptive message. Applies on BEFORE INSERT OR UPDATE OF is_active.';



CREATE OR REPLACE FUNCTION "ai"."fn_decrypt_api_key"("p_key_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'ai', 'vault', 'auth', 'public'
    AS $$
DECLARE
    v_encrypted_id uuid;
    v_decrypted    text;
BEGIN
    -- Primary guard: grant restricts to service_role only.
    -- Secondary guard: verify JWT role as defence-in-depth.
    IF auth.role() IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'Forbidden: only service_role can decrypt API keys';
    END IF;

    SELECT encrypted_key_id INTO v_encrypted_id
    FROM ai.keys
    WHERE id = p_key_id AND is_active = true;

    IF v_encrypted_id IS NULL THEN
        RAISE EXCEPTION 'Key not found or revoked';
    END IF;

    SELECT decrypted_secret INTO v_decrypted
    FROM vault.decrypted_secrets
    WHERE id = v_encrypted_id;

    IF v_decrypted IS NULL THEN
        RAISE EXCEPTION 'Failed to decrypt key from vault';
    END IF;

    RETURN v_decrypted;
END;
$$;


ALTER FUNCTION "ai"."fn_decrypt_api_key"("p_key_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "ai"."fn_decrypt_api_key"("p_key_id" "uuid") IS 'Decrypts a BYOK API key from Vault. Restricted to service_role only. Used by the execution backend at runtime. Never exposed to client.';



CREATE OR REPLACE FUNCTION "ai"."fn_get_my_api_keys"() RETURNS TABLE("id" "uuid", "lenser_id" "uuid", "provider_id" "uuid", "provider_key" "text", "provider_name" "text", "label" "text", "key_suffix" "text", "is_active" boolean, "created_at" timestamp with time zone, "revoked_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'ai', 'lensers', 'public'
    AS $$
DECLARE
  v_lenser_id uuid;
BEGIN
  v_lenser_id := lensers.get_auth_lenser_id();
  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated: no lenser profile found';
  END IF;

  RETURN QUERY
  SELECT
    k.id,
    k.lenser_id,
    k.provider_id,
    p.key        AS provider_key,
    p.display_name AS provider_name,
    k.label,
    k.key_suffix,
    k.is_active,
    k.created_at,
    k.revoked_at
  FROM ai.keys k
  JOIN ai.providers p ON p.id = k.provider_id
  WHERE k.lenser_id = v_lenser_id
    AND k.is_active = true
  ORDER BY k.created_at DESC;
END;
$$;


ALTER FUNCTION "ai"."fn_get_my_api_keys"() OWNER TO "postgres";


COMMENT ON FUNCTION "ai"."fn_get_my_api_keys"() IS 'Returns active BYOK API keys for the authenticated lenser, joined with provider metadata. SECURITY DEFINER — runs as postgres to bypass table-level restrictions on ai.keys and ai.providers. Decrypted key material is never returned — only the masked suffix.';



CREATE OR REPLACE FUNCTION "ai"."fn_revoke_api_key"("p_key_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'ai', 'lensers', 'public'
    AS $$
DECLARE
    v_lenser_id uuid;
    v_rows      int;
BEGIN
    v_lenser_id := lensers.get_auth_lenser_id();
    IF v_lenser_id IS NULL THEN
        RAISE EXCEPTION 'Unauthenticated: no lenser profile found';
    END IF;

    UPDATE ai.keys
    SET is_active = false, revoked_at = now()
    WHERE id = p_key_id
      AND lenser_id = v_lenser_id
      AND is_active = true;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN
        RAISE EXCEPTION 'Key not found or already revoked';
    END IF;
END;
$$;


ALTER FUNCTION "ai"."fn_revoke_api_key"("p_key_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "ai"."fn_revoke_api_key"("p_key_id" "uuid") IS 'Soft-revokes a BYOK API key. Only the key owner can revoke. Revoked keys cannot be used for execution.';



CREATE OR REPLACE FUNCTION "ai"."fn_store_api_key"("p_provider" "text", "p_label" "text" DEFAULT NULL::"text", "p_raw_key" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'ai', 'vault', 'lensers', 'public'
    AS $$
DECLARE
    v_lenser_id   uuid;
    v_secret_id   uuid;
    v_suffix      text;
    v_key_id      uuid;
    v_secret_name text;
    v_provider_id uuid;
BEGIN
    v_lenser_id := lensers.get_auth_lenser_id();
    IF v_lenser_id IS NULL THEN
        RAISE EXCEPTION 'Unauthenticated: no lenser profile found';
    END IF;

    IF p_raw_key IS NULL OR length(trim(p_raw_key)) < 8 THEN
        RAISE EXCEPTION 'Invalid API key: must be at least 8 characters';
    END IF;

    SELECT id INTO v_provider_id
    FROM ai.providers
    WHERE key = p_provider AND is_active = true;

    IF v_provider_id IS NULL THEN
        RAISE EXCEPTION 'Unsupported or inactive provider: %', p_provider;
    END IF;

    v_suffix := right(trim(p_raw_key), 4);

    v_secret_name := 'byok_' || v_lenser_id::text || '_' || p_provider || '_' || gen_random_uuid()::text;

    v_secret_id := vault.create_secret(
        trim(p_raw_key),
        v_secret_name,
        'BYOK API key for ' || p_provider
    );

    INSERT INTO ai.keys (lenser_id, provider_id, label, encrypted_key_id, key_suffix)
    VALUES (v_lenser_id, v_provider_id, p_label, v_secret_id, v_suffix)
    RETURNING id INTO v_key_id;

    RETURN v_key_id;
END;
$$;


ALTER FUNCTION "ai"."fn_store_api_key"("p_provider" "text", "p_label" "text", "p_raw_key" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "ai"."fn_store_api_key"("p_provider" "text", "p_label" "text", "p_raw_key" "text") IS 'Encrypts and stores a BYOK API key in Vault. Multiple keys per provider per lenser are allowed. The vault secret name includes gen_random_uuid() to guarantee uniqueness and avoid hitting the secrets_name_idx unique constraint. Only the last 4 characters are stored in plain text. Returns the key row UUID.';



CREATE OR REPLACE FUNCTION "content"."ensure_public_tag"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'content', 'lensers', 'public', 'auth'
    AS $$BEGIN
  PERFORM 1 FROM content.tags t
  WHERE t.id = NEW.tag_id AND t.visibility = 'public';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only public tags can be attached.';
  END IF;
  RETURN NEW;
END;$$;


ALTER FUNCTION "content"."ensure_public_tag"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "content"."fn_cleanup_entity_refs"("p_entity_type" "content"."entity_type_enum", "p_entity_id" "uuid") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  DELETE FROM "content"."reactions"
    WHERE "entity_type" = "p_entity_type"
      AND "entity_id"   = "p_entity_id";

  DELETE FROM "content"."tag_map"
    WHERE "entity_type" = "p_entity_type"
      AND "entity_id"   = "p_entity_id";

  DELETE FROM "content"."entity_translations"
    WHERE "entity_type" = "p_entity_type"
      AND "entity_id"   = "p_entity_id";

  DELETE FROM "content"."tag_suggestions"
    WHERE "entity_type" = "p_entity_type"
      AND "entity_id"   = "p_entity_id";

  DELETE FROM "content"."reports"
    WHERE "target_type" = "p_entity_type"
      AND "target_id"   = "p_entity_id";
$$;


ALTER FUNCTION "content"."fn_cleanup_entity_refs"("p_entity_type" "content"."entity_type_enum", "p_entity_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "content"."fn_cleanup_entity_refs"("p_entity_type" "content"."entity_type_enum", "p_entity_id" "uuid") IS 'Deletes all polymorphic content references for a given entity when it is deleted. Called by AFTER DELETE triggers on lenses.lenses, content.threads, and content.thread_replies. Enforces referential integrity for entity_type + entity_id patterns that cannot use FK constraints.';



ALTER FUNCTION "content"."fn_xp_on_workflow_reaction"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "content"."normalize_website_url"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'content', 'public'
    AS $$
BEGIN
  IF NEW.website_url = '' THEN
    NEW.website_url := NULL;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "content"."normalize_website_url"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "content"."set_reaction_user_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'content', 'auth'
    AS $$
BEGIN
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "content"."set_reaction_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "content"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'content', 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "content"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "content"."set_version_published_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'content', 'public'
    AS $$
BEGIN
    IF NEW.status = 'published' AND OLD.status <> 'published' THEN
        NEW.published_at := now();
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "content"."set_version_published_at"() OWNER TO "postgres";


ALTER FUNCTION "content"."sync_lens_count"() OWNER TO "postgres";


ALTER FUNCTION "content"."sync_thread_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "content"."thread_replies_after_delete_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'content', 'lensers', 'public', 'auth'
    AS $$begin
  if content.thread_reply_counts_as_public(OLD) then
    update content.threads
    set reply_count = greatest(reply_count - 1, 0)
    where id = OLD.thread_id;
  end if;

  return OLD;
end;$$;


ALTER FUNCTION "content"."thread_replies_after_delete_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "content"."thread_replies_after_insert_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'content', 'lensers', 'public', 'auth'
    AS $$begin
  if content.thread_reply_counts_as_public(NEW) then
    update content.threads
    set reply_count = reply_count + 1
    where id = NEW.thread_id;
  end if;

  return NEW;
end;$$;


ALTER FUNCTION "content"."thread_replies_after_insert_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "content"."thread_replies_after_update_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'content', 'lensers', 'public', 'auth'
    AS $$declare
  old_counts boolean;
  new_counts boolean;
begin
  old_counts := content.thread_reply_counts_as_public(OLD);
  new_counts := content.thread_reply_counts_as_public(NEW);

  -- became visible public reply
  if not old_counts and new_counts then
    update content.threads
    set reply_count = reply_count + 1
    where id = NEW.thread_id;

  -- stopped being counted (hidden / soft-deleted etc.)
  elsif old_counts and not new_counts then
    update content.threads
    set reply_count = greatest(reply_count - 1, 0)
    where id = OLD.thread_id;
  end if;

  return NEW;
end;$$;


ALTER FUNCTION "content"."thread_replies_after_update_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lensers"."get_auth_lenser_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'agents', 'auth'
    AS $$
  SELECT COALESCE(
    -- 1. Use stored active selection when it is still a valid, active profile
    (
      SELECT pref.active_lenser_id
      FROM lensers.preferences  pref
      JOIN lensers.profiles     human_p ON human_p.id = pref.lenser_id
      WHERE human_p.user_id           = auth.uid()
        AND pref.active_lenser_id     IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM lensers.profiles target
          WHERE target.id     = pref.active_lenser_id
            AND target.status = 'active'
        )
      LIMIT 1
    ),
    -- 2. Fall back to the human profile
    (
      SELECT id FROM lensers.profiles
      WHERE user_id = auth.uid()
        AND type    = 'human'
      LIMIT 1
    )
  );
$$;


ALTER FUNCTION "lensers"."get_auth_lenser_id"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "content"."thread_replies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "thread_id" "uuid" NOT NULL,
    "parent_reply_id" "uuid",
    "lenser_id" "uuid" DEFAULT "lensers"."get_auth_lenser_id"() NOT NULL,
    "content" "text" NOT NULL,
    "content_html" "text",
    "status" "content"."thread_reply_status" DEFAULT 'published'::"content"."thread_reply_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone
);


ALTER TABLE "content"."thread_replies" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "content"."thread_reply_counts_as_public"("r" "content"."thread_replies") RETURNS boolean
    LANGUAGE "sql"
    SET "search_path" TO 'content', 'lensers', 'public', 'auth'
    AS $$
    SELECT (r.status = 'published'::content.thread_reply_status) AND r.deleted_at IS NULL;
  $$;


ALTER FUNCTION "content"."thread_reply_counts_as_public"("r" "content"."thread_replies") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "content"."toggle_reaction"("p_lenser_id" "uuid", "p_target_type" "text", "p_target_id" "uuid", "p_reaction" "content"."reaction_enum") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'content', 'lensers', 'public', 'auth'
    AS $$
DECLARE
    v_entity    "content"."entity_type_enum";
    v_existing_id "uuid";
BEGIN
    v_entity := "p_target_type"::"content"."entity_type_enum";

    -- copy = unlimited → direct insert
    IF "p_reaction" = 'copy'::"content"."reaction_enum" THEN
        INSERT INTO "content"."reactions" ("entity_type", "entity_id", "lenser_id", "reaction")
        VALUES (v_entity, "p_target_id", "p_lenser_id", "p_reaction");
        RETURN "jsonb_build_object"('status', 'copied');
    END IF;

    -- Check existing toggleable reaction
    SELECT "id" INTO v_existing_id
    FROM "content"."reactions"
    WHERE "lenser_id"   = "p_lenser_id"
      AND "entity_type" = v_entity
      AND "entity_id"   = "p_target_id"
      AND "reaction"    IN ('like', 'dislike', 'saved');

    -- If exists → DELETE (toggle off)
    IF v_existing_id IS NOT NULL THEN
        DELETE FROM "content"."reactions" WHERE "id" = v_existing_id;
        RETURN "jsonb_build_object"('status', 'removed');
    END IF;

    -- Else → INSERT (toggle on)
    INSERT INTO "content"."reactions" ("entity_type", "entity_id", "lenser_id", "reaction")
    VALUES (v_entity, "p_target_id", "p_lenser_id", "p_reaction");

    RETURN "jsonb_build_object"('status', 'added');
END;
$$;


ALTER FUNCTION "content"."toggle_reaction"("p_lenser_id" "uuid", "p_target_type" "text", "p_target_id" "uuid", "p_reaction" "content"."reaction_enum") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "content"."trg_cleanup_thread_content_refs"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  PERFORM "content"."fn_cleanup_entity_refs"('thread'::"content"."entity_type_enum", OLD."id");
  RETURN OLD;
END;
$$;


ALTER FUNCTION "content"."trg_cleanup_thread_content_refs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "content"."trg_cleanup_thread_reply_content_refs"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  PERFORM "content"."fn_cleanup_entity_refs"('thread_reply'::"content"."entity_type_enum", OLD."id");
  RETURN OLD;
END;
$$;


ALTER FUNCTION "content"."trg_cleanup_thread_reply_content_refs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "content"."update_lens_reaction_counters"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'lenses', 'content', 'public'
    AS $$
DECLARE
  v_template_id uuid;
BEGIN
  IF NEW.entity_type = 'lens' THEN
    v_template_id := NEW.target_id;

    UPDATE lenses.lenses
    SET reaction_totals = (
      SELECT jsonb_object_agg(reaction, count)
      FROM (
        SELECT reaction, COUNT(*) AS count
        FROM content.reactions
        WHERE target_type = 'lens'
          AND target_id   = v_template_id
        GROUP BY reaction
      ) sub
    )
    WHERE id = v_template_id;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "content"."update_lens_reaction_counters"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "content"."update_workflow_reaction_counters"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'lenses', 'content', 'public'
    AS $$
DECLARE
  v_workflow_id uuid;
BEGIN
  -- Determine which workflow was affected (works for INSERT and DELETE)
  IF TG_OP = 'DELETE' THEN
    IF OLD.entity_type::text != 'workflow' THEN RETURN OLD; END IF;
    v_workflow_id := OLD.entity_id;
  ELSE
    IF NEW.entity_type::text != 'workflow' THEN RETURN NEW; END IF;
    v_workflow_id := NEW.entity_id;
  END IF;

  UPDATE lenses.workflows
  SET reaction_totals = COALESCE((
    SELECT jsonb_object_agg(reaction, cnt)
    FROM (
      SELECT reaction, COUNT(*) AS cnt
      FROM content.reactions
      WHERE entity_type = 'workflow'::content.entity_type_enum
        AND entity_id   = v_workflow_id
      GROUP BY reaction
    ) sub
  ), '{}'::jsonb)
  WHERE id = v_workflow_id;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "content"."update_workflow_reaction_counters"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "content"."user_owns_lens"("template_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'lenses', 'content', 'lensers', 'public', 'auth'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM lenses.lenses pt
    JOIN lensers.profiles l ON l.id = pt.lenser_id
    WHERE pt.id = template_id
      AND l.user_id = auth.uid()
  );
$$;


ALTER FUNCTION "content"."user_owns_lens"("template_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "content"."user_owns_thread"("thread_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'content', 'lensers', 'public', 'auth'
    AS $$select exists (
    select 1
    from content.threads t
    join lensers.profiles l on l.id = t.lenser_id
    where t.id = thread_id
      and l.user_id = auth.uid()
  );$$;


ALTER FUNCTION "content"."user_owns_thread"("thread_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "execution"."fn_complete_execution_run"("p_run_id" "uuid", "p_status" "text", "p_token_input" integer DEFAULT NULL::integer, "p_token_output" integer DEFAULT NULL::integer, "p_credit_cost" bigint DEFAULT NULL::bigint, "p_billing_status" "text" DEFAULT 'free'::"text", "p_response_text" "text" DEFAULT NULL::"text", "p_response_meta" "jsonb" DEFAULT '{}'::"jsonb", "p_error_code" "text" DEFAULT NULL::"text", "p_error_message" "text" DEFAULT NULL::"text", "p_latency_ms" integer DEFAULT NULL::integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'execution', 'public'
    AS $$
BEGIN
    UPDATE "execution"."runs"
    SET
        "status"         = p_status,
        "token_input"    = COALESCE(p_token_input,    "token_input"),
        "token_output"   = COALESCE(p_token_output,   "token_output"),
        "credit_cost"    = COALESCE(p_credit_cost,    "credit_cost"),
        "billing_status" = p_billing_status,
        "response_text"  = p_response_text,
        "response_meta"  = COALESCE(p_response_meta,  "response_meta"),
        "error_code"     = p_error_code,
        "error_message"  = p_error_message,
        "latency_ms"     = COALESCE(p_latency_ms,     "latency_ms"),
        "completed_at"   = now()
    WHERE "id" = p_run_id;
END;
$$;


ALTER FUNCTION "execution"."fn_complete_execution_run"("p_run_id" "uuid", "p_status" "text", "p_token_input" integer, "p_token_output" integer, "p_credit_cost" bigint, "p_billing_status" "text", "p_response_text" "text", "p_response_meta" "jsonb", "p_error_code" "text", "p_error_message" "text", "p_latency_ms" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "execution"."fn_complete_execution_run"("p_run_id" "uuid", "p_status" "text", "p_token_input" integer, "p_token_output" integer, "p_credit_cost" bigint, "p_billing_status" "text", "p_response_text" "text", "p_response_meta" "jsonb", "p_error_code" "text", "p_error_message" "text", "p_latency_ms" integer) IS 'Updates execution.runs with final status, token counts, credit cost, and response. Called fire-and-forget after provider execution completes or fails. SECURITY DEFINER; callable only by service_role.';



CREATE OR REPLACE FUNCTION "execution"."fn_get_lens_execution_history"("p_lens_id" "uuid", "p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0) RETURNS TABLE("request_id" "uuid", "lens_id" "uuid", "version_id" "uuid", "version_number" integer, "model_id" "uuid", "model_key" "text", "provider_key" "text", "funding_source" "text", "run_id" "uuid", "run_status" "text", "latency_ms" integer, "token_input" integer, "token_output" integer, "credit_cost" bigint, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'execution', 'lenses', 'ai', 'lensers', 'public'
    AS $$
DECLARE
  v_caller_id uuid := "lensers"."get_auth_lenser_id"();
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT
    req."id"                    AS request_id,
    req."lens_id"               AS lens_id,
    req."version_id"            AS version_id,
    lv."version_number"         AS version_number,
    req."model_id"              AS model_id,
    m."key"                     AS model_key,
    p."key"                     AS provider_key,
    req."funding_source"        AS funding_source,
    r."id"                      AS run_id,
    r."status"                  AS run_status,
    r."latency_ms"              AS latency_ms,
    r."token_input"             AS token_input,
    r."token_output"            AS token_output,
    r."credit_cost"             AS credit_cost,
    req."created_at"            AS created_at
  FROM  "execution"."requests"  req
  LEFT JOIN "execution"."runs"  r   ON r."request_id"  = req."id"
                                   AND r."is_active"   = true
  LEFT JOIN "lenses"."versions" lv  ON lv."id"         = req."version_id"
  LEFT JOIN "ai"."models"       m   ON m."id"          = req."model_id"
  LEFT JOIN "ai"."providers"    p   ON p."id"          = m."provider_id"
  WHERE req."lens_id"              = p_lens_id
    AND req."requester_lenser_id"  = v_caller_id
    AND req."is_active"            = true
  ORDER BY req."created_at" DESC
  LIMIT  p_limit
  OFFSET p_offset;
END;
$$;


ALTER FUNCTION "execution"."fn_get_lens_execution_history"("p_lens_id" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "execution"."fn_get_lens_execution_history"("p_lens_id" "uuid", "p_limit" integer, "p_offset" integer) IS 'GRASP Controller: returns caller-scoped execution history for a lens, enriched with model key, provider key, and version number. Used by LabExecutionTimeline to display model/provider/version badges. SECURITY DEFINER: filters to requester_lenser_id only. Replaces the deprecated execution.vw_ray_runs (compatibility shim) for app-layer reads.';



CREATE OR REPLACE FUNCTION "execution"."fn_persist_execution_artifacts"("p_run_id" "uuid", "p_lenser_id" "uuid", "p_workspace_id" "uuid", "p_ai_model_id" "uuid", "p_kind" "text", "p_content_text" "text" DEFAULT NULL::"text", "p_content_json" "jsonb" DEFAULT NULL::"jsonb", "p_media_ids" "uuid"[] DEFAULT '{}'::"uuid"[]) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'execution', 'public'
    AS $$
DECLARE
    v_artifact_id "uuid";
    v_media_id    "uuid";
BEGIN
    INSERT INTO "execution"."artifacts" (
        "run_id",
        "artifact_kind",
        "content_text",
        "content_json",
        "visibility",
        "is_primary_output",
        "output_type"
    ) VALUES (
        p_run_id,
        p_kind,
        p_content_text,
        p_content_json,
        'private',
        true,
        p_kind
    )
    RETURNING "id" INTO v_artifact_id;

    -- Link each media object
    FOREACH v_media_id IN ARRAY p_media_ids LOOP
        INSERT INTO "execution"."artifact_medias" ("artifact_id", "media_id")
        VALUES (v_artifact_id, v_media_id);
    END LOOP;

    RETURN v_artifact_id;
END;
$$;


ALTER FUNCTION "execution"."fn_persist_execution_artifacts"("p_run_id" "uuid", "p_lenser_id" "uuid", "p_workspace_id" "uuid", "p_ai_model_id" "uuid", "p_kind" "text", "p_content_text" "text", "p_content_json" "jsonb", "p_media_ids" "uuid"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "execution"."fn_persist_execution_artifacts"("p_run_id" "uuid", "p_lenser_id" "uuid", "p_workspace_id" "uuid", "p_ai_model_id" "uuid", "p_kind" "text", "p_content_text" "text", "p_content_json" "jsonb", "p_media_ids" "uuid"[]) IS 'Persist an execution artifact and link N media objects (images, audio, video). p_media_ids defaults to empty array for text-only artifacts. SECURITY DEFINER; callable only by service_role.';



CREATE OR REPLACE FUNCTION "execution"."fn_persist_local_execution"("p_lens_id" "uuid", "p_version_id" "uuid" DEFAULT NULL::"uuid", "p_provider" "text" DEFAULT 'ollama'::"text", "p_model" "text" DEFAULT ''::"text", "p_content_text" "text" DEFAULT ''::"text", "p_token_input" integer DEFAULT 0, "p_token_output" integer DEFAULT 0) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'execution', 'lensers', 'public'
    AS $$
DECLARE
    v_caller_id   uuid := "lensers"."get_auth_lenser_id"();
    v_request_id  uuid;
    v_run_id      uuid;
    v_now         timestamptz := now();
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- 1. Create the execution request
    INSERT INTO "execution"."requests" (
        "requester_lenser_id",
        "origin_type",
        "lens_id",
        "version_id",
        "input_snapshot",
        "runtime_origin",
        "funding_source",
        "created_at"
    ) VALUES (
        v_caller_id,
        'lens_preview',
        p_lens_id,
        p_version_id,
        '{}'::jsonb,
        'local',
        'user_byok_local',
        v_now
    )
    RETURNING "id" INTO v_request_id;

    -- 2. Create the run record (already completed)
    INSERT INTO "execution"."runs" (
        "request_id",
        "status",
        "started_at",
        "completed_at",
        "token_input",
        "token_output",
        "credit_cost",
        "billing_status",
        "response_text",
        "response_meta",
        "created_at"
    ) VALUES (
        v_request_id,
        'succeeded',
        v_now,
        v_now,
        p_token_input,
        p_token_output,
        0,
        'free',
        p_content_text,
        jsonb_build_object('provider', p_provider, 'model', p_model, 'source', 'local_byok'),
        v_now
    )
    RETURNING "id" INTO v_run_id;

    -- 3. Create the primary text artifact
    INSERT INTO "execution"."artifacts" (
        "run_id",
        "artifact_kind",
        "content_text",
        "visibility",
        "is_primary_output",
        "output_type",
        "created_at"
    ) VALUES (
        v_run_id,
        'text',
        p_content_text,
        'private',
        true,
        'text',
        v_now
    );

    RETURN v_run_id;
END;
$$;


ALTER FUNCTION "execution"."fn_persist_local_execution"("p_lens_id" "uuid", "p_version_id" "uuid", "p_provider" "text", "p_model" "text", "p_content_text" "text", "p_token_input" integer, "p_token_output" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "execution"."fn_persist_local_execution"("p_lens_id" "uuid", "p_version_id" "uuid", "p_provider" "text", "p_model" "text", "p_content_text" "text", "p_token_input" integer, "p_token_output" integer) IS 'Persists a completed local BYOK execution (browser-side streaming) into execution.requests + runs + artifacts. Called from the client after streamLocalProvider finishes so that local runs appear in execution history and survive page refresh. SECURITY DEFINER: resolves requester from auth.uid(). Credits always 0 for local runs.';



CREATE OR REPLACE FUNCTION "execution"."fn_run_lens"("p_lens_id" "uuid", "p_version_id" "uuid", "p_model_id" "uuid", "p_inputs" "jsonb" DEFAULT '{}'::"jsonb", "p_funding_source" "text" DEFAULT 'platform_credit'::"text", "p_byok_key_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'execution', 'lenses', 'lensers', 'tenancy', 'public'
    AS $$
DECLARE
  v_lenser_id    uuid := "lensers"."get_auth_lenser_id"();
  v_workspace_id uuid;
  v_request_id   uuid;
  v_run_id       uuid;
  v_param_rec    RECORD;
  v_value        text;
BEGIN
  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Verify the lens exists and is accessible by the caller
  IF NOT EXISTS (
    SELECT 1 FROM "lenses"."lenses" l
    WHERE  l."id" = p_lens_id
      AND  (l."visibility" = 'public' OR l."lenser_id" = v_lenser_id)
  ) THEN
    RAISE EXCEPTION 'Lens % not found or access denied', p_lens_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- Validate inputs against version_parameters schema (DB-level enforcement)
  -- Raises check_violation if required params missing, types incompatible, or
  -- select values not in options. No-op if p_version_id IS NULL.
  PERFORM "lenses"."fn_validate_inputs"(p_version_id, p_inputs);

  -- Resolve workspace: fall back to lenser's personal workspace
  v_workspace_id := (
    SELECT "w"."id"
    FROM   "tenancy"."workspaces" w
    WHERE  "w"."owner_lenser_id" = v_lenser_id
      AND  "w"."type"            = 'personal'
      AND  "w"."status"          = 'active'
    ORDER  BY "w"."created_at" ASC
    LIMIT  1
  );

  -- Create execution request
  INSERT INTO "execution"."requests" (
    "requester_lenser_id",
    "lens_id",
    "version_id",
    "model_id",
    "input_snapshot",
    "funding_source",
    "byok_key_ref_id",
    "origin_type",
    "runtime_origin"
  ) VALUES (
    v_lenser_id,
    p_lens_id,
    p_version_id,
    p_model_id,
    p_inputs,
    p_funding_source,
    p_byok_key_id,
    'web',
    'cloud'
  )
  RETURNING "id" INTO v_request_id;

  -- Create execution run (queued → picked up by cloud worker)
  INSERT INTO "execution"."runs" (
    "request_id",
    "model_id",
    "status",
    "created_at"
  ) VALUES (
    v_request_id,
    p_model_id,
    'queued',
    now()
  )
  RETURNING "id" INTO v_run_id;

  -- Upsert used parameter values into lenses.version_parameter_contents so the
  -- user's last-used inputs are persisted per (parameter, workspace, lenser).
  -- Skips parameters not present in p_inputs (absent optional params are left as-is).
  IF p_version_id IS NOT NULL AND v_workspace_id IS NOT NULL THEN
    FOR v_param_rec IN
      SELECT "id", "key"
      FROM   "lenses"."version_parameters"
      WHERE  "version_id" = p_version_id
    LOOP
      v_value := p_inputs->>v_param_rec."key";
      CONTINUE WHEN v_value IS NULL;

      INSERT INTO "lenses"."version_parameter_contents" (
        "parameter_id",
        "lenser_id",
        "workspace_id",
        "contents"
      ) VALUES (
        v_param_rec."id",
        v_lenser_id,
        v_workspace_id,
        jsonb_build_object('value', v_value)
      )
      ON CONFLICT ("parameter_id", "workspace_id", "lenser_id")
      DO UPDATE SET
        "contents"   = jsonb_build_object('value', v_value),
        "updated_at" = now();
    END LOOP;
  END IF;

  RETURN v_run_id;
END;
$$;


ALTER FUNCTION "execution"."fn_run_lens"("p_lens_id" "uuid", "p_version_id" "uuid", "p_model_id" "uuid", "p_inputs" "jsonb", "p_funding_source" "text", "p_byok_key_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "execution"."fn_run_lens"("p_lens_id" "uuid", "p_version_id" "uuid", "p_model_id" "uuid", "p_inputs" "jsonb", "p_funding_source" "text", "p_byok_key_id" "uuid") IS 'SECURITY DEFINER: Creates execution.requests (with version_id) and execution.runs atomically. Validates p_inputs against lenses.version_parameters before creating the request — rejects missing required params, type mismatches, and invalid select values. Upserts supplied parameter values into lenses.version_parameter_contents so the user''s last-used inputs are persisted per (parameter, workspace, lenser). Returns the run_id. Caller must be authenticated. Lens must be public or owned by caller.';



CREATE OR REPLACE FUNCTION "execution"."fn_run_lens"("p_lens_id" "uuid", "p_version_id" "uuid", "p_model_id" "uuid", "p_inputs" "jsonb" DEFAULT '{}'::"jsonb", "p_funding_source" "text" DEFAULT 'platform_credit'::"text", "p_byok_key_id" "uuid" DEFAULT NULL::"uuid", "p_workspace_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'execution', 'lenses', 'lensers', 'tenancy', 'public'
    AS $$
DECLARE
  v_lenser_id    uuid := "lensers"."get_auth_lenser_id"();
  v_workspace_id uuid;
  v_request_id   uuid;
  v_run_id       uuid;
  v_param_rec    RECORD;
  v_value        text;
BEGIN
  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Verify the lens exists and is accessible by the caller
  IF NOT EXISTS (
    SELECT 1 FROM "lenses"."lenses" l
    WHERE  l."id" = p_lens_id
      AND  (l."visibility" = 'public' OR l."lenser_id" = v_lenser_id)
  ) THEN
    RAISE EXCEPTION 'Lens % not found or access denied', p_lens_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- Validate inputs against version_parameters schema
  -- (required presence, type compatibility, select enum membership)
  PERFORM "lenses"."fn_validate_inputs"(p_version_id, p_inputs);

  -- Resolve workspace: use provided value or fall back to lenser's personal workspace
  v_workspace_id := COALESCE(p_workspace_id, (
    SELECT "w"."id"
    FROM   "tenancy"."workspaces" w
    WHERE  "w"."owner_lenser_id" = v_lenser_id
      AND  "w"."type"            = 'personal'
      AND  "w"."status"          = 'active'
    ORDER  BY "w"."created_at" ASC
    LIMIT  1
  ));

  -- Create execution request
  INSERT INTO "execution"."requests" (
    "requester_lenser_id",
    "lens_id",
    "version_id",
    "model_id",
    "input_snapshot",
    "funding_source",
    "byok_key_ref_id",
    "workspace_id",
    "origin_type",
    "runtime_origin"
  ) VALUES (
    v_lenser_id,
    p_lens_id,
    p_version_id,
    p_model_id,
    p_inputs,
    p_funding_source,
    p_byok_key_id,
    v_workspace_id,
    'web',
    'cloud'
  )
  RETURNING "id" INTO v_request_id;

  -- Create execution run (queued → picked up by cloud worker)
  INSERT INTO "execution"."runs" (
    "request_id",
    "model_id",
    "status",
    "created_at"
  ) VALUES (
    v_request_id,
    p_model_id,
    'queued',
    now()
  )
  RETURNING "id" INTO v_run_id;

  -- Upsert used parameter values into lenses.version_parameter_contents so the
  -- user's last-used inputs are persisted per (parameter, workspace, lenser).
  -- Skips parameters not present in p_inputs (absent optional params are left as-is).
  IF p_version_id IS NOT NULL AND v_workspace_id IS NOT NULL THEN
    FOR v_param_rec IN
      SELECT "id", "key"
      FROM   "lenses"."version_parameters"
      WHERE  "version_id" = p_version_id
    LOOP
      v_value := p_inputs->>v_param_rec."key";
      CONTINUE WHEN v_value IS NULL;

      INSERT INTO "lenses"."version_parameter_contents" (
        "parameter_id",
        "lenser_id",
        "workspace_id",
        "contents"
      ) VALUES (
        v_param_rec."id",
        v_lenser_id,
        v_workspace_id,
        jsonb_build_object('value', v_value)
      )
      ON CONFLICT ("parameter_id", "workspace_id", "lenser_id")
      DO UPDATE SET
        "contents"   = jsonb_build_object('value', v_value),
        "updated_at" = now();
    END LOOP;
  END IF;

  RETURN v_run_id;
END;
$$;


ALTER FUNCTION "execution"."fn_run_lens"("p_lens_id" "uuid", "p_version_id" "uuid", "p_model_id" "uuid", "p_inputs" "jsonb", "p_funding_source" "text", "p_byok_key_id" "uuid", "p_workspace_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "execution"."fn_run_lens"("p_lens_id" "uuid", "p_version_id" "uuid", "p_model_id" "uuid", "p_inputs" "jsonb", "p_funding_source" "text", "p_byok_key_id" "uuid", "p_workspace_id" "uuid") IS 'SECURITY DEFINER: Creates execution.requests (with version_id + workspace_id) and execution.runs atomically. Validates p_inputs via lenses.fn_validate_inputs. Resolves workspace_id from lenser''s personal workspace when p_workspace_id is NULL. Upserts supplied parameter values into lenses.version_parameter_contents so the user''s last-used inputs are persisted per (parameter, workspace, lenser). Returns the run_id. Caller must be authenticated. Lens must be public or owned by caller. BYOK key usage is logged separately by the cloud worker after run completion.';



CREATE OR REPLACE FUNCTION "execution"."fn_set_artifact_visibility"("p_artifact_id" "uuid", "p_visibility" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'execution', 'lensers', 'public'
    AS $$
DECLARE
  v_caller_id   uuid := "lensers"."get_auth_lenser_id"();
  v_run_status  text;
  v_owner_id    uuid;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Validate visibility value
  IF p_visibility NOT IN ('private', 'public', 'contender_only', 'archived') THEN
    RAISE EXCEPTION 'Invalid visibility value: %', p_visibility
      USING ERRCODE = 'check_violation';
  END IF;

  -- Fetch run status + owner
  SELECT r."status", req."requester_lenser_id"
  INTO   v_run_status, v_owner_id
  FROM   "execution"."artifacts" a
  JOIN   "execution"."runs"     r   ON r."id"  = a."run_id"
  JOIN   "execution"."requests" req ON req."id" = r."request_id"
  WHERE  a."id" = p_artifact_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Artifact % not found', p_artifact_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- Ownership check
  IF v_owner_id <> v_caller_id THEN
    RAISE EXCEPTION 'Permission denied: you do not own this artifact'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Non-succeeded runs can only be set to 'private'
  IF v_run_status <> 'succeeded' AND p_visibility <> 'private' THEN
    RAISE EXCEPTION
      'Artifact from a % run can only be set to private visibility',
      v_run_status
      USING ERRCODE = 'check_violation';
  END IF;

  -- Apply
  UPDATE "execution"."artifacts"
  SET    "visibility" = p_visibility
  WHERE  "id" = p_artifact_id;
END;
$$;


ALTER FUNCTION "execution"."fn_set_artifact_visibility"("p_artifact_id" "uuid", "p_visibility" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "execution"."fn_set_artifact_visibility"("p_artifact_id" "uuid", "p_visibility" "text") IS 'SECURITY DEFINER: allows the artifact creator (owner) to change visibility. Validates: caller owns artifact via run→request→requester_lenser_id; non-succeeded run artifacts can only be private; valid visibility values only. Values: private (default), public (all users), contender_only, archived (owner only).';



CREATE OR REPLACE FUNCTION "execution"."fn_start_execution"("p_lenser_id" "uuid", "p_origin_type" "text", "p_funding_source" "text", "p_model_id" "uuid" DEFAULT NULL::"uuid", "p_lens_id" "uuid" DEFAULT NULL::"uuid", "p_workspace_id" "uuid" DEFAULT NULL::"uuid", "p_byok_key_ref_id" "uuid" DEFAULT NULL::"uuid", "p_input_snapshot" "jsonb" DEFAULT '{}'::"jsonb") RETURNS TABLE("request_id" "uuid", "run_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'execution', 'tenancy', 'public'
    AS $$
DECLARE
    v_request_id   "uuid";
    v_run_id       "uuid";
    v_workspace_id "uuid";
BEGIN
    -- Resolve workspace: caller may pass an explicit workspace_id (e.g. an org
    -- workspace), or NULL in which case we fall back to the lenser's personal
    -- workspace.  If that also doesn't exist the INSERT will error with a clear
    -- FK violation rather than silently using a wrong UUID.
    v_workspace_id := COALESCE(
        p_workspace_id,
        (
            SELECT w.id
            FROM   tenancy.workspaces w
            WHERE  w.owner_lenser_id = p_lenser_id
              AND  w.type            = 'personal'
              AND  w.status          = 'active'
            ORDER  BY w.created_at ASC
            LIMIT  1
        )
    );

    INSERT INTO "execution"."requests" (
        "requester_lenser_id",
        "origin_type",
        "funding_source",
        "model_id",
        "lens_id",
        "workspace_id",
        "byok_key_ref_id",
        "input_snapshot"
    ) VALUES (
        p_lenser_id,
        p_origin_type,
        p_funding_source,
        p_model_id,
        p_lens_id,
        v_workspace_id,
        p_byok_key_ref_id,
        p_input_snapshot
    )
    RETURNING "id" INTO v_request_id;

    INSERT INTO "execution"."runs" (
        "request_id",
        "status",
        "model_id",
        "started_at"
    ) VALUES (
        v_request_id,
        'running',
        p_model_id,
        now()
    )
    RETURNING "id" INTO v_run_id;

    RETURN QUERY SELECT v_request_id, v_run_id;
END;
$$;


ALTER FUNCTION "execution"."fn_start_execution"("p_lenser_id" "uuid", "p_origin_type" "text", "p_funding_source" "text", "p_model_id" "uuid", "p_lens_id" "uuid", "p_workspace_id" "uuid", "p_byok_key_ref_id" "uuid", "p_input_snapshot" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "execution"."fn_start_execution"("p_lenser_id" "uuid", "p_origin_type" "text", "p_funding_source" "text", "p_model_id" "uuid", "p_lens_id" "uuid", "p_workspace_id" "uuid", "p_byok_key_ref_id" "uuid", "p_input_snapshot" "jsonb") IS 'Atomically creates execution.requests + execution.runs before the provider is called. Returns (request_id, run_id). Run is opened with status=running. When p_workspace_id is NULL, auto-resolves the lenser''s personal workspace (same pattern as execution.fn_run_lens). SECURITY DEFINER; callable only by service_role.';



CREATE OR REPLACE FUNCTION "execution"."insert_stream_run"("p_run_id" "uuid", "p_lenser_id" "uuid", "p_model_id" "uuid", "p_provider_key" "text", "p_model_key" "text", "p_input_snapshot" "jsonb", "p_token_input" integer, "p_token_output" integer, "p_credit_cost" bigint, "p_status" "text", "p_error_code" "text" DEFAULT NULL::"text", "p_bytes_sent" integer DEFAULT 0) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'execution', 'public'
    AS $$
DECLARE
    v_request_id uuid;
    v_billing_status text;
BEGIN
    -- Resolve billing_status from credit cost
    v_billing_status := CASE WHEN p_credit_cost > 0 THEN 'charged' ELSE 'free' END;

    -- Insert execution request row
    INSERT INTO execution.requests (
        requester_lenser_id,
        origin_type,
        model_id,
        input_snapshot,
        funding_source,
        runtime_origin
    ) VALUES (
        p_lenser_id,
        'api_stream',
        p_model_id,
        p_input_snapshot,
        'platform_credit',
        'cloud'
    )
    RETURNING id INTO v_request_id;

    -- Insert execution run row (id = p_run_id for idempotency via pending_charges FK)
    INSERT INTO execution.runs (
        id,
        request_id,
        status,
        model_id,
        token_input,
        token_output,
        credit_cost,
        billing_status,
        started_at,
        completed_at
    ) VALUES (
        p_run_id,
        v_request_id,
        p_status,
        p_model_id,
        p_token_input,
        p_token_output,
        p_credit_cost,
        v_billing_status,
        now(),
        CASE WHEN p_status IN ('succeeded', 'failed', 'timed_out') THEN now() ELSE NULL END
    )
    ON CONFLICT (id) DO UPDATE SET
        status          = EXCLUDED.status,
        token_input     = EXCLUDED.token_input,
        token_output    = EXCLUDED.token_output,
        credit_cost     = EXCLUDED.credit_cost,
        billing_status  = EXCLUDED.billing_status,
        completed_at    = EXCLUDED.completed_at;

    -- Upsert stream session
    INSERT INTO execution.stream_sessions (
        run_id,
        lenser_id,
        provider,
        model_key,
        status,
        token_input,
        token_output,
        credit_cost,
        error_code,
        bytes_sent,
        completed_at
    ) VALUES (
        p_run_id,
        p_lenser_id,
        p_provider_key,
        p_model_key,
        CASE p_status
            WHEN 'succeeded' THEN 'completed'
            WHEN 'failed'    THEN 'failed'
            WHEN 'timed_out' THEN 'timed_out'
            ELSE p_status
        END,
        p_token_input,
        p_token_output,
        p_credit_cost,
        p_error_code,
        p_bytes_sent,
        CASE WHEN p_status IN ('succeeded', 'failed', 'timed_out') THEN now() ELSE NULL END
    )
    ON CONFLICT (run_id) DO UPDATE SET
        status       = EXCLUDED.status,
        token_input  = EXCLUDED.token_input,
        token_output = EXCLUDED.token_output,
        credit_cost  = EXCLUDED.credit_cost,
        error_code   = EXCLUDED.error_code,
        bytes_sent   = EXCLUDED.bytes_sent,
        completed_at = EXCLUDED.completed_at;
END;
$$;


ALTER FUNCTION "execution"."insert_stream_run"("p_run_id" "uuid", "p_lenser_id" "uuid", "p_model_id" "uuid", "p_provider_key" "text", "p_model_key" "text", "p_input_snapshot" "jsonb", "p_token_input" integer, "p_token_output" integer, "p_credit_cost" bigint, "p_status" "text", "p_error_code" "text", "p_bytes_sent" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "execution"."insert_stream_run"("p_run_id" "uuid", "p_lenser_id" "uuid", "p_model_id" "uuid", "p_provider_key" "text", "p_model_key" "text", "p_input_snapshot" "jsonb", "p_token_input" integer, "p_token_output" integer, "p_credit_cost" bigint, "p_status" "text", "p_error_code" "text", "p_bytes_sent" integer) IS 'Atomically records a streaming AI execution run across execution.requests, execution.runs, and execution.stream_sessions. Called by the Cloudflare Worker after stream completion or failure.';



CREATE OR REPLACE FUNCTION "execution"."trg_runs_set_completed_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'execution'
    AS $$
BEGIN
    IF NEW.status IN ('succeeded', 'failed', 'canceled', 'timed_out')
       AND OLD.status NOT IN ('succeeded', 'failed', 'canceled', 'timed_out')
       AND NEW.completed_at IS NULL THEN
        NEW.completed_at := NOW();
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "execution"."trg_runs_set_completed_at"() OWNER TO "postgres";


ALTER FUNCTION "lensers"."anonymize_join_log"() OWNER TO "postgres";


ALTER FUNCTION "lensers"."assign_country_join_order"("p_lenser_id" "uuid", "p_country_code" "text") OWNER TO "postgres";


ALTER FUNCTION "lensers"."auto_award_badges_from_join_order"("p_lenser_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lensers"."auto_award_badges_from_level"("p_lenser_id" "uuid", "p_app_id" "uuid", "p_old_level" integer, "p_new_level" integer, "p_event_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'analytics'
    AS $$
BEGIN
  IF p_old_level < 5 AND p_new_level >= 5 THEN
    PERFORM award_badge(p_lenser_id, 'LEVEL_5',
      'Level 5 Achieved', 'Reached Level 5', NULL, p_event_id);
  END IF;

  IF p_old_level < 10 AND p_new_level >= 10 THEN
    PERFORM award_badge(p_lenser_id, 'LEVEL_10',
      'Level 10 Achieved', 'Reached Level 10', NULL, p_event_id);
  END IF;

  IF p_old_level < 20 AND p_new_level >= 20 THEN
    PERFORM award_badge(p_lenser_id, 'LEVEL_20',
      'Level 20 Achieved', 'Reached Level 20', NULL, p_event_id);
  END IF;

  IF p_old_level < 30 AND p_new_level >= 30 THEN
    PERFORM award_badge(p_lenser_id, 'LEVEL_30',
      'Level 30 Achieved', 'Reached Level 30', NULL, p_event_id);
  END IF;
END;
$$;


ALTER FUNCTION "lensers"."auto_award_badges_from_level"("p_lenser_id" "uuid", "p_app_id" "uuid", "p_old_level" integer, "p_new_level" integer, "p_event_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lensers"."auto_award_badges_from_streak"("p_lenser_id" "uuid", "p_streak" integer, "p_event_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'analytics'
    AS $$
BEGIN
  IF p_streak = 7 THEN
    PERFORM award_badge(p_lenser_id, 'STREAK_7',
      '7-Day Streak', 'Maintained a 7-day XP streak', NULL, p_event_id);
  END IF;

  IF p_streak = 30 THEN
    PERFORM award_badge(p_lenser_id, 'STREAK_30',
      '30-Day Streak', 'Maintained a 30-day XP streak', NULL, p_event_id);
  END IF;

  IF p_streak = 100 THEN
    PERFORM award_badge(p_lenser_id, 'STREAK_100',
      '100-Day Streak', 'Maintained a 100-day XP streak', NULL, p_event_id);
  END IF;
END;
$$;


ALTER FUNCTION "lensers"."auto_award_badges_from_streak"("p_lenser_id" "uuid", "p_streak" integer, "p_event_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lensers"."award_badge"("p_lenser_id" "uuid", "p_type" "lensers"."lenser_badge_type", "p_label" "text", "p_description" "text" DEFAULT NULL::"text", "p_icon" "text" DEFAULT NULL::"text", "p_xp_event_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'analytics'
    AS $$BEGIN
  -- If badge already exists, skip (no duplicates)
  IF EXISTS (
    SELECT 1 FROM lensers.badges
    WHERE lenser_id = p_lenser_id
      AND type = p_type
  ) THEN
    RETURN;
  END IF;

  INSERT INTO lensers.badges (
    lenser_id, type, category, label, description, icon, xp_event_id
  )
  VALUES (
    p_lenser_id,
    p_type,
    'achievement',
    p_label,
    p_description,
    p_icon,
    p_xp_event_id
  );
END;$$;


ALTER FUNCTION "lensers"."award_badge"("p_lenser_id" "uuid", "p_type" "lensers"."lenser_badge_type", "p_label" "text", "p_description" "text", "p_icon" "text", "p_xp_event_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lensers"."build_author_profile"("p_lenser_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'lensers', 'content', 'xp', 'public', 'auth'
    AS $$DECLARE
    l_record record;
BEGIN
    SELECT handle, display_name, avatar_url
    INTO l_record
    FROM lensers.profiles
    WHERE id = p_lenser_id;

    RETURN jsonb_build_object(
        'handle', l_record.handle,
        'display_name', l_record.display_name,
        'avatar_url', l_record.avatar_url
    );
END;$$;


ALTER FUNCTION "lensers"."build_author_profile"("p_lenser_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lensers"."current_active_lenser_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'lensers', 'public', 'auth'
    AS $$SELECT id
  FROM lensers.profiles
  WHERE user_id = auth.uid()
    AND status = 'active'
  LIMIT 1;$$;


ALTER FUNCTION "lensers"."current_active_lenser_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lensers"."delete_expired_lensers"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'lenses', 'analytics', 'content'
    AS $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT id
    FROM lensers.profiles
    WHERE deletion_requested_at IS NOT NULL
      AND deletion_requested_at <= now() - INTERVAL '5 minutes'
  LOOP
    DELETE FROM content.reactions   WHERE lenser_id = rec.id;
    DELETE FROM content.thread_replies WHERE lenser_id = rec.id;
    DELETE FROM content.threads     WHERE lenser_id = rec.id;
    DELETE FROM lenses.lenses       WHERE lenser_id = rec.id;
    DELETE FROM lensers.social_links WHERE lenser_id = rec.id;
    DELETE FROM lensers.profiles    WHERE id = rec.id;
  END LOOP;
END;
$$;


ALTER FUNCTION "lensers"."delete_expired_lensers"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lensers"."enforce_lensers_protections"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'lensers', 'public', 'auth'
    AS $$
DECLARE
  v_role text := current_setting('request.jwt.claim.role', true);
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Client insert'lerinde user_id zorunlu olarak auth.uid()
    IF v_role <> 'service_role' THEN
      IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Only authenticated users can create a Lenser profile.';
      END IF;

      NEW.user_id := auth.uid();
      NEW.created_at := now();
      NEW.updated_at := now();
      NEW.handle := lower(NEW.handle);
      NEW.last_handle_changed_at := now();
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF v_role <> 'service_role' THEN
      -- user_id, created_at, engagement, status user tarafından değiştirilemez
      NEW.user_id := OLD.user_id;
      NEW.created_at := OLD.created_at;
      NEW.engagement := OLD.engagement;
      NEW.status := OLD.status;

      -- handle değişiyorsa 14 gün kuralı
      IF NEW.handle IS DISTINCT FROM OLD.handle THEN
        IF (now() - COALESCE(OLD.last_handle_changed_at, OLD.created_at)) < interval '14 days' THEN
          RAISE EXCEPTION 'Handle can only be changed once every 14 days.';
        END IF;

        NEW.handle := lower(NEW.handle);
        NEW.last_handle_changed_at := now();
      END IF;

      -- deletion_requested_at sadece ileriye dönük set edilebilir, geriye alınamaz
      IF NEW.deletion_requested_at IS DISTINCT FROM OLD.deletion_requested_at THEN
        IF OLD.deletion_requested_at IS NOT NULL THEN
          RAISE EXCEPTION 'Deletion request cannot be reverted or modified by the user.';
        END IF;
        NEW.deletion_requested_at := now();
      END IF;
    END IF;

    -- updated_at her zaman now()
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "lensers"."enforce_lensers_protections"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lensers"."fn_can_view_profile"("p_viewer_auth_uid" "uuid", "p_subject_profile_id" "uuid") RETURNS "lensers"."profile_access_level"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'lensers', 'public', 'auth'
    AS $$
DECLARE
  v_subject RECORD;
  v_viewer_profile_id uuid;
  v_is_owner boolean := false;
  v_rel_state jsonb;
  v_is_blocked boolean;
  v_viewer_to_subject text;
BEGIN
  -- Fetch subject profile
  SELECT p.id, p.user_id, p.status, p.visibility, p.deletion_requested_at
  INTO v_subject
  FROM lensers.profiles p
  WHERE p.id = p_subject_profile_id;

  IF NOT FOUND THEN
    RETURN 'UNAVAILABLE_PROFILE'::lensers.profile_access_level;
  END IF;

  -- Deleted accounts → always unavailable
  IF v_subject.status = 'deleted' THEN
    RETURN 'UNAVAILABLE_PROFILE'::lensers.profile_access_level;
  END IF;

  -- Check ownership
  IF p_viewer_auth_uid IS NOT NULL AND v_subject.user_id = p_viewer_auth_uid THEN
    v_is_owner := true;
  END IF;

  -- Deactivated / pending_deletion
  IF v_subject.status IN ('deactivated', 'pending_deletion') THEN
    IF v_is_owner THEN
      RETURN 'OWNER_RECOVERY_PROFILE'::lensers.profile_access_level;
    ELSE
      RETURN 'UNAVAILABLE_PROFILE'::lensers.profile_access_level;
    END IF;
  END IF;

  -- Suspended
  IF v_subject.status = 'suspended' THEN
    RETURN 'UNAVAILABLE_PROFILE'::lensers.profile_access_level;
  END IF;

  -- Get viewer profile id
  IF p_viewer_auth_uid IS NOT NULL AND NOT v_is_owner THEN
    SELECT p.id INTO v_viewer_profile_id
    FROM lensers.profiles p
    WHERE p.user_id = p_viewer_auth_uid;
  END IF;

  -- Check block status
  IF v_viewer_profile_id IS NOT NULL THEN
    v_rel_state := lensers.fn_relationship_state(v_viewer_profile_id, v_subject.id);
    v_is_blocked := (v_rel_state->>'is_blocked')::boolean;

    IF v_is_blocked THEN
      RETURN 'UNAVAILABLE_PROFILE'::lensers.profile_access_level;
    END IF;
  END IF;

  -- Public / community → full access
  IF v_subject.visibility IN ('public', 'community') THEN
    RETURN 'FULL_PROFILE'::lensers.profile_access_level;
  END IF;

  -- Private profile logic
  IF v_subject.visibility = 'private' THEN
    IF v_is_owner THEN
      RETURN 'FULL_PROFILE'::lensers.profile_access_level;
    END IF;

    -- Check accepted follow relationship
    IF v_viewer_profile_id IS NOT NULL THEN
      v_viewer_to_subject := v_rel_state->>'viewer_to_subject';
      IF v_viewer_to_subject = 'accepted' THEN
        RETURN 'FULL_PROFILE'::lensers.profile_access_level;
      END IF;
    END IF;

    RETURN 'RESTRICTED_PROFILE'::lensers.profile_access_level;
  END IF;

  -- Fallback
  RETURN 'FULL_PROFILE'::lensers.profile_access_level;
END;
$$;


ALTER FUNCTION "lensers"."fn_can_view_profile"("p_viewer_auth_uid" "uuid", "p_subject_profile_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lensers"."fn_create_default_preferences"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lensers', 'public'
    AS $$
BEGIN
    INSERT INTO lensers.preferences (lenser_id)
    VALUES (NEW.id)
    ON CONFLICT (lenser_id) DO NOTHING;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "lensers"."fn_create_default_preferences"() OWNER TO "postgres";


COMMENT ON FUNCTION "lensers"."fn_create_default_preferences"() IS 'Trigger function: creates a default preferences row for every new lenser profile. SECURITY DEFINER to bypass RLS on insert.';



CREATE OR REPLACE FUNCTION "lensers"."fn_prevent_preferences_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lensers', 'public'
    AS $$
BEGIN
    -- Allow deletion only when the parent profile is already gone (cascade path).
    -- If the profile still exists, the caller is trying to delete preferences directly.
    IF EXISTS (SELECT 1 FROM lensers.profiles WHERE id = OLD.lenser_id) THEN
        RAISE EXCEPTION
            'Cannot delete lensers.preferences directly for lenser %. '
            'Delete the lensers.profiles row instead — preferences will cascade.',
            OLD.lenser_id
        USING ERRCODE = 'P0001';
    END IF;
    RETURN OLD;
END;
$$;


ALTER FUNCTION "lensers"."fn_prevent_preferences_delete"() OWNER TO "postgres";


COMMENT ON FUNCTION "lensers"."fn_prevent_preferences_delete"() IS 'BEFORE DELETE guard on lensers.preferences. Blocks direct deletion when the parent profile still exists. Cascade deletes from lensers.profiles are still allowed (profile gone before trigger checks).';



CREATE OR REPLACE FUNCTION "lensers"."fn_prevent_self_relationship"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'lensers'
    AS $$
BEGIN
    IF NEW.source_profile_id = NEW.target_profile_id THEN
        RAISE EXCEPTION 'A lenser cannot follow themselves'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "lensers"."fn_prevent_self_relationship"() OWNER TO "postgres";


COMMENT ON FUNCTION "lensers"."fn_prevent_self_relationship"() IS 'BEFORE trigger guard: rejects any INSERT or UPDATE that would create a self-referential relationship (source_profile_id = target_profile_id). Raises SQLSTATE 23514 (check_violation) for consistent client handling. Belt-and-suspenders alongside the chk_no_self_rel CHECK constraint. Added in migration 000056.';



CREATE OR REPLACE FUNCTION "lensers"."fn_relationship_state"("p_viewer_id" "uuid", "p_subject_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'lensers', 'public'
    AS $$
DECLARE
  v_viewer_to_subject lensers.relationship_status;
  v_subject_to_viewer lensers.relationship_status;
  v_is_mutual boolean := false;
  v_is_blocked boolean := false;
  v_is_close_circle boolean := false;
BEGIN
  IF p_viewer_id IS NULL OR p_subject_id IS NULL OR p_viewer_id = p_subject_id THEN
    RETURN jsonb_build_object(
      'viewer_to_subject', null,
      'subject_to_viewer', null,
      'is_mutual', false,
      'is_blocked', false,
      'is_close_circle', false
    );
  END IF;

  SELECT r.status, r.is_close_circle INTO v_viewer_to_subject, v_is_close_circle
  FROM lensers.relationships r
  WHERE r.source_profile_id = p_viewer_id AND r.target_profile_id = p_subject_id
    AND r.status IN ('pending', 'accepted', 'blocked');

  SELECT r.status INTO v_subject_to_viewer
  FROM lensers.relationships r
  WHERE r.source_profile_id = p_subject_id AND r.target_profile_id = p_viewer_id
    AND r.status IN ('pending', 'accepted', 'blocked');

  v_is_blocked := (v_viewer_to_subject = 'blocked') OR (v_subject_to_viewer = 'blocked');
  v_is_mutual := (v_viewer_to_subject = 'accepted') AND (v_subject_to_viewer = 'accepted');

  RETURN jsonb_build_object(
    'viewer_to_subject', v_viewer_to_subject,
    'subject_to_viewer', v_subject_to_viewer,
    'is_mutual', v_is_mutual,
    'is_blocked', v_is_blocked,
    'is_close_circle', v_is_close_circle
  );
END;
$$;


ALTER FUNCTION "lensers"."fn_relationship_state"("p_viewer_id" "uuid", "p_subject_id" "uuid") OWNER TO "postgres";


ALTER FUNCTION "lensers"."fn_sync_relationship_counts"() OWNER TO "postgres";


ALTER FUNCTION "lensers"."init_lenser_engagement_row"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lensers"."is_active_lenser"("p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'lensers', 'public', 'auth'
    AS $$SELECT EXISTS (
    SELECT 1
    FROM lensers.profiles
    WHERE user_id = p_user_id
      AND status = 'active'
      AND deletion_requested_at IS NULL
  );$$;


ALTER FUNCTION "lensers"."is_active_lenser"("p_user_id" "uuid") OWNER TO "postgres";


ALTER FUNCTION "lensers"."log_account_lifecycle_event"("p_profile_id" "uuid", "p_user_id" "uuid", "p_event_type" "text", "p_from_status" "lensers"."lenser_status", "p_to_status" "lensers"."lenser_status", "p_actor_source" "text", "p_metadata" "jsonb") OWNER TO "postgres";


ALTER FUNCTION "lensers"."log_lenser_join"() OWNER TO "postgres";


ALTER FUNCTION "lensers"."prevent_lenser_join_log_delete"() OWNER TO "postgres";


ALTER FUNCTION "lensers"."prevent_lenser_join_log_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lensers"."protect_sensitive_lenser_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'lensers', 'public', 'auth'
    AS $$
DECLARE
  jwt_role text := current_setting('request.jwt.claim.role', true);
BEGIN
  -- Service role dışındaysa kritik alanları değiştirmeyi engelle
  IF jwt_role IS DISTINCT FROM 'service_role' THEN

    -- handle değişikliği
    IF NEW.handle IS DISTINCT FROM OLD.handle THEN
      RAISE EXCEPTION 'handle can only be modified by service_role';
    END IF;

  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "lensers"."protect_sensitive_lenser_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lensers"."sync_join_order"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'lensers', 'public'
    AS $$BEGIN
  UPDATE lensers.profiles
  SET join_order = NEW.join_order
  WHERE id = NEW.lenser_id;
  RETURN NEW;
END;$$;


ALTER FUNCTION "lensers"."sync_join_order"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lensers"."sync_profile_from_auth_metadata"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lensers', 'public', 'auth'
    AS $$
BEGIN
  RETURN NEW;
END;
$$;


ALTER FUNCTION "lensers"."sync_profile_from_auth_metadata"() OWNER TO "postgres";


ALTER FUNCTION "lensers"."trg_audit_group_membership"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lensers"."trg_award_founder_badges"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'analytics'
    AS $$
BEGIN
  -- Fix: reference correctly to lensers. schema
  PERFORM lensers.auto_award_badges_from_join_order(NEW.lenser_id);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "lensers"."trg_award_founder_badges"() OWNER TO "postgres";


ALTER FUNCTION "lensers"."trg_create_join_log"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lensers"."trg_handle_deletion_request"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'analytics'
    AS $$
BEGIN
  -- First deletion request: force the timestamp and immediately deactivate the profile.
  IF NEW.deletion_requested_at IS NOT NULL AND OLD.deletion_requested_at IS NULL THEN
    NEW.status := 'deactivated';
    NEW.deletion_requested_at := now();
    RETURN NEW;
  END IF;

  -- Restoration path: allow lifecycle RPCs to clear the deletion markers.
  IF OLD.deletion_requested_at IS NOT NULL
     AND NEW.deletion_requested_at IS NULL THEN
    RETURN NEW;
  END IF;

  -- Any other mutation of an existing deletion request timestamp remains invalid.
  IF OLD.deletion_requested_at IS NOT NULL
     AND NEW.deletion_requested_at IS DISTINCT FROM OLD.deletion_requested_at THEN
    RAISE EXCEPTION 'Deletion request can only be set once.';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "lensers"."trg_handle_deletion_request"() OWNER TO "postgres";


ALTER FUNCTION "lensers"."trg_log_lenser_activity"() OWNER TO "postgres";


ALTER FUNCTION "lensers"."trg_log_login_from_auth"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lensers"."trg_update_lenser_last_login"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$BEGIN
  -- Only act when real login occurs
  IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
    UPDATE lensers.profiles
    SET last_login_at = NEW.last_sign_in_at
    WHERE user_id = NEW.id;
  END IF;

  RETURN NEW;
END;$$;


ALTER FUNCTION "lensers"."trg_update_lenser_last_login"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lensers"."user_owns_lenser"("lenser_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'lensers', 'public', 'auth'
    AS $$select exists (
    select 1 from lensers.profiles l
    where l.id = lenser_id
      and l.user_id = auth.uid()
  );$$;


ALTER FUNCTION "lensers"."user_owns_lenser"("lenser_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lenses"."ensure_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'lenses'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "lenses"."ensure_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lenses"."fn_check_dag_acyclic"("p_workflow_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'lenses'
    AS $$
DECLARE
  v_node_id      uuid;
  v_stack        uuid[];
  v_visited      uuid[];
  v_rec_stack    uuid[];
  v_has_cycle    boolean := false;
  v_adj          record;
  v_current      uuid;
  v_dfs_stack    uuid[];
  v_dfs_parent   uuid[];
BEGIN
  -- Collect all unique node IDs involved in edges for this workflow
  -- Use iterative DFS to avoid stack overflow on deep graphs

  FOR v_node_id IN
    SELECT DISTINCT unnest(ARRAY[source_node_id, target_node_id])
    FROM lenses.workflow_edges
    WHERE workflow_id = p_workflow_id
  LOOP
    -- Skip already fully visited nodes
    IF v_node_id = ANY(v_visited) THEN
      CONTINUE;
    END IF;

    -- Iterative DFS using explicit stack
    v_dfs_stack := ARRAY[v_node_id];
    v_rec_stack := ARRAY[]::uuid[];

    WHILE array_length(v_dfs_stack, 1) > 0 LOOP
      v_current := v_dfs_stack[array_length(v_dfs_stack, 1)];
      v_dfs_stack := v_dfs_stack[1:array_length(v_dfs_stack, 1) - 1];

      -- If current is a sentinel (NULL-marked pop), remove from rec_stack
      IF v_current IS NULL THEN
        IF array_length(v_dfs_stack, 1) > 0 THEN
          v_current := v_dfs_stack[array_length(v_dfs_stack, 1)];
          v_dfs_stack := v_dfs_stack[1:array_length(v_dfs_stack, 1) - 1];
          v_rec_stack := array_remove(v_rec_stack, v_current);
        END IF;
        CONTINUE;
      END IF;

      IF v_current = ANY(v_rec_stack) THEN
        -- Back edge found → cycle
        RETURN false;
      END IF;

      IF v_current = ANY(v_visited) THEN
        CONTINUE;
      END IF;

      v_visited := array_append(v_visited, v_current);
      v_rec_stack := array_append(v_rec_stack, v_current);

      -- Push sentinel to pop from rec_stack when backtracking
      v_dfs_stack := array_append(v_dfs_stack, v_current);
      v_dfs_stack := array_append(v_dfs_stack, NULL::uuid);

      -- Push all neighbors
      FOR v_adj IN
        SELECT target_node_id
        FROM lenses.workflow_edges
        WHERE workflow_id = p_workflow_id
          AND source_node_id = v_current
      LOOP
        IF v_adj.target_node_id = ANY(v_rec_stack) THEN
          RETURN false;  -- Cycle detected
        END IF;
        IF NOT (v_adj.target_node_id = ANY(v_visited)) THEN
          v_dfs_stack := array_append(v_dfs_stack, v_adj.target_node_id);
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;

  RETURN true;  -- No cycles found
END;
$$;


ALTER FUNCTION "lenses"."fn_check_dag_acyclic"("p_workflow_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lenses"."fn_check_dag_acyclic_kahn"("p_workflow_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'lenses'
    AS $$
DECLARE
  v_total_nodes  integer;
  v_processed    integer := 0;
  v_queue        uuid[];
  v_current      uuid;
  v_qi           integer := 1;
  v_in_degree    record;
BEGIN
  -- Count distinct nodes
  SELECT count(DISTINCT node_id) INTO v_total_nodes
  FROM (
    SELECT source_node_id AS node_id FROM lenses.workflow_edges WHERE workflow_id = p_workflow_id
    UNION
    SELECT target_node_id AS node_id FROM lenses.workflow_edges WHERE workflow_id = p_workflow_id
  ) nodes;

  IF v_total_nodes = 0 THEN
    RETURN true;  -- Empty graph is acyclic
  END IF;

  -- Build in-degree and find roots (in_degree = 0)
  -- Nodes that only appear as source (never as target) have in_degree = 0
  WITH all_nodes AS (
    SELECT DISTINCT node_id FROM (
      SELECT source_node_id AS node_id FROM lenses.workflow_edges WHERE workflow_id = p_workflow_id
      UNION
      SELECT target_node_id AS node_id FROM lenses.workflow_edges WHERE workflow_id = p_workflow_id
    ) n
  ),
  in_degrees AS (
    SELECT an.node_id, coalesce(cnt.c, 0) AS deg
    FROM all_nodes an
    LEFT JOIN (
      SELECT target_node_id, count(*) AS c
      FROM lenses.workflow_edges
      WHERE workflow_id = p_workflow_id
      GROUP BY target_node_id
    ) cnt ON cnt.target_node_id = an.node_id
  )
  SELECT array_agg(node_id) INTO v_queue
  FROM in_degrees
  WHERE deg = 0;

  IF v_queue IS NULL THEN
    RETURN false;  -- All nodes have incoming edges → cycle
  END IF;

  -- Process queue (Kahn's)
  WHILE v_qi <= array_length(v_queue, 1) LOOP
    v_current := v_queue[v_qi];
    v_qi := v_qi + 1;
    v_processed := v_processed + 1;

    -- For each neighbor of current, decrement in-degree conceptually
    -- by checking if all predecessors have been processed
    FOR v_in_degree IN
      SELECT DISTINCT e.target_node_id
      FROM lenses.workflow_edges e
      WHERE e.workflow_id = p_workflow_id
        AND e.source_node_id = v_current
    LOOP
      -- Check if all incoming edges to this target come from already-processed nodes
      IF NOT EXISTS (
        SELECT 1
        FROM lenses.workflow_edges e2
        WHERE e2.workflow_id = p_workflow_id
          AND e2.target_node_id = v_in_degree.target_node_id
          AND e2.source_node_id <> ALL(v_queue[1:v_qi-1])
      ) THEN
        v_queue := array_append(v_queue, v_in_degree.target_node_id);
      END IF;
    END LOOP;
  END LOOP;

  RETURN v_processed = v_total_nodes;
END;
$$;


ALTER FUNCTION "lenses"."fn_check_dag_acyclic_kahn"("p_workflow_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lenses"."fn_check_workflow_budget"("p_run_id" "uuid", "p_estimated_cost" integer) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses'
    AS $$
DECLARE
  v_budget   integer;
  v_spent    integer;
BEGIN
  -- Lock the run row to prevent concurrent budget checks racing
  PERFORM pg_advisory_xact_lock(hashtext(p_run_id::text));

  SELECT budget_credits, spent_credits
  INTO v_budget, v_spent
  FROM lenses.workflow_runs
  WHERE id = p_run_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- NULL budget = unlimited
  IF v_budget IS NULL THEN
    RETURN true;
  END IF;

  RETURN (v_spent + p_estimated_cost) <= v_budget;
END;
$$;


ALTER FUNCTION "lenses"."fn_check_workflow_budget"("p_run_id" "uuid", "p_estimated_cost" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lenses"."fn_clone_lens"("p_source_lens_id" "uuid", "p_version_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'content', 'lensers', 'public'
    AS $$
DECLARE
  v_caller_id       uuid;
  v_src_vis         content.visibility_enum;
  v_src_status      content.content_status;
  v_template        text;
  v_title           text;
  v_description     text;
  v_language        text;
  v_resolved_ver_id uuid;
  v_new_lens_id     uuid;
  v_new_version     lenses.versions;
BEGIN
  -- Auth check
  v_caller_id := lensers.get_auth_lenser_id();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Fork cooldown: max one fork per 5 minutes per user
  IF EXISTS (
    SELECT 1 FROM lenses.lenses
    WHERE lenser_id = v_caller_id
      AND parent_lens_id IS NOT NULL
      AND created_at > NOW() - INTERVAL '5 minutes'
  ) THEN
    RAISE EXCEPTION 'rate_limit_exceeded'
      USING DETAIL = 'You can only fork a lens once every 5 minutes.',
            ERRCODE = 'P0429';
  END IF;

  -- Source lens must be public + published
  SELECT l.visibility, l.status
    INTO v_src_vis, v_src_status
    FROM lenses.lenses l
   WHERE l.id = p_source_lens_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source lens % not found', p_source_lens_id
      USING ERRCODE = 'no_data_found';
  END IF;

  IF v_src_vis <> 'public'::"content"."visibility_enum"
     OR v_src_status <> 'published'::"content"."content_status" THEN
    RAISE EXCEPTION 'Cannot clone: source lens must be public and published'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Resolve template_body + version id from specific published version or latest published
  IF p_version_id IS NOT NULL THEN
    SELECT v.id, v.template_body
      INTO v_resolved_ver_id, v_template
      FROM lenses.versions v
     WHERE v.id      = p_version_id
       AND v.lens_id = p_source_lens_id
       AND v.status  = 'published'::"content"."content_status";

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Published version % not found for lens %',
        p_version_id, p_source_lens_id
        USING ERRCODE = 'no_data_found';
    END IF;
  ELSE
    SELECT v.id, v.template_body
      INTO v_resolved_ver_id, v_template
      FROM lenses.versions v
     WHERE v.lens_id = p_source_lens_id
       AND v.status  = 'published'::"content"."content_status"
     ORDER BY v.version_number DESC
     LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No published version found for lens %', p_source_lens_id
        USING ERRCODE = 'no_data_found';
    END IF;
  END IF;

  -- Resolve original translation
  SELECT t.title, t.description, t.language_code
    INTO v_title, v_description, v_language
    FROM content.entity_translations t
   WHERE t.entity_id   = p_source_lens_id
     AND t.entity_type = 'lens'::"content"."entity_type_enum"
     AND t.is_original = true
   LIMIT 1;

  -- Create the new (cloned) lens record — record which version it was forked from
  INSERT INTO lenses.lenses (
    lenser_id, visibility, status,
    parent_lens_id, forked_from_version_id
  ) VALUES (
    v_caller_id,
    'private'::"content"."visibility_enum",
    'published'::"content"."content_status",
    p_source_lens_id,
    v_resolved_ver_id
  )
  RETURNING id INTO v_new_lens_id;

  -- Create initial draft version via upsert (brand-new lens has no prior versions)
  v_new_version := lenses.fn_upsert_draft_version(
    v_new_lens_id,
    v_template,
    'Cloned from ' || coalesce(v_title, 'Untitled')
  );

  -- Set HEAD
  UPDATE lenses.lenses
     SET head_version_id = v_new_version.id
   WHERE id = v_new_lens_id;

  -- Clone version_parameters from source version → new version
  INSERT INTO lenses.version_parameters (
    version_id,
    key, label, type, required,
    default_value, placeholder, help_text,
    validation_schema, options, sort_order
  )
  SELECT
    v_new_version.id,
    vp.key, vp.label, vp.type, vp.required,
    vp.default_value, vp.placeholder, vp.help_text,
    vp.validation_schema, vp.options, vp.sort_order
  FROM lenses.version_parameters vp
  WHERE vp.version_id = v_resolved_ver_id;

  -- Clone steps (version-specific + global)
  INSERT INTO lenses.steps (
    lens_id, version_id,
    ordinal, step_type, instruction,
    model_id, input_map, output_key, sub_lens_id
  )
  SELECT
    v_new_lens_id,
    v_new_version.id,
    s.ordinal, s.step_type, s.instruction,
    s.model_id, s.input_map, s.output_key, s.sub_lens_id
  FROM lenses.steps s
  WHERE s.lens_id = p_source_lens_id
    AND (
      p_version_id IS NULL
      OR s.version_id = p_version_id
      OR s.version_id IS NULL
    );

  -- Copy translation with "Fork of" prefix
  INSERT INTO content.entity_translations (
    entity_type, entity_id, language_code, is_original,
    title, description, content
  ) VALUES (
    'lens'::"content"."entity_type_enum",
    v_new_lens_id,
    coalesce(v_language, 'en'),
    true,
    'Fork of ' || coalesce(v_title, 'Untitled'),
    v_description,
    v_template
  );

  -- Copy tag associations
  INSERT INTO content.tag_map (entity_type, entity_id, tag_id)
  SELECT
    'lens'::"content"."entity_type_enum",
    v_new_lens_id,
    tm.tag_id
  FROM content.tag_map tm
  WHERE tm.entity_type = 'lens'::"content"."entity_type_enum"
    AND tm.entity_id   = p_source_lens_id;

  RETURN v_new_lens_id;
END;
$$;


ALTER FUNCTION "lenses"."fn_clone_lens"("p_source_lens_id" "uuid", "p_version_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "lenses"."fn_clone_lens"("p_source_lens_id" "uuid", "p_version_id" "uuid") IS 'Forks a public published lens into a private draft clone owned by the caller.
   Sets head_version_id and forked_from_version_id (the specific version cloned).
   Clones: version_parameters, steps (version-specific + global), translation
   (''Fork of'' prefix), and tag associations. SECURITY DEFINER: ownership and
   visibility checked internally.';



CREATE OR REPLACE FUNCTION "lenses"."fn_clone_workflow"("p_source_workflow_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'lensers', 'public'
    AS $$
DECLARE
  v_caller_id       uuid;
  v_src             record;
  v_new_workflow_id uuid;
  v_node_map        jsonb := '{}';
  v_old_node        record;
  v_new_node_id     uuid;
BEGIN
  v_caller_id := lensers.get_auth_lenser_id();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Fork cooldown: max one fork per 5 minutes per user
  IF EXISTS (
    SELECT 1 FROM lenses.workflows
    WHERE lenser_id = v_caller_id
      AND parent_workflow_id IS NOT NULL
      AND created_at > NOW() - INTERVAL '5 minutes'
  ) THEN
    RAISE EXCEPTION 'rate_limit_exceeded'
      USING DETAIL = 'You can only fork a workflow once every 5 minutes.',
            ERRCODE = 'P0429';
  END IF;

  -- Source must be public
  SELECT id, title, description, visibility
  INTO v_src
  FROM lenses.workflows
  WHERE id = p_source_workflow_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Workflow not found'
      USING ERRCODE = 'no_data_found';
  END IF;

  IF v_src.visibility <> 'public' THEN
    RAISE EXCEPTION 'Cannot fork: workflow must be public'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Create forked workflow
  INSERT INTO lenses.workflows (lenser_id, title, description, visibility, parent_workflow_id)
  VALUES (v_caller_id, 'Fork of ' || v_src.title, v_src.description, 'private', p_source_workflow_id)
  RETURNING id INTO v_new_workflow_id;

  -- Update fork count on source
  UPDATE lenses.workflows
  SET fork_count = fork_count + 1
  WHERE id = p_source_workflow_id;

  -- Copy nodes (remap IDs)
  FOR v_old_node IN
    SELECT id, lens_id, version_id, position_x, position_y, label, ordinal, config
    FROM lenses.workflow_nodes
    WHERE workflow_id = p_source_workflow_id
    ORDER BY ordinal
  LOOP
    v_new_node_id := gen_random_uuid();
    INSERT INTO lenses.workflow_nodes (id, workflow_id, lens_id, version_id, position_x, position_y, label, ordinal, config)
    VALUES (v_new_node_id, v_new_workflow_id, v_old_node.lens_id, v_old_node.version_id,
            v_old_node.position_x, v_old_node.position_y, v_old_node.label, v_old_node.ordinal, v_old_node.config);
    v_node_map := v_node_map || jsonb_build_object(v_old_node.id::text, v_new_node_id::text);
  END LOOP;

  -- Copy edges (remap node IDs)
  INSERT INTO lenses.workflow_edges (workflow_id, source_node_id, target_node_id, source_output_key, target_param_label)
  SELECT
    v_new_workflow_id,
    (v_node_map ->> e.source_node_id::text)::uuid,
    (v_node_map ->> e.target_node_id::text)::uuid,
    e.source_output_key,
    e.target_param_label
  FROM lenses.workflow_edges e
  WHERE e.workflow_id = p_source_workflow_id;

  RETURN v_new_workflow_id;
END;
$$;


ALTER FUNCTION "lenses"."fn_clone_workflow"("p_source_workflow_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "lenses"."versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lens_id" "uuid" NOT NULL,
    "version_number" integer NOT NULL,
    "template_body" "text" NOT NULL,
    "status" "content"."content_status" DEFAULT 'draft'::"content"."content_status" NOT NULL,
    "changelog" "text",
    "parent_version_id" "uuid",
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "lens_versions_published_at_check" CHECK ((("status" <> 'published'::"content"."content_status") OR ("published_at" IS NOT NULL))),
    CONSTRAINT "lens_versions_template_body_min_length" CHECK (("length"(TRIM(BOTH FROM "template_body")) >= 50)),
    CONSTRAINT "template_body_not_blank" CHECK (("length"(TRIM(BOTH FROM "template_body")) > 0))
);

ALTER TABLE ONLY "lenses"."versions" FORCE ROW LEVEL SECURITY;


ALTER TABLE "lenses"."versions" OWNER TO "postgres";


COMMENT ON TABLE "lenses"."versions" IS 'Immutable version snapshots of prompt assets. Draft versions are editable; published versions cannot be modified. Parameters belong to versions, not to the parent prompt asset.';



COMMENT ON COLUMN "lenses"."versions"."parent_version_id" IS 'Version-level fork lineage (v3 branched from v2). Distinct from content.lenses.parent_lens_id (asset-level fork).';



CREATE OR REPLACE FUNCTION "lenses"."fn_create_draft_version"("p_lens_id" "uuid", "p_template_body" "text", "p_changelog" "text" DEFAULT NULL::"text", "p_parent_version_id" "uuid" DEFAULT NULL::"uuid") RETURNS "lenses"."versions"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'content', 'lensers', 'public'
    AS $$
DECLARE
  v_lenser_id  uuid;
  v_next_num   int;
  v_result     lenses.versions;
BEGIN
  -- Auth
  v_lenser_id := lensers.get_auth_lenser_id();
  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Ownership
  IF NOT EXISTS (
    SELECT 1 FROM lenses.lenses
    WHERE id = p_lens_id AND lenser_id = v_lenser_id
  ) THEN
    RAISE EXCEPTION 'Permission denied: you do not own lens %', p_lens_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Minimum length
  IF length(trim(p_template_body)) < 50 THEN
    RAISE EXCEPTION 'template_body must be at least 50 characters (got %)',
      length(trim(p_template_body))
      USING ERRCODE = 'check_violation';
  END IF;

  -- Next version number (append-only: always one higher than current max)
  SELECT coalesce(max(version_number), 0) + 1
    INTO v_next_num
    FROM lenses.versions
   WHERE lens_id = p_lens_id;

  INSERT INTO lenses.versions (
    lens_id, version_number, template_body,
    status, changelog, parent_version_id
  )
  VALUES (
    p_lens_id,
    v_next_num,
    p_template_body,
    'draft'::"content"."content_status",
    coalesce(p_changelog, 'Draft v' || v_next_num),
    p_parent_version_id
  )
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "lenses"."fn_create_draft_version"("p_lens_id" "uuid", "p_template_body" "text", "p_changelog" "text", "p_parent_version_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "lenses"."fn_create_draft_version"("p_lens_id" "uuid", "p_template_body" "text", "p_changelog" "text", "p_parent_version_id" "uuid") IS 'Append-only draft creator: always INSERTs a new lenses.versions row with the next
   sequential version_number. Never updates an existing version. Use for all
   user-initiated edit saves to ensure full edit history is preserved.
   fn_upsert_draft_version is retained for internal creation flows (fn_create_lens,
   fn_clone_lens). SECURITY DEFINER: ownership checked internally.';



CREATE OR REPLACE FUNCTION "lenses"."fn_create_lens"("p_visibility" "content"."visibility_enum", "p_template_body" "text", "p_title" "text", "p_description" "text" DEFAULT NULL::"text", "p_language_code" "text" DEFAULT 'en'::"text", "p_params" "jsonb" DEFAULT '[]'::"jsonb", "p_tag_ids" "uuid"[] DEFAULT '{}'::"uuid"[], "p_parent_lens_id" "uuid" DEFAULT NULL::"uuid", "p_forked_from_execution_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'content', 'lensers', 'public'
    AS $$
DECLARE
  v_caller_id   uuid;
  v_new_lens_id uuid;
  v_new_version lenses.versions;
  v_tag_id      uuid;
  v_param       jsonb;
  v_param_id    uuid;
  v_text_tool   uuid;
  v_uuid_body   text;  -- template_body with [[:uuid]] tokens (stored in versions)
BEGIN
  -- Auth
  v_caller_id := lensers.get_auth_lenser_id();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF length(trim(p_template_body)) < 50 THEN
    RAISE EXCEPTION 'template_body must be at least 50 characters (got %)',
      length(trim(p_template_body))
      USING ERRCODE = 'check_violation';
  END IF;

  -- 1. Insert base lens record
  INSERT INTO lenses.lenses (
    lenser_id, visibility, status,
    parent_lens_id, forked_from_execution_id
  ) VALUES (
    v_caller_id,
    p_visibility,
    'published'::content.content_status,
    p_parent_lens_id,
    p_forked_from_execution_id
  )
  RETURNING id INTO v_new_lens_id;

  -- 2. Create initial draft version (validates 50-char minimum)
  v_new_version := lenses.fn_create_draft_version(
    v_new_lens_id,
    p_template_body,
    'Initial version'
  );

  -- 3. Set HEAD to the initial draft version
  UPDATE lenses.lenses
  SET head_version_id = v_new_version.id
  WHERE id = v_new_lens_id;

  -- 4. Insert version_parameters and rewrite template_body to [[:uuid]] format
  v_uuid_body := p_template_body;

  IF p_params IS NOT NULL AND jsonb_array_length(p_params) > 0 THEN
    SELECT id INTO v_text_tool FROM lenses.tools WHERE key = 'text' LIMIT 1;

    FOR v_param IN SELECT * FROM jsonb_array_elements(p_params) LOOP
      INSERT INTO lenses.version_parameters (version_id, label, tool_id)
      VALUES (
        v_new_version.id,
        v_param->>'label',
        COALESCE(
          NULLIF(v_param->>'tool_id', '')::uuid,
          v_text_tool
        )
      )
      RETURNING id INTO v_param_id;

      -- Replace [[label]] → [[:uuid]] in the stored body
      v_uuid_body := replace(
        v_uuid_body,
        '[[' || (v_param->>'label') || ']]',
        '[[:'|| v_param_id::text ||']]'
      );
    END LOOP;

    -- Update version row with rewritten body ([[:uuid]] format)
    UPDATE lenses.versions
    SET template_body = v_uuid_body
    WHERE id = v_new_version.id;
  END IF;

  -- 5. Insert original translation — keeps human-readable [[label]] format
  INSERT INTO content.entity_translations (
    entity_type, entity_id, language_code, is_original,
    title, description, content
  ) VALUES (
    'lens'::content.entity_type_enum,
    v_new_lens_id,
    COALESCE(p_language_code, 'en'),
    true,
    p_title,
    p_description,
    p_template_body  -- human-readable [[label]] format
  );

  -- 6. Insert tag associations
  IF p_tag_ids IS NOT NULL AND array_length(p_tag_ids, 1) > 0 THEN
    FOREACH v_tag_id IN ARRAY p_tag_ids LOOP
      INSERT INTO content.tag_map (entity_type, entity_id, tag_id)
      VALUES ('lens'::content.entity_type_enum, v_new_lens_id, v_tag_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  RETURN v_new_lens_id;
END;
$$;


ALTER FUNCTION "lenses"."fn_create_lens"("p_visibility" "content"."visibility_enum", "p_template_body" "text", "p_title" "text", "p_description" "text", "p_language_code" "text", "p_params" "jsonb", "p_tag_ids" "uuid"[], "p_parent_lens_id" "uuid", "p_forked_from_execution_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "lenses"."fn_create_lens"("p_visibility" "content"."visibility_enum", "p_template_body" "text", "p_title" "text", "p_description" "text", "p_language_code" "text", "p_params" "jsonb", "p_tag_ids" "uuid"[], "p_parent_lens_id" "uuid", "p_forked_from_execution_id" "uuid") IS 'GRASP Creator: creates a lens with its initial draft version, version_parameters, translation, and tag associations atomically. p_params is a jsonb array of parameter definition objects — INSERTed into lenses.version_parameters (not entity_translations). Sets head_version_id. SECURITY DEFINER: auth checked internally.';



CREATE OR REPLACE FUNCTION "lenses"."fn_create_workflow_version"("p_workflow_id" "uuid", "p_changelog" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'lensers', 'public'
    AS $$
DECLARE
  v_caller_id     uuid;
  v_owner_id      uuid;
  v_next_version  integer;
  v_version_id    uuid;
  v_node_map      jsonb := '{}';  -- old_node_id → new_node_id
  v_old_node      record;
  v_new_node_id   uuid;
BEGIN
  -- Auth check
  v_caller_id := lensers.get_auth_lenser_id();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Ownership check
  SELECT lenser_id INTO v_owner_id
  FROM lenses.workflows
  WHERE id = p_workflow_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Workflow not found'
      USING ERRCODE = 'no_data_found';
  END IF;

  IF v_owner_id <> v_caller_id THEN
    RAISE EXCEPTION 'Only the workflow owner can create versions'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Compute next version number
  SELECT coalesce(max(version_number), 0) + 1 INTO v_next_version
  FROM lenses.workflow_versions
  WHERE workflow_id = p_workflow_id;

  -- Create version record
  INSERT INTO lenses.workflow_versions (workflow_id, version_number, changelog, status, created_by)
  VALUES (p_workflow_id, v_next_version, p_changelog, 'draft', v_caller_id)
  RETURNING id INTO v_version_id;

  -- Snapshot nodes (need to map old IDs to new IDs for edge references)
  FOR v_old_node IN
    SELECT id, lens_id, version_id, position_x, position_y, label, ordinal, config
    FROM lenses.workflow_nodes
    WHERE workflow_id = p_workflow_id
    ORDER BY ordinal
  LOOP
    v_new_node_id := gen_random_uuid();

    INSERT INTO lenses.workflow_version_nodes (
      id, workflow_version_id, lens_id, version_id,
      position_x, position_y, label, ordinal, config
    ) VALUES (
      v_new_node_id, v_version_id, v_old_node.lens_id, v_old_node.version_id,
      v_old_node.position_x, v_old_node.position_y, v_old_node.label,
      v_old_node.ordinal, v_old_node.config
    );

    v_node_map := v_node_map || jsonb_build_object(v_old_node.id::text, v_new_node_id::text);
  END LOOP;

  -- Snapshot edges (remap node IDs)
  INSERT INTO lenses.workflow_version_edges (
    workflow_version_id, source_node_id, target_node_id,
    source_output_key, target_param_label
  )
  SELECT
    v_version_id,
    (v_node_map ->> e.source_node_id::text)::uuid,
    (v_node_map ->> e.target_node_id::text)::uuid,
    e.source_output_key,
    e.target_param_label
  FROM lenses.workflow_edges e
  WHERE e.workflow_id = p_workflow_id;

  RETURN v_version_id;
END;
$$;


ALTER FUNCTION "lenses"."fn_create_workflow_version"("p_workflow_id" "uuid", "p_changelog" "text") OWNER TO "postgres";


ALTER FUNCTION "lenses"."fn_dispatch_scheduled_workflows"() OWNER TO "postgres";


COMMENT ON FUNCTION "lenses"."fn_dispatch_scheduled_workflows"() IS 'Called by pg_cron to trigger scheduled workflow runs. Returns count of dispatched runs.';



CREATE OR REPLACE FUNCTION "lenses"."fn_get_version_params_with_tools"("p_version_id" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'public'
    AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id',        vp.id,
        'version_id', vp.version_id,
        'label',     vp.label,
        'tool_id',   vp.tool_id,
        'tool', jsonb_build_object(
          'id',               t.id,
          'key',              t.key,
          'label',            t.label,
          'description',      t.description,
          'category',         t.category,
          'type',             t.type,
          'required',         t.required,
          'min_length',       t.min_length,
          'max_length',       t.max_length,
          'placeholder',      t.placeholder,
          'help_text',        t.help_text,
          'validation_schema', t.validation_schema,
          'options',          t.options,
          'sort_order',       t.sort_order,
          'is_system',        t.is_system,
          'icon',             t.icon,
          'color',            t.color
        )
      )
      ORDER BY t.sort_order, vp.label
    ),
    '[]'::jsonb
  )
  FROM  lenses.version_parameters vp
  JOIN  lenses.tools t ON t.id = vp.tool_id
  WHERE vp.version_id = p_version_id;
$$;


ALTER FUNCTION "lenses"."fn_get_version_params_with_tools"("p_version_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lenses"."fn_get_workflow_versions"("p_workflow_id" "uuid") RETURNS TABLE("id" "uuid", "workflow_id" "uuid", "version_number" integer, "changelog" "text", "status" "text", "published_at" timestamp with time zone, "created_by" "uuid", "created_at" timestamp with time zone, "node_count" bigint, "edge_count" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'lenses', 'public'
    AS $$
  SELECT
    wv.id,
    wv.workflow_id,
    wv.version_number,
    wv.changelog,
    wv.status,
    wv.published_at,
    wv.created_by,
    wv.created_at,
    (SELECT count(*) FROM lenses.workflow_version_nodes n WHERE n.workflow_version_id = wv.id) AS node_count,
    (SELECT count(*) FROM lenses.workflow_version_edges e WHERE e.workflow_version_id = wv.id) AS edge_count
  FROM lenses.workflow_versions wv
  WHERE wv.workflow_id = p_workflow_id
  ORDER BY wv.version_number DESC;
$$;


ALTER FUNCTION "lenses"."fn_get_workflow_versions"("p_workflow_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lenses"."fn_list_lens_versions"("p_lens_id" "uuid", "p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "lens_id" "uuid", "version_number" integer, "status" "text", "changelog" "text", "parameter_count" integer, "created_at" timestamp with time zone)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'lenses'
    AS $$
  SELECT
    v.id,
    v.lens_id,
    v.version_number,
    v.status::text,
    v.changelog,
    COUNT(vp.id)::integer AS parameter_count,
    v.created_at
  FROM lenses.versions v
  LEFT JOIN lenses.version_parameters vp ON vp.version_id = v.id
  WHERE v.lens_id = p_lens_id
  GROUP BY v.id
  ORDER BY v.version_number DESC
  LIMIT  LEAST(p_limit, 50)
  OFFSET GREATEST(p_offset, 0)
$$;


ALTER FUNCTION "lenses"."fn_list_lens_versions"("p_lens_id" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lenses"."fn_list_tools"("p_category" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'public'
    AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id',               id,
        'key',              key,
        'label',            label,
        'description',      description,
        'category',         category,
        'type',             type,
        'required',         required,
        'min_length',       min_length,
        'max_length',       max_length,
        'placeholder',      placeholder,
        'help_text',        help_text,
        'validation_schema', validation_schema,
        'options',          options,
        'sort_order',       sort_order,
        'is_system',        is_system,
        'icon',             icon,
        'color',            color
      )
      ORDER BY sort_order, key
    ),
    '[]'::jsonb
  )
  FROM lenses.tools
  WHERE (p_category IS NULL OR category = p_category);
$$;


ALTER FUNCTION "lenses"."fn_list_tools"("p_category" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lenses"."fn_list_versions"("p_lens_id" "uuid") RETURNS SETOF "lenses"."versions"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'lenses'
    AS $$
  SELECT *
  FROM lenses.versions
  WHERE lens_id = p_lens_id
  ORDER BY version_number DESC;
$$;


ALTER FUNCTION "lenses"."fn_list_versions"("p_lens_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "lenses"."fn_list_versions"("p_lens_id" "uuid") IS 'Lists all versions for a lens in descending version_number order. SECURITY INVOKER: caller RLS applies.';



CREATE OR REPLACE FUNCTION "lenses"."fn_prevent_published_version_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'lenses'
    AS $$
BEGIN
  IF OLD.status = 'published' THEN
    RAISE EXCEPTION
      'Published versions are immutable (id=%). Create a new draft instead.',
      OLD.id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "lenses"."fn_prevent_published_version_update"() OWNER TO "postgres";


COMMENT ON FUNCTION "lenses"."fn_prevent_published_version_update"() IS 'Trigger guard: raises an exception when any column of a published lenses.versions row
   is updated. Published versions must remain immutable; all edits must go through
   fn_create_draft_version to create a new append-only draft row.';



CREATE OR REPLACE FUNCTION "lenses"."fn_publish_version"("p_version_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'lensers', 'content', 'public'
    AS $$
DECLARE
  v_owner         uuid;
  v_ver_status    "content"."content_status";
  v_template_body text;
  v_lens_id       uuid;
BEGIN
  SELECT "p"."lenser_id", "v"."status", "v"."template_body", "v"."lens_id"
  INTO   v_owner, v_ver_status, v_template_body, v_lens_id
  FROM   "lenses"."versions" v
  JOIN   "lenses"."lenses"   p ON p."id" = v."lens_id"
  WHERE  v."id" = p_version_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Version not found: %', p_version_id
      USING ERRCODE = 'no_data_found';
  END IF;

  IF v_ver_status <> 'draft' THEN
    RAISE EXCEPTION 'Version % is already in status %. Only draft versions can be published.',
      p_version_id, v_ver_status
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF v_owner <> "lensers"."get_auth_lenser_id"() THEN
    RAISE EXCEPTION 'Permission denied: you do not own this lens version'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF length(trim(v_template_body)) < 50 THEN
    RAISE EXCEPTION 'Cannot publish version %: template_body must be at least 50 characters (got %).',
      p_version_id, length(trim(v_template_body))
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Publish the version
  UPDATE "lenses"."versions"
  SET  "status"       = 'published',
       "published_at" = now()
  WHERE "id" = p_version_id;

  -- Advance HEAD to the newly published version
  UPDATE "lenses"."lenses"
  SET  "head_version_id" = p_version_id
  WHERE "id" = v_lens_id;
END;
$$;


ALTER FUNCTION "lenses"."fn_publish_version"("p_version_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "lenses"."fn_publish_version"("p_version_id" "uuid") IS 'Publishes a draft lens version (draft → published). Validates ownership, draft status, and template_body minimum length. Advances lenses.head_version_id to the newly published version. SECURITY DEFINER: ownership checked internally.';



CREATE OR REPLACE FUNCTION "lenses"."fn_publish_workflow_version"("p_version_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'lensers', 'public'
    AS $$
DECLARE
  v_caller_id     uuid;
  v_workflow_id   uuid;
  v_owner_id      uuid;
  v_current_status text;
BEGIN
  v_caller_id := lensers.get_auth_lenser_id();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Get version info
  SELECT wv.workflow_id, wv.status INTO v_workflow_id, v_current_status
  FROM lenses.workflow_versions wv
  WHERE wv.id = p_version_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Version not found'
      USING ERRCODE = 'no_data_found';
  END IF;

  IF v_current_status <> 'draft' THEN
    RAISE EXCEPTION 'Only draft versions can be published'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Ownership check
  SELECT lenser_id INTO v_owner_id
  FROM lenses.workflows
  WHERE id = v_workflow_id;

  IF v_owner_id <> v_caller_id THEN
    RAISE EXCEPTION 'Only the workflow owner can publish versions'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Archive previous published version(s)
  UPDATE lenses.workflow_versions
  SET status = 'archived'
  WHERE workflow_id = v_workflow_id
    AND status = 'published';

  -- Publish this version
  UPDATE lenses.workflow_versions
  SET status = 'published', published_at = now()
  WHERE id = p_version_id;

  -- Update head_version_id on workflow
  UPDATE lenses.workflows
  SET head_version_id = p_version_id, updated_at = now()
  WHERE id = v_workflow_id;
END;
$$;


ALTER FUNCTION "lenses"."fn_publish_workflow_version"("p_version_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lenses"."fn_render_template"("p_version_id" "uuid", "p_inputs" "jsonb") RETURNS "text"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'lenses', 'public'
    AS $$
DECLARE
    v_template  text;
    v_rendered  text;
    v_param     record;
    v_val       text;
BEGIN
    -- Fetch the template body
    SELECT template_body
      INTO STRICT v_template
      FROM lenses.versions
     WHERE id = p_version_id;

    v_rendered := v_template;

    -- Iterate parameters in sort_order so substitution is deterministic
    FOR v_param IN
        SELECT key, type, required, default_value
          FROM lenses.version_parameters
         WHERE version_id = p_version_id
         ORDER BY sort_order, key
    LOOP
        -- Resolve: caller input → default_value → NULL
        v_val := NULLIF(trim(p_inputs ->> v_param.key), '');
        IF v_val IS NULL THEN
            v_val := v_param.default_value;
        END IF;

        -- Enforce required
        IF v_val IS NULL AND v_param.required THEN
            RAISE EXCEPTION
                'Required parameter ''%'' is missing or empty',
                v_param.key
                USING ERRCODE = '23514'; -- check_violation
        END IF;

        -- Substitute; optional missing params render as empty string
        v_rendered := replace(
            v_rendered,
            '[[' || v_param.key || ']]',
            coalesce(v_val, '')
        );
    END LOOP;

    RETURN v_rendered;

EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RAISE EXCEPTION 'Version % not found', p_version_id
            USING ERRCODE = 'P0002';
END;
$$;


ALTER FUNCTION "lenses"."fn_render_template"("p_version_id" "uuid", "p_inputs" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "lenses"."fn_render_template"("p_version_id" "uuid", "p_inputs" "jsonb") IS 'Renders a lens version template_body by substituting [[key]] tokens with caller-supplied inputs (p_inputs jsonb). Raises 23514 on missing required params. Called by the execution API layer before sending to AI adapters.';



CREATE OR REPLACE FUNCTION "lenses"."fn_render_version_body"("p_version_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'public'
    AS $$
DECLARE
  v_body  text;
  v_param RECORD;
BEGIN
  SELECT template_body INTO v_body
  FROM   lenses.versions
  WHERE  id = p_version_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  FOR v_param IN
    SELECT id, label
    FROM   lenses.version_parameters
    WHERE  version_id = p_version_id
  LOOP
    v_body := replace(
      v_body,
      '[[:'|| v_param.id::text ||']]',
      '[[' || v_param.label || ']]'
    );
  END LOOP;

  RETURN v_body;
END;
$$;


ALTER FUNCTION "lenses"."fn_render_version_body"("p_version_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lenses"."fn_restore_workflow_version"("p_version_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'lensers', 'public'
    AS $$
DECLARE
  v_caller_id     uuid;
  v_workflow_id   uuid;
  v_owner_id      uuid;
  v_node_map      jsonb := '{}';
  v_old_node      record;
  v_new_node_id   uuid;
BEGIN
  v_caller_id := lensers.get_auth_lenser_id();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Get version info
  SELECT wv.workflow_id INTO v_workflow_id
  FROM lenses.workflow_versions wv
  WHERE wv.id = p_version_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Version not found'
      USING ERRCODE = 'no_data_found';
  END IF;

  -- Ownership check
  SELECT lenser_id INTO v_owner_id
  FROM lenses.workflows
  WHERE id = v_workflow_id;

  IF v_owner_id <> v_caller_id THEN
    RAISE EXCEPTION 'Only the workflow owner can restore versions'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Delete current live nodes and edges (cascade will handle edges via workflow_id)
  DELETE FROM lenses.workflow_edges WHERE workflow_id = v_workflow_id;
  DELETE FROM lenses.workflow_nodes WHERE workflow_id = v_workflow_id;

  -- Copy version nodes back to live nodes
  FOR v_old_node IN
    SELECT id, lens_id, version_id, position_x, position_y, label, ordinal, config
    FROM lenses.workflow_version_nodes
    WHERE workflow_version_id = p_version_id
    ORDER BY ordinal
  LOOP
    v_new_node_id := gen_random_uuid();

    INSERT INTO lenses.workflow_nodes (
      id, workflow_id, lens_id, version_id,
      position_x, position_y, label, ordinal, config
    ) VALUES (
      v_new_node_id, v_workflow_id, v_old_node.lens_id, v_old_node.version_id,
      v_old_node.position_x, v_old_node.position_y, v_old_node.label,
      v_old_node.ordinal, v_old_node.config
    );

    v_node_map := v_node_map || jsonb_build_object(v_old_node.id::text, v_new_node_id::text);
  END LOOP;

  -- Copy version edges back to live edges
  INSERT INTO lenses.workflow_edges (
    workflow_id, source_node_id, target_node_id,
    source_output_key, target_param_label
  )
  SELECT
    v_workflow_id,
    (v_node_map ->> e.source_node_id::text)::uuid,
    (v_node_map ->> e.target_node_id::text)::uuid,
    e.source_output_key,
    e.target_param_label
  FROM lenses.workflow_version_edges e
  WHERE e.workflow_version_id = p_version_id;

  -- Update workflow timestamp
  UPDATE lenses.workflows
  SET updated_at = now()
  WHERE id = v_workflow_id;
END;
$$;


ALTER FUNCTION "lenses"."fn_restore_workflow_version"("p_version_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lenses"."fn_start_workflow_run"("p_workflow_id" "uuid", "p_inputs" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'lensers', 'public'
    AS $$
DECLARE
  v_lenser_id  uuid;
  v_run_id     uuid;
  v_node       RECORD;
BEGIN
  -- Resolve caller
  v_lenser_id := lensers.get_auth_lenser_id();

  -- Validate: caller must own the workflow or it must be public
  IF NOT EXISTS (
    SELECT 1 FROM lenses.workflows w
    WHERE w.id = p_workflow_id
      AND (w.lenser_id = v_lenser_id OR w.visibility = 'public')
  ) THEN
    RAISE EXCEPTION 'Workflow not found or access denied' USING ERRCODE = 'P0001';
  END IF;

  -- Create the run record
  INSERT INTO lenses.workflow_runs (workflow_id, triggered_by, status, context_inputs)
  VALUES (p_workflow_id, v_lenser_id, 'pending', p_inputs)
  RETURNING id INTO v_run_id;

  -- Seed one node_result row per node (all pending)
  FOR v_node IN
    SELECT id FROM lenses.workflow_nodes WHERE workflow_id = p_workflow_id
  LOOP
    INSERT INTO lenses.workflow_node_results (run_id, node_id, status)
    VALUES (v_run_id, v_node.id, 'pending');
  END LOOP;

  RETURN v_run_id;
END;
$$;


ALTER FUNCTION "lenses"."fn_start_workflow_run"("p_workflow_id" "uuid", "p_inputs" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "lenses"."fn_start_workflow_run"("p_workflow_id" "uuid", "p_inputs" "jsonb") IS 'Creates a workflow_run and seeds pending workflow_node_results for every node. Returns the run_id. The CF Worker polls/subscribes to drive actual execution.';



CREATE OR REPLACE FUNCTION "lenses"."fn_start_workflow_run"("p_workflow_id" "uuid", "p_inputs" "jsonb" DEFAULT '{}'::"jsonb", "p_global_model_id" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'lensers', 'public'
    AS $$
DECLARE
  v_lenser_id  uuid;
  v_run_id     uuid;
BEGIN
  v_lenser_id := lensers.get_auth_lenser_id();

  -- Guard: caller must own the workflow or it must be public
  IF NOT EXISTS (
    SELECT 1 FROM lenses.workflows w
    WHERE w.id = p_workflow_id
      AND (w.visibility = 'public' OR w.lenser_id = v_lenser_id)
  ) THEN
    RAISE EXCEPTION 'workflow_not_found_or_forbidden';
  END IF;

  INSERT INTO lenses.workflow_runs (workflow_id, triggered_by, status, context_inputs, global_model_id)
  VALUES (p_workflow_id, v_lenser_id, 'pending', p_inputs, p_global_model_id)
  RETURNING id INTO v_run_id;

  -- Seed one node_result row per node (all pending)
  INSERT INTO lenses.workflow_node_results (run_id, node_id, status)
  SELECT v_run_id, n.id, 'pending'
  FROM lenses.workflow_nodes n
  WHERE n.workflow_id = p_workflow_id;

  RETURN v_run_id;
END;
$$;


ALTER FUNCTION "lenses"."fn_start_workflow_run"("p_workflow_id" "uuid", "p_inputs" "jsonb", "p_global_model_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "lenses"."fn_start_workflow_run"("p_workflow_id" "uuid", "p_inputs" "jsonb", "p_global_model_id" "text") IS 'Creates a workflow_run with optional global_model_id and seeds pending workflow_node_results for every node. Returns the run_id. The CF Worker polls/subscribes to drive actual execution.';



CREATE OR REPLACE FUNCTION "lenses"."fn_touch_workflow_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'lenses'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "lenses"."fn_touch_workflow_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lenses"."fn_update_lens"("p_lens_id" "uuid", "p_template_body" "text" DEFAULT NULL::"text", "p_visibility" "content"."visibility_enum" DEFAULT NULL::"content"."visibility_enum", "p_title" "text" DEFAULT NULL::"text", "p_description" "text" DEFAULT NULL::"text", "p_tag_ids" "uuid"[] DEFAULT NULL::"uuid"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'content', 'lensers', 'public'
    AS $$
DECLARE
  v_caller_id uuid;
  v_owner_id  uuid;
  v_tag_id    uuid;
BEGIN
  -- Auth
  v_caller_id := lensers.get_auth_lenser_id();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Ownership
  SELECT lenser_id INTO v_owner_id
    FROM lenses.lenses
   WHERE id = p_lens_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lens not found: %', p_lens_id
      USING ERRCODE = 'no_data_found';
  END IF;

  IF v_owner_id <> v_caller_id THEN
    RAISE EXCEPTION 'Permission denied: you do not own this lens'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 1. Update visibility if provided
  IF p_visibility IS NOT NULL THEN
    UPDATE lenses.lenses SET visibility = p_visibility WHERE id = p_lens_id;
  END IF;

  -- 2. Content change → create a new append-only draft version
  IF p_template_body IS NOT NULL THEN
    IF length(trim(p_template_body)) < 50 THEN
      RAISE EXCEPTION 'template_body must be at least 50 characters (got %)',
        length(trim(p_template_body))
        USING ERRCODE = 'check_violation';
    END IF;

    -- Always append a new draft row (never overwrite existing version)
    PERFORM lenses.fn_create_draft_version(
      p_lens_id,
      p_template_body,
      'Updated via lens edit'
    );
  END IF;

  -- 3. Update translation
  IF p_title IS NOT NULL OR p_description IS NOT NULL
     OR p_template_body IS NOT NULL THEN
    UPDATE content.entity_translations
       SET title       = coalesce(p_title, title),
           description = coalesce(p_description, description),
           content     = coalesce(p_template_body, content)
     WHERE entity_type = 'lens'::"content"."entity_type_enum"
       AND entity_id   = p_lens_id
       AND is_original = true;
  END IF;

  -- 4. Replace tags if provided (NULL = no change, empty array = clear all)
  IF p_tag_ids IS NOT NULL THEN
    DELETE FROM content.tag_map
     WHERE entity_type = 'lens'::"content"."entity_type_enum"
       AND entity_id   = p_lens_id;

    IF array_length(p_tag_ids, 1) > 0 THEN
      FOREACH v_tag_id IN ARRAY p_tag_ids LOOP
        INSERT INTO content.tag_map (entity_type, entity_id, tag_id)
        VALUES ('lens'::"content"."entity_type_enum", p_lens_id, v_tag_id)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;
  END IF;
END;
$$;


ALTER FUNCTION "lenses"."fn_update_lens"("p_lens_id" "uuid", "p_template_body" "text", "p_visibility" "content"."visibility_enum", "p_title" "text", "p_description" "text", "p_tag_ids" "uuid"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "lenses"."fn_update_lens"("p_lens_id" "uuid", "p_template_body" "text", "p_visibility" "content"."visibility_enum", "p_title" "text", "p_description" "text", "p_tag_ids" "uuid"[]) IS 'GRASP Controller: atomic lens update. Updates visibility, template body (via
   fn_create_draft_version — append-only, always inserts new draft row), translation,
   and tags in one transaction. SECURITY DEFINER: ownership checked internally.';



CREATE OR REPLACE FUNCTION "lenses"."fn_update_lens"("p_lens_id" "uuid", "p_template_body" "text" DEFAULT NULL::"text", "p_visibility" "content"."visibility_enum" DEFAULT NULL::"content"."visibility_enum", "p_title" "text" DEFAULT NULL::"text", "p_description" "text" DEFAULT NULL::"text", "p_tag_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_params" "jsonb" DEFAULT NULL::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'content', 'lensers', 'public'
    AS $$
DECLARE
  v_caller_id   uuid;
  v_owner_id    uuid;
  v_tag_id      uuid;
  v_new_version lenses.versions;
  v_param       jsonb;
  v_param_id    uuid;
  v_text_tool   uuid;
  v_uuid_body   text;
BEGIN
  -- Auth
  v_caller_id := lensers.get_auth_lenser_id();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Ownership
  SELECT lenser_id INTO v_owner_id
  FROM   lenses.lenses
  WHERE  id = p_lens_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lens not found: %', p_lens_id
      USING ERRCODE = 'no_data_found';
  END IF;

  IF v_owner_id <> v_caller_id THEN
    RAISE EXCEPTION 'Permission denied: you do not own this lens'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 1. Update visibility
  IF p_visibility IS NOT NULL THEN
    UPDATE lenses.lenses SET visibility = p_visibility WHERE id = p_lens_id;
  END IF;

  -- 2. Content change → new append-only draft version + version_parameters
  IF p_template_body IS NOT NULL THEN
    IF length(trim(p_template_body)) < 50 THEN
      RAISE EXCEPTION 'template_body must be at least 50 characters (got %)',
        length(trim(p_template_body))
        USING ERRCODE = 'check_violation';
    END IF;

    -- Create draft version (receives [[label]] body; we'll rewrite it below)
    v_new_version := lenses.fn_create_draft_version(
      p_lens_id,
      p_template_body,
      'Updated via lens edit'
    );

    -- Insert version_parameters and build [[:uuid]] body
    v_uuid_body := p_template_body;

    IF p_params IS NOT NULL AND jsonb_array_length(p_params) > 0 THEN
      SELECT id INTO v_text_tool FROM lenses.tools WHERE key = 'text' LIMIT 1;

      FOR v_param IN SELECT * FROM jsonb_array_elements(p_params) LOOP
        INSERT INTO lenses.version_parameters (version_id, label, tool_id)
        VALUES (
          v_new_version.id,
          v_param->>'label',
          COALESCE(
            NULLIF(v_param->>'tool_id', '')::uuid,
            v_text_tool
          )
        )
        RETURNING id INTO v_param_id;

        v_uuid_body := replace(
          v_uuid_body,
          '[[' || (v_param->>'label') || ']]',
          '[[:'|| v_param_id::text ||']]'
        );
      END LOOP;

      -- Store the rewritten ([[:uuid]]) body in the version row
      UPDATE lenses.versions
      SET template_body = v_uuid_body
      WHERE id = v_new_version.id;
    END IF;
  END IF;

  -- 3. Update translation — keeps human-readable [[label]] format
  IF p_title IS NOT NULL OR p_description IS NOT NULL OR p_template_body IS NOT NULL THEN
    UPDATE content.entity_translations
    SET
      title       = COALESCE(p_title,        title),
      description = COALESCE(p_description,  description),
      content     = COALESCE(p_template_body, content)  -- [[label]] format
    WHERE entity_type = 'lens'::content.entity_type_enum
      AND entity_id   = p_lens_id
      AND is_original = true;
  END IF;

  -- 4. Replace tags
  IF p_tag_ids IS NOT NULL THEN
    DELETE FROM content.tag_map
    WHERE entity_type = 'lens'::content.entity_type_enum
      AND entity_id   = p_lens_id;

    IF array_length(p_tag_ids, 1) > 0 THEN
      FOREACH v_tag_id IN ARRAY p_tag_ids LOOP
        INSERT INTO content.tag_map (entity_type, entity_id, tag_id)
        VALUES ('lens'::content.entity_type_enum, p_lens_id, v_tag_id)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;
  END IF;
END;
$$;


ALTER FUNCTION "lenses"."fn_update_lens"("p_lens_id" "uuid", "p_template_body" "text", "p_visibility" "content"."visibility_enum", "p_title" "text", "p_description" "text", "p_tag_ids" "uuid"[], "p_params" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lenses"."fn_upsert_draft_version"("p_lens_id" "uuid", "p_template_body" "text", "p_changelog" "text" DEFAULT NULL::"text", "p_parent_version_id" "uuid" DEFAULT NULL::"uuid") RETURNS "lenses"."versions"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'content', 'public'
    AS $$
DECLARE
  v_draft_id            uuid;
  v_next_number         int;
  v_last_published_body text;
  v_result              lenses.versions;
BEGIN
  -- Validate minimum length
  IF length(trim(p_template_body)) < 50 THEN
    RAISE EXCEPTION 'template_body must be at least 50 characters (got %)',
      length(trim(p_template_body))
      USING ERRCODE = 'check_violation';
  END IF;

  -- Content-change detection: fetch last published version's template_body
  -- Uses idx_lens_versions_published_latest
  SELECT v.template_body
  INTO v_last_published_body
  FROM lenses.versions v
  WHERE v.lens_id = p_lens_id
    AND v.status = 'published'::"content"."content_status"
  ORDER BY v.version_number DESC
  LIMIT 1;

  -- If content is identical to last published version → no-op
  IF v_last_published_body IS NOT NULL
     AND v_last_published_body = p_template_body THEN

    -- Return existing draft if one exists
    SELECT *
    INTO v_result
    FROM lenses.versions
    WHERE lens_id = p_lens_id
      AND status = 'draft'::"content"."content_status"
    ORDER BY version_number DESC
    LIMIT 1;

    IF v_result.id IS NOT NULL THEN
      RETURN v_result;
    END IF;

    -- No draft exists — return last published version
    SELECT *
    INTO v_result
    FROM lenses.versions
    WHERE lens_id = p_lens_id
      AND status = 'published'::"content"."content_status"
    ORDER BY version_number DESC
    LIMIT 1;

    RETURN v_result;
  END IF;

  -- Look for the current draft version (uses idx_lens_versions_draft)
  SELECT id
  INTO v_draft_id
  FROM lenses.versions
  WHERE lens_id = p_lens_id
    AND status = 'draft'::"content"."content_status"
  ORDER BY version_number DESC
  LIMIT 1;

  IF v_draft_id IS NOT NULL THEN
    -- Reuse: update the existing draft in place
    UPDATE lenses.versions
    SET
      template_body = p_template_body,
      changelog     = COALESCE(p_changelog, changelog)
    WHERE id = v_draft_id
    RETURNING * INTO v_result;
  ELSE
    -- All prior versions are published/archived — open a new draft
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO v_next_number
    FROM lenses.versions
    WHERE lens_id = p_lens_id;

    INSERT INTO lenses.versions (
      lens_id,
      version_number,
      template_body,
      status,
      changelog,
      parent_version_id
    )
    VALUES (
      p_lens_id,
      v_next_number,
      p_template_body,
      'draft'::"content"."content_status",
      COALESCE(p_changelog, 'New version'),
      p_parent_version_id
    )
    RETURNING * INTO v_result;
  END IF;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "lenses"."fn_upsert_draft_version"("p_lens_id" "uuid", "p_template_body" "text", "p_changelog" "text", "p_parent_version_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "lenses"."fn_upsert_draft_version"("p_lens_id" "uuid", "p_template_body" "text", "p_changelog" "text", "p_parent_version_id" "uuid") IS 'GRASP Creator: creates or updates draft lens versions with content-change detection. Skips draft creation/update when new content is identical to the last published version. Validates 50-char minimum on template_body. SECURITY DEFINER: bypasses RLS — caller security enforced by calling function.';



CREATE OR REPLACE FUNCTION "lenses"."fn_validate_inputs"("p_version_id" "uuid", "p_inputs" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'media', 'lensers', 'public'
    AS $_$
DECLARE
  vp          RECORD;
  v_raw       text;
  v_schema    jsonb;
  v_min       numeric;
  v_max       numeric;
  v_num       numeric;
  v_caller_id uuid;
BEGIN
  -- No version → nothing to validate (allow ad-hoc / legacy requests)
  IF p_version_id IS NULL THEN
    RETURN;
  END IF;

  v_caller_id := "lensers"."get_auth_lenser_id"();

  FOR vp IN
    SELECT "key", "type", "required", "options", "validation_schema"
    FROM   "lenses"."version_parameters"
    WHERE  "version_id" = p_version_id
    ORDER  BY "sort_order", "key"
  LOOP
    v_raw    := "p_inputs"->>vp."key";
    v_schema := vp."validation_schema";

    -- 1. Required field must be present and non-empty
    IF vp."required" AND (v_raw IS NULL OR trim(v_raw) = '') THEN
      RAISE EXCEPTION 'Required parameter "%" is missing or empty', vp."key"
        USING ERRCODE = 'check_violation';
    END IF;

    -- Skip type checks for absent optional parameters
    CONTINUE WHEN v_raw IS NULL OR trim(v_raw) = '';

    -- 2. Type-compatibility check + schema enforcement
    BEGIN
      CASE vp."type"

        -- ── Legacy numeric ───────────────────────────────────────────────
        WHEN 'number' THEN
          v_num := v_raw::"numeric";
          IF v_schema IS NOT NULL THEN
            IF v_schema->>'min' IS NOT NULL THEN
              v_min := (v_schema->>'min')::"numeric";
              IF v_num < v_min THEN
                RAISE EXCEPTION 'Parameter "%" value % is below minimum %',
                  vp."key", v_num, v_min USING ERRCODE = 'check_violation';
              END IF;
            END IF;
            IF v_schema->>'max' IS NOT NULL THEN
              v_max := (v_schema->>'max')::"numeric";
              IF v_num > v_max THEN
                RAISE EXCEPTION 'Parameter "%" value % exceeds maximum %',
                  vp."key", v_num, v_max USING ERRCODE = 'check_violation';
              END IF;
            END IF;
          END IF;

        -- ── Integer ──────────────────────────────────────────────────────
        WHEN 'integer' THEN
          v_num := v_raw::"bigint";
          IF v_schema IS NOT NULL THEN
            IF v_schema->>'min' IS NOT NULL THEN
              v_min := (v_schema->>'min')::"numeric";
              IF v_num < v_min THEN
                RAISE EXCEPTION 'Parameter "%" value % is below minimum %',
                  vp."key", v_num, v_min USING ERRCODE = 'check_violation';
              END IF;
            END IF;
            IF v_schema->>'max' IS NOT NULL THEN
              v_max := (v_schema->>'max')::"numeric";
              IF v_num > v_max THEN
                RAISE EXCEPTION 'Parameter "%" value % exceeds maximum %',
                  vp."key", v_num, v_max USING ERRCODE = 'check_violation';
              END IF;
            END IF;
          END IF;

        -- ── Float ────────────────────────────────────────────────────────
        WHEN 'float' THEN
          v_num := v_raw::"double precision";
          IF v_schema IS NOT NULL THEN
            IF v_schema->>'min' IS NOT NULL THEN
              v_min := (v_schema->>'min')::"numeric";
              IF v_num < v_min THEN
                RAISE EXCEPTION 'Parameter "%" value % is below minimum %',
                  vp."key", v_num, v_min USING ERRCODE = 'check_violation';
              END IF;
            END IF;
            IF v_schema->>'max' IS NOT NULL THEN
              v_max := (v_schema->>'max')::"numeric";
              IF v_num > v_max THEN
                RAISE EXCEPTION 'Parameter "%" value % exceeds maximum %',
                  vp."key", v_num, v_max USING ERRCODE = 'check_violation';
              END IF;
            END IF;
          END IF;

        -- ── Decimal / Numeric ─────────────────────────────────────────────
        WHEN 'decimal' THEN
          v_num := v_raw::"numeric";
          IF v_schema IS NOT NULL THEN
            IF v_schema->>'min' IS NOT NULL THEN
              v_min := (v_schema->>'min')::"numeric";
              IF v_num < v_min THEN
                RAISE EXCEPTION 'Parameter "%" value % is below minimum %',
                  vp."key", v_num, v_min USING ERRCODE = 'check_violation';
              END IF;
            END IF;
            IF v_schema->>'max' IS NOT NULL THEN
              v_max := (v_schema->>'max')::"numeric";
              IF v_num > v_max THEN
                RAISE EXCEPTION 'Parameter "%" value % exceeds maximum %',
                  vp."key", v_num, v_max USING ERRCODE = 'check_violation';
              END IF;
            END IF;
          END IF;

        -- ── Boolean ───────────────────────────────────────────────────────
        WHEN 'boolean' THEN
          IF lower(v_raw) NOT IN ('true', 'false', '1', '0') THEN
            RAISE EXCEPTION
              'Parameter "%" must be a boolean value (true/false), got: %',
              vp."key", v_raw
              USING ERRCODE = 'check_violation';
          END IF;

        -- ── JSON ──────────────────────────────────────────────────────────
        WHEN 'json' THEN
          PERFORM v_raw::"jsonb";

        -- ── Select (enum membership) ──────────────────────────────────────
        WHEN 'select' THEN
          IF vp."options" IS NOT NULL
             AND jsonb_typeof(vp."options") = 'array'
             AND NOT EXISTS (
               SELECT 1
               FROM   jsonb_array_elements(vp."options") opt
               WHERE  opt->>'value' = v_raw
             ) THEN
            RAISE EXCEPTION
              'Parameter "%" value "%" is not in the allowed options list',
              vp."key", v_raw
              USING ERRCODE = 'check_violation';
          END IF;

        -- ── URL ───────────────────────────────────────────────────────────
        WHEN 'url' THEN
          -- Must start with http:// or https:// (no scheme injection)
          IF v_raw !~ '^https?://' THEN
            RAISE EXCEPTION
              'Parameter "%" must be a valid URL starting with http:// or https://, got: %',
              vp."key", left(v_raw, 100)
              USING ERRCODE = 'check_violation';
          END IF;
          -- Optional: allowedSchemes from validation_schema
          IF v_schema IS NOT NULL AND v_schema->'urlScheme' IS NOT NULL
             AND jsonb_typeof(v_schema->'urlScheme') = 'array'
             AND NOT EXISTS (
               SELECT 1
               FROM   jsonb_array_elements_text(v_schema->'urlScheme') scheme
               WHERE  lower(v_raw) LIKE lower(scheme) || '://%'
             ) THEN
            RAISE EXCEPTION
              'Parameter "%" URL scheme is not allowed',
              vp."key"
              USING ERRCODE = 'check_violation';
          END IF;

        -- ── Date ──────────────────────────────────────────────────────────
        WHEN 'date' THEN
          PERFORM v_raw::"date";

        -- ── Datetime ──────────────────────────────────────────────────────
        WHEN 'datetime' THEN
          PERFORM v_raw::"timestamptz";

        -- ── File (attachment) ─────────────────────────────────────────────
        WHEN 'file' THEN
          -- Value must be a valid UUID
          IF v_raw !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
            RAISE EXCEPTION
              'Parameter "%" must be a media object UUID, got invalid value',
              vp."key"
              USING ERRCODE = 'check_violation';
          END IF;
          -- Referenced media.objects row must exist and be owned by the caller
          IF v_caller_id IS NOT NULL THEN
            IF NOT EXISTS (
              SELECT 1
              FROM   "media"."objects" mo
              WHERE  mo."id"               = v_raw::"uuid"
                AND  mo."owner_lenser_id"  = v_caller_id
                AND  mo."lifecycle_state" IN ('pending', 'active')
            ) THEN
              RAISE EXCEPTION
                'Parameter "%" references a media object that does not exist or is not accessible',
                vp."key"
                USING ERRCODE = 'check_violation';
            END IF;
          END IF;

        ELSE
          NULL;  -- 'text', 'textarea': no structural enforcement
      END CASE;

    EXCEPTION
      WHEN invalid_text_representation
        OR numeric_value_out_of_range
        OR invalid_parameter_value
        OR invalid_datetime_format
      THEN
        RAISE EXCEPTION
          'Parameter "%" has an invalid value for type "%": %',
          vp."key", vp."type", left(v_raw, 200)
          USING ERRCODE = 'check_violation';
    END;
  END LOOP;
END;
$_$;


ALTER FUNCTION "lenses"."fn_validate_inputs"("p_version_id" "uuid", "p_inputs" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "lenses"."fn_validate_inputs"("p_version_id" "uuid", "p_inputs" "jsonb") IS 'GRASP Information Expert: validates execution inputs against the declared version_parameters for a given lens version. Supports types: text, textarea, number, integer, float, decimal, boolean, json, select, url (regex + scheme allowlist), date, datetime, file (UUID + caller-owned media.objects row). Enforces validation_schema jsonb for min/max (numeric) and urlScheme (url). Called by execution.fn_run_lens. SECURITY DEFINER.';



CREATE OR REPLACE FUNCTION "lenses"."trg_accumulate_node_cost_fn"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses'
    AS $$
DECLARE
  v_run_id uuid;
BEGIN
  -- Only act when status transitions to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN
    v_run_id := NEW.run_id;

    -- Atomically increment spent_credits and update cost_metadata
    UPDATE lenses.workflow_runs
    SET
      spent_credits = spent_credits + NEW.cost_credits,
      cost_metadata = cost_metadata || jsonb_build_object(
        NEW.node_id::text,
        jsonb_build_object(
          'input_tokens', NEW.input_tokens,
          'output_tokens', NEW.output_tokens,
          'cost_credits', NEW.cost_credits
        )
      )
    WHERE id = v_run_id;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "lenses"."trg_accumulate_node_cost_fn"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lenses"."trg_block_parameters_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'lenses'
    AS $$
BEGIN
  RAISE EXCEPTION
    'lenses.parameters is deprecated and no longer accepts new rows. '
    'Use lenses.version_parameters instead. '
    'See migration 20260323120002.';
END;
$$;


ALTER FUNCTION "lenses"."trg_block_parameters_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lenses"."trg_cleanup_lens_content_refs"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  PERFORM "content"."fn_cleanup_entity_refs"('lens'::"content"."entity_type_enum", OLD."id");
  RETURN OLD;
END;
$$;


ALTER FUNCTION "lenses"."trg_cleanup_lens_content_refs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lenses"."trg_steps_sync_lens_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'public'
    AS $$
BEGIN
  -- If version_id is set and lens_id is NULL, derive lens_id from the version row
  IF NEW."version_id" IS NOT NULL AND NEW."lens_id" IS NULL THEN
    SELECT "lens_id"
    INTO   NEW."lens_id"
    FROM   "lenses"."versions"
    WHERE  "id" = NEW."version_id";
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "lenses"."trg_steps_sync_lens_id"() OWNER TO "postgres";


COMMENT ON FUNCTION "lenses"."trg_steps_sync_lens_id"() IS 'GRASP Low Coupling: auto-populates the deprecated lens_id column from version_id to prevent NULL violations in legacy code paths. Once lens_id is dropped, this trigger can be dropped too.';



CREATE OR REPLACE FUNCTION "lenses"."trg_workflow_edges_acyclic_fn"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses'
    AS $$
BEGIN
  IF NOT lenses.fn_check_dag_acyclic_kahn(NEW.workflow_id) THEN
    RAISE EXCEPTION 'Cycle detected in workflow DAG'
      USING DETAIL = 'Adding this edge would create a cycle in the workflow graph.',
            ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "lenses"."trg_workflow_edges_acyclic_fn"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lenses"."trg_workflow_version_immutable_fn"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF OLD.status = 'published' AND NEW.status = 'published' THEN
    RAISE EXCEPTION 'Cannot modify a published workflow version'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "lenses"."trg_workflow_version_immutable_fn"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "media"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'media', 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "media"."set_updated_at"() OWNER TO "postgres";


ALTER FUNCTION "public"."calculate_credit_cost"("p_model_id" "uuid", "p_input_tokens" bigint, "p_output_tokens" bigint, "p_units" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."custom_access_token_hook"("event" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'lensers', 'public'
    AS $$
DECLARE
  v_lenser_id uuid;
  v_claims    jsonb;
BEGIN
  v_claims := event -> 'claims';

  SELECT id INTO v_lenser_id
  FROM lensers.profiles
  WHERE user_id = (event ->> 'user_id')::uuid
    AND type    = 'human'
  LIMIT 1;

  IF v_lenser_id IS NOT NULL THEN
    v_claims := jsonb_set(v_claims, '{lenser_id}', to_jsonb(v_lenser_id));
  END IF;

  RETURN jsonb_set(event, '{claims}', v_claims);
END;
$$;


ALTER FUNCTION "public"."custom_access_token_hook"("event" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") IS 'Supabase custom access token hook. Embeds lenser_id (human profile UUID) into JWT claims. Register in Dashboard → Auth → Hooks → Custom Access Token.';



CREATE OR REPLACE FUNCTION "public"."fn_accept_follow_request"("p_source_profile_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'auth'
    AS $$
DECLARE
  v_target_id uuid;
BEGIN
  SELECT id INTO v_target_id
  FROM lensers.profiles WHERE user_id = auth.uid();

  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE lensers.relationships
  SET status = 'accepted',
      responded_at = now(),
      accepted_at  = now()
  WHERE source_profile_id = p_source_profile_id
    AND target_profile_id = v_target_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'no_pending_request');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;


ALTER FUNCTION "public"."fn_accept_follow_request"("p_source_profile_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_agent_adapters_register"("p_name" "text", "p_adapter_type" "text", "p_config" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agents', 'lensers'
    AS $$
DECLARE
    v_lenser_id  uuid;
    v_adapter_id uuid;
BEGIN
    v_lenser_id := lensers.get_auth_lenser_id();
    IF v_lenser_id IS NULL THEN
        RAISE EXCEPTION 'NOT_AUTHENTICATED';
    END IF;

    INSERT INTO agents.adapters (owner_lenser_id, name, adapter_type, config)
    VALUES (v_lenser_id, p_name, p_adapter_type, p_config)
    RETURNING id INTO v_adapter_id;

    RETURN v_adapter_id;
END;
$$;


ALTER FUNCTION "public"."fn_agent_adapters_register"("p_name" "text", "p_adapter_type" "text", "p_config" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_agent_adapters_remove"("p_adapter_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agents', 'lensers'
    AS $$
DECLARE
    v_lenser_id uuid;
BEGIN
    v_lenser_id := lensers.get_auth_lenser_id();
    IF v_lenser_id IS NULL THEN
        RAISE EXCEPTION 'NOT_AUTHENTICATED';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM agents.adapters
        WHERE id = p_adapter_id AND owner_lenser_id = v_lenser_id
    ) THEN
        RAISE EXCEPTION 'NOT_FOUND_OR_FORBIDDEN';
    END IF;

    UPDATE agents.adapters
    SET is_active = false, updated_at = now()
    WHERE id = p_adapter_id AND owner_lenser_id = v_lenser_id;
END;
$$;


ALTER FUNCTION "public"."fn_agent_adapters_remove"("p_adapter_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_ai_get_generations_for_lens"("p_lens_id" "uuid", "p_lenser_id" "uuid", "p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0, "p_media_kind" "text" DEFAULT NULL::"text", "p_ai_model_slug" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "ai_model_slug" "text", "lens_id" "uuid", "input_text" "text", "input_params" "jsonb", "output_type" "text", "visibility" "content"."visibility_enum", "created_at" timestamp with time zone, "original_chat_url" "text", "media" "jsonb")
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'ai', 'content', 'lensers', 'auth'
    AS $$
  select
    g.id,
    m.slug as ai_model_slug,
    g.lens_id,
    g.input_text,
    g.input_params,
    g.output_type,
    g.visibility,
    g.created_at,
    g.original_chat_url,
    jsonb_build_object(
      'id', ml.id,
      'url', ml.url,
      'storage_bucket', ml.storage_bucket,
      'file_name', ml.file_name,
      'display_name', ml.display_name,
      'mime_type', ml.mime_type,
      'extension', ml.extension,
      'size_bytes', ml.size_bytes,
      'width', ml.width,
      'height', ml.height,
      'duration_seconds', ml.duration_seconds,
      'media_kind', ml.media_kind,
      'source', ml.source,
      'meta', ml.meta,
      'created_at', ml.created_at
    ) as media
  from ai.generations g
  join ai.models m
    on m.id = g.ai_model_id
  join content.media_library ml
    on ml.id = g.media_id
  where
    g.lens_id = p_lens_id
    and g.lenser_id = p_lenser_id
    and (p_ai_model_slug is null or m.slug = p_ai_model_slug)
    and (p_media_kind is null or ml.media_kind = p_media_kind)
  order by g.created_at desc
  limit p_limit
  offset p_offset;
$$;


ALTER FUNCTION "public"."fn_ai_get_generations_for_lens"("p_lens_id" "uuid", "p_lenser_id" "uuid", "p_limit" integer, "p_offset" integer, "p_media_kind" "text", "p_ai_model_slug" "text") OWNER TO "postgres";


ALTER FUNCTION "public"."fn_analytics_product_feedback_list_user_paginated"("p_offset" integer, "p_limit" integer) OWNER TO "postgres";


ALTER FUNCTION "public"."fn_analytics_share_events_log"("p_short_id" "text", "p_event_type" "text", "p_ip_hash" "text", "p_user_agent" "text", "p_referer" "text", "p_country" "text", "p_city" "text") OWNER TO "postgres";


ALTER FUNCTION "public"."fn_analytics_shared_links_consume"("p_short_id" "text") OWNER TO "postgres";


ALTER FUNCTION "public"."fn_analytics_shared_links_create"("p_resource_type" "text", "p_resource_id" "text", "p_slug" "text", "p_channel" "text", "p_meta" "jsonb", "p_display_name" "text", "p_expires_at" timestamp with time zone, "p_max_uses" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_analytics_shared_links_create"("p_resource_type" "text", "p_resource_id" "text", "p_slug" "text", "p_channel" "text", "p_meta" "jsonb", "p_display_name" "text", "p_expires_at" timestamp with time zone, "p_max_uses" integer) IS 'Creates a shared or invitation link. Supports group_invite, org_member_invite, and battle_invite resource types. Added p_expires_at and p_max_uses in migration 000030. 6-param overload removed in migration 000054 to resolve PostgREST 42725 ambiguity. SECURITY DEFINER — rate-limited to 100 links/hour per lenser.';



ALTER FUNCTION "public"."fn_analytics_shared_links_get"("p_short_id" "text") OWNER TO "postgres";


ALTER FUNCTION "public"."fn_analytics_submit_feedback"("p_product_tag" "text", "p_page" "text", "p_message" "text", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) OWNER TO "postgres";


ALTER FUNCTION "public"."fn_analytics_submit_feedback_public"("p_product_tag" "text", "p_page" "text", "p_message" "text", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_analytics_submit_feedback_public"("p_product_tag" "text", "p_page" "text", "p_message" "text", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) IS 'Public (anon-accessible) feedback submission. Captures auth.uid() when authenticated. Rate-limits authenticated callers to 5/hour. Anon rate-limiting is handled client-side.';



ALTER FUNCTION "public"."fn_auth_approve_device_request"("p_user_code" "text") OWNER TO "postgres";


ALTER FUNCTION "public"."fn_auth_exchange_device_approval"("p_request_id" "uuid", "p_request_secret" "text") OWNER TO "postgres";


ALTER FUNCTION "public"."fn_auth_exchange_device_login"("p_request_id" "uuid", "p_request_secret" "text") OWNER TO "postgres";


ALTER FUNCTION "public"."fn_auth_list_developer_tokens"() OWNER TO "postgres";


ALTER FUNCTION "public"."fn_auth_request_device_approval"("p_label" "text", "p_request_ttl_minutes" integer, "p_token_ttl_hours" integer) OWNER TO "postgres";


ALTER FUNCTION "public"."fn_auth_request_device_login"("p_request_ttl_minutes" integer) OWNER TO "postgres";


ALTER FUNCTION "public"."fn_auth_revoke_developer_token"("p_token_id" "uuid") OWNER TO "postgres";


ALTER FUNCTION "public"."fn_auth_store_device_login_session"("p_user_code" "text", "p_access_token" "text", "p_refresh_token" "text") OWNER TO "postgres";


ALTER FUNCTION "public"."fn_battle_close_voting"("p_battle_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_battle_close_voting"("p_battle_id" "uuid") IS 'Transitions a battle from voting to scoring. Sets voting_closes_at = now(). Only callable by the battle creator. SECURITY DEFINER.';



ALTER FUNCTION "public"."fn_battle_open_voting"("p_battle_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_battle_open_voting"("p_battle_id" "uuid") IS 'Transitions a battle from open to voting. Requires at least 2 accepted contenders. Sets voting_opens_at = now(). Only callable by the battle creator. SECURITY DEFINER.';



ALTER FUNCTION "public"."fn_battles_archive"("p_battle_id" "uuid") OWNER TO "postgres";


ALTER FUNCTION "public"."fn_battles_clone"("p_battle_id" "uuid", "p_title" "text", "p_slug" "text") OWNER TO "postgres";


ALTER FUNCTION "public"."fn_battles_close"("p_battle_id" "uuid") OWNER TO "postgres";


ALTER FUNCTION "public"."fn_battles_create"("p_title" "text", "p_slug" "text", "p_task_prompt" "text", "p_rubric_id" "uuid") OWNER TO "postgres";


ALTER FUNCTION "public"."fn_battles_create_from_template"("p_template_id" "uuid", "p_title" "text", "p_slug" "text") OWNER TO "postgres";


ALTER FUNCTION "public"."fn_battles_delete"("p_battle_id" "uuid") OWNER TO "postgres";


ALTER FUNCTION "public"."fn_battles_finalize"("p_battle_id" "uuid") OWNER TO "postgres";


ALTER FUNCTION "public"."fn_battles_get_public"("p_battle_id" "uuid") OWNER TO "postgres";


ALTER FUNCTION "public"."fn_battles_invite"("p_battle_id" "uuid", "p_email" "text") OWNER TO "postgres";


ALTER FUNCTION "public"."fn_battles_join"("p_battle_id" "uuid") OWNER TO "postgres";


ALTER FUNCTION "public"."fn_battles_leaderboard"("p_battle_id" "uuid") OWNER TO "postgres";


ALTER FUNCTION "public"."fn_battles_list_public"("p_limit" integer, "p_offset" integer) OWNER TO "postgres";


ALTER FUNCTION "public"."fn_battles_open"("p_battle_id" "uuid") OWNER TO "postgres";


ALTER FUNCTION "public"."fn_battles_publish"("p_battle_id" "uuid") OWNER TO "postgres";


ALTER FUNCTION "public"."fn_battles_retract"("p_battle_id" "uuid") OWNER TO "postgres";


ALTER FUNCTION "public"."fn_battles_start_voting"("p_battle_id" "uuid", "p_voting_closes_at" timestamp with time zone) OWNER TO "postgres";


ALTER FUNCTION "public"."fn_battles_submit"("p_battle_id" "uuid", "p_content_text" "text", "p_content_url" "text", "p_content_media" "jsonb") OWNER TO "postgres";


ALTER FUNCTION "public"."fn_battles_submit"("p_battle_id" "uuid", "p_content_text" "text", "p_content_url" "text", "p_content_media" "jsonb", "p_execution_run_id" "uuid", "p_artifact_id" "uuid", "p_source_type" "text", "p_adapter_id" "uuid", "p_model_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_block_profile"("p_target_profile_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'auth'
    AS $$
DECLARE
  v_source_id uuid;
BEGIN
  SELECT id INTO v_source_id
  FROM lensers.profiles WHERE user_id = auth.uid();

  IF v_source_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_source_id = p_target_profile_id THEN
    RAISE EXCEPTION 'Cannot block yourself';
  END IF;

  -- Upsert block
  INSERT INTO lensers.relationships (source_profile_id, target_profile_id, status)
  VALUES (v_source_id, p_target_profile_id, 'blocked')
  ON CONFLICT (source_profile_id, target_profile_id)
  DO UPDATE SET status = 'blocked', removed_at = now();

  -- Remove their follow of us if it exists
  UPDATE lensers.relationships
  SET status = 'removed', removed_at = now()
  WHERE source_profile_id = p_target_profile_id
    AND target_profile_id = v_source_id
    AND status = 'accepted';

  RETURN jsonb_build_object('blocked', true);
END;
$$;


ALTER FUNCTION "public"."fn_block_profile"("p_target_profile_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_cancel_account_deletion_on_login"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'auth'
    AS $$
DECLARE
  v_uid uuid;
  v_profile RECORD;
  v_event_type text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('restored', false, 'reason', 'not_authenticated');
  END IF;

  SELECT id, user_id, status, deletion_deadline_at, deletion_requested_at
  INTO v_profile
  FROM lensers.profiles
  WHERE user_id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('restored', false, 'reason', 'no_profile');
  END IF;

  IF v_profile.status = 'pending_deletion'
     AND (v_profile.deletion_deadline_at IS NULL OR v_profile.deletion_deadline_at > now()) THEN
    UPDATE lensers.profiles
    SET status = 'active',
        deletion_requested_at = null,
        deletion_deadline_at = null,
        updated_at = now()
    WHERE id = v_profile.id;

    PERFORM lensers.log_account_lifecycle_event(
      v_profile.id,
      v_profile.user_id,
      'restored_from_pending_deletion',
      v_profile.status,
      'active'::lensers.lenser_status,
      'signin_restore',
      jsonb_build_object(
        'restored_before_deadline', true,
        'deletion_deadline_at', v_profile.deletion_deadline_at
      )
    );

    RETURN jsonb_build_object('restored', true, 'from_status', 'pending_deletion');
  END IF;

  IF (
    v_profile.status = 'deactivated' OR
    (v_profile.status = 'active' AND v_profile.deletion_requested_at IS NOT NULL)
  ) AND (
    v_profile.deletion_deadline_at IS NULL OR v_profile.deletion_deadline_at > now()
  ) THEN
    UPDATE lensers.profiles
    SET status = 'active',
        deletion_requested_at = null,
        deletion_deadline_at = null,
        updated_at = now()
    WHERE id = v_profile.id;

    v_event_type := CASE
      WHEN v_profile.status = 'active' THEN 'restored_from_pending_deletion'
      ELSE 'restored_from_deactivated'
    END;

    PERFORM lensers.log_account_lifecycle_event(
      v_profile.id,
      v_profile.user_id,
      v_event_type,
      v_profile.status,
      'active'::lensers.lenser_status,
      'signin_restore',
      jsonb_build_object(
        'restored_before_deadline', true,
        'deletion_deadline_at', v_profile.deletion_deadline_at,
        'cleared_stale_deletion_flags', v_profile.status = 'active'
      )
    );

    RETURN jsonb_build_object('restored', true, 'from_status', v_profile.status);
  END IF;

  RETURN jsonb_build_object('restored', false, 'reason', 'no_action_needed');
END;
$$;


ALTER FUNCTION "public"."fn_cancel_account_deletion_on_login"() OWNER TO "postgres";


ALTER FUNCTION "public"."fn_clone_workflow"("p_source_workflow_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_clone_workflow"("p_source_workflow_id" "uuid") IS 'Clones a public workflow including nodes (with config), edges, and XP awards. Returns the new workflow row.';



CREATE OR REPLACE FUNCTION "public"."fn_content_create_thread"("p_title" "text", "p_content" "text", "p_visibility" "content"."visibility_enum", "p_tag_ids" "uuid"[] DEFAULT '{}'::"uuid"[]) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'content', 'lensers', 'auth'
    AS $$
DECLARE
  v_lenser_id uuid;
  v_thread_id uuid;
  v_lang      text := 'en';
BEGIN
  v_lenser_id := lensers.get_auth_lenser_id();
  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated or no active lenser profile';
  END IF;

  SELECT coalesce(lp.language, 'en')
  INTO v_lang
  FROM lensers.preferences lp
  WHERE lp.lenser_id = v_lenser_id;

  INSERT INTO content.threads (lenser_id, visibility)
  VALUES (v_lenser_id, p_visibility)
  RETURNING id INTO v_thread_id;

  INSERT INTO content.entity_translations (
    entity_type, entity_id, language_code, is_original, title, content
  ) VALUES (
    'thread', v_thread_id, v_lang, true, p_title, p_content
  );

  IF p_tag_ids IS NOT NULL AND array_length(p_tag_ids, 1) > 0 THEN
    INSERT INTO content.tag_map (entity_type, entity_id, tag_id)
    SELECT 'thread', v_thread_id, unnest(p_tag_ids)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_thread_id;
END;
$$;


ALTER FUNCTION "public"."fn_content_create_thread"("p_title" "text", "p_content" "text", "p_visibility" "content"."visibility_enum", "p_tag_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_content_follow_tag"("p_tag_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'content', 'auth'
    AS $$
DECLARE
  v_lenser_id uuid;
BEGIN
  SELECT id INTO v_lenser_id
  FROM lensers.profiles
  WHERE user_id = auth.uid();

  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required or profile not found';
  END IF;

  -- Verify the tag is public
  IF NOT EXISTS (
    SELECT 1 FROM content.tags
    WHERE id = p_tag_id AND visibility = 'public'::"content"."tag_visibility_enum"
  ) THEN
    RAISE EXCEPTION 'Tag not found';
  END IF;

  INSERT INTO lensers.tag_follows (lenser_id, tag_id)
  VALUES (v_lenser_id, p_tag_id)
  ON CONFLICT (lenser_id, tag_id) DO NOTHING;

  RETURN jsonb_build_object('following', true);
END;
$$;


ALTER FUNCTION "public"."fn_content_follow_tag"("p_tag_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_content_get_followed_tags"("p_lenser_id" "uuid") RETURNS TABLE("tag_id" "uuid", "slug" "text", "name" "text", "followed_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'content'
    AS $$
  SELECT
    t.id,
    t.slug,
    COALESCE(
      tt_pref.name,   -- preferred language first
      tt_en.name,     -- English fallback
      t.slug          -- final fallback: slug
    ) AS name,
    tf.created_at AS followed_at
  FROM lensers.tag_follows tf
  JOIN content.tags t ON t.id = tf.tag_id
  LEFT JOIN content.tag_translations tt_en
    ON tt_en.tag_id = t.id AND tt_en.language_code = 'en'
  LEFT JOIN content.tag_translations tt_pref
    ON tt_pref.tag_id = t.id
    AND tt_pref.language_code = (
      SELECT lp.language
      FROM lensers.preferences lp
      WHERE lp.lenser_id = p_lenser_id
    )
  WHERE tf.lenser_id = p_lenser_id
    AND t.visibility = 'public'::"content"."tag_visibility_enum"
  ORDER BY tf.created_at DESC;
$$;


ALTER FUNCTION "public"."fn_content_get_followed_tags"("p_lenser_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_content_get_following_lenses"("p_lenser_id" "uuid", "p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "author_profile" "jsonb", "tags" "jsonb", "reaction_totals" "jsonb", "title" "text", "description" "text", "created_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'lenses', 'lensers'
    AS $$
WITH current_lenser AS (
  SELECT p.id
  FROM lensers.profiles p
  WHERE p.user_id = auth.uid()
    AND p.id = p_lenser_id
  LIMIT 1
),
followed_authors AS (
  SELECT DISTINCT r.target_profile_id AS lenser_id
  FROM lensers.relationships r
  WHERE r.source_profile_id = (SELECT id FROM current_lenser)
    AND r.status = 'accepted'
)
SELECT
  v.id,
  v.author_profile,
  v.tags,
  v.reaction_totals,
  v.title,
  v.description,
  v.created_at
FROM public.vw_lenses_public v
JOIN followed_authors fa ON fa.lenser_id = v.lenser_id
ORDER BY v.created_at DESC
LIMIT GREATEST(LEAST(p_limit, 50), 0)
OFFSET GREATEST(p_offset, 0);
$$;


ALTER FUNCTION "public"."fn_content_get_following_lenses"("p_lenser_id" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_content_get_following_lenses"("p_lenser_id" "uuid", "p_limit" integer, "p_offset" integer) IS 'Returns public lenses authored by lensers the current viewer follows. SECURITY DEFINER and auth-scoped.';



CREATE OR REPLACE FUNCTION "public"."fn_content_get_following_threads"("p_lenser_id" "uuid", "p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "hot_score" double precision, "primary_language" "text", "author_profile" "jsonb", "tags" "jsonb", "reaction_totals" "jsonb", "title" "text", "content" "text", "reply_count" integer, "created_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'content', 'lensers'
    AS $$
WITH current_lenser AS (
  SELECT p.id
  FROM lensers.profiles p
  WHERE p.user_id = auth.uid()
    AND p.id = p_lenser_id
  LIMIT 1
),
followed_authors AS (
  SELECT DISTINCT r.target_profile_id AS lenser_id
  FROM lensers.relationships r
  WHERE r.source_profile_id = (SELECT id FROM current_lenser)
    AND r.status = 'accepted'
)
SELECT
  v.id,
  log(GREATEST(1,
    2.0 * COALESCE(v.like_count, 0)
    + 3.0 * COALESCE(v.reply_count, 0)
    + 0.5 * COALESCE(v.view_count, 0)
  )) / pow(EXTRACT(epoch FROM (now() - v.created_at)) / 3600.0 + 2, 1.5) AS hot_score,
  et.language_code AS primary_language,
  v.author_profile,
  v.tags,
  v.reaction_totals,
  v.title,
  v.content,
  v.reply_count,
  v.created_at
FROM public.vw_content_threads_public v
JOIN followed_authors fa ON fa.lenser_id = v.lenser_id
LEFT JOIN content.entity_translations et
  ON et.entity_id = v.id
 AND et.entity_type = 'thread'::content.entity_type_enum
 AND et.is_original = true
ORDER BY v.created_at DESC
LIMIT GREATEST(LEAST(p_limit, 50), 0)
OFFSET GREATEST(p_offset, 0);
$$;


ALTER FUNCTION "public"."fn_content_get_following_threads"("p_lenser_id" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_content_get_following_threads"("p_lenser_id" "uuid", "p_limit" integer, "p_offset" integer) IS 'Returns public threads authored by lensers the current viewer follows. SECURITY DEFINER and auth-scoped.';



CREATE OR REPLACE FUNCTION "public"."fn_content_get_lenses_by_tag"("p_tag_slug" "text", "p_sort" "text" DEFAULT 'newest'::"text", "p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "lenser_id" "uuid", "visibility" "content"."visibility_enum", "title" "text", "description" "text", "author_profile" "jsonb", "reaction_totals" "jsonb", "copy_count" integer, "like_count" integer, "saved_count" integer, "tags" "jsonb", "created_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'content', 'lensers'
    AS $$
  WITH matched_ids AS (
    SELECT DISTINCT tm.entity_id AS prompt_id
    FROM content.tag_map tm
    JOIN content.tags tg ON tg.id = tm.tag_id AND tg.slug = p_tag_slug
    WHERE tm.entity_type = 'lens'
    LIMIT 1000
  )
  SELECT
    v.id, v.lenser_id, v.visibility, v.title, v.description,
    v.author_profile, v.reaction_totals, v.copy_count, v.like_count,
    v.saved_count, v.tags, v.created_at
  FROM matched_ids m
  JOIN public.vw_lenses_public v ON v.id = m.prompt_id
  ORDER BY
    CASE WHEN p_sort = 'newest' THEN v.created_at END DESC,
    CASE WHEN p_sort IN ('trending', 'popular') THEN v.copy_count END DESC NULLS LAST,
    CASE WHEN p_sort IN ('trending', 'popular') THEN v.like_count END DESC NULLS LAST
  LIMIT  LEAST(p_limit, 50)
  OFFSET GREATEST(p_offset, 0);
$$;


ALTER FUNCTION "public"."fn_content_get_lenses_by_tag"("p_tag_slug" "text", "p_sort" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_content_get_personal_lenses"("p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "personal_score" double precision, "hot_score" double precision, "primary_language" "text", "author_profile" "jsonb", "tags" "jsonb", "reaction_totals" "jsonb", "title" "text", "description" "text", "created_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'lenses', 'content', 'lensers', 'auth'
    AS $$
WITH
  current_lenser AS (
    SELECT p.id, COALESCE(lp.language, 'en') AS preferred_language, p.user_id
    FROM lensers.profiles p
    LEFT JOIN lensers.preferences lp ON lp.lenser_id = p.id
    WHERE p.user_id = auth.uid()
    LIMIT 1
  ),
  interest_tags AS (
    SELECT tf.tag_id
    FROM lensers.tag_follows tf
    WHERE tf.lenser_id = (SELECT id FROM current_lenser)
    UNION
    SELECT xcl.equivalent_tag_id
    FROM lensers.tag_follows tf
    JOIN content.vw_tag_cross_lang xcl ON xcl.source_tag_id = tf.tag_id
    WHERE tf.lenser_id = (SELECT id FROM current_lenser)
    UNION
    SELECT DISTINCT tm.tag_id
    FROM content.reactions r
    JOIN lenses.lenses   pt2 ON pt2.id = r.entity_id
    JOIN content.tag_map tm  ON tm.entity_id = pt2.id AND tm.entity_type = 'lens'
    WHERE r.entity_type = 'lens'
      AND r.lenser_id   = (SELECT user_id FROM current_lenser)
      AND r.created_at  > now() - interval '30 days'
  ),
  candidates AS (
    SELECT pt.id, pt.created_at, pt.lenser_id
    FROM lenses.lenses pt
    WHERE pt.visibility = 'public'
      AND pt.status     = 'published'
      AND (SELECT id FROM current_lenser) IS NOT NULL
    ORDER BY pt.created_at DESC
    LIMIT 5000
  ),
  reaction_agg AS (
    SELECT r.entity_id AS prompt_id,
      COUNT(*) FILTER (WHERE r.reaction = 'copy':: content.reaction_enum) AS copy_count,
      COUNT(*) FILTER (WHERE r.reaction = 'like':: content.reaction_enum) AS like_count,
      COUNT(*) FILTER (WHERE r.reaction = 'saved'::content.reaction_enum) AS saved_count
    FROM content.reactions r
    WHERE r.entity_type = 'lens'
      AND r.entity_id IN (SELECT id FROM candidates)
    GROUP BY r.entity_id
  ),
  preliminary_scores AS (
    SELECT
      c.id,
      c.lenser_id,
      et.language_code AS primary_language,
      log(GREATEST(1,
        4.0 * COALESCE(r.copy_count,  0)
      + 2.0 * COALESCE(r.like_count,  0)
      + 1.0 * COALESCE(r.saved_count, 0)
      )) / pow(EXTRACT(epoch FROM now() - c.created_at) / 3600.0 + 2, 1.5) AS hot_score,
      (
        0.30 * COALESCE((
          SELECT COUNT(*)::float / GREATEST((SELECT COUNT(*) FROM interest_tags), 1)
          FROM content.tag_map tm
          JOIN interest_tags it ON it.tag_id = tm.tag_id
          WHERE tm.entity_type = 'lens' AND tm.entity_id = c.id
        ), 0.0)
        + 0.25 * CASE
            WHEN et.language_code = (SELECT preferred_language FROM current_lenser) THEN 1.0
            ELSE 0.0
          END
        + 0.20 * LEAST(
            log(GREATEST(1,
              4.0 * COALESCE(r.copy_count,  0)
            + 2.0 * COALESCE(r.like_count,  0)
            + 1.0 * COALESCE(r.saved_count, 0)
            )) / pow(EXTRACT(epoch FROM now() - c.created_at) / 3600.0 + 2, 1.5)
            / 2.0, 1.0)
        + 0.10 * CASE WHEN fa.target_profile_id IS NOT NULL THEN 1.0 ELSE 0.0 END
      ) AS preliminary_score
    FROM candidates c
    LEFT JOIN reaction_agg r ON r.prompt_id = c.id
    LEFT JOIN content.entity_translations et
           ON et.entity_id   = c.id
          AND et.entity_type = 'lens'
          AND et.is_original = true
    LEFT JOIN lensers.relationships fa
           ON fa.source_profile_id = (SELECT id FROM current_lenser)
          AND fa.target_profile_id = c.lenser_id
          AND fa.status = 'accepted'
    WHERE c.id NOT IN (
      SELECT target_id FROM content.reports
      WHERE target_type = 'lens'::content.entity_type_enum
      GROUP BY target_id HAVING COUNT(DISTINCT reporter_id) >= 3
    )
    ORDER BY preliminary_score DESC
    LIMIT LEAST(p_limit, 50) * 2
  ),
  candidate_scores AS (
    SELECT
      ps.id,
      ps.primary_language,
      ps.hot_score,
      (
        ps.preliminary_score
        + 0.15 * LEAST(COALESCE(ls.lenser_score, 0.0) / 5.0, 1.0)
      ) AS personal_score
    FROM preliminary_scores ps
    LEFT JOIN lensers.vw_lensers_score ls ON ls.lenser_id = ps.lenser_id
    ORDER BY personal_score DESC
    LIMIT  LEAST(p_limit,  50)
    OFFSET GREATEST(p_offset, 0)
  )
SELECT
  v.id, c.personal_score, c.hot_score, c.primary_language,
  v.author_profile, v.tags, v.reaction_totals, v.title, v.description, v.created_at
FROM candidate_scores c
JOIN public.vw_lenses_public v ON v.id = c.id
ORDER BY c.personal_score DESC;
$$;


ALTER FUNCTION "public"."fn_content_get_personal_lenses"("p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_content_get_personal_threads"("p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "personal_score" double precision, "hot_score" double precision, "primary_language" "text", "author_profile" "jsonb", "tags" "jsonb", "reaction_totals" "jsonb", "title" "text", "content" "text", "reply_count" integer, "created_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'content', 'lensers'
    AS $$
WITH
  current_lenser AS (
    SELECT p.id, COALESCE(lp.language, 'en') AS preferred_language, p.user_id
    FROM lensers.profiles p
    LEFT JOIN lensers.preferences lp ON lp.lenser_id = p.id
    WHERE p.user_id = auth.uid()
    LIMIT 1
  ),
  interest_tags AS (
    SELECT tf.tag_id
    FROM lensers.tag_follows tf
    WHERE tf.lenser_id = (SELECT id FROM current_lenser)
    UNION
    SELECT xcl.equivalent_tag_id
    FROM lensers.tag_follows tf
    JOIN content.vw_tag_cross_lang xcl ON xcl.source_tag_id = tf.tag_id
    WHERE tf.lenser_id = (SELECT id FROM current_lenser)
    UNION
    SELECT DISTINCT tm.tag_id
    FROM content.reactions r
    JOIN content.threads t2 ON t2.id = r.entity_id
    JOIN content.tag_map  tm ON tm.entity_id = t2.id AND tm.entity_type = 'thread'
    WHERE r.entity_type = 'thread'
      AND r.lenser_id   = (SELECT user_id FROM current_lenser)
      AND r.created_at  > now() - interval '30 days'
  ),
  candidates AS (
    SELECT t.id, t.created_at, t.lenser_id, t.reply_count, t.view_count
    FROM content.threads t
    WHERE t.visibility = 'public'
      AND t.status     = 'published'
      AND (SELECT id FROM current_lenser) IS NOT NULL
    ORDER BY t.created_at DESC
    LIMIT 5000
  ),
  reaction_agg AS (
    SELECT r.entity_id AS thread_id,
      count(*) FILTER (WHERE r.reaction = 'like'::content.reaction_enum) AS like_count
    FROM content.reactions r
    WHERE r.entity_type = 'thread'
      AND r.entity_id IN (SELECT id FROM candidates)
    GROUP BY r.entity_id
  ),
  preliminary_scores AS (
    SELECT
      c.id,
      c.lenser_id,
      c.reply_count,
      et.language_code AS primary_language,
      log(greatest(1,
        2.0 * coalesce(r.like_count, 0)
      + 3.0 * c.reply_count
      + 0.5 * c.view_count
      )) / pow(extract(epoch from (now() - c.created_at)) / 3600.0 + 2, 1.5) AS hot_score,
      (
        0.30 * COALESCE((
          SELECT COUNT(*)::float / GREATEST((SELECT COUNT(*) FROM interest_tags), 1)
          FROM content.tag_map tm
          JOIN interest_tags it ON it.tag_id = tm.tag_id
          WHERE tm.entity_type = 'thread' AND tm.entity_id = c.id
        ), 0.0)
        + 0.25 * CASE
            WHEN et.language_code = (SELECT preferred_language FROM current_lenser) THEN 1.0
            ELSE 0.0
          END
        + 0.20 * LEAST(
            log(greatest(1,
              2.0 * coalesce(r.like_count, 0)
            + 3.0 * c.reply_count
            + 0.5 * c.view_count
            )) / pow(extract(epoch from (now() - c.created_at)) / 3600.0 + 2, 1.5)
            / 2.0, 1.0)
        + 0.10 * CASE WHEN fa.target_profile_id IS NOT NULL THEN 1.0 ELSE 0.0 END
      ) AS preliminary_score
    FROM candidates c
    LEFT JOIN reaction_agg r ON r.thread_id = c.id
    LEFT JOIN content.entity_translations et
           ON et.entity_id   = c.id
          AND et.entity_type = 'thread'
          AND et.is_original = true
    LEFT JOIN lensers.relationships fa
           ON fa.source_profile_id = (SELECT id FROM current_lenser)
          AND fa.target_profile_id = c.lenser_id
          AND fa.status = 'accepted'
    WHERE c.id NOT IN (
      SELECT target_id FROM content.reports
      WHERE target_type = 'thread'::content.entity_type_enum
      GROUP BY target_id HAVING COUNT(DISTINCT reporter_id) >= 3
    )
    ORDER BY preliminary_score DESC
    LIMIT LEAST(p_limit, 50) * 2
  ),
  scored AS (
    SELECT
      ps.id,
      ps.primary_language,
      ps.reply_count,
      ps.hot_score,
      (
        ps.preliminary_score
        + 0.15 * LEAST(COALESCE(ls.lenser_score, 0.0) / 5.0, 1.0)
      ) AS personal_score
    FROM preliminary_scores ps
    LEFT JOIN lensers.vw_lensers_score ls ON ls.lenser_id = ps.lenser_id
    ORDER BY personal_score DESC
    LIMIT  LEAST(p_limit, 50)
    OFFSET GREATEST(p_offset, 0)
  )
SELECT v.id, s.personal_score, s.hot_score, s.primary_language,
  v.author_profile, v.tags, v.reaction_totals, v.title, v.content, s.reply_count, v.created_at
FROM scored s
JOIN public.vw_content_threads_public v ON v.id = s.id
ORDER BY s.personal_score DESC;
$$;


ALTER FUNCTION "public"."fn_content_get_personal_threads"("p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_content_get_popular_lenses"("p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "lenser_id" "uuid", "visibility" "content"."visibility_enum", "title" "text", "description" "text", "author_profile" "jsonb", "reaction_totals" "jsonb", "copy_count" integer, "like_count" integer, "saved_count" integer, "tags" "jsonb", "created_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'lenses', 'content', 'lensers'
    AS $$
WITH
  candidates AS (
    SELECT pt.id, pt.created_at
    FROM lenses.lenses pt
    WHERE pt.visibility = 'public' AND pt.status = 'published'
    ORDER BY pt.created_at DESC
    LIMIT 5000
  ),
  reaction_agg AS (
    SELECT r.entity_id AS prompt_id,
      COUNT(*) FILTER (WHERE r.reaction = 'copy':: content.reaction_enum) AS copy_count,
      COUNT(*) FILTER (WHERE r.reaction = 'like':: content.reaction_enum) AS like_count,
      COUNT(*) FILTER (WHERE r.reaction = 'saved'::content.reaction_enum) AS saved_count
    FROM content.reactions r
    WHERE r.entity_type = 'lens'
      AND r.entity_id IN (SELECT id FROM candidates)
    GROUP BY r.entity_id
  ),
  ranked AS (
    SELECT
      c.id,
      log(GREATEST(1,
        4.0 * COALESCE(r.copy_count,  0)
      + 2.0 * COALESCE(r.like_count,  0)
      + 1.0 * COALESCE(r.saved_count, 0)
      )) / pow(EXTRACT(epoch FROM now() - c.created_at) / 3600.0 + 2, 1.5) AS hot_score
    FROM candidates c
    LEFT JOIN reaction_agg r ON r.prompt_id = c.id
    ORDER BY hot_score DESC
    LIMIT  LEAST(p_limit,  50)
    OFFSET GREATEST(p_offset, 0)
  )
SELECT
  v.id, v.lenser_id, v.visibility, v.title, v.description,
  v.author_profile, v.reaction_totals, v.copy_count, v.like_count,
  v.saved_count, v.tags, v.created_at
FROM ranked rk
JOIN public.vw_lenses_public v ON v.id = rk.id
ORDER BY rk.hot_score DESC;
$$;


ALTER FUNCTION "public"."fn_content_get_popular_lenses"("p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_content_get_threads_by_tag"("p_tag_slug" "text", "p_sort" "text" DEFAULT 'newest'::"text", "p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "lenser_id" "uuid", "title" "text", "content" "text", "author_profile" "jsonb", "reaction_totals" "jsonb", "like_count" integer, "reply_count" integer, "view_count" integer, "visibility" "content"."visibility_enum", "tags" "jsonb", "created_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'content', 'lensers'
    AS $$
  WITH matched_ids AS (
    SELECT DISTINCT tm.entity_id AS thread_id
    FROM content.tag_map tm
    JOIN content.tags tg ON tg.id = tm.tag_id AND tg.slug = p_tag_slug
    WHERE tm.entity_type = 'thread'
    LIMIT 1000
  )
  SELECT
    v.id, v.lenser_id, v.title, v.content,
    v.author_profile, v.reaction_totals, v.like_count,
    v.reply_count, v.view_count, v.visibility, v.tags, v.created_at
  FROM matched_ids m
  JOIN public.vw_content_threads_public v ON v.id = m.thread_id
  ORDER BY
    CASE WHEN p_sort = 'newest' THEN v.created_at END DESC,
    CASE WHEN p_sort IN ('trending', 'popular') THEN v.like_count END DESC NULLS LAST,
    CASE WHEN p_sort IN ('trending', 'popular') THEN v.reply_count END DESC NULLS LAST
  LIMIT  LEAST(p_limit, 50)
  OFFSET GREATEST(p_offset, 0);
$$;


ALTER FUNCTION "public"."fn_content_get_threads_by_tag"("p_tag_slug" "text", "p_sort" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_content_get_trending_lenses"("p_lang" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "hot_score" double precision, "primary_language" "text", "author_profile" "jsonb", "tags" "jsonb", "reaction_totals" "jsonb", "title" "text", "description" "text", "created_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'lenses', 'content', 'lensers'
    AS $$
WITH
  candidates AS (
    SELECT pt.id, pt.created_at
    FROM lenses.lenses pt
    WHERE pt.visibility = 'public' AND pt.status = 'published'
    ORDER BY pt.created_at DESC
    LIMIT 5000
  ),
  reaction_agg AS (
    SELECT r.entity_id AS prompt_id,
      COUNT(*) FILTER (WHERE r.reaction = 'copy':: content.reaction_enum) AS copy_count,
      COUNT(*) FILTER (WHERE r.reaction = 'like':: content.reaction_enum) AS like_count,
      COUNT(*) FILTER (WHERE r.reaction = 'saved'::content.reaction_enum) AS saved_count
    FROM content.reactions r
    WHERE r.entity_type = 'lens'
      AND r.entity_id IN (SELECT id FROM candidates)
    GROUP BY r.entity_id
  ),
  scored AS (
    SELECT
      c.id,
      log(GREATEST(1,
        4.0 * COALESCE(r.copy_count,  0)
      + 2.0 * COALESCE(r.like_count,  0)
      + 1.0 * COALESCE(r.saved_count, 0)
      )) / pow(EXTRACT(epoch FROM now() - c.created_at) / 3600.0 + 2, 1.5)
        * CASE WHEN p_lang IS NOT NULL AND et.language_code = p_lang THEN 1.5 ELSE 1.0 END
        AS hot_score,
      et.language_code AS primary_language
    FROM candidates c
    LEFT JOIN reaction_agg r ON r.prompt_id = c.id
    LEFT JOIN content.entity_translations et
           ON et.entity_id   = c.id
          AND et.entity_type = 'lens'
          AND et.is_original = true
    ORDER BY hot_score DESC
    LIMIT  LEAST(p_limit,  50)
    OFFSET GREATEST(p_offset, 0)
  )
SELECT v.id, s.hot_score, s.primary_language,
  v.author_profile, v.tags, v.reaction_totals, v.title, v.description, v.created_at
FROM scored s
JOIN public.vw_lenses_public v ON v.id = s.id
ORDER BY s.hot_score DESC;
$$;


ALTER FUNCTION "public"."fn_content_get_trending_lenses"("p_lang" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_content_get_trending_threads"("p_lang" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "hot_score" double precision, "primary_language" "text", "author_profile" "jsonb", "tags" "jsonb", "reaction_totals" "jsonb", "title" "text", "reply_count" integer, "created_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'content', 'lensers'
    AS $$
WITH
  candidates AS (
    SELECT t.id, t.created_at, t.reply_count, t.view_count
    FROM content.threads t
    WHERE t.visibility = 'public' AND t.status = 'published'
    ORDER BY t.created_at DESC
    LIMIT 5000
  ),
  reaction_agg AS (
    SELECT tr.thread_id,
      count(*) FILTER (WHERE tr.reaction = 'like'::content.reaction_enum) AS like_count
    FROM content.thread_reactions tr
    WHERE tr.thread_id IN (SELECT id FROM candidates)
    GROUP BY tr.thread_id
  ),
  scored AS (
    SELECT
      c.id,
      log(greatest(1,
        2.0 * coalesce(r.like_count, 0)
      + 3.0 * c.reply_count
      + 0.5 * c.view_count
      )) / pow(extract(epoch from (now() - c.created_at)) / 3600.0 + 2, 1.5)
        * CASE WHEN p_lang IS NOT NULL AND ttt.language_code = p_lang THEN 1.5 ELSE 1.0 END
        AS hot_score,
      ttt.language_code AS primary_language,
      c.reply_count
    FROM candidates c
    LEFT JOIN reaction_agg r ON r.thread_id = c.id
    LEFT JOIN content.thread_translations ttt ON ttt.thread_id = c.id AND ttt.is_original = true
    ORDER BY hot_score DESC
    LIMIT  LEAST(p_limit,  50)
    OFFSET GREATEST(p_offset, 0)
  )
SELECT v.id, s.hot_score, s.primary_language,
  v.author_profile, v.tags, v.reaction_totals, v.title, s.reply_count, v.created_at
FROM scored s
JOIN public.vw_content_threads_public v ON v.id = s.id
ORDER BY s.hot_score DESC;
$$;


ALTER FUNCTION "public"."fn_content_get_trending_threads"("p_lang" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_content_reactions_get_user_for_target"("p_target_type" "text", "p_target_id" "uuid") RETURNS TABLE("id" "uuid", "target_id" "uuid", "user_id" "uuid", "reaction" "content"."reaction_enum", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'content', 'lensers', 'auth'
    AS $$
DECLARE
    v_lenser_id "uuid";
    v_entity    "content"."entity_type_enum";
BEGIN
    v_lenser_id := "lensers"."get_auth_lenser_id"();
    IF v_lenser_id IS NULL THEN RETURN; END IF;

    IF "p_target_type" NOT IN ('thread', 'thread_reply', 'lens') THEN
        RETURN;
    END IF;

    v_entity := "p_target_type"::"content"."entity_type_enum";

    RETURN QUERY
        SELECT r."id", r."entity_id" AS "target_id", r."lenser_id" AS "user_id", r."reaction", r."created_at"
        FROM "content"."reactions" r
        WHERE r."entity_type" = v_entity
          AND r."entity_id"   = "p_target_id"
          AND r."lenser_id"   = v_lenser_id;
END;
$$;


ALTER FUNCTION "public"."fn_content_reactions_get_user_for_target"("p_target_type" "text", "p_target_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_content_reactions_toggle"("p_target_type" "text", "p_target_id" "uuid", "p_reaction" "content"."reaction_enum") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'content', 'lensers', 'auth'
    AS $$
DECLARE
  v_lenser_id uuid;
  v_added     boolean;
  v_counts    jsonb;
  v_entity    content.entity_type_enum;
BEGIN
  v_lenser_id := lensers.get_auth_lenser_id();
  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_target_type NOT IN ('thread', 'thread_reply', 'lens', 'workflow') THEN
    RAISE EXCEPTION 'Invalid target_type: %', p_target_type;
  END IF;

  v_entity := p_target_type::content.entity_type_enum;

  -- copy reactions are unlimited — always INSERT, never toggle
  IF p_reaction = 'copy'::content.reaction_enum THEN
    INSERT INTO content.reactions (entity_type, entity_id, lenser_id, reaction)
    VALUES (v_entity, p_target_id, v_lenser_id, p_reaction);
    v_added := true;
  ELSE
    -- Toggleable reactions: DELETE if exists, INSERT if absent
    IF EXISTS (
      SELECT 1 FROM content.reactions
      WHERE entity_type = v_entity
        AND entity_id   = p_target_id
        AND lenser_id   = v_lenser_id
        AND reaction    = p_reaction
    ) THEN
      DELETE FROM content.reactions
      WHERE entity_type = v_entity
        AND entity_id   = p_target_id
        AND lenser_id   = v_lenser_id
        AND reaction    = p_reaction;
      v_added := false;
    ELSE
      INSERT INTO content.reactions (entity_type, entity_id, lenser_id, reaction)
      VALUES (v_entity, p_target_id, v_lenser_id, p_reaction);
      v_added := true;
    END IF;
  END IF;

  -- Return updated counts for this entity
  SELECT COALESCE(jsonb_object_agg(reaction, cnt), '{}'::jsonb) INTO v_counts
  FROM (
    SELECT reaction, COUNT(*)::int AS cnt
    FROM content.reactions
    WHERE entity_type = v_entity
      AND entity_id   = p_target_id
    GROUP BY reaction
  ) s;

  RETURN jsonb_build_object('added', v_added, 'counts', v_counts);
END;
$$;


ALTER FUNCTION "public"."fn_content_reactions_toggle"("p_target_type" "text", "p_target_id" "uuid", "p_reaction" "content"."reaction_enum") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_content_report"("p_target_type" "text", "p_target_id" "uuid", "p_reason" "text" DEFAULT 'other'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'content', 'auth'
    AS $$
DECLARE
  v_lenser_id  uuid;
  v_target_type "content"."entity_type_enum";
BEGIN
  SELECT id INTO v_lenser_id
  FROM lensers.profiles
  WHERE user_id = auth.uid();

  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required or profile not found';
  END IF;

  -- Validate target_type against the enum
  BEGIN
    v_target_type := p_target_type::"content"."entity_type_enum";
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Invalid target_type: %', p_target_type;
  END;

  -- Validate and cast reason to enum
  IF p_reason NOT IN ('spam', 'harassment', 'misinformation', 'off_topic', 'other') THEN
    RAISE EXCEPTION 'Invalid reason: %', p_reason;
  END IF;

  -- Cooldown: reject if the same reporter already reported this target within 24 hours
  IF EXISTS (
    SELECT 1 FROM content.reports
    WHERE reporter_id = v_lenser_id
      AND target_type = v_target_type
      AND target_id   = p_target_id
      AND created_at  > NOW() - INTERVAL '24 hours'
  ) THEN
    RAISE EXCEPTION 'rate_limit_exceeded'
      USING DETAIL = 'You have already reported this content recently.',
            ERRCODE = 'P0429';
  END IF;

  INSERT INTO content.reports (reporter_id, target_type, target_id, reason)
  VALUES (v_lenser_id, v_target_type, p_target_id, p_reason::"content"."report_reason_enum")
  ON CONFLICT (reporter_id, target_type, target_id)
  DO UPDATE SET reason = EXCLUDED.reason;

  RETURN jsonb_build_object('reported', true);
END;
$$;


ALTER FUNCTION "public"."fn_content_report"("p_target_type" "text", "p_target_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_content_tags_create"("p_name" "text", "p_slug" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'content', 'public'
    AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RAISE EXCEPTION 'Tag name is required';
  END IF;

  IF p_slug IS NULL OR btrim(p_slug) = '' THEN
    RAISE EXCEPTION 'Tag slug is required';
  END IF;

  INSERT INTO content.tags (slug, visibility)
  VALUES (btrim(p_slug), 'public')
  RETURNING id INTO v_id;

  INSERT INTO content.tag_translations (tag_id, language_code, name)
  VALUES (v_id, 'en', btrim(p_name));

  RETURN v_id;
EXCEPTION
  WHEN unique_violation THEN
    SELECT id INTO v_id
    FROM content.tags
    WHERE slug = p_slug;

    IF v_id IS NOT NULL THEN
      RETURN v_id;
    END IF;

    RAISE;
END;
$$;


ALTER FUNCTION "public"."fn_content_tags_create"("p_name" "text", "p_slug" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_content_tags_get_by_slug"("p_slug" "text") RETURNS TABLE("id" "uuid", "name" "text", "slug" "text", "visibility" "content"."tag_visibility_enum", "created_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'content'
    AS $$
  SELECT t.id, t.name, t.slug, t.visibility, t.created_at
  FROM content.tags t
  WHERE t.slug = p_slug
    AND t.visibility = 'public';
$$;


ALTER FUNCTION "public"."fn_content_tags_get_by_slug"("p_slug" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_content_unfollow_tag"("p_tag_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'content', 'auth'
    AS $$
DECLARE
  v_lenser_id uuid;
BEGIN
  SELECT id INTO v_lenser_id
  FROM lensers.profiles
  WHERE user_id = auth.uid();

  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required or profile not found';
  END IF;

  DELETE FROM lensers.tag_follows
  WHERE lenser_id = v_lenser_id AND tag_id = p_tag_id;

  RETURN jsonb_build_object('following', false);
END;
$$;


ALTER FUNCTION "public"."fn_content_unfollow_tag"("p_tag_id" "uuid") OWNER TO "postgres";


ALTER FUNCTION "public"."fn_core_languages_list"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_create_tag"("p_name" "text", "p_slug" "text", "p_language_code" "text" DEFAULT 'en'::"text") RETURNS TABLE("id" "uuid", "slug" "text", "name" "text", "visibility" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'content'
    AS $$
DECLARE
  v_tag_id uuid;
BEGIN
  IF btrim(p_name) = '' OR p_name IS NULL THEN
    RAISE EXCEPTION 'Tag name is required';
  END IF;
  IF btrim(p_slug) = '' OR p_slug IS NULL THEN
    RAISE EXCEPTION 'Tag slug is required';
  END IF;

  -- Idempotent insert of base tag
  INSERT INTO content.tags (slug, visibility)
  VALUES (btrim(p_slug), 'public')
  ON CONFLICT ON CONSTRAINT tags_slug_key DO NOTHING;

  -- Resolve tag id (handles both new insert and pre-existing slug)
  SELECT t.id INTO v_tag_id
  FROM content.tags t
  WHERE t.slug = btrim(p_slug);

  IF v_tag_id IS NULL THEN
    RAISE EXCEPTION 'Failed to resolve tag for slug: %', p_slug;
  END IF;

  -- Idempotent insert of translation for the requested language
  INSERT INTO content.tag_translations (tag_id, language_code, name)
  VALUES (v_tag_id, btrim(p_language_code), btrim(p_name))
  ON CONFLICT ON CONSTRAINT tag_translations_tag_id_language_id_key DO NOTHING;

  -- Return resolved row from the public view
  RETURN QUERY
    SELECT v.id, v.slug, v.name, v.visibility
    FROM public.vw_tags_public_stats v
    WHERE v.id = v_tag_id;
END;
$$;


ALTER FUNCTION "public"."fn_create_tag"("p_name" "text", "p_slug" "text", "p_language_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_create_workflow"("p_title" "text", "p_description" "text" DEFAULT NULL::"text", "p_visibility" "text" DEFAULT 'public'::"text") RETURNS TABLE("id" "uuid", "lenser_id" "uuid", "title" "text", "description" "text", "visibility" "text", "battle_count" integer, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'lensers', 'public'
    AS $$
DECLARE
  v_lenser_id uuid;
BEGIN
  v_lenser_id := lensers.get_auth_lenser_id();
  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  INSERT INTO lenses.workflows (lenser_id, title, description, visibility)
  VALUES (v_lenser_id, p_title, p_description, p_visibility)
  RETURNING
    lenses.workflows.id,
    lenses.workflows.lenser_id,
    lenses.workflows.title,
    lenses.workflows.description,
    lenses.workflows.visibility,
    lenses.workflows.battle_count,
    lenses.workflows.created_at,
    lenses.workflows.updated_at;
END;
$$;


ALTER FUNCTION "public"."fn_create_workflow"("p_title" "text", "p_description" "text", "p_visibility" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_create_workflow"("p_title" "text", "p_description" "text", "p_visibility" "text") IS 'Creates a workflow. Lenser identity is resolved from JWT via get_auth_lenser_id() — p_lenser_id was removed to prevent identity spoofing.';



CREATE OR REPLACE FUNCTION "public"."fn_deactivate_account"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'auth'
    AS $$
DECLARE
  v_uid uuid;
  v_profile RECORD;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT id, user_id, status
  INTO v_profile
  FROM lensers.profiles
  WHERE user_id = v_uid
  FOR UPDATE;

  IF NOT FOUND OR v_profile.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_active');
  END IF;

  UPDATE lensers.profiles
  SET status = 'deactivated',
      updated_at = now()
  WHERE id = v_profile.id;

  PERFORM lensers.log_account_lifecycle_event(
    v_profile.id,
    v_profile.user_id,
    'account_deactivated',
    v_profile.status,
    'deactivated'::lensers.lenser_status,
    'user_action',
    jsonb_build_object('reason', 'user_requested_deactivation')
  );

  RETURN jsonb_build_object('success', true, 'status', 'deactivated');
END;
$$;


ALTER FUNCTION "public"."fn_deactivate_account"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_delete_workflow_edge"("p_edge_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'lensers', 'public'
    AS $$
DECLARE
  v_caller_id uuid;
BEGIN
  v_caller_id := lensers.get_auth_lenser_id();

  IF NOT EXISTS (
    SELECT 1 FROM lenses.workflow_edges e
    JOIN lenses.workflows w ON w.id = e.workflow_id
    WHERE e.id = p_edge_id AND w.lenser_id = v_caller_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized or edge not found: %', p_edge_id
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM lenses.workflow_edges WHERE id = p_edge_id;
END;
$$;


ALTER FUNCTION "public"."fn_delete_workflow_edge"("p_edge_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_delete_workflow_edge"("p_edge_id" "uuid") IS 'Deletes a workflow edge the caller owns.';



CREATE OR REPLACE FUNCTION "public"."fn_delete_workflow_node"("p_node_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'lensers', 'public'
    AS $$
DECLARE
  v_caller_id uuid;
BEGIN
  v_caller_id := lensers.get_auth_lenser_id();

  IF NOT EXISTS (
    SELECT 1 FROM lenses.workflow_nodes n
    JOIN lenses.workflows w ON w.id = n.workflow_id
    WHERE n.id = p_node_id AND w.lenser_id = v_caller_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized or node not found: %', p_node_id
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM lenses.workflow_nodes WHERE id = p_node_id;
END;
$$;


ALTER FUNCTION "public"."fn_delete_workflow_node"("p_node_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_delete_workflow_node"("p_node_id" "uuid") IS 'Deletes a workflow node the caller owns.';



CREATE OR REPLACE FUNCTION "public"."fn_deny_mutation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RAISE EXCEPTION '% is append-only and cannot be %', TG_TABLE_NAME, TG_OP;
END;
$$;


ALTER FUNCTION "public"."fn_deny_mutation"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_deny_mutation"() IS 'Generic append-only guard. Attach as BEFORE UPDATE/DELETE trigger on any table that must be insert-only (rule_snapshots, action_logs, audit chains, benchmark result_sets, etc.). Raises an exception on any mutation attempt.';



CREATE OR REPLACE FUNCTION "public"."fn_execution_persist_response"("p_lenser_id" "uuid", "p_provider" "text", "p_model" "text", "p_status" "text" DEFAULT 'succeeded'::"text", "p_response_text" "text" DEFAULT NULL::"text", "p_response_meta" "jsonb" DEFAULT '{}'::"jsonb", "p_token_input" integer DEFAULT 0, "p_token_output" integer DEFAULT 0, "p_credit_cost" bigint DEFAULT 0) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'execution', 'public'
    AS $$
DECLARE
    v_request_id     uuid;
    v_run_id         uuid;
    v_model_id       uuid;
    v_billing_status text;
BEGIN
    -- Resolve model_id from provider + model key (best-effort)
    SELECT m.id INTO v_model_id
    FROM ai.models m
    JOIN ai.providers p ON p.id = m.provider_id
    WHERE p.key = p_provider AND m.key = p_model
    LIMIT 1;

    v_billing_status := CASE WHEN p_credit_cost > 0 THEN 'charged' ELSE 'free' END;

    -- Create request row
    INSERT INTO execution.requests (
        requester_lenser_id,
        origin_type,
        model_id,
        funding_source,
        runtime_origin
    ) VALUES (
        p_lenser_id,
        'api',
        v_model_id,
        CASE WHEN p_credit_cost > 0 THEN 'platform_credit' ELSE 'free' END,
        'cloud'
    )
    RETURNING id INTO v_request_id;

    -- Create run row with response
    INSERT INTO execution.runs (
        request_id,
        status,
        model_id,
        token_input,
        token_output,
        credit_cost,
        billing_status,
        response_text,
        response_meta,
        started_at,
        completed_at
    ) VALUES (
        v_request_id,
        p_status,
        v_model_id,
        p_token_input,
        p_token_output,
        p_credit_cost,
        v_billing_status,
        p_response_text,
        p_response_meta,
        now(),
        CASE WHEN p_status IN ('succeeded', 'failed', 'timed_out') THEN now() ELSE NULL END
    )
    RETURNING id INTO v_run_id;

    RETURN v_run_id;
END;
$$;


ALTER FUNCTION "public"."fn_execution_persist_response"("p_lenser_id" "uuid", "p_provider" "text", "p_model" "text", "p_status" "text", "p_response_text" "text", "p_response_meta" "jsonb", "p_token_input" integer, "p_token_output" integer, "p_credit_cost" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_execution_persist_response"("p_lenser_id" "uuid", "p_provider" "text", "p_model" "text", "p_status" "text", "p_response_text" "text", "p_response_meta" "jsonb", "p_token_input" integer, "p_token_output" integer, "p_credit_cost" bigint) IS 'Persists an AI execution response by creating request + run rows. Called fire-and-forget by the API Worker after provider calls complete.';



ALTER FUNCTION "public"."fn_get_active_season"("p_app_id" "uuid") OWNER TO "postgres";


ALTER FUNCTION "public"."fn_get_battle_comments"("p_battle_id" "uuid", "p_limit" integer) OWNER TO "postgres";


ALTER FUNCTION "public"."fn_get_battle_comments"("p_battle_id" "uuid", "p_limit" integer, "p_before_ts" timestamp with time zone, "p_before_id" "uuid") OWNER TO "postgres";


ALTER FUNCTION "public"."fn_get_battle_full"("p_slug" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_get_battle_full"("p_slug" "text") IS 'Returns full battle state for BattleDetailPage by slug. Single roundtrip covers contenders, submissions, vote aggregates, entity map, and rule snapshot hash via v_battle_full view.';



ALTER FUNCTION "public"."fn_get_battles_feed"("p_status" "text", "p_battle_type" "text", "p_limit" integer, "p_cursor" timestamp with time zone) OWNER TO "postgres";


ALTER FUNCTION "public"."fn_get_global_messages"("p_battle_id" "uuid", "p_limit" integer, "p_before_ts" timestamp with time zone, "p_before_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "lensers"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"(),
    "handle" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "bio" "text",
    "headline" "text",
    "avatar_url" "text",
    "banner_url" "text",
    "location" "text",
    "website_url" "text",
    "status" "lensers"."lenser_status" DEFAULT 'active'::"lensers"."lenser_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "visibility" "lensers"."lenser_visibility" DEFAULT 'public'::"lensers"."lenser_visibility",
    "is_in_waiting_list" boolean DEFAULT false,
    "deletion_requested_at" timestamp with time zone,
    "last_handle_changed_at" timestamp with time zone,
    "join_order" bigint,
    "last_login_at" timestamp with time zone,
    "last_active_at" timestamp with time zone,
    "login_count" integer DEFAULT 0,
    "onboarding_step" smallint DEFAULT 0 NOT NULL,
    "onboarding_completed_at" timestamp with time zone,
    "type" "lensers"."lenser_type" DEFAULT 'human'::"lensers"."lenser_type" NOT NULL,
    "ai_model_id" "uuid",
    "deletion_deadline_at" timestamp with time zone,
    CONSTRAINT "lensers_handle_format_check" CHECK ((("handle" = "lower"("handle")) AND ("handle" ~ '^[a-z0-9._]+$'::"text") AND (("char_length"("handle") >= 4) AND ("char_length"("handle") <= 24)))),
    CONSTRAINT "lensers_reserved_handle_check" CHECK (("lower"("handle") <> ALL (ARRAY['lenser'::"text", 'lens'::"text", 'lena'::"text", 'lensa'::"text", 'lense'::"text", 'leni'::"text", 'len'::"text", 'lensizm'::"text"]))),
    CONSTRAINT "lensers_website_url_format_check" CHECK ((("website_url" IS NULL) OR ("website_url" ~ '^https?:\/\/[A-Za-z0-9.-]+\.[A-Za-z]{2,}.*$'::"text")))
);


ALTER TABLE "lensers"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "lensers"."profiles"."onboarding_step" IS '0=not started, 1=handle/profile created, 2=preferences set (complete)';



COMMENT ON COLUMN "lensers"."profiles"."onboarding_completed_at" IS 'Timestamp when all onboarding steps were finished; NULL means incomplete.';



ALTER FUNCTION "public"."fn_get_leaderboard"("p_order_by" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


ALTER VIEW "lensers"."v_lenser_profile_full" OWNER TO "postgres";


COMMENT ON VIEW "lensers"."v_lenser_profile_full" IS 'Full lenser profile for LenserProfilePage. Replaces 4-5 separate queries. Excludes deleted/suspended/pending-deletion profiles. battles_played/won/drawn/lost are aggregated across all battle categories.';



CREATE OR REPLACE FUNCTION "public"."fn_get_lenser_profile_full"("p_handle" "text") RETURNS "lensers"."v_lenser_profile_full"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'lensers', 'public'
    AS $$
  SELECT *
  FROM lensers.v_lenser_profile_full
  WHERE handle = lower(p_handle)
  LIMIT 1;
$$;


ALTER FUNCTION "public"."fn_get_lenser_profile_full"("p_handle" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_get_lenser_profile_full"("p_handle" "text") IS 'Returns full lenser profile data for LenserProfilePage by handle. Case-insensitive lookup via lower(). Covers stats, XP, reputation, and battle aggregates in one call.';



CREATE OR REPLACE FUNCTION "public"."fn_get_my_api_keys"() RETURNS TABLE("id" "uuid", "lenser_id" "uuid", "provider_id" "uuid", "provider_key" "text", "provider_name" "text", "label" "text", "key_suffix" "text", "is_active" boolean, "created_at" timestamp with time zone, "revoked_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'ai', 'lensers', 'public'
    AS $$
BEGIN
  RETURN QUERY SELECT * FROM ai.fn_get_my_api_keys();
END;
$$;


ALTER FUNCTION "public"."fn_get_my_api_keys"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_get_my_api_keys"() IS 'Public REST wrapper for ai.fn_get_my_api_keys. The ai schema is not exposed in PostgREST — this wrapper is the only REST-callable entry point for listing BYOK keys.';



CREATE OR REPLACE FUNCTION "public"."fn_get_my_lensers"() RETURNS TABLE("id" "uuid", "handle" "text", "display_name" "text", "avatar_url" "text", "type" "text", "is_active" boolean)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'agents', 'auth'
    AS $$
  -- Human profile owned directly by this auth user
  SELECT
    p.id,
    p.handle,
    p.display_name,
    p.avatar_url,
    p.type::text,
    (pref.active_lenser_id IS NULL OR pref.active_lenser_id = p.id) AS is_active
  FROM lensers.profiles p
  LEFT JOIN lensers.preferences pref ON pref.lenser_id = p.id
  WHERE p.user_id = auth.uid()
    AND p.status  = 'active'
    AND p.type    = 'human'

  UNION ALL

  -- AI lensers whose primary owner is the auth user's human profile
  SELECT
    ai_p.id,
    ai_p.handle,
    ai_p.display_name,
    ai_p.avatar_url,
    ai_p.type::text,
    (pref.active_lenser_id = ai_p.id) AS is_active
  FROM agents.ownerships   o
  JOIN agents.ai_lensers   al    ON al.id       = o.ai_lenser_id
  JOIN lensers.profiles    ai_p  ON ai_p.id     = al.profile_id
  JOIN lensers.profiles    own_p ON own_p.id    = o.owner_lenser_id
  LEFT JOIN lensers.preferences pref ON pref.lenser_id = own_p.id
  WHERE own_p.user_id   = auth.uid()
    AND o.role          = 'owner'
    AND o.revoked_at    IS NULL
    AND ai_p.status     = 'active'

  ORDER BY is_active DESC, display_name;
$$;


ALTER FUNCTION "public"."fn_get_my_lensers"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_get_my_lensers"() IS 'Returns the authenticated user''s human lenser profile plus any AI lensers they own as primary owner, each with an is_active flag indicating the current workspace selection.';



CREATE OR REPLACE FUNCTION "public"."fn_get_my_lenses"("p_offset" integer DEFAULT 0, "p_limit" integer DEFAULT 20) RETURNS TABLE("id" "uuid", "lenser_id" "uuid", "visibility" "content"."visibility_enum", "title" "text", "description" "text", "author_profile" "jsonb", "reaction_totals" "jsonb", "copy_count" integer, "like_count" integer, "saved_count" integer, "tags" "jsonb", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'lenses', 'lensers', 'content', 'public'
    AS $$
DECLARE
  v_lenser_id uuid;
BEGIN
  v_lenser_id := lensers.get_auth_lenser_id();
  IF v_lenser_id IS NULL THEN
    RETURN; -- unauthenticated: empty result set
  END IF;

  RETURN QUERY
  SELECT
    l.id,
    l.lenser_id,
    l.visibility,
    COALESCE(et.title, 'Untitled') AS title,
    et.description,
    jsonb_build_object(
      'id',           prof.id,
      'handle',       prof.handle,
      'display_name', prof.display_name,
      'avatar_url',   prof.avatar_url
    ) AS author_profile,
    COALESCE(rt.reaction_totals, '{}') AS reaction_totals,
    COALESCE(rt.copy_count, 0)         AS copy_count,
    COALESCE(rt.like_count, 0)         AS like_count,
    COALESCE(rt.saved_count, 0)        AS saved_count,
    COALESCE(tg_agg.tags, '[]')        AS tags,
    l.created_at
  FROM lenses.lenses l
  LEFT JOIN content.entity_translations et
    ON et.entity_id = l.id
   AND et.entity_type = 'lens'
   AND et.is_original = true
  LEFT JOIN lensers.profiles prof ON prof.id = l.lenser_id
  LEFT JOIN LATERAL (
    SELECT
      COALESCE(jsonb_object_agg(x.reaction, x.cnt), '{}')::jsonb  AS reaction_totals,
      COALESCE(SUM(CASE WHEN x.reaction = 'copy'::content.reaction_enum  THEN x.cnt ELSE 0 END)::integer, 0) AS copy_count,
      COALESCE(SUM(CASE WHEN x.reaction = 'like'::content.reaction_enum  THEN x.cnt ELSE 0 END)::integer, 0) AS like_count,
      COALESCE(SUM(CASE WHEN x.reaction = 'saved'::content.reaction_enum THEN x.cnt ELSE 0 END)::integer, 0) AS saved_count
    FROM (
      SELECT rx.reaction, COUNT(*)::integer AS cnt
      FROM content.reactions rx
      WHERE rx.entity_type = 'lens' AND rx.entity_id = l.id
      GROUP BY rx.reaction
    ) x
  ) rt ON true
  LEFT JOIN LATERAL (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object('id', tg.id, 'slug', tg.slug, 'name', tg.slug)
    ), '[]') AS tags
    FROM content.tag_map tm
    JOIN content.tags tg ON tg.id = tm.tag_id
    WHERE tm.entity_type = 'lens' AND tm.entity_id = l.id
  ) tg_agg ON true
  WHERE l.lenser_id = v_lenser_id
  ORDER BY l.created_at DESC
  OFFSET GREATEST(p_offset, 0)
  LIMIT  LEAST(p_limit, 100);
END;
$$;


ALTER FUNCTION "public"."fn_get_my_lenses"("p_offset" integer, "p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_get_my_lenses"("p_offset" integer, "p_limit" integer) IS 'Returns all lenses (public, private, unlisted) owned by the authenticated lenser. Used by the "My Lenses" filter on LensesPage.';



CREATE OR REPLACE FUNCTION "public"."fn_get_my_workflows"("p_lenser_id" "uuid", "p_offset" integer DEFAULT 0, "p_limit" integer DEFAULT 12, "p_visibility" "text" DEFAULT NULL::"text", "p_sort" "text" DEFAULT 'updated_at'::"text", "p_search" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "lenser_id" "uuid", "title" "text", "description" "text", "visibility" "text", "battle_count" integer, "reaction_totals" "jsonb", "fork_count" integer, "parent_workflow_id" "uuid", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'lenses'
    AS $$
  SELECT
    w.id,
    w.lenser_id,
    w.title,
    w.description,
    w.visibility::text,
    w.battle_count,
    w.reaction_totals,
    w.fork_count,
    w.parent_workflow_id,
    w.created_at,
    w.updated_at
  FROM lenses.workflows w
  WHERE w.lenser_id = p_lenser_id
    AND (p_visibility IS NULL OR w.visibility::text = p_visibility)
    AND (p_search    IS NULL OR w.title ILIKE '%' || p_search || '%')
  ORDER BY
    CASE WHEN p_sort = 'updated_at'   THEN EXTRACT(EPOCH FROM w.updated_at)   END DESC,
    CASE WHEN p_sort = 'created_at'   THEN EXTRACT(EPOCH FROM w.created_at)   END DESC,
    CASE WHEN p_sort = 'battle_count' THEN w.battle_count::float              END DESC NULLS LAST,
    w.updated_at DESC
  LIMIT  p_limit
  OFFSET p_offset;
$$;


ALTER FUNCTION "public"."fn_get_my_workflows"("p_lenser_id" "uuid", "p_offset" integer, "p_limit" integer, "p_visibility" "text", "p_sort" "text", "p_search" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_get_pending_requests"("p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "source_profile_id" "uuid", "handle" "text", "display_name" "text", "avatar_url" "text", "requested_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'auth'
    AS $$
  SELECT
    r.id,
    r.source_profile_id,
    p.handle,
    p.display_name,
    p.avatar_url,
    r.requested_at
  FROM lensers.relationships r
  JOIN lensers.profiles p ON p.id = r.source_profile_id
  JOIN lensers.profiles me ON me.user_id = auth.uid() AND me.id = r.target_profile_id
  WHERE r.status = 'pending'
    AND p.status = 'active'
  ORDER BY r.requested_at DESC
  LIMIT LEAST(p_limit, 100)
  OFFSET GREATEST(p_offset, 0);
$$;


ALTER FUNCTION "public"."fn_get_pending_requests"("p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_get_season_leaderboard"("p_app_id" "uuid" DEFAULT '00000000-0000-0000-0000-000000000001'::"uuid", "p_season_id" "uuid" DEFAULT NULL::"uuid", "p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0) RETURNS TABLE("season_id" "uuid", "season_slug" "text", "app_id" "uuid", "rank" bigint, "lenser_id" "uuid", "total_xp" bigint, "user" "jsonb")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'xp', 'lensers', 'auth'
    AS $$
  SELECT
    v.season_id,
    v.season_slug,
    v.app_id,
    v.rank,
    v.lenser_id,
    v.total_xp,
    v."user"
  FROM public.vw_xp_leaderboard_season v
  WHERE v.app_id = p_app_id
    AND (p_season_id IS NULL OR v.season_id = p_season_id)
  ORDER BY v.rank ASC
  LIMIT p_limit
  OFFSET p_offset;
$$;


ALTER FUNCTION "public"."fn_get_season_leaderboard"("p_app_id" "uuid", "p_season_id" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_get_thread_replies_page"("p_thread_id" "uuid", "p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "thread_id" "uuid", "parent_reply_id" "uuid", "lenser_id" "uuid", "content" "text", "content_html" "text", "reaction_totals" "jsonb", "created_at" timestamp with time zone, "author_profile" "jsonb")
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'content', 'lensers', 'auth'
    AS $$
  WITH RECURSIVE root_page AS (
    -- Select only top-level (root) replies for this page, respecting RLS via SECURITY INVOKER
    SELECT r.id
    FROM content.thread_replies r
    WHERE r.thread_id     = p_thread_id
      AND r.parent_reply_id IS NULL
      AND r.status        = 'published'
      AND r.deleted_at    IS NULL
    ORDER BY r.created_at ASC
    LIMIT  LEAST(p_limit, 50)
    OFFSET p_offset
  ),
  descendants AS (
    -- Seed: the root replies for this page
    SELECT r.id, r.parent_reply_id
    FROM content.thread_replies r
    WHERE r.id IN (SELECT id FROM root_page)
    UNION ALL
    -- Recurse: children of already-selected replies
    SELECT r.id, r.parent_reply_id
    FROM content.thread_replies r
    INNER JOIN descendants d ON r.parent_reply_id = d.id
    WHERE r.status     = 'published'
      AND r.deleted_at IS NULL
  )
  SELECT
    v.id,
    v.thread_id,
    v.parent_reply_id,
    v.lenser_id,
    v.content,
    v.content_html,
    v.reaction_totals,
    v.created_at,
    v.author_profile
  FROM public.vw_content_thread_replies_public v
  WHERE v.id IN (SELECT id FROM descendants)
  ORDER BY v.created_at ASC;
$$;


ALTER FUNCTION "public"."fn_get_thread_replies_page"("p_thread_id" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_get_thread_replies_page"("p_thread_id" "uuid", "p_limit" integer, "p_offset" integer) IS 'Paginated thread replies. Paginates by root reply count (LIMIT/OFFSET on root-level entries), then recursively fetches all descendants of the selected roots. Hard cap: 50 root replies per call. Uses SECURITY INVOKER so RLS is enforced.';



CREATE OR REPLACE FUNCTION "public"."fn_get_workflow_detail"("p_workflow_id" "uuid") RETURNS TABLE("id" "uuid", "lenser_id" "uuid", "title" "text", "description" "text", "visibility" "text", "battle_count" integer, "reaction_totals" "jsonb", "fork_count" integer, "parent_workflow_id" "uuid", "author_profile" "jsonb", "parent_workflow_title" "text", "parent_workflow_author_profile" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'lenses', 'lensers'
    AS $$
WITH caller AS (
  SELECT lensers.get_auth_lenser_id() AS id
)
SELECT
  w.id,
  w.lenser_id,
  w.title,
  w.description,
  w.visibility::text,
  w.battle_count,
  w.reaction_totals,
  w.fork_count,
  w.parent_workflow_id,
  CASE
    WHEN prof.id IS NULL THEN NULL
    ELSE jsonb_build_object(
      'id', prof.id,
      'handle', prof.handle,
      'display_name', prof.display_name,
      'avatar_url', prof.avatar_url
    )
  END AS author_profile,
  parent.title AS parent_workflow_title,
  CASE
    WHEN parent_prof.id IS NULL THEN NULL
    ELSE jsonb_build_object(
      'id', parent_prof.id,
      'handle', parent_prof.handle,
      'display_name', parent_prof.display_name,
      'avatar_url', parent_prof.avatar_url
    )
  END AS parent_workflow_author_profile,
  w.created_at,
  w.updated_at
FROM lenses.workflows w
LEFT JOIN lensers.profiles prof
  ON prof.id = w.lenser_id
LEFT JOIN lenses.workflows parent
  ON parent.id = w.parent_workflow_id
LEFT JOIN lensers.profiles parent_prof
  ON parent_prof.id = parent.lenser_id
WHERE w.id = p_workflow_id
  AND (
    w.visibility = 'public'
    OR w.lenser_id = (SELECT id FROM caller)
  );
$$;


ALTER FUNCTION "public"."fn_get_workflow_detail"("p_workflow_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_get_workflow_detail"("p_workflow_id" "uuid") IS 'Returns a workflow with denormalized author and parent workflow metadata for the builder page.';



CREATE OR REPLACE FUNCTION "public"."fn_get_workflow_edges"("p_workflow_id" "uuid") RETURNS TABLE("id" "uuid", "workflow_id" "uuid", "source_node_id" "uuid", "target_node_id" "uuid", "source_output_key" "text", "target_param_label" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'lensers', 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.workflow_id,
    e.source_node_id,
    e.target_node_id,
    e.source_output_key,
    e.target_param_label
  FROM lenses.workflow_edges e
  JOIN lenses.workflows w ON w.id = e.workflow_id
  WHERE e.workflow_id = p_workflow_id
    AND (
      w.visibility = 'public'
      OR w.lenser_id = lensers.get_auth_lenser_id()
    );
END;
$$;


ALTER FUNCTION "public"."fn_get_workflow_edges"("p_workflow_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_get_workflow_edges"("p_workflow_id" "uuid") IS 'Returns all edges for a workflow. Public workflows are readable by anyone; private/unlisted workflows are readable only by the owner.';



CREATE OR REPLACE FUNCTION "public"."fn_get_workflow_node_results"("p_run_id" "uuid") RETURNS TABLE("id" "uuid", "run_id" "uuid", "node_id" "uuid", "execution_run_id" "uuid", "status" "text", "output_data" "jsonb", "error_message" "text", "started_at" timestamp with time zone, "completed_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'lensers', 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    nr.id,
    nr.run_id,
    nr.node_id,
    nr.execution_run_id,
    nr.status,
    nr.output_data,
    nr.error_message,
    nr.started_at,
    nr.completed_at
  FROM lenses.workflow_node_results nr
  JOIN lenses.workflow_runs r ON r.id = nr.run_id
  JOIN lenses.workflows w ON w.id = r.workflow_id
  WHERE nr.run_id = p_run_id
    AND (
      w.visibility = 'public'
      OR w.lenser_id = lensers.get_auth_lenser_id()
      OR r.triggered_by = lensers.get_auth_lenser_id()
    );
END;
$$;


ALTER FUNCTION "public"."fn_get_workflow_node_results"("p_run_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_get_workflow_node_results"("p_run_id" "uuid") IS 'Returns all node results for a workflow run. Accessible to run owner or anyone for public workflows.';



CREATE OR REPLACE FUNCTION "public"."fn_get_workflow_nodes"("p_workflow_id" "uuid") RETURNS TABLE("id" "uuid", "workflow_id" "uuid", "lens_id" "uuid", "version_id" "uuid", "position_x" double precision, "position_y" double precision, "label" "text", "ordinal" integer, "created_at" timestamp with time zone, "config" "jsonb", "lens_visibility" "text", "lens_lenser_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'lensers', 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id,
    n.workflow_id,
    n.lens_id,
    n.version_id,
    n.position_x,
    n.position_y,
    n.label,
    n.ordinal,
    n.created_at,
    n.config,
    l.visibility::text  AS lens_visibility,
    l.lenser_id         AS lens_lenser_id
  FROM lenses.workflow_nodes n
  JOIN lenses.workflows w ON w.id = n.workflow_id
  LEFT JOIN lenses.lenses l ON l.id = n.lens_id
  WHERE n.workflow_id = p_workflow_id
    AND (
      w.visibility = 'public'
      OR w.lenser_id = lensers.get_auth_lenser_id()
    )
  ORDER BY n.ordinal, n.created_at;
END;
$$;


ALTER FUNCTION "public"."fn_get_workflow_nodes"("p_workflow_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_get_workflow_nodes"("p_workflow_id" "uuid") IS 'Returns workflow nodes enriched with lens visibility and owner. Public workflows readable by anyone; private/unlisted only by owner.';



CREATE OR REPLACE FUNCTION "public"."fn_get_workflow_run"("p_run_id" "uuid") RETURNS TABLE("id" "uuid", "workflow_id" "uuid", "triggered_by" "uuid", "status" "text", "context_inputs" "jsonb", "started_at" timestamp with time zone, "completed_at" timestamp with time zone, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'lensers', 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.workflow_id,
    r.triggered_by,
    r.status,
    r.context_inputs,
    r.started_at,
    r.completed_at,
    r.created_at
  FROM lenses.workflow_runs r
  JOIN lenses.workflows w ON w.id = r.workflow_id
  WHERE r.id = p_run_id
    AND (
      w.visibility = 'public'
      OR w.lenser_id = lensers.get_auth_lenser_id()
      OR r.triggered_by = lensers.get_auth_lenser_id()
    );
END;
$$;


ALTER FUNCTION "public"."fn_get_workflow_run"("p_run_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_get_workflow_run"("p_run_id" "uuid") IS 'Fetches a single workflow run record. Accessible to the run owner or anyone for public workflows.';



CREATE OR REPLACE FUNCTION "public"."fn_lensers_create_profile"("p_handle" "text", "p_display_name" "text", "p_bio" "text" DEFAULT ''::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'auth'
    AS $$
DECLARE
  v_uid uuid;
  v_row lensers.profiles;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO lensers.profiles (user_id, handle, display_name, bio, headline, onboarding_step)
  VALUES (v_uid, p_handle, p_display_name, COALESCE(p_bio, ''), NULL, 1)
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;


ALTER FUNCTION "public"."fn_lensers_create_profile"("p_handle" "text", "p_display_name" "text", "p_bio" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_lensers_follow"("p_following_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'auth'
    AS $$
DECLARE
  v_result jsonb;
BEGIN
  v_result := public.fn_request_follow(p_following_id);
  -- Return old format for backward compat
  RETURN jsonb_build_object('following', true);
END;
$$;


ALTER FUNCTION "public"."fn_lensers_follow"("p_following_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_lensers_get_current_id"() RETURNS "uuid"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'auth'
    AS $$
  SELECT lp.id
  FROM lensers.profiles lp
  WHERE lp.user_id = auth.uid()
    AND lp.status = 'active'
    AND lp.deletion_requested_at IS NULL
  LIMIT 1;
$$;


ALTER FUNCTION "public"."fn_lensers_get_current_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_lensers_get_follows"("p_lenser_id" "uuid", "p_type" "text" DEFAULT 'following'::"text", "p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0) RETURNS TABLE("lenser_id" "uuid", "handle" "text", "display_name" "text", "avatar_url" "text", "is_following" boolean)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'auth'
    AS $$
  SELECT
    lp.id,
    lp.handle,
    lp.display_name,
    lp.avatar_url,
    EXISTS (
      SELECT 1 FROM lensers.relationships r2
      JOIN lensers.profiles me ON me.user_id = auth.uid()
      WHERE r2.source_profile_id = me.id
        AND r2.target_profile_id = lp.id
        AND r2.status = 'accepted'
    ) AS is_following
  FROM lensers.relationships r
  JOIN lensers.profiles lp ON lp.id = CASE
    WHEN p_type = 'followers' THEN r.source_profile_id
    ELSE r.target_profile_id
  END
  WHERE CASE
    WHEN p_type = 'followers' THEN r.target_profile_id = p_lenser_id
    ELSE r.source_profile_id = p_lenser_id
  END
    AND r.status = 'accepted'
    AND lp.status = 'active'::lensers.lenser_status
    AND lp.deletion_requested_at IS NULL
  ORDER BY r.accepted_at DESC
  LIMIT LEAST(p_limit, 100)
  OFFSET GREATEST(p_offset, 0);
$$;


ALTER FUNCTION "public"."fn_lensers_get_follows"("p_lenser_id" "uuid", "p_type" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_lensers_get_fresh_profile"() RETURNS TABLE("id" "uuid", "handle" "text", "display_name" "text", "avatar_url" "text", "headline" "text", "updated_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers'
    AS $$
  select 
    id,
    handle,
    display_name,
    avatar_url,
    headline,
    updated_at
  from lensers.profiles
  where user_id = auth.uid();
$$;


ALTER FUNCTION "public"."fn_lensers_get_fresh_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_lensers_get_is_in_waitinglist"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'lensers', 'public'
    AS $$
  select p.is_in_waiting_list
  from lensers.profiles p
  where p.user_id = auth.uid()
  limit 1;
$$;


ALTER FUNCTION "public"."fn_lensers_get_is_in_waitinglist"() OWNER TO "postgres";


ALTER FUNCTION "public"."fn_lensers_get_leaderboard"("p_period" "text", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_lensers_get_preferences"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'auth'
    AS $$
DECLARE
    v_uid  uuid;
    v_row  lensers.preferences;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT p.*
      INTO v_row
      FROM lensers.preferences p
      JOIN lensers.profiles    pr ON pr.id = p.lenser_id
     WHERE pr.user_id = v_uid;

    IF NOT FOUND THEN
        RETURN '{}'::jsonb;
    END IF;

    RETURN to_jsonb(v_row);
END;
$$;


ALTER FUNCTION "public"."fn_lensers_get_preferences"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_lensers_get_preferences"() IS 'Returns the authenticated user''s full preferences row as jsonb. Reads from lensers.preferences table (previously read from lensers.profiles.preferences jsonb). Updated in migration 20260322000059.';



ALTER FUNCTION "public"."fn_lensers_get_profile"("p_handle" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_lensers_get_public_profile"("p_handle" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'auth'
    AS $$
DECLARE
  v_result jsonb;
  v_route_state text;
BEGIN
  v_result := public.fn_lensers_get_profile(p_handle);
  v_route_state := v_result->>'route_state';

  -- Old function only returns data for full profiles
  IF v_route_state = 'FULL_PROFILE' THEN
    RETURN v_result->'profile';
  ELSE
    RETURN null;
  END IF;
END;
$$;


ALTER FUNCTION "public"."fn_lensers_get_public_profile"("p_handle" "text") OWNER TO "postgres";


ALTER FUNCTION "public"."fn_lensers_get_suggested"("p_lenser_id" "uuid", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_lensers_get_trending"("p_limit" integer DEFAULT 10) RETURNS TABLE("lenser_id" "uuid", "handle" "text", "display_name" "text", "avatar_url" "text", "total_xp" bigint, "current_level" integer, "lenser_score" double precision)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'lensers', 'content', 'xp'
    AS $$
  SELECT
    lenser_id,
    handle,
    display_name,
    avatar_url,
    total_xp,
    current_level,
    lenser_score
  FROM lensers.vw_lensers_score
  ORDER BY lenser_score DESC
  LIMIT LEAST(p_limit, 50);
$$;


ALTER FUNCTION "public"."fn_lensers_get_trending"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_lensers_is_following"("p_target_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'lensers', 'auth'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM lensers.relationships r
    JOIN lensers.profiles p ON p.id = r.source_profile_id AND p.user_id = auth.uid()
    WHERE r.target_profile_id = p_target_id
      AND r.status = 'accepted'
  );
$$;


ALTER FUNCTION "public"."fn_lensers_is_following"("p_target_id" "uuid") OWNER TO "postgres";


ALTER FUNCTION "public"."fn_lensers_list"("p_type" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_lensers_request_deletion"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'auth'
    AS $$
DECLARE
  v_uid uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE lensers.profiles
  SET
    deletion_requested_at = NOW(),
    updated_at = NOW()
  WHERE user_id = v_uid
    AND status = 'active'
    AND deletion_requested_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active Lenser profile not found or deletion already requested';
  END IF;
END;
$$;


ALTER FUNCTION "public"."fn_lensers_request_deletion"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_lensers_sync_social_links"("p_links" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'auth'
    AS $$
DECLARE
  v_lenser_id uuid;
  rec jsonb;
  v_id uuid;
  v_platform lensers.lenser_social_platform;
  v_url text;
  v_label text;
  v_incoming_ids uuid[];
BEGIN
  SELECT id INTO v_lenser_id
  FROM lensers.profiles
  WHERE user_id = auth.uid()
    AND status = 'active'
    AND deletion_requested_at IS NULL;

  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Lenser profile not found';
  END IF;

  -- Collect incoming IDs
  SELECT array_agg((elem->>'id')::uuid)
  INTO v_incoming_ids
  FROM jsonb_array_elements(p_links) elem
  WHERE elem ? 'id';

  -- Delete missing
  DELETE FROM lensers.social_links
  WHERE lenser_id = v_lenser_id
    AND (v_incoming_ids IS NULL OR NOT (id = ANY (v_incoming_ids)));

  -- Upsert loop
  FOR rec IN SELECT * FROM jsonb_array_elements(p_links)
  LOOP
    v_id := COALESCE((rec->>'id')::uuid, gen_random_uuid());
    v_platform := (rec->>'platform')::lensers.lenser_social_platform;
    v_url := rec->>'url';
    v_label := rec->>'label';

    INSERT INTO lensers.social_links (id, lenser_id, platform, url, label)
    VALUES (v_id, v_lenser_id, v_platform, v_url, v_label)
    ON CONFLICT (id) DO UPDATE
      SET platform = EXCLUDED.platform,
          url      = EXCLUDED.url,
          label    = EXCLUDED.label;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."fn_lensers_sync_social_links"("p_links" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_lensers_toggle_waitinglist"("p_kvkk_approved" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lensers', 'public', 'auth'
    AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT p_kvkk_approved THEN
    RAISE EXCEPTION 'kvkk_not_approved';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM lensers.profiles WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not_a_lenser';
  END IF;

  UPDATE lensers.profiles
  SET is_in_waiting_list = NOT is_in_waiting_list
  WHERE user_id = auth.uid();
END;
$$;


ALTER FUNCTION "public"."fn_lensers_toggle_waitinglist"("p_kvkk_approved" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_lensers_unfollow"("p_following_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'auth'
    AS $$
DECLARE
  v_result jsonb;
BEGIN
  v_result := public.fn_remove_follow(p_following_id);
  RETURN jsonb_build_object('following', false);
END;
$$;


ALTER FUNCTION "public"."fn_lensers_unfollow"("p_following_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_lensers_update_preferences"("p_data" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'ai', 'auth'
    AS $$
DECLARE
    v_uid              uuid;
    v_lenser_id        uuid;
    v_selected_key_id  uuid;
    v_key_owner        uuid;
    v_row              lensers.preferences;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT id INTO v_lenser_id
      FROM lensers.profiles
     WHERE user_id = v_uid
     LIMIT 1;

    IF v_lenser_id IS NULL THEN
        RAISE EXCEPTION 'Profile not found';
    END IF;

    -- Validate selected_api_key_id ownership when provided
    IF p_data ? 'selected_api_key_id' AND p_data->>'selected_api_key_id' IS NOT NULL THEN
        v_selected_key_id := (p_data->>'selected_api_key_id')::uuid;

        SELECT lenser_id INTO v_key_owner
          FROM ai.keys
         WHERE id = v_selected_key_id
           AND is_active = true;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'API key not found or is not active'
                USING ERRCODE = 'P0002';
        END IF;

        IF v_key_owner <> v_lenser_id THEN
            RAISE EXCEPTION 'API key does not belong to this lenser'
                USING ERRCODE = 'P0003';
        END IF;
    END IF;

    UPDATE lensers.preferences
    SET
        language              = CASE WHEN p_data ? 'language'              THEN p_data->>'language'                                              ELSE language              END,
        theme                 = CASE WHEN p_data ? 'theme'                 THEN (p_data->>'theme')::text                                         ELSE theme                 END,
        notifications         = CASE WHEN p_data ? 'notifications'         THEN p_data->'notifications'                                          ELSE notifications         END,
        sidebar               = CASE WHEN p_data ? 'sidebar'               THEN p_data->'sidebar'                                                ELSE sidebar               END,
        content_visibility    = CASE WHEN p_data ? 'content_visibility'    THEN p_data->>'content_visibility'                                     ELSE content_visibility    END,
        email_digest          = CASE WHEN p_data ? 'email_digest'          THEN (p_data->>'email_digest')::boolean                               ELSE email_digest          END,
        ai_provider_key       = CASE WHEN p_data ? 'ai_provider_key'       THEN p_data->>'ai_provider_key'                                       ELSE ai_provider_key       END,
        ai_model_key          = CASE WHEN p_data ? 'ai_model_key'          THEN p_data->>'ai_model_key'                                          ELSE ai_model_key          END,
        ai_persona            = CASE WHEN p_data ? 'ai_persona'            THEN p_data->>'ai_persona'                                            ELSE ai_persona            END,
        ai_ruleset            = CASE WHEN p_data ? 'ai_ruleset'            THEN p_data->'ai_ruleset'                                             ELSE ai_ruleset            END,
        wallet_mode           = CASE WHEN p_data ? 'wallet_mode'           THEN (p_data->>'wallet_mode')::lensers.wallet_mode_enum               ELSE wallet_mode           END,
        ai_data_usage         = CASE WHEN p_data ? 'ai_data_usage'         THEN (p_data->>'ai_data_usage')::boolean                              ELSE ai_data_usage         END,
        hide_actions          = CASE WHEN p_data ? 'hide_actions'          THEN (p_data->>'hide_actions')::boolean                               ELSE hide_actions          END,
        cron_config           = CASE WHEN p_data ? 'cron_config'           THEN p_data->'cron_config'                                            ELSE cron_config           END,
        selected_api_key_id   = CASE
                                    WHEN p_data ? 'selected_api_key_id' AND p_data->>'selected_api_key_id' IS NULL
                                        THEN NULL
                                    WHEN p_data ? 'selected_api_key_id'
                                        THEN (p_data->>'selected_api_key_id')::uuid
                                    ELSE selected_api_key_id
                                END,
        updated_at            = now()
    WHERE lenser_id = v_lenser_id
    RETURNING * INTO v_row;

    IF NOT FOUND THEN
        -- Auto-create missing row for legacy profiles, then retry
        INSERT INTO lensers.preferences (lenser_id)
        VALUES (v_lenser_id)
        ON CONFLICT (lenser_id) DO NOTHING;

        UPDATE lensers.preferences
        SET
            language              = CASE WHEN p_data ? 'language'              THEN p_data->>'language'           ELSE language              END,
            theme                 = CASE WHEN p_data ? 'theme'                 THEN p_data->>'theme'              ELSE theme                 END,
            notifications         = CASE WHEN p_data ? 'notifications'         THEN p_data->'notifications'       ELSE notifications         END,
            sidebar               = CASE WHEN p_data ? 'sidebar'               THEN p_data->'sidebar'             ELSE sidebar               END,
            content_visibility    = CASE WHEN p_data ? 'content_visibility'    THEN p_data->>'content_visibility' ELSE content_visibility    END,
            email_digest          = CASE WHEN p_data ? 'email_digest'          THEN (p_data->>'email_digest')::boolean ELSE email_digest     END,
            ai_provider_key       = CASE WHEN p_data ? 'ai_provider_key'       THEN p_data->>'ai_provider_key'    ELSE ai_provider_key       END,
            ai_model_key          = CASE WHEN p_data ? 'ai_model_key'          THEN p_data->>'ai_model_key'       ELSE ai_model_key          END,
            ai_persona            = CASE WHEN p_data ? 'ai_persona'            THEN p_data->>'ai_persona'         ELSE ai_persona            END,
            ai_ruleset            = CASE WHEN p_data ? 'ai_ruleset'            THEN p_data->'ai_ruleset'          ELSE ai_ruleset            END,
            wallet_mode           = CASE WHEN p_data ? 'wallet_mode'           THEN (p_data->>'wallet_mode')::lensers.wallet_mode_enum ELSE wallet_mode END,
            ai_data_usage         = CASE WHEN p_data ? 'ai_data_usage'         THEN (p_data->>'ai_data_usage')::boolean ELSE ai_data_usage  END,
            hide_actions          = CASE WHEN p_data ? 'hide_actions'          THEN (p_data->>'hide_actions')::boolean ELSE hide_actions     END,
            cron_config           = CASE WHEN p_data ? 'cron_config'           THEN p_data->'cron_config'         ELSE cron_config           END,
            selected_api_key_id   = CASE
                                        WHEN p_data ? 'selected_api_key_id' AND p_data->>'selected_api_key_id' IS NULL
                                            THEN NULL
                                        WHEN p_data ? 'selected_api_key_id'
                                            THEN (p_data->>'selected_api_key_id')::uuid
                                        ELSE selected_api_key_id
                                    END,
            updated_at            = now()
        WHERE lenser_id = v_lenser_id
        RETURNING * INTO v_row;
    END IF;

    RETURN to_jsonb(v_row);
END;
$$;


ALTER FUNCTION "public"."fn_lensers_update_preferences"("p_data" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_lensers_update_preferences"("p_data" "jsonb") IS 'Partial-patch update of the authenticated user''s lensers.preferences row. Accepts any subset of preference fields as jsonb — only supplied keys are written. When selected_api_key_id is provided, validates the key is active and owned by this lenser. SECURITY DEFINER — runs as postgres, bypasses table-level permission check. Auto-creates the preferences row if missing (legacy profile guard). Added in migration 000061. Updated in 000063 to support selected_api_key_id.';



CREATE OR REPLACE FUNCTION "public"."fn_lensers_update_profile"("p_data" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'auth'
    AS $$
DECLARE
  v_uid uuid;
  v_row lensers.profiles;
  v_language text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE lensers.profiles
  SET
    display_name            = CASE WHEN p_data ? 'display_name'            THEN (p_data->>'display_name')                         ELSE display_name            END,
    avatar_url              = CASE WHEN p_data ? 'avatar_url'              THEN (p_data->>'avatar_url')                           ELSE avatar_url              END,
    banner_url              = CASE WHEN p_data ? 'banner_url'              THEN (p_data->>'banner_url')                           ELSE banner_url              END,
    bio                     = CASE WHEN p_data ? 'bio'                     THEN (p_data->>'bio')                                  ELSE bio                     END,
    headline                = CASE WHEN p_data ? 'headline'                THEN (p_data->>'headline')                             ELSE headline                END,
    onboarding_step         = CASE WHEN p_data ? 'onboarding_step'         THEN (p_data->>'onboarding_step')::smallint            ELSE onboarding_step         END,
    onboarding_completed_at = CASE WHEN p_data ? 'onboarding_completed_at' THEN (p_data->>'onboarding_completed_at')::timestamptz ELSE onboarding_completed_at END,
    visibility              = CASE WHEN p_data ? 'visibility'              THEN (p_data->>'visibility')::lensers.lenser_visibility ELSE visibility              END,
    updated_at              = now()
  WHERE id = (
    SELECT id FROM lensers.profiles
    WHERE user_id = v_uid
    ORDER BY created_at ASC
    LIMIT 1
  )
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF p_data ? 'preferred_language' THEN
    v_language := COALESCE(NULLIF(btrim(p_data->>'preferred_language'), ''), 'en');
    INSERT INTO lensers.preferences (lenser_id, language)
    VALUES (v_row.id, v_language)
    ON CONFLICT (lenser_id) DO UPDATE
    SET language = EXCLUDED.language,
        updated_at = now();
  END IF;

  RETURN to_jsonb(v_row);
END;
$$;


ALTER FUNCTION "public"."fn_lensers_update_profile"("p_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_lenses_create_version"("p_lens_id" "uuid", "p_template_body" "text", "p_changelog" "text" DEFAULT NULL::"text", "p_parent_version_id" "uuid" DEFAULT NULL::"uuid") RETURNS "lenses"."versions"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'content', 'public'
    AS $$
  SELECT * FROM lenses.fn_upsert_draft_version(
    p_lens_id, p_template_body, p_changelog, p_parent_version_id
  );
$$;


ALTER FUNCTION "public"."fn_lenses_create_version"("p_lens_id" "uuid", "p_template_body" "text", "p_changelog" "text", "p_parent_version_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_lenses_list_versions"("p_lens_id" "uuid") RETURNS SETOF "lenses"."versions"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'lenses', 'public'
    AS $$
  SELECT * FROM lenses.fn_list_versions(p_lens_id);
$$;


ALTER FUNCTION "public"."fn_lenses_list_versions"("p_lens_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_lenses_publish_version"("p_version_id" "uuid") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'lensers', 'public'
    AS $$
  SELECT lenses.fn_publish_version(p_version_id);
$$;


ALTER FUNCTION "public"."fn_lenses_publish_version"("p_version_id" "uuid") OWNER TO "postgres";


ALTER FUNCTION "public"."fn_log_page_view"("p_target_type" "public"."page_view_target_enum", "p_target_id" "text", "p_path" "text", "p_referrer" "text", "p_user_agent" "text", "p_client_ip" "inet") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_media_bind_attachment"("p_object_id" "uuid", "p_entity_type" "text", "p_entity_id" "uuid", "p_binding_key" "text" DEFAULT '_default'::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'media', 'lensers', 'public'
    AS $$
DECLARE
    v_owner uuid;
    v_attachment_id uuid;
BEGIN
    SELECT owner_lenser_id INTO v_owner
    FROM media.objects WHERE id = p_object_id;

    IF v_owner IS NULL THEN
        RAISE EXCEPTION 'Media object not found: %', p_object_id;
    END IF;

    IF v_owner <> lensers.get_auth_lenser_id() THEN
        RAISE EXCEPTION 'Permission denied: not object owner';
    END IF;

    INSERT INTO media.attachments (object_id, entity_type, entity_id, binding_key, attached_by)
    VALUES (p_object_id, p_entity_type, p_entity_id, p_binding_key, lensers.get_auth_lenser_id())
    ON CONFLICT (entity_type, entity_id, binding_key)
    DO UPDATE SET object_id = EXCLUDED.object_id, attached_by = EXCLUDED.attached_by, attached_at = now()
    RETURNING id INTO v_attachment_id;

    RETURN v_attachment_id;
END;
$$;


ALTER FUNCTION "public"."fn_media_bind_attachment"("p_object_id" "uuid", "p_entity_type" "text", "p_entity_id" "uuid", "p_binding_key" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_media_bind_attachment"("p_object_id" "uuid", "p_entity_type" "text", "p_entity_id" "uuid", "p_binding_key" "text") IS 'Binds a media object to a business entity via a named slot. Upserts: if the (entity_type, entity_id, binding_key) already exists, replaces the bound object.';



CREATE OR REPLACE FUNCTION "public"."fn_media_finalize_upload"("p_object_id" "uuid", "p_bucket" "text", "p_object_key" "text", "p_byte_size" bigint DEFAULT NULL::bigint, "p_checksum" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'media', 'lensers', 'public'
    AS $$
DECLARE
    v_owner uuid;
BEGIN
    SELECT owner_lenser_id INTO v_owner
    FROM media.objects WHERE id = p_object_id;

    IF v_owner IS NULL THEN
        RAISE EXCEPTION 'Media object not found: %', p_object_id;
    END IF;

    IF v_owner <> lensers.get_auth_lenser_id() THEN
        RAISE EXCEPTION 'Permission denied: not object owner';
    END IF;

    UPDATE media.objects
    SET bucket = p_bucket,
        object_key = p_object_key,
        byte_size = COALESCE(p_byte_size, byte_size),
        checksum_sha256 = COALESCE(p_checksum, checksum_sha256),
        lifecycle_state = 'active',
        updated_at = now()
    WHERE id = p_object_id;
END;
$$;


ALTER FUNCTION "public"."fn_media_finalize_upload"("p_object_id" "uuid", "p_bucket" "text", "p_object_key" "text", "p_byte_size" bigint, "p_checksum" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_media_finalize_upload"("p_object_id" "uuid", "p_bucket" "text", "p_object_key" "text", "p_byte_size" bigint, "p_checksum" "text") IS 'Finalizes a media object upload. Sets bucket, object_key, byte_size, checksum, and transitions lifecycle_state to active. Validates ownership.';



CREATE OR REPLACE FUNCTION "public"."fn_media_soft_delete"("p_object_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'media', 'lensers', 'public'
    AS $$
DECLARE
    v_owner uuid;
BEGIN
    SELECT owner_lenser_id INTO v_owner
    FROM media.objects WHERE id = p_object_id;

    IF v_owner IS NULL THEN
        RAISE EXCEPTION 'Media object not found: %', p_object_id;
    END IF;

    IF v_owner <> lensers.get_auth_lenser_id() THEN
        RAISE EXCEPTION 'Permission denied: not object owner';
    END IF;

    UPDATE media.objects
    SET lifecycle_state = 'deleted', updated_at = now()
    WHERE id = p_object_id;
END;
$$;


ALTER FUNCTION "public"."fn_media_soft_delete"("p_object_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_media_unbind_attachment"("p_entity_type" "text", "p_entity_id" "uuid", "p_binding_key" "text" DEFAULT '_default'::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'media', 'lensers', 'public'
    AS $$
BEGIN
    DELETE FROM media.attachments
    WHERE entity_type = p_entity_type
      AND entity_id = p_entity_id
      AND binding_key = p_binding_key
      AND EXISTS (
          SELECT 1 FROM media.objects o
          WHERE o.id = attachments.object_id
            AND o.owner_lenser_id = lensers.get_auth_lenser_id()
      );
END;
$$;


ALTER FUNCTION "public"."fn_media_unbind_attachment"("p_entity_type" "text", "p_entity_id" "uuid", "p_binding_key" "text") OWNER TO "postgres";


ALTER FUNCTION "public"."fn_ops_submit_contact"("p_name" "text", "p_email" "text", "p_subject" "text", "p_message" "text", "p_kvkk_approved" boolean, "p_ip_address" "text", "p_user_agent" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_ops_submit_contact"("p_name" "text", "p_email" "text", "p_subject" "text", "p_message" "text", "p_kvkk_approved" boolean, "p_ip_address" "text", "p_user_agent" "text") IS 'Inserts a contact form submission into ops.contact. Accessible to anonymous users.';



ALTER FUNCTION "public"."fn_post_global_message"("p_battle_id" "uuid", "p_body" "text", "p_sender_handle" "text", "p_sender_role" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_post_global_message"("p_battle_id" "uuid", "p_body" "text", "p_sender_handle" "text", "p_sender_role" "text") IS 'Posts a chat message. sender_id is resolved from JWT — not accepted from caller.';



ALTER FUNCTION "public"."fn_publish_battle"("p_battle_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_purge_due_accounts"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'analytics'
    AS $$
DECLARE
  v_count   int := 0;
  v_profile RECORD;
BEGIN
  FOR v_profile IN
    SELECT id, user_id, deletion_deadline_at
    FROM lensers.profiles
    WHERE status = 'pending_deletion'
      AND deletion_deadline_at <= now() - interval '1 hour'
  LOOP
    UPDATE lensers.profiles
    SET display_name = 'Deleted User',
        handle       = 'deleted_' || v_profile.id::text,
        bio          = null,
        headline     = null,
        avatar_url   = null,
        banner_url   = null,
        website_url  = null,
        preferences  = null,
        status       = 'deleted',
        updated_at   = now()
    WHERE id = v_profile.id;

    PERFORM lensers.log_account_lifecycle_event(
      v_profile.id,
      v_profile.user_id,
      'deletion_completed',
      'pending_deletion'::lensers.lenser_status,
      'deleted'::lensers.lenser_status,
      'system_job',
      jsonb_build_object(
        'deletion_deadline_at',     v_profile.deletion_deadline_at,
        'purged_after_grace_period', true
      )
    );

    DELETE FROM lensers.relationships
    WHERE source_profile_id = v_profile.id OR target_profile_id = v_profile.id;

    DELETE FROM lensers.social_links WHERE lenser_id = v_profile.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."fn_purge_due_accounts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_reject_follow_request"("p_source_profile_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'auth'
    AS $$
DECLARE
  v_target_id uuid;
BEGIN
  SELECT id INTO v_target_id
  FROM lensers.profiles WHERE user_id = auth.uid();

  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE lensers.relationships
  SET status = 'rejected',
      responded_at = now()
  WHERE source_profile_id = p_source_profile_id
    AND target_profile_id = v_target_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'no_pending_request');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;


ALTER FUNCTION "public"."fn_reject_follow_request"("p_source_profile_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_remove_follow"("p_target_profile_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'auth'
    AS $$
DECLARE
  v_source_id uuid;
BEGIN
  SELECT id INTO v_source_id
  FROM lensers.profiles WHERE user_id = auth.uid();

  IF v_source_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE lensers.relationships
  SET status = 'removed',
      removed_at = now()
  WHERE source_profile_id = v_source_id
    AND target_profile_id = p_target_profile_id
    AND status IN ('accepted', 'pending');

  RETURN jsonb_build_object('following', false);
END;
$$;


ALTER FUNCTION "public"."fn_remove_follow"("p_target_profile_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_request_follow"("p_target_profile_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'auth'
    AS $$
DECLARE
  v_source_id     uuid;
  v_target        RECORD;
  v_existing      lensers.relationship_status;
  v_new_status    lensers.relationship_status;
BEGIN
  SELECT id INTO v_source_id
  FROM lensers.profiles WHERE user_id = auth.uid();

  IF v_source_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required or profile not found';
  END IF;

  IF v_source_id = p_target_profile_id THEN
    RAISE EXCEPTION 'Cannot follow yourself';
  END IF;

  -- Check target exists and is active
  SELECT p.id, p.status, p.visibility INTO v_target
  FROM lensers.profiles p WHERE p.id = p_target_profile_id;

  IF NOT FOUND OR v_target.status NOT IN ('active') THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'target_unavailable');
  END IF;

  -- Check if blocked in either direction
  IF EXISTS (
    SELECT 1 FROM lensers.relationships
    WHERE status = 'blocked'
      AND (
        (source_profile_id = v_source_id AND target_profile_id = p_target_profile_id)
        OR (source_profile_id = p_target_profile_id AND target_profile_id = v_source_id)
      )
  ) THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'blocked');
  END IF;

  -- Check existing relationship
  SELECT r.status INTO v_existing
  FROM lensers.relationships r
  WHERE r.source_profile_id = v_source_id AND r.target_profile_id = p_target_profile_id;

  IF v_existing = 'accepted' THEN
    RETURN jsonb_build_object('status', 'accepted', 'reason', 'already_following');
  END IF;

  IF v_existing = 'pending' THEN
    RETURN jsonb_build_object('status', 'pending', 'reason', 'already_pending');
  END IF;

  -- Determine status based on target visibility
  IF v_target.visibility IN ('public', 'community') THEN
    v_new_status := 'accepted';
  ELSE
    v_new_status := 'pending';
  END IF;

  INSERT INTO lensers.relationships (source_profile_id, target_profile_id, status, accepted_at)
  VALUES (
    v_source_id,
    p_target_profile_id,
    v_new_status,
    CASE WHEN v_new_status = 'accepted' THEN now() ELSE null END
  )
  ON CONFLICT (source_profile_id, target_profile_id)
  DO UPDATE SET
    status       = v_new_status,
    requested_at = now(),
    responded_at = null,
    accepted_at  = CASE WHEN v_new_status = 'accepted' THEN now() ELSE null END,
    removed_at   = null;

  RETURN jsonb_build_object('status', v_new_status::text);
END;
$$;


ALTER FUNCTION "public"."fn_request_follow"("p_target_profile_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_resolve_mentions"("p_ids" "uuid"[]) RETURNS TABLE("id" "uuid", "title" "text", "link" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'lenses', 'content', 'lensers', 'auth'
    AS $$
  SELECT
    l.id,
    COALESCE(t.title, '') AS title,
    '/lenses/' || l.id::text AS link
  FROM lenses.lenses l
  LEFT JOIN content.entity_translations t
    ON  t.entity_id   = l.id
    AND t.entity_type = 'lens'
    AND t.is_original = true
  WHERE l.id = ANY(p_ids)
    AND (
      l.visibility = 'public'
      OR l.lenser_id = lensers.get_auth_lenser_id()
    );
$$;


ALTER FUNCTION "public"."fn_resolve_mentions"("p_ids" "uuid"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_resolve_mentions"("p_ids" "uuid"[]) IS 'Batch-resolves lens mention IDs to (id, title, link). Caller sees their own private lenses; other private lenses are excluded. Replaces N+1 getLensDetail calls in mentionService.';



CREATE OR REPLACE FUNCTION "public"."fn_revoke_api_key"("p_key_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'ai'
    AS $$
BEGIN
    PERFORM ai.fn_revoke_api_key(p_key_id => p_key_id);
END;
$$;


ALTER FUNCTION "public"."fn_revoke_api_key"("p_key_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_revoke_api_key"("p_key_id" "uuid") IS 'Public REST wrapper for ai.fn_revoke_api_key. Soft-revokes a BYOK API key — sets is_active=false, records revoked_at. Only the key owner can revoke (enforced inside ai.fn_revoke_api_key). The ai schema is not exposed in PostgREST — this wrapper is the only REST-callable entry point for key revocation. Added in migration 000057.';



CREATE OR REPLACE FUNCTION "public"."fn_save_workflow_node_config"("p_node_id" "uuid", "p_config" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'lensers', 'public'
    AS $$
DECLARE
  v_lenser_id uuid;
BEGIN
  v_lenser_id := lensers.get_auth_lenser_id();

  -- Guard: caller must own the workflow that contains this node
  IF NOT EXISTS (
    SELECT 1
    FROM lenses.workflow_nodes n
    JOIN lenses.workflows w ON w.id = n.workflow_id
    WHERE n.id = p_node_id
      AND w.lenser_id = v_lenser_id
  ) THEN
    RAISE EXCEPTION 'node_not_found_or_forbidden';
  END IF;

  UPDATE lenses.workflow_nodes
  SET config = p_config
  WHERE id = p_node_id;
END;
$$;


ALTER FUNCTION "public"."fn_save_workflow_node_config"("p_node_id" "uuid", "p_config" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_schedule_account_deletion"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'auth'
    AS $$
DECLARE
  v_uid uuid;
  v_deadline timestamptz;
  v_profile RECORD;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT id, user_id, status
  INTO v_profile
  FROM lensers.profiles
  WHERE user_id = v_uid
  FOR UPDATE;

  IF NOT FOUND OR v_profile.status NOT IN ('active', 'deactivated') THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_eligible');
  END IF;

  v_deadline := now() + interval '30 days';

  -- Step 1: set the deletion timestamps. Existing trigger may temporarily move
  -- active profiles to `deactivated`, so we normalize status in step 2.
  UPDATE lensers.profiles
  SET deletion_requested_at = COALESCE(deletion_requested_at, now()),
      deletion_deadline_at = v_deadline,
      updated_at = now()
  WHERE id = v_profile.id;

  -- Step 2: persist the intended grace-period state used by purge + auth flow.
  UPDATE lensers.profiles
  SET status = 'pending_deletion',
      deletion_deadline_at = v_deadline,
      updated_at = now()
  WHERE id = v_profile.id;

  PERFORM lensers.log_account_lifecycle_event(
    v_profile.id,
    v_profile.user_id,
    'deletion_scheduled',
    v_profile.status,
    'pending_deletion'::lensers.lenser_status,
    'user_action',
    jsonb_build_object('deletion_deadline_at', v_deadline)
  );

  RETURN jsonb_build_object('success', true, 'status', 'pending_deletion', 'deadline', v_deadline);
END;
$$;


ALTER FUNCTION "public"."fn_schedule_account_deletion"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_search_lensers"("p_query" "text", "p_limit" integer DEFAULT 8) RETURNS TABLE("id" "uuid", "handle" "text", "display_name" "text", "avatar_url" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'lensers', 'public'
    AS $$
  SELECT
    p.id,
    p.handle,
    p.display_name,
    p.avatar_url
  FROM lensers.profiles p
  WHERE
    p.status                = 'active'
    AND p.deletion_requested_at IS NULL
    -- Visibility gate (matches lensers.lenser_visibility enum):
    --   public    → visible to everyone including anon
    --   community → visible to authenticated callers (get_auth_lenser_id IS NOT NULL)
    --   private   → visible to self only
    AND (
      p.visibility::text = 'public'
      OR (p.visibility::text = 'community' AND lensers.get_auth_lenser_id() IS NOT NULL)
      OR p.id = lensers.get_auth_lenser_id()
    )
    AND (
      CASE
        WHEN left(p_query, 1) = '@' THEN
          p.handle ILIKE '%' || substring(p_query FROM 2) || '%'
        ELSE
          p.handle       ILIKE '%' || p_query || '%'
          OR p.display_name ILIKE '%' || p_query || '%'
      END
    )
  ORDER BY
    CASE
      WHEN left(p_query, 1) = '@' THEN
        CASE
          WHEN p.handle = lower(substring(p_query FROM 2))              THEN 0
          WHEN p.handle ILIKE lower(substring(p_query FROM 2)) || '%'   THEN 1
          ELSE 2
        END
      ELSE
        CASE
          WHEN p.handle = lower(p_query)     THEN 0
          WHEN p.handle ILIKE p_query || '%' THEN 1
          ELSE 2
        END
    END,
    p.handle
  LIMIT LEAST(COALESCE(p_limit, 8), 20);
$$;


ALTER FUNCTION "public"."fn_search_lensers"("p_query" "text", "p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_search_lensers"("p_query" "text", "p_limit" integer) IS 'Search lensers by handle or display_name for battle invite / contender picker. Respects profile visibility: public=all, community=authenticated, private=self only. Prefix @ to restrict to handle-only search. LIMIT capped at 20. SECURITY DEFINER.';



CREATE OR REPLACE FUNCTION "public"."fn_start_workflow_run"("p_workflow_id" "uuid", "p_inputs" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'lensers', 'public'
    AS $$
BEGIN
  RETURN lenses.fn_start_workflow_run(p_workflow_id, p_inputs);
END;
$$;


ALTER FUNCTION "public"."fn_start_workflow_run"("p_workflow_id" "uuid", "p_inputs" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_start_workflow_run"("p_workflow_id" "uuid", "p_inputs" "jsonb") IS 'Public-schema wrapper for lenses.fn_start_workflow_run. Called from PostgREST /rpc/fn_start_workflow_run.';



CREATE OR REPLACE FUNCTION "public"."fn_start_workflow_run"("p_workflow_id" "uuid", "p_inputs" "jsonb" DEFAULT '{}'::"jsonb", "p_global_model_id" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'lensers', 'public'
    AS $$
BEGIN
  RETURN lenses.fn_start_workflow_run(p_workflow_id, p_inputs, p_global_model_id);
END;
$$;


ALTER FUNCTION "public"."fn_start_workflow_run"("p_workflow_id" "uuid", "p_inputs" "jsonb", "p_global_model_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_start_workflow_run"("p_workflow_id" "uuid", "p_inputs" "jsonb", "p_global_model_id" "text") IS 'Public-schema wrapper for lenses.fn_start_workflow_run with global_model_id support.';



CREATE OR REPLACE FUNCTION "public"."fn_store_api_key"("p_provider" "text", "p_label" "text" DEFAULT NULL::"text", "p_raw_key" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'ai', 'public'
    AS $$
BEGIN
    RETURN ai.fn_store_api_key(
        p_provider => p_provider,
        p_label    => p_label,
        p_raw_key  => p_raw_key
    );
END;
$$;


ALTER FUNCTION "public"."fn_store_api_key"("p_provider" "text", "p_label" "text", "p_raw_key" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_store_api_key"("p_provider" "text", "p_label" "text", "p_raw_key" "text") IS 'Public REST wrapper for ai.fn_store_api_key. Encrypts a BYOK API key via Vault and stores a reference row in ai.keys. The ai schema is not exposed in PostgREST — this wrapper is the only REST-callable entry point for key storage. Returns the key row UUID. Added in migration 000057.';



CREATE OR REPLACE FUNCTION "public"."fn_switch_active_lenser"("p_lenser_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'agents', 'auth'
    AS $$
DECLARE
  v_human_id uuid;
BEGIN
  -- Resolve the caller's human lenser profile
  SELECT p.id INTO v_human_id
  FROM lensers.profiles p
  WHERE p.user_id = auth.uid()
    AND p.type    = 'human'
    AND p.status  = 'active'
  LIMIT 1;

  IF v_human_id IS NULL THEN
    RAISE EXCEPTION 'No active human profile found for this user';
  END IF;

  -- If switching back to human profile, store NULL
  IF p_lenser_id = v_human_id THEN
    UPDATE lensers.preferences
    SET active_lenser_id = NULL,
        updated_at       = now()
    WHERE lenser_id = v_human_id;
    RETURN;
  END IF;

  -- Validate caller owns the target AI lenser
  IF NOT EXISTS (
    SELECT 1
    FROM agents.ownerships   o
    JOIN agents.ai_lensers   al    ON al.id     = o.ai_lenser_id
    JOIN lensers.profiles    ai_p  ON ai_p.id   = al.profile_id
    WHERE o.owner_lenser_id = v_human_id
      AND ai_p.id           = p_lenser_id
      AND o.role            = 'owner'
      AND o.revoked_at      IS NULL
      AND ai_p.status       = 'active'
  ) THEN
    RAISE EXCEPTION 'Cannot switch: profile not found or not owned'
      USING ERRCODE = '42501';
  END IF;

  UPDATE lensers.preferences
  SET active_lenser_id = p_lenser_id,
      updated_at       = now()
  WHERE lenser_id = v_human_id;
END;
$$;


ALTER FUNCTION "public"."fn_switch_active_lenser"("p_lenser_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_switch_active_lenser"("p_lenser_id" "uuid") IS 'Switches the authenticated user''s active workspace to the given lenser ID. Must be the user''s own human profile (resets to default) or an AI lenser they own as primary owner. Stores selection in lensers.preferences.active_lenser_id.';



ALTER FUNCTION "public"."fn_tag_activity_log"("p_events" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_tags_get_cloud"("p_limit" integer DEFAULT 50) RETURNS TABLE("id" "uuid", "slug" "text", "name" "text", "visibility" "text", "created_at" timestamp with time zone, "created_count" bigint, "viewed_count" bigint, "reacted_count" bigint, "total_usage" bigint, "trend_score_7d" numeric)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'content', 'analytics'
    AS $$
  SELECT
    id,
    slug,
    name,
    visibility,
    created_at,
    created_count,
    viewed_count,
    reacted_count,
    total_usage,
    trend_score_7d
  FROM vw_tags_public_stats
  ORDER BY trend_score_7d DESC NULLS LAST, total_usage DESC NULLS LAST
  LIMIT LEAST(p_limit, 100);
$$;


ALTER FUNCTION "public"."fn_tags_get_cloud"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_tags_search"("p_query" "text", "p_lang" "text" DEFAULT 'en'::"text", "p_limit" integer DEFAULT 5) RETURNS TABLE("id" "uuid", "name" "text", "slug" "text", "visibility" "text", "total_usage" bigint, "lang_match" boolean)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    t.id,
    COALESCE(tr_lang.name, tr_en.name, t.slug) AS name,
    t.slug,
    t.visibility::text,
    COALESCE(s.total_usage, 0)                  AS total_usage,
    (tr_lang.tag_id IS NOT NULL)                AS lang_match
  FROM content.tags t
  LEFT JOIN content.tag_translations tr_lang
    ON tr_lang.tag_id = t.id AND tr_lang.language_code = p_lang
  LEFT JOIN content.tag_translations tr_en
    ON tr_en.tag_id = t.id AND tr_en.language_code = 'en'
  LEFT JOIN vw_tags_public_stats s
    ON s.id = t.id
  WHERE
    t.visibility = 'public'
    AND (
      COALESCE(tr_lang.name, tr_en.name, t.slug) ILIKE '%' || p_query || '%'
      OR t.slug ILIKE '%' || p_query || '%'
    )
  ORDER BY
    lang_match DESC,
    CASE
      WHEN LOWER(COALESCE(tr_lang.name, tr_en.name, t.slug)) = LOWER(p_query) THEN 0
      ELSE 1
    END,
    COALESCE(s.total_usage, 0) DESC
  LIMIT p_limit;
$$;


ALTER FUNCTION "public"."fn_tags_search"("p_query" "text", "p_lang" "text", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_unblock_profile"("p_target_profile_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'auth'
    AS $$
DECLARE
  v_source_id uuid;
BEGIN
  SELECT id INTO v_source_id
  FROM lensers.profiles WHERE user_id = auth.uid();

  IF v_source_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  DELETE FROM lensers.relationships
  WHERE source_profile_id = v_source_id
    AND target_profile_id = p_target_profile_id
    AND status = 'blocked';

  RETURN jsonb_build_object('blocked', false);
END;
$$;


ALTER FUNCTION "public"."fn_unblock_profile"("p_target_profile_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_update_agent_profile"("p_ai_lenser_id" "uuid", "p_patch" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'agents', 'auth'
    AS $$
DECLARE
  v_caller_id uuid;
BEGIN
  v_caller_id := lensers.get_auth_lenser_id();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Verify caller is the primary owner of this AI lenser
  IF NOT EXISTS (
    SELECT 1
    FROM agents.ownerships o
    JOIN agents.ai_lensers al ON al.id = o.ai_lenser_id
    WHERE al.profile_id   = p_ai_lenser_id
      AND o.owner_lenser_id = v_caller_id
      AND o.role            = 'owner'
      AND o.revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Forbidden: you do not own this AI lenser'
      USING ERRCODE = '42501';
  END IF;

  -- Apply safe subset of profile fields
  UPDATE lensers.profiles
  SET
    display_name = CASE WHEN p_patch ? 'display_name' THEN p_patch->>'display_name' ELSE display_name END,
    avatar_url   = CASE WHEN p_patch ? 'avatar_url'   THEN p_patch->>'avatar_url'   ELSE avatar_url   END,
    banner_url   = CASE WHEN p_patch ? 'banner_url'   THEN p_patch->>'banner_url'   ELSE banner_url   END,
    bio          = CASE WHEN p_patch ? 'bio'          THEN p_patch->>'bio'          ELSE bio          END,
    headline     = CASE WHEN p_patch ? 'headline'     THEN p_patch->>'headline'     ELSE headline     END,
    website_url  = CASE WHEN p_patch ? 'website_url'  THEN p_patch->>'website_url'  ELSE website_url  END,
    updated_at   = now()
  WHERE id = p_ai_lenser_id
    AND type = 'ai';
END;
$$;


ALTER FUNCTION "public"."fn_update_agent_profile"("p_ai_lenser_id" "uuid", "p_patch" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_update_agent_profile"("p_ai_lenser_id" "uuid", "p_patch" "jsonb") IS 'Allows an owner lenser to patch display_name, avatar_url, banner_url, bio, headline, website_url of an AI lenser they own. Validates ownership via agents.ownerships.';



CREATE OR REPLACE FUNCTION "public"."fn_update_workflow"("p_workflow_id" "uuid", "p_title" "text", "p_description" "text" DEFAULT NULL::"text", "p_visibility" "text" DEFAULT 'public'::"text") RETURNS TABLE("id" "uuid", "lenser_id" "uuid", "title" "text", "description" "text", "visibility" "text", "battle_count" integer, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'lensers', 'public'
    AS $$
DECLARE
  v_lenser_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Resolve auth.uid() → profile UUID (consistent with all other ownership-checking RPCs)
  v_lenser_id := lensers.get_auth_lenser_id();

  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF char_length(trim(p_title)) < 1 OR char_length(trim(p_title)) > 200 THEN
    RAISE EXCEPTION 'Title must be between 1 and 200 characters';
  END IF;

  IF p_visibility NOT IN ('public', 'private', 'unlisted') THEN
    RAISE EXCEPTION 'Invalid visibility value';
  END IF;

  RETURN QUERY
  UPDATE lenses.workflows
  SET
    title       = trim(p_title),
    description = p_description,
    visibility  = p_visibility,
    updated_at  = now()
  WHERE id        = p_workflow_id
    AND lenser_id = v_lenser_id
  RETURNING
    lenses.workflows.id,
    lenses.workflows.lenser_id,
    lenses.workflows.title,
    lenses.workflows.description,
    lenses.workflows.visibility,
    lenses.workflows.battle_count,
    lenses.workflows.created_at,
    lenses.workflows.updated_at;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Workflow not found or not owned by caller';
  END IF;
END;
$$;


ALTER FUNCTION "public"."fn_update_workflow"("p_workflow_id" "uuid", "p_title" "text", "p_description" "text", "p_visibility" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_update_workflow"("p_workflow_id" "uuid", "p_title" "text", "p_description" "text", "p_visibility" "text") IS 'Update workflow title, description, and visibility. Ownership resolved via lensers.get_auth_lenser_id() (supports AI lenser context switching). SECURITY DEFINER.';



CREATE OR REPLACE FUNCTION "public"."fn_update_workflow_node_result"("p_run_id" "uuid", "p_node_id" "uuid", "p_status" "text", "p_output_data" "jsonb" DEFAULT NULL::"jsonb", "p_error_message" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'lensers', 'public'
    AS $$
DECLARE
  v_caller_id uuid;
BEGIN
  v_caller_id := lensers.get_auth_lenser_id();

  IF NOT EXISTS (
    SELECT 1
    FROM lenses.workflow_runs r
    JOIN lenses.workflows w ON w.id = r.workflow_id
    WHERE r.id = p_run_id
      AND (w.lenser_id = v_caller_id OR w.visibility = 'public')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: caller cannot update results for run %', p_run_id
      USING ERRCODE = '42501';
  END IF;

  UPDATE lenses.workflow_node_results
  SET
    status        = p_status,
    output_data   = COALESCE(p_output_data, output_data),
    error_message = COALESCE(p_error_message, error_message),
    started_at    = CASE WHEN p_status = 'running' AND started_at IS NULL THEN now() ELSE started_at END,
    completed_at  = CASE WHEN p_status IN ('completed', 'failed', 'cancelled') THEN now() ELSE completed_at END
  WHERE run_id = p_run_id AND node_id = p_node_id;
END;
$$;


ALTER FUNCTION "public"."fn_update_workflow_node_result"("p_run_id" "uuid", "p_node_id" "uuid", "p_status" "text", "p_output_data" "jsonb", "p_error_message" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_update_workflow_node_result"("p_run_id" "uuid", "p_node_id" "uuid", "p_status" "text", "p_output_data" "jsonb", "p_error_message" "text") IS 'Updates a workflow_node_result row with status, output_data, and error_message. Cancellation is treated as a terminal state.';



CREATE OR REPLACE FUNCTION "public"."fn_update_workflow_run_status"("p_run_id" "uuid", "p_status" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'lensers', 'public'
    AS $$
DECLARE
  v_caller_id uuid;
BEGIN
  v_caller_id := lensers.get_auth_lenser_id();

  IF NOT EXISTS (
    SELECT 1
    FROM lenses.workflow_runs r
    JOIN lenses.workflows w ON w.id = r.workflow_id
    WHERE r.id = p_run_id
      AND (w.lenser_id = v_caller_id OR w.visibility = 'public')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: caller cannot update run %', p_run_id
      USING ERRCODE = '42501';
  END IF;

  UPDATE lenses.workflow_runs
  SET
    status       = p_status,
    completed_at = CASE WHEN p_status IN ('completed', 'failed', 'cancelled') THEN now() ELSE completed_at END
  WHERE id = p_run_id;
END;
$$;


ALTER FUNCTION "public"."fn_update_workflow_run_status"("p_run_id" "uuid", "p_status" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_update_workflow_run_status"("p_run_id" "uuid", "p_status" "text") IS 'Updates a workflow_run status (running, completed, failed, cancelled). Called by execution orchestrator after DAG execution completes.';



CREATE OR REPLACE FUNCTION "public"."fn_upsert_workflow_edges"("p_workflow_id" "uuid", "p_edges" "jsonb") RETURNS TABLE("id" "uuid", "workflow_id" "uuid", "source_node_id" "uuid", "target_node_id" "uuid", "source_output_key" "text", "target_param_label" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'lensers', 'public'
    AS $$
DECLARE
  v_caller_id uuid;
BEGIN
  v_caller_id := lensers.get_auth_lenser_id();

  IF NOT EXISTS (
    SELECT 1 FROM lenses.workflows w
    WHERE w.id = p_workflow_id AND w.lenser_id = v_caller_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: caller does not own workflow %', p_workflow_id
      USING ERRCODE = '42501';
  END IF;

  -- Full replace: delete all existing edges for this workflow
  DELETE FROM lenses.workflow_edges
  WHERE lenses.workflow_edges.workflow_id = p_workflow_id;

  -- Insert incoming edges (skip if array is empty)
  IF jsonb_array_length(p_edges) > 0 THEN
    INSERT INTO lenses.workflow_edges (
      id,
      workflow_id,
      source_node_id,
      target_node_id,
      source_output_key,
      target_param_label
    )
    SELECT
      COALESCE((e->>'id')::uuid, gen_random_uuid()),
      p_workflow_id,
      (e->>'source_node_id')::uuid,
      (e->>'target_node_id')::uuid,
      COALESCE(e->>'source_output_key', 'output'),
      e->>'target_param_label'
    FROM jsonb_array_elements(p_edges) AS e;
  END IF;

  -- Return ALL edges for the workflow (not just the ones we inserted)
  RETURN QUERY
    SELECT
      we.id,
      we.workflow_id,
      we.source_node_id,
      we.target_node_id,
      we.source_output_key,
      we.target_param_label
    FROM lenses.workflow_edges we
    WHERE we.workflow_id = p_workflow_id;
END;
$$;


ALTER FUNCTION "public"."fn_upsert_workflow_edges"("p_workflow_id" "uuid", "p_edges" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_upsert_workflow_edges"("p_workflow_id" "uuid", "p_edges" "jsonb") IS 'Bulk-upserts workflow edges for a workflow the caller owns.';



CREATE OR REPLACE FUNCTION "public"."fn_upsert_workflow_nodes"("p_workflow_id" "uuid", "p_nodes" "jsonb") RETURNS TABLE("id" "uuid", "workflow_id" "uuid", "lens_id" "uuid", "version_id" "uuid", "position_x" double precision, "position_y" double precision, "label" "text", "ordinal" integer, "config" "jsonb", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lenses', 'lensers', 'public'
    AS $$
DECLARE
  v_caller_id uuid;
BEGIN
  v_caller_id := lensers.get_auth_lenser_id();

  IF NOT EXISTS (
    SELECT 1 FROM lenses.workflows w
    WHERE w.id = p_workflow_id AND w.lenser_id = v_caller_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: caller does not own workflow %', p_workflow_id
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  INSERT INTO lenses.workflow_nodes (
    id,
    workflow_id,
    lens_id,
    version_id,
    position_x,
    position_y,
    label,
    ordinal,
    config
  )
  SELECT
    COALESCE((n->>'id')::uuid, gen_random_uuid()),
    p_workflow_id,
    (n->>'lens_id')::uuid,
    (n->>'version_id')::uuid,
    COALESCE((n->>'position_x')::float, 0),
    COALESCE((n->>'position_y')::float, 0),
    n->>'label',
    COALESCE((n->>'ordinal')::integer, 0),
    COALESCE(n->'config', '{}'::jsonb)
  FROM jsonb_array_elements(p_nodes) AS n
  ON CONFLICT ON CONSTRAINT workflow_nodes_pkey DO UPDATE SET
    position_x = EXCLUDED.position_x,
    position_y = EXCLUDED.position_y,
    label      = EXCLUDED.label,
    ordinal    = EXCLUDED.ordinal,
    version_id = EXCLUDED.version_id,
    config     = EXCLUDED.config
  RETURNING
    lenses.workflow_nodes.id,
    lenses.workflow_nodes.workflow_id,
    lenses.workflow_nodes.lens_id,
    lenses.workflow_nodes.version_id,
    lenses.workflow_nodes.position_x,
    lenses.workflow_nodes.position_y,
    lenses.workflow_nodes.label,
    lenses.workflow_nodes.ordinal,
    lenses.workflow_nodes.config,
    lenses.workflow_nodes.created_at;
END;
$$;


ALTER FUNCTION "public"."fn_upsert_workflow_nodes"("p_workflow_id" "uuid", "p_nodes" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_upsert_workflow_nodes"("p_workflow_id" "uuid", "p_nodes" "jsonb") IS 'Bulk-upserts workflow nodes for a workflow the caller owns. p_nodes is a JSON array matching UpsertNodeInput shape. Now includes config JSONB for per-node model and parameter overrides.';



CREATE OR REPLACE FUNCTION "public"."fn_workflows_get_popular"("p_offset" integer DEFAULT 0, "p_limit" integer DEFAULT 12, "p_search" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "lenser_id" "uuid", "title" "text", "description" "text", "visibility" "text", "battle_count" integer, "reaction_totals" "jsonb", "fork_count" integer, "parent_workflow_id" "uuid", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "hot_score" double precision)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'lenses'
    AS $$
  SELECT
    w.id,
    w.lenser_id,
    w.title,
    w.description,
    w.visibility::text,
    w.battle_count,
    w.reaction_totals,
    w.fork_count,
    w.parent_workflow_id,
    w.created_at,
    w.updated_at,
    log(GREATEST(1,
        5.0 * w.battle_count
      + 3.0 * w.fork_count
      + 4.0 * COALESCE((w.reaction_totals->>'copy')::int, 0)
      + 2.0 * COALESCE((w.reaction_totals->>'like')::int, 0)
      + 1.0 * COALESCE((w.reaction_totals->>'saved')::int, 0)
    )) / NULLIF(
      pow((extract(epoch FROM now() - w.created_at) / 3600.0 + 2), 1.5),
      0
    ) AS hot_score
  FROM lenses.workflows w
  WHERE w.visibility::text = 'public'
    AND (p_search IS NULL OR w.title ILIKE '%' || p_search || '%')
  ORDER BY hot_score DESC, w.created_at DESC
  LIMIT  p_limit
  OFFSET p_offset;
$$;


ALTER FUNCTION "public"."fn_workflows_get_popular"("p_offset" integer, "p_limit" integer, "p_search" "text") OWNER TO "postgres";


ALTER FUNCTION "public"."fn_xp_get_apps"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_xp_get_apps"() IS 'Returns all active XP app definitions.';



ALTER FUNCTION "public"."fn_xp_get_contributions"("p_lenser_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_xp_get_contributions"("p_lenser_id" "uuid") IS 'Returns XP contributions for the given lenser or the caller.';



ALTER FUNCTION "public"."fn_xp_get_history"("p_lenser_id" "uuid", "p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_xp_get_history"("p_lenser_id" "uuid", "p_limit" integer) IS 'Returns paginated XP event history for the given lenser or the caller.';



ALTER FUNCTION "public"."fn_xp_get_self"() OWNER TO "postgres";


ALTER FUNCTION "public"."fn_xp_get_summary"("p_lenser_id" "uuid", "p_app_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_xp_get_summary"("p_lenser_id" "uuid", "p_app_id" "uuid") IS 'Returns XP summary (total, level, level band) for the given lenser or the caller.';



CREATE OR REPLACE FUNCTION "public"."get_active_models_by_provider"("p_provider_key" "text") RETURNS TABLE("id" "uuid", "name" "text", "key" "text", "provider_key" "text", "provider_name" "text", "context_window_tokens" integer, "supports_tools" boolean, "supports_json_schema" boolean, "supports_vision" boolean, "capabilities" "text"[], "created_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'ai', 'public'
    AS $$
    SELECT
        m.id,
        m.name,
        m.key,
        p.key               AS provider_key,
        p.display_name      AS provider_name,
        m.context_window_tokens,
        m.supports_tools,
        m.supports_json_schema,
        m.supports_vision,
        m.capabilities,
        m.created_at
    FROM  ai.models     m
    JOIN  ai.providers  p ON p.id = m.provider_id
    WHERE p.key       = p_provider_key
      AND p.is_active = true
      AND m.is_active = true
    ORDER BY m.name;
$$;


ALTER FUNCTION "public"."get_active_models_by_provider"("p_provider_key" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_active_models_by_provider"("p_provider_key" "text") IS 'Returns active models for a given active provider key. Column model_key renamed to key in migration 000059. SECURITY DEFINER — runs as postgres, bypasses RLS.';



CREATE OR REPLACE FUNCTION "public"."get_active_providers"() RETURNS TABLE("id" "uuid", "key" "text", "display_name" "text", "base_url" "text", "docs_url" "text", "metadata" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'ai', 'public'
    AS $$
    SELECT
        p.id,
        p.key,
        p.display_name,
        p.base_url,
        p.docs_url,
        p.metadata,
        p.created_at,
        p.updated_at
    FROM ai.providers p
    WHERE p.is_active = true
      AND EXISTS (
          SELECT 1
          FROM ai.models m
          WHERE m.provider_id = p.id
            AND m.is_active   = true
      )
    ORDER BY p.display_name;
$$;


ALTER FUNCTION "public"."get_active_providers"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_active_providers"() IS 'Returns active AI providers that have at least one active model. Providers that are marked active but have no active models are excluded. SECURITY DEFINER — runs as postgres. Callable by anon and authenticated. ai.providers is not directly accessible by those roles.';



CREATE OR REPLACE FUNCTION "public"."get_model_info"("p_provider_key" "text", "p_model_key" "text") RETURNS TABLE("model_id" "uuid", "unit_type" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'ai'
    AS $$
    SELECT m.id AS model_id, mp.unit_type::text
    FROM ai.models m
    JOIN ai.providers p ON p.id = m.provider_id
    JOIN ai.model_pricing mp
        ON mp.model_id = m.id
       AND mp.effective_to IS NULL
    WHERE p.key = p_provider_key
      AND m.key = p_model_key
      AND m.is_active = true
    LIMIT 1;
$$;


ALTER FUNCTION "public"."get_model_info"("p_provider_key" "text", "p_model_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'lensers', 'auth'
    AS $$
  select coalesce((auth.jwt() ->> 'role') = 'admin', false);
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


ALTER FUNCTION "public"."list_tags_stats"("p_lang" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."set_updated_at"() IS 'Shared BEFORE UPDATE trigger function. Sets updated_at = now(). SECURITY DEFINER, search_path locked to empty. Used cross-schema by wallet, billing, and content updated_at triggers.';



CREATE OR REPLACE FUNCTION "tenancy"."fn_create_personal_workspace"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'tenancy', 'lensers', 'public'
    AS $$
DECLARE
    v_workspace_id uuid;
    v_slug         text;
BEGIN
    -- Idempotency guard: if this lenser already owns a personal workspace, do nothing.
    IF EXISTS (
        SELECT 1 FROM tenancy.workspaces
        WHERE owner_lenser_id = NEW.id AND type = 'personal'
    ) THEN
        RETURN NEW;
    END IF;

    -- Primary attempt: use the lenser's handle as the workspace slug.
    v_slug := NEW.handle;

    BEGIN
        INSERT INTO tenancy.workspaces (slug, type, display_name, owner_lenser_id)
        VALUES (v_slug, 'personal', COALESCE(NEW.display_name, NEW.handle), NEW.id)
        RETURNING id INTO v_workspace_id;

    EXCEPTION WHEN unique_violation THEN
        -- Slug already taken by another workspace (org or another lenser).
        -- Fall back to handle-<first 8 hex chars of the new profile id>.
        v_slug := NEW.handle || '-' || left(NEW.id::text, 8);

        INSERT INTO tenancy.workspaces (slug, type, display_name, owner_lenser_id)
        VALUES (v_slug, 'personal', COALESCE(NEW.display_name, NEW.handle), NEW.id)
        RETURNING id INTO v_workspace_id;
    END;

    INSERT INTO tenancy.workspace_members (workspace_id, lenser_id, role)
    VALUES (v_workspace_id, NEW.id, 'owner')
    ON CONFLICT (workspace_id, lenser_id) DO NOTHING;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "tenancy"."fn_create_personal_workspace"() OWNER TO "postgres";


COMMENT ON FUNCTION "tenancy"."fn_create_personal_workspace"() IS 'AFTER INSERT OR UPDATE trigger on lensers.profiles. Ensures a personal workspace
exists for the lenser — idempotent (no-op if one already exists). Primary slug =
handle; falls back to handle-<8-char id prefix> on unique_violation so slug
collisions never block profile creation.';



CREATE OR REPLACE FUNCTION "tenancy"."fn_guard_personal_workspace"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'tenancy', 'lensers', 'public'
    AS $$
BEGIN
    -- Forbid directly deleting a personal workspace while the owning profile exists
    IF OLD.type = 'personal' AND EXISTS (
        SELECT 1 FROM lensers.profiles WHERE id = OLD.owner_lenser_id
    ) THEN
        RAISE EXCEPTION
            'Cannot delete personal workspace % while lenser profile % still exists. '
            'Delete the lensers.profiles row instead — the workspace will cascade.',
            OLD.id, OLD.owner_lenser_id
            USING ERRCODE = 'restrict_violation';
    END IF;

    RETURN OLD;
END;
$$;


ALTER FUNCTION "tenancy"."fn_guard_personal_workspace"() OWNER TO "postgres";


COMMENT ON FUNCTION "tenancy"."fn_guard_personal_workspace"() IS 'BEFORE DELETE guard on tenancy.workspaces. Blocks direct deletion of a personal workspace while the owning lenser profile still exists. Cascade deletes via lensers.profiles are still allowed because the profile row is gone by then.';



CREATE OR REPLACE FUNCTION "tenancy"."fn_guard_personal_workspace_status"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'tenancy', 'lensers', 'public'
    AS $$
BEGIN
    IF OLD.type = 'personal'
       AND NEW.status IS DISTINCT FROM 'active'
       AND OLD.status = 'active'
       AND EXISTS (
           SELECT 1 FROM lensers.profiles WHERE id = OLD.owner_lenser_id
       )
    THEN
        RAISE EXCEPTION
            'Cannot deactivate personal workspace % while lenser profile % still exists. '
            'Update lensers.profiles.status instead.',
            OLD.id, OLD.owner_lenser_id
            USING ERRCODE = 'restrict_violation';
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "tenancy"."fn_guard_personal_workspace_status"() OWNER TO "postgres";


COMMENT ON FUNCTION "tenancy"."fn_guard_personal_workspace_status"() IS 'BEFORE UPDATE guard on tenancy.workspaces. Blocks status changes away from ''active'' on a personal workspace while the owning lenser profile still exists. Prevents the workspace_not_found error in execute routes that query status=active.';



CREATE OR REPLACE FUNCTION "tenancy"."is_workspace_admin"("p_workspace_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'tenancy', 'lensers', 'public'
    AS $$
    SELECT EXISTS (
        SELECT 1 FROM tenancy.workspace_members wm
        WHERE wm.workspace_id = p_workspace_id
          AND wm.lenser_id = lensers.get_auth_lenser_id()
          AND wm.role IN ('owner', 'admin')
    );
$$;


ALTER FUNCTION "tenancy"."is_workspace_admin"("p_workspace_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "tenancy"."is_workspace_member"("p_workspace_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'tenancy', 'lensers', 'public'
    AS $$
    SELECT EXISTS (
        SELECT 1 FROM tenancy.workspace_members wm
        WHERE wm.workspace_id = p_workspace_id
          AND wm.lenser_id = lensers.get_auth_lenser_id()
    );
$$;


ALTER FUNCTION "tenancy"."is_workspace_member"("p_workspace_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "tenancy"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'tenancy', 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "tenancy"."set_updated_at"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "agents"."action_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ai_lenser_id" "uuid" NOT NULL,
    "action_type" "text" NOT NULL,
    "context_ref_type" "text",
    "context_ref_id" "uuid",
    "result" "text" DEFAULT 'success'::"text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "action_logs_result_check" CHECK (("result" = ANY (ARRAY['success'::"text", 'blocked_by_policy'::"text", 'failed'::"text", 'throttled'::"text"]))),
    CONSTRAINT "action_logs_type_check" CHECK (("action_type" = ANY (ARRAY['join_battle'::"text", 'cast_vote'::"text", 'submit_entry'::"text", 'create_battle'::"text", 'spend_credits'::"text"])))
);


ALTER TABLE "agents"."action_logs" OWNER TO "postgres";


COMMENT ON TABLE "agents"."action_logs" IS 'Append-only audit trail for AI Lenser autonomous actions. Created by agents.fn_agent_action only. Structural triggers prevent UPDATE and DELETE — this is a trust record, not a mutable log.';



CREATE TABLE IF NOT EXISTS "agents"."ai_lensers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "runtime_pref" "text" DEFAULT 'cloud'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "suspended_at" timestamp with time zone,
    "suspended_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ai_lensers_runtime_check" CHECK (("runtime_pref" = ANY (ARRAY['cloud'::"text", 'local'::"text", 'hybrid'::"text"])))
);


ALTER TABLE "agents"."ai_lensers" OWNER TO "postgres";


COMMENT ON TABLE "agents"."ai_lensers" IS 'Extension record for AI Lenser profiles. 1:1 with lensers.profiles (type=''ai''). Holds runtime state only. All autonomous behavior policies live in agents.policies. Created atomically via agents.fn_create_ai_lenser.';



CREATE TABLE IF NOT EXISTS "agents"."lens_bindings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ai_lenser_id" "uuid" NOT NULL,
    "lens_id" "uuid" NOT NULL,
    "version_id" "uuid",
    "is_default" boolean DEFAULT false NOT NULL,
    "category_tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "agents"."lens_bindings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "agents"."model_bindings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ai_lenser_id" "uuid" NOT NULL,
    "model_id" "uuid" NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "category_tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "agents"."model_bindings" OWNER TO "postgres";


COMMENT ON TABLE "agents"."model_bindings" IS 'Which AI models an AI Lenser is allowed to use. category_tags narrows selection by battle category. is_default selects the fallback when no category match exists.';



CREATE TABLE IF NOT EXISTS "agents"."ownerships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ai_lenser_id" "uuid" NOT NULL,
    "owner_lenser_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'owner'::"text" NOT NULL,
    "permission_scope" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "revoked_at" timestamp with time zone,
    CONSTRAINT "ownerships_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'co_owner'::"text", 'operator'::"text"])))
);


ALTER TABLE "agents"."ownerships" OWNER TO "postgres";


COMMENT ON TABLE "agents"."ownerships" IS 'Owner/operator delegation from a human lenser to an AI Lenser. A partial unique index enforces exactly one active primary owner. co_owner and operator roles may be granted freely.';



COMMENT ON COLUMN "agents"."ownerships"."permission_scope" IS 'Array of permitted actions, e.g. ''{join_battles, vote, create_battles, spend_credits}''. Empty array = no delegation beyond existence.';



CREATE TABLE IF NOT EXISTS "agents"."policies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ai_lenser_id" "uuid" NOT NULL,
    "can_join_battles" boolean DEFAULT false NOT NULL,
    "can_vote" boolean DEFAULT false NOT NULL,
    "can_create_battles" boolean DEFAULT false NOT NULL,
    "can_receive_sponsorship" boolean DEFAULT false NOT NULL,
    "model_binding_mode" "text" DEFAULT 'single'::"text" NOT NULL,
    "max_daily_battles" integer DEFAULT 0 NOT NULL,
    "max_daily_votes" integer DEFAULT 0 NOT NULL,
    "allowed_battle_types" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "spending_limit_credits" bigint DEFAULT 0 NOT NULL,
    "is_public_policy" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "policies_binding_mode_check" CHECK (("model_binding_mode" = ANY (ARRAY['single'::"text", 'multi'::"text", 'dynamic'::"text"]))),
    CONSTRAINT "policies_max_battles_nonneg" CHECK (("max_daily_battles" >= 0)),
    CONSTRAINT "policies_max_votes_nonneg" CHECK (("max_daily_votes" >= 0)),
    CONSTRAINT "policies_spending_nonneg" CHECK (("spending_limit_credits" >= 0))
);


ALTER TABLE "agents"."policies" OWNER TO "postgres";


COMMENT ON TABLE "agents"."policies" IS 'Autonomous action constraints for an AI Lenser. All behavioral flags live here — never on agents.ai_lensers. Default state is fully disabled. Owner must explicitly enable each capability after creation.';



COMMENT ON COLUMN "agents"."policies"."model_binding_mode" IS 'single = use only the default model. multi  = use any model in model_bindings. dynamic = select model per battle category via category_tags.';



COMMENT ON COLUMN "agents"."policies"."allowed_battle_types" IS 'Empty array = any battle type allowed. Non-empty = agent may only join battle_types in this list.';



COMMENT ON COLUMN "agents"."policies"."is_public_policy" IS 'When true, this agent''s policy record (capabilities, spending limits, quotas) is readable via the public read policy. Defaults to FALSE — owners must explicitly opt in to public policy transparency. Changed from original default of true in 20260326050000_agents_policy_default_hardening.';



CREATE TABLE IF NOT EXISTS "agents"."quota_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ai_lenser_id" "uuid" NOT NULL,
    "period_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "battles_used" integer DEFAULT 0 NOT NULL,
    "votes_used" integer DEFAULT 0 NOT NULL,
    "credits_spent" bigint DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "quota_battles_nonneg" CHECK (("battles_used" >= 0)),
    CONSTRAINT "quota_credits_nonneg" CHECK (("credits_spent" >= 0)),
    CONSTRAINT "quota_votes_nonneg" CHECK (("votes_used" >= 0))
);


ALTER TABLE "agents"."quota_snapshots" OWNER TO "postgres";


COMMENT ON TABLE "agents"."quota_snapshots" IS 'Daily usage counters per AI Lenser. Upserted atomically by agents.fn_agent_action. Avoids scanning action_logs for quota checks. One row per (ai_lenser_id, date). Row is lazily created on first action.';



CREATE OR REPLACE VIEW "agents"."v_agent_profile" AS
 SELECT "a"."id",
    "a"."id" AS "ai_lenser_id",
    "a"."profile_id",
    "p"."handle",
    "p"."display_name",
    "p"."avatar_url",
    "p"."type" AS "lenser_type",
    "a"."runtime_pref",
    "a"."is_active",
    "a"."suspended_at",
    "a"."suspended_reason",
    "a"."created_at",
    "pol"."can_join_battles",
    "pol"."can_vote",
    "pol"."can_create_battles",
    "pol"."can_receive_sponsorship",
    "pol"."model_binding_mode",
    "pol"."max_daily_battles",
    "pol"."max_daily_votes",
    "pol"."spending_limit_credits",
    "pol"."allowed_battle_types",
    "pol"."is_public_policy",
    ( SELECT "count"(*) AS "count"
           FROM "agents"."model_bindings" "mb"
          WHERE ("mb"."ai_lenser_id" = "a"."id")) AS "model_count",
    ( SELECT "count"(*) AS "count"
           FROM "agents"."lens_bindings" "lb"
          WHERE ("lb"."ai_lenser_id" = "a"."id")) AS "lens_count",
    COALESCE("qs"."battles_used", 0) AS "battles_used_today",
    COALESCE("qs"."votes_used", 0) AS "votes_used_today",
    COALESCE("qs"."credits_spent", (0)::bigint) AS "credits_spent_today",
    "own"."owner_lenser_id",
    "op"."handle" AS "owner_handle",
    "op"."display_name" AS "owner_display_name",
    "op"."avatar_url" AS "owner_avatar_url"
   FROM ((((("agents"."ai_lensers" "a"
     JOIN "lensers"."profiles" "p" ON (("p"."id" = "a"."profile_id")))
     LEFT JOIN "agents"."policies" "pol" ON (("pol"."ai_lenser_id" = "a"."id")))
     LEFT JOIN "agents"."quota_snapshots" "qs" ON ((("qs"."ai_lenser_id" = "a"."id") AND ("qs"."period_date" = CURRENT_DATE))))
     LEFT JOIN "agents"."ownerships" "own" ON ((("own"."ai_lenser_id" = "a"."id") AND ("own"."role" = 'owner'::"text") AND ("own"."revoked_at" IS NULL))))
     LEFT JOIN "lensers"."profiles" "op" ON (("op"."id" = "own"."owner_lenser_id")));


ALTER VIEW "agents"."v_agent_profile" OWNER TO "postgres";


COMMENT ON VIEW "agents"."v_agent_profile" IS 'Full AI Lenser management profile for /agents/:id. Covers: identity, policy, today''s quota, owner info, binding counts. RLS on underlying tables limits visibility to owner and service_role. Exposes both `id` (for frontend queries) and `ai_lenser_id` (legacy alias).';



CREATE TABLE IF NOT EXISTS "ai"."key_usage_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key_id" "uuid" NOT NULL,
    "run_id" "uuid",
    "lenser_id" "uuid" NOT NULL,
    "workspace_id" "uuid",
    "token_input" integer,
    "token_output" integer,
    "credit_cost" bigint,
    "provider" "text",
    "model_key" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "ai"."key_usage_log" OWNER TO "postgres";


COMMENT ON COLUMN "ai"."key_usage_log"."key_id" IS 'The BYOK key used for this run. ON DELETE RESTRICT prevents key deletion while usage records exist — rotate keys via revoke (ai.keys.status=revoked), not hard-delete.';



COMMENT ON COLUMN "ai"."key_usage_log"."run_id" IS 'The execution run that consumed the key. SET NULL on run deletion (soft-deleted runs set is_active=false; hard deletion is exceptional). NULL indicates the run record was removed after the log was written.';



COMMENT ON COLUMN "ai"."key_usage_log"."workspace_id" IS 'Tenant context at the time of execution. Enables per-workspace BYOK usage reports. NULL for legacy runs before workspace scoping.';



COMMENT ON COLUMN "ai"."key_usage_log"."token_input" IS 'Input tokens consumed by the provider for this run. Written by cloud worker.';



COMMENT ON COLUMN "ai"."key_usage_log"."token_output" IS 'Output tokens generated by the provider for this run. Written by cloud worker.';



COMMENT ON COLUMN "ai"."key_usage_log"."credit_cost" IS 'Platform credit cost computed from token usage. NULL for BYOK runs where the lenser supplies their own key and platform credits are not consumed.';



CREATE TABLE IF NOT EXISTS "ai"."keys" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lenser_id" "uuid" NOT NULL,
    "label" "text",
    "encrypted_key_id" "uuid" NOT NULL,
    "key_suffix" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "revoked_at" timestamp with time zone,
    "scope" "ai"."key_scope_enum" DEFAULT 'user'::"ai"."key_scope_enum",
    "scoped_entity_id" "uuid",
    "status" "ai"."key_status_enum" DEFAULT 'active'::"ai"."key_status_enum",
    "last_used_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "key_prefix" "text",
    "provider_id" "uuid" NOT NULL,
    CONSTRAINT "keys_suffix_check" CHECK ((("char_length"("key_suffix") >= 1) AND ("char_length"("key_suffix") <= 4)))
);


ALTER TABLE "ai"."keys" OWNER TO "postgres";


COMMENT ON TABLE "ai"."keys" IS 'Encrypted BYOK API keys for AI providers. Raw keys are stored in vault.secrets via pgsodium; only the last 4 characters (key_suffix) are stored in plain text for masked display. The encrypted_key_id column references vault.secrets(id).';



COMMENT ON COLUMN "ai"."keys"."encrypted_key_id" IS 'Reference to vault.secrets(id). The raw API key is encrypted at rest via pgsodium. Decryption is restricted to service_role only.';



COMMENT ON COLUMN "ai"."keys"."key_suffix" IS 'Last 4 characters of the API key, stored in plain text for masked display (e.g., ••••abcd). Never store more than 4 characters.';



COMMENT ON COLUMN "ai"."keys"."provider_id" IS 'FK to ai.providers(id). NULL if provider row is later removed.';



CREATE TABLE IF NOT EXISTS "ai"."model_pricing" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "model_id" "uuid" NOT NULL,
    "input_cost_per_1k_tokens" numeric(12,8) NOT NULL,
    "output_cost_per_1k_tokens" numeric(12,8) NOT NULL,
    "effective_from" timestamp with time zone DEFAULT "now"() NOT NULL,
    "effective_to" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "unit_type" "ai"."unit_type_enum" DEFAULT 'tokens'::"ai"."unit_type_enum" NOT NULL,
    "cost_per_unit" numeric(18,10),
    CONSTRAINT "model_pricing_costs_nonneg" CHECK ((("input_cost_per_1k_tokens" >= (0)::numeric) AND ("output_cost_per_1k_tokens" >= (0)::numeric))),
    CONSTRAINT "model_pricing_dates_valid" CHECK ((("effective_to" IS NULL) OR ("effective_to" > "effective_from")))
);


ALTER TABLE "ai"."model_pricing" OWNER TO "postgres";


COMMENT ON TABLE "ai"."model_pricing" IS 'Provider list prices per 1K tokens. Append-only time-series; close rows by setting effective_to.';



COMMENT ON COLUMN "ai"."model_pricing"."unit_type" IS 'Type of billing unit: tokens (text/chat), image (per image), video_second (per second), audio_second (per second). Typed as ai.unit_type_enum.';



COMMENT ON COLUMN "ai"."model_pricing"."cost_per_unit" IS 'Cost per unit (USD) for non-token models. NULL for token-based pricing. For image: cost_per_image; for video/audio: cost_per_second.';



CREATE TABLE IF NOT EXISTS "ai"."models" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "version" "text",
    "provider_url" "text",
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "temperature" numeric DEFAULT 0.7 NOT NULL,
    "max_tokens" integer DEFAULT 4096 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "key" "text",
    "provider_id" "uuid" NOT NULL,
    "context_window_tokens" integer,
    "supports_tools" boolean DEFAULT false NOT NULL,
    "supports_json_schema" boolean DEFAULT false NOT NULL,
    "supports_vision" boolean DEFAULT false NOT NULL,
    "is_active" boolean DEFAULT false NOT NULL,
    "capabilities" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "input_modalities" "text"[] DEFAULT ARRAY['text'::"text"] NOT NULL,
    "output_modalities" "text"[] DEFAULT ARRAY['text'::"text"] NOT NULL,
    CONSTRAINT "models_capabilities_check" CHECK (("capabilities" <@ ARRAY['chat'::"text", 'reasoning'::"text", 'tools'::"text", 'vision'::"text", 'json_schema'::"text", 'image_generation'::"text", 'code'::"text", 'text'::"text", 'image'::"text", 'music'::"text"]))
);


ALTER TABLE "ai"."models" OWNER TO "postgres";


COMMENT ON COLUMN "ai"."models"."key" IS 'Unique provider API identifier (e.g. ''gpt-4o'', ''claude-sonnet-4-6''). Renamed from model_key in migration 20260322000059.';



COMMENT ON COLUMN "ai"."models"."provider_id" IS 'FK to ai.providers when using the extended schema.';



COMMENT ON COLUMN "ai"."models"."context_window_tokens" IS 'Max context window in tokens.';



COMMENT ON COLUMN "ai"."models"."is_active" IS 'Whether this model is available for platform use.';



COMMENT ON COLUMN "ai"."models"."input_modalities" IS 'Extensible input modality list. Source of truth for CapabilityMapper validation. Replaces rigid supports_vision boolean for new code paths. Valid values: text, image, document, audio, video. Extend freely — no CHECK constraint.';



COMMENT ON COLUMN "ai"."models"."output_modalities" IS 'Extensible output modality list. Valid values: text, image, audio, video. Extend freely — no CHECK constraint.';



CREATE TABLE IF NOT EXISTS "ai"."providers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "base_url" "text",
    "docs_url" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "ai"."providers" OWNER TO "postgres";


COMMENT ON TABLE "ai"."providers" IS 'AI provider registry. OSS-safe: no secrets, metadata only.';



COMMENT ON COLUMN "ai"."providers"."key" IS 'Short machine key, e.g. openai, anthropic, google.';



COMMENT ON COLUMN "ai"."providers"."base_url" IS 'Override for self-hosted or proxy endpoints.';



CREATE TABLE IF NOT EXISTS "lenses"."workflow_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workflow_id" "uuid" NOT NULL,
    "triggered_by" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "context_inputs" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "global_model_id" "text",
    "budget_credits" integer,
    "spent_credits" integer DEFAULT 0 NOT NULL,
    "cost_metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    CONSTRAINT "wf_runs_budget_nonneg" CHECK ((("budget_credits" IS NULL) OR ("budget_credits" >= 0))),
    CONSTRAINT "wf_runs_spent_nonneg" CHECK (("spent_credits" >= 0)),
    CONSTRAINT "wf_runs_timestamp_order" CHECK ((("completed_at" IS NULL) OR ("started_at" IS NULL) OR ("completed_at" >= "started_at"))),
    CONSTRAINT "workflow_runs_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'running'::"text", 'completed'::"text", 'failed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "lenses"."workflow_runs" OWNER TO "postgres";


COMMENT ON TABLE "lenses"."workflow_runs" IS 'A single execution of a workflow. The CF Worker drives status transitions. context_inputs holds root-level input values for nodes with no incoming edges.';



COMMENT ON COLUMN "lenses"."workflow_runs"."global_model_id" IS 'Default AI model for this run. Individual nodes can override via workflow_nodes.config.model_id.';



COMMENT ON COLUMN "lenses"."workflow_runs"."budget_credits" IS 'Maximum credits allowed for this run. NULL = unlimited.';



COMMENT ON COLUMN "lenses"."workflow_runs"."spent_credits" IS 'Total credits spent so far across all completed nodes.';



COMMENT ON COLUMN "lenses"."workflow_runs"."cost_metadata" IS 'Per-node cost breakdown: { node_id: { input_tokens, output_tokens, cost_credits } }';



CREATE TABLE IF NOT EXISTS "content"."entity_translations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" "content"."entity_type_enum" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "language_code" "text" NOT NULL,
    "title" "text",
    "description" "text",
    "content" "text",
    "is_original" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "content"."entity_translations" OWNER TO "postgres";


COMMENT ON TABLE "content"."entity_translations" IS 'Unified polymorphic translation table. Replaces content.lens_translations and content.thread_translations. entity_type discriminates the translated entity.';



COMMENT ON COLUMN "content"."entity_translations"."description" IS 'Nullable. Populated for prompt_template entities only.';



CREATE TABLE IF NOT EXISTS "content"."reactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" "content"."entity_type_enum" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "lenser_id" "uuid" NOT NULL,
    "reaction" "content"."reaction_enum" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "content"."reactions" OWNER TO "postgres";


COMMENT ON TABLE "content"."reactions" IS 'Unified polymorphic reaction log. Replaces content.lens_reactions, content.thread_reactions, and content.thread_reply_reactions. entity_type discriminates the target entity.';



COMMENT ON COLUMN "content"."reactions"."entity_type" IS 'Discriminates the target entity: ''lens'', ''thread'', or ''thread_reply''.';



COMMENT ON COLUMN "content"."reactions"."entity_id" IS 'UUID of the reacted-to entity. No FK declared (polymorphic target).';



COMMENT ON COLUMN "content"."reactions"."lenser_id" IS 'The lenser who reacted. Populated from auth.uid() via trigger or RPC.';



CREATE TABLE IF NOT EXISTS "content"."reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reporter_id" "uuid" NOT NULL,
    "target_type" "content"."entity_type_enum" NOT NULL,
    "target_id" "uuid" NOT NULL,
    "reason" "content"."report_reason_enum" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "content"."reports" OWNER TO "postgres";


COMMENT ON COLUMN "content"."reports"."reason" IS 'Reason for the report. Typed as content.report_reason_enum.';



CREATE TABLE IF NOT EXISTS "content"."tag_map" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" "content"."entity_type_enum" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "content"."tag_map" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "content"."tag_suggestions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" "content"."entity_type_enum" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL,
    "confidence_score" numeric NOT NULL,
    "ai_model_id" "uuid",
    "status" "content"."suggestion_status_enum" DEFAULT 'pending'::"content"."suggestion_status_enum",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "tag_suggestions_confidence_score_check" CHECK ((("confidence_score" >= (0)::numeric) AND ("confidence_score" <= (1)::numeric)))
);


ALTER TABLE "content"."tag_suggestions" OWNER TO "postgres";


COMMENT ON COLUMN "content"."tag_suggestions"."ai_model_id" IS 'The AI model that produced this tag suggestion. NULL = suggestion source is unknown or model was deleted. FK to ai.models(id).';



COMMENT ON COLUMN "content"."tag_suggestions"."status" IS 'Review status of this AI tag suggestion. Typed as content.suggestion_status_enum.';



CREATE TABLE IF NOT EXISTS "content"."tag_translations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tag_id" "uuid" NOT NULL,
    "language_code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "content"."tag_translations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "content"."tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "visibility" "content"."tag_visibility_enum" DEFAULT 'public'::"content"."tag_visibility_enum" NOT NULL,
    CONSTRAINT "tags_slug_format_check" CHECK ((("slug" ~ '^[a-z0-9]+([\-][a-z0-9]+)*$'::"text") AND (("char_length"("slug") >= 2) AND ("char_length"("slug") <= 40))))
);


ALTER TABLE "content"."tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "content"."threads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lenser_id" "uuid" DEFAULT "lensers"."get_auth_lenser_id"() NOT NULL,
    "visibility" "content"."visibility_enum" DEFAULT 'public'::"content"."visibility_enum" NOT NULL,
    "view_count" integer DEFAULT 0 NOT NULL,
    "reply_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "thumbnail_url" "text",
    "status" "content"."content_status" DEFAULT 'published'::"content"."content_status" NOT NULL,
    "lens_data" "jsonb",
    "linked_lens_id" "uuid"
);


ALTER TABLE "content"."threads" OWNER TO "postgres";


COMMENT ON COLUMN "content"."threads"."lens_data" IS 'DEPRECATED: Use linked_lens_id FK instead. Will be dropped in a future migration.';



COMMENT ON COLUMN "content"."threads"."linked_lens_id" IS 'FK to the prompt template this thread was created from. Replaces the lens_data jsonb column. NULL = thread was not created from a prompt, or the prompt has been deleted.';



CREATE TABLE IF NOT EXISTS "lenses"."lenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lenser_id" "uuid" DEFAULT "lensers"."get_auth_lenser_id"() NOT NULL,
    "visibility" "content"."visibility_enum" DEFAULT 'public'::"content"."visibility_enum" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "content"."content_status" DEFAULT 'published'::"content"."content_status" NOT NULL,
    "parent_lens_id" "uuid",
    "forked_from_execution_id" "uuid",
    "head_version_id" "uuid",
    "forked_from_version_id" "uuid"
);

ALTER TABLE ONLY "lenses"."lenses" FORCE ROW LEVEL SECURITY;


ALTER TABLE "lenses"."lenses" OWNER TO "postgres";


COMMENT ON COLUMN "lenses"."lenses"."parent_lens_id" IS 'Fork lineage: points to the prompt this was derived from. NULL = root prompt.';



COMMENT ON COLUMN "lenses"."lenses"."forked_from_execution_id" IS 'Execution run whose primary artifact content seeded this fork. NULL = manual fork or root.';



COMMENT ON COLUMN "lenses"."lenses"."head_version_id" IS 'Git-style HEAD pointer. Set to the initial draft on lens creation. Advances to each newly published version. NULL only for lenses that have no versions yet.';



COMMENT ON COLUMN "lenses"."lenses"."forked_from_version_id" IS 'The specific lenses.versions row that this lens was cloned from.
   NULL when the lens is a root (not a fork) or was cloned before this column was added.
   Distinct from parent_lens_id (which tracks the parent lens asset, not a specific version).';



CREATE OR REPLACE VIEW "content"."vw_auth_lenses" AS
 SELECT "p"."id",
    "p"."lenser_id",
    "p"."visibility",
    "p"."status",
    "p"."created_at",
    "p"."updated_at",
    "pt"."title",
    "pt"."description",
    "pt"."content",
    "pt"."language_code",
    "rt"."reaction_totals",
    "jsonb_build_object"('handle', "prof"."handle", 'display_name', "prof"."display_name", 'avatar_url', "prof"."avatar_url") AS "author_profile"
   FROM ((("lenses"."lenses" "p"
     LEFT JOIN "lensers"."profiles" "prof" ON (("prof"."id" = "p"."lenser_id")))
     LEFT JOIN "content"."entity_translations" "pt" ON ((("pt"."entity_id" = "p"."id") AND ("pt"."entity_type" = 'lens'::"content"."entity_type_enum") AND ("pt"."is_original" = true))))
     LEFT JOIN LATERAL ( SELECT COALESCE("jsonb_object_agg"("x"."reaction", "x"."cnt"), '{}'::"jsonb") AS "reaction_totals"
           FROM ( SELECT "r"."reaction",
                    ("count"(*))::integer AS "cnt"
                   FROM "content"."reactions" "r"
                  WHERE (("r"."entity_type" = 'lens'::"content"."entity_type_enum") AND ("r"."entity_id" = "p"."id"))
                  GROUP BY "r"."reaction") "x") "rt" ON (true));


ALTER VIEW "content"."vw_auth_lenses" OWNER TO "postgres";


CREATE OR REPLACE VIEW "content"."vw_auth_threads" AS
 SELECT "t"."id",
    "t"."lenser_id",
    "t"."visibility",
    "t"."status",
    "t"."view_count",
    "t"."reply_count",
    "t"."thumbnail_url",
    "t"."created_at",
    "t"."updated_at",
    "t"."lens_data",
    "tt"."title",
    "tt"."content",
    "tt"."language_code",
    "rt"."reaction_totals",
    "jsonb_build_object"('handle', "prof"."handle", 'display_name', "prof"."display_name", 'avatar_url', "prof"."avatar_url") AS "author_profile"
   FROM ((("content"."threads" "t"
     LEFT JOIN "lensers"."profiles" "prof" ON (("prof"."id" = "t"."lenser_id")))
     LEFT JOIN "content"."entity_translations" "tt" ON ((("tt"."entity_id" = "t"."id") AND ("tt"."entity_type" = 'thread'::"content"."entity_type_enum") AND ("tt"."is_original" = true))))
     LEFT JOIN LATERAL ( SELECT COALESCE("jsonb_object_agg"("x"."reaction", "x"."cnt"), '{}'::"jsonb") AS "reaction_totals"
           FROM ( SELECT "r"."reaction",
                    ("count"(*))::integer AS "cnt"
                   FROM "content"."reactions" "r"
                  WHERE (("r"."entity_type" = 'thread'::"content"."entity_type_enum") AND ("r"."entity_id" = "t"."id"))
                  GROUP BY "r"."reaction") "x") "rt" ON (true));


ALTER VIEW "content"."vw_auth_threads" OWNER TO "postgres";


CREATE OR REPLACE VIEW "content"."vw_tag_cross_lang" AS
 SELECT DISTINCT "tt1"."tag_id" AS "source_tag_id",
    "tt2"."tag_id" AS "equivalent_tag_id"
   FROM ((("content"."tag_translations" "tt1"
     JOIN "content"."tag_translations" "tt2" ON ((("lower"(TRIM(BOTH FROM "tt1"."name")) = "lower"(TRIM(BOTH FROM "tt2"."name"))) AND ("tt1"."tag_id" <> "tt2"."tag_id"))))
     JOIN "content"."tags" "t1" ON ((("t1"."id" = "tt1"."tag_id") AND ("t1"."visibility" = 'public'::"content"."tag_visibility_enum"))))
     JOIN "content"."tags" "t2" ON ((("t2"."id" = "tt2"."tag_id") AND ("t2"."visibility" = 'public'::"content"."tag_visibility_enum"))));


ALTER VIEW "content"."vw_tag_cross_lang" OWNER TO "postgres";


CREATE OR REPLACE VIEW "content"."vw_threads_hot_scores" AS
 SELECT "t"."id",
    "et_orig"."language_code" AS "primary_language",
    ("log"(GREATEST((1)::numeric, (((2.0 * (COALESCE("r"."like_count", (0)::bigint))::numeric) + (3.0 * (COALESCE("t"."reply_count", 0))::numeric)) + (0.5 * (COALESCE("t"."view_count", 0))::numeric)))) / "pow"(((EXTRACT(epoch FROM ("now"() - "t"."created_at")) / 3600.0) + (2)::numeric), 1.5)) AS "hot_score"
   FROM (("content"."threads" "t"
     LEFT JOIN "content"."entity_translations" "et_orig" ON ((("et_orig"."entity_id" = "t"."id") AND ("et_orig"."entity_type" = 'thread'::"content"."entity_type_enum") AND ("et_orig"."is_original" = true))))
     LEFT JOIN ( SELECT "reactions"."entity_id" AS "thread_id",
            "count"(*) FILTER (WHERE ("reactions"."reaction" = 'like'::"content"."reaction_enum")) AS "like_count"
           FROM "content"."reactions"
          WHERE ("reactions"."entity_type" = 'thread'::"content"."entity_type_enum")
          GROUP BY "reactions"."entity_id") "r" ON (("r"."thread_id" = "t"."id")))
  WHERE (("t"."visibility" = 'public'::"content"."visibility_enum") AND ("t"."status" = 'published'::"content"."content_status"));


ALTER VIEW "content"."vw_threads_hot_scores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "execution"."artifact_medias" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "artifact_id" "uuid" NOT NULL,
    "media_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "execution"."artifact_medias" OWNER TO "postgres";


COMMENT ON TABLE "execution"."artifact_medias" IS 'Links execution artifacts to one or more media objects (images, audio, video). Replaces the deprecated 1:1 media_object_id column on execution.artifacts. Append-only; cascade-deletes when artifact is removed.';



CREATE TABLE IF NOT EXISTS "execution"."artifacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "run_id" "uuid" NOT NULL,
    "artifact_kind" "text" NOT NULL,
    "content_text" "text",
    "content_json" "jsonb",
    "visibility" "text" DEFAULT 'private'::"text" NOT NULL,
    "is_primary_output" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "output_type" "text",
    CONSTRAINT "artifacts_kind_check" CHECK (("artifact_kind" = ANY (ARRAY['text'::"text", 'image'::"text", 'audio'::"text", 'video'::"text", 'json'::"text", 'trace'::"text", 'tool_log'::"text", 'rubric_result'::"text"]))),
    CONSTRAINT "artifacts_visibility_check" CHECK (("visibility" = ANY (ARRAY['private'::"text", 'public'::"text", 'contender_only'::"text"])))
);


ALTER TABLE "execution"."artifacts" OWNER TO "postgres";


COMMENT ON COLUMN "execution"."artifacts"."output_type" IS 'Extensible output classification. Superset of artifact_kind CHECK constraint. Prefer this column for new writes; artifact_kind retained for legacy compatibility.';



CREATE TABLE IF NOT EXISTS "execution"."execution_tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "run_id" "uuid" NOT NULL,
    "tag" "text" NOT NULL,
    "severity" "text" DEFAULT 'info'::"text" NOT NULL,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "execution_tags_severity_check" CHECK (("severity" = ANY (ARRAY['info'::"text", 'warn'::"text", 'critical'::"text"])))
);


ALTER TABLE "execution"."execution_tags" OWNER TO "postgres";


COMMENT ON TABLE "execution"."execution_tags" IS 'Classification tags applied to execution runs by the API Worker. Tags: high_token_usage, repeated_failure, suspicious_prompt, policy_violation, rate_limited. Used for downstream monitoring, throttling, and anomaly detection.';



COMMENT ON COLUMN "execution"."execution_tags"."tag" IS 'Tag identifier. Known values: high_token_usage, repeated_failure, suspicious_prompt, policy_violation, rate_limited.';



CREATE TABLE IF NOT EXISTS "execution"."origin_types" (
    "key" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "execution"."origin_types" OWNER TO "postgres";


COMMENT ON TABLE "execution"."origin_types" IS 'Registry of valid execution request origin types. Adding a new origin is an INSERT here — no DDL required. Replaces hard-coded CHECK constraint on execution.requests.origin_type.';



CREATE TABLE IF NOT EXISTS "execution"."parameter_usage_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "version_id" "uuid",
    "version_parameter_id" "uuid",
    "lenser_id" "uuid" NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "ai_model_id" "uuid",
    "parameter_key" "text" NOT NULL,
    "parameter_type" "text" NOT NULL,
    "value_snapshot" "text",
    "was_required" boolean DEFAULT false NOT NULL,
    "was_empty" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "metadata" "jsonb"
);


ALTER TABLE "execution"."parameter_usage_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "execution"."request_attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "media_object_id" "uuid" NOT NULL,
    "binding_key" "text" NOT NULL,
    "attached_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "execution"."request_attachments" OWNER TO "postgres";


COMMENT ON TABLE "execution"."request_attachments" IS 'GRASP Creator: links execution requests to media.objects for file-type parameters. One row per named binding_key (matches version_parameters.key for file params). Read by the cloud worker to build multimodal API calls. Cascade-deletes with request; media.objects are NEVER deleted via this FK.';



COMMENT ON COLUMN "execution"."request_attachments"."binding_key" IS 'Matches lenses.version_parameters.key for the ''file'' type param. Used by the cloud worker to inject the file into the correct slot in the model prompt.';



CREATE TABLE IF NOT EXISTS "execution"."requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "requester_lenser_id" "uuid" NOT NULL,
    "origin_type" "text" NOT NULL,
    "origin_id" "uuid",
    "model_id" "uuid",
    "lens_id" "uuid",
    "input_snapshot" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "runtime_origin" "text" DEFAULT 'cloud'::"text" NOT NULL,
    "funding_source" "text" DEFAULT 'platform_credit'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "byok_key_ref_id" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "version_id" "uuid",
    "workspace_id" "uuid",
    CONSTRAINT "requests_funding_source_check" CHECK (("funding_source" = ANY (ARRAY['user_byok_cloud'::"text", 'user_byok_local'::"text", 'platform_credit'::"text", 'sponsored'::"text"]))),
    CONSTRAINT "requests_runtime_origin_check" CHECK (("runtime_origin" = ANY (ARRAY['cloud'::"text", 'local'::"text", 'hybrid'::"text", 'offline_import'::"text"])))
);


ALTER TABLE "execution"."requests" OWNER TO "postgres";


COMMENT ON COLUMN "execution"."requests"."byok_key_ref_id" IS 'FK to agents.byok_key_refs when funding_source=user_byok_cloud. NULL for platform_credit, user_byok_local (key never reaches cloud DB), or sponsored.';



COMMENT ON COLUMN "execution"."requests"."is_active" IS 'Soft-delete flag. Set to false instead of hard-deleting.';



COMMENT ON COLUMN "execution"."requests"."version_id" IS 'The specific lens version this request was made against. Moved from execution.ray_runs (2026-03-25). NULL for requests created before versioning or without a lens context.';



COMMENT ON COLUMN "execution"."requests"."workspace_id" IS 'Tenant boundary for this execution request. Resolved at request time from the lenser''s active workspace (personal workspace for solo users; org workspace when executing on behalf of an organization). NULL for legacy requests pre-workspace-scoping.';



CREATE TABLE IF NOT EXISTS "execution"."runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'queued'::"text" NOT NULL,
    "model_id" "uuid",
    "provider_request_id" "text",
    "execution_hash" "text",
    "input_hash" "text",
    "output_hash" "text",
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "latency_ms" integer,
    "error_code" "text",
    "error_message" "text",
    "cost_estimate" numeric,
    "token_input" integer,
    "token_output" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "credit_cost" bigint,
    "billing_status" "text" DEFAULT 'free'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "response_text" "text",
    "response_meta" "jsonb" DEFAULT '{}'::"jsonb",
    "throttle_applied" boolean DEFAULT false NOT NULL,
    "injected_delay_ms" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "runs_billing_status_check" CHECK (("billing_status" = ANY (ARRAY['pending'::"text", 'charged'::"text", 'failed'::"text", 'free'::"text"]))),
    CONSTRAINT "runs_status_check" CHECK (("status" = ANY (ARRAY['queued'::"text", 'running'::"text", 'succeeded'::"text", 'failed'::"text", 'canceled'::"text", 'timed_out'::"text"]))),
    CONSTRAINT "runs_timestamp_order" CHECK ((("completed_at" IS NULL) OR ("started_at" IS NULL) OR ("completed_at" >= "started_at")))
);


ALTER TABLE "execution"."runs" OWNER TO "postgres";


COMMENT ON COLUMN "execution"."runs"."credit_cost" IS 'Platform credits charged for this run. NULL = not billed. Managed by CF Worker (service_role).';



COMMENT ON COLUMN "execution"."runs"."billing_status" IS 'Billing lifecycle: free (default/self-hosted), pending (charge initiated), charged (wallet debited), failed (insufficient balance).';



COMMENT ON COLUMN "execution"."runs"."is_active" IS 'Soft-delete flag. Set to false instead of hard-deleting. Queries should filter WHERE is_active = true by default.';



COMMENT ON COLUMN "execution"."runs"."response_text" IS 'Primary AI response content. Written by the API Worker after provider call completes. NULL for in-progress or failed runs.';



COMMENT ON COLUMN "execution"."runs"."response_meta" IS 'Provider response metadata: model name, finish_reason, provider_request_id, usage stats, etc. Structured as JSONB for provider flexibility.';



COMMENT ON COLUMN "execution"."runs"."throttle_applied" IS 'True if the CF Worker applied a token-rate cap, time deadline, or delay handicap during this run.';



COMMENT ON COLUMN "execution"."runs"."injected_delay_ms" IS 'Actual milliseconds of artificial delay injected by the CF Worker before streaming began.';



CREATE TABLE IF NOT EXISTS "execution"."steps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "run_id" "uuid" NOT NULL,
    "ordinal" integer NOT NULL,
    "step_type" "text" NOT NULL,
    "tool_name" "text",
    "input_snapshot" "jsonb",
    "output_snapshot" "jsonb",
    "input_hash" "text",
    "output_hash" "text",
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "latency_ms" integer,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "step_definition_id" "uuid",
    CONSTRAINT "steps_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'running'::"text", 'succeeded'::"text", 'failed'::"text"]))),
    CONSTRAINT "steps_step_type_check" CHECK (("step_type" = ANY (ARRAY['lens'::"text", 'tool_call'::"text", 'tool_result'::"text", 'model_call'::"text", 'judge_call'::"text", 'retrieval'::"text", 'transform'::"text"])))
);


ALTER TABLE "execution"."steps" OWNER TO "postgres";


COMMENT ON COLUMN "execution"."steps"."step_definition_id" IS 'FK to the lenses.steps definition that spawned this runtime step. NULL for historical runs and ad-hoc steps with no definition. Enables reproducibility diff: what the lens defined vs. what the run executed.';



CREATE TABLE IF NOT EXISTS "execution"."stream_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "run_id" "uuid" NOT NULL,
    "lenser_id" "uuid" NOT NULL,
    "provider" "text" NOT NULL,
    "model_key" "text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "bytes_sent" integer DEFAULT 0 NOT NULL,
    "token_input" integer,
    "token_output" integer,
    "credit_cost" bigint,
    "error_code" "text",
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "workspace_id" "uuid",
    CONSTRAINT "stream_sessions_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'completed'::"text", 'failed'::"text", 'timed_out'::"text"])))
);


ALTER TABLE "execution"."stream_sessions" OWNER TO "postgres";


COMMENT ON TABLE "execution"."stream_sessions" IS 'One row per /execute/stream request. Tracks SSE lifecycle for observability.';



COMMENT ON COLUMN "execution"."stream_sessions"."run_id" IS 'References execution.runs.id — ties stream session to the billing run.';



COMMENT ON COLUMN "execution"."stream_sessions"."lenser_id" IS 'Denormalized from execution.requests.requester_lenser_id for fast per-user queries.';



COMMENT ON COLUMN "execution"."stream_sessions"."bytes_sent" IS 'Total SSE bytes sent to client before stream closed.';



COMMENT ON COLUMN "execution"."stream_sessions"."workspace_id" IS 'Denormalized workspace_id from execution.requests (via runs). Stored directly for fast per-workspace stream observability queries without joining through runs → requests.';



CREATE TABLE IF NOT EXISTS "lensers"."badges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lenser_id" "uuid" NOT NULL,
    "type" "lensers"."lenser_badge_type" NOT NULL,
    "category" "lensers"."lenser_badge_category" DEFAULT 'achievement'::"lensers"."lenser_badge_category" NOT NULL,
    "label" "text" NOT NULL,
    "description" "text",
    "icon" "text",
    "awarded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "xp_event_id" "uuid"
);


ALTER TABLE "lensers"."badges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "lensers"."group_members" (
    "group_id" "uuid" NOT NULL,
    "lenser_id" "uuid" NOT NULL,
    "role" "lensers"."group_member_role_enum" DEFAULT 'member'::"lensers"."group_member_role_enum" NOT NULL,
    "permissions" "jsonb" DEFAULT '{}'::"jsonb",
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "lensers"."group_members" OWNER TO "postgres";


COMMENT ON TABLE "lensers"."group_members" IS 'Membership junction between lensers.groups and lensers.profiles. Composite PK (group_id, lenser_id) prevents duplicate membership. CASCADE on both FKs: deleting a group removes all memberships; deleting a profile removes that lenser from all groups.';



COMMENT ON COLUMN "lensers"."group_members"."role" IS 'Member role within the group. admin and moderator have elevated privileges. judge is a special role for battle adjudication contexts.';



COMMENT ON COLUMN "lensers"."group_members"."permissions" IS 'Fine-grained permission overrides as JSON. Empty object by default. Application layer interprets keys; database stores opaquely.';



CREATE TABLE IF NOT EXISTS "lensers"."groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_lenser_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "type" "lensers"."group_type_enum" DEFAULT 'community'::"lensers"."group_type_enum" NOT NULL,
    "visibility" "lensers"."group_visibility_enum" DEFAULT 'public'::"lensers"."group_visibility_enum" NOT NULL,
    "description" "text",
    "avatar_url" "text",
    "max_members" integer DEFAULT 100,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "groups_max_members_check" CHECK (("max_members" > 0))
);


ALTER TABLE "lensers"."groups" OWNER TO "postgres";


COMMENT ON TABLE "lensers"."groups" IS 'Community-side grouping entity. Owned by a lenser profile. Visibility controls discoverability: public groups appear in search; private and invite_only require membership or invitation.';



COMMENT ON COLUMN "lensers"."groups"."owner_lenser_id" IS 'Profile that created and owns the group. ON DELETE RESTRICT prevents orphaning a group; ownership must be transferred before profile deletion.';



COMMENT ON COLUMN "lensers"."groups"."slug" IS 'URL-safe unique identifier for the group. Used in routes like /g/<slug>.';



COMMENT ON COLUMN "lensers"."groups"."max_members" IS 'Soft cap on membership count. Enforced at application layer. Must be > 0.';



CREATE TABLE IF NOT EXISTS "lensers"."preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lenser_id" "uuid" NOT NULL,
    "language" "text" DEFAULT 'en'::"text" NOT NULL,
    "notifications" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "sidebar" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "content_visibility" "text" DEFAULT 'public'::"text" NOT NULL,
    "email_digest" boolean DEFAULT true NOT NULL,
    "ai_provider_key" "text",
    "ai_model_key" "text",
    "ai_persona" "text",
    "ai_ruleset" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "wallet_mode" "lensers"."wallet_mode_enum" DEFAULT 'CLOUD'::"lensers"."wallet_mode_enum" NOT NULL,
    "ai_data_usage" boolean DEFAULT false NOT NULL,
    "hide_actions" boolean DEFAULT false NOT NULL,
    "cron_config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "selected_api_key_id" "uuid",
    "country_id" "bpchar",
    "currency" "bpchar",
    "theme" "text" DEFAULT 'system'::"text" NOT NULL,
    "active_lenser_id" "uuid",
    CONSTRAINT "preferences_content_visibility_check" CHECK (("content_visibility" = ANY (ARRAY['public'::"text", 'community'::"text", 'private'::"text"]))),
    CONSTRAINT "preferences_theme_check" CHECK (("theme" = ANY (ARRAY['light'::"text", 'dark'::"text", 'system'::"text"])))
);


ALTER TABLE "lensers"."preferences" OWNER TO "postgres";


COMMENT ON TABLE "lensers"."preferences" IS '1:1 preferences row per lenser profile. Replaces ad-hoc preferences JSONB on lensers.profiles. Auto-created by trigger trg_create_default_preferences on profile insert. Table-level grants added in migration 000061 (authenticated: SELECT/INSERT/UPDATE).';



COMMENT ON COLUMN "lensers"."preferences"."language" IS 'ISO 639-1 language code. NOT NULL, defaults to ''en''.';



COMMENT ON COLUMN "lensers"."preferences"."ai_provider_key" IS 'Preferred AI provider key (references ai.providers.key). Nullable.';



COMMENT ON COLUMN "lensers"."preferences"."ai_model_key" IS 'Preferred AI model key (references ai.models.key). Nullable.';



COMMENT ON COLUMN "lensers"."preferences"."wallet_mode" IS 'Billing mode: CLOUD (platform credits), BYOK (bring-your-own-key), LOCAL (self-hosted). Typed as lensers.wallet_mode_enum. Default: CLOUD.';



COMMENT ON COLUMN "lensers"."preferences"."selected_api_key_id" IS 'The API key the Lenser has chosen to use for AI executions. References ai.keys(id). Nullable — NULL means "use platform default". Auto-cleared (SET NULL) when the referenced key is revoked/deleted.';



COMMENT ON COLUMN "lensers"."preferences"."active_lenser_id" IS 'Currently active lenser profile for workspace switching. NULL = human profile. Only valid when the referenced profile is an AI lenser owned by this user.';



CREATE TABLE IF NOT EXISTS "lensers"."relationships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "source_profile_id" "uuid" NOT NULL,
    "target_profile_id" "uuid" NOT NULL,
    "status" "lensers"."relationship_status" DEFAULT 'pending'::"lensers"."relationship_status" NOT NULL,
    "requested_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "responded_at" timestamp with time zone,
    "accepted_at" timestamp with time zone,
    "removed_at" timestamp with time zone,
    "is_close_circle" boolean DEFAULT false NOT NULL,
    CONSTRAINT "chk_no_self_rel" CHECK (("source_profile_id" <> "target_profile_id"))
);


ALTER TABLE "lensers"."relationships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "lensers"."social_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lenser_id" "uuid" NOT NULL,
    "platform" "lensers"."lenser_social_platform" NOT NULL,
    "url" "text" NOT NULL,
    "label" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "lenser_social_links_url_https_check" CHECK (("url" ~* '^https://'::"text")),
    CONSTRAINT "lenser_social_links_url_platform_check" CHECK (
CASE "platform"
    WHEN 'Behance'::"lensers"."lenser_social_platform" THEN ("url" ~* '^https://(www\.)?behance\.net/'::"text")
    WHEN 'Dribbble'::"lensers"."lenser_social_platform" THEN ("url" ~* '^https://(www\.)?dribbble\.com/'::"text")
    WHEN 'GitHub'::"lensers"."lenser_social_platform" THEN ("url" ~* '^https://(www\.)?github\.com/'::"text")
    WHEN 'Instagram'::"lensers"."lenser_social_platform" THEN ("url" ~* '^https://(www\.)?instagram\.com/'::"text")
    WHEN 'LinkedIn'::"lensers"."lenser_social_platform" THEN ("url" ~* '^https://(www\.)?linkedin\.com/'::"text")
    WHEN 'Twitch'::"lensers"."lenser_social_platform" THEN ("url" ~* '^https://(www\.)?twitch\.tv/'::"text")
    WHEN 'X'::"lensers"."lenser_social_platform" THEN ("url" ~* '^https://(www\.)?(x\.com|twitter\.com)/'::"text")
    WHEN 'Twitter'::"lensers"."lenser_social_platform" THEN ("url" ~* '^https://(www\.)?(twitter\.com|x\.com)/'::"text")
    WHEN 'Youtube'::"lensers"."lenser_social_platform" THEN ("url" ~* '^https://(www\.)?youtube\.com/|^https://youtu\.be/'::"text")
    WHEN 'Website'::"lensers"."lenser_social_platform" THEN ("url" ~* '^https://'::"text")
    ELSE false
END)
);


ALTER TABLE "lensers"."social_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "lensers"."tag_follows" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lenser_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "lensers"."tag_follows" OWNER TO "postgres";


ALTER VIEW "lensers"."vw_lensers_score" OWNER TO "postgres";


COMMENT ON VIEW "lensers"."vw_lensers_score" IS 'Lenser scoring view for recommendation and discovery ranking. Combines XP totals with recent reaction activity (7-day window). Updated to use unified content.reactions table (migration 20260440000008).';



CREATE TABLE IF NOT EXISTS "lenses"."steps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lens_id" "uuid" NOT NULL,
    "version_id" "uuid",
    "ordinal" integer NOT NULL,
    "step_type" "text" NOT NULL,
    "instruction" "text",
    "model_id" "uuid",
    "input_map" "jsonb",
    "output_key" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sub_lens_id" "uuid",
    CONSTRAINT "lens_steps_step_type_check" CHECK (("step_type" = ANY (ARRAY['lens'::"text", 'tool_call'::"text", 'model_call'::"text", 'retrieval'::"text", 'transform'::"text"])))
);


ALTER TABLE "lenses"."steps" OWNER TO "postgres";


COMMENT ON COLUMN "lenses"."steps"."lens_id" IS 'DEPRECATED: derivable via version_id → lenses.versions.lens_id. Retained for legacy reads and foreign key constraints. Do not write new code that reads this column directly — join via version_id instead. Scheduled for DROP after 2026-Q2.';



COMMENT ON COLUMN "lenses"."steps"."version_id" IS 'Target FK for this step. Once all legacy rows are backfilled (lens_id should be derivable from here), lenses.steps.lens_id will be dropped.';



COMMENT ON COLUMN "lenses"."steps"."sub_lens_id" IS 'FK to the lens this step delegates to when step_type = ''lens''. Extracted from input_map->>''"$lens"'' for FK enforcement. Must be non-NULL when step_type = ''lens''.';



CREATE TABLE IF NOT EXISTS "lenses"."tools" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "label" "text",
    "description" "text",
    "category" "text" DEFAULT 'input'::"text" NOT NULL,
    "type" "text" NOT NULL,
    "required" boolean DEFAULT true NOT NULL,
    "min_length" integer DEFAULT 0 NOT NULL,
    "max_length" integer DEFAULT 10000 NOT NULL,
    "placeholder" "text",
    "help_text" "text",
    "validation_schema" "jsonb",
    "options" "jsonb",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_system" boolean DEFAULT false NOT NULL,
    "icon" "text",
    "color" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "tools_category_check" CHECK (("category" = ANY (ARRAY['input'::"text", 'media'::"text", 'execution'::"text", 'battle'::"text", 'system'::"text"]))),
    CONSTRAINT "tools_description_check" CHECK (("char_length"("description") <= 500)),
    CONSTRAINT "tools_key_check" CHECK (("key" ~ '^[a-z][a-z0-9_]*$'::"text")),
    CONSTRAINT "tools_label_check" CHECK (("char_length"("label") <= 120)),
    CONSTRAINT "tools_length_order" CHECK (("max_length" >= "min_length")),
    CONSTRAINT "tools_max_length_check" CHECK (("max_length" > 0)),
    CONSTRAINT "tools_min_length_check" CHECK (("min_length" >= 0)),
    CONSTRAINT "tools_type_check" CHECK (("type" = ANY (ARRAY['text'::"text", 'textarea'::"text", 'json'::"text", 'number'::"text", 'integer'::"text", 'float'::"text", 'decimal'::"text", 'boolean'::"text", 'select'::"text", 'multiselect'::"text", 'url'::"text", 'date'::"text", 'datetime'::"text", 'file'::"text", 'execution_artifact_ids'::"text", 'battle_ids'::"text", 'media_attachment_ids'::"text"])))
);


ALTER TABLE "lenses"."tools" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "lenses"."version_parameter_contents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "parameter_id" "uuid" NOT NULL,
    "lenser_id" "uuid" NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "contents" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "lenses"."version_parameter_contents" FORCE ROW LEVEL SECURITY;


ALTER TABLE "lenses"."version_parameter_contents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "lenses"."version_parameters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "version_id" "uuid" NOT NULL,
    "label" "text" NOT NULL,
    "tool_id" "uuid" NOT NULL,
    CONSTRAINT "version_parameters_label_not_blank" CHECK (("length"(TRIM(BOTH FROM "label")) > 0))
);


ALTER TABLE "lenses"."version_parameters" OWNER TO "postgres";


COMMENT ON TABLE "lenses"."version_parameters" IS 'Typed parameter definitions per prompt version. Parameters are owned by the version, not the prompt asset. Changing parameters requires creating a new version.';



CREATE OR REPLACE VIEW "lenses"."vw_fork_history" WITH ("security_invoker"='on') AS
 WITH RECURSIVE "fork_chain" AS (
         SELECT "l"."id" AS "lens_id",
            "l"."parent_lens_id" AS "parent_id",
            "l"."forked_from_version_id",
            "t"."title" AS "lens_title",
            1 AS "depth"
           FROM ("lenses"."lenses" "l"
             JOIN "content"."entity_translations" "t" ON ((("t"."entity_id" = "l"."id") AND ("t"."entity_type" = 'lens'::"content"."entity_type_enum") AND ("t"."is_original" = true))))
          WHERE ("l"."parent_lens_id" IS NOT NULL)
        UNION ALL
         SELECT "fc_1"."lens_id",
            "anc"."parent_lens_id" AS "parent_id",
            "anc"."forked_from_version_id",
            "fc_1"."lens_title",
            ("fc_1"."depth" + 1)
           FROM ("fork_chain" "fc_1"
             JOIN "lenses"."lenses" "anc" ON (("anc"."id" = "fc_1"."parent_id")))
          WHERE (("anc"."parent_lens_id" IS NOT NULL) AND ("fc_1"."depth" < 20))
        )
 SELECT "fc"."lens_id",
    "fc"."parent_id" AS "forked_from_lens_id",
    "fc"."lens_title",
    "fc"."depth",
    "pt"."title" AS "forked_from_title",
    "pl"."lenser_id" AS "forked_from_lenser_id",
    "pp"."display_name" AS "forked_from_lenser_name",
    "pp"."handle" AS "forked_from_lenser_handle",
    "pp"."avatar_url" AS "forked_from_lenser_avatar_url",
    "fc"."forked_from_version_id",
    "v"."version_number" AS "forked_from_version_number"
   FROM (((("fork_chain" "fc"
     JOIN "content"."entity_translations" "pt" ON ((("pt"."entity_id" = "fc"."parent_id") AND ("pt"."entity_type" = 'lens'::"content"."entity_type_enum") AND ("pt"."is_original" = true))))
     JOIN "lenses"."lenses" "pl" ON (("pl"."id" = "fc"."parent_id")))
     JOIN "lensers"."profiles" "pp" ON (("pp"."id" = "pl"."lenser_id")))
     LEFT JOIN "lenses"."versions" "v" ON (("v"."id" = "fc"."forked_from_version_id")));


ALTER VIEW "lenses"."vw_fork_history" OWNER TO "postgres";


COMMENT ON VIEW "lenses"."vw_fork_history" IS 'Recursive fork ancestry chain. Query by lens_id to get all ancestors ordered by depth.
   Depth 1 = immediate parent. Capped at 20 levels.
   Now includes forked_from_version_id and forked_from_version_number so the UI can
   display "Forked from LensTitle v3".';



CREATE OR REPLACE VIEW "lenses"."vw_hot_scores" AS
 SELECT "pt"."id",
    "et_orig"."language_code" AS "primary_language",
    ("log"(GREATEST((1)::numeric, (((4.0 * (COALESCE("r"."copy_count", (0)::bigint))::numeric) + (2.0 * (COALESCE("r"."like_count", (0)::bigint))::numeric)) + (1.0 * (COALESCE("r"."saved_count", (0)::bigint))::numeric)))) / "pow"(((EXTRACT(epoch FROM ("now"() - "pt"."created_at")) / 3600.0) + (2)::numeric), 1.5)) AS "hot_score"
   FROM (("lenses"."lenses" "pt"
     LEFT JOIN "content"."entity_translations" "et_orig" ON ((("et_orig"."entity_id" = "pt"."id") AND ("et_orig"."entity_type" = 'lens'::"content"."entity_type_enum") AND ("et_orig"."is_original" = true))))
     LEFT JOIN ( SELECT "reactions"."entity_id" AS "prompt_id",
            "count"(*) FILTER (WHERE ("reactions"."reaction" = 'copy'::"content"."reaction_enum")) AS "copy_count",
            "count"(*) FILTER (WHERE ("reactions"."reaction" = 'like'::"content"."reaction_enum")) AS "like_count",
            "count"(*) FILTER (WHERE ("reactions"."reaction" = 'saved'::"content"."reaction_enum")) AS "saved_count"
           FROM "content"."reactions"
          WHERE ("reactions"."entity_type" = 'lens'::"content"."entity_type_enum")
          GROUP BY "reactions"."entity_id") "r" ON (("r"."prompt_id" = "pt"."id")))
  WHERE (("pt"."visibility" = 'public'::"content"."visibility_enum") AND ("pt"."status" = 'published'::"content"."content_status"));


ALTER VIEW "lenses"."vw_hot_scores" OWNER TO "postgres";


COMMENT ON VIEW "lenses"."vw_hot_scores" IS 'Hot-score ranking for public published lenses. Moved from content.vw_lenses_hot_scores.';



CREATE OR REPLACE VIEW "lenses"."vw_lens_version_history" AS
SELECT
    NULL::"uuid" AS "id",
    NULL::"uuid" AS "lens_id",
    NULL::integer AS "version_number",
    NULL::"text" AS "template_body",
    NULL::"content"."content_status" AS "status",
    NULL::"text" AS "changelog",
    NULL::"uuid" AS "parent_version_id",
    NULL::timestamp with time zone AS "published_at",
    NULL::timestamp with time zone AS "created_at",
    NULL::integer AS "parameter_count";


ALTER VIEW "lenses"."vw_lens_version_history" OWNER TO "postgres";


COMMENT ON VIEW "lenses"."vw_lens_version_history" IS 'All lens versions with parameter count. Replaces vw_published_versions. Use .eq(''status'', ''published'') to filter published-only.';



CREATE OR REPLACE VIEW "lenses"."vw_lenses" WITH ("security_invoker"='on') AS
 SELECT "l"."id",
    "l"."lenser_id",
    "l"."visibility",
    "l"."status",
    "l"."created_at",
    "l"."updated_at",
    "l"."parent_lens_id",
    "l"."forked_from_execution_id",
    "lv"."id" AS "latest_version_id",
    "lv"."version_number" AS "latest_version_number",
    "lv"."status" AS "latest_version_status",
    "lv"."changelog" AS "latest_changelog",
    "lv"."published_at" AS "latest_published_at",
    "t"."title",
    "t"."description",
    "t"."content",
    "t"."language_code",
    "p"."display_name" AS "author_display_name",
    "p"."handle" AS "author_handle",
    "p"."avatar_url" AS "author_avatar_url"
   FROM ((("lenses"."lenses" "l"
     LEFT JOIN LATERAL ( SELECT "v"."id",
            "v"."version_number",
            "v"."status",
            "v"."changelog",
            "v"."published_at",
            "v"."created_at"
           FROM "lenses"."versions" "v"
          WHERE (("v"."lens_id" = "l"."id") AND ("v"."status" <> 'archived'::"content"."content_status"))
          ORDER BY
                CASE "v"."status"
                    WHEN 'published'::"content"."content_status" THEN 0
                    ELSE 1
                END, "v"."version_number" DESC
         LIMIT 1) "lv" ON (true))
     LEFT JOIN "content"."entity_translations" "t" ON ((("t"."entity_id" = "l"."id") AND ("t"."entity_type" = 'lens'::"content"."entity_type_enum") AND ("t"."is_original" = true))))
     LEFT JOIN "lensers"."profiles" "p" ON (("p"."id" = "l"."lenser_id")));


ALTER VIEW "lenses"."vw_lenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "lenses"."workflow_edges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workflow_id" "uuid" NOT NULL,
    "source_node_id" "uuid" NOT NULL,
    "target_node_id" "uuid" NOT NULL,
    "source_output_key" "text" DEFAULT 'output'::"text" NOT NULL,
    "target_param_label" "text" NOT NULL,
    CONSTRAINT "no_self_loops" CHECK (("source_node_id" <> "target_node_id"))
);


ALTER TABLE "lenses"."workflow_edges" OWNER TO "postgres";


COMMENT ON TABLE "lenses"."workflow_edges" IS 'Directed edges in the workflow DAG. source_output_key names the field in output_data of the source node result. target_param_label names the [[label]] placeholder in the target lens template.';



CREATE TABLE IF NOT EXISTS "lenses"."workflow_node_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "run_id" "uuid" NOT NULL,
    "node_id" "uuid" NOT NULL,
    "execution_run_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "output_data" "jsonb",
    "error_message" "text",
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "input_tokens" integer DEFAULT 0 NOT NULL,
    "output_tokens" integer DEFAULT 0 NOT NULL,
    "cost_credits" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "wnr_cost_credits_nonneg" CHECK (("cost_credits" >= 0)),
    CONSTRAINT "wnr_input_tokens_nonneg" CHECK (("input_tokens" >= 0)),
    CONSTRAINT "wnr_output_tokens_nonneg" CHECK (("output_tokens" >= 0)),
    CONSTRAINT "workflow_node_results_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'running'::"text", 'completed'::"text", 'failed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "lenses"."workflow_node_results" OWNER TO "postgres";


COMMENT ON TABLE "lenses"."workflow_node_results" IS 'Per-node execution result for a workflow run. Seeded with status=pending by fn_start_workflow_run. The CF Worker updates status and output_data as nodes complete. Realtime subscriptions on this table drive the live progress UI.';



CREATE TABLE IF NOT EXISTS "lenses"."workflow_nodes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workflow_id" "uuid" NOT NULL,
    "lens_id" "uuid",
    "version_id" "uuid",
    "position_x" double precision DEFAULT 0 NOT NULL,
    "position_y" double precision DEFAULT 0 NOT NULL,
    "label" "text",
    "ordinal" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "lenses"."workflow_nodes" OWNER TO "postgres";


COMMENT ON TABLE "lenses"."workflow_nodes" IS 'Each node represents a lens version in the workflow DAG. version_id NULL means use the lens head at execution time. position_x/y are used by the visual canvas editor.';



COMMENT ON COLUMN "lenses"."workflow_nodes"."config" IS 'Per-node execution config: { model_id?: string, param_overrides?: Record<string,string>, node_type?: "lens"|"image_generate"|"web_search"|"http_request" }';



CREATE TABLE IF NOT EXISTS "lenses"."workflow_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workflow_id" "uuid" NOT NULL,
    "cron_expr" "text" NOT NULL,
    "global_model_id" "text",
    "inputs_template" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "last_run_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "lenses"."workflow_schedules" OWNER TO "postgres";


COMMENT ON TABLE "lenses"."workflow_schedules" IS 'CRON schedules for automated workflow runs. pg_cron calls fn_dispatch_scheduled_workflows() every minute.';



CREATE TABLE IF NOT EXISTS "lenses"."workflow_version_edges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workflow_version_id" "uuid" NOT NULL,
    "source_node_id" "uuid" NOT NULL,
    "target_node_id" "uuid" NOT NULL,
    "source_output_key" "text" DEFAULT 'output'::"text" NOT NULL,
    "target_param_label" "text" NOT NULL,
    CONSTRAINT "wve_no_self_loops" CHECK (("source_node_id" <> "target_node_id"))
);


ALTER TABLE "lenses"."workflow_version_edges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "lenses"."workflow_version_nodes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workflow_version_id" "uuid" NOT NULL,
    "lens_id" "uuid" NOT NULL,
    "version_id" "uuid",
    "position_x" double precision DEFAULT 0 NOT NULL,
    "position_y" double precision DEFAULT 0 NOT NULL,
    "label" "text",
    "ordinal" integer DEFAULT 0 NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "lenses"."workflow_version_nodes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "lenses"."workflow_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workflow_id" "uuid" NOT NULL,
    "version_number" integer NOT NULL,
    "changelog" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "published_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "workflow_versions_published_at_check" CHECK ((("status" <> 'published'::"text") OR ("published_at" IS NOT NULL))),
    CONSTRAINT "workflow_versions_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'archived'::"text"])))
);


ALTER TABLE "lenses"."workflow_versions" OWNER TO "postgres";


COMMENT ON TABLE "lenses"."workflow_versions" IS 'Versioned snapshots of workflow DAG state. Each version freezes the nodes and edges at a point in time.';



CREATE TABLE IF NOT EXISTS "lenses"."workflows" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lenser_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "visibility" "text" DEFAULT 'public'::"text" NOT NULL,
    "battle_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reaction_totals" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "fork_count" integer DEFAULT 0 NOT NULL,
    "parent_workflow_id" "uuid",
    "head_version_id" "uuid",
    CONSTRAINT "workflows_battle_count_check" CHECK (("battle_count" >= 0)),
    CONSTRAINT "workflows_title_check" CHECK ((("char_length"(TRIM(BOTH FROM "title")) >= 1) AND ("char_length"(TRIM(BOTH FROM "title")) <= 200))),
    CONSTRAINT "workflows_visibility_check" CHECK (("visibility" = ANY (ARRAY['public'::"text", 'private'::"text", 'unlisted'::"text"])))
);


ALTER TABLE "lenses"."workflows" OWNER TO "postgres";


COMMENT ON TABLE "lenses"."workflows" IS 'A Connected Lens workflow — a DAG of lens versions whose outputs feed into each other. battle_count is a denormalised counter incremented when a workflow is used in a battle.';



CREATE TABLE IF NOT EXISTS "media"."attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "object_id" "uuid" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "binding_key" "text" DEFAULT '_default'::"text" NOT NULL,
    "attached_by" "uuid",
    "attached_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "media"."attachments" OWNER TO "postgres";


COMMENT ON TABLE "media"."attachments" IS 'Binds media objects to business entities (lenses, threads, profiles, etc.) via named slots. binding_key matches prompt template placeholders.';



CREATE TABLE IF NOT EXISTS "media"."objects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "owner_lenser_id" "uuid" NOT NULL,
    "bucket" "text",
    "object_key" "text",
    "content_text" "text",
    "external_url" "text",
    "mime_type" "text",
    "media_type" "text" NOT NULL,
    "name" "text" NOT NULL,
    "byte_size" bigint,
    "checksum_sha256" "text",
    "visibility" "text" DEFAULT 'private'::"text" NOT NULL,
    "lifecycle_state" "text" DEFAULT 'pending'::"text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "objects_lifecycle_check" CHECK (("lifecycle_state" = ANY (ARRAY['pending'::"text", 'active'::"text", 'archived'::"text", 'deleted'::"text"]))),
    CONSTRAINT "objects_media_type_check" CHECK (("media_type" = ANY (ARRAY['text'::"text", 'image'::"text", 'audio'::"text", 'video'::"text", 'document'::"text", 'json'::"text", 'binary'::"text"]))),
    CONSTRAINT "objects_one_payload" CHECK (((("bucket" IS NOT NULL) AND ("object_key" IS NOT NULL) AND ("content_text" IS NULL) AND ("external_url" IS NULL)) OR (("content_text" IS NOT NULL) AND ("bucket" IS NULL) AND ("object_key" IS NULL) AND ("external_url" IS NULL)) OR (("external_url" IS NOT NULL) AND ("bucket" IS NULL) AND ("object_key" IS NULL) AND ("content_text" IS NULL)) OR (("bucket" IS NULL) AND ("object_key" IS NULL) AND ("content_text" IS NULL) AND ("external_url" IS NULL)))),
    CONSTRAINT "objects_visibility_check" CHECK (("visibility" = ANY (ARRAY['public'::"text", 'private'::"text", 'unlisted'::"text"])))
);


ALTER TABLE "media"."objects" OWNER TO "postgres";


COMMENT ON TABLE "media"."objects" IS 'Canonical file/media registry. Every file, inline text, or external URL is a media object. Workspace-scoped. Replaces ai.resources.';



COMMENT ON COLUMN "media"."objects"."bucket" IS 'Supabase Storage bucket name. NULL for inline (content_text) or external (external_url) objects.';



COMMENT ON COLUMN "media"."objects"."object_key" IS 'Supabase Storage object key. Upload flow: create row → get signed URL → upload → finalize.';



COMMENT ON COLUMN "media"."objects"."mime_type" IS 'IANA MIME type. Source of truth for provider capability validation.';



COMMENT ON COLUMN "media"."objects"."media_type" IS 'High-level media category. Extensible TEXT. Values: text | image | audio | video | document | json | binary';



COMMENT ON COLUMN "media"."objects"."checksum_sha256" IS 'SHA-256 hash of the file content. Set during finalization for integrity verification.';



COMMENT ON COLUMN "media"."objects"."lifecycle_state" IS 'pending: created but upload not finalized. active: ready for use. archived: soft-archived. deleted: soft-deleted.';



ALTER VIEW "public"."contact_messages" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_ai_models_public" AS
 SELECT "m"."id",
    "m"."name",
    "m"."key",
    "p"."key" AS "provider_key",
    "p"."display_name" AS "provider_name",
    "m"."context_window_tokens",
    "m"."supports_tools",
    "m"."supports_json_schema",
    "m"."supports_vision",
    "m"."capabilities",
    "m"."input_modalities",
    "m"."output_modalities",
    "m"."is_active"
   FROM ("ai"."models" "m"
     JOIN "ai"."providers" "p" ON (("p"."id" = "m"."provider_id")))
  WHERE (("m"."is_active" = true) AND ("p"."is_active" = true))
  ORDER BY "p"."display_name", "m"."name";


ALTER VIEW "public"."vw_ai_models_public" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_auth_lenser" WITH ("security_invoker"='on') AS
 SELECT "u"."id" AS "user_id",
    "l"."id" AS "lenser_id"
   FROM ("auth"."users" "u"
     JOIN "lensers"."profiles" "l" ON (("l"."user_id" = "u"."id")));


ALTER VIEW "public"."vw_auth_lenser" OWNER TO "postgres";


ALTER VIEW "public"."vw_battle_funnel" OWNER TO "postgres";


ALTER VIEW "public"."vw_battle_health" OWNER TO "postgres";


ALTER VIEW "public"."vw_battle_participation" OWNER TO "postgres";


ALTER VIEW "public"."vw_battles_public" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_content_tags_public" WITH ("security_invoker"='on') AS
 SELECT "t"."id",
    "t"."slug",
    COALESCE("tn"."name", "t"."slug") AS "name",
    "t"."visibility"
   FROM ("content"."tags" "t"
     LEFT JOIN LATERAL ( SELECT "tag_translations"."name"
           FROM "content"."tag_translations"
          WHERE ("tag_translations"."tag_id" = "t"."id")
         LIMIT 1) "tn" ON (true))
  WHERE ("t"."visibility" = 'public'::"content"."tag_visibility_enum");


ALTER VIEW "public"."vw_content_tags_public" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_content_thread_replies_public" WITH ("security_invoker"='on') AS
 SELECT "r"."id",
    "r"."thread_id",
    "r"."parent_reply_id",
    "r"."lenser_id",
    "r"."content",
    "r"."content_html",
    "rt"."reaction_totals",
    "r"."created_at",
    "jsonb_build_object"('handle', "prof"."handle", 'display_name', "prof"."display_name", 'avatar_url', "prof"."avatar_url") AS "author_profile"
   FROM ((("content"."thread_replies" "r"
     JOIN "content"."threads" "t" ON (("t"."id" = "r"."thread_id")))
     LEFT JOIN "lensers"."profiles" "prof" ON (("prof"."id" = "r"."lenser_id")))
     LEFT JOIN LATERAL ( SELECT COALESCE("jsonb_object_agg"("x"."reaction", "x"."cnt"), '{}'::"jsonb") AS "reaction_totals"
           FROM ( SELECT "rx"."reaction",
                    ("count"(*))::integer AS "cnt"
                   FROM "content"."reactions" "rx"
                  WHERE (("rx"."entity_type" = 'thread_reply'::"content"."entity_type_enum") AND ("rx"."entity_id" = "r"."id"))
                  GROUP BY "rx"."reaction") "x") "rt" ON (true))
  WHERE (("t"."visibility" = 'public'::"content"."visibility_enum") AND ("t"."status" = 'published'::"content"."content_status") AND ("r"."status" = 'published'::"content"."thread_reply_status") AND ("r"."deleted_at" IS NULL))
  ORDER BY "r"."created_at";


ALTER VIEW "public"."vw_content_thread_replies_public" OWNER TO "postgres";


COMMENT ON VIEW "public"."vw_content_thread_replies_public" IS 'Public view of published thread replies with reaction aggregates. Uses unified content.reactions table (updated in 20260440000012).';



CREATE OR REPLACE VIEW "public"."vw_content_threads_public" WITH ("security_invoker"='on') AS
 SELECT "t"."id",
    "t"."lenser_id",
    "prof"."handle" AS "lenser_handle",
    COALESCE("et"."title", 'Untitled'::"text") AS "title",
    COALESCE("et"."content", ''::"text") AS "content",
    "jsonb_build_object"('handle', "prof"."handle", 'display_name', "prof"."display_name", 'avatar_url', "prof"."avatar_url") AS "author_profile",
    "rt"."reaction_totals",
    "rt"."like_count",
    "t"."reply_count",
    "t"."view_count",
    "t"."created_at",
    "t"."thumbnail_url",
    "t"."lens_data",
    "t"."visibility",
    "tg_agg"."tags"
   FROM (((("content"."threads" "t"
     LEFT JOIN "content"."entity_translations" "et" ON ((("et"."entity_id" = "t"."id") AND ("et"."entity_type" = 'thread'::"content"."entity_type_enum") AND ("et"."is_original" = true))))
     LEFT JOIN "lensers"."profiles" "prof" ON (("prof"."id" = "t"."lenser_id")))
     LEFT JOIN LATERAL ( SELECT COALESCE("jsonb_object_agg"("x"."reaction", "x"."cnt"), '{}'::"jsonb") AS "reaction_totals",
            COALESCE(("sum"(
                CASE
                    WHEN ("x"."reaction" = 'like'::"content"."reaction_enum") THEN "x"."cnt"
                    ELSE 0
                END))::integer, 0) AS "like_count"
           FROM ( SELECT "rx"."reaction",
                    ("count"(*))::integer AS "cnt"
                   FROM "content"."reactions" "rx"
                  WHERE (("rx"."entity_type" = 'thread'::"content"."entity_type_enum") AND ("rx"."entity_id" = "t"."id"))
                  GROUP BY "rx"."reaction") "x") "rt" ON (true))
     LEFT JOIN LATERAL ( SELECT COALESCE("jsonb_agg"("jsonb_build_object"('id', "tg"."id", 'slug', "tg"."slug", 'name', COALESCE("tn"."name", "tg"."slug"))), '[]'::"jsonb") AS "tags"
           FROM (("content"."tag_map" "tm"
             JOIN "content"."tags" "tg" ON (("tg"."id" = "tm"."tag_id")))
             LEFT JOIN LATERAL ( SELECT "tag_translations"."name"
                   FROM "content"."tag_translations"
                  WHERE ("tag_translations"."tag_id" = "tg"."id")
                 LIMIT 1) "tn" ON (true))
          WHERE (("tm"."entity_type" = 'thread'::"content"."entity_type_enum") AND ("tm"."entity_id" = "t"."id"))) "tg_agg" ON (true))
  WHERE (("t"."visibility" = 'public'::"content"."visibility_enum") AND ("t"."status" = 'published'::"content"."content_status"));


ALTER VIEW "public"."vw_content_threads_public" OWNER TO "postgres";


COMMENT ON VIEW "public"."vw_content_threads_public" IS 'Public view of published threads with reaction aggregates. Uses unified content.reactions and content.entity_translations tables (updated in 20260440000012).';



COMMENT ON COLUMN "public"."vw_content_threads_public"."lenser_handle" IS 'Flat text copy of the author handle. Use eq(lenser_handle, ''foo'') for profile-page filtering — this is indexable, unlike author_profile->>(''handle'').';



ALTER VIEW "public"."vw_feedback_admin" OWNER TO "postgres";


ALTER VIEW "public"."vw_feedback_user" OWNER TO "postgres";


ALTER VIEW "public"."vw_global_messages" OWNER TO "postgres";


ALTER VIEW "public"."vw_lensers_public_recent" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_lensers_social_links_private" WITH ("security_invoker"='on') AS
 SELECT "p"."handle",
    "l"."id",
    "l"."platform",
    "l"."url",
    "l"."label",
    "l"."created_at"
   FROM ("lensers"."profiles" "p"
     JOIN "lensers"."social_links" "l" ON (("l"."lenser_id" = "p"."id")))
  WHERE ("p"."user_id" = "auth"."uid"());


ALTER VIEW "public"."vw_lensers_social_links_private" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_lensers_social_links_public" WITH ("security_invoker"='on') AS
 SELECT "p"."handle",
    "l"."platform",
    "l"."url",
    "l"."label"
   FROM ("lensers"."profiles" "p"
     JOIN "lensers"."social_links" "l" ON (("l"."lenser_id" = "p"."id")))
  WHERE (("p"."status" = 'active'::"lensers"."lenser_status") AND ("p"."deletion_requested_at" IS NULL) AND ("p"."visibility" = 'public'::"lensers"."lenser_visibility"));


ALTER VIEW "public"."vw_lensers_social_links_public" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_lenses_public" WITH ("security_invoker"='on') AS
 SELECT "pt"."id",
    "pt"."lenser_id",
    "prof"."handle" AS "lenser_handle",
    "pt"."visibility",
    COALESCE("et"."title", 'Untitled'::"text") AS "title",
    "et"."description",
    COALESCE("et"."content", ''::"text") AS "content",
    "jsonb_build_object"('id', "prof"."id", 'handle', "prof"."handle", 'display_name', "prof"."display_name", 'avatar_url', "prof"."avatar_url") AS "author_profile",
    "rt"."reaction_totals",
    "rt"."copy_count",
    "rt"."like_count",
    "rt"."saved_count",
    "pt"."created_at",
    "tg_agg"."tags"
   FROM (((("lenses"."lenses" "pt"
     LEFT JOIN "content"."entity_translations" "et" ON ((("et"."entity_id" = "pt"."id") AND ("et"."entity_type" = 'lens'::"content"."entity_type_enum") AND ("et"."is_original" = true))))
     LEFT JOIN "lensers"."profiles" "prof" ON (("prof"."id" = "pt"."lenser_id")))
     LEFT JOIN LATERAL ( SELECT COALESCE("jsonb_object_agg"("x"."reaction", "x"."cnt"), '{}'::"jsonb") AS "reaction_totals",
            COALESCE(("sum"(
                CASE
                    WHEN ("x"."reaction" = 'copy'::"content"."reaction_enum") THEN "x"."cnt"
                    ELSE 0
                END))::integer, 0) AS "copy_count",
            COALESCE(("sum"(
                CASE
                    WHEN ("x"."reaction" = 'like'::"content"."reaction_enum") THEN "x"."cnt"
                    ELSE 0
                END))::integer, 0) AS "like_count",
            COALESCE(("sum"(
                CASE
                    WHEN ("x"."reaction" = 'saved'::"content"."reaction_enum") THEN "x"."cnt"
                    ELSE 0
                END))::integer, 0) AS "saved_count"
           FROM ( SELECT "rx"."reaction",
                    ("count"(*))::integer AS "cnt"
                   FROM "content"."reactions" "rx"
                  WHERE (("rx"."entity_type" = 'lens'::"content"."entity_type_enum") AND ("rx"."entity_id" = "pt"."id"))
                  GROUP BY "rx"."reaction") "x") "rt" ON (true))
     LEFT JOIN LATERAL ( SELECT COALESCE("jsonb_agg"("jsonb_build_object"('id', "tg"."id", 'slug', "tg"."slug", 'name', COALESCE("tn"."name", "tg"."slug"))), '[]'::"jsonb") AS "tags"
           FROM (("content"."tag_map" "tm"
             JOIN "content"."tags" "tg" ON (("tg"."id" = "tm"."tag_id")))
             LEFT JOIN LATERAL ( SELECT "tag_translations"."name"
                   FROM "content"."tag_translations"
                  WHERE ("tag_translations"."tag_id" = "tg"."id")
                 LIMIT 1) "tn" ON (true))
          WHERE (("tm"."entity_type" = 'lens'::"content"."entity_type_enum") AND ("tm"."entity_id" = "pt"."id"))) "tg_agg" ON (true))
  WHERE (("pt"."visibility" = 'public'::"content"."visibility_enum") AND ("pt"."status" = 'published'::"content"."content_status"));


ALTER VIEW "public"."vw_lenses_public" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_tags_public_extended" WITH ("security_invoker"='on') AS
 SELECT "t"."id",
    "t"."slug",
    COALESCE("tn"."name", "t"."slug") AS "name",
    "t"."created_at",
    'public'::"text" AS "visibility",
    (0)::bigint AS "created_count",
    (0)::bigint AS "viewed_count",
    (0)::bigint AS "reacted_count",
    (0)::bigint AS "total_usage",
    (0)::bigint AS "trend_score"
   FROM ("content"."tags" "t"
     LEFT JOIN LATERAL ( SELECT "tag_translations"."name"
           FROM "content"."tag_translations"
          WHERE ("tag_translations"."tag_id" = "t"."id")
         LIMIT 1) "tn" ON (true))
  WHERE ("t"."visibility" = 'public'::"content"."tag_visibility_enum");


ALTER VIEW "public"."vw_tags_public_extended" OWNER TO "postgres";


ALTER VIEW "public"."vw_tags_public_stats" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_workflows" WITH ("security_invoker"='on') AS
 SELECT "id",
    "lenser_id",
    "title",
    "description",
    "visibility",
    "battle_count",
    "reaction_totals",
    "fork_count",
    "parent_workflow_id",
    "created_at",
    "updated_at"
   FROM "lenses"."workflows";


ALTER VIEW "public"."vw_workflows" OWNER TO "postgres";


ALTER VIEW "public"."vw_xp_leaderboard_global" OWNER TO "postgres";


ALTER VIEW "public"."vw_xp_leaderboard_season" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "tenancy"."workspace_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "lenser_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "invited_by" "uuid",
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "workspace_members_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'member'::"text", 'viewer'::"text"])))
);


ALTER TABLE "tenancy"."workspace_members" OWNER TO "postgres";


COMMENT ON TABLE "tenancy"."workspace_members" IS 'Workspace membership with roles. Owner has full control, admin can manage members, member has read/write, viewer has read-only.';



CREATE TABLE IF NOT EXISTS "tenancy"."workspaces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "type" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "owner_lenser_id" "uuid",
    "org_id" "uuid",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "workspaces_slug_format" CHECK ((("slug" ~ '^[a-z0-9]+([_-][a-z0-9]+)*$'::"text") AND (("char_length"("slug") >= 3) AND ("char_length"("slug") <= 64)))),
    CONSTRAINT "workspaces_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'suspended'::"text", 'archived'::"text"]))),
    CONSTRAINT "workspaces_type_check" CHECK (("type" = ANY (ARRAY['personal'::"text", 'organization'::"text"])))
);


ALTER TABLE "tenancy"."workspaces" OWNER TO "postgres";


COMMENT ON TABLE "tenancy"."workspaces" IS 'Canonical tenant boundary. Every lenser gets a personal workspace; organizations map to organization-type workspaces. Media, keys, executions, and audit records are workspace-scoped.';



ALTER TABLE ONLY "agents"."action_logs"
    ADD CONSTRAINT "action_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "agents"."ai_lensers"
    ADD CONSTRAINT "ai_lensers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "agents"."ai_lensers"
    ADD CONSTRAINT "ai_lensers_profile_id_key" UNIQUE ("profile_id");



ALTER TABLE ONLY "agents"."lens_bindings"
    ADD CONSTRAINT "lens_bindings_ai_lenser_id_lens_id_key" UNIQUE ("ai_lenser_id", "lens_id");



ALTER TABLE ONLY "agents"."lens_bindings"
    ADD CONSTRAINT "lens_bindings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "agents"."model_bindings"
    ADD CONSTRAINT "model_bindings_ai_lenser_id_model_id_key" UNIQUE ("ai_lenser_id", "model_id");



ALTER TABLE ONLY "agents"."model_bindings"
    ADD CONSTRAINT "model_bindings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "agents"."ownerships"
    ADD CONSTRAINT "ownerships_ai_lenser_id_owner_lenser_id_key" UNIQUE ("ai_lenser_id", "owner_lenser_id");



ALTER TABLE ONLY "agents"."ownerships"
    ADD CONSTRAINT "ownerships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "agents"."policies"
    ADD CONSTRAINT "policies_ai_lenser_id_key" UNIQUE ("ai_lenser_id");



ALTER TABLE ONLY "agents"."policies"
    ADD CONSTRAINT "policies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "agents"."quota_snapshots"
    ADD CONSTRAINT "quota_snapshots_ai_lenser_id_period_date_key" UNIQUE ("ai_lenser_id", "period_date");



ALTER TABLE ONLY "agents"."quota_snapshots"
    ADD CONSTRAINT "quota_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "ai"."models"
    ADD CONSTRAINT "ai_models_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "ai"."key_usage_log"
    ADD CONSTRAINT "key_usage_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "ai"."keys"
    ADD CONSTRAINT "keys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "ai"."model_pricing"
    ADD CONSTRAINT "model_pricing_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "ai"."models"
    ADD CONSTRAINT "models_key_unique" UNIQUE ("key");



ALTER TABLE ONLY "ai"."providers"
    ADD CONSTRAINT "providers_key_unique" UNIQUE ("key");



ALTER TABLE ONLY "ai"."providers"
    ADD CONSTRAINT "providers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "content"."entity_translations"
    ADD CONSTRAINT "entity_translations_entity_lang_key" UNIQUE ("entity_type", "entity_id", "language_code");



ALTER TABLE ONLY "content"."entity_translations"
    ADD CONSTRAINT "entity_translations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "content"."reactions"
    ADD CONSTRAINT "reactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "content"."reports"
    ADD CONSTRAINT "reports_pk" PRIMARY KEY ("id");



ALTER TABLE ONLY "content"."reports"
    ADD CONSTRAINT "reports_unique" UNIQUE ("reporter_id", "target_type", "target_id");



ALTER TABLE ONLY "content"."tag_map"
    ADD CONSTRAINT "tag_map_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "content"."tag_map"
    ADD CONSTRAINT "tag_map_unique" UNIQUE ("entity_type", "entity_id", "tag_id");



ALTER TABLE ONLY "content"."tag_suggestions"
    ADD CONSTRAINT "tag_suggestions_entity_type_entity_id_tag_id_key" UNIQUE ("entity_type", "entity_id", "tag_id");



ALTER TABLE ONLY "content"."tag_suggestions"
    ADD CONSTRAINT "tag_suggestions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "content"."tag_translations"
    ADD CONSTRAINT "tag_translations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "content"."tag_translations"
    ADD CONSTRAINT "tag_translations_tag_id_language_id_key" UNIQUE ("tag_id", "language_code");



ALTER TABLE ONLY "content"."tags"
    ADD CONSTRAINT "tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "content"."tags"
    ADD CONSTRAINT "tags_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "content"."thread_replies"
    ADD CONSTRAINT "thread_replies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "content"."threads"
    ADD CONSTRAINT "threads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "execution"."artifact_medias"
    ADD CONSTRAINT "artifact_medias_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "execution"."artifacts"
    ADD CONSTRAINT "artifacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "execution"."execution_tags"
    ADD CONSTRAINT "execution_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "execution"."origin_types"
    ADD CONSTRAINT "origin_types_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "execution"."parameter_usage_logs"
    ADD CONSTRAINT "parameter_usage_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "execution"."request_attachments"
    ADD CONSTRAINT "request_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "execution"."request_attachments"
    ADD CONSTRAINT "request_attachments_request_key_unique" UNIQUE ("request_id", "binding_key");



ALTER TABLE ONLY "execution"."requests"
    ADD CONSTRAINT "requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "execution"."runs"
    ADD CONSTRAINT "runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "execution"."steps"
    ADD CONSTRAINT "steps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "execution"."stream_sessions"
    ADD CONSTRAINT "stream_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "execution"."stream_sessions"
    ADD CONSTRAINT "stream_sessions_run_id_unique" UNIQUE ("run_id");



ALTER TABLE ONLY "lensers"."group_members"
    ADD CONSTRAINT "group_members_pkey" PRIMARY KEY ("group_id", "lenser_id");



ALTER TABLE ONLY "lensers"."groups"
    ADD CONSTRAINT "groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "lensers"."groups"
    ADD CONSTRAINT "groups_slug_unique" UNIQUE ("slug");



ALTER TABLE ONLY "lensers"."badges"
    ADD CONSTRAINT "lenser_badges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "lensers"."badges"
    ADD CONSTRAINT "lenser_badges_unique_per_type" UNIQUE ("lenser_id", "type");



ALTER TABLE ONLY "lensers"."social_links"
    ADD CONSTRAINT "lenser_social_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "lensers"."profiles"
    ADD CONSTRAINT "lensers_handle_key" UNIQUE ("handle");



ALTER TABLE ONLY "lensers"."profiles"
    ADD CONSTRAINT "lensers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "lensers"."preferences"
    ADD CONSTRAINT "preferences_lenser_id_key" UNIQUE ("lenser_id");



ALTER TABLE ONLY "lensers"."profiles"
    ADD CONSTRAINT "profiles_user_id_unique" UNIQUE ("user_id");



ALTER TABLE ONLY "lensers"."relationships"
    ADD CONSTRAINT "relationships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "lensers"."tag_follows"
    ADD CONSTRAINT "tag_follows_pk" PRIMARY KEY ("id");



ALTER TABLE ONLY "lensers"."tag_follows"
    ADD CONSTRAINT "tag_follows_unique" UNIQUE ("lenser_id", "tag_id");



ALTER TABLE ONLY "lensers"."relationships"
    ADD CONSTRAINT "uq_relationship" UNIQUE ("source_profile_id", "target_profile_id");



ALTER TABLE ONLY "lenses"."steps"
    ADD CONSTRAINT "lens_steps_lens_id_ordinal_key" UNIQUE ("lens_id", "ordinal");



ALTER TABLE ONLY "lenses"."steps"
    ADD CONSTRAINT "lens_steps_pkey" PRIMARY KEY ("id");



ALTER TABLE "lenses"."steps"
    ADD CONSTRAINT "lens_steps_sub_lens_required" CHECK ((("step_type" <> 'lens'::"text") OR ("sub_lens_id" IS NOT NULL))) NOT VALID;



ALTER TABLE ONLY "lenses"."version_parameters"
    ADD CONSTRAINT "lens_version_params_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "lenses"."versions"
    ADD CONSTRAINT "lens_versions_number_unique" UNIQUE ("lens_id", "version_number");



ALTER TABLE ONLY "lenses"."versions"
    ADD CONSTRAINT "lens_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "lenses"."lenses"
    ADD CONSTRAINT "lenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "lenses"."tools"
    ADD CONSTRAINT "tools_key_key" UNIQUE ("key");



ALTER TABLE ONLY "lenses"."tools"
    ADD CONSTRAINT "tools_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "lenses"."version_parameter_contents"
    ADD CONSTRAINT "uq_param_workspace_lenser" UNIQUE ("parameter_id", "workspace_id", "lenser_id");



ALTER TABLE ONLY "lenses"."version_parameter_contents"
    ADD CONSTRAINT "version_parameter_contents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "lenses"."workflow_edges"
    ADD CONSTRAINT "wf_edges_unique_connection" UNIQUE ("source_node_id", "target_node_id", "target_param_label");



ALTER TABLE ONLY "lenses"."workflow_edges"
    ADD CONSTRAINT "workflow_edges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "lenses"."workflow_node_results"
    ADD CONSTRAINT "workflow_node_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "lenses"."workflow_node_results"
    ADD CONSTRAINT "workflow_node_results_run_id_node_id_key" UNIQUE ("run_id", "node_id");



ALTER TABLE ONLY "lenses"."workflow_nodes"
    ADD CONSTRAINT "workflow_nodes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "lenses"."workflow_runs"
    ADD CONSTRAINT "workflow_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "lenses"."workflow_schedules"
    ADD CONSTRAINT "workflow_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "lenses"."workflow_version_edges"
    ADD CONSTRAINT "workflow_version_edges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "lenses"."workflow_version_nodes"
    ADD CONSTRAINT "workflow_version_nodes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "lenses"."workflow_versions"
    ADD CONSTRAINT "workflow_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "lenses"."workflow_versions"
    ADD CONSTRAINT "workflow_versions_workflow_version_key" UNIQUE ("workflow_id", "version_number");



ALTER TABLE ONLY "lenses"."workflows"
    ADD CONSTRAINT "workflows_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "media"."attachments"
    ADD CONSTRAINT "attachments_entity_binding_unique" UNIQUE ("entity_type", "entity_id", "binding_key");



ALTER TABLE ONLY "media"."attachments"
    ADD CONSTRAINT "attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "media"."objects"
    ADD CONSTRAINT "objects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "tenancy"."workspace_members"
    ADD CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "tenancy"."workspace_members"
    ADD CONSTRAINT "workspace_members_unique" UNIQUE ("workspace_id", "lenser_id");



ALTER TABLE ONLY "tenancy"."workspaces"
    ADD CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "tenancy"."workspaces"
    ADD CONSTRAINT "workspaces_slug_unique" UNIQUE ("slug");



CREATE INDEX "idx_agent_action_logs_context" ON "agents"."action_logs" USING "btree" ("context_ref_type", "context_ref_id") WHERE ("context_ref_id" IS NOT NULL);



CREATE INDEX "idx_agent_action_logs_lenser_time" ON "agents"."action_logs" USING "btree" ("ai_lenser_id", "occurred_at" DESC);



CREATE UNIQUE INDEX "idx_agent_lens_one_default" ON "agents"."lens_bindings" USING "btree" ("ai_lenser_id") WHERE ("is_default" = true);



CREATE UNIQUE INDEX "idx_agent_model_one_default" ON "agents"."model_bindings" USING "btree" ("ai_lenser_id") WHERE ("is_default" = true);



CREATE UNIQUE INDEX "idx_agents_ownerships_primary" ON "agents"."ownerships" USING "btree" ("ai_lenser_id") WHERE (("role" = 'owner'::"text") AND ("revoked_at" IS NULL));



CREATE INDEX "idx_fk_lens_bindings_lens_id" ON "agents"."lens_bindings" USING "btree" ("lens_id");



CREATE INDEX "idx_fk_lens_bindings_version_id" ON "agents"."lens_bindings" USING "btree" ("version_id");



CREATE INDEX "idx_fk_model_bindings_model_id" ON "agents"."model_bindings" USING "btree" ("model_id");



CREATE INDEX "idx_fk_ownerships_owner_lenser_id" ON "agents"."ownerships" USING "btree" ("owner_lenser_id");



CREATE UNIQUE INDEX "idx_ai_model_pricing_active_unique" ON "ai"."model_pricing" USING "btree" ("model_id") WHERE ("effective_to" IS NULL);



CREATE INDEX "idx_ai_model_pricing_model_active" ON "ai"."model_pricing" USING "btree" ("model_id") WHERE ("effective_to" IS NULL);



CREATE INDEX "idx_ai_models_active" ON "ai"."models" USING "btree" ("is_active", "provider_id") WHERE ("is_active" = true);



CREATE UNIQUE INDEX "idx_ai_models_key" ON "ai"."models" USING "btree" ("key") WHERE ("key" IS NOT NULL);



CREATE INDEX "idx_ai_models_key_active" ON "ai"."models" USING "btree" ("key") WHERE ("is_active" = true);



COMMENT ON INDEX "ai"."idx_ai_models_key_active" IS 'Partial index for active model_key lookups — used in get_model_info and execution routing.';



CREATE INDEX "idx_ai_models_provider_active" ON "ai"."models" USING "btree" ("provider_id", "is_active") WHERE ("is_active" = true);



COMMENT ON INDEX "ai"."idx_ai_models_provider_active" IS 'Partial index for (provider_id, is_active=true) — used in cascade trigger + get_active_models_by_provider.';



CREATE INDEX "idx_ai_models_provider_id" ON "ai"."models" USING "btree" ("provider_id") WHERE ("provider_id" IS NOT NULL);



CREATE INDEX "idx_ai_providers_is_active" ON "ai"."providers" USING "btree" ("is_active") WHERE ("is_active" = true);



COMMENT ON INDEX "ai"."idx_ai_providers_is_active" IS 'Partial index to accelerate active-provider scans used by public functions.';



CREATE INDEX "idx_fk_keys_provider_id" ON "ai"."keys" USING "btree" ("provider_id");



CREATE INDEX "idx_key_usage_log_key_created" ON "ai"."key_usage_log" USING "btree" ("key_id", "created_at" DESC);



CREATE INDEX "idx_key_usage_log_lenser_created" ON "ai"."key_usage_log" USING "btree" ("lenser_id", "created_at" DESC);



CREATE INDEX "idx_key_usage_log_run" ON "ai"."key_usage_log" USING "btree" ("run_id") WHERE ("run_id" IS NOT NULL);



CREATE INDEX "idx_key_usage_log_workspace_created" ON "ai"."key_usage_log" USING "btree" ("workspace_id", "created_at" DESC) WHERE ("workspace_id" IS NOT NULL);



CREATE INDEX "idx_keys_expires_at" ON "ai"."keys" USING "btree" ("expires_at") WHERE ("expires_at" IS NOT NULL);



CREATE INDEX "idx_keys_lenser_active" ON "ai"."keys" USING "btree" ("lenser_id") WHERE ("is_active" = true);



CREATE INDEX "idx_keys_scope" ON "ai"."keys" USING "btree" ("scope") WHERE ("scope" <> 'user'::"ai"."key_scope_enum");



CREATE INDEX "idx_keys_status" ON "ai"."keys" USING "btree" ("status");



CREATE INDEX "idx_model_pricing_model_active" ON "ai"."model_pricing" USING "btree" ("model_id", "effective_from" DESC) WHERE ("effective_to" IS NULL);



CREATE INDEX "idx_model_pricing_unit_type" ON "ai"."model_pricing" USING "btree" ("unit_type");



CREATE INDEX "idx_entity_translations_entity" ON "content"."entity_translations" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_entity_translations_original" ON "content"."entity_translations" USING "btree" ("entity_type", "entity_id") WHERE ("is_original" = true);



CREATE INDEX "idx_entity_translations_title_trgm" ON "content"."entity_translations" USING "gin" ("lower"("title") "extensions"."gin_trgm_ops") WHERE (("is_original" = true) AND ("title" IS NOT NULL));



CREATE INDEX "idx_fk_entity_translations_language_code" ON "content"."entity_translations" USING "btree" ("language_code");



CREATE INDEX "idx_fk_tag_suggestions_ai_model_id" ON "content"."tag_suggestions" USING "btree" ("ai_model_id");



CREATE INDEX "idx_fk_tag_suggestions_tag_id" ON "content"."tag_suggestions" USING "btree" ("tag_id");



CREATE INDEX "idx_fk_tag_translations_language_code" ON "content"."tag_translations" USING "btree" ("language_code");



CREATE INDEX "idx_fk_thread_replies_lenser_id" ON "content"."thread_replies" USING "btree" ("lenser_id");



CREATE INDEX "idx_fk_thread_replies_parent_reply_id" ON "content"."thread_replies" USING "btree" ("parent_reply_id");



CREATE INDEX "idx_fk_threads_linked_lens_id" ON "content"."threads" USING "btree" ("linked_lens_id");



CREATE INDEX "idx_reactions_entity" ON "content"."reactions" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_reactions_entity_reaction" ON "content"."reactions" USING "btree" ("entity_type", "entity_id", "reaction");



CREATE INDEX "idx_reactions_lenser_time" ON "content"."reactions" USING "btree" ("lenser_id", "created_at" DESC);



CREATE INDEX "idx_reports_target_type_target_id" ON "content"."reports" USING "btree" ("target_type", "target_id");



CREATE INDEX "idx_tag_map_entity" ON "content"."tag_map" USING "btree" ("entity_id", "entity_type");



CREATE INDEX "idx_tag_map_tag_id" ON "content"."tag_map" USING "btree" ("tag_id");



CREATE INDEX "idx_tag_map_type_entity" ON "content"."tag_map" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_tag_map_type_tag" ON "content"."tag_map" USING "btree" ("entity_type", "tag_id", "entity_id");



CREATE INDEX "idx_tag_suggestions_entity" ON "content"."tag_suggestions" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_tag_translations_name_lower" ON "content"."tag_translations" USING "btree" ("lower"("btrim"("name")));



CREATE INDEX "idx_tag_translations_tag_id" ON "content"."tag_translations" USING "btree" ("tag_id");



CREATE INDEX "idx_tags_slug" ON "content"."tags" USING "btree" ("slug");



CREATE INDEX "idx_thread_replies_published" ON "content"."thread_replies" USING "btree" ("thread_id", "created_at") WHERE (("status" = 'published'::"content"."thread_reply_status") AND ("deleted_at" IS NULL));



CREATE INDEX "idx_threads_lenser_id" ON "content"."threads" USING "btree" ("lenser_id");



CREATE INDEX "idx_threads_lenser_id_created" ON "content"."threads" USING "btree" ("lenser_id", "created_at" DESC) WHERE (("visibility" = 'public'::"content"."visibility_enum") AND ("status" = 'published'::"content"."content_status"));



CREATE INDEX "idx_threads_public_feed" ON "content"."threads" USING "btree" ("visibility", "status", "created_at" DESC) WHERE (("visibility" = 'public'::"content"."visibility_enum") AND ("status" = 'published'::"content"."content_status"));



CREATE INDEX "idx_threads_public_published" ON "content"."threads" USING "btree" ("created_at" DESC) WHERE (("visibility" = 'public'::"content"."visibility_enum") AND ("status" = 'published'::"content"."content_status"));



CREATE UNIQUE INDEX "reactions_unique_non_copy" ON "content"."reactions" USING "btree" ("entity_type", "entity_id", "lenser_id", "reaction") WHERE ("reaction" <> 'copy'::"content"."reaction_enum");



CREATE INDEX "idx_artifact_medias_artifact_id" ON "execution"."artifact_medias" USING "btree" ("artifact_id");



CREATE INDEX "idx_artifact_medias_media_id" ON "execution"."artifact_medias" USING "btree" ("media_id");



CREATE INDEX "idx_artifacts_run_visibility" ON "execution"."artifacts" USING "btree" ("run_id", "visibility") WHERE ("visibility" <> 'private'::"text");



CREATE INDEX "idx_exec_artifacts_kind" ON "execution"."artifacts" USING "btree" ("artifact_kind", "created_at" DESC);



CREATE INDEX "idx_exec_artifacts_run_primary" ON "execution"."artifacts" USING "btree" ("run_id", "is_primary_output" DESC);



CREATE INDEX "idx_exec_requests_byok_key" ON "execution"."requests" USING "btree" ("byok_key_ref_id") WHERE ("byok_key_ref_id" IS NOT NULL);



CREATE INDEX "idx_exec_requests_origin" ON "execution"."requests" USING "btree" ("origin_type", "origin_id");



CREATE INDEX "idx_exec_requests_requester_origin" ON "execution"."requests" USING "btree" ("requester_lenser_id", "origin_type", "created_at" DESC);



CREATE INDEX "idx_exec_runs_billing_status" ON "execution"."runs" USING "btree" ("billing_status", "created_at" DESC) WHERE ("billing_status" <> 'free'::"text");



CREATE UNIQUE INDEX "idx_exec_runs_execution_hash" ON "execution"."runs" USING "btree" ("execution_hash") WHERE ("execution_hash" IS NOT NULL);



CREATE INDEX "idx_exec_runs_model" ON "execution"."runs" USING "btree" ("model_id", "started_at" DESC) WHERE ("model_id" IS NOT NULL);



CREATE UNIQUE INDEX "idx_exec_runs_provider_request" ON "execution"."runs" USING "btree" ("provider_request_id") WHERE ("provider_request_id" IS NOT NULL);



CREATE INDEX "idx_exec_runs_request" ON "execution"."runs" USING "btree" ("request_id");



CREATE INDEX "idx_exec_runs_request_status" ON "execution"."runs" USING "btree" ("request_id", "status");



CREATE INDEX "idx_exec_runs_status" ON "execution"."runs" USING "btree" ("status", "started_at" DESC);



CREATE INDEX "idx_exec_runs_status_billing" ON "execution"."runs" USING "btree" ("status", "billing_status") WHERE ("billing_status" <> 'free'::"text");



COMMENT ON INDEX "execution"."idx_exec_runs_status_billing" IS 'Billing reconciliation: succeeded runs awaiting billing_status=pending. Partial index excludes free runs (largest segment) to minimize index size.';



CREATE UNIQUE INDEX "idx_exec_steps_run_ordinal" ON "execution"."steps" USING "btree" ("run_id", "ordinal");



CREATE INDEX "idx_exec_steps_run_type" ON "execution"."steps" USING "btree" ("run_id", "step_type");



CREATE INDEX "idx_execution_requests_is_active" ON "execution"."requests" USING "btree" ("is_active", "created_at" DESC) WHERE ("is_active" = true);



CREATE INDEX "idx_execution_runs_is_active" ON "execution"."runs" USING "btree" ("is_active", "created_at" DESC) WHERE ("is_active" = true);



CREATE INDEX "idx_execution_steps_definition_id" ON "execution"."steps" USING "btree" ("step_definition_id") WHERE ("step_definition_id" IS NOT NULL);



CREATE INDEX "idx_execution_tags_run_id" ON "execution"."execution_tags" USING "btree" ("run_id");



CREATE INDEX "idx_execution_tags_tag_severity" ON "execution"."execution_tags" USING "btree" ("tag", "severity", "created_at" DESC);



CREATE INDEX "idx_fk_param_usage_logs_ai_model_id" ON "execution"."parameter_usage_logs" USING "btree" ("ai_model_id");



CREATE INDEX "idx_fk_param_usage_logs_version_parameter_id" ON "execution"."parameter_usage_logs" USING "btree" ("version_parameter_id");



CREATE INDEX "idx_fk_param_usage_logs_workspace_id" ON "execution"."parameter_usage_logs" USING "btree" ("workspace_id");



CREATE INDEX "idx_fk_requests_model_id" ON "execution"."requests" USING "btree" ("model_id");



CREATE INDEX "idx_fk_stream_sessions_model_key" ON "execution"."stream_sessions" USING "btree" ("model_key");



CREATE INDEX "idx_fk_stream_sessions_provider" ON "execution"."stream_sessions" USING "btree" ("provider");



CREATE INDEX "idx_param_usage_logs_lenser_id" ON "execution"."parameter_usage_logs" USING "btree" ("lenser_id", "created_at" DESC);



CREATE INDEX "idx_param_usage_logs_request_id" ON "execution"."parameter_usage_logs" USING "btree" ("request_id");



CREATE INDEX "idx_param_usage_logs_version_id" ON "execution"."parameter_usage_logs" USING "btree" ("version_id") WHERE ("version_id" IS NOT NULL);



CREATE INDEX "idx_req_attachments_media_object" ON "execution"."request_attachments" USING "btree" ("media_object_id");



CREATE INDEX "idx_req_attachments_request_id" ON "execution"."request_attachments" USING "btree" ("request_id");



CREATE INDEX "idx_requests_lens_id" ON "execution"."requests" USING "btree" ("lens_id") WHERE ("is_active" = true);



CREATE INDEX "idx_requests_lenser_created" ON "execution"."requests" USING "btree" ("requester_lenser_id", "created_at" DESC) WHERE ("is_active" = true);



CREATE INDEX "idx_requests_requester_time" ON "execution"."requests" USING "btree" ("requester_lenser_id", "created_at" DESC);



CREATE INDEX "idx_requests_version_id" ON "execution"."requests" USING "btree" ("version_id") WHERE ("version_id" IS NOT NULL);



CREATE INDEX "idx_requests_workspace_created" ON "execution"."requests" USING "btree" ("workspace_id", "created_at" DESC) WHERE ("workspace_id" IS NOT NULL);



CREATE INDEX "idx_requests_workspace_id" ON "execution"."requests" USING "btree" ("workspace_id");



CREATE INDEX "idx_runs_request_id" ON "execution"."runs" USING "btree" ("request_id") WHERE ("is_active" = true);



CREATE INDEX "idx_stream_sessions_lenser_id" ON "execution"."stream_sessions" USING "btree" ("lenser_id", "started_at" DESC);



CREATE INDEX "idx_stream_sessions_status_started" ON "execution"."stream_sessions" USING "btree" ("status", "started_at" DESC);



COMMENT ON INDEX "execution"."idx_stream_sessions_status_started" IS 'Cross-user session monitoring by status (open, failed, timed_out). Also used by cleanup jobs sweeping stale open sessions.';



CREATE INDEX "idx_stream_sessions_workspace" ON "execution"."stream_sessions" USING "btree" ("workspace_id", "started_at" DESC) WHERE ("workspace_id" IS NOT NULL);



CREATE INDEX "idx_fk_preferences_active_lenser_id" ON "lensers"."preferences" USING "btree" ("active_lenser_id");



CREATE INDEX "idx_fk_preferences_ai_model_key" ON "lensers"."preferences" USING "btree" ("ai_model_key");



CREATE INDEX "idx_fk_preferences_currency" ON "lensers"."preferences" USING "btree" ("currency");



CREATE INDEX "idx_fk_profiles_ai_model_id" ON "lensers"."profiles" USING "btree" ("ai_model_id");



CREATE INDEX "idx_group_members_lenser" ON "lensers"."group_members" USING "btree" ("lenser_id");



COMMENT ON INDEX "lensers"."idx_group_members_lenser" IS 'Supports "groups I belong to" queries starting from a lenser_id. The PK index covers (group_id, lenser_id) lookups.';



CREATE INDEX "idx_groups_owner" ON "lensers"."groups" USING "btree" ("owner_lenser_id");



COMMENT ON INDEX "lensers"."idx_groups_owner" IS 'Supports "my groups" listing filtered by owner_lenser_id.';



CREATE INDEX "idx_groups_type_visibility" ON "lensers"."groups" USING "btree" ("type", "visibility");



COMMENT ON INDEX "lensers"."idx_groups_type_visibility" IS 'Supports discovery queries: list all public communities, list all private teams, etc.';



CREATE INDEX "idx_lensers_profiles_type" ON "lensers"."profiles" USING "btree" ("type");



CREATE INDEX "idx_lensers_social_links_lenser_id" ON "lensers"."social_links" USING "btree" ("lenser_id");



CREATE INDEX "idx_preferences_ai_provider_key" ON "lensers"."preferences" USING "btree" ("ai_provider_key") WHERE ("ai_provider_key" IS NOT NULL);



COMMENT ON INDEX "lensers"."idx_preferences_ai_provider_key" IS 'Partial index for filtering preferences by ai_provider_key — used in billing/analytics dashboards.';



CREATE INDEX "idx_preferences_language" ON "lensers"."preferences" USING "btree" ("language");



COMMENT ON INDEX "lensers"."idx_preferences_language" IS 'Index on language for language-based analytics and i18n dashboard filtering.';



CREATE INDEX "idx_preferences_selected_api_key_id" ON "lensers"."preferences" USING "btree" ("selected_api_key_id") WHERE ("selected_api_key_id" IS NOT NULL);



COMMENT ON INDEX "lensers"."idx_preferences_selected_api_key_id" IS 'Partial index for looking up which lensers use a specific API key.';



CREATE INDEX "idx_preferences_wallet_mode" ON "lensers"."preferences" USING "btree" ("wallet_mode");



COMMENT ON INDEX "lensers"."idx_preferences_wallet_mode" IS 'Index on wallet_mode for BYOK vs CLOUD usage filtering.';



CREATE INDEX "idx_profiles_handle" ON "lensers"."profiles" USING "btree" ("handle");



CREATE INDEX "idx_profiles_joined_at" ON "lensers"."profiles" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_profiles_last_active_at" ON "lensers"."profiles" USING "btree" ("last_active_at" DESC NULLS LAST) WHERE (("status" = 'active'::"lensers"."lenser_status") AND ("visibility" = 'public'::"lensers"."lenser_visibility") AND ("deletion_requested_at" IS NULL));



CREATE INDEX "idx_profiles_user_id_status" ON "lensers"."profiles" USING "btree" ("user_id", "status") WHERE ("deletion_requested_at" IS NULL);



CREATE INDEX "idx_profiles_user_id_status_all" ON "lensers"."profiles" USING "btree" ("user_id", "status");



CREATE INDEX "idx_relationships_accepted_active" ON "lensers"."relationships" USING "btree" ("source_profile_id", "target_profile_id") WHERE (("status" = 'accepted'::"lensers"."relationship_status") AND ("removed_at" IS NULL));



COMMENT ON INDEX "lensers"."idx_relationships_accepted_active" IS 'Partial index on accepted, non-removed follows. Used by fn_content_get_following_threads and fn_content_get_following_lenses for fast fan-out lookup.';



CREATE INDEX "idx_relationships_active" ON "lensers"."relationships" USING "btree" ("source_profile_id", "target_profile_id") WHERE ("status" = ANY (ARRAY['pending'::"lensers"."relationship_status", 'accepted'::"lensers"."relationship_status"]));



CREATE INDEX "idx_relationships_blocked" ON "lensers"."relationships" USING "btree" ("source_profile_id", "target_profile_id") WHERE ("status" = 'blocked'::"lensers"."relationship_status");



CREATE INDEX "idx_relationships_source_status" ON "lensers"."relationships" USING "btree" ("source_profile_id", "status");



CREATE INDEX "idx_relationships_target_status" ON "lensers"."relationships" USING "btree" ("target_profile_id", "status");



CREATE INDEX "idx_relationships_uq_active_source" ON "lensers"."relationships" USING "btree" ("source_profile_id", "status") WHERE ("removed_at" IS NULL);



COMMENT ON INDEX "lensers"."idx_relationships_uq_active_source" IS 'Partial index for active (non-removed) follow relationships by source lenser. Added in migration 000056.';



CREATE INDEX "idx_tag_follows_lenser_id" ON "lensers"."tag_follows" USING "btree" ("lenser_id");



CREATE INDEX "idx_tag_follows_tag_id" ON "lensers"."tag_follows" USING "btree" ("tag_id");



CREATE UNIQUE INDEX "lensers_handle_lower_idx" ON "lensers"."profiles" USING "btree" ("lower"("handle"));



CREATE INDEX "lensers_profiles_active_recent_idx" ON "lensers"."profiles" USING "btree" ("created_at" DESC) WHERE (("status" = 'active'::"lensers"."lenser_status") AND ("deletion_requested_at" IS NULL));



CREATE INDEX "idx_fk_lenses_forked_from_execution_id" ON "lenses"."lenses" USING "btree" ("forked_from_execution_id");



CREATE INDEX "idx_fk_lenses_forked_from_version_id" ON "lenses"."lenses" USING "btree" ("forked_from_version_id");



CREATE INDEX "idx_fk_steps_model_id" ON "lenses"."steps" USING "btree" ("model_id");



CREATE INDEX "idx_fk_vpc_workspace_id" ON "lenses"."version_parameter_contents" USING "btree" ("workspace_id");



CREATE INDEX "idx_fk_wf_nodes_lens_id" ON "lenses"."workflow_nodes" USING "btree" ("lens_id");



CREATE INDEX "idx_fk_wf_nodes_version_id" ON "lenses"."workflow_nodes" USING "btree" ("version_id");



CREATE INDEX "idx_fk_wnr_execution_run_id" ON "lenses"."workflow_node_results" USING "btree" ("execution_run_id");



CREATE INDEX "idx_fk_wnr_node_id" ON "lenses"."workflow_node_results" USING "btree" ("node_id");



CREATE INDEX "idx_lens_steps_lens_id" ON "lenses"."steps" USING "btree" ("lens_id");



CREATE INDEX "idx_lens_steps_version_id" ON "lenses"."steps" USING "btree" ("version_id");



CREATE INDEX "idx_lens_version_params_tool_id" ON "lenses"."version_parameters" USING "btree" ("tool_id") WHERE ("tool_id" IS NOT NULL);



CREATE INDEX "idx_lens_versions_draft" ON "lenses"."versions" USING "btree" ("lens_id", "version_number" DESC) WHERE ("status" = 'draft'::"content"."content_status");



CREATE INDEX "idx_lens_versions_lens_number" ON "lenses"."versions" USING "btree" ("lens_id", "version_number" DESC);



CREATE INDEX "idx_lens_versions_lens_status_covering" ON "lenses"."versions" USING "btree" ("lens_id", "status") INCLUDE ("id", "version_number", "published_at");



CREATE INDEX "idx_lens_versions_parent" ON "lenses"."versions" USING "btree" ("parent_version_id") WHERE ("parent_version_id" IS NOT NULL);



CREATE INDEX "idx_lens_versions_published_covering" ON "lenses"."versions" USING "btree" ("lens_id", "version_number" DESC) INCLUDE ("id", "published_at") WHERE ("status" = 'published'::"content"."content_status");



CREATE INDEX "idx_lenses_head_version_id" ON "lenses"."lenses" USING "btree" ("head_version_id");



CREATE INDEX "idx_lenses_lenser_id" ON "lenses"."lenses" USING "btree" ("lenser_id");



CREATE INDEX "idx_lenses_lenser_id_created" ON "lenses"."lenses" USING "btree" ("lenser_id", "created_at" DESC) WHERE (("visibility" = 'public'::"content"."visibility_enum") AND ("status" = 'published'::"content"."content_status"));



CREATE INDEX "idx_lenses_parent_lens_id" ON "lenses"."lenses" USING "btree" ("parent_lens_id") WHERE ("parent_lens_id" IS NOT NULL);



CREATE INDEX "idx_lenses_public_created" ON "lenses"."lenses" USING "btree" ("created_at" DESC) WHERE (("visibility" = 'public'::"content"."visibility_enum") AND ("status" = 'published'::"content"."content_status"));



CREATE INDEX "idx_lenses_public_feed" ON "lenses"."lenses" USING "btree" ("visibility", "status", "created_at" DESC) WHERE (("visibility" = 'public'::"content"."visibility_enum") AND ("status" = 'published'::"content"."content_status"));



CREATE INDEX "idx_lenses_tools_category" ON "lenses"."tools" USING "btree" ("category", "sort_order");



CREATE INDEX "idx_lenses_tools_is_system" ON "lenses"."tools" USING "btree" ("is_system") WHERE ("is_system" = true);



CREATE INDEX "idx_lenses_visibility_status" ON "lenses"."lenses" USING "btree" ("visibility", "status");



COMMENT ON INDEX "lenses"."idx_lenses_visibility_status" IS 'Supports discovery queries: list all public published prompts, filter by visibility + status combinations.';



CREATE INDEX "idx_steps_sub_lens_id" ON "lenses"."steps" USING "btree" ("sub_lens_id") WHERE ("step_type" = 'lens'::"text");



CREATE INDEX "idx_tools_id_key" ON "lenses"."tools" USING "btree" ("id", "key");



CREATE INDEX "idx_version_parameters_version_id" ON "lenses"."version_parameters" USING "btree" ("version_id");



CREATE INDEX "idx_version_params_version_tool" ON "lenses"."version_parameters" USING "btree" ("version_id", "tool_id") WHERE ("tool_id" IS NOT NULL);



CREATE INDEX "idx_versions_lens_latest_covering" ON "lenses"."versions" USING "btree" ("lens_id", "version_number" DESC) INCLUDE ("id", "status", "published_at");



CREATE INDEX "idx_vpc_contents_gin" ON "lenses"."version_parameter_contents" USING "gin" ("contents");



CREATE INDEX "idx_vpc_lenser_workspace" ON "lenses"."version_parameter_contents" USING "btree" ("lenser_id", "workspace_id");



CREATE INDEX "idx_vpc_parameter_id" ON "lenses"."version_parameter_contents" USING "btree" ("parameter_id");



CREATE INDEX "idx_vpc_parameter_workspace_lenser" ON "lenses"."version_parameter_contents" USING "btree" ("parameter_id", "workspace_id", "lenser_id");



CREATE INDEX "idx_wf_edges_source" ON "lenses"."workflow_edges" USING "btree" ("source_node_id");



CREATE INDEX "idx_wf_edges_target" ON "lenses"."workflow_edges" USING "btree" ("target_node_id");



CREATE INDEX "idx_wf_edges_workflow" ON "lenses"."workflow_edges" USING "btree" ("workflow_id");



CREATE INDEX "idx_wf_nodes_workflow" ON "lenses"."workflow_nodes" USING "btree" ("workflow_id");



CREATE INDEX "idx_wf_parent_workflow" ON "lenses"."workflows" USING "btree" ("parent_workflow_id") WHERE ("parent_workflow_id" IS NOT NULL);



CREATE INDEX "idx_wf_runs_status_active" ON "lenses"."workflow_runs" USING "btree" ("status") WHERE ("status" = ANY (ARRAY['pending'::"text", 'running'::"text"]));



CREATE INDEX "idx_wf_runs_triggered_by" ON "lenses"."workflow_runs" USING "btree" ("triggered_by");



CREATE INDEX "idx_wf_runs_workflow" ON "lenses"."workflow_runs" USING "btree" ("workflow_id");



CREATE INDEX "idx_wnr_run" ON "lenses"."workflow_node_results" USING "btree" ("run_id");



CREATE INDEX "idx_wnr_run_status" ON "lenses"."workflow_node_results" USING "btree" ("run_id", "status");



CREATE INDEX "idx_workflow_versions_status" ON "lenses"."workflow_versions" USING "btree" ("status");



CREATE INDEX "idx_workflow_versions_workflow" ON "lenses"."workflow_versions" USING "btree" ("workflow_id");



CREATE INDEX "idx_workflows_lenser" ON "lenses"."workflows" USING "btree" ("lenser_id");



CREATE INDEX "idx_workflows_visibility" ON "lenses"."workflows" USING "btree" ("visibility") WHERE ("visibility" = 'public'::"text");



CREATE INDEX "idx_wve_version" ON "lenses"."workflow_version_edges" USING "btree" ("workflow_version_id");



CREATE INDEX "idx_wvn_version" ON "lenses"."workflow_version_nodes" USING "btree" ("workflow_version_id");



CREATE INDEX "idx_attachments_entity" ON "media"."attachments" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_attachments_object" ON "media"."attachments" USING "btree" ("object_id");



CREATE INDEX "idx_fk_attachments_attached_by" ON "media"."attachments" USING "btree" ("attached_by");



CREATE INDEX "idx_fk_objects_created_by" ON "media"."objects" USING "btree" ("created_by");



CREATE UNIQUE INDEX "idx_objects_bucket_key" ON "media"."objects" USING "btree" ("bucket", "object_key") WHERE (("bucket" IS NOT NULL) AND ("object_key" IS NOT NULL));



CREATE INDEX "idx_objects_lifecycle_active" ON "media"."objects" USING "btree" ("lifecycle_state") WHERE ("lifecycle_state" <> 'deleted'::"text");



CREATE INDEX "idx_objects_media_type" ON "media"."objects" USING "btree" ("media_type");



CREATE INDEX "idx_objects_owner" ON "media"."objects" USING "btree" ("owner_lenser_id");



CREATE INDEX "idx_objects_workspace" ON "media"."objects" USING "btree" ("workspace_id");



CREATE INDEX "idx_fk_workspace_members_invited_by" ON "tenancy"."workspace_members" USING "btree" ("invited_by");



CREATE INDEX "idx_workspace_members_lenser" ON "tenancy"."workspace_members" USING "btree" ("lenser_id");



CREATE INDEX "idx_workspaces_org" ON "tenancy"."workspaces" USING "btree" ("org_id") WHERE ("org_id" IS NOT NULL);



CREATE INDEX "idx_workspaces_owner" ON "tenancy"."workspaces" USING "btree" ("owner_lenser_id");



CREATE OR REPLACE VIEW "lenses"."vw_lens_version_history" AS
 SELECT "v"."id",
    "v"."lens_id",
    "v"."version_number",
    "v"."template_body",
    "v"."status",
    "v"."changelog",
    "v"."parent_version_id",
    "v"."published_at",
    "v"."created_at",
    ("count"("vp"."id"))::integer AS "parameter_count"
   FROM ("lenses"."versions" "v"
     LEFT JOIN "lenses"."version_parameters" "vp" ON (("vp"."version_id" = "v"."id")))
  GROUP BY "v"."id";



CREATE OR REPLACE TRIGGER "no_delete_action_logs" BEFORE DELETE ON "agents"."action_logs" FOR EACH ROW EXECUTE FUNCTION "public"."fn_deny_mutation"();



CREATE OR REPLACE TRIGGER "no_update_action_logs" BEFORE UPDATE ON "agents"."action_logs" FOR EACH ROW EXECUTE FUNCTION "public"."fn_deny_mutation"();



CREATE OR REPLACE TRIGGER "trg_model_active_provider_guard" BEFORE INSERT OR UPDATE OF "is_active" ON "ai"."models" FOR EACH ROW EXECUTE FUNCTION "ai"."enforce_active_provider_for_model"();



COMMENT ON TRIGGER "trg_model_active_provider_guard" ON "ai"."models" IS 'Fires before INSERT or UPDATE of is_active on ai.models. Rejects activation of a model whose provider is currently inactive.';



CREATE OR REPLACE TRIGGER "trg_provider_deactivation_cascade" AFTER UPDATE OF "is_active" ON "ai"."providers" FOR EACH ROW EXECUTE FUNCTION "ai"."cascade_provider_deactivation"();



COMMENT ON TRIGGER "trg_provider_deactivation_cascade" ON "ai"."providers" IS 'Fires after UPDATE of is_active on ai.providers. Cascades deactivation to all models of the deactivated provider.';



CREATE OR REPLACE TRIGGER "thread_replies_after_delete" AFTER DELETE ON "content"."thread_replies" FOR EACH ROW EXECUTE FUNCTION "content"."thread_replies_after_delete_trigger"();



CREATE OR REPLACE TRIGGER "thread_replies_after_insert" AFTER INSERT ON "content"."thread_replies" FOR EACH ROW EXECUTE FUNCTION "content"."thread_replies_after_insert_trigger"();



CREATE OR REPLACE TRIGGER "thread_replies_after_update" AFTER UPDATE ON "content"."thread_replies" FOR EACH ROW EXECUTE FUNCTION "content"."thread_replies_after_update_trigger"();



CREATE OR REPLACE TRIGGER "trg_cleanup_thread_content_refs" AFTER DELETE ON "content"."threads" FOR EACH ROW EXECUTE FUNCTION "content"."trg_cleanup_thread_content_refs"();



CREATE OR REPLACE TRIGGER "trg_cleanup_thread_reply_content_refs" AFTER DELETE ON "content"."thread_replies" FOR EACH ROW EXECUTE FUNCTION "content"."trg_cleanup_thread_reply_content_refs"();



CREATE OR REPLACE TRIGGER "trg_content_threads_updated_at" BEFORE UPDATE ON "content"."threads" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_sync_thread_count" AFTER INSERT OR DELETE ON "content"."threads" FOR EACH ROW EXECUTE FUNCTION "content"."sync_thread_count"();



CREATE OR REPLACE TRIGGER "trg_workflow_reaction_totals" AFTER INSERT OR DELETE ON "content"."reactions" FOR EACH ROW EXECUTE FUNCTION "content"."update_workflow_reaction_counters"();



CREATE OR REPLACE TRIGGER "trg_xp_on_workflow_reaction" AFTER INSERT ON "content"."reactions" FOR EACH ROW WHEN (("new"."entity_type" = 'workflow'::"content"."entity_type_enum")) EXECUTE FUNCTION "content"."fn_xp_on_workflow_reaction"();



CREATE OR REPLACE TRIGGER "trg_runs_set_completed_at" BEFORE UPDATE ON "execution"."runs" FOR EACH ROW EXECUTE FUNCTION "execution"."trg_runs_set_completed_at"();



CREATE OR REPLACE TRIGGER "trg_after_lenser_insert" AFTER INSERT ON "lensers"."profiles" FOR EACH ROW EXECUTE FUNCTION "lensers"."trg_create_join_log"();



CREATE OR REPLACE TRIGGER "trg_anonymize_join_log" AFTER DELETE ON "lensers"."profiles" FOR EACH ROW EXECUTE FUNCTION "lensers"."anonymize_join_log"();



CREATE OR REPLACE TRIGGER "trg_audit_group_membership" AFTER INSERT OR DELETE OR UPDATE ON "lensers"."group_members" FOR EACH ROW EXECUTE FUNCTION "lensers"."trg_audit_group_membership"();



CREATE OR REPLACE TRIGGER "trg_create_default_preferences" AFTER INSERT ON "lensers"."profiles" FOR EACH ROW EXECUTE FUNCTION "lensers"."fn_create_default_preferences"();



COMMENT ON TRIGGER "trg_create_default_preferences" ON "lensers"."profiles" IS 'Auto-creates a lensers.preferences row with default values for every new profile.';



CREATE OR REPLACE TRIGGER "trg_enforce_lensers_protections" BEFORE INSERT OR UPDATE ON "lensers"."profiles" FOR EACH ROW EXECUTE FUNCTION "lensers"."enforce_lensers_protections"();



CREATE OR REPLACE TRIGGER "trg_groups_updated_at" BEFORE UPDATE ON "lensers"."groups" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_handle_deletion_request" BEFORE UPDATE ON "lensers"."profiles" FOR EACH ROW EXECUTE FUNCTION "lensers"."trg_handle_deletion_request"();



CREATE OR REPLACE TRIGGER "trg_init_lenser_engagement_row" AFTER INSERT ON "lensers"."profiles" FOR EACH ROW EXECUTE FUNCTION "lensers"."init_lenser_engagement_row"();



CREATE OR REPLACE TRIGGER "trg_log_lenser_join" AFTER INSERT ON "lensers"."profiles" FOR EACH ROW EXECUTE FUNCTION "lensers"."log_lenser_join"();



CREATE OR REPLACE TRIGGER "trg_normalize_website_url" BEFORE INSERT OR UPDATE ON "lensers"."profiles" FOR EACH ROW EXECUTE FUNCTION "content"."normalize_website_url"();



CREATE OR REPLACE TRIGGER "trg_preferences_updated_at" BEFORE UPDATE ON "lensers"."preferences" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



COMMENT ON TRIGGER "trg_preferences_updated_at" ON "lensers"."preferences" IS 'Automatically updates updated_at on every row change.';



CREATE OR REPLACE TRIGGER "trg_prevent_preferences_delete" BEFORE DELETE ON "lensers"."preferences" FOR EACH ROW EXECUTE FUNCTION "lensers"."fn_prevent_preferences_delete"();



COMMENT ON TRIGGER "trg_prevent_preferences_delete" ON "lensers"."preferences" IS 'Enforces the invariant: a lenser must always have a preferences row. Direct DELETE is blocked; only profile cascade delete is permitted.';



CREATE OR REPLACE TRIGGER "trg_prevent_self_relationship" BEFORE INSERT OR UPDATE ON "lensers"."relationships" FOR EACH ROW EXECUTE FUNCTION "lensers"."fn_prevent_self_relationship"();



COMMENT ON TRIGGER "trg_prevent_self_relationship" ON "lensers"."relationships" IS 'Fires before INSERT or UPDATE. Raises 23514 if source = target. Delegates to lensers.fn_prevent_self_relationship(). Added in migration 000056; re-registered cleanly in migration 000058.';



CREATE OR REPLACE TRIGGER "trg_profiles_create_personal_workspace" AFTER INSERT OR UPDATE ON "lensers"."profiles" FOR EACH ROW EXECUTE FUNCTION "tenancy"."fn_create_personal_workspace"();



CREATE OR REPLACE TRIGGER "trg_protect_sensitive_lenser_fields" BEFORE UPDATE ON "lensers"."profiles" FOR EACH ROW EXECUTE FUNCTION "lensers"."protect_sensitive_lenser_fields"();



CREATE OR REPLACE TRIGGER "trg_relationships_sync_counts" AFTER INSERT OR DELETE OR UPDATE ON "lensers"."relationships" FOR EACH ROW EXECUTE FUNCTION "lensers"."fn_sync_relationship_counts"();



CREATE OR REPLACE TRIGGER "trg_sync_profile_from_auth_metadata" BEFORE INSERT ON "lensers"."profiles" FOR EACH ROW EXECUTE FUNCTION "lensers"."sync_profile_from_auth_metadata"();



CREATE OR REPLACE TRIGGER "trg_accumulate_node_cost" AFTER UPDATE ON "lenses"."workflow_node_results" FOR EACH ROW EXECUTE FUNCTION "lenses"."trg_accumulate_node_cost_fn"();



CREATE OR REPLACE TRIGGER "trg_cleanup_lens_content_refs" AFTER DELETE ON "lenses"."lenses" FOR EACH ROW EXECUTE FUNCTION "lenses"."trg_cleanup_lens_content_refs"();



CREATE OR REPLACE TRIGGER "trg_lens_steps_updated_at" BEFORE UPDATE ON "lenses"."steps" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_lenses_tools_updated_at" BEFORE UPDATE ON "lenses"."tools" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_lenses_updated_at" BEFORE UPDATE ON "lenses"."lenses" FOR EACH ROW EXECUTE FUNCTION "content"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_prevent_published_version_update" BEFORE UPDATE ON "lenses"."versions" FOR EACH ROW EXECUTE FUNCTION "lenses"."fn_prevent_published_version_update"();



CREATE OR REPLACE TRIGGER "trg_steps_lens_id_sync" BEFORE INSERT OR UPDATE ON "lenses"."steps" FOR EACH ROW EXECUTE FUNCTION "lenses"."trg_steps_sync_lens_id"();



CREATE OR REPLACE TRIGGER "trg_sync_lens_count" AFTER INSERT OR DELETE ON "lenses"."lenses" FOR EACH ROW EXECUTE FUNCTION "content"."sync_lens_count"();



CREATE OR REPLACE TRIGGER "trg_vpc_updated_at" BEFORE UPDATE ON "lenses"."version_parameter_contents" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_workflow_edges_acyclic" AFTER INSERT OR UPDATE ON "lenses"."workflow_edges" FOR EACH ROW EXECUTE FUNCTION "lenses"."trg_workflow_edges_acyclic_fn"();



CREATE OR REPLACE TRIGGER "trg_workflow_version_immutable" BEFORE UPDATE ON "lenses"."workflow_versions" FOR EACH ROW EXECUTE FUNCTION "lenses"."trg_workflow_version_immutable_fn"();



CREATE OR REPLACE TRIGGER "trg_workflows_updated_at" BEFORE UPDATE ON "lenses"."workflows" FOR EACH ROW EXECUTE FUNCTION "lenses"."fn_touch_workflow_updated_at"();



ALTER TABLE "lenses"."lenses" DISABLE TRIGGER "trg_xp_lens_visibility_changed";



ALTER TABLE "lenses"."workflows" DISABLE TRIGGER "trg_xp_workflow_created";



ALTER TABLE "lenses"."workflows" DISABLE TRIGGER "trg_xp_workflow_visibility_changed";



CREATE OR REPLACE TRIGGER "trg_objects_set_updated_at" BEFORE UPDATE ON "media"."objects" FOR EACH ROW EXECUTE FUNCTION "media"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_workspaces_guard_personal" BEFORE DELETE ON "tenancy"."workspaces" FOR EACH ROW EXECUTE FUNCTION "tenancy"."fn_guard_personal_workspace"();



CREATE OR REPLACE TRIGGER "trg_workspaces_guard_personal_status" BEFORE UPDATE ON "tenancy"."workspaces" FOR EACH ROW EXECUTE FUNCTION "tenancy"."fn_guard_personal_workspace_status"();



CREATE OR REPLACE TRIGGER "trg_workspaces_set_updated_at" BEFORE UPDATE ON "tenancy"."workspaces" FOR EACH ROW EXECUTE FUNCTION "tenancy"."set_updated_at"();



ALTER TABLE ONLY "agents"."action_logs"
    ADD CONSTRAINT "action_logs_ai_lenser_id_fkey" FOREIGN KEY ("ai_lenser_id") REFERENCES "agents"."ai_lensers"("id");



ALTER TABLE ONLY "agents"."ai_lensers"
    ADD CONSTRAINT "ai_lensers_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "agents"."lens_bindings"
    ADD CONSTRAINT "lens_bindings_ai_lenser_id_fkey" FOREIGN KEY ("ai_lenser_id") REFERENCES "agents"."ai_lensers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "agents"."lens_bindings"
    ADD CONSTRAINT "lens_bindings_lens_id_fkey" FOREIGN KEY ("lens_id") REFERENCES "lenses"."lenses"("id");



ALTER TABLE ONLY "agents"."lens_bindings"
    ADD CONSTRAINT "lens_bindings_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "lenses"."versions"("id");



ALTER TABLE ONLY "agents"."model_bindings"
    ADD CONSTRAINT "model_bindings_ai_lenser_id_fkey" FOREIGN KEY ("ai_lenser_id") REFERENCES "agents"."ai_lensers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "agents"."model_bindings"
    ADD CONSTRAINT "model_bindings_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "ai"."models"("id");



ALTER TABLE ONLY "agents"."ownerships"
    ADD CONSTRAINT "ownerships_ai_lenser_id_fkey" FOREIGN KEY ("ai_lenser_id") REFERENCES "agents"."ai_lensers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "agents"."ownerships"
    ADD CONSTRAINT "ownerships_owner_lenser_id_fkey" FOREIGN KEY ("owner_lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "agents"."policies"
    ADD CONSTRAINT "policies_ai_lenser_id_fkey" FOREIGN KEY ("ai_lenser_id") REFERENCES "agents"."ai_lensers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "agents"."quota_snapshots"
    ADD CONSTRAINT "quota_snapshots_ai_lenser_id_fkey" FOREIGN KEY ("ai_lenser_id") REFERENCES "agents"."ai_lensers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "ai"."key_usage_log"
    ADD CONSTRAINT "key_usage_log_key_id_fkey" FOREIGN KEY ("key_id") REFERENCES "ai"."keys"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "ai"."key_usage_log"
    ADD CONSTRAINT "key_usage_log_lenser_id_fkey" FOREIGN KEY ("lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "ai"."key_usage_log"
    ADD CONSTRAINT "key_usage_log_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "execution"."runs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "ai"."key_usage_log"
    ADD CONSTRAINT "key_usage_log_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "tenancy"."workspaces"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "ai"."keys"
    ADD CONSTRAINT "keys_lenser_fkey" FOREIGN KEY ("lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "ai"."keys"
    ADD CONSTRAINT "keys_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "ai"."providers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "ai"."model_pricing"
    ADD CONSTRAINT "model_pricing_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "ai"."models"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "ai"."models"
    ADD CONSTRAINT "models_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "ai"."providers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "content"."reports"
    ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "content"."tag_map"
    ADD CONSTRAINT "tag_map_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "content"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "content"."tag_suggestions"
    ADD CONSTRAINT "tag_suggestions_ai_model_id_fkey" FOREIGN KEY ("ai_model_id") REFERENCES "ai"."models"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "content"."tag_suggestions"
    ADD CONSTRAINT "tag_suggestions_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "content"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "content"."tag_translations"
    ADD CONSTRAINT "tag_translations_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "content"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "content"."thread_replies"
    ADD CONSTRAINT "thread_replies_lenser_id_fkey" FOREIGN KEY ("lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "content"."thread_replies"
    ADD CONSTRAINT "thread_replies_parent_reply_id_fkey" FOREIGN KEY ("parent_reply_id") REFERENCES "content"."thread_replies"("id");



ALTER TABLE ONLY "content"."thread_replies"
    ADD CONSTRAINT "thread_replies_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "content"."threads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "content"."threads"
    ADD CONSTRAINT "threads_lenser_fkey" FOREIGN KEY ("lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "content"."threads"
    ADD CONSTRAINT "threads_linked_lens_id_fkey" FOREIGN KEY ("linked_lens_id") REFERENCES "lenses"."lenses"("id") ON DELETE SET NULL NOT VALID;



ALTER TABLE ONLY "execution"."artifact_medias"
    ADD CONSTRAINT "artifact_medias_artifact_fkey" FOREIGN KEY ("artifact_id") REFERENCES "execution"."artifacts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "execution"."artifact_medias"
    ADD CONSTRAINT "artifact_medias_media_fkey" FOREIGN KEY ("media_id") REFERENCES "media"."objects"("id");



ALTER TABLE ONLY "execution"."artifacts"
    ADD CONSTRAINT "artifacts_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "execution"."runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "execution"."execution_tags"
    ADD CONSTRAINT "execution_tags_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "execution"."runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "execution"."parameter_usage_logs"
    ADD CONSTRAINT "parameter_usage_logs_ai_model_id_fkey" FOREIGN KEY ("ai_model_id") REFERENCES "ai"."models"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "execution"."parameter_usage_logs"
    ADD CONSTRAINT "parameter_usage_logs_lenser_id_fkey" FOREIGN KEY ("lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "execution"."parameter_usage_logs"
    ADD CONSTRAINT "parameter_usage_logs_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "execution"."requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "execution"."parameter_usage_logs"
    ADD CONSTRAINT "parameter_usage_logs_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "lenses"."versions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "execution"."parameter_usage_logs"
    ADD CONSTRAINT "parameter_usage_logs_version_parameter_id_fkey" FOREIGN KEY ("version_parameter_id") REFERENCES "lenses"."version_parameters"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "execution"."parameter_usage_logs"
    ADD CONSTRAINT "parameter_usage_logs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "tenancy"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "execution"."request_attachments"
    ADD CONSTRAINT "request_attachments_media_object_id_fkey" FOREIGN KEY ("media_object_id") REFERENCES "media"."objects"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "execution"."request_attachments"
    ADD CONSTRAINT "request_attachments_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "execution"."requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "execution"."requests"
    ADD CONSTRAINT "requests_byok_key_ref_fkey" FOREIGN KEY ("byok_key_ref_id") REFERENCES "ai"."keys"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "execution"."requests"
    ADD CONSTRAINT "requests_lens_id_fkey" FOREIGN KEY ("lens_id") REFERENCES "lenses"."lenses"("id") ON DELETE SET NULL NOT VALID;



ALTER TABLE ONLY "execution"."requests"
    ADD CONSTRAINT "requests_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "ai"."models"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "execution"."requests"
    ADD CONSTRAINT "requests_origin_type_fkey" FOREIGN KEY ("origin_type") REFERENCES "execution"."origin_types"("key");



ALTER TABLE ONLY "execution"."requests"
    ADD CONSTRAINT "requests_requester_lenser_id_fkey" FOREIGN KEY ("requester_lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "execution"."requests"
    ADD CONSTRAINT "requests_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "lenses"."versions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "execution"."requests"
    ADD CONSTRAINT "requests_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "tenancy"."workspaces"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "execution"."runs"
    ADD CONSTRAINT "runs_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "ai"."models"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "execution"."runs"
    ADD CONSTRAINT "runs_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "execution"."requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "execution"."steps"
    ADD CONSTRAINT "steps_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "execution"."runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "execution"."steps"
    ADD CONSTRAINT "steps_step_definition_id_fkey" FOREIGN KEY ("step_definition_id") REFERENCES "lenses"."steps"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "execution"."stream_sessions"
    ADD CONSTRAINT "stream_sessions_model_key_fkey" FOREIGN KEY ("model_key") REFERENCES "ai"."models"("key") ON DELETE SET NULL NOT VALID;



ALTER TABLE ONLY "execution"."stream_sessions"
    ADD CONSTRAINT "stream_sessions_provider_fkey" FOREIGN KEY ("provider") REFERENCES "ai"."providers"("key") ON DELETE SET NULL;



ALTER TABLE ONLY "execution"."stream_sessions"
    ADD CONSTRAINT "stream_sessions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "tenancy"."workspaces"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "lensers"."group_members"
    ADD CONSTRAINT "group_members_group_fkey" FOREIGN KEY ("group_id") REFERENCES "lensers"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "lensers"."group_members"
    ADD CONSTRAINT "group_members_lenser_fkey" FOREIGN KEY ("lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "lensers"."groups"
    ADD CONSTRAINT "groups_owner_fkey" FOREIGN KEY ("owner_lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "lensers"."badges"
    ADD CONSTRAINT "lenser_badges_lenser_id_fkey" FOREIGN KEY ("lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "lensers"."social_links"
    ADD CONSTRAINT "lenser_social_links_lenser_id_fkey" FOREIGN KEY ("lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "lensers"."profiles"
    ADD CONSTRAINT "lensers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "lensers"."preferences"
    ADD CONSTRAINT "preferences_active_lenser_id_fkey" FOREIGN KEY ("active_lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "lensers"."preferences"
    ADD CONSTRAINT "preferences_ai_model_key_fk" FOREIGN KEY ("ai_model_key") REFERENCES "ai"."models"("key") ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE;



COMMENT ON CONSTRAINT "preferences_ai_model_key_fk" ON "lensers"."preferences" IS 'Preferred AI model must exist in ai.models. NULL = no preferred model. ON DELETE SET NULL when model is removed.';



ALTER TABLE ONLY "lensers"."preferences"
    ADD CONSTRAINT "preferences_ai_provider_key_fk" FOREIGN KEY ("ai_provider_key") REFERENCES "ai"."providers"("key") ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE;



COMMENT ON CONSTRAINT "preferences_ai_provider_key_fk" ON "lensers"."preferences" IS 'Preferred AI provider must exist in ai.providers. NULL = no preferred provider. ON DELETE SET NULL when provider is removed.';



ALTER TABLE ONLY "lensers"."preferences"
    ADD CONSTRAINT "preferences_lenser_id_fkey" FOREIGN KEY ("lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "lensers"."preferences"
    ADD CONSTRAINT "preferences_selected_api_key_id_fkey" FOREIGN KEY ("selected_api_key_id") REFERENCES "ai"."keys"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "lensers"."profiles"
    ADD CONSTRAINT "profiles_ai_model_id_fkey" FOREIGN KEY ("ai_model_id") REFERENCES "ai"."models"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "lensers"."relationships"
    ADD CONSTRAINT "relationships_source_profile_id_fkey" FOREIGN KEY ("source_profile_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "lensers"."relationships"
    ADD CONSTRAINT "relationships_target_profile_id_fkey" FOREIGN KEY ("target_profile_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "lensers"."tag_follows"
    ADD CONSTRAINT "tag_follows_lenser_id_fkey" FOREIGN KEY ("lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "lensers"."tag_follows"
    ADD CONSTRAINT "tag_follows_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "content"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "lenses"."workflow_edges"
    ADD CONSTRAINT "fk_wf_edges_source" FOREIGN KEY ("source_node_id") REFERENCES "lenses"."workflow_nodes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "lenses"."workflow_edges"
    ADD CONSTRAINT "fk_wf_edges_target" FOREIGN KEY ("target_node_id") REFERENCES "lenses"."workflow_nodes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "lenses"."workflow_edges"
    ADD CONSTRAINT "fk_wf_edges_workflow" FOREIGN KEY ("workflow_id") REFERENCES "lenses"."workflows"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "lenses"."workflow_nodes"
    ADD CONSTRAINT "fk_wf_nodes_lens" FOREIGN KEY ("lens_id") REFERENCES "lenses"."lenses"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "lenses"."workflow_nodes"
    ADD CONSTRAINT "fk_wf_nodes_version" FOREIGN KEY ("version_id") REFERENCES "lenses"."versions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "lenses"."workflow_nodes"
    ADD CONSTRAINT "fk_wf_nodes_workflow" FOREIGN KEY ("workflow_id") REFERENCES "lenses"."workflows"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "lenses"."workflow_runs"
    ADD CONSTRAINT "fk_wf_runs_lenser" FOREIGN KEY ("triggered_by") REFERENCES "lensers"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "lenses"."workflow_runs"
    ADD CONSTRAINT "fk_wf_runs_workflow" FOREIGN KEY ("workflow_id") REFERENCES "lenses"."workflows"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "lenses"."workflow_node_results"
    ADD CONSTRAINT "fk_wnr_execution_run" FOREIGN KEY ("execution_run_id") REFERENCES "execution"."runs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "lenses"."workflow_node_results"
    ADD CONSTRAINT "fk_wnr_node" FOREIGN KEY ("node_id") REFERENCES "lenses"."workflow_nodes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "lenses"."workflow_node_results"
    ADD CONSTRAINT "fk_wnr_run" FOREIGN KEY ("run_id") REFERENCES "lenses"."workflow_runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "lenses"."workflows"
    ADD CONSTRAINT "fk_workflows_lenser" FOREIGN KEY ("lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "lenses"."steps"
    ADD CONSTRAINT "lens_steps_lens_id_fkey" FOREIGN KEY ("lens_id") REFERENCES "lenses"."lenses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "lenses"."steps"
    ADD CONSTRAINT "lens_steps_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "ai"."models"("id");



ALTER TABLE ONLY "lenses"."steps"
    ADD CONSTRAINT "lens_steps_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "lenses"."versions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "lenses"."version_parameters"
    ADD CONSTRAINT "lens_version_params_version_fkey" FOREIGN KEY ("version_id") REFERENCES "lenses"."versions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "lenses"."versions"
    ADD CONSTRAINT "lens_versions_lens_fkey" FOREIGN KEY ("lens_id") REFERENCES "lenses"."lenses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "lenses"."versions"
    ADD CONSTRAINT "lens_versions_parent_fkey" FOREIGN KEY ("parent_version_id") REFERENCES "lenses"."versions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "lenses"."lenses"
    ADD CONSTRAINT "lenses_forked_from_execution_id_fkey" FOREIGN KEY ("forked_from_execution_id") REFERENCES "execution"."runs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "lenses"."lenses"
    ADD CONSTRAINT "lenses_forked_from_version_id_fkey" FOREIGN KEY ("forked_from_version_id") REFERENCES "lenses"."versions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "lenses"."lenses"
    ADD CONSTRAINT "lenses_head_version_id_fkey" FOREIGN KEY ("head_version_id") REFERENCES "lenses"."versions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "lenses"."lenses"
    ADD CONSTRAINT "lenses_lenser_fkey" FOREIGN KEY ("lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "lenses"."lenses"
    ADD CONSTRAINT "lenses_parent_lens_id_fkey" FOREIGN KEY ("parent_lens_id") REFERENCES "lenses"."lenses"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "lenses"."steps"
    ADD CONSTRAINT "steps_sub_lens_id_fkey" FOREIGN KEY ("sub_lens_id") REFERENCES "lenses"."lenses"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "lenses"."version_parameter_contents"
    ADD CONSTRAINT "version_parameter_contents_lenser_id_fkey" FOREIGN KEY ("lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "lenses"."version_parameter_contents"
    ADD CONSTRAINT "version_parameter_contents_parameter_id_fkey" FOREIGN KEY ("parameter_id") REFERENCES "lenses"."version_parameters"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "lenses"."version_parameter_contents"
    ADD CONSTRAINT "version_parameter_contents_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "tenancy"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "lenses"."version_parameters"
    ADD CONSTRAINT "version_parameters_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "lenses"."tools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "lenses"."workflow_schedules"
    ADD CONSTRAINT "workflow_schedules_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "lenses"."workflows"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "lenses"."workflow_versions"
    ADD CONSTRAINT "workflow_versions_fk_created_by" FOREIGN KEY ("created_by") REFERENCES "lensers"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "lenses"."workflow_versions"
    ADD CONSTRAINT "workflow_versions_fk_workflow" FOREIGN KEY ("workflow_id") REFERENCES "lenses"."workflows"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "lenses"."workflows"
    ADD CONSTRAINT "workflows_fk_head_version" FOREIGN KEY ("head_version_id") REFERENCES "lenses"."workflow_versions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "lenses"."workflows"
    ADD CONSTRAINT "workflows_parent_workflow_id_fkey" FOREIGN KEY ("parent_workflow_id") REFERENCES "lenses"."workflows"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "lenses"."workflow_version_edges"
    ADD CONSTRAINT "wve_fk_source" FOREIGN KEY ("source_node_id") REFERENCES "lenses"."workflow_version_nodes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "lenses"."workflow_version_edges"
    ADD CONSTRAINT "wve_fk_target" FOREIGN KEY ("target_node_id") REFERENCES "lenses"."workflow_version_nodes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "lenses"."workflow_version_edges"
    ADD CONSTRAINT "wve_fk_version" FOREIGN KEY ("workflow_version_id") REFERENCES "lenses"."workflow_versions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "lenses"."workflow_version_nodes"
    ADD CONSTRAINT "wvn_fk_lens" FOREIGN KEY ("lens_id") REFERENCES "lenses"."lenses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "lenses"."workflow_version_nodes"
    ADD CONSTRAINT "wvn_fk_lens_version" FOREIGN KEY ("version_id") REFERENCES "lenses"."versions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "lenses"."workflow_version_nodes"
    ADD CONSTRAINT "wvn_fk_version" FOREIGN KEY ("workflow_version_id") REFERENCES "lenses"."workflow_versions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "media"."attachments"
    ADD CONSTRAINT "attachments_attached_by_fkey" FOREIGN KEY ("attached_by") REFERENCES "lensers"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "media"."attachments"
    ADD CONSTRAINT "attachments_object_fkey" FOREIGN KEY ("object_id") REFERENCES "media"."objects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "media"."objects"
    ADD CONSTRAINT "objects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "lensers"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "media"."objects"
    ADD CONSTRAINT "objects_owner_fkey" FOREIGN KEY ("owner_lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "media"."objects"
    ADD CONSTRAINT "objects_workspace_fkey" FOREIGN KEY ("workspace_id") REFERENCES "tenancy"."workspaces"("id");



ALTER TABLE ONLY "tenancy"."workspace_members"
    ADD CONSTRAINT "workspace_members_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "lensers"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "tenancy"."workspace_members"
    ADD CONSTRAINT "workspace_members_lenser_fkey" FOREIGN KEY ("lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "tenancy"."workspace_members"
    ADD CONSTRAINT "workspace_members_workspace_fkey" FOREIGN KEY ("workspace_id") REFERENCES "tenancy"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "tenancy"."workspaces"
    ADD CONSTRAINT "workspaces_owner_fkey" FOREIGN KEY ("owner_lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE "agents"."action_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "action_logs_owner_read" ON "agents"."action_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "agents"."ownerships" "o"
  WHERE (("o"."ai_lenser_id" = "action_logs"."ai_lenser_id") AND ("o"."owner_lenser_id" = "lensers"."get_auth_lenser_id"()) AND ("o"."revoked_at" IS NULL)))));



CREATE POLICY "action_logs_service_insert" ON "agents"."action_logs" FOR INSERT TO "service_role" WITH CHECK (true);



ALTER TABLE "agents"."ai_lensers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ai_lensers_public_read" ON "agents"."ai_lensers" FOR SELECT USING ((("is_active" = true) AND ("suspended_at" IS NULL)));



CREATE POLICY "ai_lensers_service_write" ON "agents"."ai_lensers" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "agents"."lens_bindings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lens_bindings_public_read" ON "agents"."lens_bindings" FOR SELECT USING (true);



CREATE POLICY "lens_bindings_service_write" ON "agents"."lens_bindings" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "agents"."model_bindings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "model_bindings_public_read" ON "agents"."model_bindings" FOR SELECT USING (true);



CREATE POLICY "model_bindings_service_write" ON "agents"."model_bindings" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "agents"."ownerships" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ownerships_read_own" ON "agents"."ownerships" FOR SELECT USING (("owner_lenser_id" = "lensers"."get_auth_lenser_id"()));



CREATE POLICY "ownerships_service_write" ON "agents"."ownerships" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "agents"."policies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "policies_public_read" ON "agents"."policies" FOR SELECT USING (("is_public_policy" = true));



CREATE POLICY "policies_service_write" ON "agents"."policies" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "agents"."quota_snapshots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quota_snapshots_owner_read" ON "agents"."quota_snapshots" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "agents"."ownerships" "o"
  WHERE (("o"."ai_lenser_id" = "quota_snapshots"."ai_lenser_id") AND ("o"."owner_lenser_id" = "lensers"."get_auth_lenser_id"()) AND ("o"."revoked_at" IS NULL)))));



CREATE POLICY "quota_snapshots_service_write" ON "agents"."quota_snapshots" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "ai_models_delete_admin_only" ON "ai"."models" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "ai_models_insert_admin_only" ON "ai"."models" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "ai_models_select" ON "ai"."models" FOR SELECT USING ((("is_active" = true) OR "public"."is_admin"()));



CREATE POLICY "ai_models_update_admin_only" ON "ai"."models" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "ai_providers_select" ON "ai"."providers" FOR SELECT USING ((("is_active" = true) OR "public"."is_admin"()));



ALTER TABLE "ai"."key_usage_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "key_usage_log_select_own" ON "ai"."key_usage_log" FOR SELECT TO "authenticated" USING (("lenser_id" = "lensers"."get_auth_lenser_id"()));



CREATE POLICY "key_usage_log_service_all" ON "ai"."key_usage_log" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "ai"."keys" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "keys_select_own_fallback" ON "ai"."keys" FOR SELECT TO "authenticated" USING (("lenser_id" = "lensers"."get_auth_lenser_id"()));



ALTER TABLE "ai"."model_pricing" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "model_pricing_select_active" ON "ai"."model_pricing" FOR SELECT TO "authenticated", "anon" USING (("effective_to" IS NULL));



CREATE POLICY "model_pricing_service_all" ON "ai"."model_pricing" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "ai"."models" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "ai"."providers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "providers_service_all" ON "ai"."providers" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all" ON "ai"."keys" TO "service_role" USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "Public can read tag maps" ON "content"."tag_map" FOR SELECT USING (true);



CREATE POLICY "Public can read tag translations" ON "content"."tag_translations" FOR SELECT USING (true);



ALTER TABLE "content"."entity_translations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "entity_translations_delete_author" ON "content"."entity_translations" FOR DELETE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "lenses"."lenses" "pt"
  WHERE (("pt"."id" = "entity_translations"."entity_id") AND ("pt"."lenser_id" = "lensers"."get_auth_lenser_id"()) AND ("entity_translations"."entity_type" = 'lens'::"content"."entity_type_enum")))) OR (EXISTS ( SELECT 1
   FROM "content"."threads" "t"
  WHERE (("t"."id" = "entity_translations"."entity_id") AND ("t"."lenser_id" = "lensers"."get_auth_lenser_id"()) AND ("entity_translations"."entity_type" = 'thread'::"content"."entity_type_enum"))))));



CREATE POLICY "entity_translations_insert_author" ON "content"."entity_translations" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "lenses"."lenses" "pt"
  WHERE (("pt"."id" = "entity_translations"."entity_id") AND ("pt"."lenser_id" = "lensers"."get_auth_lenser_id"()) AND ("entity_translations"."entity_type" = 'lens'::"content"."entity_type_enum")))) OR (EXISTS ( SELECT 1
   FROM "content"."threads" "t"
  WHERE (("t"."id" = "entity_translations"."entity_id") AND ("t"."lenser_id" = "lensers"."get_auth_lenser_id"()) AND ("entity_translations"."entity_type" = 'thread'::"content"."entity_type_enum"))))));



CREATE POLICY "entity_translations_select_public" ON "content"."entity_translations" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "entity_translations_service_all" ON "content"."entity_translations" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "entity_translations_update_author" ON "content"."entity_translations" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "lenses"."lenses" "pt"
  WHERE (("pt"."id" = "entity_translations"."entity_id") AND ("pt"."lenser_id" = "lensers"."get_auth_lenser_id"()) AND ("entity_translations"."entity_type" = 'lens'::"content"."entity_type_enum")))) OR (EXISTS ( SELECT 1
   FROM "content"."threads" "t"
  WHERE (("t"."id" = "entity_translations"."entity_id") AND ("t"."lenser_id" = "lensers"."get_auth_lenser_id"()) AND ("entity_translations"."entity_type" = 'thread'::"content"."entity_type_enum"))))));



CREATE POLICY "lensers_can_insert_tags" ON "content"."tags" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IN ( SELECT "profiles"."user_id"
   FROM "lensers"."profiles")));



CREATE POLICY "no_delete_tags" ON "content"."tags" FOR DELETE USING (false);



CREATE POLICY "no_update_tags" ON "content"."tags" FOR UPDATE USING (false) WITH CHECK (false);



CREATE POLICY "public_can_read_public_tags" ON "content"."tags" FOR SELECT USING (("visibility" = 'public'::"content"."tag_visibility_enum"));



ALTER TABLE "content"."reactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reactions_delete_own" ON "content"."reactions" FOR DELETE TO "authenticated" USING (("lenser_id" = "lensers"."get_auth_lenser_id"()));



CREATE POLICY "reactions_insert_own" ON "content"."reactions" FOR INSERT TO "authenticated" WITH CHECK (("lenser_id" = "lensers"."get_auth_lenser_id"()));



CREATE POLICY "reactions_select_public" ON "content"."reactions" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "reactions_service_all" ON "content"."reactions" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "content"."reports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reports_delete_own" ON "content"."reports" FOR DELETE USING (("reporter_id" = ( SELECT "profiles"."id"
   FROM "lensers"."profiles"
  WHERE ("profiles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
 LIMIT 1)));



CREATE POLICY "reports_insert_self" ON "content"."reports" FOR INSERT WITH CHECK (("reporter_id" = ( SELECT "profiles"."id"
   FROM "lensers"."profiles"
  WHERE ("profiles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
 LIMIT 1)));



CREATE POLICY "reports_select_own" ON "content"."reports" FOR SELECT USING (("reporter_id" = ( SELECT "profiles"."id"
   FROM "lensers"."profiles"
  WHERE ("profiles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
 LIMIT 1)));



CREATE POLICY "service_role_full_access_tags" ON "content"."tags" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "content"."tag_map" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tag_map_author_delete" ON "content"."tag_map" FOR DELETE TO "authenticated" USING (((("entity_type" = 'lens'::"content"."entity_type_enum") AND (EXISTS ( SELECT 1
   FROM "lenses"."lenses" "p"
  WHERE (("p"."id" = "tag_map"."entity_id") AND ("p"."lenser_id" = "lensers"."get_auth_lenser_id"()))))) OR (("entity_type" = 'thread'::"content"."entity_type_enum") AND (EXISTS ( SELECT 1
   FROM "content"."threads" "t"
  WHERE (("t"."id" = "tag_map"."entity_id") AND ("t"."lenser_id" = "lensers"."get_auth_lenser_id"())))))));



CREATE POLICY "tag_map_author_manage" ON "content"."tag_map" FOR INSERT TO "authenticated" WITH CHECK (((("entity_type" = 'lens'::"content"."entity_type_enum") AND (EXISTS ( SELECT 1
   FROM "lenses"."lenses" "p"
  WHERE (("p"."id" = "tag_map"."entity_id") AND ("p"."lenser_id" = "lensers"."get_auth_lenser_id"()))))) OR (("entity_type" = 'thread'::"content"."entity_type_enum") AND (EXISTS ( SELECT 1
   FROM "content"."threads" "t"
  WHERE (("t"."id" = "tag_map"."entity_id") AND ("t"."lenser_id" = "lensers"."get_auth_lenser_id"())))))));



ALTER TABLE "content"."tag_suggestions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tag_suggestions_service_all" ON "content"."tag_suggestions" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "content"."tag_translations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tag_translations_service_delete" ON "content"."tag_translations" FOR DELETE USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "tag_translations_service_update" ON "content"."tag_translations" FOR UPDATE USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text")) WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "tag_translations_service_write" ON "content"."tag_translations" FOR INSERT WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



ALTER TABLE "content"."tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "content"."thread_replies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "thread_replies_owner_delete" ON "content"."thread_replies" FOR DELETE USING (("lensers"."is_active_lenser"(( SELECT "auth"."uid"() AS "uid")) AND ("lenser_id" = "lensers"."current_active_lenser_id"())));



CREATE POLICY "thread_replies_owner_insert" ON "content"."thread_replies" FOR INSERT WITH CHECK (("lensers"."is_active_lenser"(( SELECT "auth"."uid"() AS "uid")) AND ("lenser_id" = "lensers"."current_active_lenser_id"())));



CREATE POLICY "thread_replies_owner_update" ON "content"."thread_replies" FOR UPDATE USING (("lensers"."is_active_lenser"(( SELECT "auth"."uid"() AS "uid")) AND ("lenser_id" = "lensers"."current_active_lenser_id"()))) WITH CHECK (("lensers"."is_active_lenser"(( SELECT "auth"."uid"() AS "uid")) AND ("lenser_id" = "lensers"."current_active_lenser_id"())));



CREATE POLICY "thread_replies_select" ON "content"."thread_replies" FOR SELECT USING ((((EXISTS ( SELECT 1
   FROM "content"."threads" "t"
  WHERE (("t"."id" = "thread_replies"."thread_id") AND ("t"."visibility" = ANY (ARRAY['public'::"content"."visibility_enum", 'community'::"content"."visibility_enum"])) AND ("t"."status" = 'published'::"content"."content_status")))) AND ("status" = 'published'::"content"."thread_reply_status") AND ("deleted_at" IS NULL)) OR ("lensers"."is_active_lenser"(( SELECT "auth"."uid"() AS "uid")) AND ("lenser_id" = "lensers"."current_active_lenser_id"())) OR (EXISTS ( SELECT 1
   FROM "content"."threads" "t"
  WHERE (("t"."id" = "thread_replies"."thread_id") AND ("t"."lenser_id" = "lensers"."get_auth_lenser_id"()))))));



CREATE POLICY "thread_replies_service_role_all" ON "content"."thread_replies" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "content"."threads" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "threads_owner_delete" ON "content"."threads" FOR DELETE USING (("lensers"."is_active_lenser"(( SELECT "auth"."uid"() AS "uid")) AND ("lenser_id" = "lensers"."current_active_lenser_id"())));



CREATE POLICY "threads_owner_insert" ON "content"."threads" FOR INSERT WITH CHECK (("lensers"."is_active_lenser"(( SELECT "auth"."uid"() AS "uid")) AND ("lenser_id" = "lensers"."current_active_lenser_id"())));



CREATE POLICY "threads_owner_update" ON "content"."threads" FOR UPDATE USING (("lensers"."is_active_lenser"(( SELECT "auth"."uid"() AS "uid")) AND ("lenser_id" = "lensers"."current_active_lenser_id"()))) WITH CHECK (("lensers"."is_active_lenser"(( SELECT "auth"."uid"() AS "uid")) AND ("lenser_id" = "lensers"."current_active_lenser_id"())));



CREATE POLICY "threads_select" ON "content"."threads" FOR SELECT USING (((("visibility" = ANY (ARRAY['public'::"content"."visibility_enum", 'community'::"content"."visibility_enum"])) AND ("status" = 'published'::"content"."content_status") AND (EXISTS ( SELECT 1
   FROM "lensers"."profiles" "p"
  WHERE (("p"."id" = "threads"."lenser_id") AND ("p"."status" = 'active'::"lensers"."lenser_status"))))) OR ("lensers"."is_active_lenser"(( SELECT "auth"."uid"() AS "uid")) AND ("lenser_id" = "lensers"."current_active_lenser_id"()))));



CREATE POLICY "threads_service_role_all" ON "content"."threads" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "execution"."artifact_medias" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "artifact_medias_service_all" ON "execution"."artifact_medias" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "execution"."artifacts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "artifacts_select" ON "execution"."artifacts" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM ("execution"."runs" "ru"
     JOIN "execution"."requests" "rq" ON (("rq"."id" = "ru"."request_id")))
  WHERE (("ru"."id" = "artifacts"."run_id") AND ("rq"."requester_lenser_id" = "lensers"."get_auth_lenser_id"())))) OR (("visibility" = 'public'::"text") AND ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) OR (EXISTS ( SELECT 1
   FROM "execution"."runs" "r"
  WHERE (("r"."id" = "artifacts"."run_id") AND ("r"."status" = 'succeeded'::"text"))))))));



CREATE POLICY "artifacts_service_all" ON "execution"."artifacts" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "artifacts_service_role_all" ON "execution"."artifacts" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "execution"."execution_tags" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "execution_tags_service_all" ON "execution"."execution_tags" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "lenser reads own parameter usage logs" ON "execution"."parameter_usage_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "execution"."requests" "r"
  WHERE (("r"."id" = "parameter_usage_logs"."request_id") AND ("r"."requester_lenser_id" = "lensers"."get_auth_lenser_id"())))));



ALTER TABLE "execution"."origin_types" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "origin_types_read_active" ON "execution"."origin_types" FOR SELECT TO "authenticated", "anon" USING (("is_active" = true));



CREATE POLICY "origin_types_service_all" ON "execution"."origin_types" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "execution"."parameter_usage_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "execution"."request_attachments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "request_attachments_own" ON "execution"."request_attachments" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "execution"."requests" "req"
  WHERE (("req"."id" = "request_attachments"."request_id") AND ("req"."requester_lenser_id" = "lensers"."get_auth_lenser_id"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "execution"."requests" "req"
  WHERE (("req"."id" = "request_attachments"."request_id") AND ("req"."requester_lenser_id" = "lensers"."get_auth_lenser_id"())))));



CREATE POLICY "request_attachments_service_role" ON "execution"."request_attachments" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "execution"."requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "requests_insert_own" ON "execution"."requests" FOR INSERT TO "authenticated" WITH CHECK (("requester_lenser_id" = "lensers"."get_auth_lenser_id"()));



CREATE POLICY "requests_select_own" ON "execution"."requests" FOR SELECT TO "authenticated" USING (("requester_lenser_id" = "lensers"."get_auth_lenser_id"()));



CREATE POLICY "requests_service_all" ON "execution"."requests" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "execution"."runs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "runs_select_own" ON "execution"."runs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "execution"."requests" "r"
  WHERE (("r"."id" = "runs"."request_id") AND ("r"."requester_lenser_id" = "lensers"."get_auth_lenser_id"())))));



CREATE POLICY "runs_service_all" ON "execution"."runs" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "execution"."steps" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "steps_select_own" ON "execution"."steps" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("execution"."runs" "ru"
     JOIN "execution"."requests" "rq" ON (("rq"."id" = "ru"."request_id")))
  WHERE (("ru"."id" = "steps"."run_id") AND ("rq"."requester_lenser_id" = "lensers"."get_auth_lenser_id"())))));



CREATE POLICY "steps_service_all" ON "execution"."steps" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "execution"."stream_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "stream_sessions_service_all" ON "execution"."stream_sessions" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Public can read badges" ON "lensers"."badges" FOR SELECT USING (true);



ALTER TABLE "lensers"."badges" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "badges_no_write" ON "lensers"."badges" AS RESTRICTIVE TO "authenticated", "anon" USING (true) WITH CHECK (false);



CREATE POLICY "badges_service_write" ON "lensers"."badges" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "lensers"."group_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "group_members_delete_admin" ON "lensers"."group_members" FOR DELETE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "lensers"."groups" "g"
  WHERE (("g"."id" = "group_members"."group_id") AND ("g"."owner_lenser_id" = "lensers"."get_auth_lenser_id"())))) OR (EXISTS ( SELECT 1
   FROM "lensers"."group_members" "gm"
  WHERE (("gm"."group_id" = "group_members"."group_id") AND ("gm"."lenser_id" = "lensers"."get_auth_lenser_id"()) AND ("gm"."role" = 'admin'::"lensers"."group_member_role_enum"))))));



CREATE POLICY "group_members_insert_admin" ON "lensers"."group_members" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "lensers"."groups" "g"
  WHERE (("g"."id" = "group_members"."group_id") AND ("g"."owner_lenser_id" = "lensers"."get_auth_lenser_id"())))) OR (EXISTS ( SELECT 1
   FROM "lensers"."group_members" "gm"
  WHERE (("gm"."group_id" = "group_members"."group_id") AND ("gm"."lenser_id" = "lensers"."get_auth_lenser_id"()) AND ("gm"."role" = 'admin'::"lensers"."group_member_role_enum"))))));



CREATE POLICY "group_members_select_member" ON "lensers"."group_members" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "lensers"."group_members" "my"
  WHERE (("my"."group_id" = "group_members"."group_id") AND ("my"."lenser_id" = "lensers"."get_auth_lenser_id"())))));



CREATE POLICY "group_members_service_all" ON "lensers"."group_members" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "group_members_update_admin" ON "lensers"."group_members" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "lensers"."groups" "g"
  WHERE (("g"."id" = "group_members"."group_id") AND ("g"."owner_lenser_id" = "lensers"."get_auth_lenser_id"())))) OR (EXISTS ( SELECT 1
   FROM "lensers"."group_members" "gm"
  WHERE (("gm"."group_id" = "group_members"."group_id") AND ("gm"."lenser_id" = "lensers"."get_auth_lenser_id"()) AND ("gm"."role" = 'admin'::"lensers"."group_member_role_enum")))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "lensers"."groups" "g"
  WHERE (("g"."id" = "group_members"."group_id") AND ("g"."owner_lenser_id" = "lensers"."get_auth_lenser_id"())))) OR (EXISTS ( SELECT 1
   FROM "lensers"."group_members" "gm"
  WHERE (("gm"."group_id" = "group_members"."group_id") AND ("gm"."lenser_id" = "lensers"."get_auth_lenser_id"()) AND ("gm"."role" = 'admin'::"lensers"."group_member_role_enum"))))));



ALTER TABLE "lensers"."groups" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "groups_insert_own" ON "lensers"."groups" FOR INSERT TO "authenticated" WITH CHECK (("owner_lenser_id" = "lensers"."get_auth_lenser_id"()));



CREATE POLICY "groups_select" ON "lensers"."groups" FOR SELECT TO "authenticated", "anon" USING ((("visibility" = 'public'::"lensers"."group_visibility_enum") OR (("visibility" = ANY (ARRAY['private'::"lensers"."group_visibility_enum", 'invite_only'::"lensers"."group_visibility_enum"])) AND (EXISTS ( SELECT 1
   FROM "lensers"."group_members" "gm"
  WHERE (("gm"."group_id" = "groups"."id") AND ("gm"."lenser_id" = "lensers"."get_auth_lenser_id"())))))));



CREATE POLICY "groups_service_all" ON "lensers"."groups" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "groups_update_own" ON "lensers"."groups" FOR UPDATE TO "authenticated" USING (("owner_lenser_id" = "lensers"."get_auth_lenser_id"())) WITH CHECK (("owner_lenser_id" = "lensers"."get_auth_lenser_id"()));



CREATE POLICY "lensers_deny_delete" ON "lensers"."profiles" FOR DELETE USING (false);



CREATE POLICY "lensers_owner_insert" ON "lensers"."profiles" FOR INSERT WITH CHECK (((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) AND ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "lensers_service_role_all" ON "lensers"."profiles" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "pref_owner_insert" ON "lensers"."preferences" FOR INSERT TO "authenticated" WITH CHECK (("lenser_id" = ( SELECT "profiles"."id"
   FROM "lensers"."profiles"
  WHERE ("profiles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
 LIMIT 1)));



CREATE POLICY "pref_owner_select" ON "lensers"."preferences" FOR SELECT TO "authenticated" USING (("lenser_id" = ( SELECT "profiles"."id"
   FROM "lensers"."profiles"
  WHERE ("profiles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
 LIMIT 1)));



CREATE POLICY "pref_owner_update" ON "lensers"."preferences" FOR UPDATE TO "authenticated" USING (("lenser_id" = ( SELECT "profiles"."id"
   FROM "lensers"."profiles"
  WHERE ("profiles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
 LIMIT 1)));



CREATE POLICY "pref_service_all" ON "lensers"."preferences" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "lensers"."preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "lensers"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_owner_update" ON "lensers"."profiles" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "profiles_select" ON "lensers"."profiles" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (("status" = 'active'::"lensers"."lenser_status") AND ("deletion_requested_at" IS NULL) AND ("visibility" = ANY (ARRAY['public'::"lensers"."lenser_visibility", 'community'::"lensers"."lenser_visibility"]))) OR (("status" = 'active'::"lensers"."lenser_status") AND ("deletion_requested_at" IS NULL) AND ("visibility" = 'private'::"lensers"."lenser_visibility") AND (( SELECT "auth"."uid"() AS "uid") IS NOT NULL))));



CREATE POLICY "profiles_service_update" ON "lensers"."profiles" FOR UPDATE TO "service_role" USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text")) WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



ALTER TABLE "lensers"."relationships" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "relationships_select" ON "lensers"."relationships" FOR SELECT USING ((("source_profile_id" IN ( SELECT "profiles"."id"
   FROM "lensers"."profiles"
  WHERE ("profiles"."user_id" = ( SELECT "auth"."uid"() AS "uid")))) OR ("target_profile_id" IN ( SELECT "profiles"."id"
   FROM "lensers"."profiles"
  WHERE ("profiles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "lensers"."social_links" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "social_links_owner_delete" ON "lensers"."social_links" FOR DELETE USING (("lensers"."is_active_lenser"(( SELECT "auth"."uid"() AS "uid")) AND ("lenser_id" = "lensers"."current_active_lenser_id"())));



CREATE POLICY "social_links_owner_insert" ON "lensers"."social_links" FOR INSERT WITH CHECK (("lensers"."is_active_lenser"(( SELECT "auth"."uid"() AS "uid")) AND ("lenser_id" = "lensers"."current_active_lenser_id"())));



CREATE POLICY "social_links_owner_update" ON "lensers"."social_links" FOR UPDATE USING (("lensers"."is_active_lenser"(( SELECT "auth"."uid"() AS "uid")) AND ("lenser_id" = "lensers"."current_active_lenser_id"()))) WITH CHECK (("lensers"."is_active_lenser"(( SELECT "auth"."uid"() AS "uid")) AND ("lenser_id" = "lensers"."current_active_lenser_id"())));



CREATE POLICY "social_links_public_select" ON "lensers"."social_links" FOR SELECT USING (true);



CREATE POLICY "social_links_service_role_all" ON "lensers"."social_links" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "lensers"."tag_follows" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tag_follows_delete_self" ON "lensers"."tag_follows" FOR DELETE USING (("lenser_id" = ( SELECT "profiles"."id"
   FROM "lensers"."profiles"
  WHERE ("profiles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
 LIMIT 1)));



CREATE POLICY "tag_follows_insert_self" ON "lensers"."tag_follows" FOR INSERT WITH CHECK (("lenser_id" = ( SELECT "profiles"."id"
   FROM "lensers"."profiles"
  WHERE ("profiles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
 LIMIT 1)));



CREATE POLICY "tag_follows_select_public" ON "lensers"."tag_follows" FOR SELECT USING (true);



CREATE POLICY "anon_select" ON "lenses"."lenses" FOR SELECT TO "anon" USING ((("visibility" = 'public'::"content"."visibility_enum") AND ("status" = 'published'::"content"."content_status") AND (EXISTS ( SELECT 1
   FROM "lensers"."profiles" "p"
  WHERE (("p"."id" = "lenses"."lenser_id") AND ("p"."status" = 'active'::"lensers"."lenser_status"))))));



CREATE POLICY "anon_select" ON "lenses"."version_parameters" FOR SELECT TO "anon" USING ((EXISTS ( SELECT 1
   FROM ("lenses"."versions" "v"
     JOIN "lenses"."lenses" "p" ON (("p"."id" = "v"."lens_id")))
  WHERE (("v"."id" = "version_parameters"."version_id") AND ("p"."visibility" = 'public'::"content"."visibility_enum") AND ("p"."status" = 'published'::"content"."content_status")))));



CREATE POLICY "anon_select_published" ON "lenses"."versions" FOR SELECT TO "anon" USING ((EXISTS ( SELECT 1
   FROM "lenses"."lenses" "p"
  WHERE (("p"."id" = "versions"."lens_id") AND ("p"."visibility" = 'public'::"content"."visibility_enum") AND ("p"."status" = 'published'::"content"."content_status")))));



CREATE POLICY "authenticated users can read tools" ON "lenses"."tools" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_delete" ON "lenses"."lenses" FOR DELETE TO "authenticated" USING (("lensers"."is_active_lenser"(( SELECT "auth"."uid"() AS "uid")) AND ("lenser_id" = "lensers"."current_active_lenser_id"())));



CREATE POLICY "authenticated_insert" ON "lenses"."lenses" FOR INSERT TO "authenticated" WITH CHECK (("lensers"."is_active_lenser"(( SELECT "auth"."uid"() AS "uid")) AND ("lenser_id" = "lensers"."current_active_lenser_id"())));



CREATE POLICY "authenticated_insert" ON "lenses"."version_parameters" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("lenses"."versions" "v"
     JOIN "lenses"."lenses" "p" ON (("p"."id" = "v"."lens_id")))
  WHERE (("v"."id" = "version_parameters"."version_id") AND ("p"."lenser_id" = "lensers"."get_auth_lenser_id"()) AND ("v"."status" = 'draft'::"content"."content_status")))));



CREATE POLICY "authenticated_insert" ON "lenses"."versions" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "lenses"."lenses" "p"
  WHERE (("p"."id" = "versions"."lens_id") AND ("p"."lenser_id" = "lensers"."get_auth_lenser_id"())))));



CREATE POLICY "authenticated_select" ON "lenses"."lenses" FOR SELECT TO "authenticated" USING (((("visibility" = ANY (ARRAY['public'::"content"."visibility_enum", 'community'::"content"."visibility_enum"])) AND ("status" = 'published'::"content"."content_status") AND (EXISTS ( SELECT 1
   FROM "lensers"."profiles" "p"
  WHERE (("p"."id" = "lenses"."lenser_id") AND ("p"."status" = 'active'::"lensers"."lenser_status"))))) OR ("lenser_id" = "lensers"."get_auth_lenser_id"())));



CREATE POLICY "authenticated_select" ON "lenses"."version_parameters" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("lenses"."versions" "v"
     JOIN "lenses"."lenses" "p" ON (("p"."id" = "v"."lens_id")))
  WHERE (("v"."id" = "version_parameters"."version_id") AND (("p"."lenser_id" = "lensers"."get_auth_lenser_id"()) OR (("p"."visibility" = ANY (ARRAY['public'::"content"."visibility_enum", 'community'::"content"."visibility_enum"])) AND ("p"."status" = 'published'::"content"."content_status")))))));



CREATE POLICY "authenticated_select" ON "lenses"."versions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "lenses"."lenses" "p"
  WHERE (("p"."id" = "versions"."lens_id") AND (("p"."lenser_id" = "lensers"."get_auth_lenser_id"()) OR (("p"."visibility" = ANY (ARRAY['public'::"content"."visibility_enum", 'community'::"content"."visibility_enum"])) AND ("p"."status" = 'published'::"content"."content_status")))))));



CREATE POLICY "authenticated_update" ON "lenses"."lenses" FOR UPDATE TO "authenticated" USING (("lensers"."is_active_lenser"(( SELECT "auth"."uid"() AS "uid")) AND ("lenser_id" = "lensers"."current_active_lenser_id"()))) WITH CHECK (("lensers"."is_active_lenser"(( SELECT "auth"."uid"() AS "uid")) AND ("lenser_id" = "lensers"."current_active_lenser_id"())));



CREATE POLICY "authenticated_update" ON "lenses"."version_parameters" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("lenses"."versions" "v"
     JOIN "lenses"."lenses" "p" ON (("p"."id" = "v"."lens_id")))
  WHERE (("v"."id" = "version_parameters"."version_id") AND ("p"."lenser_id" = "lensers"."get_auth_lenser_id"()) AND ("v"."status" = 'draft'::"content"."content_status")))));



CREATE POLICY "authenticated_update_draft" ON "lenses"."versions" FOR UPDATE TO "authenticated" USING ((("status" = 'draft'::"content"."content_status") AND (EXISTS ( SELECT 1
   FROM "lenses"."lenses" "p"
  WHERE (("p"."id" = "versions"."lens_id") AND ("p"."lenser_id" = "lensers"."get_auth_lenser_id"())))))) WITH CHECK (("status" = 'draft'::"content"."content_status"));



CREATE POLICY "lens_steps_owner_delete" ON "lenses"."steps" FOR DELETE TO "authenticated" USING (("lens_id" IN ( SELECT "lenses"."id"
   FROM "lenses"."lenses"
  WHERE ("lenses"."lenser_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "lens_steps_owner_insert" ON "lenses"."steps" FOR INSERT TO "authenticated" WITH CHECK (("lens_id" IN ( SELECT "lenses"."id"
   FROM "lenses"."lenses"
  WHERE ("lenses"."lenser_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "lens_steps_owner_update" ON "lenses"."steps" FOR UPDATE TO "authenticated" USING (("lens_id" IN ( SELECT "lenses"."id"
   FROM "lenses"."lenses"
  WHERE ("lenses"."lenser_id" = ( SELECT "auth"."uid"() AS "uid"))))) WITH CHECK (("lens_id" IN ( SELECT "lenses"."id"
   FROM "lenses"."lenses"
  WHERE ("lenses"."lenser_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "lens_steps_read" ON "lenses"."steps" FOR SELECT USING (("lens_id" IN ( SELECT "lenses"."id"
   FROM "lenses"."lenses"
  WHERE (("lenses"."lenser_id" = ( SELECT "auth"."uid"() AS "uid")) OR (("lenses"."visibility" = ANY (ARRAY['public'::"content"."visibility_enum", 'community'::"content"."visibility_enum"])) AND ("lenses"."status" = 'published'::"content"."content_status"))))));



CREATE POLICY "lens_steps_service_role_all" ON "lenses"."steps" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "lenser deletes own parameter contents" ON "lenses"."version_parameter_contents" FOR DELETE USING (("lenser_id" = "lensers"."get_auth_lenser_id"()));



CREATE POLICY "lenser inserts own parameter contents" ON "lenses"."version_parameter_contents" FOR INSERT WITH CHECK (("lenser_id" = "lensers"."get_auth_lenser_id"()));



CREATE POLICY "lenser reads own parameter contents" ON "lenses"."version_parameter_contents" FOR SELECT USING (("lenser_id" = "lensers"."get_auth_lenser_id"()));



CREATE POLICY "lenser updates own parameter contents" ON "lenses"."version_parameter_contents" FOR UPDATE USING (("lenser_id" = "lensers"."get_auth_lenser_id"())) WITH CHECK (("lenser_id" = "lensers"."get_auth_lenser_id"()));



ALTER TABLE "lenses"."lenses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_role_all" ON "lenses"."lenses" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all" ON "lenses"."version_parameters" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all" ON "lenses"."versions" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "lenses"."steps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "lenses"."tools" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "lenses"."version_parameter_contents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "lenses"."version_parameters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "lenses"."versions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "wf_edges_owner_delete" ON "lenses"."workflow_edges" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "lenses"."workflows" "w"
  WHERE (("w"."id" = "workflow_edges"."workflow_id") AND ("w"."lenser_id" = "lensers"."get_auth_lenser_id"())))));



CREATE POLICY "wf_edges_owner_insert" ON "lenses"."workflow_edges" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "lenses"."workflows" "w"
  WHERE (("w"."id" = "workflow_edges"."workflow_id") AND ("w"."lenser_id" = "lensers"."get_auth_lenser_id"())))));



CREATE POLICY "wf_edges_owner_update" ON "lenses"."workflow_edges" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "lenses"."workflows" "w"
  WHERE (("w"."id" = "workflow_edges"."workflow_id") AND ("w"."lenser_id" = "lensers"."get_auth_lenser_id"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "lenses"."workflows" "w"
  WHERE (("w"."id" = "workflow_edges"."workflow_id") AND ("w"."lenser_id" = "lensers"."get_auth_lenser_id"())))));



CREATE POLICY "wf_edges_read" ON "lenses"."workflow_edges" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "lenses"."workflows" "w"
  WHERE (("w"."id" = "workflow_edges"."workflow_id") AND (("w"."visibility" = 'public'::"text") OR ("w"."lenser_id" = "lensers"."get_auth_lenser_id"()))))));



CREATE POLICY "wf_nodes_owner_delete" ON "lenses"."workflow_nodes" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "lenses"."workflows" "w"
  WHERE (("w"."id" = "workflow_nodes"."workflow_id") AND ("w"."lenser_id" = "lensers"."get_auth_lenser_id"())))));



CREATE POLICY "wf_nodes_owner_insert" ON "lenses"."workflow_nodes" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "lenses"."workflows" "w"
  WHERE (("w"."id" = "workflow_nodes"."workflow_id") AND ("w"."lenser_id" = "lensers"."get_auth_lenser_id"())))));



CREATE POLICY "wf_nodes_owner_update" ON "lenses"."workflow_nodes" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "lenses"."workflows" "w"
  WHERE (("w"."id" = "workflow_nodes"."workflow_id") AND ("w"."lenser_id" = "lensers"."get_auth_lenser_id"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "lenses"."workflows" "w"
  WHERE (("w"."id" = "workflow_nodes"."workflow_id") AND ("w"."lenser_id" = "lensers"."get_auth_lenser_id"())))));



CREATE POLICY "wf_nodes_read" ON "lenses"."workflow_nodes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "lenses"."workflows" "w"
  WHERE (("w"."id" = "workflow_nodes"."workflow_id") AND (("w"."visibility" = 'public'::"text") OR ("w"."lenser_id" = "lensers"."get_auth_lenser_id"()))))));



CREATE POLICY "wf_runs_owner_read" ON "lenses"."workflow_runs" FOR SELECT USING ((("triggered_by" = "lensers"."get_auth_lenser_id"()) OR (EXISTS ( SELECT 1
   FROM "lenses"."workflows" "w"
  WHERE (("w"."id" = "workflow_runs"."workflow_id") AND ("w"."visibility" = 'public'::"text"))))));



CREATE POLICY "wnr_owner_read" ON "lenses"."workflow_node_results" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "lenses"."workflow_runs" "wr"
  WHERE (("wr"."id" = "workflow_node_results"."run_id") AND (("wr"."triggered_by" = "lensers"."get_auth_lenser_id"()) OR (EXISTS ( SELECT 1
           FROM "lenses"."workflows" "w"
          WHERE (("w"."id" = "wr"."workflow_id") AND ("w"."visibility" = 'public'::"text")))))))));



ALTER TABLE "lenses"."workflow_edges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "lenses"."workflow_node_results" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "lenses"."workflow_nodes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "lenses"."workflow_runs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "lenses"."workflow_schedules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workflow_schedules_owner" ON "lenses"."workflow_schedules" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "lenses"."workflows" "w"
  WHERE (("w"."id" = "workflow_schedules"."workflow_id") AND ("w"."lenser_id" = "lensers"."get_auth_lenser_id"())))));



ALTER TABLE "lenses"."workflow_version_edges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "lenses"."workflow_version_nodes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "lenses"."workflow_versions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "lenses"."workflows" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workflows_owner_delete" ON "lenses"."workflows" FOR DELETE USING (("lenser_id" = "lensers"."get_auth_lenser_id"()));



CREATE POLICY "workflows_owner_insert" ON "lenses"."workflows" FOR INSERT WITH CHECK (("lenser_id" = "lensers"."get_auth_lenser_id"()));



CREATE POLICY "workflows_owner_update" ON "lenses"."workflows" FOR UPDATE USING (("lenser_id" = "lensers"."get_auth_lenser_id"()));



CREATE POLICY "workflows_public_read" ON "lenses"."workflows" FOR SELECT USING (((("visibility" = 'public'::"text") AND (EXISTS ( SELECT 1
   FROM "lensers"."profiles" "p"
  WHERE (("p"."id" = "workflows"."lenser_id") AND ("p"."status" = 'active'::"lensers"."lenser_status"))))) OR ("lenser_id" = "lensers"."get_auth_lenser_id"())));



CREATE POLICY "wv_anon_select" ON "lenses"."workflow_versions" FOR SELECT TO "anon" USING ((("status" = 'published'::"text") AND (EXISTS ( SELECT 1
   FROM "lenses"."workflows" "w"
  WHERE (("w"."id" = "workflow_versions"."workflow_id") AND ("w"."visibility" = 'public'::"text"))))));



CREATE POLICY "wv_owner_all" ON "lenses"."workflow_versions" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "lenses"."workflows" "w"
  WHERE (("w"."id" = "workflow_versions"."workflow_id") AND ("w"."lenser_id" = "lensers"."get_auth_lenser_id"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "lenses"."workflows" "w"
  WHERE (("w"."id" = "workflow_versions"."workflow_id") AND ("w"."lenser_id" = "lensers"."get_auth_lenser_id"())))));



CREATE POLICY "wv_public_select" ON "lenses"."workflow_versions" FOR SELECT TO "authenticated" USING ((("status" = 'published'::"text") AND (EXISTS ( SELECT 1
   FROM "lenses"."workflows" "w"
  WHERE (("w"."id" = "workflow_versions"."workflow_id") AND ("w"."visibility" = 'public'::"text"))))));



CREATE POLICY "wv_service_all" ON "lenses"."workflow_versions" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "wve_owner_insert" ON "lenses"."workflow_version_edges" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("lenses"."workflow_versions" "wv"
     JOIN "lenses"."workflows" "w" ON (("w"."id" = "wv"."workflow_id")))
  WHERE (("wv"."id" = "workflow_version_edges"."workflow_version_id") AND ("w"."lenser_id" = "lensers"."get_auth_lenser_id"())))));



CREATE POLICY "wve_select_via_version" ON "lenses"."workflow_version_edges" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM "lenses"."workflow_versions" "wv"
  WHERE ("wv"."id" = "workflow_version_edges"."workflow_version_id"))));



CREATE POLICY "wve_service_all" ON "lenses"."workflow_version_edges" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "wvn_owner_insert" ON "lenses"."workflow_version_nodes" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("lenses"."workflow_versions" "wv"
     JOIN "lenses"."workflows" "w" ON (("w"."id" = "wv"."workflow_id")))
  WHERE (("wv"."id" = "workflow_version_nodes"."workflow_version_id") AND ("w"."lenser_id" = "lensers"."get_auth_lenser_id"())))));



CREATE POLICY "wvn_select_via_version" ON "lenses"."workflow_version_nodes" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM "lenses"."workflow_versions" "wv"
  WHERE ("wv"."id" = "workflow_version_nodes"."workflow_version_id"))));



CREATE POLICY "wvn_service_all" ON "lenses"."workflow_version_nodes" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "anon_select_public" ON "media"."objects" FOR SELECT TO "anon" USING (("visibility" = 'public'::"text"));



CREATE POLICY "anon_select_public_attachments" ON "media"."attachments" FOR SELECT TO "anon" USING ((EXISTS ( SELECT 1
   FROM "media"."objects" "o"
  WHERE (("o"."id" = "attachments"."object_id") AND ("o"."visibility" = 'public'::"text")))));



ALTER TABLE "media"."attachments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "authenticated_delete_attachments" ON "media"."attachments" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "media"."objects" "o"
  WHERE (("o"."id" = "attachments"."object_id") AND ("o"."owner_lenser_id" = "lensers"."get_auth_lenser_id"())))));



CREATE POLICY "authenticated_delete_own" ON "media"."objects" FOR DELETE TO "authenticated" USING (("owner_lenser_id" = "lensers"."get_auth_lenser_id"()));



CREATE POLICY "authenticated_insert_attachments" ON "media"."attachments" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "media"."objects" "o"
  WHERE (("o"."id" = "attachments"."object_id") AND ("o"."owner_lenser_id" = "lensers"."get_auth_lenser_id"())))));



CREATE POLICY "authenticated_insert_own" ON "media"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("owner_lenser_id" = "lensers"."get_auth_lenser_id"()) AND "tenancy"."is_workspace_member"("workspace_id")));



CREATE POLICY "authenticated_select_attachments" ON "media"."attachments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "media"."objects" "o"
  WHERE (("o"."id" = "attachments"."object_id") AND (("o"."owner_lenser_id" = "lensers"."get_auth_lenser_id"()) OR ("o"."visibility" = 'public'::"text") OR "tenancy"."is_workspace_member"("o"."workspace_id"))))));



CREATE POLICY "authenticated_select_own_or_public" ON "media"."objects" FOR SELECT TO "authenticated" USING ((("owner_lenser_id" = "lensers"."get_auth_lenser_id"()) OR ("visibility" = 'public'::"text") OR "tenancy"."is_workspace_member"("workspace_id")));



CREATE POLICY "authenticated_update_own" ON "media"."objects" FOR UPDATE TO "authenticated" USING (("owner_lenser_id" = "lensers"."get_auth_lenser_id"()));



ALTER TABLE "media"."objects" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_delete_members" ON "tenancy"."workspace_members" FOR DELETE TO "authenticated" USING ("tenancy"."is_workspace_admin"("workspace_id"));



CREATE POLICY "admin_insert_members" ON "tenancy"."workspace_members" FOR INSERT TO "authenticated" WITH CHECK ("tenancy"."is_workspace_admin"("workspace_id"));



CREATE POLICY "admin_update_workspace" ON "tenancy"."workspaces" FOR UPDATE TO "authenticated" USING ("tenancy"."is_workspace_admin"("id"));



CREATE POLICY "authenticated_insert_workspace" ON "tenancy"."workspaces" FOR INSERT TO "authenticated" WITH CHECK (("owner_lenser_id" = "lensers"."get_auth_lenser_id"()));



CREATE POLICY "members_select_own_workspaces" ON "tenancy"."workspaces" FOR SELECT TO "authenticated" USING ("tenancy"."is_workspace_member"("id"));



CREATE POLICY "members_select_same_workspace" ON "tenancy"."workspace_members" FOR SELECT TO "authenticated" USING ("tenancy"."is_workspace_member"("workspace_id"));



ALTER TABLE "tenancy"."workspace_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "tenancy"."workspaces" ENABLE ROW LEVEL SECURITY;


ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "lenses"."workflow_node_results";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "lenses"."workflow_runs";



GRANT USAGE ON SCHEMA "agents" TO "anon";
GRANT USAGE ON SCHEMA "agents" TO "authenticated";
GRANT USAGE ON SCHEMA "agents" TO "service_role";



GRANT USAGE ON SCHEMA "ai" TO "anon";
GRANT USAGE ON SCHEMA "ai" TO "authenticated";



GRANT USAGE ON SCHEMA "analytics" TO "service_role";
GRANT USAGE ON SCHEMA "analytics" TO "anon";
GRANT USAGE ON SCHEMA "analytics" TO "authenticated";



GRANT USAGE ON SCHEMA "audit" TO "authenticated";
GRANT USAGE ON SCHEMA "audit" TO "service_role";



GRANT USAGE ON SCHEMA "battles" TO "anon";
GRANT USAGE ON SCHEMA "battles" TO "authenticated";
GRANT USAGE ON SCHEMA "battles" TO "service_role";



GRANT USAGE ON SCHEMA "billing" TO "service_role";



GRANT USAGE ON SCHEMA "content" TO "authenticated";
GRANT USAGE ON SCHEMA "content" TO "anon";



GRANT USAGE ON SCHEMA "core" TO "anon";
GRANT USAGE ON SCHEMA "core" TO "authenticated";
GRANT USAGE ON SCHEMA "core" TO "service_role";






GRANT USAGE ON SCHEMA "execution" TO "anon";
GRANT USAGE ON SCHEMA "execution" TO "authenticated";
GRANT USAGE ON SCHEMA "execution" TO "service_role";



GRANT USAGE ON SCHEMA "integrations" TO "authenticated";
GRANT USAGE ON SCHEMA "integrations" TO "anon";
GRANT USAGE ON SCHEMA "integrations" TO "service_role";



GRANT USAGE ON SCHEMA "lensers" TO "anon";
GRANT USAGE ON SCHEMA "lensers" TO "authenticated";
GRANT USAGE ON SCHEMA "lensers" TO "service_role";



GRANT USAGE ON SCHEMA "lenses" TO "authenticated";
GRANT USAGE ON SCHEMA "lenses" TO "service_role";
GRANT USAGE ON SCHEMA "lenses" TO "anon";



GRANT USAGE ON SCHEMA "media" TO "anon";
GRANT USAGE ON SCHEMA "media" TO "authenticated";
GRANT USAGE ON SCHEMA "media" TO "service_role";






GRANT USAGE ON SCHEMA "organizations" TO "anon";
GRANT USAGE ON SCHEMA "organizations" TO "authenticated";
GRANT USAGE ON SCHEMA "organizations" TO "service_role";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT USAGE ON SCHEMA "status" TO "anon";
GRANT USAGE ON SCHEMA "status" TO "authenticated";
GRANT USAGE ON SCHEMA "status" TO "service_role";



GRANT USAGE ON SCHEMA "tenancy" TO "anon";
GRANT USAGE ON SCHEMA "tenancy" TO "authenticated";
GRANT USAGE ON SCHEMA "tenancy" TO "service_role";



GRANT USAGE ON SCHEMA "wallet" TO "service_role";



GRANT USAGE ON SCHEMA "xp" TO "service_role";
GRANT USAGE ON SCHEMA "xp" TO "anon";
GRANT USAGE ON SCHEMA "xp" TO "authenticated";



GRANT ALL ON TYPE "ai"."key_scope_enum" TO "authenticated";
GRANT ALL ON TYPE "ai"."key_scope_enum" TO "anon";



GRANT ALL ON TYPE "ai"."key_status_enum" TO "authenticated";
GRANT ALL ON TYPE "ai"."key_status_enum" TO "anon";



GRANT ALL ON TYPE "content"."payment_method_enum" TO "authenticated";
GRANT ALL ON TYPE "content"."payment_method_enum" TO "anon";



GRANT ALL ON TYPE "content"."reaction_enum" TO "authenticated";









GRANT ALL ON FUNCTION "public"."gbtreekey16_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey16_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey16_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey16_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey16_out"("public"."gbtreekey16") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey16_out"("public"."gbtreekey16") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey16_out"("public"."gbtreekey16") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey16_out"("public"."gbtreekey16") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey2_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey2_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey2_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey2_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey2_out"("public"."gbtreekey2") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey2_out"("public"."gbtreekey2") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey2_out"("public"."gbtreekey2") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey2_out"("public"."gbtreekey2") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey32_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey32_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey32_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey32_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey32_out"("public"."gbtreekey32") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey32_out"("public"."gbtreekey32") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey32_out"("public"."gbtreekey32") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey32_out"("public"."gbtreekey32") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey4_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey4_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey4_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey4_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey4_out"("public"."gbtreekey4") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey4_out"("public"."gbtreekey4") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey4_out"("public"."gbtreekey4") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey4_out"("public"."gbtreekey4") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey8_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey8_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey8_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey8_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey8_out"("public"."gbtreekey8") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey8_out"("public"."gbtreekey8") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey8_out"("public"."gbtreekey8") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey8_out"("public"."gbtreekey8") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey_var_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey_var_out"("public"."gbtreekey_var") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_out"("public"."gbtreekey_var") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_out"("public"."gbtreekey_var") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_out"("public"."gbtreekey_var") TO "service_role";



GRANT ALL ON FUNCTION "agents"."fn_agent_action"("p_ai_lenser_id" "uuid", "p_action_type" "text", "p_context_type" "text", "p_context_id" "uuid", "p_metadata" "jsonb") TO "authenticated";



GRANT ALL ON FUNCTION "agents"."fn_create_ai_lenser"("p_owner_lenser_id" "uuid", "p_handle" "text", "p_display_name" "text", "p_ai_model_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "ai"."fn_decrypt_api_key"("p_key_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "ai"."fn_decrypt_api_key"("p_key_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "ai"."fn_get_my_api_keys"() FROM PUBLIC;
GRANT ALL ON FUNCTION "ai"."fn_get_my_api_keys"() TO "authenticated";



REVOKE ALL ON FUNCTION "ai"."fn_revoke_api_key"("p_key_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "ai"."fn_revoke_api_key"("p_key_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "ai"."fn_store_api_key"("p_provider" "text", "p_label" "text", "p_raw_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "ai"."fn_store_api_key"("p_provider" "text", "p_label" "text", "p_raw_key" "text") TO "authenticated";



GRANT ALL ON FUNCTION "content"."ensure_public_tag"() TO "anon";
GRANT ALL ON FUNCTION "content"."ensure_public_tag"() TO "authenticated";
GRANT ALL ON FUNCTION "content"."ensure_public_tag"() TO "service_role";



REVOKE ALL ON FUNCTION "content"."fn_cleanup_entity_refs"("p_entity_type" "content"."entity_type_enum", "p_entity_id" "uuid") FROM PUBLIC;



GRANT ALL ON FUNCTION "content"."normalize_website_url"() TO "anon";
GRANT ALL ON FUNCTION "content"."normalize_website_url"() TO "authenticated";
GRANT ALL ON FUNCTION "content"."normalize_website_url"() TO "service_role";



GRANT ALL ON FUNCTION "content"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "content"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "content"."set_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "content"."set_version_published_at"() FROM PUBLIC;



GRANT ALL ON FUNCTION "content"."sync_thread_count"() TO "anon";
GRANT ALL ON FUNCTION "content"."sync_thread_count"() TO "authenticated";
GRANT ALL ON FUNCTION "content"."sync_thread_count"() TO "service_role";



GRANT ALL ON FUNCTION "content"."thread_replies_after_delete_trigger"() TO "anon";
GRANT ALL ON FUNCTION "content"."thread_replies_after_delete_trigger"() TO "authenticated";
GRANT ALL ON FUNCTION "content"."thread_replies_after_delete_trigger"() TO "service_role";



GRANT ALL ON FUNCTION "content"."thread_replies_after_insert_trigger"() TO "anon";
GRANT ALL ON FUNCTION "content"."thread_replies_after_insert_trigger"() TO "authenticated";
GRANT ALL ON FUNCTION "content"."thread_replies_after_insert_trigger"() TO "service_role";



GRANT ALL ON FUNCTION "content"."thread_replies_after_update_trigger"() TO "anon";
GRANT ALL ON FUNCTION "content"."thread_replies_after_update_trigger"() TO "authenticated";
GRANT ALL ON FUNCTION "content"."thread_replies_after_update_trigger"() TO "service_role";



GRANT ALL ON FUNCTION "lensers"."get_auth_lenser_id"() TO "authenticated";
GRANT ALL ON FUNCTION "lensers"."get_auth_lenser_id"() TO "service_role";



GRANT ALL ON TABLE "content"."thread_replies" TO "service_role";
GRANT SELECT ON TABLE "content"."thread_replies" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "content"."thread_replies" TO "authenticated";



GRANT ALL ON FUNCTION "content"."thread_reply_counts_as_public"("r" "content"."thread_replies") TO "anon";
GRANT ALL ON FUNCTION "content"."thread_reply_counts_as_public"("r" "content"."thread_replies") TO "authenticated";
GRANT ALL ON FUNCTION "content"."thread_reply_counts_as_public"("r" "content"."thread_replies") TO "service_role";



GRANT ALL ON FUNCTION "content"."toggle_reaction"("p_lenser_id" "uuid", "p_target_type" "text", "p_target_id" "uuid", "p_reaction" "content"."reaction_enum") TO "anon";
GRANT ALL ON FUNCTION "content"."toggle_reaction"("p_lenser_id" "uuid", "p_target_type" "text", "p_target_id" "uuid", "p_reaction" "content"."reaction_enum") TO "authenticated";
GRANT ALL ON FUNCTION "content"."toggle_reaction"("p_lenser_id" "uuid", "p_target_type" "text", "p_target_id" "uuid", "p_reaction" "content"."reaction_enum") TO "service_role";



GRANT ALL ON FUNCTION "content"."user_owns_thread"("thread_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "content"."user_owns_thread"("thread_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "content"."user_owns_thread"("thread_id" "uuid") TO "service_role";
























REVOKE ALL ON FUNCTION "execution"."fn_complete_execution_run"("p_run_id" "uuid", "p_status" "text", "p_token_input" integer, "p_token_output" integer, "p_credit_cost" bigint, "p_billing_status" "text", "p_response_text" "text", "p_response_meta" "jsonb", "p_error_code" "text", "p_error_message" "text", "p_latency_ms" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "execution"."fn_complete_execution_run"("p_run_id" "uuid", "p_status" "text", "p_token_input" integer, "p_token_output" integer, "p_credit_cost" bigint, "p_billing_status" "text", "p_response_text" "text", "p_response_meta" "jsonb", "p_error_code" "text", "p_error_message" "text", "p_latency_ms" integer) TO "service_role";



REVOKE ALL ON FUNCTION "execution"."fn_persist_execution_artifacts"("p_run_id" "uuid", "p_lenser_id" "uuid", "p_workspace_id" "uuid", "p_ai_model_id" "uuid", "p_kind" "text", "p_content_text" "text", "p_content_json" "jsonb", "p_media_ids" "uuid"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "execution"."fn_persist_execution_artifacts"("p_run_id" "uuid", "p_lenser_id" "uuid", "p_workspace_id" "uuid", "p_ai_model_id" "uuid", "p_kind" "text", "p_content_text" "text", "p_content_json" "jsonb", "p_media_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "execution"."fn_persist_local_execution"("p_lens_id" "uuid", "p_version_id" "uuid", "p_provider" "text", "p_model" "text", "p_content_text" "text", "p_token_input" integer, "p_token_output" integer) TO "authenticated";



GRANT ALL ON FUNCTION "execution"."fn_run_lens"("p_lens_id" "uuid", "p_version_id" "uuid", "p_model_id" "uuid", "p_inputs" "jsonb", "p_funding_source" "text", "p_byok_key_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "execution"."fn_start_execution"("p_lenser_id" "uuid", "p_origin_type" "text", "p_funding_source" "text", "p_model_id" "uuid", "p_lens_id" "uuid", "p_workspace_id" "uuid", "p_byok_key_ref_id" "uuid", "p_input_snapshot" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "execution"."fn_start_execution"("p_lenser_id" "uuid", "p_origin_type" "text", "p_funding_source" "text", "p_model_id" "uuid", "p_lens_id" "uuid", "p_workspace_id" "uuid", "p_byok_key_ref_id" "uuid", "p_input_snapshot" "jsonb") TO "service_role";


































































































































































































































































GRANT ALL ON FUNCTION "lensers"."anonymize_join_log"() TO "service_role";



GRANT ALL ON FUNCTION "lensers"."assign_country_join_order"("p_lenser_id" "uuid", "p_country_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "lensers"."auto_award_badges_from_join_order"("p_lenser_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "lensers"."auto_award_badges_from_level"("p_lenser_id" "uuid", "p_app_id" "uuid", "p_old_level" integer, "p_new_level" integer, "p_event_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "lensers"."auto_award_badges_from_streak"("p_lenser_id" "uuid", "p_streak" integer, "p_event_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "lensers"."award_badge"("p_lenser_id" "uuid", "p_type" "lensers"."lenser_badge_type", "p_label" "text", "p_description" "text", "p_icon" "text", "p_xp_event_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "lensers"."build_author_profile"("p_lenser_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "lensers"."build_author_profile"("p_lenser_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "lensers"."current_active_lenser_id"() TO "anon";
GRANT ALL ON FUNCTION "lensers"."current_active_lenser_id"() TO "authenticated";
GRANT ALL ON FUNCTION "lensers"."current_active_lenser_id"() TO "service_role";



GRANT ALL ON FUNCTION "lensers"."enforce_lensers_protections"() TO "anon";
GRANT ALL ON FUNCTION "lensers"."enforce_lensers_protections"() TO "authenticated";
GRANT ALL ON FUNCTION "lensers"."enforce_lensers_protections"() TO "service_role";



GRANT ALL ON FUNCTION "lensers"."init_lenser_engagement_row"() TO "anon";
GRANT ALL ON FUNCTION "lensers"."init_lenser_engagement_row"() TO "authenticated";
GRANT ALL ON FUNCTION "lensers"."init_lenser_engagement_row"() TO "service_role";



GRANT ALL ON FUNCTION "lensers"."is_active_lenser"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "lensers"."is_active_lenser"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "lensers"."is_active_lenser"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "lensers"."log_account_lifecycle_event"("p_profile_id" "uuid", "p_user_id" "uuid", "p_event_type" "text", "p_from_status" "lensers"."lenser_status", "p_to_status" "lensers"."lenser_status", "p_actor_source" "text", "p_metadata" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "lensers"."log_account_lifecycle_event"("p_profile_id" "uuid", "p_user_id" "uuid", "p_event_type" "text", "p_from_status" "lensers"."lenser_status", "p_to_status" "lensers"."lenser_status", "p_actor_source" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "lensers"."log_lenser_join"() TO "anon";
GRANT ALL ON FUNCTION "lensers"."log_lenser_join"() TO "authenticated";
GRANT ALL ON FUNCTION "lensers"."log_lenser_join"() TO "service_role";



GRANT ALL ON FUNCTION "lensers"."prevent_lenser_join_log_delete"() TO "anon";
GRANT ALL ON FUNCTION "lensers"."prevent_lenser_join_log_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "lensers"."prevent_lenser_join_log_delete"() TO "service_role";



GRANT ALL ON FUNCTION "lensers"."prevent_lenser_join_log_update"() TO "anon";
GRANT ALL ON FUNCTION "lensers"."prevent_lenser_join_log_update"() TO "authenticated";
GRANT ALL ON FUNCTION "lensers"."prevent_lenser_join_log_update"() TO "service_role";



GRANT ALL ON FUNCTION "lensers"."protect_sensitive_lenser_fields"() TO "anon";
GRANT ALL ON FUNCTION "lensers"."protect_sensitive_lenser_fields"() TO "authenticated";
GRANT ALL ON FUNCTION "lensers"."protect_sensitive_lenser_fields"() TO "service_role";



GRANT ALL ON FUNCTION "lensers"."sync_join_order"() TO "anon";
GRANT ALL ON FUNCTION "lensers"."sync_join_order"() TO "authenticated";
GRANT ALL ON FUNCTION "lensers"."sync_join_order"() TO "service_role";



GRANT ALL ON FUNCTION "lensers"."trg_award_founder_badges"() TO "service_role";



GRANT ALL ON FUNCTION "lensers"."trg_create_join_log"() TO "service_role";



GRANT ALL ON FUNCTION "lensers"."trg_handle_deletion_request"() TO "service_role";



GRANT ALL ON FUNCTION "lensers"."trg_log_lenser_activity"() TO "service_role";



GRANT ALL ON FUNCTION "lensers"."trg_log_login_from_auth"() TO "service_role";



GRANT ALL ON FUNCTION "lensers"."trg_update_lenser_last_login"() TO "service_role";



GRANT ALL ON FUNCTION "lensers"."user_owns_lenser"("lenser_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "lensers"."user_owns_lenser"("lenser_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "lensers"."user_owns_lenser"("lenser_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "lenses"."fn_clone_lens"("p_source_lens_id" "uuid", "p_version_id" "uuid") TO "authenticated";



GRANT ALL ON TABLE "lenses"."versions" TO "authenticated";
GRANT ALL ON TABLE "lenses"."versions" TO "service_role";
GRANT SELECT ON TABLE "lenses"."versions" TO "anon";



GRANT ALL ON FUNCTION "lenses"."fn_create_draft_version"("p_lens_id" "uuid", "p_template_body" "text", "p_changelog" "text", "p_parent_version_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "lenses"."fn_create_lens"("p_visibility" "content"."visibility_enum", "p_template_body" "text", "p_title" "text", "p_description" "text", "p_language_code" "text", "p_params" "jsonb", "p_tag_ids" "uuid"[], "p_parent_lens_id" "uuid", "p_forked_from_execution_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "lenses"."fn_get_version_params_with_tools"("p_version_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "lenses"."fn_get_version_params_with_tools"("p_version_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "lenses"."fn_list_tools"("p_category" "text") TO "authenticated";
GRANT ALL ON FUNCTION "lenses"."fn_list_tools"("p_category" "text") TO "anon";



GRANT ALL ON FUNCTION "lenses"."fn_list_versions"("p_lens_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "lenses"."fn_publish_version"("p_version_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "lenses"."fn_render_template"("p_version_id" "uuid", "p_inputs" "jsonb") TO "authenticated";



GRANT ALL ON FUNCTION "lenses"."fn_render_version_body"("p_version_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "lenses"."fn_render_version_body"("p_version_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "lenses"."fn_start_workflow_run"("p_workflow_id" "uuid", "p_inputs" "jsonb") TO "authenticated";



GRANT ALL ON FUNCTION "lenses"."fn_update_lens"("p_lens_id" "uuid", "p_template_body" "text", "p_visibility" "content"."visibility_enum", "p_title" "text", "p_description" "text", "p_tag_ids" "uuid"[]) TO "authenticated";



GRANT ALL ON FUNCTION "lenses"."fn_update_lens"("p_lens_id" "uuid", "p_template_body" "text", "p_visibility" "content"."visibility_enum", "p_title" "text", "p_description" "text", "p_tag_ids" "uuid"[], "p_params" "jsonb") TO "authenticated";



GRANT ALL ON FUNCTION "lenses"."fn_upsert_draft_version"("p_lens_id" "uuid", "p_template_body" "text", "p_changelog" "text", "p_parent_version_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "media"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "media"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "media"."set_updated_at"() TO "service_role";









GRANT ALL ON FUNCTION "public"."calculate_credit_cost"("p_model_id" "uuid", "p_input_tokens" bigint, "p_output_tokens" bigint, "p_units" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_credit_cost"("p_model_id" "uuid", "p_input_tokens" bigint, "p_output_tokens" bigint, "p_units" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_credit_cost"("p_model_id" "uuid", "p_input_tokens" bigint, "p_output_tokens" bigint, "p_units" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."cash_dist"("money", "money") TO "postgres";
GRANT ALL ON FUNCTION "public"."cash_dist"("money", "money") TO "anon";
GRANT ALL ON FUNCTION "public"."cash_dist"("money", "money") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cash_dist"("money", "money") TO "service_role";



REVOKE ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."date_dist"("date", "date") TO "postgres";
GRANT ALL ON FUNCTION "public"."date_dist"("date", "date") TO "anon";
GRANT ALL ON FUNCTION "public"."date_dist"("date", "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."date_dist"("date", "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."float4_dist"(real, real) TO "postgres";
GRANT ALL ON FUNCTION "public"."float4_dist"(real, real) TO "anon";
GRANT ALL ON FUNCTION "public"."float4_dist"(real, real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."float4_dist"(real, real) TO "service_role";



GRANT ALL ON FUNCTION "public"."float8_dist"(double precision, double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."float8_dist"(double precision, double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."float8_dist"(double precision, double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."float8_dist"(double precision, double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_accept_follow_request"("p_source_profile_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_accept_follow_request"("p_source_profile_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_accept_follow_request"("p_source_profile_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_agent_adapters_register"("p_name" "text", "p_adapter_type" "text", "p_config" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_agent_adapters_register"("p_name" "text", "p_adapter_type" "text", "p_config" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_agent_adapters_register"("p_name" "text", "p_adapter_type" "text", "p_config" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_agent_adapters_remove"("p_adapter_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_agent_adapters_remove"("p_adapter_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_agent_adapters_remove"("p_adapter_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_ai_get_generations_for_lens"("p_lens_id" "uuid", "p_lenser_id" "uuid", "p_limit" integer, "p_offset" integer, "p_media_kind" "text", "p_ai_model_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_ai_get_generations_for_lens"("p_lens_id" "uuid", "p_lenser_id" "uuid", "p_limit" integer, "p_offset" integer, "p_media_kind" "text", "p_ai_model_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_ai_get_generations_for_lens"("p_lens_id" "uuid", "p_lenser_id" "uuid", "p_limit" integer, "p_offset" integer, "p_media_kind" "text", "p_ai_model_slug" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_analytics_product_feedback_list_user_paginated"("p_offset" integer, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_analytics_product_feedback_list_user_paginated"("p_offset" integer, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_analytics_product_feedback_list_user_paginated"("p_offset" integer, "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_analytics_share_events_log"("p_short_id" "text", "p_event_type" "text", "p_ip_hash" "text", "p_user_agent" "text", "p_referer" "text", "p_country" "text", "p_city" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_analytics_share_events_log"("p_short_id" "text", "p_event_type" "text", "p_ip_hash" "text", "p_user_agent" "text", "p_referer" "text", "p_country" "text", "p_city" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_analytics_share_events_log"("p_short_id" "text", "p_event_type" "text", "p_ip_hash" "text", "p_user_agent" "text", "p_referer" "text", "p_country" "text", "p_city" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_analytics_shared_links_consume"("p_short_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_analytics_shared_links_consume"("p_short_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_analytics_shared_links_consume"("p_short_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_analytics_shared_links_create"("p_resource_type" "text", "p_resource_id" "text", "p_slug" "text", "p_channel" "text", "p_meta" "jsonb", "p_display_name" "text", "p_expires_at" timestamp with time zone, "p_max_uses" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_analytics_shared_links_create"("p_resource_type" "text", "p_resource_id" "text", "p_slug" "text", "p_channel" "text", "p_meta" "jsonb", "p_display_name" "text", "p_expires_at" timestamp with time zone, "p_max_uses" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_analytics_shared_links_create"("p_resource_type" "text", "p_resource_id" "text", "p_slug" "text", "p_channel" "text", "p_meta" "jsonb", "p_display_name" "text", "p_expires_at" timestamp with time zone, "p_max_uses" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_analytics_shared_links_get"("p_short_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_analytics_shared_links_get"("p_short_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_analytics_shared_links_get"("p_short_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_analytics_submit_feedback"("p_product_tag" "text", "p_page" "text", "p_message" "text", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_analytics_submit_feedback"("p_product_tag" "text", "p_page" "text", "p_message" "text", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_analytics_submit_feedback"("p_product_tag" "text", "p_page" "text", "p_message" "text", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_analytics_submit_feedback_public"("p_product_tag" "text", "p_page" "text", "p_message" "text", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_analytics_submit_feedback_public"("p_product_tag" "text", "p_page" "text", "p_message" "text", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_analytics_submit_feedback_public"("p_product_tag" "text", "p_page" "text", "p_message" "text", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_auth_approve_device_request"("p_user_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_auth_approve_device_request"("p_user_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_auth_approve_device_request"("p_user_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_auth_approve_device_request"("p_user_code" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_auth_exchange_device_approval"("p_request_id" "uuid", "p_request_secret" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_auth_exchange_device_approval"("p_request_id" "uuid", "p_request_secret" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_auth_exchange_device_approval"("p_request_id" "uuid", "p_request_secret" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_auth_exchange_device_approval"("p_request_id" "uuid", "p_request_secret" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_auth_exchange_device_login"("p_request_id" "uuid", "p_request_secret" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_auth_exchange_device_login"("p_request_id" "uuid", "p_request_secret" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_auth_exchange_device_login"("p_request_id" "uuid", "p_request_secret" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_auth_exchange_device_login"("p_request_id" "uuid", "p_request_secret" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_auth_list_developer_tokens"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_auth_list_developer_tokens"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_auth_list_developer_tokens"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_auth_list_developer_tokens"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_auth_request_device_approval"("p_label" "text", "p_request_ttl_minutes" integer, "p_token_ttl_hours" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_auth_request_device_approval"("p_label" "text", "p_request_ttl_minutes" integer, "p_token_ttl_hours" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_auth_request_device_approval"("p_label" "text", "p_request_ttl_minutes" integer, "p_token_ttl_hours" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_auth_request_device_approval"("p_label" "text", "p_request_ttl_minutes" integer, "p_token_ttl_hours" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_auth_request_device_login"("p_request_ttl_minutes" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_auth_request_device_login"("p_request_ttl_minutes" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_auth_request_device_login"("p_request_ttl_minutes" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_auth_request_device_login"("p_request_ttl_minutes" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_auth_revoke_developer_token"("p_token_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_auth_revoke_developer_token"("p_token_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_auth_revoke_developer_token"("p_token_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_auth_revoke_developer_token"("p_token_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_auth_store_device_login_session"("p_user_code" "text", "p_access_token" "text", "p_refresh_token" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_auth_store_device_login_session"("p_user_code" "text", "p_access_token" "text", "p_refresh_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_auth_store_device_login_session"("p_user_code" "text", "p_access_token" "text", "p_refresh_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_auth_store_device_login_session"("p_user_code" "text", "p_access_token" "text", "p_refresh_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_battle_close_voting"("p_battle_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battle_close_voting"("p_battle_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battle_close_voting"("p_battle_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_battle_open_voting"("p_battle_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battle_open_voting"("p_battle_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battle_open_voting"("p_battle_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_battles_archive"("p_battle_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battles_archive"("p_battle_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_archive"("p_battle_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_battles_clone"("p_battle_id" "uuid", "p_title" "text", "p_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battles_clone"("p_battle_id" "uuid", "p_title" "text", "p_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_clone"("p_battle_id" "uuid", "p_title" "text", "p_slug" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_battles_close"("p_battle_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battles_close"("p_battle_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_close"("p_battle_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_battles_create"("p_title" "text", "p_slug" "text", "p_task_prompt" "text", "p_rubric_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battles_create"("p_title" "text", "p_slug" "text", "p_task_prompt" "text", "p_rubric_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_create"("p_title" "text", "p_slug" "text", "p_task_prompt" "text", "p_rubric_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_battles_create_from_template"("p_template_id" "uuid", "p_title" "text", "p_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battles_create_from_template"("p_template_id" "uuid", "p_title" "text", "p_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_create_from_template"("p_template_id" "uuid", "p_title" "text", "p_slug" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_battles_delete"("p_battle_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battles_delete"("p_battle_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_delete"("p_battle_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_battles_finalize"("p_battle_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battles_finalize"("p_battle_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_finalize"("p_battle_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_battles_get_public"("p_battle_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battles_get_public"("p_battle_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_get_public"("p_battle_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_battles_invite"("p_battle_id" "uuid", "p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battles_invite"("p_battle_id" "uuid", "p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_invite"("p_battle_id" "uuid", "p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_battles_join"("p_battle_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battles_join"("p_battle_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_join"("p_battle_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_battles_leaderboard"("p_battle_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battles_leaderboard"("p_battle_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_leaderboard"("p_battle_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_battles_list_public"("p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battles_list_public"("p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_list_public"("p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_battles_open"("p_battle_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battles_open"("p_battle_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_open"("p_battle_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_battles_publish"("p_battle_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battles_publish"("p_battle_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_publish"("p_battle_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_battles_retract"("p_battle_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battles_retract"("p_battle_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_retract"("p_battle_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_battles_start_voting"("p_battle_id" "uuid", "p_voting_closes_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battles_start_voting"("p_battle_id" "uuid", "p_voting_closes_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_start_voting"("p_battle_id" "uuid", "p_voting_closes_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_battles_submit"("p_battle_id" "uuid", "p_content_text" "text", "p_content_url" "text", "p_content_media" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battles_submit"("p_battle_id" "uuid", "p_content_text" "text", "p_content_url" "text", "p_content_media" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_submit"("p_battle_id" "uuid", "p_content_text" "text", "p_content_url" "text", "p_content_media" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_battles_submit"("p_battle_id" "uuid", "p_content_text" "text", "p_content_url" "text", "p_content_media" "jsonb", "p_execution_run_id" "uuid", "p_artifact_id" "uuid", "p_source_type" "text", "p_adapter_id" "uuid", "p_model_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battles_submit"("p_battle_id" "uuid", "p_content_text" "text", "p_content_url" "text", "p_content_media" "jsonb", "p_execution_run_id" "uuid", "p_artifact_id" "uuid", "p_source_type" "text", "p_adapter_id" "uuid", "p_model_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_submit"("p_battle_id" "uuid", "p_content_text" "text", "p_content_url" "text", "p_content_media" "jsonb", "p_execution_run_id" "uuid", "p_artifact_id" "uuid", "p_source_type" "text", "p_adapter_id" "uuid", "p_model_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_block_profile"("p_target_profile_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_block_profile"("p_target_profile_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_block_profile"("p_target_profile_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_cancel_account_deletion_on_login"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_cancel_account_deletion_on_login"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_cancel_account_deletion_on_login"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_clone_workflow"("p_source_workflow_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_clone_workflow"("p_source_workflow_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_clone_workflow"("p_source_workflow_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_content_create_thread"("p_title" "text", "p_content" "text", "p_visibility" "content"."visibility_enum", "p_tag_ids" "uuid"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_content_create_thread"("p_title" "text", "p_content" "text", "p_visibility" "content"."visibility_enum", "p_tag_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_content_create_thread"("p_title" "text", "p_content" "text", "p_visibility" "content"."visibility_enum", "p_tag_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_content_create_thread"("p_title" "text", "p_content" "text", "p_visibility" "content"."visibility_enum", "p_tag_ids" "uuid"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_content_follow_tag"("p_tag_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_content_follow_tag"("p_tag_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_content_follow_tag"("p_tag_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_content_follow_tag"("p_tag_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_content_get_followed_tags"("p_lenser_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_content_get_followed_tags"("p_lenser_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_content_get_followed_tags"("p_lenser_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_content_get_followed_tags"("p_lenser_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_content_get_following_lenses"("p_lenser_id" "uuid", "p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_content_get_following_lenses"("p_lenser_id" "uuid", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_content_get_following_lenses"("p_lenser_id" "uuid", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_content_get_following_lenses"("p_lenser_id" "uuid", "p_limit" integer, "p_offset" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_content_get_following_threads"("p_lenser_id" "uuid", "p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_content_get_following_threads"("p_lenser_id" "uuid", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_content_get_following_threads"("p_lenser_id" "uuid", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_content_get_following_threads"("p_lenser_id" "uuid", "p_limit" integer, "p_offset" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_content_get_lenses_by_tag"("p_tag_slug" "text", "p_sort" "text", "p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_content_get_lenses_by_tag"("p_tag_slug" "text", "p_sort" "text", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_content_get_lenses_by_tag"("p_tag_slug" "text", "p_sort" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_content_get_lenses_by_tag"("p_tag_slug" "text", "p_sort" "text", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_content_get_personal_lenses"("p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_content_get_personal_lenses"("p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_content_get_personal_lenses"("p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_content_get_personal_threads"("p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_content_get_personal_threads"("p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_content_get_personal_threads"("p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_content_get_popular_lenses"("p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_content_get_popular_lenses"("p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_content_get_popular_lenses"("p_limit" integer, "p_offset" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_content_get_threads_by_tag"("p_tag_slug" "text", "p_sort" "text", "p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_content_get_threads_by_tag"("p_tag_slug" "text", "p_sort" "text", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_content_get_threads_by_tag"("p_tag_slug" "text", "p_sort" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_content_get_threads_by_tag"("p_tag_slug" "text", "p_sort" "text", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_content_get_trending_lenses"("p_lang" "text", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_content_get_trending_lenses"("p_lang" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_content_get_trending_lenses"("p_lang" "text", "p_limit" integer, "p_offset" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_content_get_trending_threads"("p_lang" "text", "p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_content_get_trending_threads"("p_lang" "text", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_content_get_trending_threads"("p_lang" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_content_get_trending_threads"("p_lang" "text", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_content_reactions_get_user_for_target"("p_target_type" "text", "p_target_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_content_reactions_get_user_for_target"("p_target_type" "text", "p_target_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_content_reactions_get_user_for_target"("p_target_type" "text", "p_target_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_content_reactions_toggle"("p_target_type" "text", "p_target_id" "uuid", "p_reaction" "content"."reaction_enum") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_content_reactions_toggle"("p_target_type" "text", "p_target_id" "uuid", "p_reaction" "content"."reaction_enum") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_content_reactions_toggle"("p_target_type" "text", "p_target_id" "uuid", "p_reaction" "content"."reaction_enum") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_content_reactions_toggle"("p_target_type" "text", "p_target_id" "uuid", "p_reaction" "content"."reaction_enum") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_content_report"("p_target_type" "text", "p_target_id" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_content_report"("p_target_type" "text", "p_target_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_content_report"("p_target_type" "text", "p_target_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_content_report"("p_target_type" "text", "p_target_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_content_tags_create"("p_name" "text", "p_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_content_tags_create"("p_name" "text", "p_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_content_tags_create"("p_name" "text", "p_slug" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_content_tags_get_by_slug"("p_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_content_tags_get_by_slug"("p_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_content_tags_get_by_slug"("p_slug" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_content_unfollow_tag"("p_tag_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_content_unfollow_tag"("p_tag_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_content_unfollow_tag"("p_tag_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_content_unfollow_tag"("p_tag_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_core_languages_list"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_core_languages_list"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_core_languages_list"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_core_languages_list"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_create_tag"("p_name" "text", "p_slug" "text", "p_language_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_create_tag"("p_name" "text", "p_slug" "text", "p_language_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_create_tag"("p_name" "text", "p_slug" "text", "p_language_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_create_tag"("p_name" "text", "p_slug" "text", "p_language_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_create_workflow"("p_title" "text", "p_description" "text", "p_visibility" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_create_workflow"("p_title" "text", "p_description" "text", "p_visibility" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_create_workflow"("p_title" "text", "p_description" "text", "p_visibility" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_deactivate_account"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_deactivate_account"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_deactivate_account"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_delete_workflow_edge"("p_edge_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_delete_workflow_edge"("p_edge_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_delete_workflow_edge"("p_edge_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_delete_workflow_node"("p_node_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_delete_workflow_node"("p_node_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_delete_workflow_node"("p_node_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_deny_mutation"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_deny_mutation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_deny_mutation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_execution_persist_response"("p_lenser_id" "uuid", "p_provider" "text", "p_model" "text", "p_status" "text", "p_response_text" "text", "p_response_meta" "jsonb", "p_token_input" integer, "p_token_output" integer, "p_credit_cost" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_execution_persist_response"("p_lenser_id" "uuid", "p_provider" "text", "p_model" "text", "p_status" "text", "p_response_text" "text", "p_response_meta" "jsonb", "p_token_input" integer, "p_token_output" integer, "p_credit_cost" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_execution_persist_response"("p_lenser_id" "uuid", "p_provider" "text", "p_model" "text", "p_status" "text", "p_response_text" "text", "p_response_meta" "jsonb", "p_token_input" integer, "p_token_output" integer, "p_credit_cost" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_get_active_season"("p_app_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_get_active_season"("p_app_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_active_season"("p_app_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_active_season"("p_app_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_get_battle_comments"("p_battle_id" "uuid", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_battle_comments"("p_battle_id" "uuid", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_battle_comments"("p_battle_id" "uuid", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_get_battle_comments"("p_battle_id" "uuid", "p_limit" integer, "p_before_ts" timestamp with time zone, "p_before_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_battle_comments"("p_battle_id" "uuid", "p_limit" integer, "p_before_ts" timestamp with time zone, "p_before_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_battle_comments"("p_battle_id" "uuid", "p_limit" integer, "p_before_ts" timestamp with time zone, "p_before_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_get_battle_full"("p_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_battle_full"("p_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_battle_full"("p_slug" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_get_battles_feed"("p_status" "text", "p_battle_type" "text", "p_limit" integer, "p_cursor" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_battles_feed"("p_status" "text", "p_battle_type" "text", "p_limit" integer, "p_cursor" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_battles_feed"("p_status" "text", "p_battle_type" "text", "p_limit" integer, "p_cursor" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_get_global_messages"("p_battle_id" "uuid", "p_limit" integer, "p_before_ts" timestamp with time zone, "p_before_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_global_messages"("p_battle_id" "uuid", "p_limit" integer, "p_before_ts" timestamp with time zone, "p_before_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_global_messages"("p_battle_id" "uuid", "p_limit" integer, "p_before_ts" timestamp with time zone, "p_before_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "lensers"."profiles" TO "service_role";
GRANT SELECT ON TABLE "lensers"."profiles" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "lensers"."profiles" TO "authenticated";



GRANT ALL ON FUNCTION "public"."fn_get_leaderboard"("p_order_by" "text", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_leaderboard"("p_order_by" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_leaderboard"("p_order_by" "text", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_get_lenser_profile_full"("p_handle" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_lenser_profile_full"("p_handle" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_lenser_profile_full"("p_handle" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_get_my_api_keys"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_get_my_api_keys"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_my_api_keys"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_my_api_keys"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_get_my_lensers"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_my_lensers"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_my_lensers"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_get_my_lenses"("p_offset" integer, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_my_lenses"("p_offset" integer, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_my_lenses"("p_offset" integer, "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_get_my_workflows"("p_lenser_id" "uuid", "p_offset" integer, "p_limit" integer, "p_visibility" "text", "p_sort" "text", "p_search" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_my_workflows"("p_lenser_id" "uuid", "p_offset" integer, "p_limit" integer, "p_visibility" "text", "p_sort" "text", "p_search" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_my_workflows"("p_lenser_id" "uuid", "p_offset" integer, "p_limit" integer, "p_visibility" "text", "p_sort" "text", "p_search" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_get_pending_requests"("p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_pending_requests"("p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_pending_requests"("p_limit" integer, "p_offset" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_get_season_leaderboard"("p_app_id" "uuid", "p_season_id" "uuid", "p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_get_season_leaderboard"("p_app_id" "uuid", "p_season_id" "uuid", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_season_leaderboard"("p_app_id" "uuid", "p_season_id" "uuid", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_season_leaderboard"("p_app_id" "uuid", "p_season_id" "uuid", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_get_thread_replies_page"("p_thread_id" "uuid", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_thread_replies_page"("p_thread_id" "uuid", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_thread_replies_page"("p_thread_id" "uuid", "p_limit" integer, "p_offset" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_get_workflow_detail"("p_workflow_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_get_workflow_detail"("p_workflow_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_workflow_detail"("p_workflow_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_workflow_detail"("p_workflow_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_get_workflow_edges"("p_workflow_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_workflow_edges"("p_workflow_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_workflow_edges"("p_workflow_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_get_workflow_node_results"("p_run_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_workflow_node_results"("p_run_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_workflow_node_results"("p_run_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_get_workflow_nodes"("p_workflow_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_workflow_nodes"("p_workflow_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_workflow_nodes"("p_workflow_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_get_workflow_run"("p_run_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_workflow_run"("p_run_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_workflow_run"("p_run_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_lensers_create_profile"("p_handle" "text", "p_display_name" "text", "p_bio" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_lensers_create_profile"("p_handle" "text", "p_display_name" "text", "p_bio" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_lensers_create_profile"("p_handle" "text", "p_display_name" "text", "p_bio" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_lensers_create_profile"("p_handle" "text", "p_display_name" "text", "p_bio" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_lensers_follow"("p_following_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_lensers_follow"("p_following_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_lensers_follow"("p_following_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_lensers_follow"("p_following_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_lensers_get_current_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_lensers_get_current_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_lensers_get_current_id"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_lensers_get_follows"("p_lenser_id" "uuid", "p_type" "text", "p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_lensers_get_follows"("p_lenser_id" "uuid", "p_type" "text", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_lensers_get_follows"("p_lenser_id" "uuid", "p_type" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_lensers_get_follows"("p_lenser_id" "uuid", "p_type" "text", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_lensers_get_fresh_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_lensers_get_fresh_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_lensers_get_fresh_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_lensers_get_is_in_waitinglist"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_lensers_get_is_in_waitinglist"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_lensers_get_is_in_waitinglist"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_lensers_get_leaderboard"("p_period" "text", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_lensers_get_leaderboard"("p_period" "text", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_lensers_get_leaderboard"("p_period" "text", "p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_lensers_get_preferences"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_lensers_get_preferences"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_lensers_get_preferences"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_lensers_get_preferences"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_lensers_get_profile"("p_handle" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_lensers_get_profile"("p_handle" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_lensers_get_profile"("p_handle" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_lensers_get_public_profile"("p_handle" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_lensers_get_public_profile"("p_handle" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_lensers_get_public_profile"("p_handle" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_lensers_get_suggested"("p_lenser_id" "uuid", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_lensers_get_suggested"("p_lenser_id" "uuid", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_lensers_get_suggested"("p_lenser_id" "uuid", "p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_lensers_get_trending"("p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_lensers_get_trending"("p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_lensers_get_trending"("p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_lensers_get_trending"("p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_lensers_is_following"("p_target_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_lensers_is_following"("p_target_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_lensers_is_following"("p_target_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_lensers_is_following"("p_target_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_lensers_list"("p_type" "text", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_lensers_list"("p_type" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_lensers_list"("p_type" "text", "p_limit" integer, "p_offset" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_lensers_request_deletion"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_lensers_request_deletion"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_lensers_request_deletion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_lensers_request_deletion"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_lensers_sync_social_links"("p_links" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_lensers_sync_social_links"("p_links" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_lensers_sync_social_links"("p_links" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_lensers_sync_social_links"("p_links" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_lensers_toggle_waitinglist"("p_kvkk_approved" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_lensers_toggle_waitinglist"("p_kvkk_approved" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_lensers_toggle_waitinglist"("p_kvkk_approved" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_lensers_toggle_waitinglist"("p_kvkk_approved" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_lensers_unfollow"("p_following_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_lensers_unfollow"("p_following_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_lensers_unfollow"("p_following_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_lensers_unfollow"("p_following_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_lensers_update_preferences"("p_data" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_lensers_update_preferences"("p_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_lensers_update_preferences"("p_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_lensers_update_preferences"("p_data" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_lensers_update_profile"("p_data" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_lensers_update_profile"("p_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_lensers_update_profile"("p_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_lensers_update_profile"("p_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_lenses_create_version"("p_lens_id" "uuid", "p_template_body" "text", "p_changelog" "text", "p_parent_version_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_lenses_create_version"("p_lens_id" "uuid", "p_template_body" "text", "p_changelog" "text", "p_parent_version_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_lenses_create_version"("p_lens_id" "uuid", "p_template_body" "text", "p_changelog" "text", "p_parent_version_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_lenses_list_versions"("p_lens_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_lenses_list_versions"("p_lens_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_lenses_list_versions"("p_lens_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_lenses_publish_version"("p_version_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_lenses_publish_version"("p_version_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_lenses_publish_version"("p_version_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_log_page_view"("p_target_type" "public"."page_view_target_enum", "p_target_id" "text", "p_path" "text", "p_referrer" "text", "p_user_agent" "text", "p_client_ip" "inet") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_log_page_view"("p_target_type" "public"."page_view_target_enum", "p_target_id" "text", "p_path" "text", "p_referrer" "text", "p_user_agent" "text", "p_client_ip" "inet") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_log_page_view"("p_target_type" "public"."page_view_target_enum", "p_target_id" "text", "p_path" "text", "p_referrer" "text", "p_user_agent" "text", "p_client_ip" "inet") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_media_bind_attachment"("p_object_id" "uuid", "p_entity_type" "text", "p_entity_id" "uuid", "p_binding_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_media_bind_attachment"("p_object_id" "uuid", "p_entity_type" "text", "p_entity_id" "uuid", "p_binding_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_media_bind_attachment"("p_object_id" "uuid", "p_entity_type" "text", "p_entity_id" "uuid", "p_binding_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_media_finalize_upload"("p_object_id" "uuid", "p_bucket" "text", "p_object_key" "text", "p_byte_size" bigint, "p_checksum" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_media_finalize_upload"("p_object_id" "uuid", "p_bucket" "text", "p_object_key" "text", "p_byte_size" bigint, "p_checksum" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_media_finalize_upload"("p_object_id" "uuid", "p_bucket" "text", "p_object_key" "text", "p_byte_size" bigint, "p_checksum" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_media_soft_delete"("p_object_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_media_soft_delete"("p_object_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_media_soft_delete"("p_object_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_media_unbind_attachment"("p_entity_type" "text", "p_entity_id" "uuid", "p_binding_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_media_unbind_attachment"("p_entity_type" "text", "p_entity_id" "uuid", "p_binding_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_media_unbind_attachment"("p_entity_type" "text", "p_entity_id" "uuid", "p_binding_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_ops_submit_contact"("p_name" "text", "p_email" "text", "p_subject" "text", "p_message" "text", "p_kvkk_approved" boolean, "p_ip_address" "text", "p_user_agent" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_ops_submit_contact"("p_name" "text", "p_email" "text", "p_subject" "text", "p_message" "text", "p_kvkk_approved" boolean, "p_ip_address" "text", "p_user_agent" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_ops_submit_contact"("p_name" "text", "p_email" "text", "p_subject" "text", "p_message" "text", "p_kvkk_approved" boolean, "p_ip_address" "text", "p_user_agent" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_post_global_message"("p_battle_id" "uuid", "p_body" "text", "p_sender_handle" "text", "p_sender_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_post_global_message"("p_battle_id" "uuid", "p_body" "text", "p_sender_handle" "text", "p_sender_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_post_global_message"("p_battle_id" "uuid", "p_body" "text", "p_sender_handle" "text", "p_sender_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_publish_battle"("p_battle_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_publish_battle"("p_battle_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_publish_battle"("p_battle_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_purge_due_accounts"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_purge_due_accounts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_purge_due_accounts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_reject_follow_request"("p_source_profile_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_reject_follow_request"("p_source_profile_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_reject_follow_request"("p_source_profile_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_remove_follow"("p_target_profile_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_remove_follow"("p_target_profile_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_remove_follow"("p_target_profile_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_request_follow"("p_target_profile_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_request_follow"("p_target_profile_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_request_follow"("p_target_profile_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_resolve_mentions"("p_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_resolve_mentions"("p_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_resolve_mentions"("p_ids" "uuid"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_revoke_api_key"("p_key_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_revoke_api_key"("p_key_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_revoke_api_key"("p_key_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_revoke_api_key"("p_key_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_save_workflow_node_config"("p_node_id" "uuid", "p_config" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_save_workflow_node_config"("p_node_id" "uuid", "p_config" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_save_workflow_node_config"("p_node_id" "uuid", "p_config" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_schedule_account_deletion"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_schedule_account_deletion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_schedule_account_deletion"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_search_lensers"("p_query" "text", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_search_lensers"("p_query" "text", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_search_lensers"("p_query" "text", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_start_workflow_run"("p_workflow_id" "uuid", "p_inputs" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_start_workflow_run"("p_workflow_id" "uuid", "p_inputs" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_start_workflow_run"("p_workflow_id" "uuid", "p_inputs" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_start_workflow_run"("p_workflow_id" "uuid", "p_inputs" "jsonb", "p_global_model_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_start_workflow_run"("p_workflow_id" "uuid", "p_inputs" "jsonb", "p_global_model_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_start_workflow_run"("p_workflow_id" "uuid", "p_inputs" "jsonb", "p_global_model_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_store_api_key"("p_provider" "text", "p_label" "text", "p_raw_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_store_api_key"("p_provider" "text", "p_label" "text", "p_raw_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_store_api_key"("p_provider" "text", "p_label" "text", "p_raw_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_store_api_key"("p_provider" "text", "p_label" "text", "p_raw_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_switch_active_lenser"("p_lenser_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_switch_active_lenser"("p_lenser_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_switch_active_lenser"("p_lenser_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_tag_activity_log"("p_events" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_tag_activity_log"("p_events" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_tag_activity_log"("p_events" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_tags_get_cloud"("p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_tags_get_cloud"("p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_tags_get_cloud"("p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_tags_search"("p_query" "text", "p_lang" "text", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_tags_search"("p_query" "text", "p_lang" "text", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_tags_search"("p_query" "text", "p_lang" "text", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_unblock_profile"("p_target_profile_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_unblock_profile"("p_target_profile_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_unblock_profile"("p_target_profile_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_update_agent_profile"("p_ai_lenser_id" "uuid", "p_patch" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_update_agent_profile"("p_ai_lenser_id" "uuid", "p_patch" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_update_agent_profile"("p_ai_lenser_id" "uuid", "p_patch" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_update_workflow"("p_workflow_id" "uuid", "p_title" "text", "p_description" "text", "p_visibility" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_update_workflow"("p_workflow_id" "uuid", "p_title" "text", "p_description" "text", "p_visibility" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_update_workflow"("p_workflow_id" "uuid", "p_title" "text", "p_description" "text", "p_visibility" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_update_workflow_node_result"("p_run_id" "uuid", "p_node_id" "uuid", "p_status" "text", "p_output_data" "jsonb", "p_error_message" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_update_workflow_node_result"("p_run_id" "uuid", "p_node_id" "uuid", "p_status" "text", "p_output_data" "jsonb", "p_error_message" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_update_workflow_node_result"("p_run_id" "uuid", "p_node_id" "uuid", "p_status" "text", "p_output_data" "jsonb", "p_error_message" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_update_workflow_run_status"("p_run_id" "uuid", "p_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_update_workflow_run_status"("p_run_id" "uuid", "p_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_update_workflow_run_status"("p_run_id" "uuid", "p_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_upsert_workflow_edges"("p_workflow_id" "uuid", "p_edges" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_upsert_workflow_edges"("p_workflow_id" "uuid", "p_edges" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_upsert_workflow_edges"("p_workflow_id" "uuid", "p_edges" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_upsert_workflow_nodes"("p_workflow_id" "uuid", "p_nodes" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_upsert_workflow_nodes"("p_workflow_id" "uuid", "p_nodes" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_upsert_workflow_nodes"("p_workflow_id" "uuid", "p_nodes" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_workflows_get_popular"("p_offset" integer, "p_limit" integer, "p_search" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_workflows_get_popular"("p_offset" integer, "p_limit" integer, "p_search" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_workflows_get_popular"("p_offset" integer, "p_limit" integer, "p_search" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_xp_get_apps"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_xp_get_apps"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_xp_get_apps"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_xp_get_contributions"("p_lenser_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_xp_get_contributions"("p_lenser_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_xp_get_contributions"("p_lenser_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_xp_get_history"("p_lenser_id" "uuid", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_xp_get_history"("p_lenser_id" "uuid", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_xp_get_history"("p_lenser_id" "uuid", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_xp_get_self"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_xp_get_self"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_xp_get_self"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_xp_get_summary"("p_lenser_id" "uuid", "p_app_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_xp_get_summary"("p_lenser_id" "uuid", "p_app_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_xp_get_summary"("p_lenser_id" "uuid", "p_app_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bit_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bit_consistent"("internal", bit, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_consistent"("internal", bit, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_consistent"("internal", bit, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_consistent"("internal", bit, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bit_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bit_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bit_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bit_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_consistent"("internal", boolean, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_consistent"("internal", boolean, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_consistent"("internal", boolean, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_consistent"("internal", boolean, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_same"("public"."gbtreekey2", "public"."gbtreekey2", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_same"("public"."gbtreekey2", "public"."gbtreekey2", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_same"("public"."gbtreekey2", "public"."gbtreekey2", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_same"("public"."gbtreekey2", "public"."gbtreekey2", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bpchar_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bpchar_consistent"("internal", character, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_consistent"("internal", character, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_consistent"("internal", character, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_consistent"("internal", character, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bytea_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bytea_consistent"("internal", "bytea", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_consistent"("internal", "bytea", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_consistent"("internal", "bytea", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_consistent"("internal", "bytea", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bytea_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bytea_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bytea_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bytea_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_consistent"("internal", "money", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_consistent"("internal", "money", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_consistent"("internal", "money", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_consistent"("internal", "money", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_distance"("internal", "money", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_distance"("internal", "money", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_distance"("internal", "money", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_distance"("internal", "money", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_consistent"("internal", "date", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_consistent"("internal", "date", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_consistent"("internal", "date", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_consistent"("internal", "date", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_distance"("internal", "date", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_distance"("internal", "date", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_distance"("internal", "date", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_distance"("internal", "date", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_consistent"("internal", "anyenum", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_consistent"("internal", "anyenum", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_consistent"("internal", "anyenum", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_consistent"("internal", "anyenum", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_consistent"("internal", real, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_consistent"("internal", real, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_consistent"("internal", real, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_consistent"("internal", real, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_distance"("internal", real, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_distance"("internal", real, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_distance"("internal", real, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_distance"("internal", real, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_consistent"("internal", double precision, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_consistent"("internal", double precision, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_consistent"("internal", double precision, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_consistent"("internal", double precision, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_distance"("internal", double precision, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_distance"("internal", double precision, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_distance"("internal", double precision, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_distance"("internal", double precision, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_inet_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_inet_consistent"("internal", "inet", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_consistent"("internal", "inet", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_consistent"("internal", "inet", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_consistent"("internal", "inet", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_inet_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_inet_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_inet_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_inet_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_consistent"("internal", smallint, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_consistent"("internal", smallint, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_consistent"("internal", smallint, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_consistent"("internal", smallint, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_distance"("internal", smallint, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_distance"("internal", smallint, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_distance"("internal", smallint, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_distance"("internal", smallint, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_same"("public"."gbtreekey4", "public"."gbtreekey4", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_same"("public"."gbtreekey4", "public"."gbtreekey4", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_same"("public"."gbtreekey4", "public"."gbtreekey4", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_same"("public"."gbtreekey4", "public"."gbtreekey4", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_consistent"("internal", integer, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_consistent"("internal", integer, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_consistent"("internal", integer, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_consistent"("internal", integer, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_distance"("internal", integer, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_distance"("internal", integer, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_distance"("internal", integer, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_distance"("internal", integer, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_consistent"("internal", bigint, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_consistent"("internal", bigint, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_consistent"("internal", bigint, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_consistent"("internal", bigint, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_distance"("internal", bigint, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_distance"("internal", bigint, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_distance"("internal", bigint, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_distance"("internal", bigint, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_consistent"("internal", interval, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_consistent"("internal", interval, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_consistent"("internal", interval, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_consistent"("internal", interval, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_distance"("internal", interval, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_distance"("internal", interval, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_distance"("internal", interval, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_distance"("internal", interval, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_consistent"("internal", "macaddr8", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_consistent"("internal", "macaddr8", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_consistent"("internal", "macaddr8", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_consistent"("internal", "macaddr8", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_consistent"("internal", "macaddr", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_consistent"("internal", "macaddr", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_consistent"("internal", "macaddr", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_consistent"("internal", "macaddr", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_numeric_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_numeric_consistent"("internal", numeric, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_consistent"("internal", numeric, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_consistent"("internal", numeric, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_consistent"("internal", numeric, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_numeric_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_numeric_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_numeric_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_numeric_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_consistent"("internal", "oid", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_consistent"("internal", "oid", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_consistent"("internal", "oid", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_consistent"("internal", "oid", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_distance"("internal", "oid", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_distance"("internal", "oid", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_distance"("internal", "oid", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_distance"("internal", "oid", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_text_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_text_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_text_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_text_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_text_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_text_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_consistent"("internal", time without time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_consistent"("internal", time without time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_consistent"("internal", time without time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_consistent"("internal", time without time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_distance"("internal", time without time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_distance"("internal", time without time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_distance"("internal", time without time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_distance"("internal", time without time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_timetz_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_timetz_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_timetz_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_timetz_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_timetz_consistent"("internal", time with time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_timetz_consistent"("internal", time with time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_timetz_consistent"("internal", time with time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_timetz_consistent"("internal", time with time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_consistent"("internal", timestamp without time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_consistent"("internal", timestamp without time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_consistent"("internal", timestamp without time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_consistent"("internal", timestamp without time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_distance"("internal", timestamp without time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_distance"("internal", timestamp without time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_distance"("internal", timestamp without time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_distance"("internal", timestamp without time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_tstz_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_tstz_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_tstz_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_tstz_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_tstz_consistent"("internal", timestamp with time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_tstz_consistent"("internal", timestamp with time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_tstz_consistent"("internal", timestamp with time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_tstz_consistent"("internal", timestamp with time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_tstz_distance"("internal", timestamp with time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_tstz_distance"("internal", timestamp with time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_tstz_distance"("internal", timestamp with time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_tstz_distance"("internal", timestamp with time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_consistent"("internal", "uuid", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_consistent"("internal", "uuid", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_consistent"("internal", "uuid", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_consistent"("internal", "uuid", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_var_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_var_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_var_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_var_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_var_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_var_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_var_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_var_fetch"("internal") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_active_models_by_provider"("p_provider_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_active_models_by_provider"("p_provider_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_active_models_by_provider"("p_provider_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_active_models_by_provider"("p_provider_key" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_active_providers"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_active_providers"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_active_providers"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_active_providers"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_model_info"("p_provider_key" "text", "p_model_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_model_info"("p_provider_key" "text", "p_model_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_model_info"("p_provider_key" "text", "p_model_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."int2_dist"(smallint, smallint) TO "postgres";
GRANT ALL ON FUNCTION "public"."int2_dist"(smallint, smallint) TO "anon";
GRANT ALL ON FUNCTION "public"."int2_dist"(smallint, smallint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."int2_dist"(smallint, smallint) TO "service_role";



GRANT ALL ON FUNCTION "public"."int4_dist"(integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."int4_dist"(integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."int4_dist"(integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."int4_dist"(integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."int8_dist"(bigint, bigint) TO "postgres";
GRANT ALL ON FUNCTION "public"."int8_dist"(bigint, bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."int8_dist"(bigint, bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."int8_dist"(bigint, bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."interval_dist"(interval, interval) TO "postgres";
GRANT ALL ON FUNCTION "public"."interval_dist"(interval, interval) TO "anon";
GRANT ALL ON FUNCTION "public"."interval_dist"(interval, interval) TO "authenticated";
GRANT ALL ON FUNCTION "public"."interval_dist"(interval, interval) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."list_tags_stats"("p_lang" "text", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."list_tags_stats"("p_lang" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_tags_stats"("p_lang" "text", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."oid_dist"("oid", "oid") TO "postgres";
GRANT ALL ON FUNCTION "public"."oid_dist"("oid", "oid") TO "anon";
GRANT ALL ON FUNCTION "public"."oid_dist"("oid", "oid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."oid_dist"("oid", "oid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."time_dist"(time without time zone, time without time zone) TO "postgres";
GRANT ALL ON FUNCTION "public"."time_dist"(time without time zone, time without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."time_dist"(time without time zone, time without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."time_dist"(time without time zone, time without time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."ts_dist"(timestamp without time zone, timestamp without time zone) TO "postgres";
GRANT ALL ON FUNCTION "public"."ts_dist"(timestamp without time zone, timestamp without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."ts_dist"(timestamp without time zone, timestamp without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."ts_dist"(timestamp without time zone, timestamp without time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."tstz_dist"(timestamp with time zone, timestamp with time zone) TO "postgres";
GRANT ALL ON FUNCTION "public"."tstz_dist"(timestamp with time zone, timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."tstz_dist"(timestamp with time zone, timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."tstz_dist"(timestamp with time zone, timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "tenancy"."fn_create_personal_workspace"() TO "anon";
GRANT ALL ON FUNCTION "tenancy"."fn_create_personal_workspace"() TO "authenticated";
GRANT ALL ON FUNCTION "tenancy"."fn_create_personal_workspace"() TO "service_role";



GRANT ALL ON FUNCTION "tenancy"."is_workspace_admin"("p_workspace_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "tenancy"."is_workspace_admin"("p_workspace_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "tenancy"."is_workspace_admin"("p_workspace_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "tenancy"."is_workspace_member"("p_workspace_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "tenancy"."is_workspace_member"("p_workspace_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "tenancy"."is_workspace_member"("p_workspace_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "tenancy"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "tenancy"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "tenancy"."set_updated_at"() TO "service_role";












GRANT SELECT ON TABLE "agents"."action_logs" TO "authenticated";
GRANT ALL ON TABLE "agents"."action_logs" TO "service_role";



GRANT SELECT ON TABLE "agents"."ai_lensers" TO "anon";
GRANT SELECT ON TABLE "agents"."ai_lensers" TO "authenticated";
GRANT ALL ON TABLE "agents"."ai_lensers" TO "service_role";



GRANT SELECT ON TABLE "agents"."lens_bindings" TO "anon";
GRANT SELECT ON TABLE "agents"."lens_bindings" TO "authenticated";
GRANT ALL ON TABLE "agents"."lens_bindings" TO "service_role";



GRANT SELECT ON TABLE "agents"."model_bindings" TO "anon";
GRANT SELECT ON TABLE "agents"."model_bindings" TO "authenticated";
GRANT ALL ON TABLE "agents"."model_bindings" TO "service_role";



GRANT SELECT ON TABLE "agents"."ownerships" TO "authenticated";
GRANT ALL ON TABLE "agents"."ownerships" TO "service_role";



GRANT SELECT,UPDATE ON TABLE "agents"."policies" TO "authenticated";
GRANT ALL ON TABLE "agents"."policies" TO "service_role";



GRANT SELECT ON TABLE "agents"."quota_snapshots" TO "authenticated";
GRANT ALL ON TABLE "agents"."quota_snapshots" TO "service_role";



GRANT SELECT ON TABLE "agents"."v_agent_profile" TO "authenticated";



GRANT SELECT ON TABLE "ai"."key_usage_log" TO "authenticated";
GRANT ALL ON TABLE "ai"."key_usage_log" TO "service_role";



GRANT ALL ON TABLE "ai"."keys" TO "service_role";



GRANT SELECT ON TABLE "ai"."model_pricing" TO "anon";
GRANT SELECT ON TABLE "ai"."model_pricing" TO "authenticated";
GRANT ALL ON TABLE "ai"."model_pricing" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "ai"."models" TO "anon";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "ai"."models" TO "authenticated";
GRANT ALL ON TABLE "ai"."models" TO "service_role";



GRANT ALL ON TABLE "ai"."providers" TO "service_role";



GRANT SELECT ON TABLE "lenses"."workflow_runs" TO "anon";
GRANT SELECT,INSERT ON TABLE "lenses"."workflow_runs" TO "authenticated";



GRANT ALL ON TABLE "content"."entity_translations" TO "anon";
GRANT ALL ON TABLE "content"."entity_translations" TO "authenticated";
GRANT ALL ON TABLE "content"."entity_translations" TO "service_role";



GRANT ALL ON TABLE "content"."reactions" TO "anon";
GRANT ALL ON TABLE "content"."reactions" TO "authenticated";
GRANT ALL ON TABLE "content"."reactions" TO "service_role";



GRANT SELECT ON TABLE "content"."tag_map" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "content"."tag_map" TO "authenticated";



GRANT ALL ON TABLE "content"."tag_suggestions" TO "service_role";



GRANT ALL ON TABLE "content"."tag_translations" TO "anon";
GRANT ALL ON TABLE "content"."tag_translations" TO "authenticated";
GRANT ALL ON TABLE "content"."tag_translations" TO "service_role";



GRANT ALL ON TABLE "content"."tags" TO "service_role";
GRANT SELECT ON TABLE "content"."tags" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "content"."tags" TO "authenticated";



GRANT ALL ON TABLE "content"."threads" TO "service_role";
GRANT SELECT ON TABLE "content"."threads" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "content"."threads" TO "authenticated";



GRANT ALL ON TABLE "lenses"."lenses" TO "service_role";
GRANT ALL ON TABLE "lenses"."lenses" TO "authenticated";
GRANT SELECT ON TABLE "lenses"."lenses" TO "anon";



GRANT SELECT ON TABLE "content"."vw_auth_threads" TO "anon";
GRANT SELECT ON TABLE "content"."vw_auth_threads" TO "authenticated";
GRANT SELECT ON TABLE "content"."vw_auth_threads" TO "service_role";



GRANT SELECT ON TABLE "content"."vw_tag_cross_lang" TO "anon";
GRANT SELECT ON TABLE "content"."vw_tag_cross_lang" TO "authenticated";
GRANT SELECT ON TABLE "content"."vw_tag_cross_lang" TO "service_role";



GRANT ALL ON TABLE "execution"."artifact_medias" TO "service_role";



GRANT ALL ON TABLE "execution"."artifacts" TO "service_role";
GRANT SELECT ON TABLE "execution"."artifacts" TO "authenticated";



GRANT SELECT ON TABLE "execution"."origin_types" TO "authenticated";
GRANT SELECT ON TABLE "execution"."origin_types" TO "anon";
GRANT ALL ON TABLE "execution"."origin_types" TO "service_role";



GRANT ALL ON TABLE "execution"."requests" TO "service_role";
GRANT SELECT,INSERT ON TABLE "execution"."requests" TO "authenticated";



GRANT ALL ON TABLE "execution"."runs" TO "service_role";
GRANT SELECT ON TABLE "execution"."runs" TO "authenticated";



GRANT ALL ON TABLE "execution"."steps" TO "service_role";
GRANT SELECT ON TABLE "execution"."steps" TO "authenticated";









GRANT ALL ON TABLE "lensers"."badges" TO "service_role";
GRANT SELECT ON TABLE "lensers"."badges" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "lensers"."badges" TO "authenticated";



GRANT ALL ON TABLE "lensers"."group_members" TO "anon";
GRANT ALL ON TABLE "lensers"."group_members" TO "authenticated";
GRANT ALL ON TABLE "lensers"."group_members" TO "service_role";



GRANT ALL ON TABLE "lensers"."groups" TO "anon";
GRANT ALL ON TABLE "lensers"."groups" TO "authenticated";
GRANT ALL ON TABLE "lensers"."groups" TO "service_role";



GRANT SELECT,INSERT,UPDATE ON TABLE "lensers"."preferences" TO "authenticated";
GRANT ALL ON TABLE "lensers"."preferences" TO "service_role";



GRANT ALL ON TABLE "lensers"."social_links" TO "service_role";
GRANT SELECT ON TABLE "lensers"."social_links" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "lensers"."social_links" TO "authenticated";



GRANT SELECT ON TABLE "lensers"."vw_lensers_score" TO "anon";
GRANT SELECT ON TABLE "lensers"."vw_lensers_score" TO "authenticated";
GRANT SELECT ON TABLE "lensers"."vw_lensers_score" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "lenses"."steps" TO "authenticated";
GRANT SELECT ON TABLE "lenses"."steps" TO "anon";
GRANT ALL ON TABLE "lenses"."steps" TO "service_role";



GRANT SELECT ON TABLE "lenses"."tools" TO "authenticated";
GRANT SELECT ON TABLE "lenses"."tools" TO "anon";



GRANT ALL ON TABLE "lenses"."version_parameters" TO "authenticated";
GRANT ALL ON TABLE "lenses"."version_parameters" TO "service_role";
GRANT SELECT ON TABLE "lenses"."version_parameters" TO "anon";



GRANT SELECT ON TABLE "lenses"."vw_hot_scores" TO "authenticated";
GRANT SELECT ON TABLE "lenses"."vw_hot_scores" TO "anon";
GRANT ALL ON TABLE "lenses"."vw_hot_scores" TO "service_role";



GRANT SELECT ON TABLE "lenses"."vw_lens_version_history" TO "authenticated";
GRANT SELECT ON TABLE "lenses"."vw_lens_version_history" TO "anon";
GRANT SELECT ON TABLE "lenses"."vw_lens_version_history" TO "service_role";



GRANT SELECT ON TABLE "lenses"."workflow_edges" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "lenses"."workflow_edges" TO "authenticated";



GRANT SELECT ON TABLE "lenses"."workflow_node_results" TO "anon";
GRANT SELECT ON TABLE "lenses"."workflow_node_results" TO "authenticated";
GRANT INSERT,UPDATE ON TABLE "lenses"."workflow_node_results" TO "service_role";



GRANT SELECT ON TABLE "lenses"."workflow_nodes" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "lenses"."workflow_nodes" TO "authenticated";



GRANT SELECT ON TABLE "lenses"."workflow_version_edges" TO "anon";
GRANT SELECT,INSERT ON TABLE "lenses"."workflow_version_edges" TO "authenticated";
GRANT ALL ON TABLE "lenses"."workflow_version_edges" TO "service_role";



GRANT SELECT ON TABLE "lenses"."workflow_version_nodes" TO "anon";
GRANT SELECT,INSERT ON TABLE "lenses"."workflow_version_nodes" TO "authenticated";
GRANT ALL ON TABLE "lenses"."workflow_version_nodes" TO "service_role";



GRANT SELECT ON TABLE "lenses"."workflow_versions" TO "anon";
GRANT SELECT,INSERT,UPDATE ON TABLE "lenses"."workflow_versions" TO "authenticated";
GRANT ALL ON TABLE "lenses"."workflow_versions" TO "service_role";



GRANT SELECT ON TABLE "lenses"."workflows" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "lenses"."workflows" TO "authenticated";



GRANT ALL ON TABLE "media"."attachments" TO "anon";
GRANT ALL ON TABLE "media"."attachments" TO "authenticated";
GRANT ALL ON TABLE "media"."attachments" TO "service_role";



GRANT ALL ON TABLE "media"."objects" TO "anon";
GRANT ALL ON TABLE "media"."objects" TO "authenticated";
GRANT ALL ON TABLE "media"."objects" TO "service_role";



GRANT ALL ON TABLE "public"."contact_messages" TO "anon";
GRANT ALL ON TABLE "public"."contact_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."contact_messages" TO "service_role";



GRANT ALL ON TABLE "public"."vw_ai_models_public" TO "anon";
GRANT ALL ON TABLE "public"."vw_ai_models_public" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_ai_models_public" TO "service_role";



GRANT ALL ON TABLE "public"."vw_auth_lenser" TO "anon";
GRANT ALL ON TABLE "public"."vw_auth_lenser" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_auth_lenser" TO "service_role";



GRANT ALL ON TABLE "public"."vw_battle_funnel" TO "anon";
GRANT ALL ON TABLE "public"."vw_battle_funnel" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_battle_funnel" TO "service_role";



GRANT ALL ON TABLE "public"."vw_battle_health" TO "anon";
GRANT ALL ON TABLE "public"."vw_battle_health" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_battle_health" TO "service_role";



GRANT ALL ON TABLE "public"."vw_battle_participation" TO "anon";
GRANT ALL ON TABLE "public"."vw_battle_participation" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_battle_participation" TO "service_role";



GRANT ALL ON TABLE "public"."vw_battles_public" TO "anon";
GRANT ALL ON TABLE "public"."vw_battles_public" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_battles_public" TO "service_role";



GRANT ALL ON TABLE "public"."vw_content_tags_public" TO "anon";
GRANT ALL ON TABLE "public"."vw_content_tags_public" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_content_tags_public" TO "service_role";



GRANT ALL ON TABLE "public"."vw_content_thread_replies_public" TO "anon";
GRANT ALL ON TABLE "public"."vw_content_thread_replies_public" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_content_thread_replies_public" TO "service_role";



GRANT ALL ON TABLE "public"."vw_content_threads_public" TO "anon";
GRANT ALL ON TABLE "public"."vw_content_threads_public" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_content_threads_public" TO "service_role";



GRANT ALL ON TABLE "public"."vw_feedback_admin" TO "anon";
GRANT ALL ON TABLE "public"."vw_feedback_admin" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_feedback_admin" TO "service_role";



GRANT ALL ON TABLE "public"."vw_feedback_user" TO "anon";
GRANT ALL ON TABLE "public"."vw_feedback_user" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_feedback_user" TO "service_role";



GRANT ALL ON TABLE "public"."vw_global_messages" TO "anon";
GRANT ALL ON TABLE "public"."vw_global_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_global_messages" TO "service_role";



GRANT ALL ON TABLE "public"."vw_lensers_public_recent" TO "anon";
GRANT ALL ON TABLE "public"."vw_lensers_public_recent" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_lensers_public_recent" TO "service_role";



GRANT ALL ON TABLE "public"."vw_lensers_social_links_private" TO "anon";
GRANT ALL ON TABLE "public"."vw_lensers_social_links_private" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_lensers_social_links_private" TO "service_role";



GRANT ALL ON TABLE "public"."vw_lensers_social_links_public" TO "anon";
GRANT ALL ON TABLE "public"."vw_lensers_social_links_public" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_lensers_social_links_public" TO "service_role";



GRANT ALL ON TABLE "public"."vw_lenses_public" TO "anon";
GRANT ALL ON TABLE "public"."vw_lenses_public" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_lenses_public" TO "service_role";



GRANT ALL ON TABLE "public"."vw_tags_public_extended" TO "anon";
GRANT ALL ON TABLE "public"."vw_tags_public_extended" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_tags_public_extended" TO "service_role";



GRANT ALL ON TABLE "public"."vw_tags_public_stats" TO "anon";
GRANT ALL ON TABLE "public"."vw_tags_public_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_tags_public_stats" TO "service_role";



GRANT ALL ON TABLE "public"."vw_workflows" TO "anon";
GRANT ALL ON TABLE "public"."vw_workflows" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_workflows" TO "service_role";



GRANT ALL ON TABLE "public"."vw_xp_leaderboard_global" TO "anon";
GRANT ALL ON TABLE "public"."vw_xp_leaderboard_global" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_xp_leaderboard_global" TO "service_role";



GRANT ALL ON TABLE "public"."vw_xp_leaderboard_season" TO "anon";
GRANT ALL ON TABLE "public"."vw_xp_leaderboard_season" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_xp_leaderboard_season" TO "service_role";



GRANT ALL ON TABLE "tenancy"."workspace_members" TO "anon";
GRANT ALL ON TABLE "tenancy"."workspace_members" TO "authenticated";
GRANT ALL ON TABLE "tenancy"."workspace_members" TO "service_role";



GRANT ALL ON TABLE "tenancy"."workspaces" TO "anon";
GRANT ALL ON TABLE "tenancy"."workspaces" TO "authenticated";
GRANT ALL ON TABLE "tenancy"."workspaces" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "battles" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "battles" GRANT ALL ON FUNCTIONS TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "battles" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "battles" GRANT SELECT ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "battles" GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "battles" GRANT ALL ON TABLES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






CREATE TRIGGER trg_login_consolidated AFTER UPDATE OF last_sign_in_at ON auth.users FOR EACH ROW EXECUTE FUNCTION lensers.trg_log_login_from_auth();


  create policy "auth_delete_own_objects"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((storage.foldername(name))[1] = (auth.uid())::text));



  create policy "auth_read_own_artifacts"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'artifacts'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "auth_read_own_lens_resources"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'lens-resources'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "auth_read_own_user_media"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'user-media'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "auth_upload_artifacts"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'artifacts'::text));



  create policy "auth_upload_lens_resources"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'lens-resources'::text));



  create policy "auth_upload_public_assets"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'public-assets'::text));



  create policy "auth_upload_user_media"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'user-media'::text));



  create policy "public_read_public_assets"
  on "storage"."objects"
  as permissive
  for select
  to anon, authenticated
using ((bucket_id = 'public-assets'::text));





-- ============================================================
-- OSS BOUNDARY: drop FK constraints referencing private schemas
-- (core.languages, core.currencies, organizations.organizations
--  do not exist in the community edition database)
-- ============================================================

ALTER TABLE "content"."entity_translations"
  DROP CONSTRAINT IF EXISTS "entity_translations_language_code_fk";

ALTER TABLE "content"."tag_translations"
  DROP CONSTRAINT IF EXISTS "tag_translations_language_code_fk";

ALTER TABLE "lensers"."preferences"
  DROP CONSTRAINT IF EXISTS "preferences_currency_fkey",
  DROP CONSTRAINT IF EXISTS "preferences_language_fk";

ALTER TABLE "tenancy"."workspaces"
  DROP CONSTRAINT IF EXISTS "workspaces_org_fkey";
