


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


CREATE SCHEMA IF NOT EXISTS "ai";


ALTER SCHEMA "ai" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "analytics";


ALTER SCHEMA "analytics" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "battles";


ALTER SCHEMA "battles" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "billing";


ALTER SCHEMA "billing" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "content";


ALTER SCHEMA "content" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "core";


ALTER SCHEMA "core" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE SCHEMA IF NOT EXISTS "lensers";


ALTER SCHEMA "lensers" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "ops";


ALTER SCHEMA "ops" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE SCHEMA IF NOT EXISTS "system";


ALTER SCHEMA "system" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "xp";


ALTER SCHEMA "xp" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "ai"."ai_capability_enum" AS ENUM (
    'text',
    'image',
    'code',
    'music'
);


ALTER TYPE "ai"."ai_capability_enum" OWNER TO "postgres";


CREATE TYPE "ai"."provider_enum" AS ENUM (
    'openai',
    'anthropic',
    'google',
    'custom',
    'xai',
    'meta'
);


ALTER TYPE "ai"."provider_enum" OWNER TO "postgres";


CREATE TYPE "analytics"."feedback_status_enum" AS ENUM (
    'pending',
    'in_progress',
    'resolved',
    'closed'
);


ALTER TYPE "analytics"."feedback_status_enum" OWNER TO "postgres";


CREATE TYPE "analytics"."product_tag_enum" AS ENUM (
    'bug',
    'feature',
    'ui_ux',
    'general',
    'other'
);


ALTER TYPE "analytics"."product_tag_enum" OWNER TO "postgres";


CREATE TYPE "battles"."battle_status_enum" AS ENUM (
    'draft',
    'open',
    'voting',
    'scoring',
    'closed',
    'published',
    'archived'
);


ALTER TYPE "battles"."battle_status_enum" OWNER TO "postgres";


CREATE TYPE "battles"."contender_type_enum" AS ENUM (
    'human',
    'ai_model',
    'ai_agent'
);


ALTER TYPE "battles"."contender_type_enum" OWNER TO "postgres";


CREATE TYPE "battles"."scorecard_result_enum" AS ENUM (
    'pass',
    'fail',
    'partial',
    'skipped'
);


ALTER TYPE "battles"."scorecard_result_enum" OWNER TO "postgres";


CREATE TYPE "battles"."submission_status_enum" AS ENUM (
    'pending',
    'submitted',
    'withdrawn',
    'disqualified'
);


ALTER TYPE "battles"."submission_status_enum" OWNER TO "postgres";


CREATE TYPE "battles"."vote_value_enum" AS ENUM (
    'contender_a',
    'contender_b',
    'draw'
);


ALTER TYPE "battles"."vote_value_enum" OWNER TO "postgres";


CREATE TYPE "content"."entity_type_enum" AS ENUM (
    'thread',
    'prompt_template'
);


ALTER TYPE "content"."entity_type_enum" OWNER TO "postgres";


CREATE TYPE "content"."reaction_enum" AS ENUM (
    'like',
    'dislike',
    'saved',
    'copy'
);


ALTER TYPE "content"."reaction_enum" OWNER TO "postgres";


CREATE TYPE "content"."tag_visibility_enum" AS ENUM (
    'public',
    'private',
    'hidden'
);


ALTER TYPE "content"."tag_visibility_enum" OWNER TO "postgres";


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
    'Youtube'
);


ALTER TYPE "lensers"."lenser_social_platform" OWNER TO "postgres";


CREATE TYPE "lensers"."lenser_status" AS ENUM (
    'active',
    'suspended',
    'deactivated'
);


ALTER TYPE "lensers"."lenser_status" OWNER TO "postgres";


CREATE TYPE "lensers"."lenser_visibility" AS ENUM (
    'public',
    'community',
    'private'
);


ALTER TYPE "lensers"."lenser_visibility" OWNER TO "postgres";


CREATE TYPE "public"."page_view_target_enum" AS ENUM (
    'thread',
    'thread_reply',
    'prompt',
    'profile',
    'page',
    'battle'
);


ALTER TYPE "public"."page_view_target_enum" OWNER TO "postgres";


CREATE TYPE "public"."pricing_tier_enum" AS ENUM (
    'free',
    'pro',
    'enterprise'
);


ALTER TYPE "public"."pricing_tier_enum" OWNER TO "postgres";


CREATE TYPE "system"."entity_type_enum" AS ENUM (
    'challenge',
    'challenge_template',
    'prompt',
    'prompt_template',
    'community',
    'thread',
    'xp_rule',
    'pricing_plan',
    'badge',
    'ai_persona',
    'lens'
);


ALTER TYPE "system"."entity_type_enum" OWNER TO "postgres";


CREATE TYPE "system"."translation_field_enum" AS ENUM (
    'title',
    'body',
    'description',
    'rules',
    'cta',
    'name'
);


ALTER TYPE "system"."translation_field_enum" OWNER TO "postgres";


CREATE TYPE "xp"."difficulty_enum" AS ENUM (
    'easy',
    'standard',
    'hard',
    'legendary'
);


ALTER TYPE "xp"."difficulty_enum" OWNER TO "postgres";


CREATE TYPE "xp"."source_enum" AS ENUM (
    'system',
    'ai',
    'battle',
    'challenge',
    'daily',
    'referral',
    'social',
    'content',
    'other'
);


ALTER TYPE "xp"."source_enum" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "ai"."ai_generations_media_owner_check"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$declare
  v_media_lenser uuid;
begin
  select m.lenser_id into v_media_lenser
  from content.media_library m
  where m.id = new.media_id;

  if v_media_lenser is null then
    raise exception 'Media % not found for ai_generation', new.media_id;
  end if;

  if v_media_lenser <> new.lenser_id then
    raise exception 'Media owner and ai_generation lenser_id must match';
  end if;

  return new;
end;$$;


ALTER FUNCTION "ai"."ai_generations_media_owner_check"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "analytics"."log_tag_view"("p_entity_type" "content"."entity_type_enum", "p_entity_id" "uuid", "p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$BEGIN
  INSERT INTO analytics.tag_activity_events (tag_id, entity_type, entity_id, activity_type, actor_id)
  SELECT tag_id, p_entity_type, p_entity_id, 'viewed', p_user_id
  FROM content.tag_map
  WHERE entity_type = p_entity_type AND entity_id = p_entity_id;
END;$$;


ALTER FUNCTION "analytics"."log_tag_view"("p_entity_type" "content"."entity_type_enum", "p_entity_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "analytics"."protect_feedback_system_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.start_date <> OLD.start_date
       OR NEW.end_date <> OLD.end_date
       OR NEW.created_at <> OLD.created_at THEN
         RAISE EXCEPTION 'System-managed timestamps cannot be modified.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "analytics"."protect_feedback_system_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "analytics"."set_feedback_user_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  if auth.uid() is not null then
    new.user_id := auth.uid();
  else
    new.user_id := null;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "analytics"."set_feedback_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "battles"."award_battle_xp"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles', 'xp', 'lensers'
    AS $$
DECLARE
    v_contender RECORD;
    v_voter RECORD;
BEGIN
    -- Only fire when status transitions to 'closed'
    IF NEW.status <> 'closed' OR OLD.status = 'closed' THEN
        RETURN NEW;
    END IF;

    -- Award XP to all human contenders
    FOR v_contender IN
        SELECT c.contender_ref_id AS lenser_id
        FROM battles.contenders c
        WHERE c.battle_id = NEW.id
          AND c.contender_type = 'human'
    LOOP
        PERFORM xp.apply(
            p_lenser_id       := v_contender.lenser_id,
            p_rule_key        := 'battle_participated',
            p_source          := 'battle'::xp.source_enum,
            p_source_ref_type := 'battle',
            p_source_ref_id   := NEW.id
        );
    END LOOP;

    -- Award XP to the winner (if a human won)
    IF NEW.winner_contender_id IS NOT NULL THEN
        DECLARE
            v_winner RECORD;
        BEGIN
            SELECT c.contender_ref_id AS lenser_id, c.contender_type
            INTO v_winner
            FROM battles.contenders c
            WHERE c.id = NEW.winner_contender_id;

            IF v_winner.contender_type = 'human' THEN
                PERFORM xp.apply(
                    p_lenser_id       := v_winner.lenser_id,
                    p_rule_key        := 'battle_won',
                    p_source          := 'battle'::xp.source_enum,
                    p_source_ref_type := 'battle',
                    p_source_ref_id   := NEW.id
                );
            END IF;
        END;
    END IF;

    -- Award XP to all voters
    FOR v_voter IN
        SELECT v.voter_lenser_id AS lenser_id
        FROM battles.votes v
        WHERE v.battle_id = NEW.id
    LOOP
        PERFORM xp.apply(
            p_lenser_id       := v_voter.lenser_id,
            p_rule_key        := 'battle_voted',
            p_source          := 'battle'::xp.source_enum,
            p_source_ref_type := 'battle',
            p_source_ref_id   := NEW.id
        );
    END LOOP;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "battles"."award_battle_xp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "battles"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "battles"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "content"."ensure_public_tag"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$BEGIN
  PERFORM 1 FROM content.tags t
  WHERE t.id = NEW.tag_id AND t.visibility = 'public';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only public tags can be attached.';
  END IF;
  RETURN NEW;
END;$$;


ALTER FUNCTION "content"."ensure_public_tag"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "content"."normalize_website_url"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.website_url = '' THEN
    NEW.website_url := NULL;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "content"."normalize_website_url"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "content"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "content"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "content"."sync_prompt_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'content', 'analytics'
    AS $$DECLARE
  v_lenser_id uuid;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    v_lenser_id := NEW.lenser_id;
  ELSIF (TG_OP = 'DELETE') THEN
    v_lenser_id := OLD.lenser_id;
  ELSE
    RETURN NULL;
  END IF;

  UPDATE analytics.lenser_stats e
  SET prompt_count = (
        SELECT COUNT(*)::int
        FROM content.prompt_templates p
        WHERE p.lenser_id = v_lenser_id
      ),
      updated_at = now()
  WHERE e.lenser_id = v_lenser_id;

  RETURN NULL;
END;$$;


ALTER FUNCTION "content"."sync_prompt_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "content"."sync_thread_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'content', 'analytics'
    AS $$DECLARE
  v_lenser_id uuid;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    v_lenser_id := NEW.lenser_id;
  ELSIF (TG_OP = 'DELETE') THEN
    v_lenser_id := OLD.lenser_id;
  ELSE
    RETURN NULL;
  END IF;

  UPDATE analytics.lenser_stats e
  SET thread_count = (
        SELECT COUNT(*)::int
        FROM content.threads t
        WHERE t.lenser_id = v_lenser_id
      ),
      updated_at = now()
  WHERE e.lenser_id = v_lenser_id;

  RETURN NULL;
END;$$;


ALTER FUNCTION "content"."sync_thread_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "content"."thread_replies_after_delete_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
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
    SET "search_path" TO 'public', 'lensers'
    AS $$
  SELECT id FROM lensers.profiles WHERE user_id = auth.uid() LIMIT 1;
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
    "status" "content"."thread_visibility" DEFAULT 'public'::"content"."thread_visibility" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone
);


ALTER TABLE "content"."thread_replies" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "content"."thread_reply_counts_as_public"("r" "content"."thread_replies") RETURNS boolean
    LANGUAGE "sql"
    AS $$select (r.status = 'public'::content.thread_visibility) and r.deleted_at is null;$$;


ALTER FUNCTION "content"."thread_reply_counts_as_public"("r" "content"."thread_replies") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "content"."toggle_reaction"("p_lenser_id" "uuid", "p_target_type" "text", "p_target_id" "uuid", "p_reaction" "content"."reaction_enum") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$DECLARE
  existing_id uuid;
BEGIN
  -- Check existing reaction
  SELECT id INTO existing_id
  FROM content.reactions
  WHERE lenser_id = p_lenser_id
    AND target_type = p_target_type
    AND target_id = p_target_id
    AND reaction IN ('like','dislike','saved');

  -- copy = unlimited → direct insert
  IF p_reaction = 'copy' THEN
    INSERT INTO content.reactions (lenser_id, target_type, target_id, reaction)
    VALUES (p_lenser_id, p_target_type, p_target_id, p_reaction);
    RETURN jsonb_build_object('status', 'copied');
  END IF;

  -- If exists → DELETE (toggle off)
  IF existing_id IS NOT NULL THEN
    DELETE FROM content.reactions WHERE id = existing_id;
    RETURN jsonb_build_object('status', 'removed');
  END IF;

  -- Else → INSERT (toggle on)
  INSERT INTO content.reactions (lenser_id, target_type, target_id, reaction)
  VALUES (p_lenser_id, p_target_type, p_target_id, p_reaction);

  RETURN jsonb_build_object('status','added');
END;$$;


ALTER FUNCTION "content"."toggle_reaction"("p_lenser_id" "uuid", "p_target_type" "text", "p_target_id" "uuid", "p_reaction" "content"."reaction_enum") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "content"."trg_reactions_refresh_totals"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM content.refresh_reaction_totals(NEW.target_type::text, NEW.target_id);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.target_id IS DISTINCT FROM OLD.target_id
       OR NEW.target_type IS DISTINCT FROM OLD.target_type
       OR NEW.reaction   IS DISTINCT FROM OLD.reaction THEN
      PERFORM content.refresh_reaction_totals(NEW.target_type::text, NEW.target_id);
      PERFORM content.refresh_reaction_totals(OLD.target_type::text, OLD.target_id);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM content.refresh_reaction_totals(OLD.target_type::text, OLD.target_id);
  END IF;

  RETURN NULL;
END;$$;


ALTER FUNCTION "content"."trg_reactions_refresh_totals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "content"."update_prompt_template_reaction_counters"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$declare
  v_template_id uuid;
begin
  -- Only affect prompt_template reactions
  if (NEW.target_type = 'prompt_template') then
    v_template_id := NEW.target_id;

    -- Update reaction_totals (jsonb counters)
    update content.prompt_templates
    set reaction_totals = (
      select jsonb_object_agg(reaction, count)
      from (
        select reaction, count(*) as count
        from content.reactions
        where target_type = 'prompt_template'
          and target_id = v_template_id
        group by reaction
      ) sub
    )
    where id = v_template_id;


  end if;

  return new;
end;$$;


ALTER FUNCTION "content"."update_prompt_template_reaction_counters"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "content"."user_owns_prompt"("template_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$select exists (
    select 1
    from content.prompt_templates pt
    join lensers.profiles l on l.id = pt.lenser_id
    where pt.id = template_id
      and l.user_id = auth.uid()
  );$$;


ALTER FUNCTION "content"."user_owns_prompt"("template_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "content"."user_owns_thread"("thread_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$select exists (
    select 1
    from content.threads t
    join lensers.profiles l on l.id = t.lenser_id
    where t.id = thread_id
      and l.user_id = auth.uid()
  );$$;


ALTER FUNCTION "content"."user_owns_thread"("thread_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lensers"."anonymize_join_log"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'analytics'
    AS $$BEGIN
  UPDATE analytics.lenser_join_log
  SET lenser_id = NULL
  WHERE lenser_id = OLD.id;
  RETURN OLD;
END;$$;


ALTER FUNCTION "lensers"."anonymize_join_log"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lensers"."assign_country_join_order"("p_lenser_id" "uuid", "p_country_code" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'analytics'
    AS $$DECLARE
  v_order bigint;
BEGIN
  -- Kaç kişi bu ülkeden var?
  SELECT COUNT(*) + 1 INTO v_order
  FROM analytics.lenser_country_join_log
  WHERE country_code = p_country_code;

  INSERT INTO analytics.lenser_country_join_log (
    lenser_id, country_code, country_join_order
  )
  VALUES (p_lenser_id, p_country_code, v_order);
END;$$;


ALTER FUNCTION "lensers"."assign_country_join_order"("p_lenser_id" "uuid", "p_country_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lensers"."auto_award_badges_from_join_order"("p_lenser_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'analytics'
    AS $$DECLARE
  v_join_order bigint;
BEGIN
  -- lenser_join_log içinden global join_order çek
  SELECT join_order
  INTO v_join_order
  FROM analytics.lenser_join_log
  WHERE lenser_id = p_lenser_id;

  IF v_join_order IS NULL THEN
    RETURN;
  END IF;

  -- İlk 10: FOUNDING_10
  IF v_join_order <= 10 THEN
    PERFORM lensers.award_badge(
      p_lenser_id,
      'FOUNDING_10',
      'Founding Member (Top 10)',
      'You are among the first 10 Lensers!'
    );
  END IF;

  -- İlk 100: FOUNDING_100
  IF v_join_order <= 100 THEN
    PERFORM lensers.award_badge(
      p_lenser_id,
      'FOUNDING_100',
      'Founding Member (Top 100)',
      'You are among the first 100 Lensers!'
    );
  END IF;

  -- İlk 1000: FOUNDING_1000
  IF v_join_order <= 1000 THEN
    PERFORM lensers.award_badge(
      p_lenser_id,
      'FOUNDING_1000',
      'Founding Member (Top 1000)',
      'You are among the first 1000 Lensers!'
    );
  END IF;
END;$$;


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


CREATE OR REPLACE FUNCTION "lensers"."auto_award_country_badges"("p_lenser_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'analytics'
    AS $$DECLARE
  v_country_order bigint;
  v_country text;
BEGIN
  SELECT country_code, country_join_order
  INTO v_country, v_country_order
  FROM analytics.lenser_country_join_log
  WHERE lenser_id = p_lenser_id;

  -- FIRST IN COUNTRY
  IF v_country_order = 1 THEN
    PERFORM award_badge(p_lenser_id, 'COUNTRY_TOP_1',
      'Pioneer of ' || v_country,
      'First Lenser registered from this country');
  END IF;

  -- TOP 10
  IF v_country_order <= 10 THEN
    PERFORM award_badge(p_lenser_id, 'COUNTRY_TOP_10',
      'Top 10 in ' || v_country,
      'Among the first 10 Lensers from this country');
  END IF;

  -- TOP 100
  IF v_country_order <= 100 THEN
    PERFORM award_badge(p_lenser_id, 'COUNTRY_TOP_100',
      'Top 100 in ' || v_country,
      'Among the first 100 Lensers from this country');
  END IF;

END;$$;


ALTER FUNCTION "lensers"."auto_award_country_badges"("p_lenser_id" "uuid") OWNER TO "postgres";


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
    AS $$SELECT id
  FROM lensers.profiles
  WHERE user_id = auth.uid()
    AND status = 'active'
  LIMIT 1;$$;


ALTER FUNCTION "lensers"."current_active_lenser_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lensers"."delete_expired_lensers"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'analytics', 'content'
    AS $$DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT id
    FROM lensers.profiles
    WHERE deletion_requested_at IS NOT NULL
      AND deletion_requested_at <= now() - INTERVAL '5 minutes'
  LOOP
    -- 1) Kullanıcıya ait tüm içerik silinir

    DELETE FROM content.reactions
      WHERE lenser_id = rec.id;

    DELETE FROM content.thread_replies
      WHERE lenser_id = rec.id;

    DELETE FROM content.threads
      WHERE lenser_id = rec.id;

    DELETE FROM content.prompt_templates
      WHERE lenser_id = rec.id;

    DELETE FROM lensers.social_links
      WHERE lenser_id = rec.id;

    -- Eğer başka bağlı tablolar varsa ekleyebilirsin:
    -- DELETE FROM public.notifications WHERE lenser_id = rec.id;
    -- DELETE FROM public.xp_events WHERE lenser_id = rec.id;

    -- 2) En son: lenser kaydını sil
    DELETE FROM lensers.profiles
      WHERE id = rec.id;
  END LOOP;
END;$$;


ALTER FUNCTION "lensers"."delete_expired_lensers"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lensers"."enforce_deletion_request"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- kullanıcı ilk kez deletion_requested_at set ediyorsa
  IF NEW.deletion_requested_at IS NOT NULL AND OLD.deletion_requested_at IS NULL THEN
    NEW.deletion_requested_at := now();
  END IF;

  -- tekrar set edilmek istenirse engelle
  IF OLD.deletion_requested_at IS NOT NULL AND NEW.deletion_requested_at IS DISTINCT FROM OLD.deletion_requested_at THEN
    RAISE EXCEPTION 'Deletion request can only be set once.';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "lensers"."enforce_deletion_request"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lensers"."enforce_lensers_protections"() RETURNS "trigger"
    LANGUAGE "plpgsql"
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


CREATE OR REPLACE FUNCTION "lensers"."init_lenser_engagement_row"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'analytics'
    AS $$BEGIN
  INSERT INTO analytics.lenser_stats (lenser_id)
  VALUES (NEW.id)
  ON CONFLICT (lenser_id) DO NOTHING;

  RETURN NEW;
END;$$;


ALTER FUNCTION "lensers"."init_lenser_engagement_row"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lensers"."is_active_lenser"("p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$SELECT EXISTS (
    SELECT 1
    FROM lensers.profiles
    WHERE user_id = p_user_id
      AND status = 'active'
      AND deletion_requested_at IS NULL
  );$$;


ALTER FUNCTION "lensers"."is_active_lenser"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lensers"."log_lenser_join"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$begin
  -- Aynı lenser için tekrar yazmaya çalışılırsa dokunma
  insert into analytics.lenser_join_log (lenser_id)
  values (new.id)
  on conflict (lenser_id) do nothing;

  return new;
end;$$;


ALTER FUNCTION "lensers"."log_lenser_join"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lensers"."prevent_lenser_join_log_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Fix: Update error message to point to correct schema (analytics)
  RAISE EXCEPTION 'Deletion from analytics.lenser_join_log is not allowed';
END;
$$;


ALTER FUNCTION "lensers"."prevent_lenser_join_log_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lensers"."prevent_lenser_join_log_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF old.join_order <> new.join_order OR old.lenser_id <> new.lenser_id THEN
    -- Fix: Update error message to point to correct schema (analytics)
    RAISE EXCEPTION 'join_order and lenser_id are immutable on analytics.lenser_join_log';
  END IF;
  RETURN new;
END;
$$;


ALTER FUNCTION "lensers"."prevent_lenser_join_log_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lensers"."protect_sensitive_lenser_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql"
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

    -- is_super_admin değişikliği
    IF NEW.is_super_admin IS DISTINCT FROM OLD.is_super_admin THEN
      RAISE EXCEPTION 'is_super_admin can only be modified by service_role';
    END IF;

  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "lensers"."protect_sensitive_lenser_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lensers"."sync_join_order"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$BEGIN
  UPDATE lensers.profiles
  SET join_order = NEW.join_order
  WHERE id = NEW.lenser_id;
  RETURN NEW;
END;$$;


ALTER FUNCTION "lensers"."sync_join_order"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lensers"."sync_profile_from_auth_metadata"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  auth_metadata jsonb;
  v_lang_code text;
BEGIN
  SELECT raw_user_meta_data
  INTO auth_metadata
  FROM auth.users
  WHERE id = NEW.user_id;

  IF auth_metadata IS NOT NULL THEN
    v_lang_code := auth_metadata->>'preferred_language';

    IF NEW.preferred_language IS NULL
       AND v_lang_code IS NOT NULL
       AND EXISTS (SELECT 1 FROM core.languages WHERE code = v_lang_code)
    THEN
      NEW.preferred_language := v_lang_code;
    END IF;

    IF NEW.country IS NULL THEN
      NEW.country := auth_metadata->>'country';
    END IF;

    IF NEW.timezone IS NULL THEN
      NEW.timezone := auth_metadata->>'timezone';
    END IF;
  END IF;

  IF NEW.preferred_language IS NULL
     OR NOT EXISTS (SELECT 1 FROM core.languages WHERE code = NEW.preferred_language)
  THEN
    NEW.preferred_language := 'en';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "lensers"."sync_profile_from_auth_metadata"() OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "lensers"."trg_create_join_log"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'analytics'
    AS $$BEGIN
  INSERT INTO analytics.lenser_join_log (lenser_id)
  VALUES (NEW.id);
  RETURN NEW;
END;$$;


ALTER FUNCTION "lensers"."trg_create_join_log"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lensers"."trg_handle_deletion_request"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'analytics'
    AS $$
BEGIN
  -- Eğer yeni değer NOT NULL ve eski değer NULL ise = ilk silme talebi
  IF NEW.deletion_requested_at IS NOT NULL AND OLD.deletion_requested_at IS NULL THEN

    -- Hesabı anında devre dışı bırak
    NEW.status := 'deactivated';

    -- Güvenlik için timestamp’i override et (istemci manipüle edemesin)
    NEW.deletion_requested_at := now();
  END IF;

  -- Eğer deletion_requested_at daha önce set edilmişse değişime izin verme
  IF OLD.deletion_requested_at IS NOT NULL
     AND NEW.deletion_requested_at IS DISTINCT FROM OLD.deletion_requested_at THEN
    RAISE EXCEPTION 'Deletion request can only be set once.';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "lensers"."trg_handle_deletion_request"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lensers"."trg_log_lenser_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$DECLARE
  v_lenser_id uuid;
BEGIN
  -- Find matching Lenser profile
  SELECT id INTO v_lenser_id
  FROM lensers.profiles
  WHERE user_id = NEW.id;

  -- If no lenser exists, ignore
  IF v_lenser_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only act on REAL login event
  IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
    INSERT INTO analytics.lenser_activity (lenser_id, activity_type)
    VALUES (v_lenser_id, 'login');
  END IF;

  RETURN NEW;
END;$$;


ALTER FUNCTION "lensers"."trg_log_lenser_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "lensers"."trg_log_login_from_auth"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$DECLARE
  v_lenser_id uuid;
BEGIN
  -- Find linked Lenser profile
  SELECT id INTO v_lenser_id
  FROM lensers.profiles
  WHERE user_id = NEW.user_id;

  IF v_lenser_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only react when a real login happened
  IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
    
    -- Update lenser login metrics
    UPDATE lensers.profiles
    SET 
      last_login_at = NEW.last_sign_in_at,
      last_active_at = now(),
      login_count = COALESCE(login_count, 0) + 1
    WHERE id = v_lenser_id;

    -- Insert activity row
    INSERT INTO analytics.lenser_activity (lenser_id, activity_type)
    VALUES (v_lenser_id, 'login');
  END IF;

  RETURN NEW;
END;$$;


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
    AS $$select exists (
    select 1 from lensers.profiles l
    where l.id = lenser_id
      and l.user_id = auth.uid()
  );$$;


ALTER FUNCTION "lensers"."user_owns_lenser"("lenser_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_ai_create_generation"("p_ai_model_slug" "text", "p_prompt_template_id" "uuid", "p_media" "jsonb", "p_input_text" "text" DEFAULT NULL::"text", "p_visibility" "content"."visibility_enum" DEFAULT 'private'::"content"."visibility_enum", "p_original_chat_url" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
    v_user_id uuid;
    v_lenser_id uuid;
    v_media_id uuid;
    v_ai_model_id uuid;
begin
    -- Auth
    v_user_id := auth.uid();
    if v_user_id is null then
        raise exception 'AUTH_REQUIRED';
    end if;

    -- Resolve lenser
    select lenser_id
    into v_lenser_id
    from public.vw_auth_lenser
    where user_id = v_user_id;

    if v_lenser_id is null then
        raise exception 'LENSER_PROFILE_REQUIRED';
    end if;

    -- Resolve AI model by slug
    select id
    into v_ai_model_id
    from ai.models
    where slug = p_ai_model_slug;

    if v_ai_model_id is null then
        raise exception 'INVALID_AI_MODEL_SLUG';
    end if;

    -- Validate media payload
    if p_media is null or jsonb_typeof(p_media) <> 'object' then
        raise exception 'INVALID_MEDIA_PAYLOAD';
    end if;

    -- Insert media (MATCHES content.media_library)
    insert into content.media_library (
        lenser_id,
        url,
        file_name,
        mime_type,
        media_kind,
        meta
    )
    values (
        v_lenser_id,
        p_media->>'url',
        p_media->>'file_name',
        p_media->>'mime_type',
        p_media->>'media_kind',
        coalesce(p_media->'meta', '{}'::jsonb)
    )
    returning id into v_media_id;

    -- Insert generation
    insert into ai.generations (
        lenser_id,
        ai_model_id,
        prompt_template_id,
        media_id,
        input_text,
        visibility,
        original_chat_url
    )
    values (
        v_lenser_id,
        v_ai_model_id,
        p_prompt_template_id,
        v_media_id,
        p_input_text,
        p_visibility,
        p_original_chat_url
    );

    return jsonb_build_object('success', true);

exception
    when others then
        return jsonb_build_object(
            'success', false,
            'error', sqlerrm,
            'state', sqlstate
        );
end;
$$;


ALTER FUNCTION "public"."fn_ai_create_generation"("p_ai_model_slug" "text", "p_prompt_template_id" "uuid", "p_media" "jsonb", "p_input_text" "text", "p_visibility" "content"."visibility_enum", "p_original_chat_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_ai_get_generations_for_prompt"("p_prompt_template_id" "uuid", "p_lenser_id" "uuid", "p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0, "p_media_kind" "text" DEFAULT NULL::"text", "p_ai_model_slug" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "ai_model_slug" "text", "prompt_template_id" "uuid", "input_text" "text", "input_params" "jsonb", "output_type" "text", "visibility" "content"."visibility_enum", "created_at" timestamp with time zone, "original_chat_url" "text", "media" "jsonb")
    LANGUAGE "sql" STABLE
    AS $$
  select
    g.id,
    m.slug as ai_model_slug,
    g.prompt_template_id,
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
    g.prompt_template_id = p_prompt_template_id
    and g.lenser_id = p_lenser_id
    and (p_ai_model_slug is null or m.slug = p_ai_model_slug)
    and (p_media_kind is null or ml.media_kind = p_media_kind)
  order by g.created_at desc
  limit p_limit
  offset p_offset;
$$;


ALTER FUNCTION "public"."fn_ai_get_generations_for_prompt"("p_prompt_template_id" "uuid", "p_lenser_id" "uuid", "p_limit" integer, "p_offset" integer, "p_media_kind" "text", "p_ai_model_slug" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_analytics_product_feedback_list_user_paginated"("p_offset" integer DEFAULT 0, "p_limit" integer DEFAULT 5) RETURNS TABLE("product_tag" "text", "page" "text", "message" "text", "start_date" timestamp with time zone, "end_date" timestamp with time zone, "status" "text", "created_at" timestamp with time zone, "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'analytics', 'auth'
    AS $$
begin
  return query
  select
    f.product_tag::text,
    f.page,
    f.message,
    f.start_date,
    f.end_date,
    f.status::text,
    f.created_at,
    count(*) over() as total_count
  from analytics.product_feedback f
  where f.user_id = auth.uid()
  order by f.created_at desc
  offset p_offset
  limit p_limit;
end;
$$;


ALTER FUNCTION "public"."fn_analytics_product_feedback_list_user_paginated"("p_offset" integer, "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_analytics_share_events_log"("p_short_id" "text", "p_event_type" "text" DEFAULT 'opened'::"text", "p_ip_hash" "text" DEFAULT NULL::"text", "p_user_agent" "text" DEFAULT NULL::"text", "p_referer" "text" DEFAULT NULL::"text", "p_country" "text" DEFAULT NULL::"text", "p_city" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'analytics', 'lensers', 'auth'
    AS $$
DECLARE
  v_user_id uuid;
  v_lenser_id uuid;
  v_link_id uuid;
BEGIN
  ------------------------------------------------------------
  -- Extract JWT user_id (NULL if anonymous)
  ------------------------------------------------------------
  BEGIN
    v_user_id := (auth.jwt() ->> 'sub')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  ------------------------------------------------------------
  -- Detect Lenser profile
  ------------------------------------------------------------
  IF v_user_id IS NOT NULL THEN
    SELECT id INTO v_lenser_id
    FROM lensers.profiles
    WHERE user_id = v_user_id;
  END IF;

  ------------------------------------------------------------
  -- Get link id from short_id
  ------------------------------------------------------------
  SELECT id INTO v_link_id
  FROM analytics.shared_links
  WHERE short_id = p_short_id;

  IF v_link_id IS NULL THEN
    RAISE EXCEPTION 'Shared link not found';
  END IF;

  ------------------------------------------------------------
  -- Insert event
  ------------------------------------------------------------
  INSERT INTO analytics.share_events (
    shared_link_id,
    event_type,
    viewer_lenser_id,
    ip_hash,
    user_agent,
    referer,
    country,
    city
  )
  VALUES (
    v_link_id,
    p_event_type,
    v_lenser_id,
    p_ip_hash,
    p_user_agent,
    p_referer,
    p_country,
    p_city
  );

END;
$$;


ALTER FUNCTION "public"."fn_analytics_share_events_log"("p_short_id" "text", "p_event_type" "text", "p_ip_hash" "text", "p_user_agent" "text", "p_referer" "text", "p_country" "text", "p_city" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "analytics"."shared_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "short_id" "text" NOT NULL,
    "resource_type" "text" NOT NULL,
    "resource_id" "uuid" NOT NULL,
    "slug" "text",
    "creator_lenser_id" "uuid",
    "channel" "text" DEFAULT 'in_app'::"text" NOT NULL,
    "campaign_key" "text",
    "experiment_key" "text",
    "experiment_variant" "text",
    "meta" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "display_name" "text"
);


ALTER TABLE "analytics"."shared_links" OWNER TO "postgres";


COMMENT ON TABLE "analytics"."shared_links" IS 'Configuration for shareable short links in LenserFight (per resource, per Lenser, per campaign).';



COMMENT ON COLUMN "analytics"."shared_links"."creator_lenser_id" IS 'FK to lensers.id; used for RLS (each Lenser sees only their own links).';



CREATE OR REPLACE FUNCTION "public"."fn_analytics_shared_links_create"("p_resource_type" "text", "p_resource_id" "text" DEFAULT NULL::"text", "p_slug" "text" DEFAULT NULL::"text", "p_channel" "text" DEFAULT 'in_app'::"text", "p_meta" "jsonb" DEFAULT '{}'::"jsonb", "p_display_name" "text" DEFAULT NULL::"text") RETURNS "analytics"."shared_links"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'analytics', 'lensers', 'auth'
    AS $$
DECLARE
  v_user_id       uuid;
  v_lenser_id     uuid;
  v_resource_uuid uuid;
  v_short_id      text;
  v_new           analytics.shared_links;
  v_handle        text;
  v_recent_count  integer;
BEGIN
  --------------------------------------------------------------------
  -- 1. Identify the creator from JWT
  --------------------------------------------------------------------
  BEGIN
    v_user_id := (auth.jwt() ->> 'sub')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  IF v_user_id IS NOT NULL THEN
    SELECT id INTO v_lenser_id
    FROM lensers.profiles
    WHERE user_id = v_user_id;
  END IF;

  --------------------------------------------------------------------
  -- 2. Anti-abuse rate limiting (adjust thresholds as needed)
  --------------------------------------------------------------------
  IF v_lenser_id IS NOT NULL THEN
    SELECT count(*) INTO v_recent_count
    FROM analytics.shared_links
    WHERE creator_lenser_id = v_lenser_id
      AND created_at >= now() - interval '1 minute';

    IF v_recent_count > 5 THEN
      RAISE EXCEPTION 'Rate limit exceeded: too many shared links created recently';
    END IF;
  END IF;

  --------------------------------------------------------------------
  -- 3. Resolve resource identity
  --------------------------------------------------------------------

  -- PROFILE: use handle (p_resource_id or p_slug)
  IF p_resource_type = 'profile' THEN
    v_handle := COALESCE(p_resource_id, p_slug);

    IF v_handle IS NULL THEN
      RAISE EXCEPTION 'Profile handle cannot be null';
    END IF;

    SELECT id INTO v_resource_uuid
    FROM lensers.profiles
    WHERE handle = v_handle;

    IF v_resource_uuid IS NULL THEN
      RAISE EXCEPTION 'Profile handle % not found', v_handle;
    END IF;

  -- PROMPT: require UUID
  ELSIF p_resource_type = 'prompt' THEN
    v_resource_uuid := p_resource_id::uuid;

  -- THREAD: require UUID
  ELSIF p_resource_type = 'thread' THEN
    v_resource_uuid := p_resource_id::uuid;

  -- EXTERNAL: synthetic canonical id
  ELSIF p_resource_type = 'external' THEN
    BEGIN
      v_resource_uuid := COALESCE(p_resource_id::uuid, gen_random_uuid());
    EXCEPTION
      WHEN OTHERS THEN v_resource_uuid := gen_random_uuid();
    END;

  ELSE
    RAISE EXCEPTION 'Unknown resource_type %', p_resource_type;
  END IF;

  --------------------------------------------------------------------
  -- 4. Generate a new short_id each time
  --------------------------------------------------------------------
  v_short_id := substring(md5(random()::text) FROM 1 FOR 8);

  --------------------------------------------------------------------
  -- 5. Insert new shared link
  --------------------------------------------------------------------
  INSERT INTO analytics.shared_links (
    short_id,
    resource_type,
    resource_id,
    slug,
    creator_lenser_id,
    channel,
    meta,
    display_name
  )
  VALUES (
    v_short_id,
    p_resource_type,
    v_resource_uuid,
    p_slug,
    v_lenser_id,
    p_channel,
    p_meta,
    p_display_name
  )
  RETURNING * INTO v_new;

  RETURN v_new;
END;
$$;


ALTER FUNCTION "public"."fn_analytics_shared_links_create"("p_resource_type" "text", "p_resource_id" "text", "p_slug" "text", "p_channel" "text", "p_meta" "jsonb", "p_display_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_analytics_shared_links_get"("p_short_id" "text") RETURNS "analytics"."shared_links"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'analytics'
    AS $$
DECLARE
  v_link analytics.shared_links;
BEGIN
  SELECT *
  INTO v_link
  FROM analytics.shared_links
  WHERE short_id = p_short_id;

  IF v_link.id IS NULL THEN
    RAISE EXCEPTION 'Shared link not found';
  END IF;

  RETURN v_link;
END;
$$;


ALTER FUNCTION "public"."fn_analytics_shared_links_get"("p_short_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_battles_create"("p_title" "text", "p_slug" "text", "p_task_prompt" "text", "p_rubric_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles', 'lensers'
    AS $$
DECLARE
    v_lenser_id uuid;
    v_battle_id uuid;
BEGIN
    v_lenser_id := lensers.get_auth_lenser_id();
    IF v_lenser_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    INSERT INTO battles.battles (creator_lenser_id, title, slug, task_prompt, rubric_id, status)
    VALUES (v_lenser_id, p_title, p_slug, p_task_prompt, p_rubric_id, 'draft')
    RETURNING id INTO v_battle_id;

    RETURN v_battle_id;
END;
$$;


ALTER FUNCTION "public"."fn_battles_create"("p_title" "text", "p_slug" "text", "p_task_prompt" "text", "p_rubric_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_battles_finalize"("p_battle_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles', 'lensers', 'xp'
    AS $$
DECLARE
    v_battle RECORD;
    v_count_a int;
    v_count_b int;
    v_count_draw int;
    v_winner_id uuid;
    v_contender_a uuid;
    v_contender_b uuid;
BEGIN
    SELECT * INTO v_battle
    FROM battles.battles WHERE id = p_battle_id;

    IF v_battle IS NULL THEN
        RAISE EXCEPTION 'Battle not found';
    END IF;

    IF v_battle.status NOT IN ('voting', 'scoring') THEN
        RAISE EXCEPTION 'Battle must be in voting or scoring status to finalize (current: %)', v_battle.status;
    END IF;

    -- Count votes
    SELECT
        COUNT(*) FILTER (WHERE vote_value = 'contender_a'),
        COUNT(*) FILTER (WHERE vote_value = 'contender_b'),
        COUNT(*) FILTER (WHERE vote_value = 'draw')
    INTO v_count_a, v_count_b, v_count_draw
    FROM battles.votes WHERE battle_id = p_battle_id;

    -- Look up contender IDs by slot
    SELECT id INTO v_contender_a
    FROM battles.contenders WHERE battle_id = p_battle_id AND slot = 'A';

    SELECT id INTO v_contender_b
    FROM battles.contenders WHERE battle_id = p_battle_id AND slot = 'B';

    -- Determine winner
    IF v_count_a > v_count_b THEN
        v_winner_id := v_contender_a;
    ELSIF v_count_b > v_count_a THEN
        v_winner_id := v_contender_b;
    ELSE
        v_winner_id := NULL; -- draw
    END IF;

    -- Update battle — the trg_award_battle_xp trigger handles XP
    UPDATE battles.battles
    SET status = 'closed',
        vote_count_a = v_count_a,
        vote_count_b = v_count_b,
        vote_count_draw = v_count_draw,
        winner_contender_id = v_winner_id,
        finalized_at = now(),
        updated_at = now()
    WHERE id = p_battle_id;
END;
$$;


ALTER FUNCTION "public"."fn_battles_finalize"("p_battle_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_battles_get_public"("p_battle_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles'
    AS $$
DECLARE
    v_battle RECORD;
    v_result jsonb;
BEGIN
    SELECT * INTO v_battle
    FROM battles.battles
    WHERE id = p_battle_id
      AND status IN ('voting', 'scoring', 'closed', 'published')
      AND deleted_at IS NULL;

    IF v_battle IS NULL THEN
        RETURN NULL;
    END IF;

    v_result := jsonb_build_object(
        'id', v_battle.id,
        'title', v_battle.title,
        'slug', v_battle.slug,
        'task_prompt', v_battle.task_prompt,
        'status', v_battle.status,
        'max_contenders', v_battle.max_contenders,
        'voting_opens_at', v_battle.voting_opens_at,
        'voting_closes_at', v_battle.voting_closes_at,
        'published_at', v_battle.published_at,
        'finalized_at', v_battle.finalized_at,
        'vote_count_a', v_battle.vote_count_a,
        'vote_count_b', v_battle.vote_count_b,
        'vote_count_draw', v_battle.vote_count_draw,
        'winner_contender_id', v_battle.winner_contender_id,
        'created_at', v_battle.created_at,
        'contenders', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'id', c.id,
                'slot', c.slot,
                'contender_type', c.contender_type,
                'display_name', c.display_name
            ) ORDER BY c.slot), '[]'::jsonb)
            FROM battles.contenders c WHERE c.battle_id = p_battle_id
        ),
        'submissions', CASE
            WHEN v_battle.status IN ('voting', 'scoring', 'closed', 'published') THEN (
                SELECT COALESCE(jsonb_agg(jsonb_build_object(
                    'id', s.id,
                    'contender_id', s.contender_id,
                    'status', s.status,
                    'content_text', s.content_text,
                    'content_url', s.content_url,
                    'submitted_at', s.submitted_at
                )), '[]'::jsonb)
                FROM battles.submissions s WHERE s.battle_id = p_battle_id AND s.status = 'submitted'
            )
            ELSE '[]'::jsonb
        END,
        'votes', CASE
            WHEN v_battle.status IN ('closed', 'published') THEN (
                SELECT COALESCE(jsonb_agg(jsonb_build_object(
                    'id', v.id,
                    'voter_lenser_id', v.voter_lenser_id,
                    'vote_value', v.vote_value,
                    'rationale', v.rationale
                )), '[]'::jsonb)
                FROM battles.votes v WHERE v.battle_id = p_battle_id
            )
            ELSE '[]'::jsonb
        END,
        'scorecards', CASE
            WHEN v_battle.status IN ('closed', 'published') THEN (
                SELECT COALESCE(jsonb_agg(jsonb_build_object(
                    'id', sc.id,
                    'contender_id', sc.contender_id,
                    'rubric_criterion_id', sc.rubric_criterion_id,
                    'result', sc.result,
                    'explanation', sc.explanation
                )), '[]'::jsonb)
                FROM battles.scorecards sc WHERE sc.battle_id = p_battle_id
            )
            ELSE '[]'::jsonb
        END
    );

    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."fn_battles_get_public"("p_battle_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_battles_join"("p_battle_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles', 'lensers'
    AS $$
DECLARE
    v_lenser_id uuid;
    v_lenser RECORD;
    v_battle RECORD;
    v_count int;
    v_next_slot char(1);
    v_contender_id uuid;
BEGIN
    v_lenser_id := lensers.get_auth_lenser_id();
    IF v_lenser_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT display_name INTO v_lenser
    FROM lensers.profiles WHERE id = v_lenser_id;

    SELECT * INTO v_battle
    FROM battles.battles WHERE id = p_battle_id;

    IF v_battle IS NULL THEN
        RAISE EXCEPTION 'Battle not found';
    END IF;

    IF v_battle.status <> 'open' THEN
        RAISE EXCEPTION 'Battle is not open for joining';
    END IF;

    -- Check if already a contender
    IF EXISTS (
        SELECT 1 FROM battles.contenders
        WHERE battle_id = p_battle_id AND contender_ref_id = v_lenser_id
    ) THEN
        RAISE EXCEPTION 'Already a contender in this battle';
    END IF;

    -- Check contender count
    SELECT COUNT(*) INTO v_count
    FROM battles.contenders WHERE battle_id = p_battle_id;

    IF v_count >= v_battle.max_contenders THEN
        RAISE EXCEPTION 'Battle is full (% / %)', v_count, v_battle.max_contenders;
    END IF;

    -- Assign next slot (A, B, C, ...)
    v_next_slot := chr(65 + v_count);

    INSERT INTO battles.contenders (battle_id, slot, contender_type, contender_ref_id, display_name)
    VALUES (p_battle_id, v_next_slot, 'human', v_lenser_id, v_lenser.display_name)
    RETURNING id INTO v_contender_id;

    -- Auto-create pending submission
    INSERT INTO battles.submissions (battle_id, contender_id, status)
    VALUES (p_battle_id, v_contender_id, 'pending');

    RETURN v_contender_id;
END;
$$;


ALTER FUNCTION "public"."fn_battles_join"("p_battle_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_battles_list_public"("p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles'
    AS $$
DECLARE
    v_result jsonb;
BEGIN
    SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb) INTO v_result
    FROM (
        SELECT jsonb_build_object(
            'id', b.id,
            'title', b.title,
            'slug', b.slug,
            'status', b.status,
            'creator_lenser_id', b.creator_lenser_id,
            'vote_count_a', b.vote_count_a,
            'vote_count_b', b.vote_count_b,
            'vote_count_draw', b.vote_count_draw,
            'created_at', b.created_at,
            'contender_count', (
                SELECT COUNT(*) FROM battles.contenders c WHERE c.battle_id = b.id
            )
        ) AS row_data
        FROM battles.battles b
        WHERE b.status IN ('voting', 'scoring', 'closed', 'published')
          AND b.deleted_at IS NULL
        ORDER BY b.created_at DESC
        LIMIT p_limit OFFSET p_offset
    ) sub;

    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."fn_battles_list_public"("p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_battles_open"("p_battle_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles', 'lensers'
    AS $$
DECLARE
    v_battle RECORD;
    v_code text;
BEGIN
    SELECT * INTO v_battle
    FROM battles.battles
    WHERE id = p_battle_id;

    IF v_battle IS NULL THEN
        RAISE EXCEPTION 'Battle not found';
    END IF;

    IF v_battle.creator_lenser_id <> lensers.get_auth_lenser_id() THEN
        RAISE EXCEPTION 'Only the battle creator can open a battle';
    END IF;

    IF v_battle.status <> 'draft' THEN
        RAISE EXCEPTION 'Battle must be in draft status to open (current: %)', v_battle.status;
    END IF;

    -- Generate invite code if not set
    v_code := v_battle.invite_code;
    IF v_code IS NULL THEN
        v_code := upper(substr(md5(gen_random_uuid()::text), 1, 8));
    END IF;

    UPDATE battles.battles
    SET status = 'open', invite_code = v_code, updated_at = now()
    WHERE id = p_battle_id;
END;
$$;


ALTER FUNCTION "public"."fn_battles_open"("p_battle_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_battles_start_voting"("p_battle_id" "uuid", "p_voting_closes_at" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles', 'lensers'
    AS $$
DECLARE
    v_battle RECORD;
    v_pending int;
BEGIN
    SELECT * INTO v_battle
    FROM battles.battles WHERE id = p_battle_id;

    IF v_battle IS NULL THEN
        RAISE EXCEPTION 'Battle not found';
    END IF;

    IF v_battle.creator_lenser_id <> lensers.get_auth_lenser_id() THEN
        RAISE EXCEPTION 'Only the battle creator can start voting';
    END IF;

    IF v_battle.status <> 'open' THEN
        RAISE EXCEPTION 'Battle must be open to start voting (current: %)', v_battle.status;
    END IF;

    -- Check all contenders have submitted
    SELECT COUNT(*) INTO v_pending
    FROM battles.submissions s
    WHERE s.battle_id = p_battle_id AND s.status = 'pending';

    IF v_pending > 0 THEN
        RAISE EXCEPTION '% contender(s) have not submitted yet', v_pending;
    END IF;

    UPDATE battles.battles
    SET status = 'voting',
        voting_opens_at = now(),
        voting_closes_at = p_voting_closes_at,
        updated_at = now()
    WHERE id = p_battle_id;
END;
$$;


ALTER FUNCTION "public"."fn_battles_start_voting"("p_battle_id" "uuid", "p_voting_closes_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_battles_submit"("p_battle_id" "uuid", "p_content_text" "text" DEFAULT NULL::"text", "p_content_url" "text" DEFAULT NULL::"text", "p_content_media" "jsonb" DEFAULT NULL::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles', 'lensers'
    AS $$
DECLARE
    v_lenser_id uuid;
    v_contender RECORD;
    v_battle RECORD;
    v_submission_id uuid;
BEGIN
    v_lenser_id := lensers.get_auth_lenser_id();
    IF v_lenser_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT * INTO v_battle
    FROM battles.battles WHERE id = p_battle_id;

    IF v_battle IS NULL OR v_battle.status <> 'open' THEN
        RAISE EXCEPTION 'Battle is not open for submissions';
    END IF;

    SELECT * INTO v_contender
    FROM battles.contenders
    WHERE battle_id = p_battle_id
      AND contender_type = 'human'
      AND contender_ref_id = v_lenser_id;

    IF v_contender IS NULL THEN
        RAISE EXCEPTION 'You are not a contender in this battle';
    END IF;

    IF p_content_text IS NULL AND p_content_url IS NULL THEN
        RAISE EXCEPTION 'At least content_text or content_url is required';
    END IF;

    UPDATE battles.submissions
    SET status = 'submitted',
        content_text = p_content_text,
        content_url = p_content_url,
        content_media = COALESCE(p_content_media, '[]'::jsonb),
        submitted_at = now(),
        updated_at = now()
    WHERE battle_id = p_battle_id AND contender_id = v_contender.id
    RETURNING id INTO v_submission_id;

    RETURN v_submission_id;
END;
$$;


ALTER FUNCTION "public"."fn_battles_submit"("p_battle_id" "uuid", "p_content_text" "text", "p_content_url" "text", "p_content_media" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_battles_vote"("p_battle_id" "uuid", "p_vote" "battles"."vote_value_enum", "p_rationale" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles', 'lensers'
    AS $$
DECLARE
    v_lenser_id uuid;
    v_battle RECORD;
BEGIN
    v_lenser_id := lensers.get_auth_lenser_id();
    IF v_lenser_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT * INTO v_battle
    FROM battles.battles WHERE id = p_battle_id;

    IF v_battle IS NULL THEN
        RAISE EXCEPTION 'Battle not found';
    END IF;

    IF v_battle.status <> 'voting' THEN
        RAISE EXCEPTION 'Battle is not in voting phase';
    END IF;

    -- Check voting window
    IF v_battle.voting_closes_at IS NOT NULL AND now() > v_battle.voting_closes_at THEN
        RAISE EXCEPTION 'Voting window has closed';
    END IF;

    -- Prevent contenders from voting on their own battle
    IF EXISTS (
        SELECT 1 FROM battles.contenders c
        WHERE c.battle_id = p_battle_id
          AND c.contender_type = 'human'
          AND c.contender_ref_id = v_lenser_id
    ) THEN
        RAISE EXCEPTION 'Contenders cannot vote on their own battle';
    END IF;

    -- Delete existing vote if any, then insert new
    DELETE FROM battles.votes
    WHERE battle_id = p_battle_id AND voter_lenser_id = v_lenser_id;

    INSERT INTO battles.votes (battle_id, voter_lenser_id, vote_value, rationale)
    VALUES (p_battle_id, v_lenser_id, p_vote, p_rationale);
END;
$$;


ALTER FUNCTION "public"."fn_battles_vote"("p_battle_id" "uuid", "p_vote" "battles"."vote_value_enum", "p_rationale" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_content_reactions_get_user_for_target"("p_target_type" "text", "p_target_id" "uuid") RETURNS TABLE("id" "uuid", "target_id" "uuid", "user_id" "uuid", "reaction" "content"."reaction_enum", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'content', 'lensers', 'auth'
    AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN; END IF;

  IF p_target_type = 'prompt_template' THEN
    RETURN QUERY SELECT pr.id, pr.prompt_id, pr.user_id, pr.reaction, pr.created_at FROM content.prompt_reactions pr WHERE pr.prompt_id = p_target_id AND pr.user_id = v_user_id;
  ELSIF p_target_type = 'thread' THEN
    RETURN QUERY SELECT tr.id, tr.thread_id, tr.user_id, tr.reaction, tr.created_at FROM content.thread_reactions tr WHERE tr.thread_id = p_target_id AND tr.user_id = v_user_id;
  ELSIF p_target_type = 'thread_reply' THEN
    RETURN QUERY SELECT trr.id, trr.reply_id, trr.user_id, trr.reaction, trr.created_at FROM content.thread_reply_reactions trr WHERE trr.reply_id = p_target_id AND trr.user_id = v_user_id;
  END IF;
END;
$$;


ALTER FUNCTION "public"."fn_content_reactions_get_user_for_target"("p_target_type" "text", "p_target_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_content_reactions_toggle"("p_target_type" "text", "p_target_id" "uuid", "p_reaction" "content"."reaction_enum") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'content', 'lensers', 'auth'
    AS $$
DECLARE
  v_user_id uuid;
  v_existing_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_target_type NOT IN ('thread', 'thread_reply', 'prompt_template') THEN
    RAISE EXCEPTION 'Invalid target_type %', p_target_type;
  END IF;

  IF p_target_type = 'prompt_template' THEN
    SELECT id INTO v_existing_id FROM content.prompt_reactions WHERE prompt_id = p_target_id AND user_id = v_user_id AND reaction = p_reaction;
    IF v_existing_id IS NOT NULL THEN
      DELETE FROM content.prompt_reactions WHERE id = v_existing_id;
      RETURN jsonb_build_object('status','removed');
    ELSE
      INSERT INTO content.prompt_reactions (prompt_id, user_id, reaction) VALUES (p_target_id, v_user_id, p_reaction);
      RETURN jsonb_build_object('status','added');
    END IF;
  ELSIF p_target_type = 'thread' THEN
    SELECT id INTO v_existing_id FROM content.thread_reactions WHERE thread_id = p_target_id AND user_id = v_user_id AND reaction = p_reaction;
    IF v_existing_id IS NOT NULL THEN
      DELETE FROM content.thread_reactions WHERE id = v_existing_id;
      RETURN jsonb_build_object('status','removed');
    ELSE
      INSERT INTO content.thread_reactions (thread_id, user_id, reaction) VALUES (p_target_id, v_user_id, p_reaction);
      RETURN jsonb_build_object('status','added');
    END IF;
  ELSIF p_target_type = 'thread_reply' THEN
    SELECT id INTO v_existing_id FROM content.thread_reply_reactions WHERE reply_id = p_target_id AND user_id = v_user_id AND reaction = p_reaction;
    IF v_existing_id IS NOT NULL THEN
      DELETE FROM content.thread_reply_reactions WHERE id = v_existing_id;
      RETURN jsonb_build_object('status','removed');
    ELSE
      INSERT INTO content.thread_reply_reactions (reply_id, user_id, reaction) VALUES (p_target_id, v_user_id, p_reaction);
      RETURN jsonb_build_object('status','added');
    END IF;
  END IF;
END;
$$;


ALTER FUNCTION "public"."fn_content_reactions_toggle"("p_target_type" "text", "p_target_id" "uuid", "p_reaction" "content"."reaction_enum") OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."fn_lensers_get_authenticated_profile"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'auth'
    AS $$
DECLARE
  v_uid  uuid;
  v_data jsonb;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT jsonb_build_object(
    'handle',       p.handle,
    'display_name', p.display_name,
    'avatar_url',   p.avatar_url,
    'banner_url',   p.banner_url,
    'bio',          p.bio,
    'headline',     p.headline,
    'preferences',  p.preferences,
    'status',       p.status
  )
  INTO v_data
  FROM lensers.profiles p
  WHERE p.user_id = v_uid
    AND p.status = 'active'
    AND p.deletion_requested_at IS NULL;

  -- v_data will be NULL if no row matched; returning NULL is fine
  RETURN v_data;
END;
$$;


ALTER FUNCTION "public"."fn_lensers_get_authenticated_profile"() OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."fn_lensers_get_preferences"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'auth'
    AS $$
DECLARE
  v_uid uuid;
  v_prefs jsonb;
BEGIN
  -- 1. Resolve authenticated user
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- 2. Fetch ONLY preferences from lensers.profiles
  SELECT preferences
  INTO v_prefs
  FROM lensers.profiles
  WHERE user_id = v_uid
  AND status = 'active'
  AND deletion_requested_at IS NULL;

  IF v_prefs IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;

  RETURN v_prefs;
END;
$$;


ALTER FUNCTION "public"."fn_lensers_get_preferences"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_lensers_get_public_profile"("p_handle" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'auth'
    AS $$DECLARE
  v_data jsonb;
BEGIN
  SELECT jsonb_build_object(
    -- identity
    'handle',        l.handle,
    'display_name',  l.display_name,
    'avatar_url',    l.avatar_url,
    'banner_url',    l.banner_url,
    'bio',           l.bio,
    'headline',      l.headline,

    -- profile state
    'status',        l.status,
    'visibility',    l.visibility,
    'created_at',    l.created_at,

    -- xp
    'total_xp',      t.total_xp,
    'current_level', t.current_level,
    'app_id',        t.app_id,
    'min_xp',        lv.min_total_xp,
    'max_xp',        lv.max_total_xp,

    -- engagement stats (pre-aggregated)
    'thread_count',  s.thread_count,
    'prompt_count',  s.prompt_count,
    'follower_count',s.follower_count,
    'following_count', s.following_count,

    -- join info
    'join_order',    jl.join_order,
    'joined_at',     jl.joined_at,

    -- preferences (kept last on purpose)
    'preferences',   l.preferences
  )
  INTO v_data
  FROM lensers.profiles l
  LEFT JOIN xp.totals t
    ON t.lenser_id = l.id
  LEFT JOIN xp.levels lv
    ON lv.app_id = t.app_id
   AND lv.level  = t.current_level
  LEFT JOIN analytics.lenser_stats s
    ON s.lenser_id = l.id
  LEFT JOIN analytics.lenser_join_log jl
    ON jl.lenser_id = l.id
  WHERE l.handle = p_handle
    AND l.status = 'active'::lensers.lenser_status
    AND l.deletion_requested_at IS NULL
    AND l.visibility = 'public'::lensers.lenser_visibility;

  RETURN v_data;
END;$$;


ALTER FUNCTION "public"."fn_lensers_get_public_profile"("p_handle" "text") OWNER TO "postgres";


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
    SET "search_path" TO 'public', 'lensers', 'auth'
    AS $$
declare
    v_user_id uuid;
    v_lenser_id uuid;
    v_current bool;
begin
    -- 1. Caller must be authenticated
    v_user_id := auth.uid();
    if v_user_id is null then
        raise exception 'not_authenticated';
    end if;

    -- 2. KVKK approval gate
    if p_kvkk_approved is not true then
        raise exception 'kvkk_not_approved';
    end if;

    -- 3. Load lenser row for this user
    select l.id, l.is_in_waiting_list
    into v_lenser_id, v_current
    from lensers.profiles l
    where l.user_id = v_user_id;

    if v_lenser_id is null then
        raise exception 'not_a_lenser';
    end if;

    -- 4. Toggle waiting list state
    update lensers.profiles
    set is_in_waiting_list = not v_current,
        updated_at = now()
    where id = v_lenser_id;

end;
$$;


ALTER FUNCTION "public"."fn_lensers_toggle_waitinglist"("p_kvkk_approved" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_lensers_waiting_list_create"("p_email" "text", "p_kvkk_approved" boolean, "p_utm_source" "text" DEFAULT NULL::"text", "p_utm_medium" "text" DEFAULT NULL::"text", "p_utm_campaign" "text" DEFAULT NULL::"text", "p_utm_content" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$declare
    v_confirmed boolean;
    v_unsubscribed boolean;
    v_exists boolean := false;
    v_token text;
    v_token_id uuid;
begin
    -- Normalize email
    p_email := trim(lower(p_email));

    ----------------------------------------------------------------------
    -- 1) Check if user exists
    ----------------------------------------------------------------------
    select email_confirmed, unsubscribe, true
    into v_confirmed, v_unsubscribed, v_exists
    from lensers.waiting_list
    where email = p_email
    limit 1;

    ----------------------------------------------------------------------
    -- CASE A: Email exists AND confirmed AND NOT unsubscribed → cannot re-register
    ----------------------------------------------------------------------
    if v_exists and v_confirmed = true and v_unsubscribed = false then
        return jsonb_build_object('ok', false, 'error', 'already_verified');
    end if;

    ----------------------------------------------------------------------
    -- CASE B: Email exists BUT unsubscribed → allow re-subscription
    ----------------------------------------------------------------------
    if v_exists and v_unsubscribed = true then
        -- Reactivate the user
        update lensers.waiting_list
        set unsubscribe = false,
            email_confirmed = false,
            kvkk_approved = p_kvkk_approved,
            utm_source = p_utm_source,
            utm_medium = p_utm_medium,
            utm_campaign = p_utm_campaign,
            utm_content = p_utm_content,
            created_at = now()
        where email = p_email;

        -- Deactivate old tokens
        update lensers.waiting_list_tokens
        set active = false
        where email = p_email;

        -- Generate new token
        v_token := gen_random_uuid()::text;

        insert into lensers.waiting_list_tokens (email, token, expires_at, active)
        values (p_email, v_token, now() + interval '48 hours', true)
        returning id into v_token_id;

        update lensers.waiting_list
        set current_token_id = v_token_id,
            last_token_sent_at = now()
        where email = p_email;

        return jsonb_build_object('ok', true, 'token', v_token);
    end if;

    ----------------------------------------------------------------------
    -- CASE C: Email exists BUT NOT confirmed → issue NEW token
    ----------------------------------------------------------------------
    if v_exists and v_confirmed = false then
        -- Deactivate previous tokens
        update lensers.waiting_list_tokens
        set active = false
        where email = p_email;

        -- New token
        v_token := gen_random_uuid()::text;

        insert into lensers.waiting_list_tokens (email, token, expires_at, active)
        values (p_email, v_token, now() + interval '48 hours', true)
        returning id into v_token_id;

        update lensers.waiting_list
        set current_token_id = v_token_id,
            last_token_sent_at = now()
        where email = p_email;

        return jsonb_build_object('ok', true, 'token', v_token);
    end if;

    ----------------------------------------------------------------------
    -- CASE D: Email does not exist → fresh registration
    ----------------------------------------------------------------------
    v_token := gen_random_uuid()::text;

    insert into lensers.waiting_list (
        email, kvkk_approved, utm_source, utm_medium, utm_campaign, utm_content
    ) values (
        p_email, p_kvkk_approved, p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content
    );

    insert into lensers.waiting_list_tokens (email, token, expires_at, active)
    values (p_email, v_token, now() + interval '48 hours', true)
    returning id into v_token_id;

    update lensers.waiting_list
    set current_token_id = v_token_id,
        last_token_sent_at = now()
    where email = p_email;

    return jsonb_build_object('ok', true, 'token', v_token);

exception
    when others then
        return jsonb_build_object('ok', false, 'error', sqlerrm);
end;$$;


ALTER FUNCTION "public"."fn_lensers_waiting_list_create"("p_email" "text", "p_kvkk_approved" boolean, "p_utm_source" "text", "p_utm_medium" "text", "p_utm_campaign" "text", "p_utm_content" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_lensers_waiting_list_create_unsubscribe_token"("p_email" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lensers', 'public'
    AS $$
declare
    v_token text;
begin
    -- Generate random token
    v_token := gen_random_uuid()::text;

    insert into lensers.waiting_list_unsubscribe_tokens(email, token)
    values (p_email, v_token);

    return v_token;

exception
    when others then
        return null;
end;
$$;


ALTER FUNCTION "public"."fn_lensers_waiting_list_create_unsubscribe_token"("p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_lensers_waiting_list_unsubscribe_by_token"("p_token" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'lensers', 'public'
    AS $$declare
    v_email text;
    v_used boolean;
    v_created_at timestamptz;
begin
    -- Look up token
    select email, used, created_at
    into v_email, v_used, v_created_at
    from lensers.waiting_list_unsubscribe_tokens
    where token = p_token
    order by created_at desc
    limit 1;

    -- Token not found
    if v_email is null then
        return false;
    end if;

    -- Already used
    if v_used then
        return false;
    end if;

    -- Expired (48h)
    if v_created_at < now() - interval '48 hours' then
        return false;
    end if;

    -- Mark user unsubscribed
    update lensers.waiting_list
    set unsubscribe = true
    where email = v_email;

    -- Mark token used
    update lensers.waiting_list_unsubscribe_tokens
    set used = true
    where token = p_token;

    return true;

exception
    when others then
        return false;
end;$$;


ALTER FUNCTION "public"."fn_lensers_waiting_list_unsubscribe_by_token"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_lensers_waiting_list_verify_token"("p_token" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
    v_token_row record;
begin
    -- 1) Lookup token
    select *
    into v_token_row
    from lensers.waiting_list_tokens
    where token = p_token
      and active = true
      and used = false
    limit 1;

    if not found then
        return jsonb_build_object('ok', false, 'error', 'invalid_or_used');
    end if;

    -- 2) Check expiration
    if v_token_row.expires_at < now() then
        return jsonb_build_object('ok', false, 'error', 'expired');
    end if;

    -- 3) Mark token as used + inactive
    update lensers.waiting_list_tokens
    set used = true,
        active = false
    where id = v_token_row.id;

    -- 4) Confirm the email
    update lensers.waiting_list
    set email_confirmed = true
    where email = v_token_row.email;

    return jsonb_build_object('ok', true);

exception
    when others then
        return jsonb_build_object('ok', false, 'error', sqlerrm);
end;
$$;


ALTER FUNCTION "public"."fn_lensers_waiting_list_verify_token"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_log_page_view"("p_target_type" "public"."page_view_target_enum", "p_target_id" "text", "p_path" "text", "p_referrer" "text", "p_user_agent" "text", "p_client_ip" "inet") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'analytics', 'lensers'
    AS $$
DECLARE
  v_user_id   uuid;
  v_lenser_id uuid;
BEGIN
  -- 1. Validation Logic
  IF p_target_type IS NULL THEN
    RAISE EXCEPTION 'target_type is required';
  END IF;

  IF p_path IS NULL THEN
    RAISE EXCEPTION 'path is required';
  END IF;

  -- 2. Identity Resolution
  v_user_id := auth.uid();

  -- Resilience: Verify user exists in auth.users to prevent FK violations from stale JWTs
  -- If user does not exist (e.g., deleted or stale session), fallback to anonymous logging
  IF v_user_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
      v_user_id := NULL;
    END IF;
  END IF;

  -- Resolve lenser profile if user is valid
  IF v_user_id IS NOT NULL THEN
    SELECT id
    INTO v_lenser_id
    FROM lensers.profiles
    WHERE user_id = v_user_id;
  END IF;

  -- 3. Debouncing (Avoid duplicate logs within 5 seconds for same user/path)
  IF v_user_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM analytics.page_views
      WHERE user_id = v_user_id
        AND path = p_path
        AND created_at > NOW() - INTERVAL '5 seconds'
    ) THEN
      RETURN;
    END IF;
  END IF;

  -- 4. Audit Log Execution
  INSERT INTO analytics.page_views (
    lenser_id,
    user_id,
    target_type,
    target_id,
    path,
    referrer,
    user_agent,
    client_ip
  )
  VALUES (
    v_lenser_id,
    v_user_id,
    p_target_type,
    p_target_id,
    p_path,
    p_referrer,
    p_user_agent,
    p_client_ip
  );
END;
$$;


ALTER FUNCTION "public"."fn_log_page_view"("p_target_type" "public"."page_view_target_enum", "p_target_id" "text", "p_path" "text", "p_referrer" "text", "p_user_agent" "text", "p_client_ip" "inet") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_tag_activity_log"("p_events" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'content', 'analytics'
    AS $$
BEGIN
  INSERT INTO analytics.tag_activity_events (tag_id, entity_type, entity_id, activity_type, actor_id)
  SELECT 
    (e->>'tag_id')::uuid,
    (CASE 
        WHEN e->>'entity_type' = 'prompt' THEN 'prompt_template'::content.entity_type_enum
        ELSE (e->>'entity_type')::content.entity_type_enum
     END),
    (e->>'entity_id')::uuid,
    (e->>'activity_type')::text,
    (e->>'actor_id')::uuid
  FROM jsonb_array_elements(p_events) AS e
  WHERE (e->>'tag_id') IS NOT NULL 
    AND (e->>'entity_id') IS NOT NULL;
END;
$$;


ALTER FUNCTION "public"."fn_tag_activity_log"("p_events" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_xp_get_self"() RETURNS TABLE("lenser_id" "uuid", "total_xp" bigint, "current_level" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lensers', 'xp', 'auth'
    AS $$
begin
    return query
    select
        t.lenser_id,
        t.total_xp,
        t.current_level
    from xp.totals t
    join lensers.profiles p on p.id = t.lenser_id
    where p.user_id = auth.uid();
end;
$$;


ALTER FUNCTION "public"."fn_xp_get_self"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select coalesce((auth.jwt() ->> 'role') = 'admin', false);
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "system"."get_localized"("p_entity_type" "system"."entity_type_enum", "p_entity_id" "uuid", "p_lang" "text", "p_field" "text") RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
    SELECT et.value
    FROM system.entity_translations et
    WHERE et.entity_type = p_entity_type
      AND et.entity_id = p_entity_id
      AND et.lang = p_lang
      AND et.field = p_field
    LIMIT 1;
$$;


ALTER FUNCTION "system"."get_localized"("p_entity_type" "system"."entity_type_enum", "p_entity_id" "uuid", "p_lang" "text", "p_field" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "system"."get_localized_fields"("p_entity_type" "system"."entity_type_enum", "p_entity_id" "uuid", "p_lang" "text") RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
    SELECT jsonb_object_agg(field, value)
    FROM system.entity_translations
    WHERE entity_type = p_entity_type
      AND entity_id = p_entity_id
      AND lang = p_lang;
$$;


ALTER FUNCTION "system"."get_localized_fields"("p_entity_type" "system"."entity_type_enum", "p_entity_id" "uuid", "p_lang" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "system"."touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "system"."touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "xp"."apply"("p_lenser_id" "uuid", "p_rule_key" "text", "p_source" "xp"."source_enum", "p_source_ref_type" "text", "p_source_ref_id" "uuid", "p_app_id" "uuid" DEFAULT '00000000-0000-0000-0000-000000000000'::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$DECLARE
  v_rule RECORD;
  v_daily_xp int;
  v_daily_events int;
  v_season_xp int;
  v_last_event timestamptz;
  v_now timestamptz := now();
BEGIN
  -------------------------------------------------------------------
  -- Load rule
  -------------------------------------------------------------------
  SELECT *
  INTO v_rule
  FROM xp.rules
  WHERE action_key = p_rule_key
    AND is_active = TRUE
    AND (app_id = p_app_id OR app_id IS NULL)
  LIMIT 1;

  IF v_rule IS NULL THEN
    RETURN;
  END IF;

  -------------------------------------------------------------------
  -- Rule-level cooldown
  -------------------------------------------------------------------
  IF v_rule.cooldown_seconds IS NOT NULL THEN
    SELECT created_at
    INTO v_last_event
    FROM xp.events
    WHERE lenser_id = p_lenser_id
      AND action_key = p_rule_key
      AND app_id = p_app_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_last_event IS NOT NULL
       AND EXTRACT(EPOCH FROM (v_now - v_last_event)) < v_rule.cooldown_seconds THEN
       RETURN;
    END IF;
  END IF;

  -------------------------------------------------------------------
  -- Max events per day
  -------------------------------------------------------------------
  IF v_rule.max_events_per_day IS NOT NULL THEN
    SELECT COUNT(*)
    INTO v_daily_events
    FROM xp.events
    WHERE lenser_id = p_lenser_id
      AND action_key = p_rule_key
      AND app_id = p_app_id
      AND created_at >= date_trunc('day', v_now);

    IF v_daily_events >= v_rule.max_events_per_day THEN
      RETURN;
    END IF;
  END IF;

  -------------------------------------------------------------------
  -- Max XP per day
  -------------------------------------------------------------------
  IF v_rule.max_xp_per_day IS NOT NULL THEN
    SELECT COALESCE(SUM(xp), 0)
    INTO v_daily_xp
    FROM xp.events
    WHERE lenser_id = p_lenser_id
      AND action_key = p_rule_key
      AND app_id = p_app_id
      AND created_at >= date_trunc('day', v_now);

    IF v_daily_xp + v_rule.base_xp > v_rule.max_xp_per_day THEN
      RETURN;
    END IF;
  END IF;

  -------------------------------------------------------------------
  -- Season XP cap
  -------------------------------------------------------------------
  IF v_rule.max_xp_per_season IS NOT NULL THEN
    SELECT COALESCE(SUM(xp), 0)
    INTO v_season_xp
    FROM xp.events
    WHERE lenser_id = p_lenser_id
      AND action_key = p_rule_key
      AND app_id = p_app_id;

    IF v_season_xp + v_rule.base_xp > v_rule.max_xp_per_season THEN
      RETURN;
    END IF;
  END IF;

INSERT INTO xp.events (
  id,
  lenser_id,
  app_id,
  rule_id,
  action_key,
  xp,
  base_xp,
  source,
  source_ref_type,
  source_ref_id,
  created_at
)
VALUES (
  gen_random_uuid(),
  p_lenser_id,
  p_app_id,
  v_rule.id,
  p_rule_key,
  v_rule.base_xp,       -- xp
  v_rule.base_xp,       -- base_xp (required NOT NULL)
  p_source,             -- xp_source_enum
  p_source_ref_type,
  p_source_ref_id,
  v_now
);

  -------------------------------------------------------------------
  -- Update totals
  -------------------------------------------------------------------
  INSERT INTO xp.totals (lenser_id, app_id, total_xp, current_level)
  VALUES (p_lenser_id, p_app_id, v_rule.base_xp, 1)
  ON CONFLICT (lenser_id, app_id)
  DO UPDATE SET total_xp = xp.totals.total_xp + EXCLUDED.total_xp;

END;$$;


ALTER FUNCTION "xp"."apply"("p_lenser_id" "uuid", "p_rule_key" "text", "p_source" "xp"."source_enum", "p_source_ref_type" "text", "p_source_ref_id" "uuid", "p_app_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "xp"."check_and_rollover_season"("p_app_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$DECLARE
  caller text;
  ended_season_count int;
BEGIN
  -- Extract caller safely (NULL during schema introspection)
  BEGIN
    caller := current_setting('request.jwt.claim.sub', true);
  EXCEPTION WHEN OTHERS THEN
    caller := NULL;
  END;

  -- Only block real external calls, not Supabase system processes
  IF caller IS NOT NULL AND caller <> 'service_role' THEN
      RAISE EXCEPTION 'Unauthorized: only service_role can call this function';
  END IF;

  -- Check for finished seasons
  SELECT COUNT(*) INTO ended_season_count
  FROM xp.seasons
  WHERE app_id = p_app_id
    AND is_active = true
    AND ends_at < now();

  -- Rollover
  IF ended_season_count > 0 THEN
    PERFORM xp.rollover_season(p_app_id);
  END IF;

END;$$;


ALTER FUNCTION "xp"."check_and_rollover_season"("p_app_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "xp"."compute_level_from"("p_app_id" "uuid", "p_total_xp" bigint) RETURNS integer
    LANGUAGE "sql"
    AS $$SELECT COALESCE(
    (
      SELECT level
      FROM xp.levels
      WHERE app_id = p_app_id
        AND p_total_xp >= min_total_xp
        AND p_total_xp < max_total_xp
      ORDER BY level DESC
      LIMIT 1
    ),
    1
  );$$;


ALTER FUNCTION "xp"."compute_level_from"("p_app_id" "uuid", "p_total_xp" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "xp"."generate_levels"("p_app_id" "uuid", "p_max_level" integer DEFAULT 200, "p_base_xp" integer DEFAULT 100) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$DECLARE
    lvl int;
    min_xp bigint;
    max_xp bigint;
BEGIN
    -- Clear old levels for this app
    DELETE FROM xp.levels WHERE app_id = p_app_id;

    min_xp := 0;

    FOR lvl IN 1..p_max_level LOOP

        -- Level XP curve:
        -- Low levels = fast progression
        -- Mid levels = moderate
        -- High levels = exponential
        max_xp := min_xp + (p_base_xp * lvl * lvl / 5);

        INSERT INTO xp.levels (app_id, level, min_total_xp, max_total_xp, metadata)
        VALUES (
            p_app_id,
            lvl,
            min_xp,
            max_xp,
            jsonb_build_object('generated', true, 'formula', 'quadratic_scaled')
        );

        min_xp := max_xp + 1;
    END LOOP;

END;$$;


ALTER FUNCTION "xp"."generate_levels"("p_app_id" "uuid", "p_max_level" integer, "p_base_xp" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "xp"."get_active_season_id"("p_app_id" "uuid") RETURNS "uuid"
    LANGUAGE "sql" STABLE
    AS $$select id
  from xp_internal.xp_seasons
  where app_id = p_app_id
    and is_active = true
    and now() between starts_at and ends_at
  limit 1;$$;


ALTER FUNCTION "xp"."get_active_season_id"("p_app_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "xp"."mark_event_verified"("p_event_id" "uuid", "p_ai_verified" boolean, "p_verifier" "text", "p_details" "jsonb" DEFAULT NULL::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$BEGIN
  INSERT INTO xp.event_verifications (
    event_id, ai_verified, verifier, details, created_at
  )
  VALUES (
    p_event_id, p_ai_verified, p_verifier, p_details, now()
  );
END;$$;


ALTER FUNCTION "xp"."mark_event_verified"("p_event_id" "uuid", "p_ai_verified" boolean, "p_verifier" "text", "p_details" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "xp"."on_prompt_created"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'xp_internal'
    AS $$BEGIN
  PERFORM xp.apply(
    p_lenser_id       := NEW.lenser_id,
    p_rule_key        := 'PROMPT_CREATED',
    p_source          := 'content'::xp.source_enum,
    p_source_ref_type := 'prompt',
    p_source_ref_id   := NEW.id
  );

  RETURN NEW;
END;$$;


ALTER FUNCTION "xp"."on_prompt_created"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "xp"."on_reaction_added"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_thread_id uuid;
begin
  -- Resolve thread_id from reaction target
  if new.target_type = 'thread' then
    v_thread_id := new.target_id;

  elsif new.target_type = 'thread_reply' then
    select tr.thread_id
    into v_thread_id
    from content.thread_replies tr
    where tr.id = new.target_id;

  else
    -- prompt_template or others → ignore
    return new;
  end if;

  if v_thread_id is null then
    return new;
  end if;

  insert into analytics.tag_activity_events (
    tag_id,
    entity_type,
    entity_id,
    activity_type,
    actor_id
  )
  select
    tm.tag_id,
    'thread'::content.entity_type_enum,   -- ✅ ONLY trusted enum
    tm.entity_id,
    'reacted',
    new.user_id
  from content.tag_map tm
  where tm.entity_type = 'thread'::content.entity_type_enum
    and tm.entity_id = v_thread_id;

  return new;
end;
$$;


ALTER FUNCTION "xp"."on_reaction_added"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "xp"."on_reaction_given"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'xp_internal'
    AS $$BEGIN
  PERFORM xp.apply(
    p_lenser_id       := NEW.lenser_id,
    p_rule_key        := 'REACTION_GIVEN',
    p_source          := 'social'::xp.source_enum,
    p_source_ref_type := 'reaction',
    p_source_ref_id   := NEW.id
  );

  RETURN NEW;
END;$$;


ALTER FUNCTION "xp"."on_reaction_given"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "xp"."on_reaction_received"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'xp_internal'
    AS $$DECLARE
  v_owner uuid;
BEGIN
  SELECT lenser_id INTO v_owner
  FROM content.threads
  WHERE id = NEW.target_id;

  IF v_owner IS NOT NULL THEN
    PERFORM xp.apply(
      p_lenser_id       := v_owner,
      p_rule_key        := 'REACTION_RECEIVED',
      p_source          := 'social'::xp.source_enum,
      p_source_ref_type := 'reaction',
      p_source_ref_id   := NEW.id
    );
  END IF;

  RETURN NEW;
END;$$;


ALTER FUNCTION "xp"."on_reaction_received"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "xp"."on_reply_created"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'xp_internal'
    AS $$BEGIN
  PERFORM xp.apply(
    p_lenser_id       := NEW.lenser_id,
    p_rule_key        := 'THREAD_REPLY_CREATED',
    p_source          := 'social'::xp.source_enum,
    p_source_ref_type := 'thread_reply',
    p_source_ref_id   := NEW.id
  );
  RETURN NEW;
END;$$;


ALTER FUNCTION "xp"."on_reply_created"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "xp"."on_reply_received"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'xp_internal'
    AS $$DECLARE
  v_owner uuid;
BEGIN
  SELECT lenser_id INTO v_owner
  FROM content.threads
  WHERE id = NEW.thread_id;

  IF v_owner IS NOT NULL THEN
    PERFORM xp.apply(
      p_lenser_id       := v_owner,
      p_rule_key        := 'THREAD_REPLY_RECEIVED',
      p_source          := 'social'::xp.source_enum,
      p_source_ref_type := 'thread_reply',
      p_source_ref_id   := NEW.id
    );
  END IF;

  RETURN NEW;
END;$$;


ALTER FUNCTION "xp"."on_reply_received"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "xp"."on_tag_created"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'xp', 'analytics'
    AS $$
BEGIN
  INSERT INTO analytics.tag_activity_events (tag_id, entity_type, entity_id, activity_type)
  VALUES (NEW.tag_id, NEW.entity_type, NEW.entity_id, 'created');
  RETURN NEW;
END;
$$;


ALTER FUNCTION "xp"."on_tag_created"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "xp"."on_thread_created"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'xp_internal'
    AS $$BEGIN
  PERFORM xp.apply(
    p_lenser_id        := NEW.lenser_id,
    p_rule_key         := 'THREAD_CREATED',
    p_source           := 'content'::xp.source_enum,
    p_source_ref_type  := 'thread',
    p_source_ref_id    := NEW.id
  );
  RETURN NEW;
END;$$;


ALTER FUNCTION "xp"."on_thread_created"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "xp"."on_thread_engaged"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'xp_internal'
    AS $$BEGIN
  PERFORM xp.apply(
    p_lenser_id       := NEW.viewer_id,
    p_rule_key        := 'THREAD_ENGAGED',
    p_source          := 'social'::xp.source_enum,
    p_source_ref_type := 'thread_view',
    p_source_ref_id   := NEW.thread_id
  );
  RETURN NEW;
END;$$;


ALTER FUNCTION "xp"."on_thread_engaged"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "xp"."prevent_event_mutations"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$DECLARE
  jwt_role text := current_setting('request.jwt.claim.role', true);
BEGIN
  -- Allow system cleanup or post-delete anonymization
  IF jwt_role = 'service_role' OR current_user = 'postgres' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'xp_events are immutable';
END;$$;


ALTER FUNCTION "xp"."prevent_event_mutations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "xp"."rollback_event"("p_event_id" "uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS TABLE("total_xp" bigint, "level" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$DECLARE
  v_event xp.events%ROWTYPE;
  v_total_after bigint;
  v_level int;
BEGIN
  -------------------------------------------------------------------
  -- 1) LOAD ORIGINAL EVENT
  -------------------------------------------------------------------
  SELECT *
  INTO v_event
  FROM xp.events e
  WHERE e.id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'XP event not found: %', p_event_id;
  END IF;


  -------------------------------------------------------------------
  -- 2) INSERT COMPENSATING NEGATIVE EVENT
  -------------------------------------------------------------------
  INSERT INTO xp.events (
    lenser_id,
    app_id,
    rule_id,
    action_key,
    xp,
    base_xp,
    source,
    source_ref_type,
    source_ref_id,
    signature,
    meta
  )
  VALUES (
    v_event.lenser_id,
    v_event.app_id,
    v_event.rule_id,
    v_event.action_key || '_ROLLBACK',
    -v_event.xp,
    -v_event.base_xp,
    'system',                        -- system-originated rollback
    'xp_event',
    v_event.id,
    NULL,
    jsonb_build_object(
      'rollback_of', v_event.id::text,
      'rollback_reason', p_reason
    )
  );


  -------------------------------------------------------------------
  -- 3) UPDATE XP TOTALS (SUBTRACT ORIGINAL XP)
  -------------------------------------------------------------------
  UPDATE xp.totals t
  SET total_xp = GREATEST(t.total_xp - v_event.xp, 0),
      updated_at = now()
  WHERE t.lenser_id = v_event.lenser_id
    AND t.app_id = v_event.app_id
  RETURNING t.total_xp INTO v_total_after;

  IF NOT FOUND THEN
    -- No totals row: nothing to rollback
    v_total_after := 0;
  END IF;


  -------------------------------------------------------------------
  -- 4) RECALCULATE LEVEL
  -------------------------------------------------------------------
  SELECT lvl.level
  INTO v_level
  FROM xp.levels lvl
  WHERE lvl.app_id = v_event.app_id
    AND v_total_after >= lvl.min_total_xp
    AND v_total_after <= lvl.max_total_xp
  LIMIT 1;

  IF v_level IS NULL THEN
    v_level := 1;
  END IF;


  -------------------------------------------------------------------
  -- 5) UPDATE STORED LEVEL
  -------------------------------------------------------------------
  UPDATE xp.totals
  SET current_level = v_level,
      updated_at = now()
  WHERE lenser_id = v_event.lenser_id
    AND app_id = v_event.app_id;


  -------------------------------------------------------------------
  -- 6) RETURN NEW STATE
  -------------------------------------------------------------------
  RETURN QUERY
  SELECT v_total_after AS total_xp,
         v_level       AS level;

END;$$;


ALTER FUNCTION "xp"."rollback_event"("p_event_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "xp"."rollover_season"("p_app_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$DECLARE
    cur_season uuid;
    new_season uuid;
    next_slug text;
BEGIN
    -- get current active season
    SELECT id INTO cur_season
    FROM xp.seasons
    WHERE app_id = p_app_id
      AND is_active = true
    ORDER BY starts_at DESC
    LIMIT 1;

    IF cur_season IS NULL THEN
        RAISE NOTICE 'No active season found.';
        RETURN;
    END IF;

    -- deactivate current season
    UPDATE xp.seasons
    SET is_active = false
    WHERE id = cur_season;

    -- generate slug: season_x
    SELECT 'season_' || (COUNT(*) + 1)
    INTO next_slug
    FROM xp.seasons
    WHERE app_id = p_app_id;

    -- create next season
    INSERT INTO xp.seasons (
        id, app_id, slug, name, starts_at, ends_at, is_active
    )
    VALUES (
        gen_random_uuid(),
        p_app_id,
        next_slug,
        initcap(replace(next_slug, '_', ' ')),
        now(),
        now() + interval '90 days',
        true
    )
    RETURNING id INTO new_season;

    -- season rollover: nothing is deleted
    -- xp_season_totals remains historical
    RAISE NOTICE 'Season rollover completed. New season: %', new_season;

END;$$;


ALTER FUNCTION "xp"."rollover_season"("p_app_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "xp"."seed_default_curve"("p_app_id" "uuid", "p_max_level" integer DEFAULT 100, "p_base" numeric DEFAULT 50, "p_power" numeric DEFAULT 1.5) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$BEGIN
  INSERT INTO xp.levels (app_id, level, min_total_xp, max_total_xp)
  SELECT
    p_app_id,
    lvl,
    COALESCE(SUM(increment) OVER (ORDER BY lvl
      ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0) AS min_total_xp,
    SUM(increment) OVER (ORDER BY lvl) AS max_total_xp
  FROM (
    SELECT
      level AS lvl,
      CEIL(p_base * power(level::numeric, p_power))::bigint AS increment
    FROM generate_series(1, p_max_level) AS level
  ) t;
END;$$;


ALTER FUNCTION "xp"."seed_default_curve"("p_app_id" "uuid", "p_max_level" integer, "p_base" numeric, "p_power" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "xp"."sync_total"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$BEGIN
  UPDATE analytics.lenser_stats e
  SET xp = NEW.total_xp,
      updated_at = now()
  WHERE e.lenser_id = NEW.lenser_id;

  RETURN NEW;
END;$$;


ALTER FUNCTION "xp"."sync_total"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "xp"."update_daily_streak"("p_lenser_id" "uuid", "p_app_id" "uuid", "p_streak_type" "text", "p_event_date" "date") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$DECLARE
  v_current integer;
  v_longest integer;
  v_last date;
  v_new_current integer;
  v_new_longest integer;
BEGIN
  SELECT current_streak, longest_streak, last_occurrence_at
  INTO v_current, v_longest, v_last
  FROM xp.streaks
  WHERE lenser_id = p_lenser_id
    AND app_id = p_app_id
    AND streak_type = p_streak_type
  FOR UPDATE OF xp_streaks;

EXCEPTION
  WHEN NO_DATA_FOUND THEN
    v_current := 0;
    v_longest := 0;
    v_last := NULL;
BEGIN
END;

  IF v_last IS NULL THEN
    v_new_current := 1;
  ELSIF p_event_date = v_last THEN
    v_new_current := v_current; -- same day, keep
  ELSIF p_event_date = v_last + 1 THEN
    v_new_current := v_current + 1;
  ELSE
    v_new_current := 1;
  END IF;

  v_new_longest := GREATEST(v_longest, v_new_current);

  INSERT INTO xp.streaks (
    lenser_id, app_id, streak_type,
    current_streak, longest_streak, last_occurrence_at, updated_at
  )
  VALUES (
    p_lenser_id, p_app_id, p_streak_type,
    v_new_current, v_new_longest, p_event_date, now()
  )
  ON CONFLICT (lenser_id, app_id, streak_type)
  DO UPDATE SET
    current_streak = EXCLUDED.current_streak,
    longest_streak = EXCLUDED.longest_streak,
    last_occurrence_at = EXCLUDED.last_occurrence_at,
    updated_at = EXCLUDED.updated_at;
END;$$;


ALTER FUNCTION "xp"."update_daily_streak"("p_lenser_id" "uuid", "p_app_id" "uuid", "p_streak_type" "text", "p_event_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "xp"."update_season_totals"("p_app_id" "uuid", "p_lenser_id" "uuid", "p_xp" bigint) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$declare
  v_season_id uuid;
begin
  -- aktif sezon var mı?
  v_season_id := xp.get_active_season_id(p_app_id);

  if v_season_id is null then
    return; -- aktif sezon yoksa işlem yapma
  end if;

  -- totals güncelle
  insert into xp.season_totals (season_id, app_id, lenser_id, total_xp)
  values (v_season_id, p_app_id, p_lenser_id, p_xp)
  on conflict (season_id, app_id, lenser_id)
  do update set total_xp = xp.season_totals.total_xp + excluded.total_xp;
end;$$;


ALTER FUNCTION "xp"."update_season_totals"("p_app_id" "uuid", "p_lenser_id" "uuid", "p_xp" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "xp"."verify_signature"("p_signature" "text", "p_payload" "jsonb") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$BEGIN
  -- TODO: implement real verification. For now, always true if not null.
  IF p_signature IS NULL THEN
    RETURN false;
  END IF;
  RETURN true;
END;$$;


ALTER FUNCTION "xp"."verify_signature"("p_signature" "text", "p_payload" "jsonb") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "ai"."generations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lenser_id" "uuid" DEFAULT "lensers"."get_auth_lenser_id"() NOT NULL,
    "ai_model_id" "uuid" NOT NULL,
    "prompt_template_id" "uuid",
    "media_id" "uuid" NOT NULL,
    "input_text" "text",
    "input_params" "jsonb",
    "output_type" "text",
    "visibility" "content"."visibility_enum" DEFAULT 'private'::"content"."visibility_enum" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "original_chat_url" "text"
);


ALTER TABLE "ai"."generations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "ai"."models" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "provider" "ai"."provider_enum" NOT NULL,
    "version" "text",
    "provider_url" "text",
    "description" "text" NOT NULL,
    "capabilities" "ai"."ai_capability_enum"[] NOT NULL,
    "temperature" numeric NOT NULL,
    "max_tokens" integer NOT NULL,
    "pricing_tier" "public"."pricing_tier_enum",
    "is_public" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "ai"."models" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "analytics"."lenser_activity" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lenser_id" "uuid" NOT NULL,
    "activity_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "analytics"."lenser_activity" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "analytics"."lenser_country_join_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lenser_id" "uuid" NOT NULL,
    "country_code" "text" NOT NULL,
    "country_join_order" bigint NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "analytics"."lenser_country_join_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "analytics"."lenser_join_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lenser_id" "uuid",
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "join_order" bigint NOT NULL
);


ALTER TABLE "analytics"."lenser_join_log" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "analytics"."lenser_join_sequence"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "analytics"."lenser_join_sequence" OWNER TO "postgres";


ALTER SEQUENCE "analytics"."lenser_join_sequence" OWNED BY "analytics"."lenser_join_log"."join_order";



CREATE TABLE IF NOT EXISTS "analytics"."lenser_stats" (
    "lenser_id" "uuid" NOT NULL,
    "thread_count" integer DEFAULT 0 NOT NULL,
    "prompt_count" integer DEFAULT 0 NOT NULL,
    "follower_count" integer DEFAULT 0 NOT NULL,
    "following_count" integer DEFAULT 0 NOT NULL,
    "xp" bigint DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "analytics"."lenser_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "analytics"."page_views" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lenser_id" "uuid",
    "user_id" "uuid",
    "target_type" "public"."page_view_target_enum" NOT NULL,
    "target_id" "text",
    "path" "text" NOT NULL,
    "referrer" "text",
    "user_agent" "text",
    "client_ip" "inet",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "analytics"."page_views" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "analytics"."product_feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_tag" "analytics"."product_tag_enum" DEFAULT 'general'::"analytics"."product_tag_enum" NOT NULL,
    "page" "text",
    "user_id" "uuid",
    "message" "text",
    "start_date" timestamp with time zone,
    "end_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "analytics"."feedback_status_enum" DEFAULT 'pending'::"analytics"."feedback_status_enum" NOT NULL,
    CONSTRAINT "feedback_message_check" CHECK ((("message" IS NULL) OR (("btrim"("message") = "message") AND (("char_length"("message") >= 10) AND ("char_length"("message") <= 2000)))))
);


ALTER TABLE "analytics"."product_feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "analytics"."share_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shared_link_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "viewer_lenser_id" "uuid",
    "viewer_session_id" "text",
    "ip_hash" "text",
    "country" "text",
    "city" "text",
    "user_agent" "text",
    "referer" "text",
    "ref_host" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "analytics"."share_events" OWNER TO "postgres";


COMMENT ON TABLE "analytics"."share_events" IS 'Telemetry for shared link usage (generated/opened/etc.), with privacy-aware IP and geo, RLS via link owner.';



CREATE TABLE IF NOT EXISTS "analytics"."tag_activity_daily" (
    "id" bigint NOT NULL,
    "tag_id" "uuid" NOT NULL,
    "entity_type" "content"."entity_type_enum" NOT NULL,
    "activity_date" "date" NOT NULL,
    "created_count" integer DEFAULT 0 NOT NULL,
    "viewed_count" integer DEFAULT 0 NOT NULL,
    "reacted_count" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "analytics"."tag_activity_daily" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "analytics"."tag_activity_daily_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "analytics"."tag_activity_daily_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "analytics"."tag_activity_daily_id_seq" OWNED BY "analytics"."tag_activity_daily"."id";



CREATE TABLE IF NOT EXISTS "analytics"."tag_activity_events" (
    "id" bigint NOT NULL,
    "tag_id" "uuid" NOT NULL,
    "entity_type" "content"."entity_type_enum" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "actor_id" "uuid",
    "activity_type" "text" NOT NULL,
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "tag_activity_events_activity_type_check" CHECK (("activity_type" = ANY (ARRAY['created'::"text", 'viewed'::"text", 'reacted'::"text"])))
);


ALTER TABLE "analytics"."tag_activity_events" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "analytics"."tag_activity_events_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "analytics"."tag_activity_events_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "analytics"."tag_activity_events_id_seq" OWNED BY "analytics"."tag_activity_events"."id";



CREATE TABLE IF NOT EXISTS "battles"."battles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "creator_lenser_id" "uuid" DEFAULT "lensers"."get_auth_lenser_id"() NOT NULL,
    "title" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "task_prompt" "text" NOT NULL,
    "rubric_id" "uuid",
    "status" "battles"."battle_status_enum" DEFAULT 'draft'::"battles"."battle_status_enum" NOT NULL,
    "invite_code" "text",
    "forum_thread_id" "uuid",
    "max_contenders" integer DEFAULT 2 NOT NULL,
    "voting_opens_at" timestamp with time zone,
    "voting_closes_at" timestamp with time zone,
    "published_at" timestamp with time zone,
    "finalized_at" timestamp with time zone,
    "winner_contender_id" "uuid",
    "vote_count_a" integer DEFAULT 0 NOT NULL,
    "vote_count_b" integer DEFAULT 0 NOT NULL,
    "vote_count_draw" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "battles_max_contenders_min" CHECK (("max_contenders" >= 2)),
    CONSTRAINT "battles_voting_window_order" CHECK ((("voting_opens_at" IS NULL) OR ("voting_closes_at" IS NULL) OR ("voting_opens_at" < "voting_closes_at")))
);


ALTER TABLE "battles"."battles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "battles"."contenders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "battle_id" "uuid" NOT NULL,
    "slot" character(1) NOT NULL,
    "contender_type" "battles"."contender_type_enum" NOT NULL,
    "contender_ref_id" "uuid" NOT NULL,
    "display_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "contenders_slot_letter" CHECK ((("slot" >= 'A'::"bpchar") AND ("slot" <= 'Z'::"bpchar")))
);


ALTER TABLE "battles"."contenders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "battles"."rubric_criteria" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rubric_id" "uuid" NOT NULL,
    "ordinal" integer NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "weight" numeric DEFAULT 1.0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "rubric_criteria_weight_positive" CHECK (("weight" > (0)::numeric))
);


ALTER TABLE "battles"."rubric_criteria" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "battles"."rubrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "creator_lenser_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "is_public" boolean DEFAULT true NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "battles"."rubrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "battles"."scorecards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "battle_id" "uuid" NOT NULL,
    "contender_id" "uuid" NOT NULL,
    "rubric_criterion_id" "uuid" NOT NULL,
    "result" "battles"."scorecard_result_enum" NOT NULL,
    "scorer_model_id" "uuid",
    "explanation" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "battles"."scorecards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "battles"."submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "battle_id" "uuid" NOT NULL,
    "contender_id" "uuid" NOT NULL,
    "status" "battles"."submission_status_enum" DEFAULT 'pending'::"battles"."submission_status_enum" NOT NULL,
    "content_text" "text",
    "content_url" "text",
    "content_media" "jsonb" DEFAULT '[]'::"jsonb",
    "submitted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "submissions_content_required" CHECK ((("status" = 'pending'::"battles"."submission_status_enum") OR ("content_text" IS NOT NULL) OR ("content_url" IS NOT NULL)))
);


ALTER TABLE "battles"."submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "battles"."votes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "battle_id" "uuid" NOT NULL,
    "voter_lenser_id" "uuid" NOT NULL,
    "vote_value" "battles"."vote_value_enum" NOT NULL,
    "rationale" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "battles"."votes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "content"."media_library" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lenser_id" "uuid" DEFAULT "lensers"."get_auth_lenser_id"() NOT NULL,
    "url" "text" NOT NULL,
    "storage_bucket" "text",
    "file_name" "text" NOT NULL,
    "display_name" "text",
    "mime_type" "text" NOT NULL,
    "extension" "text",
    "size_bytes" bigint,
    "width" integer,
    "height" integer,
    "duration_seconds" numeric,
    "media_kind" "text",
    "source" "text",
    "meta" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "content"."media_library" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "content"."prompt_reactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "prompt_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "reaction" "content"."reaction_enum" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "content"."prompt_reactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "content"."prompt_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lenser_id" "uuid" DEFAULT "lensers"."get_auth_lenser_id"() NOT NULL,
    "visibility" "content"."visibility_enum" DEFAULT 'public'::"content"."visibility_enum" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "content"."prompt_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "content"."prompt_translations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "prompt_id" "uuid" NOT NULL,
    "language_code" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "content" "text" NOT NULL,
    "is_original" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "prompt_trans_content_check" CHECK ((("btrim"("content") = "content") AND ("char_length"("content") >= 10) AND ("char_length"("content") <= 20000))),
    CONSTRAINT "prompt_trans_title_check" CHECK ((("btrim"("title") = "title") AND ("char_length"("title") >= 3) AND ("char_length"("title") <= 120)))
);


ALTER TABLE "content"."prompt_translations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "content"."tag_map" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" "content"."entity_type_enum" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL,
    "language_detected" "text",
    "user_id" "uuid",
    "user_agent" "text",
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
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "tag_suggestions_confidence_score_check" CHECK ((("confidence_score" >= (0)::numeric) AND ("confidence_score" <= (1)::numeric))),
    CONSTRAINT "tag_suggestions_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'rejected'::"text"])))
);


ALTER TABLE "content"."tag_suggestions" OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "content"."thread_reactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "thread_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "reaction" "content"."reaction_enum" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "content"."thread_reactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "content"."thread_reply_reactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reply_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "reaction" "content"."reaction_enum" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "content"."thread_reply_reactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "content"."thread_translations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "thread_id" "uuid" NOT NULL,
    "language_code" "text" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "is_original" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "thread_trans_content_check" CHECK ((("char_length"("content") >= 1) AND ("char_length"("content") <= 20000))),
    CONSTRAINT "thread_trans_title_check" CHECK ((("char_length"("title") >= 1) AND ("char_length"("title") <= 200)))
);


ALTER TABLE "content"."thread_translations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "content"."threads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lenser_id" "uuid" DEFAULT "lensers"."get_auth_lenser_id"() NOT NULL,
    "visibility" "content"."visibility_enum" DEFAULT 'public'::"content"."visibility_enum" NOT NULL,
    "view_count" integer DEFAULT 0 NOT NULL,
    "reply_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "thumbnail_url" "text"
);


ALTER TABLE "content"."threads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "lensers"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "handle" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "bio" "text",
    "headline" "text",
    "avatar_url" "text",
    "banner_url" "text",
    "location" "text",
    "website_url" "text",
    "status" "lensers"."lenser_status" DEFAULT 'active'::"lensers"."lenser_status" NOT NULL,
    "preferences" "jsonb" DEFAULT '{"locale": "en", "timezone": "UTC", "visibility": "public", "emailUpdates": true, "visibilitySettings": {"ai": "community", "saved": "private", "threads": "public", "reactions": "community"}, "allowMessageRequests": true}'::"jsonb" NOT NULL,
    "engagement" "jsonb" DEFAULT '{"xp": 0, "followers": 0, "following": 0, "replyCount": 0, "threadCount": 0, "challengeCount": 0}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "visibility" "lensers"."lenser_visibility" DEFAULT 'public'::"lensers"."lenser_visibility",
    "is_in_waiting_list" boolean DEFAULT false,
    "deletion_requested_at" timestamp with time zone,
    "last_handle_changed_at" timestamp with time zone,
    "join_order" bigint,
    "is_super_admin" boolean DEFAULT false NOT NULL,
    "last_login_at" timestamp with time zone,
    "last_active_at" timestamp with time zone,
    "login_count" integer DEFAULT 0,
    "country" "text",
    "timezone" "text",
    "preferred_language" "text" DEFAULT 'en'::"text" NOT NULL,
    CONSTRAINT "lensers_handle_format_check" CHECK ((("handle" = "lower"("handle")) AND ("handle" ~ '^[a-z0-9._]+$'::"text") AND (("char_length"("handle") >= 4) AND ("char_length"("handle") <= 24)))),
    CONSTRAINT "lensers_preferences_check" CHECK ((("jsonb_typeof"("preferences") = 'object'::"text") AND ((NOT ("preferences" ? 'theme'::"text")) OR (("preferences" ->> 'theme'::"text") = ANY (ARRAY['light'::"text", 'dark'::"text"]))) AND ((NOT ("preferences" ? 'locale'::"text")) OR (("preferences" ->> 'locale'::"text") ~ '^[a-z]{2}(-[A-Z]{2})?$'::"text")) AND ((NOT ("preferences" ? 'timezone'::"text")) OR (("preferences" ->> 'timezone'::"text") ~ '^[A-Za-z0-9_+\-\/]+$'::"text")))),
    CONSTRAINT "lensers_reserved_handle_check" CHECK (("lower"("handle") <> ALL (ARRAY['lenser'::"text", 'lens'::"text", 'lena'::"text", 'lensa'::"text", 'lense'::"text", 'leni'::"text", 'len'::"text", 'lensizm'::"text"]))),
    CONSTRAINT "lensers_website_url_format_check" CHECK ((("website_url" IS NULL) OR ("website_url" ~ '^https?:\/\/[A-Za-z0-9.-]+\.[A-Za-z]{2,}.*$'::"text")))
);


ALTER TABLE "lensers"."profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "content"."vw_auth_prompts" AS
 SELECT "p"."id",
    "p"."lenser_id",
    "p"."visibility",
    "p"."created_at",
    "p"."updated_at",
    "pt"."title",
    "pt"."description",
    "pt"."content",
    "pt"."language_code",
    COALESCE(( SELECT "jsonb_object_agg"("agg"."reaction", "agg"."cnt") AS "jsonb_object_agg"
           FROM ( SELECT "pr"."reaction",
                    ("count"(*))::integer AS "cnt"
                   FROM "content"."prompt_reactions" "pr"
                  WHERE ("pr"."prompt_id" = "p"."id")
                  GROUP BY "pr"."reaction") "agg"), '{}'::"jsonb") AS "reaction_totals",
    "jsonb_build_object"('handle', "prof"."handle", 'display_name', "prof"."display_name", 'avatar_url', "prof"."avatar_url") AS "author_profile"
   FROM (("content"."prompt_templates" "p"
     LEFT JOIN "lensers"."profiles" "prof" ON (("p"."lenser_id" = "prof"."id")))
     LEFT JOIN "content"."prompt_translations" "pt" ON ((("p"."id" = "pt"."prompt_id") AND ("pt"."is_original" = true))));


ALTER VIEW "content"."vw_auth_prompts" OWNER TO "postgres";


CREATE OR REPLACE VIEW "content"."vw_auth_threads" AS
 SELECT "t"."id",
    "t"."lenser_id",
    "t"."visibility",
    "t"."view_count",
    "t"."reply_count",
    "t"."thumbnail_url",
    "t"."created_at",
    "t"."updated_at",
    "tt"."title",
    "tt"."content",
    "tt"."language_code",
    COALESCE(( SELECT "jsonb_object_agg"("agg"."reaction", "agg"."cnt") AS "jsonb_object_agg"
           FROM ( SELECT "tr"."reaction",
                    ("count"(*))::integer AS "cnt"
                   FROM "content"."thread_reactions" "tr"
                  WHERE ("tr"."thread_id" = "t"."id")
                  GROUP BY "tr"."reaction") "agg"), '{}'::"jsonb") AS "reaction_totals",
    "jsonb_build_object"('handle', "prof"."handle", 'display_name', "prof"."display_name", 'avatar_url', "prof"."avatar_url") AS "author_profile"
   FROM (("content"."threads" "t"
     LEFT JOIN "lensers"."profiles" "prof" ON (("t"."lenser_id" = "prof"."id")))
     LEFT JOIN "content"."thread_translations" "tt" ON ((("t"."id" = "tt"."thread_id") AND ("tt"."is_original" = true))));


ALTER VIEW "content"."vw_auth_threads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "core"."languages" (
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "native_name" "text" NOT NULL,
    "is_default" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "direction" "text" DEFAULT 'ltr'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "languages_code_check" CHECK (("code" ~ '^[a-z]{2}(-[A-Z]{2})?$'::"text")),
    CONSTRAINT "languages_direction_check" CHECK (("direction" = ANY (ARRAY['ltr'::"text", 'rtl'::"text"])))
);


ALTER TABLE "core"."languages" OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "lensers"."waiting_list" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "email_confirmed" boolean DEFAULT false NOT NULL,
    "kvkk_approved" boolean DEFAULT false NOT NULL,
    "utm_source" "text",
    "utm_medium" "text",
    "utm_campaign" "text",
    "utm_content" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "unsubscribe" boolean DEFAULT false NOT NULL,
    "current_token_id" "uuid",
    "last_token_sent_at" timestamp with time zone
);


ALTER TABLE "lensers"."waiting_list" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "lensers"."waiting_list_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "token" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "used" boolean DEFAULT false NOT NULL,
    "active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "lensers"."waiting_list_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "lensers"."waiting_list_unsubscribe_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "token" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "used" boolean DEFAULT false NOT NULL
);


ALTER TABLE "lensers"."waiting_list_unsubscribe_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "ops"."contact" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lenser_id" "uuid",
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "message" "text" NOT NULL,
    "kvkk_approved" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ip_address" "inet",
    "user_agent" "text",
    CONSTRAINT "contact_email_check" CHECK (("email" ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::"text"))
);
ALTER TABLE ONLY "ops"."contact" ALTER COLUMN "ip_address" SET STORAGE EXTENDED;


ALTER TABLE "ops"."contact" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_ai_models_public" AS
 SELECT "slug",
    "name",
    "provider"
   FROM "ai"."models"
  WHERE ("is_public" = true)
  ORDER BY "name";


ALTER VIEW "public"."vw_ai_models_public" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_auth_lenser" AS
 SELECT "u"."id" AS "user_id",
    "l"."id" AS "lenser_id"
   FROM ("auth"."users" "u"
     JOIN "lensers"."profiles" "l" ON (("l"."user_id" = "u"."id")));


ALTER VIEW "public"."vw_auth_lenser" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_content_tags_public" AS
 SELECT "id",
    "slug",
    COALESCE(( SELECT "tag_translations"."name"
           FROM "content"."tag_translations"
          WHERE ("tag_translations"."tag_id" = "t"."id")
         LIMIT 1), "slug") AS "name",
    "visibility"
   FROM "content"."tags" "t"
  WHERE ("visibility" = 'public'::"content"."tag_visibility_enum");


ALTER VIEW "public"."vw_content_tags_public" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_content_thread_replies_public" AS
 SELECT "r"."id",
    "r"."thread_id",
    "r"."parent_reply_id",
    "r"."lenser_id",
    "r"."content",
    "r"."content_html",
    COALESCE(( SELECT "jsonb_object_agg"("agg"."reaction", "agg"."cnt") AS "jsonb_object_agg"
           FROM ( SELECT "trr"."reaction",
                    ("count"(*))::integer AS "cnt"
                   FROM "content"."thread_reply_reactions" "trr"
                  WHERE ("trr"."reply_id" = "r"."id")
                  GROUP BY "trr"."reaction") "agg"), '{}'::"jsonb") AS "reaction_totals",
    "r"."created_at",
    "jsonb_build_object"('handle', "prof"."handle", 'display_name', "prof"."display_name", 'avatar_url', "prof"."avatar_url") AS "author_profile"
   FROM (("content"."thread_replies" "r"
     JOIN "content"."threads" "t" ON (("t"."id" = "r"."thread_id")))
     LEFT JOIN "lensers"."profiles" "prof" ON (("r"."lenser_id" = "prof"."id")))
  WHERE (("t"."visibility" = 'public'::"content"."visibility_enum") AND ("r"."deleted_at" IS NULL))
  ORDER BY "r"."created_at";


ALTER VIEW "public"."vw_content_thread_replies_public" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_content_threads_public" AS
 SELECT "t"."id",
    COALESCE("tt"."title", 'Untitled'::"text") AS "title",
    COALESCE("tt"."content", ''::"text") AS "content",
    "jsonb_build_object"('handle', "prof"."handle", 'display_name', "prof"."display_name", 'avatar_url', "prof"."avatar_url") AS "author_profile",
    COALESCE(( SELECT "jsonb_object_agg"("agg"."reaction", "agg"."cnt") AS "jsonb_object_agg"
           FROM ( SELECT "tr"."reaction",
                    ("count"(*))::integer AS "cnt"
                   FROM "content"."thread_reactions" "tr"
                  WHERE ("tr"."thread_id" = "t"."id")
                  GROUP BY "tr"."reaction") "agg"), '{}'::"jsonb") AS "reaction_totals",
    "t"."reply_count",
    "t"."created_at",
    "t"."thumbnail_url",
    COALESCE(( SELECT "jsonb_agg"("jsonb_build_object"('id', "tg"."id", 'slug', "tg"."slug", 'name', COALESCE(( SELECT "tag_translations"."name"
                   FROM "content"."tag_translations"
                  WHERE ("tag_translations"."tag_id" = "tg"."id")
                 LIMIT 1), "tg"."slug"))) AS "jsonb_agg"
           FROM ("content"."tag_map" "tm"
             JOIN "content"."tags" "tg" ON (("tg"."id" = "tm"."tag_id")))
          WHERE (("tm"."entity_type" = 'thread'::"content"."entity_type_enum") AND ("tm"."entity_id" = "t"."id"))), '[]'::"jsonb") AS "tags"
   FROM (("content"."threads" "t"
     LEFT JOIN "content"."thread_translations" "tt" ON ((("t"."id" = "tt"."thread_id") AND ("tt"."is_original" = true))))
     LEFT JOIN "lensers"."profiles" "prof" ON (("t"."lenser_id" = "prof"."id")))
  WHERE ("t"."visibility" = 'public'::"content"."visibility_enum");


ALTER VIEW "public"."vw_content_threads_public" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_feedback_admin" WITH ("security_invoker"='on') AS
 SELECT "id",
    "product_tag",
    "page",
    "user_id",
    "message",
    "start_date",
    "end_date",
    "created_at",
    "status"
   FROM "analytics"."product_feedback";


ALTER VIEW "public"."vw_feedback_admin" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_feedback_user" WITH ("security_invoker"='on') AS
 SELECT "product_tag",
    "page",
    "message",
    "start_date",
    "end_date",
    "status",
    "created_at"
   FROM "analytics"."product_feedback"
  WHERE ("user_id" = "auth"."uid"());


ALTER VIEW "public"."vw_feedback_user" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "xp"."levels" (
    "id" integer NOT NULL,
    "app_id" "uuid" NOT NULL,
    "level" integer NOT NULL,
    "min_total_xp" bigint NOT NULL,
    "max_total_xp" bigint NOT NULL,
    "metadata" "jsonb"
);


ALTER TABLE "xp"."levels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "xp"."totals" (
    "lenser_id" "uuid" NOT NULL,
    "app_id" "uuid" NOT NULL,
    "total_xp" bigint DEFAULT 0 NOT NULL,
    "current_level" integer DEFAULT 1 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "xp"."totals" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_lensers_public_recent" AS
 SELECT "l"."handle",
    "l"."display_name",
    "l"."avatar_url",
    "l"."headline",
    "l"."status",
    "l"."created_at",
    "t"."lenser_id",
    "t"."total_xp",
    "t"."current_level",
    "t"."app_id",
    "lv"."min_total_xp" AS "min_xp",
    "lv"."max_total_xp" AS "max_xp",
    "jl"."join_order",
    "jl"."joined_at",
    "s"."thread_count",
    "s"."prompt_count",
    "s"."follower_count",
    "s"."following_count"
   FROM (((("lensers"."profiles" "l"
     LEFT JOIN "xp"."totals" "t" ON (("t"."lenser_id" = "l"."id")))
     LEFT JOIN "xp"."levels" "lv" ON ((("lv"."app_id" = "t"."app_id") AND ("lv"."level" = "t"."current_level"))))
     LEFT JOIN "analytics"."lenser_join_log" "jl" ON (("jl"."lenser_id" = "l"."id")))
     LEFT JOIN "analytics"."lenser_stats" "s" ON (("s"."lenser_id" = "l"."id")))
  WHERE (("l"."status" = 'active'::"lensers"."lenser_status") AND ("l"."deletion_requested_at" IS NULL))
  ORDER BY "l"."created_at" DESC
 LIMIT 5;


ALTER VIEW "public"."vw_lensers_public_recent" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_lensers_social_links_private" AS
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


CREATE OR REPLACE VIEW "public"."vw_lensers_social_links_public" AS
 SELECT "p"."handle",
    "l"."platform",
    "l"."url",
    "l"."label"
   FROM ("lensers"."profiles" "p"
     JOIN "lensers"."social_links" "l" ON (("l"."lenser_id" = "p"."id")))
  WHERE (("p"."status" = 'active'::"lensers"."lenser_status") AND ("p"."deletion_requested_at" IS NULL) AND ("p"."visibility" = 'public'::"lensers"."lenser_visibility"));


ALTER VIEW "public"."vw_lensers_social_links_public" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_prompt_templates_public" AS
 SELECT "pt"."id",
    "pt"."lenser_id",
    COALESCE("ptr"."title", 'Untitled'::"text") AS "title",
    "ptr"."description",
    COALESCE("ptr"."content", ''::"text") AS "content",
    "jsonb_build_object"('id', "prof"."id", 'handle', "prof"."handle", 'display_name', "prof"."display_name", 'avatar_url', "prof"."avatar_url") AS "author_profile",
    COALESCE(( SELECT "jsonb_object_agg"("agg"."reaction", "agg"."cnt") AS "jsonb_object_agg"
           FROM ( SELECT "pr"."reaction",
                    ("count"(*))::integer AS "cnt"
                   FROM "content"."prompt_reactions" "pr"
                  WHERE ("pr"."prompt_id" = "pt"."id")
                  GROUP BY "pr"."reaction") "agg"), '{}'::"jsonb") AS "reaction_totals",
    "pt"."created_at",
    COALESCE(( SELECT "jsonb_agg"("jsonb_build_object"('id', "tg"."id", 'slug', "tg"."slug", 'name', COALESCE(( SELECT "tag_translations"."name"
                   FROM "content"."tag_translations"
                  WHERE ("tag_translations"."tag_id" = "tg"."id")
                 LIMIT 1), "tg"."slug"))) AS "jsonb_agg"
           FROM ("content"."tag_map" "tm"
             JOIN "content"."tags" "tg" ON (("tg"."id" = "tm"."tag_id")))
          WHERE (("tm"."entity_type" = 'prompt_template'::"content"."entity_type_enum") AND ("tm"."entity_id" = "pt"."id"))), '[]'::"jsonb") AS "tags"
   FROM (("content"."prompt_templates" "pt"
     LEFT JOIN "content"."prompt_translations" "ptr" ON ((("pt"."id" = "ptr"."prompt_id") AND ("ptr"."is_original" = true))))
     LEFT JOIN "lensers"."profiles" "prof" ON (("pt"."lenser_id" = "prof"."id")))
  WHERE ("pt"."visibility" = 'public'::"content"."visibility_enum");


ALTER VIEW "public"."vw_prompt_templates_public" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_tags_public_extended" AS
 WITH "daily" AS (
         SELECT "tag_activity_daily"."tag_id",
            "sum"("tag_activity_daily"."created_count") AS "created_total",
            "sum"("tag_activity_daily"."viewed_count") AS "viewed_total",
            "sum"("tag_activity_daily"."reacted_count") AS "reacted_total"
           FROM "analytics"."tag_activity_daily"
          GROUP BY "tag_activity_daily"."tag_id"
        ), "recent_7d" AS (
         SELECT "tag_activity_daily"."tag_id",
            "sum"(((("tag_activity_daily"."created_count" * 1) + ("tag_activity_daily"."viewed_count" * 2)) + ("tag_activity_daily"."reacted_count" * 3))) AS "trend_score_7d"
           FROM "analytics"."tag_activity_daily"
          WHERE ("tag_activity_daily"."activity_date" >= (CURRENT_DATE - '7 days'::interval))
          GROUP BY "tag_activity_daily"."tag_id"
        )
 SELECT "t"."id",
    "t"."slug",
    COALESCE(( SELECT "tag_translations"."name"
           FROM "content"."tag_translations"
          WHERE ("tag_translations"."tag_id" = "t"."id")
         LIMIT 1), "t"."slug") AS "name",
    "t"."created_at",
    'public'::"text" AS "visibility",
    COALESCE("d"."created_total", (0)::bigint) AS "created_count",
    COALESCE("d"."viewed_total", (0)::bigint) AS "viewed_count",
    COALESCE("d"."reacted_total", (0)::bigint) AS "reacted_count",
    ((COALESCE("d"."created_total", (0)::bigint) + COALESCE("d"."viewed_total", (0)::bigint)) + COALESCE("d"."reacted_total", (0)::bigint)) AS "total_usage",
    COALESCE("r"."trend_score_7d", (0)::bigint) AS "trend_score"
   FROM (("content"."tags" "t"
     LEFT JOIN "daily" "d" ON (("d"."tag_id" = "t"."id")))
     LEFT JOIN "recent_7d" "r" ON (("r"."tag_id" = "t"."id")))
  WHERE ("t"."visibility" = 'public'::"content"."tag_visibility_enum");


ALTER VIEW "public"."vw_tags_public_extended" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_tags_public_stats" AS
 WITH "events_filtered" AS (
         SELECT "e"."tag_id",
            "e"."activity_type",
            ("e"."occurred_at")::"date" AS "activity_date"
           FROM ((("analytics"."tag_activity_events" "e"
             JOIN "content"."tags" "t_1" ON ((("t_1"."id" = "e"."tag_id") AND ("t_1"."visibility" = 'public'::"content"."tag_visibility_enum"))))
             LEFT JOIN "content"."prompt_templates" "p" ON ((("e"."entity_type" = 'prompt_template'::"content"."entity_type_enum") AND ("e"."entity_id" = "p"."id"))))
             LEFT JOIN "content"."threads" "th" ON ((("e"."entity_type" = 'thread'::"content"."entity_type_enum") AND ("e"."entity_id" = "th"."id"))))
          WHERE ((("e"."entity_type" = 'prompt_template'::"content"."entity_type_enum") AND ("p"."visibility" = 'public'::"content"."visibility_enum")) OR (("e"."entity_type" = 'thread'::"content"."entity_type_enum") AND ("th"."visibility" = 'public'::"content"."visibility_enum")))
        ), "lifetime" AS (
         SELECT "events_filtered"."tag_id",
            "count"(*) FILTER (WHERE ("events_filtered"."activity_type" = 'created'::"text")) AS "created_count",
            "count"(*) FILTER (WHERE ("events_filtered"."activity_type" = 'viewed'::"text")) AS "viewed_count",
            "count"(*) FILTER (WHERE ("events_filtered"."activity_type" = 'reacted'::"text")) AS "reacted_count"
           FROM "events_filtered"
          GROUP BY "events_filtered"."tag_id"
        ), "recent_7d" AS (
         SELECT "events_filtered"."tag_id",
            "sum"(((
                CASE
                    WHEN ("events_filtered"."activity_type" = 'created'::"text") THEN 1
                    ELSE 0
                END +
                CASE
                    WHEN ("events_filtered"."activity_type" = 'viewed'::"text") THEN 2
                    ELSE 0
                END) +
                CASE
                    WHEN ("events_filtered"."activity_type" = 'reacted'::"text") THEN 3
                    ELSE 0
                END)) AS "trend_score_7d"
           FROM "events_filtered"
          WHERE ("events_filtered"."activity_date" >= (CURRENT_DATE - '7 days'::interval))
          GROUP BY "events_filtered"."tag_id"
        )
 SELECT "t"."id",
    "t"."slug",
    COALESCE(( SELECT "tag_translations"."name"
           FROM "content"."tag_translations"
          WHERE ("tag_translations"."tag_id" = "t"."id")
         LIMIT 1), "t"."slug") AS "name",
    "t"."created_at",
    'public'::"text" AS "visibility",
    COALESCE("l"."created_count", (0)::bigint) AS "created_count",
    COALESCE("l"."viewed_count", (0)::bigint) AS "viewed_count",
    COALESCE("l"."reacted_count", (0)::bigint) AS "reacted_count",
    ((COALESCE("l"."created_count", (0)::bigint) + COALESCE("l"."viewed_count", (0)::bigint)) + COALESCE("l"."reacted_count", (0)::bigint)) AS "total_usage",
    COALESCE("r"."trend_score_7d", (0)::bigint) AS "trend_score_7d"
   FROM (("content"."tags" "t"
     LEFT JOIN "lifetime" "l" ON (("l"."tag_id" = "t"."id")))
     LEFT JOIN "recent_7d" "r" ON (("r"."tag_id" = "t"."id")))
  WHERE ("t"."visibility" = 'public'::"content"."tag_visibility_enum");


ALTER VIEW "public"."vw_tags_public_stats" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_xp_leaderboard_global" AS
 WITH "ranked" AS (
         SELECT "t"."app_id",
            "t"."lenser_id",
            "t"."total_xp",
            "t"."current_level",
            "rank"() OVER (PARTITION BY "t"."app_id" ORDER BY "t"."total_xp" DESC, "t"."lenser_id") AS "rank"
           FROM "xp"."totals" "t"
        ), "top100" AS (
         SELECT "ranked"."app_id",
            "ranked"."lenser_id",
            "ranked"."total_xp",
            "ranked"."current_level",
            "ranked"."rank"
           FROM "ranked"
          WHERE ("ranked"."rank" <= 100)
        ), "me" AS (
         SELECT "ranked"."app_id",
            "ranked"."lenser_id",
            "ranked"."total_xp",
            "ranked"."current_level",
            "ranked"."rank"
           FROM "ranked"
          WHERE ("ranked"."lenser_id" = "auth"."uid"())
        )
 SELECT "t"."app_id",
    "t"."rank",
    "t"."lenser_id",
    "t"."total_xp",
    "t"."current_level",
    "jsonb_build_object"('display_name', "l"."display_name", 'handle', "l"."handle", 'avatar_url', "l"."avatar_url") AS "user"
   FROM ("top100" "t"
     JOIN "lensers"."profiles" "l" ON (("l"."id" = "t"."lenser_id")))
UNION
 SELECT "m"."app_id",
    "m"."rank",
    "m"."lenser_id",
    "m"."total_xp",
    "m"."current_level",
    "jsonb_build_object"('display_name', "l"."display_name", 'handle', "l"."handle", 'avatar_url', "l"."avatar_url") AS "user"
   FROM ("me" "m"
     JOIN "lensers"."profiles" "l" ON (("l"."id" = "m"."lenser_id")));


ALTER VIEW "public"."vw_xp_leaderboard_global" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "xp"."season_totals" (
    "season_id" "uuid" NOT NULL,
    "lenser_id" "uuid" NOT NULL,
    "app_id" "uuid" NOT NULL,
    "total_xp" bigint DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "xp"."season_totals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "xp"."seasons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "app_id" "uuid" NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text",
    "starts_at" timestamp with time zone NOT NULL,
    "ends_at" timestamp with time zone NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "xp"."seasons" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_xp_leaderboard_season" AS
 WITH "ranked" AS (
         SELECT "st"."season_id",
            "s"."slug" AS "season_slug",
            "st"."app_id",
            "st"."lenser_id",
            "st"."total_xp",
            "rank"() OVER (PARTITION BY "st"."season_id", "st"."app_id" ORDER BY "st"."total_xp" DESC, "st"."lenser_id") AS "rank"
           FROM ("xp"."season_totals" "st"
             JOIN "xp"."seasons" "s" ON (("s"."id" = "st"."season_id")))
        ), "top100" AS (
         SELECT "ranked"."season_id",
            "ranked"."season_slug",
            "ranked"."app_id",
            "ranked"."lenser_id",
            "ranked"."total_xp",
            "ranked"."rank"
           FROM "ranked"
          WHERE ("ranked"."rank" <= 100)
        ), "me" AS (
         SELECT "ranked"."season_id",
            "ranked"."season_slug",
            "ranked"."app_id",
            "ranked"."lenser_id",
            "ranked"."total_xp",
            "ranked"."rank"
           FROM "ranked"
          WHERE ("ranked"."lenser_id" = "auth"."uid"())
        )
 SELECT "t"."season_id",
    "t"."season_slug",
    "t"."app_id",
    "t"."rank",
    "t"."lenser_id",
    "t"."total_xp",
    "jsonb_build_object"('display_name', "l"."display_name", 'handle', "l"."handle", 'avatar_url', "l"."avatar_url") AS "user"
   FROM ("top100" "t"
     JOIN "lensers"."profiles" "l" ON (("l"."id" = "t"."lenser_id")))
UNION
 SELECT "m"."season_id",
    "m"."season_slug",
    "m"."app_id",
    "m"."rank",
    "m"."lenser_id",
    "m"."total_xp",
    "jsonb_build_object"('display_name', "l"."display_name", 'handle', "l"."handle", 'avatar_url', "l"."avatar_url") AS "user"
   FROM ("me" "m"
     JOIN "lensers"."profiles" "l" ON (("l"."id" = "m"."lenser_id")));


ALTER VIEW "public"."vw_xp_leaderboard_season" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "system"."entity_translations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" "system"."entity_type_enum" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "lang" "text" NOT NULL,
    "field" "system"."translation_field_enum" NOT NULL,
    "value" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "system"."entity_translations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "system"."languages" (
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "native_name" "text" NOT NULL,
    "is_default" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "system"."languages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "xp"."event_verifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "ai_verified" boolean NOT NULL,
    "verifier" "text",
    "details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "xp"."event_verifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "xp"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lenser_id" "uuid",
    "app_id" "uuid" NOT NULL,
    "rule_id" "uuid" NOT NULL,
    "action_key" "text" NOT NULL,
    "xp" integer NOT NULL,
    "base_xp" integer NOT NULL,
    "source" "xp"."source_enum" NOT NULL,
    "source_ref_type" "text",
    "source_ref_id" "uuid",
    "signature" "text",
    "ai_verified" boolean DEFAULT false,
    "meta" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "xp"."events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "xp"."level_ups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lenser_id" "uuid" NOT NULL,
    "app_id" "uuid" NOT NULL,
    "old_level" integer NOT NULL,
    "new_level" integer NOT NULL,
    "total_xp_at" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "xp"."level_ups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "xp"."monthly_rollup" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lenser_id" "uuid" NOT NULL,
    "year" integer NOT NULL,
    "month" integer NOT NULL,
    "xp" bigint DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "xp"."monthly_rollup" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "xp"."policy" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "policy" "jsonb" NOT NULL,
    "signature" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "xp"."policy" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "xp"."rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "app_id" "uuid" NOT NULL,
    "action_key" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "base_xp" integer NOT NULL,
    "max_xp_per_day" integer,
    "max_events_per_day" integer,
    "cooldown_seconds" integer,
    "max_xp_per_season" integer,
    "streak_type" "text",
    "signature_required" boolean DEFAULT false NOT NULL,
    "metadata" "jsonb",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "xp"."rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "xp"."streaks" (
    "lenser_id" "uuid" NOT NULL,
    "app_id" "uuid" NOT NULL,
    "streak_type" "text" NOT NULL,
    "current_streak" integer DEFAULT 0 NOT NULL,
    "longest_streak" integer DEFAULT 0 NOT NULL,
    "last_occurrence_at" "date",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "xp"."streaks" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "xp"."xp_levels_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "xp"."xp_levels_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "xp"."xp_levels_id_seq" OWNED BY "xp"."levels"."id";



ALTER TABLE ONLY "analytics"."lenser_join_log" ALTER COLUMN "join_order" SET DEFAULT "nextval"('"analytics"."lenser_join_sequence"'::"regclass");



ALTER TABLE ONLY "analytics"."tag_activity_daily" ALTER COLUMN "id" SET DEFAULT "nextval"('"analytics"."tag_activity_daily_id_seq"'::"regclass");



ALTER TABLE ONLY "analytics"."tag_activity_events" ALTER COLUMN "id" SET DEFAULT "nextval"('"analytics"."tag_activity_events_id_seq"'::"regclass");



ALTER TABLE ONLY "xp"."levels" ALTER COLUMN "id" SET DEFAULT "nextval"('"xp"."xp_levels_id_seq"'::"regclass");



ALTER TABLE ONLY "ai"."generations"
    ADD CONSTRAINT "ai_generations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "ai"."models"
    ADD CONSTRAINT "ai_models_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "ai"."models"
    ADD CONSTRAINT "ai_models_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "analytics"."product_feedback"
    ADD CONSTRAINT "feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "analytics"."lenser_activity"
    ADD CONSTRAINT "lenser_activity_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "analytics"."lenser_country_join_log"
    ADD CONSTRAINT "lenser_country_join_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "analytics"."lenser_stats"
    ADD CONSTRAINT "lenser_engagement_totals_pkey" PRIMARY KEY ("lenser_id");



ALTER TABLE ONLY "analytics"."lenser_join_log"
    ADD CONSTRAINT "lenser_join_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "analytics"."lenser_join_log"
    ADD CONSTRAINT "lenser_join_log_unique_lenser" UNIQUE ("lenser_id");



ALTER TABLE ONLY "analytics"."page_views"
    ADD CONSTRAINT "page_views_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "analytics"."share_events"
    ADD CONSTRAINT "share_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "analytics"."shared_links"
    ADD CONSTRAINT "shared_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "analytics"."shared_links"
    ADD CONSTRAINT "shared_links_short_id_key" UNIQUE ("short_id");



ALTER TABLE ONLY "analytics"."tag_activity_daily"
    ADD CONSTRAINT "tag_activity_daily_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "analytics"."tag_activity_daily"
    ADD CONSTRAINT "tag_activity_daily_unique" UNIQUE ("tag_id", "entity_type", "activity_date");



ALTER TABLE ONLY "analytics"."tag_activity_events"
    ADD CONSTRAINT "tag_activity_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "analytics"."lenser_country_join_log"
    ADD CONSTRAINT "unique_country_join_per_lenser" UNIQUE ("lenser_id", "country_code");



ALTER TABLE ONLY "battles"."battles"
    ADD CONSTRAINT "battles_invite_code_unique" UNIQUE ("invite_code");



ALTER TABLE ONLY "battles"."battles"
    ADD CONSTRAINT "battles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "battles"."battles"
    ADD CONSTRAINT "battles_slug_unique" UNIQUE ("slug");



ALTER TABLE ONLY "battles"."contenders"
    ADD CONSTRAINT "contenders_battle_ref_unique" UNIQUE ("battle_id", "contender_ref_id");



ALTER TABLE ONLY "battles"."contenders"
    ADD CONSTRAINT "contenders_battle_slot_unique" UNIQUE ("battle_id", "slot");



ALTER TABLE ONLY "battles"."contenders"
    ADD CONSTRAINT "contenders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "battles"."rubric_criteria"
    ADD CONSTRAINT "rubric_criteria_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "battles"."rubric_criteria"
    ADD CONSTRAINT "rubric_criteria_rubric_ordinal_unique" UNIQUE ("rubric_id", "ordinal");



ALTER TABLE ONLY "battles"."rubrics"
    ADD CONSTRAINT "rubrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "battles"."scorecards"
    ADD CONSTRAINT "scorecards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "battles"."scorecards"
    ADD CONSTRAINT "scorecards_unique_per_criterion" UNIQUE ("battle_id", "contender_id", "rubric_criterion_id");



ALTER TABLE ONLY "battles"."submissions"
    ADD CONSTRAINT "submissions_battle_contender_unique" UNIQUE ("battle_id", "contender_id");



ALTER TABLE ONLY "battles"."submissions"
    ADD CONSTRAINT "submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "battles"."votes"
    ADD CONSTRAINT "votes_battle_voter_unique" UNIQUE ("battle_id", "voter_lenser_id");



ALTER TABLE ONLY "battles"."votes"
    ADD CONSTRAINT "votes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "content"."media_library"
    ADD CONSTRAINT "media_library_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "content"."prompt_reactions"
    ADD CONSTRAINT "prompt_reactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "content"."prompt_reactions"
    ADD CONSTRAINT "prompt_reactions_prompt_id_user_id_reaction_key" UNIQUE ("prompt_id", "user_id", "reaction");



ALTER TABLE ONLY "content"."prompt_templates"
    ADD CONSTRAINT "prompt_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "content"."prompt_translations"
    ADD CONSTRAINT "prompt_translations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "content"."prompt_translations"
    ADD CONSTRAINT "prompt_translations_prompt_id_language_id_key" UNIQUE ("prompt_id", "language_code");



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



ALTER TABLE ONLY "content"."thread_reactions"
    ADD CONSTRAINT "thread_reactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "content"."thread_reactions"
    ADD CONSTRAINT "thread_reactions_thread_id_user_id_reaction_key" UNIQUE ("thread_id", "user_id", "reaction");



ALTER TABLE ONLY "content"."thread_replies"
    ADD CONSTRAINT "thread_replies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "content"."thread_reply_reactions"
    ADD CONSTRAINT "thread_reply_reactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "content"."thread_reply_reactions"
    ADD CONSTRAINT "thread_reply_reactions_reply_id_user_id_reaction_key" UNIQUE ("reply_id", "user_id", "reaction");



ALTER TABLE ONLY "content"."thread_translations"
    ADD CONSTRAINT "thread_translations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "content"."thread_translations"
    ADD CONSTRAINT "thread_translations_thread_id_language_id_key" UNIQUE ("thread_id", "language_code");



ALTER TABLE ONLY "content"."threads"
    ADD CONSTRAINT "threads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "core"."languages"
    ADD CONSTRAINT "languages_code_key" UNIQUE ("code");



ALTER TABLE ONLY "core"."languages"
    ADD CONSTRAINT "languages_code_pkey" PRIMARY KEY ("code");



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



ALTER TABLE ONLY "lensers"."profiles"
    ADD CONSTRAINT "lensers_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "lensers"."waiting_list"
    ADD CONSTRAINT "waiting_list_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "lensers"."waiting_list_tokens"
    ADD CONSTRAINT "waiting_list_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "lensers"."waiting_list_tokens"
    ADD CONSTRAINT "waiting_list_tokens_token_key" UNIQUE ("token");



ALTER TABLE ONLY "lensers"."waiting_list_unsubscribe_tokens"
    ADD CONSTRAINT "waiting_list_unsubscribe_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "ops"."contact"
    ADD CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "system"."entity_translations"
    ADD CONSTRAINT "entity_translations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "system"."entity_translations"
    ADD CONSTRAINT "entity_translations_unique" UNIQUE ("entity_type", "entity_id", "lang", "field");



ALTER TABLE ONLY "system"."languages"
    ADD CONSTRAINT "languages_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "xp"."level_ups"
    ADD CONSTRAINT "lenser_level_ups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "xp"."event_verifications"
    ADD CONSTRAINT "xp_event_verifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "xp"."events"
    ADD CONSTRAINT "xp_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "xp"."levels"
    ADD CONSTRAINT "xp_levels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "xp"."monthly_rollup"
    ADD CONSTRAINT "xp_monthly_rollup_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "xp"."monthly_rollup"
    ADD CONSTRAINT "xp_monthly_rollup_unique" UNIQUE ("lenser_id", "year", "month");



ALTER TABLE ONLY "xp"."policy"
    ADD CONSTRAINT "xp_policy_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "xp"."rules"
    ADD CONSTRAINT "xp_rules_action_key_key" UNIQUE ("action_key");



ALTER TABLE ONLY "xp"."rules"
    ADD CONSTRAINT "xp_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "xp"."season_totals"
    ADD CONSTRAINT "xp_season_totals_pkey" PRIMARY KEY ("season_id", "lenser_id", "app_id");



ALTER TABLE ONLY "xp"."seasons"
    ADD CONSTRAINT "xp_seasons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "xp"."seasons"
    ADD CONSTRAINT "xp_seasons_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "xp"."streaks"
    ADD CONSTRAINT "xp_streaks_pkey" PRIMARY KEY ("lenser_id", "app_id", "streak_type");



ALTER TABLE ONLY "xp"."totals"
    ADD CONSTRAINT "xp_totals_pkey" PRIMARY KEY ("lenser_id", "app_id");



CREATE INDEX "ai_generations_lenser_idx" ON "ai"."generations" USING "btree" ("lenser_id");



CREATE INDEX "ai_generations_media_idx" ON "ai"."generations" USING "btree" ("media_id");



CREATE INDEX "ai_generations_model_idx" ON "ai"."generations" USING "btree" ("ai_model_id");



CREATE INDEX "ai_generations_prompt_tpl_idx" ON "ai"."generations" USING "btree" ("prompt_template_id");



CREATE INDEX "ai_generations_visibility_idx" ON "ai"."generations" USING "btree" ("visibility");



CREATE INDEX "ai_models_slug_idx" ON "ai"."models" USING "btree" ("slug");



CREATE INDEX "feedback_user_id_idx" ON "analytics"."product_feedback" USING "btree" ("user_id");



CREATE INDEX "idx_country_join_order" ON "analytics"."lenser_country_join_log" USING "btree" ("country_code", "country_join_order");



CREATE INDEX "lenser_engagement_totals_lenser_id_idx" ON "analytics"."lenser_stats" USING "btree" ("lenser_id");



CREATE INDEX "lenser_join_log_join_order_idx" ON "analytics"."lenser_join_log" USING "btree" ("join_order");



CREATE INDEX "page_views_created_at_idx" ON "analytics"."page_views" USING "btree" ("created_at");



CREATE INDEX "page_views_target_idx" ON "analytics"."page_views" USING "btree" ("target_type", "target_id");



CREATE INDEX "share_events_event_type_idx" ON "analytics"."share_events" USING "btree" ("event_type");



CREATE INDEX "share_events_ip_hash_idx" ON "analytics"."share_events" USING "btree" ("ip_hash", "created_at");



CREATE INDEX "share_events_link_idx" ON "analytics"."share_events" USING "btree" ("shared_link_id", "created_at");



CREATE INDEX "share_events_viewer_lenser_idx" ON "analytics"."share_events" USING "btree" ("viewer_lenser_id", "created_at");



CREATE INDEX "shared_links_campaign_idx" ON "analytics"."shared_links" USING "btree" ("campaign_key");



CREATE INDEX "shared_links_creator_lenser_id_idx" ON "analytics"."shared_links" USING "btree" ("creator_lenser_id");



CREATE INDEX "shared_links_resource_idx" ON "analytics"."shared_links" USING "btree" ("resource_type", "resource_id");



CREATE INDEX "shared_links_short_id_idx" ON "analytics"."shared_links" USING "btree" ("short_id");



CREATE INDEX "tag_activity_daily_entity_date_idx" ON "analytics"."tag_activity_daily" USING "btree" ("entity_type", "activity_date");



CREATE INDEX "tag_activity_daily_tag_date_idx" ON "analytics"."tag_activity_daily" USING "btree" ("tag_id", "activity_date");



CREATE INDEX "tag_activity_events_actor_idx" ON "analytics"."tag_activity_events" USING "btree" ("actor_id");



CREATE INDEX "tag_activity_events_entity_idx" ON "analytics"."tag_activity_events" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "tag_activity_events_occurred_at_idx" ON "analytics"."tag_activity_events" USING "btree" ("occurred_at");



CREATE INDEX "tag_activity_events_tag_idx" ON "analytics"."tag_activity_events" USING "btree" ("tag_id");



CREATE INDEX "idx_battles_creator" ON "battles"."battles" USING "btree" ("creator_lenser_id");



CREATE INDEX "idx_battles_slug" ON "battles"."battles" USING "btree" ("slug");



CREATE INDEX "idx_battles_status" ON "battles"."battles" USING "btree" ("status");



CREATE INDEX "idx_contenders_battle" ON "battles"."contenders" USING "btree" ("battle_id");



CREATE INDEX "idx_rubrics_creator" ON "battles"."rubrics" USING "btree" ("creator_lenser_id");



CREATE INDEX "idx_scorecards_battle_contender" ON "battles"."scorecards" USING "btree" ("battle_id", "contender_id");



CREATE INDEX "idx_submissions_battle" ON "battles"."submissions" USING "btree" ("battle_id");



CREATE INDEX "idx_submissions_contender" ON "battles"."submissions" USING "btree" ("contender_id");



CREATE INDEX "idx_votes_battle" ON "battles"."votes" USING "btree" ("battle_id");



CREATE INDEX "idx_votes_voter" ON "battles"."votes" USING "btree" ("voter_lenser_id");



CREATE INDEX "media_library_created_at_idx" ON "content"."media_library" USING "btree" ("created_at");



CREATE INDEX "media_library_lenser_idx" ON "content"."media_library" USING "btree" ("lenser_id");



CREATE INDEX "prompt_templates_lenser_idx" ON "content"."prompt_templates" USING "btree" ("lenser_id");



CREATE INDEX "prompt_templates_visibility_idx" ON "content"."prompt_templates" USING "btree" ("visibility");



CREATE INDEX "tag_map_entity_idx" ON "content"."tag_map" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "tag_map_language_idx" ON "content"."tag_map" USING "btree" ("language_detected");



CREATE INDEX "tag_map_tag_idx" ON "content"."tag_map" USING "btree" ("tag_id");



CREATE INDEX "tags_visibility_idx" ON "content"."tags" USING "btree" ("visibility");



CREATE INDEX "threads_lenser_idx" ON "content"."threads" USING "btree" ("lenser_id");



CREATE INDEX "threads_visibility_idx" ON "content"."threads" USING "btree" ("visibility");



CREATE INDEX "idx_lensers_social_links_lenser_id" ON "lensers"."social_links" USING "btree" ("lenser_id");



CREATE INDEX "idx_profiles_handle" ON "lensers"."profiles" USING "btree" ("handle");



CREATE INDEX "idx_profiles_joined_at" ON "lensers"."profiles" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_profiles_user_id" ON "lensers"."profiles" USING "btree" ("user_id");



CREATE UNIQUE INDEX "idx_waiting_list_email_unique" ON "lensers"."waiting_list" USING "btree" ("email");



CREATE INDEX "lenser_badges_lenser_id_idx" ON "lensers"."badges" USING "btree" ("lenser_id");



CREATE INDEX "lenser_social_links_lenser_id_idx" ON "lensers"."social_links" USING "btree" ("lenser_id");



CREATE INDEX "lensers_handle_idx" ON "lensers"."profiles" USING "btree" ("handle");



CREATE UNIQUE INDEX "lensers_handle_lower_idx" ON "lensers"."profiles" USING "btree" ("lower"("handle"));



CREATE INDEX "lensers_profiles_active_recent_idx" ON "lensers"."profiles" USING "btree" ("created_at" DESC) WHERE (("status" = 'active'::"lensers"."lenser_status") AND ("deletion_requested_at" IS NULL));



CREATE INDEX "lensers_user_id_idx" ON "lensers"."profiles" USING "btree" ("user_id");



CREATE INDEX "contact_messages_created_idx" ON "ops"."contact" USING "btree" ("created_at" DESC);



CREATE INDEX "contact_messages_lenser_idx" ON "ops"."contact" USING "btree" ("lenser_id");



CREATE INDEX "idx_translations_entity" ON "system"."entity_translations" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_translations_entity_lang" ON "system"."entity_translations" USING "btree" ("entity_type", "entity_id", "lang");



CREATE INDEX "idx_translations_field" ON "system"."entity_translations" USING "btree" ("field");



CREATE INDEX "idx_translations_lang" ON "system"."entity_translations" USING "btree" ("lang");



CREATE INDEX "idx_xp_totals_lenser_id" ON "xp"."totals" USING "btree" ("lenser_id");



CREATE INDEX "xp_events_action_idx" ON "xp"."events" USING "btree" ("action_key");



CREATE INDEX "xp_events_created_idx" ON "xp"."events" USING "btree" ("created_at");



CREATE INDEX "xp_events_lenser_idx" ON "xp"."events" USING "btree" ("lenser_id");



CREATE INDEX "xp_events_rule_idx" ON "xp"."events" USING "btree" ("rule_id");



CREATE INDEX "xp_levels_app_level_idx" ON "xp"."levels" USING "btree" ("app_id", "level");



CREATE INDEX "xp_monthly_rollup_idx" ON "xp"."monthly_rollup" USING "btree" ("lenser_id", "year", "month");



CREATE INDEX "xp_policy_created_at_idx" ON "xp"."policy" USING "btree" ("created_at");



CREATE INDEX "xp_totals_idx" ON "xp"."totals" USING "btree" ("app_id", "total_xp" DESC);



CREATE INDEX "xp_totals_lenser_id_idx" ON "xp"."totals" USING "btree" ("lenser_id");



CREATE OR REPLACE TRIGGER "ai_generations_media_owner_enforce" BEFORE INSERT OR UPDATE ON "ai"."generations" FOR EACH ROW EXECUTE FUNCTION "ai"."ai_generations_media_owner_check"();



CREATE OR REPLACE TRIGGER "trg_lenser_join_award_badges" AFTER INSERT ON "analytics"."lenser_join_log" FOR EACH ROW EXECUTE FUNCTION "lensers"."trg_award_founder_badges"();



CREATE OR REPLACE TRIGGER "trg_no_delete_lenser_join_log" BEFORE DELETE ON "analytics"."lenser_join_log" FOR EACH ROW EXECUTE FUNCTION "lensers"."prevent_lenser_join_log_delete"();



CREATE OR REPLACE TRIGGER "trg_no_update_lenser_join_log" BEFORE UPDATE ON "analytics"."lenser_join_log" FOR EACH ROW EXECUTE FUNCTION "lensers"."prevent_lenser_join_log_update"();



CREATE OR REPLACE TRIGGER "trg_protect_feedback_system_fields" BEFORE UPDATE ON "analytics"."product_feedback" FOR EACH ROW EXECUTE FUNCTION "analytics"."protect_feedback_system_fields"();



CREATE OR REPLACE TRIGGER "trg_set_feedback_user_id" BEFORE INSERT ON "analytics"."product_feedback" FOR EACH ROW EXECUTE FUNCTION "analytics"."set_feedback_user_id"();



CREATE OR REPLACE TRIGGER "trg_sync_join_order" AFTER INSERT ON "analytics"."lenser_join_log" FOR EACH ROW EXECUTE FUNCTION "lensers"."sync_join_order"();



CREATE OR REPLACE TRIGGER "trg_award_battle_xp" AFTER UPDATE ON "battles"."battles" FOR EACH ROW EXECUTE FUNCTION "battles"."award_battle_xp"();



CREATE OR REPLACE TRIGGER "trg_battles_updated_at" BEFORE UPDATE ON "battles"."battles" FOR EACH ROW EXECUTE FUNCTION "battles"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_rubrics_updated_at" BEFORE UPDATE ON "battles"."rubrics" FOR EACH ROW EXECUTE FUNCTION "battles"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_submissions_updated_at" BEFORE UPDATE ON "battles"."submissions" FOR EACH ROW EXECUTE FUNCTION "battles"."set_updated_at"();



CREATE OR REPLACE TRIGGER "tg_xp_prompt_created" AFTER INSERT ON "content"."prompt_templates" FOR EACH ROW EXECUTE FUNCTION "xp"."on_prompt_created"();



CREATE OR REPLACE TRIGGER "tg_xp_thread_created" AFTER INSERT ON "content"."threads" FOR EACH ROW EXECUTE FUNCTION "xp"."on_thread_created"();



CREATE OR REPLACE TRIGGER "thread_replies_after_delete" AFTER DELETE ON "content"."thread_replies" FOR EACH ROW EXECUTE FUNCTION "content"."thread_replies_after_delete_trigger"();



CREATE OR REPLACE TRIGGER "thread_replies_after_insert" AFTER INSERT ON "content"."thread_replies" FOR EACH ROW EXECUTE FUNCTION "content"."thread_replies_after_insert_trigger"();



CREATE OR REPLACE TRIGGER "thread_replies_after_update" AFTER UPDATE ON "content"."thread_replies" FOR EACH ROW EXECUTE FUNCTION "content"."thread_replies_after_update_trigger"();



CREATE OR REPLACE TRIGGER "trg_sync_prompt_count" AFTER INSERT OR DELETE ON "content"."prompt_templates" FOR EACH ROW EXECUTE FUNCTION "content"."sync_prompt_count"();



CREATE OR REPLACE TRIGGER "trg_sync_thread_count" AFTER INSERT OR DELETE ON "content"."threads" FOR EACH ROW EXECUTE FUNCTION "content"."sync_thread_count"();



CREATE OR REPLACE TRIGGER "trg_tag_created" AFTER INSERT ON "content"."tag_map" FOR EACH ROW EXECUTE FUNCTION "xp"."on_tag_created"();



CREATE OR REPLACE TRIGGER "trg_xp_on_reply_created" AFTER INSERT ON "content"."thread_replies" FOR EACH ROW EXECUTE FUNCTION "xp"."on_reply_created"();



CREATE OR REPLACE TRIGGER "trg_xp_on_reply_received" AFTER INSERT ON "content"."thread_replies" FOR EACH ROW EXECUTE FUNCTION "xp"."on_reply_received"();



CREATE OR REPLACE TRIGGER "trg_xp_on_thread_created" AFTER INSERT ON "content"."threads" FOR EACH ROW EXECUTE FUNCTION "xp"."on_thread_created"();



CREATE OR REPLACE TRIGGER "trg_after_lenser_insert" AFTER INSERT ON "lensers"."profiles" FOR EACH ROW EXECUTE FUNCTION "lensers"."trg_create_join_log"();



CREATE OR REPLACE TRIGGER "trg_anonymize_join_log" AFTER DELETE ON "lensers"."profiles" FOR EACH ROW EXECUTE FUNCTION "lensers"."anonymize_join_log"();



CREATE OR REPLACE TRIGGER "trg_enforce_deletion_request" BEFORE UPDATE ON "lensers"."profiles" FOR EACH ROW EXECUTE FUNCTION "lensers"."enforce_deletion_request"();



CREATE OR REPLACE TRIGGER "trg_enforce_lensers_protections" BEFORE INSERT OR UPDATE ON "lensers"."profiles" FOR EACH ROW EXECUTE FUNCTION "lensers"."enforce_lensers_protections"();



CREATE OR REPLACE TRIGGER "trg_handle_deletion_request" BEFORE UPDATE ON "lensers"."profiles" FOR EACH ROW EXECUTE FUNCTION "lensers"."trg_handle_deletion_request"();



CREATE OR REPLACE TRIGGER "trg_init_lenser_engagement_row" AFTER INSERT ON "lensers"."profiles" FOR EACH ROW EXECUTE FUNCTION "lensers"."init_lenser_engagement_row"();



CREATE OR REPLACE TRIGGER "trg_log_lenser_join" AFTER INSERT ON "lensers"."profiles" FOR EACH ROW EXECUTE FUNCTION "lensers"."log_lenser_join"();



CREATE OR REPLACE TRIGGER "trg_normalize_website_url" BEFORE INSERT OR UPDATE ON "lensers"."profiles" FOR EACH ROW EXECUTE FUNCTION "content"."normalize_website_url"();



CREATE OR REPLACE TRIGGER "trg_protect_sensitive_lenser_fields" BEFORE UPDATE ON "lensers"."profiles" FOR EACH ROW EXECUTE FUNCTION "lensers"."protect_sensitive_lenser_fields"();



CREATE OR REPLACE TRIGGER "trg_sync_profile_from_auth_metadata" BEFORE INSERT ON "lensers"."profiles" FOR EACH ROW EXECUTE FUNCTION "lensers"."sync_profile_from_auth_metadata"();



CREATE OR REPLACE TRIGGER "trg_system_entity_translations_touch" BEFORE UPDATE ON "system"."entity_translations" FOR EACH ROW EXECUTE FUNCTION "system"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_no_delete_events" BEFORE DELETE ON "xp"."events" FOR EACH ROW EXECUTE FUNCTION "xp"."prevent_event_mutations"();



CREATE OR REPLACE TRIGGER "trg_no_update_events" BEFORE UPDATE ON "xp"."events" FOR EACH ROW EXECUTE FUNCTION "xp"."prevent_event_mutations"();



CREATE OR REPLACE TRIGGER "trg_sync_total" AFTER INSERT OR UPDATE ON "xp"."totals" FOR EACH ROW EXECUTE FUNCTION "xp"."sync_total"();



ALTER TABLE ONLY "ai"."generations"
    ADD CONSTRAINT "ai_generations_ai_model_id_fkey" FOREIGN KEY ("ai_model_id") REFERENCES "ai"."models"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "ai"."generations"
    ADD CONSTRAINT "ai_generations_lenser_id_fkey" FOREIGN KEY ("lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "ai"."generations"
    ADD CONSTRAINT "ai_generations_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "content"."media_library"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "ai"."generations"
    ADD CONSTRAINT "ai_generations_prompt_template_id_fkey" FOREIGN KEY ("prompt_template_id") REFERENCES "content"."prompt_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "analytics"."product_feedback"
    ADD CONSTRAINT "feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "analytics"."lenser_activity"
    ADD CONSTRAINT "lenser_activity_lenser_id_fkey" FOREIGN KEY ("lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "analytics"."lenser_country_join_log"
    ADD CONSTRAINT "lenser_country_join_log_lenser_id_fkey" FOREIGN KEY ("lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "analytics"."lenser_stats"
    ADD CONSTRAINT "lenser_engagement_totals_lenser_id_fkey" FOREIGN KEY ("lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "analytics"."lenser_join_log"
    ADD CONSTRAINT "lenser_join_log_lenser_id_fkey" FOREIGN KEY ("lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "analytics"."page_views"
    ADD CONSTRAINT "page_views_lenser_id_fkey" FOREIGN KEY ("lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "analytics"."page_views"
    ADD CONSTRAINT "page_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "analytics"."share_events"
    ADD CONSTRAINT "share_events_shared_link_id_fkey" FOREIGN KEY ("shared_link_id") REFERENCES "analytics"."shared_links"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "analytics"."share_events"
    ADD CONSTRAINT "share_events_viewer_lenser_id_fkey" FOREIGN KEY ("viewer_lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "analytics"."shared_links"
    ADD CONSTRAINT "shared_links_creator_lenser_id_fkey" FOREIGN KEY ("creator_lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "analytics"."tag_activity_events"
    ADD CONSTRAINT "tag_activity_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "lensers"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "battles"."battles"
    ADD CONSTRAINT "battles_creator_lenser_id_fkey" FOREIGN KEY ("creator_lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "battles"."battles"
    ADD CONSTRAINT "battles_forum_thread_id_fkey" FOREIGN KEY ("forum_thread_id") REFERENCES "content"."threads"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "battles"."battles"
    ADD CONSTRAINT "battles_rubric_id_fkey" FOREIGN KEY ("rubric_id") REFERENCES "battles"."rubrics"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "battles"."battles"
    ADD CONSTRAINT "battles_winner_contender_id_fkey" FOREIGN KEY ("winner_contender_id") REFERENCES "battles"."contenders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "battles"."contenders"
    ADD CONSTRAINT "contenders_battle_id_fkey" FOREIGN KEY ("battle_id") REFERENCES "battles"."battles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "battles"."rubric_criteria"
    ADD CONSTRAINT "rubric_criteria_rubric_id_fkey" FOREIGN KEY ("rubric_id") REFERENCES "battles"."rubrics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "battles"."rubrics"
    ADD CONSTRAINT "rubrics_creator_lenser_id_fkey" FOREIGN KEY ("creator_lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "battles"."scorecards"
    ADD CONSTRAINT "scorecards_battle_id_fkey" FOREIGN KEY ("battle_id") REFERENCES "battles"."battles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "battles"."scorecards"
    ADD CONSTRAINT "scorecards_contender_id_fkey" FOREIGN KEY ("contender_id") REFERENCES "battles"."contenders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "battles"."scorecards"
    ADD CONSTRAINT "scorecards_rubric_criterion_id_fkey" FOREIGN KEY ("rubric_criterion_id") REFERENCES "battles"."rubric_criteria"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "battles"."scorecards"
    ADD CONSTRAINT "scorecards_scorer_model_id_fkey" FOREIGN KEY ("scorer_model_id") REFERENCES "ai"."models"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "battles"."submissions"
    ADD CONSTRAINT "submissions_battle_id_fkey" FOREIGN KEY ("battle_id") REFERENCES "battles"."battles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "battles"."submissions"
    ADD CONSTRAINT "submissions_contender_id_fkey" FOREIGN KEY ("contender_id") REFERENCES "battles"."contenders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "battles"."votes"
    ADD CONSTRAINT "votes_battle_id_fkey" FOREIGN KEY ("battle_id") REFERENCES "battles"."battles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "battles"."votes"
    ADD CONSTRAINT "votes_voter_lenser_id_fkey" FOREIGN KEY ("voter_lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "content"."media_library"
    ADD CONSTRAINT "media_library_lenser_id_fkey" FOREIGN KEY ("lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "content"."prompt_reactions"
    ADD CONSTRAINT "prompt_reactions_prompt_id_fkey" FOREIGN KEY ("prompt_id") REFERENCES "content"."prompt_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "content"."prompt_templates"
    ADD CONSTRAINT "prompt_templates_lenser_fkey" FOREIGN KEY ("lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "content"."prompt_translations"
    ADD CONSTRAINT "prompt_translations_language_code_fk" FOREIGN KEY ("language_code") REFERENCES "core"."languages"("code") ON DELETE RESTRICT;



ALTER TABLE ONLY "content"."prompt_translations"
    ADD CONSTRAINT "prompt_translations_prompt_id_fkey" FOREIGN KEY ("prompt_id") REFERENCES "content"."prompt_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "content"."tag_map"
    ADD CONSTRAINT "tag_map_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "content"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "content"."tag_suggestions"
    ADD CONSTRAINT "tag_suggestions_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "content"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "content"."tag_translations"
    ADD CONSTRAINT "tag_translations_language_code_fk" FOREIGN KEY ("language_code") REFERENCES "core"."languages"("code") ON DELETE RESTRICT;



ALTER TABLE ONLY "content"."tag_translations"
    ADD CONSTRAINT "tag_translations_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "content"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "content"."thread_reactions"
    ADD CONSTRAINT "thread_reactions_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "content"."threads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "content"."thread_replies"
    ADD CONSTRAINT "thread_replies_lenser_id_fkey" FOREIGN KEY ("lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "content"."thread_replies"
    ADD CONSTRAINT "thread_replies_parent_reply_id_fkey" FOREIGN KEY ("parent_reply_id") REFERENCES "content"."thread_replies"("id");



ALTER TABLE ONLY "content"."thread_replies"
    ADD CONSTRAINT "thread_replies_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "content"."threads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "content"."thread_reply_reactions"
    ADD CONSTRAINT "thread_reply_reactions_reply_id_fkey" FOREIGN KEY ("reply_id") REFERENCES "content"."thread_replies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "content"."thread_translations"
    ADD CONSTRAINT "thread_translations_language_code_fk" FOREIGN KEY ("language_code") REFERENCES "core"."languages"("code") ON DELETE RESTRICT;



ALTER TABLE ONLY "content"."thread_translations"
    ADD CONSTRAINT "thread_translations_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "content"."threads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "content"."threads"
    ADD CONSTRAINT "threads_lenser_fkey" FOREIGN KEY ("lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "lensers"."waiting_list_unsubscribe_tokens"
    ADD CONSTRAINT "fk_unsubscribe_tokens_email" FOREIGN KEY ("email") REFERENCES "lensers"."waiting_list"("email") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "lensers"."waiting_list_tokens"
    ADD CONSTRAINT "fk_waiting_list_email" FOREIGN KEY ("email") REFERENCES "lensers"."waiting_list"("email") ON DELETE CASCADE;



ALTER TABLE ONLY "lensers"."badges"
    ADD CONSTRAINT "lenser_badges_lenser_id_fkey" FOREIGN KEY ("lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "lensers"."social_links"
    ADD CONSTRAINT "lenser_social_links_lenser_id_fkey" FOREIGN KEY ("lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "lensers"."profiles"
    ADD CONSTRAINT "lensers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "lensers"."profiles"
    ADD CONSTRAINT "profiles_preferred_language_fk" FOREIGN KEY ("preferred_language") REFERENCES "core"."languages"("code") ON DELETE RESTRICT;



ALTER TABLE ONLY "ops"."contact"
    ADD CONSTRAINT "contact_messages_lenser_id_fkey" FOREIGN KEY ("lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "system"."entity_translations"
    ADD CONSTRAINT "entity_translations_lang_fkey" FOREIGN KEY ("lang") REFERENCES "system"."languages"("code") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "xp"."level_ups"
    ADD CONSTRAINT "lenser_level_ups_lenser_id_fkey" FOREIGN KEY ("lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "xp"."event_verifications"
    ADD CONSTRAINT "xp_event_verifications_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "xp"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "xp"."events"
    ADD CONSTRAINT "xp_events_lenser_id_fkey" FOREIGN KEY ("lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "xp"."events"
    ADD CONSTRAINT "xp_events_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "xp"."rules"("id");



ALTER TABLE ONLY "xp"."monthly_rollup"
    ADD CONSTRAINT "xp_monthly_rollup_lenser_id_fkey" FOREIGN KEY ("lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "xp"."season_totals"
    ADD CONSTRAINT "xp_season_totals_lenser_id_fkey" FOREIGN KEY ("lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "xp"."season_totals"
    ADD CONSTRAINT "xp_season_totals_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "xp"."seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "xp"."streaks"
    ADD CONSTRAINT "xp_streaks_lenser_id_fkey" FOREIGN KEY ("lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "xp"."totals"
    ADD CONSTRAINT "xp_totals_lenser_id_fkey" FOREIGN KEY ("lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "ai_gen_delete" ON "ai"."generations" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "lensers"."profiles" "l"
  WHERE (("l"."id" = "generations"."lenser_id") AND ("l"."user_id" = "auth"."uid"())))));



CREATE POLICY "ai_gen_insert" ON "ai"."generations" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "lensers"."profiles" "l"
  WHERE (("l"."id" = "generations"."lenser_id") AND ("l"."user_id" = "auth"."uid"())))));



CREATE POLICY "ai_gen_select" ON "ai"."generations" FOR SELECT USING (((("prompt_template_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "content"."prompt_templates" "t"
  WHERE (("t"."id" = "generations"."prompt_template_id") AND ("t"."visibility" = 'public'::"content"."visibility_enum")))) AND ("auth"."role"() = 'authenticated'::"text")) OR (EXISTS ( SELECT 1
   FROM "lensers"."profiles" "l"
  WHERE (("l"."id" = "generations"."lenser_id") AND ("l"."user_id" = "auth"."uid"()))))));



CREATE POLICY "ai_gen_update" ON "ai"."generations" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "lensers"."profiles" "l"
  WHERE (("l"."id" = "generations"."lenser_id") AND ("l"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "lensers"."profiles" "l"
  WHERE (("l"."id" = "generations"."lenser_id") AND ("l"."user_id" = "auth"."uid"())))));



CREATE POLICY "ai_generations_admin_select_all_secure" ON "ai"."generations" FOR SELECT TO "authenticated" USING (((("auth"."jwt"() ->> 'is_super_admin'::"text"))::boolean = true));



CREATE POLICY "ai_generations_delete_own" ON "ai"."generations" FOR DELETE TO "authenticated" USING ("lensers"."user_owns_lenser"("lenser_id"));



CREATE POLICY "ai_generations_insert_own" ON "ai"."generations" FOR INSERT TO "authenticated" WITH CHECK ("lensers"."user_owns_lenser"("lenser_id"));



CREATE POLICY "ai_generations_select_own" ON "ai"."generations" FOR SELECT TO "authenticated" USING (("lenser_id" = "lensers"."get_auth_lenser_id"()));



CREATE POLICY "ai_generations_update_own" ON "ai"."generations" FOR UPDATE TO "authenticated" USING ("lensers"."user_owns_lenser"("lenser_id")) WITH CHECK ("lensers"."user_owns_lenser"("lenser_id"));



CREATE POLICY "ai_models_delete_admin_only" ON "ai"."models" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "ai_models_insert_admin_only" ON "ai"."models" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "ai_models_read_all" ON "ai"."models" FOR SELECT USING (true);



CREATE POLICY "ai_models_select" ON "ai"."models" FOR SELECT USING (true);



CREATE POLICY "ai_models_select_public_or_admin" ON "ai"."models" FOR SELECT USING (("is_public" OR "public"."is_admin"()));



CREATE POLICY "ai_models_update_admin_only" ON "ai"."models" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "ai_models_write" ON "ai"."models" TO "authenticated" USING ((("auth"."jwt"() ->> 'is_super_admin'::"text") = 'true'::"text")) WITH CHECK ((("auth"."jwt"() ->> 'is_super_admin'::"text") = 'true'::"text"));



CREATE POLICY "ai_models_write_service" ON "ai"."models" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "ai"."generations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "insert_own_generations" ON "ai"."generations" FOR INSERT WITH CHECK (("lenser_id" = ( SELECT "vw_auth_lenser"."lenser_id"
   FROM "public"."vw_auth_lenser"
  WHERE ("vw_auth_lenser"."user_id" = "auth"."uid"()))));



ALTER TABLE "ai"."models" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "allow_system_read_lenser_activity" ON "analytics"."lenser_activity" FOR SELECT TO "service_role" USING (true);



CREATE POLICY "allow_trigger_insert" ON "analytics"."lenser_activity" FOR INSERT WITH CHECK (true);



CREATE POLICY "anyone_can_insert_feedback" ON "analytics"."product_feedback" FOR INSERT WITH CHECK (true);



CREATE POLICY "auth_user_can_select_own_feedback" ON "analytics"."product_feedback" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "country_join_log_delete_deny_all" ON "analytics"."lenser_country_join_log" FOR DELETE USING (false);



CREATE POLICY "country_join_log_insert_deny_public" ON "analytics"."lenser_country_join_log" FOR INSERT WITH CHECK (false);



CREATE POLICY "country_join_log_insert_service" ON "analytics"."lenser_country_join_log" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "country_join_log_select_own" ON "analytics"."lenser_country_join_log" FOR SELECT USING (("lenser_id" = "auth"."uid"()));



CREATE POLICY "country_join_log_update_deny_all" ON "analytics"."lenser_country_join_log" FOR UPDATE USING (false) WITH CHECK (false);



CREATE POLICY "daily_delete_deny" ON "analytics"."tag_activity_daily" FOR DELETE USING (false);



CREATE POLICY "daily_insert_deny" ON "analytics"."tag_activity_daily" FOR INSERT WITH CHECK (false);



CREATE POLICY "daily_insert_service" ON "analytics"."tag_activity_daily" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "daily_public_select" ON "analytics"."tag_activity_daily" FOR SELECT USING (true);



CREATE POLICY "daily_update_deny" ON "analytics"."tag_activity_daily" FOR UPDATE USING (false) WITH CHECK (false);



CREATE POLICY "daily_update_service" ON "analytics"."tag_activity_daily" FOR UPDATE TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "deny_all" ON "analytics"."page_views" USING (false) WITH CHECK (false);



CREATE POLICY "deny_all_activity" ON "analytics"."lenser_activity" USING (false) WITH CHECK (false);



CREATE POLICY "deny_all_lenser_activity" ON "analytics"."lenser_activity" USING (false) WITH CHECK (false);



CREATE POLICY "deny_delete_join_log" ON "analytics"."lenser_join_log" FOR DELETE USING (false);



CREATE POLICY "deny_insert_join_log" ON "analytics"."lenser_join_log" FOR INSERT WITH CHECK (false);



CREATE POLICY "deny_update_join_log" ON "analytics"."lenser_join_log" FOR UPDATE USING (false) WITH CHECK (false);



CREATE POLICY "events_deny_delete" ON "analytics"."tag_activity_events" FOR DELETE USING (false);



CREATE POLICY "events_deny_update" ON "analytics"."tag_activity_events" FOR UPDATE USING (false) WITH CHECK (false);



CREATE POLICY "events_insert_deny" ON "analytics"."tag_activity_events" FOR INSERT WITH CHECK (false);



CREATE POLICY "events_insert_service" ON "analytics"."tag_activity_events" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "events_public_select" ON "analytics"."tag_activity_events" FOR SELECT USING (true);



CREATE POLICY "join_log_no_write" ON "analytics"."lenser_join_log" USING (false) WITH CHECK (false);



CREATE POLICY "join_log_public_select" ON "analytics"."lenser_join_log" FOR SELECT USING (true);



ALTER TABLE "analytics"."lenser_activity" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "analytics"."lenser_country_join_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "analytics"."lenser_join_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "analytics"."lenser_stats" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "p_feedback_insert_public" ON "analytics"."product_feedback" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "p_feedback_select_own" ON "analytics"."product_feedback" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "analytics"."page_views" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "page_views_insert_secure" ON "analytics"."page_views" FOR INSERT TO "authenticated", "anon" WITH CHECK ((("path" IS NOT NULL) AND ("length"("path") > 0)));



CREATE POLICY "page_views_no_delete" ON "analytics"."page_views" FOR DELETE USING (false);



CREATE POLICY "page_views_no_insert" ON "analytics"."page_views" FOR INSERT WITH CHECK (false);



CREATE POLICY "page_views_no_select" ON "analytics"."page_views" FOR SELECT USING (false);



CREATE POLICY "page_views_no_update" ON "analytics"."page_views" FOR UPDATE USING (false) WITH CHECK (false);



CREATE POLICY "page_views_select_service_role" ON "analytics"."page_views" FOR SELECT TO "service_role" USING (true);



ALTER TABLE "analytics"."product_feedback" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "public_can_read_engagement" ON "analytics"."lenser_stats" FOR SELECT USING (true);



CREATE POLICY "public_select_join_log" ON "analytics"."lenser_join_log" FOR SELECT USING (true);



CREATE POLICY "service_all_activity" ON "analytics"."lenser_activity" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_full_access_activity" ON "analytics"."lenser_activity" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_full_access_feedback" ON "analytics"."product_feedback" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "analytics"."share_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "share_events_select_by_link_owner" ON "analytics"."share_events" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("analytics"."shared_links" "sl"
     JOIN "lensers"."profiles" "l" ON (("l"."id" = "sl"."creator_lenser_id")))
  WHERE (("sl"."id" = "share_events"."shared_link_id") AND ("l"."user_id" = "auth"."uid"())))));



ALTER TABLE "analytics"."shared_links" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "shared_links_delete_own" ON "analytics"."shared_links" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "lensers"."profiles" "l"
  WHERE (("l"."id" = "shared_links"."creator_lenser_id") AND ("l"."user_id" = "auth"."uid"())))));



CREATE POLICY "shared_links_insert_own" ON "analytics"."shared_links" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "lensers"."profiles" "l"
  WHERE (("l"."id" = "shared_links"."creator_lenser_id") AND ("l"."user_id" = "auth"."uid"())))));



CREATE POLICY "shared_links_select_own" ON "analytics"."shared_links" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "lensers"."profiles" "l"
  WHERE (("l"."id" = "shared_links"."creator_lenser_id") AND ("l"."user_id" = "auth"."uid"())))));



CREATE POLICY "shared_links_update_own" ON "analytics"."shared_links" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "lensers"."profiles" "l"
  WHERE (("l"."id" = "shared_links"."creator_lenser_id") AND ("l"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "lensers"."profiles" "l"
  WHERE (("l"."id" = "shared_links"."creator_lenser_id") AND ("l"."user_id" = "auth"."uid"())))));



ALTER TABLE "analytics"."tag_activity_daily" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "analytics"."tag_activity_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Authenticated can insert contenders on open battles" ON "battles"."contenders" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "battles"."battles" "b"
  WHERE (("b"."id" = "contenders"."battle_id") AND (("b"."creator_lenser_id" = "lensers"."get_auth_lenser_id"()) OR ("b"."status" = 'open'::"battles"."battle_status_enum"))))));



CREATE POLICY "Authenticated users can create battles" ON "battles"."battles" FOR INSERT TO "authenticated" WITH CHECK (("creator_lenser_id" = "lensers"."get_auth_lenser_id"()));



CREATE POLICY "Authenticated users can create rubrics" ON "battles"."rubrics" FOR INSERT TO "authenticated" WITH CHECK (("creator_lenser_id" = "lensers"."get_auth_lenser_id"()));



CREATE POLICY "Authors can insert criteria on own rubrics" ON "battles"."rubric_criteria" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "battles"."rubrics" "r"
  WHERE (("r"."id" = "rubric_criteria"."rubric_id") AND ("r"."creator_lenser_id" = "lensers"."get_auth_lenser_id"())))));



CREATE POLICY "Authors can see own battles" ON "battles"."battles" FOR SELECT TO "authenticated" USING (("creator_lenser_id" = "lensers"."get_auth_lenser_id"()));



CREATE POLICY "Authors can see own rubric criteria" ON "battles"."rubric_criteria" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "battles"."rubrics" "r"
  WHERE (("r"."id" = "rubric_criteria"."rubric_id") AND ("r"."creator_lenser_id" = "lensers"."get_auth_lenser_id"())))));



CREATE POLICY "Authors can see own rubrics" ON "battles"."rubrics" FOR SELECT TO "authenticated" USING (("creator_lenser_id" = "lensers"."get_auth_lenser_id"()));



CREATE POLICY "Authors can update criteria on own rubrics" ON "battles"."rubric_criteria" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "battles"."rubrics" "r"
  WHERE (("r"."id" = "rubric_criteria"."rubric_id") AND ("r"."creator_lenser_id" = "lensers"."get_auth_lenser_id"())))));



CREATE POLICY "Authors can update own draft or open battles" ON "battles"."battles" FOR UPDATE TO "authenticated" USING ((("creator_lenser_id" = "lensers"."get_auth_lenser_id"()) AND ("status" = ANY (ARRAY['draft'::"battles"."battle_status_enum", 'open'::"battles"."battle_status_enum"])))) WITH CHECK (("creator_lenser_id" = "lensers"."get_auth_lenser_id"()));



CREATE POLICY "Authors can update own rubrics" ON "battles"."rubrics" FOR UPDATE TO "authenticated" USING (("creator_lenser_id" = "lensers"."get_auth_lenser_id"())) WITH CHECK (("creator_lenser_id" = "lensers"."get_auth_lenser_id"()));



CREATE POLICY "Battle creators can see own battle contenders" ON "battles"."contenders" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "battles"."battles" "b"
  WHERE (("b"."id" = "contenders"."battle_id") AND ("b"."creator_lenser_id" = "lensers"."get_auth_lenser_id"())))));



CREATE POLICY "Battle creators can see submissions" ON "battles"."submissions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "battles"."battles" "b"
  WHERE (("b"."id" = "submissions"."battle_id") AND ("b"."creator_lenser_id" = "lensers"."get_auth_lenser_id"())))));



CREATE POLICY "Contenders can insert submissions on open battles" ON "battles"."submissions" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("battles"."contenders" "c"
     JOIN "battles"."battles" "b" ON (("b"."id" = "c"."battle_id")))
  WHERE (("c"."id" = "submissions"."contender_id") AND ("c"."contender_type" = 'human'::"battles"."contender_type_enum") AND ("c"."contender_ref_id" = "lensers"."get_auth_lenser_id"()) AND ("b"."status" = 'open'::"battles"."battle_status_enum")))));



CREATE POLICY "Contenders can see own submissions" ON "battles"."submissions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "battles"."contenders" "c"
  WHERE (("c"."id" = "submissions"."contender_id") AND ("c"."contender_type" = 'human'::"battles"."contender_type_enum") AND ("c"."contender_ref_id" = "lensers"."get_auth_lenser_id"())))));



CREATE POLICY "Contenders can see themselves" ON "battles"."contenders" FOR SELECT TO "authenticated" USING ((("contender_type" = 'human'::"battles"."contender_type_enum") AND ("contender_ref_id" = ( SELECT "profiles"."id"
   FROM "lensers"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"())
 LIMIT 1))));



CREATE POLICY "Contenders can update own submissions on open battles" ON "battles"."submissions" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("battles"."contenders" "c"
     JOIN "battles"."battles" "b" ON (("b"."id" = "c"."battle_id")))
  WHERE (("c"."id" = "submissions"."contender_id") AND ("c"."contender_type" = 'human'::"battles"."contender_type_enum") AND ("c"."contender_ref_id" = "lensers"."get_auth_lenser_id"()) AND ("b"."status" = 'open'::"battles"."battle_status_enum")))));



CREATE POLICY "Contenders on public battles are viewable" ON "battles"."contenders" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "battles"."battles" "b"
  WHERE (("b"."id" = "contenders"."battle_id") AND ("b"."status" = ANY (ARRAY['voting'::"battles"."battle_status_enum", 'scoring'::"battles"."battle_status_enum", 'closed'::"battles"."battle_status_enum", 'published'::"battles"."battle_status_enum"])) AND ("b"."deleted_at" IS NULL)))));



CREATE POLICY "Criteria of public rubrics are viewable" ON "battles"."rubric_criteria" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "battles"."rubrics" "r"
  WHERE (("r"."id" = "rubric_criteria"."rubric_id") AND ("r"."is_public" = true) AND ("r"."deleted_at" IS NULL)))));



CREATE POLICY "Non-contenders can vote during voting window" ON "battles"."votes" FOR INSERT TO "authenticated" WITH CHECK ((("voter_lenser_id" = "lensers"."get_auth_lenser_id"()) AND (EXISTS ( SELECT 1
   FROM "battles"."battles" "b"
  WHERE (("b"."id" = "votes"."battle_id") AND ("b"."status" = 'voting'::"battles"."battle_status_enum")))) AND (NOT (EXISTS ( SELECT 1
   FROM "battles"."contenders" "c"
  WHERE (("c"."battle_id" = "votes"."battle_id") AND ("c"."contender_type" = 'human'::"battles"."contender_type_enum") AND ("c"."contender_ref_id" = "lensers"."get_auth_lenser_id"())))))));



CREATE POLICY "Public battles are viewable by everyone" ON "battles"."battles" FOR SELECT USING ((("status" = ANY (ARRAY['voting'::"battles"."battle_status_enum", 'scoring'::"battles"."battle_status_enum", 'closed'::"battles"."battle_status_enum", 'published'::"battles"."battle_status_enum"])) AND ("deleted_at" IS NULL)));



CREATE POLICY "Public rubrics are viewable by everyone" ON "battles"."rubrics" FOR SELECT USING ((("is_public" = true) AND ("deleted_at" IS NULL)));



CREATE POLICY "Scorecards on closed+ battles are viewable" ON "battles"."scorecards" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "battles"."battles" "b"
  WHERE (("b"."id" = "scorecards"."battle_id") AND ("b"."status" = ANY (ARRAY['closed'::"battles"."battle_status_enum", 'published'::"battles"."battle_status_enum"])) AND ("b"."deleted_at" IS NULL)))));



CREATE POLICY "Submissions on voting+ battles are viewable" ON "battles"."submissions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "battles"."battles" "b"
  WHERE (("b"."id" = "submissions"."battle_id") AND ("b"."status" = ANY (ARRAY['voting'::"battles"."battle_status_enum", 'scoring'::"battles"."battle_status_enum", 'closed'::"battles"."battle_status_enum", 'published'::"battles"."battle_status_enum"])) AND ("b"."deleted_at" IS NULL)))));



CREATE POLICY "Voters can delete own vote during voting" ON "battles"."votes" FOR DELETE TO "authenticated" USING ((("voter_lenser_id" = "lensers"."get_auth_lenser_id"()) AND (EXISTS ( SELECT 1
   FROM "battles"."battles" "b"
  WHERE (("b"."id" = "votes"."battle_id") AND ("b"."status" = 'voting'::"battles"."battle_status_enum"))))));



CREATE POLICY "Voters can see own votes" ON "battles"."votes" FOR SELECT TO "authenticated" USING (("voter_lenser_id" = "lensers"."get_auth_lenser_id"()));



CREATE POLICY "Votes on closed+ battles are viewable" ON "battles"."votes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "battles"."battles" "b"
  WHERE (("b"."id" = "votes"."battle_id") AND ("b"."status" = ANY (ARRAY['closed'::"battles"."battle_status_enum", 'published'::"battles"."battle_status_enum"])) AND ("b"."deleted_at" IS NULL)))));



ALTER TABLE "battles"."battles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "battles"."contenders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "battles"."rubric_criteria" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "battles"."rubrics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "battles"."scorecards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "battles"."submissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "battles"."votes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Authors can delete prompt translations" ON "content"."prompt_translations" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "content"."prompt_templates" "p"
  WHERE (("p"."id" = "prompt_translations"."prompt_id") AND ("p"."lenser_id" = "lensers"."get_auth_lenser_id"())))));



CREATE POLICY "Authors can delete thread translations" ON "content"."thread_translations" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "content"."threads" "t"
  WHERE (("t"."id" = "thread_translations"."thread_id") AND ("t"."lenser_id" = "lensers"."get_auth_lenser_id"())))));



CREATE POLICY "Authors can insert prompt translations" ON "content"."prompt_translations" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "content"."prompt_templates" "p"
  WHERE (("p"."id" = "prompt_translations"."prompt_id") AND ("p"."lenser_id" = "lensers"."get_auth_lenser_id"())))));



CREATE POLICY "Authors can insert thread translations" ON "content"."thread_translations" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "content"."threads" "t"
  WHERE (("t"."id" = "thread_translations"."thread_id") AND ("t"."lenser_id" = "lensers"."get_auth_lenser_id"())))));



CREATE POLICY "Authors can manage tags for their content" ON "content"."tag_map" TO "authenticated" USING (((("entity_type" = 'prompt_template'::"content"."entity_type_enum") AND (EXISTS ( SELECT 1
   FROM "content"."prompt_templates" "p"
  WHERE (("p"."id" = "tag_map"."entity_id") AND ("p"."lenser_id" = "lensers"."get_auth_lenser_id"()))))) OR (("entity_type" = 'thread'::"content"."entity_type_enum") AND (EXISTS ( SELECT 1
   FROM "content"."threads" "t"
  WHERE (("t"."id" = "tag_map"."entity_id") AND ("t"."lenser_id" = "lensers"."get_auth_lenser_id"())))))));



CREATE POLICY "Authors can see own prompts" ON "content"."prompt_templates" FOR SELECT TO "authenticated" USING (("lenser_id" = "lensers"."get_auth_lenser_id"()));



CREATE POLICY "Authors can see own threads" ON "content"."threads" FOR SELECT TO "authenticated" USING (("lenser_id" = "lensers"."get_auth_lenser_id"()));



CREATE POLICY "Authors can update prompt translations" ON "content"."prompt_translations" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "content"."prompt_templates" "p"
  WHERE (("p"."id" = "prompt_translations"."prompt_id") AND ("p"."lenser_id" = "lensers"."get_auth_lenser_id"())))));



CREATE POLICY "Authors can update thread translations" ON "content"."thread_translations" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "content"."threads" "t"
  WHERE (("t"."id" = "thread_translations"."thread_id") AND ("t"."lenser_id" = "lensers"."get_auth_lenser_id"())))));



CREATE POLICY "Public can read prompt reactions" ON "content"."prompt_reactions" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM "content"."prompt_templates" "p"
  WHERE (("p"."id" = "prompt_reactions"."prompt_id") AND (("p"."visibility" = 'public'::"content"."visibility_enum") OR (("auth"."uid"() IS NOT NULL) AND ("p"."lenser_id" = "lensers"."get_auth_lenser_id"())))))));



CREATE POLICY "Public can read prompt translations" ON "content"."prompt_translations" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM "content"."prompt_templates" "p"
  WHERE (("p"."id" = "prompt_translations"."prompt_id") AND (("p"."visibility" = 'public'::"content"."visibility_enum") OR (("auth"."uid"() IS NOT NULL) AND ("p"."lenser_id" = "lensers"."get_auth_lenser_id"())))))));



CREATE POLICY "Public can read reply reactions" ON "content"."thread_reply_reactions" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM ("content"."thread_replies" "r"
     JOIN "content"."threads" "t" ON (("t"."id" = "r"."thread_id")))
  WHERE (("r"."id" = "thread_reply_reactions"."reply_id") AND (("t"."visibility" = 'public'::"content"."visibility_enum") OR (("auth"."uid"() IS NOT NULL) AND ("t"."lenser_id" = "lensers"."get_auth_lenser_id"())))))));



CREATE POLICY "Public can read tag maps" ON "content"."tag_map" FOR SELECT USING (true);



CREATE POLICY "Public can read tag translations" ON "content"."tag_translations" FOR SELECT USING (true);



CREATE POLICY "Public can read thread reactions" ON "content"."thread_reactions" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM "content"."threads" "t"
  WHERE (("t"."id" = "thread_reactions"."thread_id") AND (("t"."visibility" = 'public'::"content"."visibility_enum") OR (("auth"."uid"() IS NOT NULL) AND ("t"."lenser_id" = "lensers"."get_auth_lenser_id"())))))));



CREATE POLICY "Public can read thread translations" ON "content"."thread_translations" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM "content"."threads" "t"
  WHERE (("t"."id" = "thread_translations"."thread_id") AND (("t"."visibility" = 'public'::"content"."visibility_enum") OR (("auth"."uid"() IS NOT NULL) AND ("t"."lenser_id" = "lensers"."get_auth_lenser_id"())))))));



CREATE POLICY "Public prompts are viewable by everyone" ON "content"."prompt_templates" FOR SELECT USING (("visibility" = ANY (ARRAY['public'::"content"."visibility_enum", 'community'::"content"."visibility_enum"])));



CREATE POLICY "Public threads are viewable by everyone" ON "content"."threads" FOR SELECT USING (("visibility" = ANY (ARRAY['public'::"content"."visibility_enum", 'community'::"content"."visibility_enum"])));



CREATE POLICY "Thread owners can read replies on own threads" ON "content"."thread_replies" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "content"."threads" "t"
  WHERE (("t"."id" = "thread_replies"."thread_id") AND ("t"."lenser_id" = "lensers"."get_auth_lenser_id"())))));



CREATE POLICY "Users can create prompts" ON "content"."prompt_templates" FOR INSERT TO "authenticated" WITH CHECK (("lenser_id" = "lensers"."get_auth_lenser_id"()));



CREATE POLICY "Users can create threads" ON "content"."threads" FOR INSERT TO "authenticated" WITH CHECK (("lenser_id" = "lensers"."get_auth_lenser_id"()));



CREATE POLICY "Users can delete own prompt reactions" ON "content"."prompt_reactions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own reply reactions" ON "content"."thread_reply_reactions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own thread reactions" ON "content"."thread_reactions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own prompts" ON "content"."prompt_templates" FOR DELETE TO "authenticated" USING (("lenser_id" = "lensers"."get_auth_lenser_id"()));



CREATE POLICY "Users can delete their own threads" ON "content"."threads" FOR DELETE TO "authenticated" USING (("lenser_id" = "lensers"."get_auth_lenser_id"()));



CREATE POLICY "Users can insert own prompt reactions" ON "content"."prompt_reactions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own reply reactions" ON "content"."thread_reply_reactions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own thread reactions" ON "content"."thread_reactions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own prompts" ON "content"."prompt_templates" FOR UPDATE TO "authenticated" USING (("lenser_id" = "lensers"."get_auth_lenser_id"()));



CREATE POLICY "Users can update their own threads" ON "content"."threads" FOR UPDATE TO "authenticated" USING (("lenser_id" = "lensers"."get_auth_lenser_id"()));



CREATE POLICY "deny_all" ON "content"."threads" USING (false);



CREATE POLICY "deny_select" ON "content"."threads" FOR SELECT USING (false);



CREATE POLICY "insert_own_media" ON "content"."media_library" FOR INSERT WITH CHECK (("lenser_id" = ( SELECT "vw_auth_lenser"."lenser_id"
   FROM "public"."vw_auth_lenser"
  WHERE ("vw_auth_lenser"."user_id" = "auth"."uid"()))));



CREATE POLICY "lensers_can_insert_tags" ON "content"."tags" FOR INSERT WITH CHECK (("auth"."uid"() IN ( SELECT "profiles"."user_id"
   FROM "lensers"."profiles")));



CREATE POLICY "media_admin_select_all" ON "content"."media_library" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "media_delete" ON "content"."media_library" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "lensers"."profiles" "l"
  WHERE (("l"."id" = "media_library"."lenser_id") AND ("l"."user_id" = "auth"."uid"())))));



CREATE POLICY "media_delete_own" ON "content"."media_library" FOR DELETE TO "authenticated" USING ("lensers"."user_owns_lenser"("lenser_id"));



CREATE POLICY "media_insert" ON "content"."media_library" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "lensers"."profiles" "l"
  WHERE (("l"."id" = "media_library"."lenser_id") AND ("l"."user_id" = "auth"."uid"())))));



CREATE POLICY "media_insert_own" ON "content"."media_library" FOR INSERT TO "authenticated" WITH CHECK ("lensers"."user_owns_lenser"("lenser_id"));



ALTER TABLE "content"."media_library" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "media_select" ON "content"."media_library" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "lensers"."profiles" "l"
  WHERE (("l"."id" = "media_library"."lenser_id") AND ("l"."user_id" = "auth"."uid"())))));



CREATE POLICY "media_select_own" ON "content"."media_library" FOR SELECT TO "authenticated" USING ("lensers"."user_owns_lenser"("lenser_id"));



CREATE POLICY "media_update" ON "content"."media_library" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "lensers"."profiles" "l"
  WHERE (("l"."id" = "media_library"."lenser_id") AND ("l"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "lensers"."profiles" "l"
  WHERE (("l"."id" = "media_library"."lenser_id") AND ("l"."user_id" = "auth"."uid"())))));



CREATE POLICY "media_update_own" ON "content"."media_library" FOR UPDATE TO "authenticated" USING ("lensers"."user_owns_lenser"("lenser_id")) WITH CHECK ("lensers"."user_owns_lenser"("lenser_id"));



CREATE POLICY "no_delete_tags" ON "content"."tags" FOR DELETE USING (false);



CREATE POLICY "no_update_tags" ON "content"."tags" FOR UPDATE USING (false) WITH CHECK (false);



ALTER TABLE "content"."prompt_reactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "content"."prompt_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "prompt_templates_owner_delete" ON "content"."prompt_templates" FOR DELETE USING (("lensers"."is_active_lenser"("auth"."uid"()) AND ("lenser_id" = "lensers"."current_active_lenser_id"())));



CREATE POLICY "prompt_templates_owner_insert" ON "content"."prompt_templates" FOR INSERT WITH CHECK (("lensers"."is_active_lenser"("auth"."uid"()) AND ("lenser_id" = "lensers"."current_active_lenser_id"())));



CREATE POLICY "prompt_templates_owner_update" ON "content"."prompt_templates" FOR UPDATE USING (("lensers"."is_active_lenser"("auth"."uid"()) AND ("lenser_id" = "lensers"."current_active_lenser_id"()))) WITH CHECK (("lensers"."is_active_lenser"("auth"."uid"()) AND ("lenser_id" = "lensers"."current_active_lenser_id"())));



CREATE POLICY "prompt_templates_select_public" ON "content"."prompt_templates" FOR SELECT TO "authenticated", "anon" USING (("visibility" = 'public'::"content"."visibility_enum"));



CREATE POLICY "prompt_templates_service_role_all" ON "content"."prompt_templates" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "content"."prompt_translations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "public_can_read_public_tags" ON "content"."tags" FOR SELECT USING (("visibility" = 'public'::"content"."tag_visibility_enum"));



CREATE POLICY "service_role_full_access_tags" ON "content"."tags" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "content"."tag_map" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "content"."tag_translations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "content"."tags" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tags_public_select" ON "content"."tags" FOR SELECT USING (("visibility" = 'public'::"content"."tag_visibility_enum"));



ALTER TABLE "content"."thread_reactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "content"."thread_replies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "thread_replies_owner_delete" ON "content"."thread_replies" FOR DELETE USING (("lensers"."is_active_lenser"("auth"."uid"()) AND ("lenser_id" = "lensers"."current_active_lenser_id"())));



CREATE POLICY "thread_replies_owner_insert" ON "content"."thread_replies" FOR INSERT WITH CHECK (("lensers"."is_active_lenser"("auth"."uid"()) AND ("lenser_id" = "lensers"."current_active_lenser_id"())));



CREATE POLICY "thread_replies_owner_select" ON "content"."thread_replies" FOR SELECT USING (("lensers"."is_active_lenser"("auth"."uid"()) AND ("lenser_id" = "lensers"."current_active_lenser_id"())));



CREATE POLICY "thread_replies_owner_update" ON "content"."thread_replies" FOR UPDATE USING (("lensers"."is_active_lenser"("auth"."uid"()) AND ("lenser_id" = "lensers"."current_active_lenser_id"()))) WITH CHECK (("lensers"."is_active_lenser"("auth"."uid"()) AND ("lenser_id" = "lensers"."current_active_lenser_id"())));



CREATE POLICY "thread_replies_public_select" ON "content"."thread_replies" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM "content"."threads" "t"
  WHERE (("t"."id" = "thread_replies"."thread_id") AND ("t"."visibility" = 'public'::"content"."visibility_enum")))));



CREATE POLICY "thread_replies_service_role_all" ON "content"."thread_replies" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "content"."thread_reply_reactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "content"."thread_translations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "content"."threads" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "threads_owner_delete" ON "content"."threads" FOR DELETE USING (("lensers"."is_active_lenser"("auth"."uid"()) AND ("lenser_id" = "lensers"."current_active_lenser_id"())));



CREATE POLICY "threads_owner_insert" ON "content"."threads" FOR INSERT WITH CHECK (("lensers"."is_active_lenser"("auth"."uid"()) AND ("lenser_id" = "lensers"."current_active_lenser_id"())));



CREATE POLICY "threads_owner_select" ON "content"."threads" FOR SELECT USING (("lensers"."is_active_lenser"("auth"."uid"()) AND ("lenser_id" = "lensers"."current_active_lenser_id"())));



CREATE POLICY "threads_owner_update" ON "content"."threads" FOR UPDATE USING (("lensers"."is_active_lenser"("auth"."uid"()) AND ("lenser_id" = "lensers"."current_active_lenser_id"()))) WITH CHECK (("lensers"."is_active_lenser"("auth"."uid"()) AND ("lenser_id" = "lensers"."current_active_lenser_id"())));



CREATE POLICY "threads_public_select" ON "content"."threads" FOR SELECT TO "authenticated", "anon" USING (("visibility" = 'public'::"content"."visibility_enum"));



CREATE POLICY "threads_service_role_all" ON "content"."threads" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Profiles update own secure" ON "lensers"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Select own badges" ON "lensers"."badges" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "lensers"."profiles" "l"
  WHERE (("l"."id" = "badges"."lenser_id") AND ("l"."user_id" = "auth"."uid"())))));



CREATE POLICY "allow_insert_waiting_list" ON "lensers"."waiting_list" FOR INSERT WITH CHECK (true);



CREATE POLICY "allow_update_except_handle" ON "lensers"."profiles" FOR UPDATE USING (true) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "lensers"."badges" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "block_delete_waiting_list" ON "lensers"."waiting_list" FOR DELETE USING (false);



CREATE POLICY "block_select_waiting_list" ON "lensers"."waiting_list" FOR SELECT USING (false);



CREATE POLICY "block_update_waiting_list" ON "lensers"."waiting_list" FOR UPDATE USING (false) WITH CHECK (false);



CREATE POLICY "fn_lensers_update_theme" ON "lensers"."profiles" FOR UPDATE USING ((("user_id" = "auth"."uid"()) AND "lensers"."is_active_lenser"("auth"."uid"()))) WITH CHECK ((("user_id" = "auth"."uid"()) AND "lensers"."is_active_lenser"("auth"."uid"())));



CREATE POLICY "lenser_badges_no_modify" ON "lensers"."badges" USING (false) WITH CHECK (false);



CREATE POLICY "lenser_badges_select_own" ON "lensers"."badges" FOR SELECT USING (("lenser_id" = "auth"."uid"()));



CREATE POLICY "lensers_deny_delete" ON "lensers"."profiles" FOR DELETE USING (false);



CREATE POLICY "lensers_owner_insert" ON "lensers"."profiles" FOR INSERT WITH CHECK ((("auth"."uid"() IS NOT NULL) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "lensers_owner_select" ON "lensers"."profiles" FOR SELECT USING (("lensers"."is_active_lenser"("auth"."uid"()) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "lensers_owner_update" ON "lensers"."profiles" FOR UPDATE USING (("lensers"."is_active_lenser"("auth"."uid"()) AND ("user_id" = "auth"."uid"()))) WITH CHECK (("lensers"."is_active_lenser"("auth"."uid"()) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "lensers_public_profiles_select" ON "lensers"."profiles" FOR SELECT USING ((("status" = 'active'::"lensers"."lenser_status") AND ("deletion_requested_at" IS NULL)));



CREATE POLICY "lensers_public_select" ON "lensers"."profiles" FOR SELECT USING ((("visibility" = 'public'::"lensers"."lenser_visibility") AND ("status" = 'active'::"lensers"."lenser_status")));



CREATE POLICY "lensers_service_role_all" ON "lensers"."profiles" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "p_lensers_select_self" ON "lensers"."profiles" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "p_lensers_toggle_waitinglist" ON "lensers"."profiles" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "p_lensers_update_waitinglist" ON "lensers"."profiles" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "lensers"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "select_active_public_profiles" ON "lensers"."profiles" FOR SELECT USING ((("status" = 'active'::"lensers"."lenser_status") AND ("deletion_requested_at" IS NULL)));



CREATE POLICY "service role can update is_super_admin" ON "lensers"."profiles" FOR UPDATE USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "lensers"."social_links" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "social_links_owner_delete" ON "lensers"."social_links" FOR DELETE USING (("lensers"."is_active_lenser"("auth"."uid"()) AND ("lenser_id" = "lensers"."current_active_lenser_id"())));



CREATE POLICY "social_links_owner_insert" ON "lensers"."social_links" FOR INSERT WITH CHECK (("lensers"."is_active_lenser"("auth"."uid"()) AND ("lenser_id" = "lensers"."current_active_lenser_id"())));



CREATE POLICY "social_links_owner_update" ON "lensers"."social_links" FOR UPDATE USING (("lensers"."is_active_lenser"("auth"."uid"()) AND ("lenser_id" = "lensers"."current_active_lenser_id"()))) WITH CHECK (("lensers"."is_active_lenser"("auth"."uid"()) AND ("lenser_id" = "lensers"."current_active_lenser_id"())));



CREATE POLICY "social_links_public_select" ON "lensers"."social_links" FOR SELECT USING (true);



CREATE POLICY "social_links_service_role_all" ON "lensers"."social_links" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "user_cannot_select_lensers" ON "lensers"."profiles" FOR SELECT USING (false);



CREATE POLICY "view_own_activity_only" ON "lensers"."profiles" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "lensers"."waiting_list" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_and_service_can_read_contacts" ON "ops"."contact" FOR SELECT USING ((("auth"."role"() = 'admin'::"text") OR ("current_setting"('request.jwt.claim.role'::"text", true) = 'service_role'::"text")));



ALTER TABLE "ops"."contact" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lenser_can_read_their_contacts" ON "ops"."contact" FOR SELECT USING ((("lenser_id" IS NOT NULL) AND (( SELECT "l"."user_id"
   FROM "lensers"."profiles" "l"
  WHERE ("l"."id" = "contact"."lenser_id")) = "auth"."uid"())));



CREATE POLICY "nobody_can_delete_contacts" ON "ops"."contact" FOR DELETE USING (false);



CREATE POLICY "nobody_can_update_contacts" ON "ops"."contact" FOR UPDATE USING (false) WITH CHECK (false);



CREATE POLICY "public_can_insert_contact_messages" ON "ops"."contact" FOR INSERT WITH CHECK (true);



CREATE POLICY "service_role_full_access_contacts" ON "ops"."contact" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "system"."entity_translations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "entity_translations_service_full" ON "system"."entity_translations" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "system"."languages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "system_languages_full" ON "system"."languages" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "xp"."event_verifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "xp"."events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lenser_level_ups_select_own" ON "xp"."level_ups" FOR SELECT USING (("lenser_id" = "auth"."uid"()));



ALTER TABLE "xp"."level_ups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "xp"."levels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "xp"."monthly_rollup" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "p_xp_totals_select_self" ON "xp"."totals" FOR SELECT TO "authenticated" USING (("lenser_id" IN ( SELECT "profiles"."id"
   FROM "lensers"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"()))));



ALTER TABLE "xp"."policy" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "xp"."rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "xp"."season_totals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "xp"."seasons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "xp"."streaks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "xp"."totals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "xp_event_verifications_select_own" ON "xp"."event_verifications" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "xp"."events" "e"
  WHERE (("e"."id" = "event_verifications"."event_id") AND ("e"."lenser_id" = "auth"."uid"())))));



CREATE POLICY "xp_events_select_own" ON "xp"."events" FOR SELECT USING (("lenser_id" = "auth"."uid"()));



CREATE POLICY "xp_levels_service_only" ON "xp"."levels" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "xp_monthly_rollup_select_own" ON "xp"."monthly_rollup" FOR SELECT USING (("lenser_id" = "auth"."uid"()));



CREATE POLICY "xp_policy_service_only" ON "xp"."policy" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "xp_rules_service_only" ON "xp"."rules" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "xp_season_totals_leaderboard_select" ON "xp"."season_totals" FOR SELECT USING (true);



CREATE POLICY "xp_season_totals_select_own" ON "xp"."season_totals" FOR SELECT USING (("lenser_id" = "auth"."uid"()));



CREATE POLICY "xp_seasons_service_only" ON "xp"."seasons" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "xp_streaks_select_own" ON "xp"."streaks" FOR SELECT USING (("lenser_id" = "auth"."uid"()));



CREATE POLICY "xp_totals_leaderboard_select" ON "xp"."totals" FOR SELECT USING (true);



CREATE POLICY "xp_totals_select_own" ON "xp"."totals" FOR SELECT USING (("lenser_id" = "auth"."uid"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "ai" TO "anon";
GRANT USAGE ON SCHEMA "ai" TO "authenticated";



GRANT USAGE ON SCHEMA "analytics" TO "service_role";
GRANT USAGE ON SCHEMA "analytics" TO "anon";
GRANT USAGE ON SCHEMA "analytics" TO "authenticated";



GRANT USAGE ON SCHEMA "battles" TO "anon";
GRANT USAGE ON SCHEMA "battles" TO "authenticated";
GRANT USAGE ON SCHEMA "battles" TO "service_role";



GRANT USAGE ON SCHEMA "billing" TO "service_role";



GRANT USAGE ON SCHEMA "content" TO "authenticated";
GRANT USAGE ON SCHEMA "content" TO "anon";



GRANT USAGE ON SCHEMA "core" TO "anon";
GRANT USAGE ON SCHEMA "core" TO "authenticated";
GRANT USAGE ON SCHEMA "core" TO "service_role";






GRANT USAGE ON SCHEMA "lensers" TO "anon";
GRANT USAGE ON SCHEMA "lensers" TO "authenticated";



GRANT USAGE ON SCHEMA "ops" TO "service_role";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT USAGE ON SCHEMA "system" TO "service_role";



GRANT USAGE ON SCHEMA "xp" TO "service_role";
GRANT USAGE ON SCHEMA "xp" TO "anon";
GRANT USAGE ON SCHEMA "xp" TO "authenticated";



GRANT ALL ON TYPE "content"."reaction_enum" TO "authenticated";



GRANT ALL ON FUNCTION "ai"."ai_generations_media_owner_check"() TO "anon";
GRANT ALL ON FUNCTION "ai"."ai_generations_media_owner_check"() TO "authenticated";
GRANT ALL ON FUNCTION "ai"."ai_generations_media_owner_check"() TO "service_role";



GRANT ALL ON FUNCTION "analytics"."log_tag_view"("p_entity_type" "content"."entity_type_enum", "p_entity_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "analytics"."protect_feedback_system_fields"() TO "anon";
GRANT ALL ON FUNCTION "analytics"."protect_feedback_system_fields"() TO "authenticated";
GRANT ALL ON FUNCTION "analytics"."protect_feedback_system_fields"() TO "service_role";



GRANT ALL ON FUNCTION "analytics"."set_feedback_user_id"() TO "anon";
GRANT ALL ON FUNCTION "analytics"."set_feedback_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "analytics"."set_feedback_user_id"() TO "service_role";



GRANT ALL ON FUNCTION "battles"."award_battle_xp"() TO "service_role";



GRANT ALL ON FUNCTION "battles"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "content"."ensure_public_tag"() TO "anon";
GRANT ALL ON FUNCTION "content"."ensure_public_tag"() TO "authenticated";
GRANT ALL ON FUNCTION "content"."ensure_public_tag"() TO "service_role";



GRANT ALL ON FUNCTION "content"."normalize_website_url"() TO "anon";
GRANT ALL ON FUNCTION "content"."normalize_website_url"() TO "authenticated";
GRANT ALL ON FUNCTION "content"."normalize_website_url"() TO "service_role";



GRANT ALL ON FUNCTION "content"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "content"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "content"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "content"."sync_prompt_count"() TO "anon";
GRANT ALL ON FUNCTION "content"."sync_prompt_count"() TO "authenticated";
GRANT ALL ON FUNCTION "content"."sync_prompt_count"() TO "service_role";



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



GRANT ALL ON FUNCTION "content"."trg_reactions_refresh_totals"() TO "anon";
GRANT ALL ON FUNCTION "content"."trg_reactions_refresh_totals"() TO "authenticated";
GRANT ALL ON FUNCTION "content"."trg_reactions_refresh_totals"() TO "service_role";



GRANT ALL ON FUNCTION "content"."update_prompt_template_reaction_counters"() TO "anon";
GRANT ALL ON FUNCTION "content"."update_prompt_template_reaction_counters"() TO "authenticated";
GRANT ALL ON FUNCTION "content"."update_prompt_template_reaction_counters"() TO "service_role";



GRANT ALL ON FUNCTION "content"."user_owns_prompt"("template_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "content"."user_owns_prompt"("template_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "content"."user_owns_prompt"("template_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "content"."user_owns_thread"("thread_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "content"."user_owns_thread"("thread_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "content"."user_owns_thread"("thread_id" "uuid") TO "service_role";














































































































































































GRANT ALL ON FUNCTION "lensers"."anonymize_join_log"() TO "anon";
GRANT ALL ON FUNCTION "lensers"."anonymize_join_log"() TO "authenticated";
GRANT ALL ON FUNCTION "lensers"."anonymize_join_log"() TO "service_role";



GRANT ALL ON FUNCTION "lensers"."assign_country_join_order"("p_lenser_id" "uuid", "p_country_code" "text") TO "anon";
GRANT ALL ON FUNCTION "lensers"."assign_country_join_order"("p_lenser_id" "uuid", "p_country_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "lensers"."assign_country_join_order"("p_lenser_id" "uuid", "p_country_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "lensers"."auto_award_badges_from_join_order"("p_lenser_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "lensers"."auto_award_badges_from_join_order"("p_lenser_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "lensers"."auto_award_badges_from_join_order"("p_lenser_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "lensers"."auto_award_badges_from_level"("p_lenser_id" "uuid", "p_app_id" "uuid", "p_old_level" integer, "p_new_level" integer, "p_event_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "lensers"."auto_award_badges_from_level"("p_lenser_id" "uuid", "p_app_id" "uuid", "p_old_level" integer, "p_new_level" integer, "p_event_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "lensers"."auto_award_badges_from_level"("p_lenser_id" "uuid", "p_app_id" "uuid", "p_old_level" integer, "p_new_level" integer, "p_event_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "lensers"."auto_award_badges_from_streak"("p_lenser_id" "uuid", "p_streak" integer, "p_event_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "lensers"."auto_award_badges_from_streak"("p_lenser_id" "uuid", "p_streak" integer, "p_event_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "lensers"."auto_award_badges_from_streak"("p_lenser_id" "uuid", "p_streak" integer, "p_event_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "lensers"."auto_award_country_badges"("p_lenser_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "lensers"."auto_award_country_badges"("p_lenser_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "lensers"."auto_award_country_badges"("p_lenser_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "lensers"."award_badge"("p_lenser_id" "uuid", "p_type" "lensers"."lenser_badge_type", "p_label" "text", "p_description" "text", "p_icon" "text", "p_xp_event_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "lensers"."award_badge"("p_lenser_id" "uuid", "p_type" "lensers"."lenser_badge_type", "p_label" "text", "p_description" "text", "p_icon" "text", "p_xp_event_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "lensers"."award_badge"("p_lenser_id" "uuid", "p_type" "lensers"."lenser_badge_type", "p_label" "text", "p_description" "text", "p_icon" "text", "p_xp_event_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "lensers"."build_author_profile"("p_lenser_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "lensers"."build_author_profile"("p_lenser_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "lensers"."build_author_profile"("p_lenser_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "lensers"."current_active_lenser_id"() TO "anon";
GRANT ALL ON FUNCTION "lensers"."current_active_lenser_id"() TO "authenticated";
GRANT ALL ON FUNCTION "lensers"."current_active_lenser_id"() TO "service_role";



GRANT ALL ON FUNCTION "lensers"."delete_expired_lensers"() TO "anon";
GRANT ALL ON FUNCTION "lensers"."delete_expired_lensers"() TO "authenticated";
GRANT ALL ON FUNCTION "lensers"."delete_expired_lensers"() TO "service_role";



GRANT ALL ON FUNCTION "lensers"."enforce_deletion_request"() TO "anon";
GRANT ALL ON FUNCTION "lensers"."enforce_deletion_request"() TO "authenticated";
GRANT ALL ON FUNCTION "lensers"."enforce_deletion_request"() TO "service_role";



GRANT ALL ON FUNCTION "lensers"."enforce_lensers_protections"() TO "anon";
GRANT ALL ON FUNCTION "lensers"."enforce_lensers_protections"() TO "authenticated";
GRANT ALL ON FUNCTION "lensers"."enforce_lensers_protections"() TO "service_role";



GRANT ALL ON FUNCTION "lensers"."init_lenser_engagement_row"() TO "anon";
GRANT ALL ON FUNCTION "lensers"."init_lenser_engagement_row"() TO "authenticated";
GRANT ALL ON FUNCTION "lensers"."init_lenser_engagement_row"() TO "service_role";



GRANT ALL ON FUNCTION "lensers"."is_active_lenser"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "lensers"."is_active_lenser"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "lensers"."is_active_lenser"("p_user_id" "uuid") TO "service_role";



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



GRANT ALL ON FUNCTION "lensers"."trg_award_founder_badges"() TO "anon";
GRANT ALL ON FUNCTION "lensers"."trg_award_founder_badges"() TO "authenticated";
GRANT ALL ON FUNCTION "lensers"."trg_award_founder_badges"() TO "service_role";



GRANT ALL ON FUNCTION "lensers"."trg_create_join_log"() TO "anon";
GRANT ALL ON FUNCTION "lensers"."trg_create_join_log"() TO "authenticated";
GRANT ALL ON FUNCTION "lensers"."trg_create_join_log"() TO "service_role";



GRANT ALL ON FUNCTION "lensers"."trg_handle_deletion_request"() TO "anon";
GRANT ALL ON FUNCTION "lensers"."trg_handle_deletion_request"() TO "authenticated";
GRANT ALL ON FUNCTION "lensers"."trg_handle_deletion_request"() TO "service_role";



GRANT ALL ON FUNCTION "lensers"."trg_log_lenser_activity"() TO "anon";
GRANT ALL ON FUNCTION "lensers"."trg_log_lenser_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "lensers"."trg_log_lenser_activity"() TO "service_role";



GRANT ALL ON FUNCTION "lensers"."trg_log_login_from_auth"() TO "anon";
GRANT ALL ON FUNCTION "lensers"."trg_log_login_from_auth"() TO "authenticated";
GRANT ALL ON FUNCTION "lensers"."trg_log_login_from_auth"() TO "service_role";



GRANT ALL ON FUNCTION "lensers"."trg_update_lenser_last_login"() TO "anon";
GRANT ALL ON FUNCTION "lensers"."trg_update_lenser_last_login"() TO "authenticated";
GRANT ALL ON FUNCTION "lensers"."trg_update_lenser_last_login"() TO "service_role";



GRANT ALL ON FUNCTION "lensers"."user_owns_lenser"("lenser_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "lensers"."user_owns_lenser"("lenser_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "lensers"."user_owns_lenser"("lenser_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_ai_create_generation"("p_ai_model_slug" "text", "p_prompt_template_id" "uuid", "p_media" "jsonb", "p_input_text" "text", "p_visibility" "content"."visibility_enum", "p_original_chat_url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_ai_create_generation"("p_ai_model_slug" "text", "p_prompt_template_id" "uuid", "p_media" "jsonb", "p_input_text" "text", "p_visibility" "content"."visibility_enum", "p_original_chat_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_ai_create_generation"("p_ai_model_slug" "text", "p_prompt_template_id" "uuid", "p_media" "jsonb", "p_input_text" "text", "p_visibility" "content"."visibility_enum", "p_original_chat_url" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_ai_get_generations_for_prompt"("p_prompt_template_id" "uuid", "p_lenser_id" "uuid", "p_limit" integer, "p_offset" integer, "p_media_kind" "text", "p_ai_model_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_ai_get_generations_for_prompt"("p_prompt_template_id" "uuid", "p_lenser_id" "uuid", "p_limit" integer, "p_offset" integer, "p_media_kind" "text", "p_ai_model_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_ai_get_generations_for_prompt"("p_prompt_template_id" "uuid", "p_lenser_id" "uuid", "p_limit" integer, "p_offset" integer, "p_media_kind" "text", "p_ai_model_slug" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_analytics_product_feedback_list_user_paginated"("p_offset" integer, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_analytics_product_feedback_list_user_paginated"("p_offset" integer, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_analytics_product_feedback_list_user_paginated"("p_offset" integer, "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_analytics_share_events_log"("p_short_id" "text", "p_event_type" "text", "p_ip_hash" "text", "p_user_agent" "text", "p_referer" "text", "p_country" "text", "p_city" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_analytics_share_events_log"("p_short_id" "text", "p_event_type" "text", "p_ip_hash" "text", "p_user_agent" "text", "p_referer" "text", "p_country" "text", "p_city" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_analytics_share_events_log"("p_short_id" "text", "p_event_type" "text", "p_ip_hash" "text", "p_user_agent" "text", "p_referer" "text", "p_country" "text", "p_city" "text") TO "service_role";



GRANT ALL ON TABLE "analytics"."shared_links" TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_analytics_shared_links_create"("p_resource_type" "text", "p_resource_id" "text", "p_slug" "text", "p_channel" "text", "p_meta" "jsonb", "p_display_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_analytics_shared_links_create"("p_resource_type" "text", "p_resource_id" "text", "p_slug" "text", "p_channel" "text", "p_meta" "jsonb", "p_display_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_analytics_shared_links_create"("p_resource_type" "text", "p_resource_id" "text", "p_slug" "text", "p_channel" "text", "p_meta" "jsonb", "p_display_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_analytics_shared_links_get"("p_short_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_analytics_shared_links_get"("p_short_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_analytics_shared_links_get"("p_short_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_battles_create"("p_title" "text", "p_slug" "text", "p_task_prompt" "text", "p_rubric_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battles_create"("p_title" "text", "p_slug" "text", "p_task_prompt" "text", "p_rubric_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_create"("p_title" "text", "p_slug" "text", "p_task_prompt" "text", "p_rubric_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_battles_finalize"("p_battle_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battles_finalize"("p_battle_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_finalize"("p_battle_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_battles_get_public"("p_battle_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battles_get_public"("p_battle_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_get_public"("p_battle_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_battles_join"("p_battle_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battles_join"("p_battle_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_join"("p_battle_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_battles_list_public"("p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battles_list_public"("p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_list_public"("p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_battles_open"("p_battle_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battles_open"("p_battle_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_open"("p_battle_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_battles_start_voting"("p_battle_id" "uuid", "p_voting_closes_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battles_start_voting"("p_battle_id" "uuid", "p_voting_closes_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_start_voting"("p_battle_id" "uuid", "p_voting_closes_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_battles_submit"("p_battle_id" "uuid", "p_content_text" "text", "p_content_url" "text", "p_content_media" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battles_submit"("p_battle_id" "uuid", "p_content_text" "text", "p_content_url" "text", "p_content_media" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_submit"("p_battle_id" "uuid", "p_content_text" "text", "p_content_url" "text", "p_content_media" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_battles_vote"("p_battle_id" "uuid", "p_vote" "battles"."vote_value_enum", "p_rationale" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battles_vote"("p_battle_id" "uuid", "p_vote" "battles"."vote_value_enum", "p_rationale" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_vote"("p_battle_id" "uuid", "p_vote" "battles"."vote_value_enum", "p_rationale" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_content_reactions_get_user_for_target"("p_target_type" "text", "p_target_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_content_reactions_get_user_for_target"("p_target_type" "text", "p_target_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_content_reactions_get_user_for_target"("p_target_type" "text", "p_target_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_content_reactions_toggle"("p_target_type" "text", "p_target_id" "uuid", "p_reaction" "content"."reaction_enum") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_content_reactions_toggle"("p_target_type" "text", "p_target_id" "uuid", "p_reaction" "content"."reaction_enum") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_content_reactions_toggle"("p_target_type" "text", "p_target_id" "uuid", "p_reaction" "content"."reaction_enum") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_content_tags_create"("p_name" "text", "p_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_content_tags_create"("p_name" "text", "p_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_content_tags_create"("p_name" "text", "p_slug" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_content_tags_get_by_slug"("p_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_content_tags_get_by_slug"("p_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_content_tags_get_by_slug"("p_slug" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_lensers_get_authenticated_profile"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_lensers_get_authenticated_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_lensers_get_authenticated_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_lensers_get_authenticated_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_lensers_get_current_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_lensers_get_current_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_lensers_get_current_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_lensers_get_fresh_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_lensers_get_fresh_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_lensers_get_fresh_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_lensers_get_is_in_waitinglist"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_lensers_get_is_in_waitinglist"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_lensers_get_is_in_waitinglist"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_lensers_get_preferences"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_lensers_get_preferences"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_lensers_get_preferences"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_lensers_get_preferences"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_lensers_get_public_profile"("p_handle" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_lensers_get_public_profile"("p_handle" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_lensers_get_public_profile"("p_handle" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_lensers_request_deletion"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_lensers_request_deletion"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_lensers_request_deletion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_lensers_request_deletion"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_lensers_sync_social_links"("p_links" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_lensers_sync_social_links"("p_links" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_lensers_sync_social_links"("p_links" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_lensers_sync_social_links"("p_links" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_lensers_toggle_waitinglist"("p_kvkk_approved" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_lensers_toggle_waitinglist"("p_kvkk_approved" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_lensers_toggle_waitinglist"("p_kvkk_approved" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_lensers_waiting_list_create"("p_email" "text", "p_kvkk_approved" boolean, "p_utm_source" "text", "p_utm_medium" "text", "p_utm_campaign" "text", "p_utm_content" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_lensers_waiting_list_create"("p_email" "text", "p_kvkk_approved" boolean, "p_utm_source" "text", "p_utm_medium" "text", "p_utm_campaign" "text", "p_utm_content" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_lensers_waiting_list_create"("p_email" "text", "p_kvkk_approved" boolean, "p_utm_source" "text", "p_utm_medium" "text", "p_utm_campaign" "text", "p_utm_content" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_lensers_waiting_list_create_unsubscribe_token"("p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_lensers_waiting_list_create_unsubscribe_token"("p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_lensers_waiting_list_create_unsubscribe_token"("p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_lensers_waiting_list_unsubscribe_by_token"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_lensers_waiting_list_unsubscribe_by_token"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_lensers_waiting_list_unsubscribe_by_token"("p_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_lensers_waiting_list_verify_token"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_lensers_waiting_list_verify_token"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_lensers_waiting_list_verify_token"("p_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_log_page_view"("p_target_type" "public"."page_view_target_enum", "p_target_id" "text", "p_path" "text", "p_referrer" "text", "p_user_agent" "text", "p_client_ip" "inet") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_log_page_view"("p_target_type" "public"."page_view_target_enum", "p_target_id" "text", "p_path" "text", "p_referrer" "text", "p_user_agent" "text", "p_client_ip" "inet") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_log_page_view"("p_target_type" "public"."page_view_target_enum", "p_target_id" "text", "p_path" "text", "p_referrer" "text", "p_user_agent" "text", "p_client_ip" "inet") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_tag_activity_log"("p_events" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_tag_activity_log"("p_events" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_tag_activity_log"("p_events" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_xp_get_self"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_xp_get_self"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_xp_get_self"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "system"."get_localized"("p_entity_type" "system"."entity_type_enum", "p_entity_id" "uuid", "p_lang" "text", "p_field" "text") TO "service_role";



GRANT ALL ON FUNCTION "system"."get_localized_fields"("p_entity_type" "system"."entity_type_enum", "p_entity_id" "uuid", "p_lang" "text") TO "service_role";



GRANT ALL ON FUNCTION "system"."touch_updated_at"() TO "service_role";












REVOKE ALL ON FUNCTION "xp"."apply"("p_lenser_id" "uuid", "p_rule_key" "text", "p_source" "xp"."source_enum", "p_source_ref_type" "text", "p_source_ref_id" "uuid", "p_app_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "xp"."apply"("p_lenser_id" "uuid", "p_rule_key" "text", "p_source" "xp"."source_enum", "p_source_ref_type" "text", "p_source_ref_id" "uuid", "p_app_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "xp"."check_and_rollover_season"("p_app_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "xp"."check_and_rollover_season"("p_app_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "xp"."compute_level_from"("p_app_id" "uuid", "p_total_xp" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "xp"."compute_level_from"("p_app_id" "uuid", "p_total_xp" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "xp"."generate_levels"("p_app_id" "uuid", "p_max_level" integer, "p_base_xp" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "xp"."generate_levels"("p_app_id" "uuid", "p_max_level" integer, "p_base_xp" integer) TO "service_role";



REVOKE ALL ON FUNCTION "xp"."get_active_season_id"("p_app_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "xp"."get_active_season_id"("p_app_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "xp"."mark_event_verified"("p_event_id" "uuid", "p_ai_verified" boolean, "p_verifier" "text", "p_details" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "xp"."mark_event_verified"("p_event_id" "uuid", "p_ai_verified" boolean, "p_verifier" "text", "p_details" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "xp"."on_prompt_created"() FROM PUBLIC;
GRANT ALL ON FUNCTION "xp"."on_prompt_created"() TO "service_role";



REVOKE ALL ON FUNCTION "xp"."on_reaction_given"() FROM PUBLIC;
GRANT ALL ON FUNCTION "xp"."on_reaction_given"() TO "service_role";



REVOKE ALL ON FUNCTION "xp"."on_reaction_received"() FROM PUBLIC;
GRANT ALL ON FUNCTION "xp"."on_reaction_received"() TO "service_role";



REVOKE ALL ON FUNCTION "xp"."on_reply_created"() FROM PUBLIC;
GRANT ALL ON FUNCTION "xp"."on_reply_created"() TO "service_role";



REVOKE ALL ON FUNCTION "xp"."on_reply_received"() FROM PUBLIC;
GRANT ALL ON FUNCTION "xp"."on_reply_received"() TO "service_role";



REVOKE ALL ON FUNCTION "xp"."on_thread_created"() FROM PUBLIC;
GRANT ALL ON FUNCTION "xp"."on_thread_created"() TO "service_role";



REVOKE ALL ON FUNCTION "xp"."on_thread_engaged"() FROM PUBLIC;
GRANT ALL ON FUNCTION "xp"."on_thread_engaged"() TO "service_role";



REVOKE ALL ON FUNCTION "xp"."prevent_event_mutations"() FROM PUBLIC;
GRANT ALL ON FUNCTION "xp"."prevent_event_mutations"() TO "service_role";



REVOKE ALL ON FUNCTION "xp"."rollback_event"("p_event_id" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "xp"."rollback_event"("p_event_id" "uuid", "p_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "xp"."rollover_season"("p_app_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "xp"."rollover_season"("p_app_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "xp"."seed_default_curve"("p_app_id" "uuid", "p_max_level" integer, "p_base" numeric, "p_power" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "xp"."seed_default_curve"("p_app_id" "uuid", "p_max_level" integer, "p_base" numeric, "p_power" numeric) TO "service_role";



REVOKE ALL ON FUNCTION "xp"."sync_total"() FROM PUBLIC;
GRANT ALL ON FUNCTION "xp"."sync_total"() TO "service_role";



GRANT ALL ON FUNCTION "xp"."update_daily_streak"("p_lenser_id" "uuid", "p_app_id" "uuid", "p_streak_type" "text", "p_event_date" "date") TO "anon";
GRANT ALL ON FUNCTION "xp"."update_daily_streak"("p_lenser_id" "uuid", "p_app_id" "uuid", "p_streak_type" "text", "p_event_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "xp"."update_daily_streak"("p_lenser_id" "uuid", "p_app_id" "uuid", "p_streak_type" "text", "p_event_date" "date") TO "service_role";



REVOKE ALL ON FUNCTION "xp"."update_season_totals"("p_app_id" "uuid", "p_lenser_id" "uuid", "p_xp" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "xp"."update_season_totals"("p_app_id" "uuid", "p_lenser_id" "uuid", "p_xp" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "xp"."verify_signature"("p_signature" "text", "p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "xp"."verify_signature"("p_signature" "text", "p_payload" "jsonb") TO "service_role";



GRANT ALL ON TABLE "ai"."generations" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "ai"."generations" TO "authenticated";



GRANT ALL ON TABLE "ai"."models" TO "anon";
GRANT ALL ON TABLE "ai"."models" TO "authenticated";
GRANT ALL ON TABLE "ai"."models" TO "service_role";



GRANT ALL ON TABLE "analytics"."lenser_activity" TO "service_role";



GRANT ALL ON TABLE "analytics"."lenser_country_join_log" TO "service_role";



GRANT ALL ON TABLE "analytics"."lenser_join_log" TO "service_role";



GRANT ALL ON SEQUENCE "analytics"."lenser_join_sequence" TO "anon";
GRANT ALL ON SEQUENCE "analytics"."lenser_join_sequence" TO "authenticated";
GRANT ALL ON SEQUENCE "analytics"."lenser_join_sequence" TO "service_role";



GRANT ALL ON TABLE "analytics"."lenser_stats" TO "service_role";
GRANT SELECT ON TABLE "analytics"."lenser_stats" TO "anon";
GRANT SELECT ON TABLE "analytics"."lenser_stats" TO "authenticated";



GRANT ALL ON TABLE "analytics"."page_views" TO "service_role";



GRANT ALL ON TABLE "analytics"."product_feedback" TO "service_role";
GRANT INSERT ON TABLE "analytics"."product_feedback" TO "anon";
GRANT SELECT,INSERT ON TABLE "analytics"."product_feedback" TO "authenticated";



GRANT ALL ON TABLE "analytics"."share_events" TO "service_role";



GRANT ALL ON TABLE "analytics"."tag_activity_daily" TO "service_role";



GRANT ALL ON SEQUENCE "analytics"."tag_activity_daily_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "analytics"."tag_activity_daily_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "analytics"."tag_activity_daily_id_seq" TO "service_role";



GRANT ALL ON TABLE "analytics"."tag_activity_events" TO "service_role";



GRANT ALL ON SEQUENCE "analytics"."tag_activity_events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "analytics"."tag_activity_events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "analytics"."tag_activity_events_id_seq" TO "service_role";



GRANT SELECT ON TABLE "battles"."battles" TO "anon";
GRANT SELECT,INSERT,UPDATE ON TABLE "battles"."battles" TO "authenticated";
GRANT ALL ON TABLE "battles"."battles" TO "service_role";



GRANT SELECT ON TABLE "battles"."contenders" TO "anon";
GRANT SELECT,INSERT ON TABLE "battles"."contenders" TO "authenticated";
GRANT ALL ON TABLE "battles"."contenders" TO "service_role";



GRANT SELECT ON TABLE "battles"."rubric_criteria" TO "anon";
GRANT SELECT,INSERT,UPDATE ON TABLE "battles"."rubric_criteria" TO "authenticated";
GRANT ALL ON TABLE "battles"."rubric_criteria" TO "service_role";



GRANT SELECT ON TABLE "battles"."rubrics" TO "anon";
GRANT SELECT,INSERT,UPDATE ON TABLE "battles"."rubrics" TO "authenticated";
GRANT ALL ON TABLE "battles"."rubrics" TO "service_role";



GRANT SELECT ON TABLE "battles"."scorecards" TO "anon";
GRANT SELECT ON TABLE "battles"."scorecards" TO "authenticated";
GRANT ALL ON TABLE "battles"."scorecards" TO "service_role";



GRANT SELECT ON TABLE "battles"."submissions" TO "anon";
GRANT SELECT,INSERT,UPDATE ON TABLE "battles"."submissions" TO "authenticated";
GRANT ALL ON TABLE "battles"."submissions" TO "service_role";



GRANT SELECT ON TABLE "battles"."votes" TO "anon";
GRANT SELECT,INSERT,DELETE ON TABLE "battles"."votes" TO "authenticated";
GRANT ALL ON TABLE "battles"."votes" TO "service_role";



GRANT ALL ON TABLE "content"."media_library" TO "service_role";
GRANT SELECT ON TABLE "content"."media_library" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "content"."media_library" TO "authenticated";



GRANT ALL ON TABLE "content"."prompt_reactions" TO "anon";
GRANT ALL ON TABLE "content"."prompt_reactions" TO "authenticated";
GRANT ALL ON TABLE "content"."prompt_reactions" TO "service_role";



GRANT ALL ON TABLE "content"."prompt_templates" TO "service_role";
GRANT SELECT ON TABLE "content"."prompt_templates" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "content"."prompt_templates" TO "authenticated";



GRANT ALL ON TABLE "content"."prompt_translations" TO "anon";
GRANT ALL ON TABLE "content"."prompt_translations" TO "authenticated";
GRANT ALL ON TABLE "content"."prompt_translations" TO "service_role";



GRANT SELECT ON TABLE "content"."tag_map" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "content"."tag_map" TO "authenticated";



GRANT ALL ON TABLE "content"."tag_suggestions" TO "anon";
GRANT ALL ON TABLE "content"."tag_suggestions" TO "authenticated";
GRANT ALL ON TABLE "content"."tag_suggestions" TO "service_role";



GRANT ALL ON TABLE "content"."tag_translations" TO "anon";
GRANT ALL ON TABLE "content"."tag_translations" TO "authenticated";
GRANT ALL ON TABLE "content"."tag_translations" TO "service_role";



GRANT ALL ON TABLE "content"."tags" TO "service_role";
GRANT SELECT ON TABLE "content"."tags" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "content"."tags" TO "authenticated";



GRANT ALL ON TABLE "content"."thread_reactions" TO "anon";
GRANT ALL ON TABLE "content"."thread_reactions" TO "authenticated";
GRANT ALL ON TABLE "content"."thread_reactions" TO "service_role";



GRANT ALL ON TABLE "content"."thread_reply_reactions" TO "anon";
GRANT ALL ON TABLE "content"."thread_reply_reactions" TO "authenticated";
GRANT ALL ON TABLE "content"."thread_reply_reactions" TO "service_role";



GRANT ALL ON TABLE "content"."thread_translations" TO "anon";
GRANT ALL ON TABLE "content"."thread_translations" TO "authenticated";
GRANT ALL ON TABLE "content"."thread_translations" TO "service_role";



GRANT ALL ON TABLE "content"."threads" TO "service_role";
GRANT SELECT ON TABLE "content"."threads" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "content"."threads" TO "authenticated";



GRANT ALL ON TABLE "lensers"."profiles" TO "service_role";
GRANT SELECT ON TABLE "lensers"."profiles" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "lensers"."profiles" TO "authenticated";



GRANT SELECT ON TABLE "content"."vw_auth_prompts" TO "anon";
GRANT SELECT ON TABLE "content"."vw_auth_prompts" TO "authenticated";
GRANT SELECT ON TABLE "content"."vw_auth_prompts" TO "service_role";



GRANT SELECT ON TABLE "content"."vw_auth_threads" TO "anon";
GRANT SELECT ON TABLE "content"."vw_auth_threads" TO "authenticated";
GRANT SELECT ON TABLE "content"."vw_auth_threads" TO "service_role";



GRANT ALL ON TABLE "core"."languages" TO "anon";
GRANT ALL ON TABLE "core"."languages" TO "authenticated";
GRANT ALL ON TABLE "core"."languages" TO "service_role";















GRANT ALL ON TABLE "lensers"."badges" TO "service_role";
GRANT SELECT ON TABLE "lensers"."badges" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "lensers"."badges" TO "authenticated";



GRANT ALL ON TABLE "lensers"."social_links" TO "service_role";
GRANT SELECT ON TABLE "lensers"."social_links" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "lensers"."social_links" TO "authenticated";



GRANT SELECT ON TABLE "lensers"."waiting_list" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "lensers"."waiting_list" TO "authenticated";



GRANT SELECT ON TABLE "lensers"."waiting_list_tokens" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "lensers"."waiting_list_tokens" TO "authenticated";



GRANT SELECT ON TABLE "lensers"."waiting_list_unsubscribe_tokens" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "lensers"."waiting_list_unsubscribe_tokens" TO "authenticated";



GRANT ALL ON TABLE "ops"."contact" TO "anon";
GRANT ALL ON TABLE "ops"."contact" TO "authenticated";
GRANT ALL ON TABLE "ops"."contact" TO "service_role";



GRANT ALL ON TABLE "public"."vw_ai_models_public" TO "anon";
GRANT ALL ON TABLE "public"."vw_ai_models_public" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_ai_models_public" TO "service_role";



GRANT ALL ON TABLE "public"."vw_auth_lenser" TO "anon";
GRANT ALL ON TABLE "public"."vw_auth_lenser" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_auth_lenser" TO "service_role";



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



GRANT ALL ON TABLE "xp"."levels" TO "service_role";
GRANT SELECT ON TABLE "xp"."levels" TO "anon";
GRANT SELECT ON TABLE "xp"."levels" TO "authenticated";



GRANT ALL ON TABLE "xp"."totals" TO "service_role";
GRANT SELECT ON TABLE "xp"."totals" TO "anon";
GRANT SELECT ON TABLE "xp"."totals" TO "authenticated";



GRANT ALL ON TABLE "public"."vw_lensers_public_recent" TO "anon";
GRANT ALL ON TABLE "public"."vw_lensers_public_recent" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_lensers_public_recent" TO "service_role";



GRANT ALL ON TABLE "public"."vw_lensers_social_links_private" TO "anon";
GRANT ALL ON TABLE "public"."vw_lensers_social_links_private" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_lensers_social_links_private" TO "service_role";



GRANT ALL ON TABLE "public"."vw_lensers_social_links_public" TO "anon";
GRANT ALL ON TABLE "public"."vw_lensers_social_links_public" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_lensers_social_links_public" TO "service_role";



GRANT ALL ON TABLE "public"."vw_prompt_templates_public" TO "anon";
GRANT ALL ON TABLE "public"."vw_prompt_templates_public" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_prompt_templates_public" TO "service_role";



GRANT ALL ON TABLE "public"."vw_tags_public_extended" TO "anon";
GRANT ALL ON TABLE "public"."vw_tags_public_extended" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_tags_public_extended" TO "service_role";



GRANT ALL ON TABLE "public"."vw_tags_public_stats" TO "anon";
GRANT ALL ON TABLE "public"."vw_tags_public_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_tags_public_stats" TO "service_role";



GRANT ALL ON TABLE "public"."vw_xp_leaderboard_global" TO "anon";
GRANT ALL ON TABLE "public"."vw_xp_leaderboard_global" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_xp_leaderboard_global" TO "service_role";



GRANT ALL ON TABLE "xp"."season_totals" TO "service_role";
GRANT SELECT ON TABLE "xp"."season_totals" TO "anon";
GRANT SELECT ON TABLE "xp"."season_totals" TO "authenticated";



GRANT ALL ON TABLE "xp"."seasons" TO "service_role";
GRANT SELECT ON TABLE "xp"."seasons" TO "anon";
GRANT SELECT ON TABLE "xp"."seasons" TO "authenticated";



GRANT ALL ON TABLE "public"."vw_xp_leaderboard_season" TO "anon";
GRANT ALL ON TABLE "public"."vw_xp_leaderboard_season" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_xp_leaderboard_season" TO "service_role";



GRANT ALL ON TABLE "system"."entity_translations" TO "service_role";



GRANT ALL ON TABLE "system"."languages" TO "service_role";









GRANT ALL ON TABLE "xp"."event_verifications" TO "service_role";
GRANT SELECT ON TABLE "xp"."event_verifications" TO "anon";
GRANT SELECT ON TABLE "xp"."event_verifications" TO "authenticated";



GRANT ALL ON TABLE "xp"."events" TO "service_role";
GRANT SELECT ON TABLE "xp"."events" TO "anon";
GRANT SELECT ON TABLE "xp"."events" TO "authenticated";



GRANT ALL ON TABLE "xp"."level_ups" TO "service_role";
GRANT SELECT ON TABLE "xp"."level_ups" TO "anon";
GRANT SELECT ON TABLE "xp"."level_ups" TO "authenticated";



GRANT ALL ON TABLE "xp"."monthly_rollup" TO "service_role";
GRANT SELECT ON TABLE "xp"."monthly_rollup" TO "anon";
GRANT SELECT ON TABLE "xp"."monthly_rollup" TO "authenticated";



GRANT ALL ON TABLE "xp"."policy" TO "service_role";
GRANT SELECT ON TABLE "xp"."policy" TO "anon";
GRANT SELECT ON TABLE "xp"."policy" TO "authenticated";



GRANT ALL ON TABLE "xp"."rules" TO "service_role";
GRANT SELECT ON TABLE "xp"."rules" TO "anon";
GRANT SELECT ON TABLE "xp"."rules" TO "authenticated";



GRANT ALL ON TABLE "xp"."streaks" TO "service_role";
GRANT SELECT ON TABLE "xp"."streaks" TO "anon";
GRANT SELECT ON TABLE "xp"."streaks" TO "authenticated";



GRANT ALL ON SEQUENCE "xp"."xp_levels_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "xp"."xp_levels_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "xp"."xp_levels_id_seq" TO "service_role";



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






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "xp" GRANT ALL ON FUNCTIONS TO "service_role";





























--
-- Dumped schema changes for auth and storage
--

CREATE OR REPLACE TRIGGER "trg_log_lenser_activity" AFTER UPDATE OF "last_sign_in_at" ON "auth"."users" FOR EACH ROW EXECUTE FUNCTION "lensers"."trg_log_lenser_activity"();



CREATE OR REPLACE TRIGGER "trg_update_lenser_last_login" AFTER UPDATE OF "last_sign_in_at" ON "auth"."users" FOR EACH ROW EXECUTE FUNCTION "lensers"."trg_update_lenser_last_login"();



