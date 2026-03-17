-- Migration: 20260334000000_fix_rls_performance_lints.sql
-- Purpose: Fix Supabase performance lints:
--   1. auth_rls_initplan  — wrap auth.*() / current_setting() in (select …)
--   2. multiple_permissive — drop strictly-duplicate permissive policies
--   3. duplicate_index     — drop proven duplicate indexes
--   4. unindexed_fkeys     — add covering indexes for foreign keys

BEGIN;

-- ============================================================
-- SECTION 1: Fix auth_rls_initplan
-- Wrap auth.uid(), auth.role(), auth.jwt(), current_setting()
-- in (select …) so the planner evaluates once per query,
-- not once per row.
-- ============================================================

-- ── ai ──────────────────────────────────────────────────────

ALTER POLICY "ai_generations_admin_select_all_secure"
  ON "ai"."generations"
  USING ((((select "auth"."jwt"()) ->> 'is_super_admin'::"text"))::boolean = true);

-- ── analytics ───────────────────────────────────────────────

ALTER POLICY "auth_user_can_select_own_feedback"
  ON "analytics"."product_feedback"
  USING ("user_id" = (select "auth"."uid"()));

ALTER POLICY "country_join_log_select_own"
  ON "analytics"."lenser_country_join_log"
  USING ("lenser_id" = (select "auth"."uid"()));

-- p_feedback_select_own: skipped — dropped in Section 2

ALTER POLICY "share_events_select_by_link_owner"
  ON "analytics"."share_events"
  USING ((EXISTS (
    SELECT 1
      FROM "analytics"."shared_links" "sl"
      JOIN "lensers"."profiles" "l" ON ("l"."id" = "sl"."creator_lenser_id")
     WHERE "sl"."id" = "share_events"."shared_link_id"
       AND "l"."user_id" = (select "auth"."uid"())
  )));

ALTER POLICY "shared_links_delete_own"
  ON "analytics"."shared_links"
  USING ((EXISTS (
    SELECT 1 FROM "lensers"."profiles" "l"
     WHERE "l"."id" = "shared_links"."creator_lenser_id"
       AND "l"."user_id" = (select "auth"."uid"())
  )));

ALTER POLICY "shared_links_insert_own"
  ON "analytics"."shared_links"
  WITH CHECK ((EXISTS (
    SELECT 1 FROM "lensers"."profiles" "l"
     WHERE "l"."id" = "shared_links"."creator_lenser_id"
       AND "l"."user_id" = (select "auth"."uid"())
  )));

ALTER POLICY "shared_links_select_own"
  ON "analytics"."shared_links"
  USING ((EXISTS (
    SELECT 1 FROM "lensers"."profiles" "l"
     WHERE "l"."id" = "shared_links"."creator_lenser_id"
       AND "l"."user_id" = (select "auth"."uid"())
  )));

ALTER POLICY "shared_links_update_own"
  ON "analytics"."shared_links"
  USING ((EXISTS (
    SELECT 1 FROM "lensers"."profiles" "l"
     WHERE "l"."id" = "shared_links"."creator_lenser_id"
       AND "l"."user_id" = (select "auth"."uid"())
  )))
  WITH CHECK ((EXISTS (
    SELECT 1 FROM "lensers"."profiles" "l"
     WHERE "l"."id" = "shared_links"."creator_lenser_id"
       AND "l"."user_id" = (select "auth"."uid"())
  )));

-- ── battles ─────────────────────────────────────────────────

ALTER POLICY "Contenders can see themselves"
  ON "battles"."contenders"
  USING (("contender_type" = 'human'::"battles"."contender_type_enum")
    AND ("contender_ref_id" = (
      SELECT "profiles"."id" FROM "lensers"."profiles"
       WHERE "profiles"."user_id" = (select "auth"."uid"())
       LIMIT 1
    )));

ALTER POLICY "Service role has full access to events"
  ON "battles"."events"
  USING ((select "auth"."role"()) = 'service_role'::"text")
  WITH CHECK ((select "auth"."role"()) = 'service_role'::"text");

-- ── content: reaction user policies ─────────────────────────

ALTER POLICY "Users can delete own prompt reactions"
  ON "content"."prompt_reactions"
  USING ((select "auth"."uid"()) = "user_id");

ALTER POLICY "Users can delete own reply reactions"
  ON "content"."thread_reply_reactions"
  USING ((select "auth"."uid"()) = "user_id");

ALTER POLICY "Users can delete own thread reactions"
  ON "content"."thread_reactions"
  USING ((select "auth"."uid"()) = "user_id");

ALTER POLICY "Users can insert own prompt reactions"
  ON "content"."prompt_reactions"
  WITH CHECK ((select "auth"."uid"()) = "user_id");

ALTER POLICY "Users can insert own reply reactions"
  ON "content"."thread_reply_reactions"
  WITH CHECK ((select "auth"."uid"()) = "user_id");

ALTER POLICY "Users can insert own thread reactions"
  ON "content"."thread_reactions"
  WITH CHECK ((select "auth"."uid"()) = "user_id");

-- ── content: "Public can read" policies ─────────────────────

ALTER POLICY "Public can read prompt reactions"
  ON "content"."prompt_reactions"
  USING ((EXISTS (
    SELECT 1 FROM "content"."prompt_templates" "p"
     WHERE "p"."id" = "prompt_reactions"."prompt_id"
       AND ("p"."visibility" = 'public'::"content"."visibility_enum"
            OR ((select "auth"."uid"()) IS NOT NULL
                AND "p"."lenser_id" = "lensers"."get_auth_lenser_id"()))
  )));

ALTER POLICY "Public can read prompt translations"
  ON "content"."prompt_translations"
  USING ((EXISTS (
    SELECT 1 FROM "content"."prompt_templates" "p"
     WHERE "p"."id" = "prompt_translations"."prompt_id"
       AND ("p"."visibility" = 'public'::"content"."visibility_enum"
            OR ((select "auth"."uid"()) IS NOT NULL
                AND "p"."lenser_id" = "lensers"."get_auth_lenser_id"()))
  )));

ALTER POLICY "Public can read reply reactions"
  ON "content"."thread_reply_reactions"
  USING ((EXISTS (
    SELECT 1
      FROM "content"."thread_replies" "r"
      JOIN "content"."threads" "t" ON ("t"."id" = "r"."thread_id")
     WHERE "r"."id" = "thread_reply_reactions"."reply_id"
       AND ("t"."visibility" = 'public'::"content"."visibility_enum"
            OR ((select "auth"."uid"()) IS NOT NULL
                AND "t"."lenser_id" = "lensers"."get_auth_lenser_id"()))
  )));

ALTER POLICY "Public can read thread reactions"
  ON "content"."thread_reactions"
  USING ((EXISTS (
    SELECT 1 FROM "content"."threads" "t"
     WHERE "t"."id" = "thread_reactions"."thread_id"
       AND ("t"."visibility" = 'public'::"content"."visibility_enum"
            OR ((select "auth"."uid"()) IS NOT NULL
                AND "t"."lenser_id" = "lensers"."get_auth_lenser_id"()))
  )));

ALTER POLICY "Public can read thread translations"
  ON "content"."thread_translations"
  USING ((EXISTS (
    SELECT 1 FROM "content"."threads" "t"
     WHERE "t"."id" = "thread_translations"."thread_id"
       AND ("t"."visibility" = 'public'::"content"."visibility_enum"
            OR ((select "auth"."uid"()) IS NOT NULL
                AND "t"."lenser_id" = "lensers"."get_auth_lenser_id"()))
  )));

-- ── content: owner / media / tag / report policies ──────────

ALTER POLICY "lensers_can_insert_tags"
  ON "content"."tags"
  WITH CHECK ((select "auth"."uid"()) IN (
    SELECT "profiles"."user_id" FROM "lensers"."profiles"
  ));

ALTER POLICY "insert_own_media"
  ON "content"."media_library"
  WITH CHECK ("lenser_id" = (
    SELECT "vw_auth_lenser"."lenser_id"
      FROM "public"."vw_auth_lenser"
     WHERE "vw_auth_lenser"."user_id" = (select "auth"."uid"())
  ));

ALTER POLICY "media_delete"
  ON "content"."media_library"
  USING ((EXISTS (
    SELECT 1 FROM "lensers"."profiles" "l"
     WHERE "l"."id" = "media_library"."lenser_id"
       AND "l"."user_id" = (select "auth"."uid"())
  )));

ALTER POLICY "media_insert"
  ON "content"."media_library"
  WITH CHECK ((EXISTS (
    SELECT 1 FROM "lensers"."profiles" "l"
     WHERE "l"."id" = "media_library"."lenser_id"
       AND "l"."user_id" = (select "auth"."uid"())
  )));

ALTER POLICY "media_select"
  ON "content"."media_library"
  USING ((EXISTS (
    SELECT 1 FROM "lensers"."profiles" "l"
     WHERE "l"."id" = "media_library"."lenser_id"
       AND "l"."user_id" = (select "auth"."uid"())
  )));

ALTER POLICY "media_update"
  ON "content"."media_library"
  USING ((EXISTS (
    SELECT 1 FROM "lensers"."profiles" "l"
     WHERE "l"."id" = "media_library"."lenser_id"
       AND "l"."user_id" = (select "auth"."uid"())
  )))
  WITH CHECK ((EXISTS (
    SELECT 1 FROM "lensers"."profiles" "l"
     WHERE "l"."id" = "media_library"."lenser_id"
       AND "l"."user_id" = (select "auth"."uid"())
  )));

ALTER POLICY "prompt_templates_owner_delete"
  ON "content"."prompt_templates"
  USING ("lensers"."is_active_lenser"((select "auth"."uid"()))
    AND "lenser_id" = "lensers"."current_active_lenser_id"());

ALTER POLICY "prompt_templates_owner_insert"
  ON "content"."prompt_templates"
  WITH CHECK ("lensers"."is_active_lenser"((select "auth"."uid"()))
    AND "lenser_id" = "lensers"."current_active_lenser_id"());

ALTER POLICY "prompt_templates_owner_update"
  ON "content"."prompt_templates"
  USING ("lensers"."is_active_lenser"((select "auth"."uid"()))
    AND "lenser_id" = "lensers"."current_active_lenser_id"())
  WITH CHECK ("lensers"."is_active_lenser"((select "auth"."uid"()))
    AND "lenser_id" = "lensers"."current_active_lenser_id"());

ALTER POLICY "reports_delete_own"
  ON "content"."reports"
  USING ("reporter_id" = (
    SELECT "profiles"."id" FROM "lensers"."profiles"
     WHERE "profiles"."user_id" = (select "auth"."uid"())
     LIMIT 1
  ));

ALTER POLICY "reports_insert_self"
  ON "content"."reports"
  WITH CHECK ("reporter_id" = (
    SELECT "profiles"."id" FROM "lensers"."profiles"
     WHERE "profiles"."user_id" = (select "auth"."uid"())
     LIMIT 1
  ));

ALTER POLICY "reports_select_own"
  ON "content"."reports"
  USING ("reporter_id" = (
    SELECT "profiles"."id" FROM "lensers"."profiles"
     WHERE "profiles"."user_id" = (select "auth"."uid"())
     LIMIT 1
  ));

ALTER POLICY "thread_replies_owner_delete"
  ON "content"."thread_replies"
  USING ("lensers"."is_active_lenser"((select "auth"."uid"()))
    AND "lenser_id" = "lensers"."current_active_lenser_id"());

ALTER POLICY "thread_replies_owner_insert"
  ON "content"."thread_replies"
  WITH CHECK ("lensers"."is_active_lenser"((select "auth"."uid"()))
    AND "lenser_id" = "lensers"."current_active_lenser_id"());

ALTER POLICY "thread_replies_owner_select"
  ON "content"."thread_replies"
  USING ("lensers"."is_active_lenser"((select "auth"."uid"()))
    AND "lenser_id" = "lensers"."current_active_lenser_id"());

ALTER POLICY "thread_replies_owner_update"
  ON "content"."thread_replies"
  USING ("lensers"."is_active_lenser"((select "auth"."uid"()))
    AND "lenser_id" = "lensers"."current_active_lenser_id"())
  WITH CHECK ("lensers"."is_active_lenser"((select "auth"."uid"()))
    AND "lenser_id" = "lensers"."current_active_lenser_id"());

ALTER POLICY "threads_owner_delete"
  ON "content"."threads"
  USING ("lensers"."is_active_lenser"((select "auth"."uid"()))
    AND "lenser_id" = "lensers"."current_active_lenser_id"());

ALTER POLICY "threads_owner_insert"
  ON "content"."threads"
  WITH CHECK ("lensers"."is_active_lenser"((select "auth"."uid"()))
    AND "lenser_id" = "lensers"."current_active_lenser_id"());

ALTER POLICY "threads_owner_select"
  ON "content"."threads"
  USING ("lensers"."is_active_lenser"((select "auth"."uid"()))
    AND "lenser_id" = "lensers"."current_active_lenser_id"());

ALTER POLICY "threads_owner_update"
  ON "content"."threads"
  USING ("lensers"."is_active_lenser"((select "auth"."uid"()))
    AND "lenser_id" = "lensers"."current_active_lenser_id"())
  WITH CHECK ("lensers"."is_active_lenser"((select "auth"."uid"()))
    AND "lenser_id" = "lensers"."current_active_lenser_id"());

-- ── lensers ─────────────────────────────────────────────────

ALTER POLICY "allow_update_except_handle"
  ON "lensers"."profiles"
  USING (true)
  WITH CHECK ((select "auth"."role"()) = 'service_role'::"text");

ALTER POLICY "fn_lensers_update_theme"
  ON "lensers"."profiles"
  USING ("user_id" = (select "auth"."uid"())
    AND "lensers"."is_active_lenser"((select "auth"."uid"())))
  WITH CHECK ("user_id" = (select "auth"."uid"())
    AND "lensers"."is_active_lenser"((select "auth"."uid"())));

ALTER POLICY "follows_delete_self"
  ON "lensers"."follows"
  USING ("follower_id" = (
    SELECT "profiles"."id" FROM "lensers"."profiles"
     WHERE "profiles"."user_id" = (select "auth"."uid"())
     LIMIT 1
  ));

ALTER POLICY "follows_insert_self"
  ON "lensers"."follows"
  WITH CHECK ("follower_id" = (
    SELECT "profiles"."id" FROM "lensers"."profiles"
     WHERE "profiles"."user_id" = (select "auth"."uid"())
     LIMIT 1
  ));

ALTER POLICY "lensers_owner_insert"
  ON "lensers"."profiles"
  WITH CHECK ((select "auth"."uid"()) IS NOT NULL
    AND "user_id" = (select "auth"."uid"()));

ALTER POLICY "lensers_owner_select"
  ON "lensers"."profiles"
  USING ("lensers"."is_active_lenser"((select "auth"."uid"()))
    AND "user_id" = (select "auth"."uid"()));

ALTER POLICY "lensers_owner_update"
  ON "lensers"."profiles"
  USING ("lensers"."is_active_lenser"((select "auth"."uid"()))
    AND "user_id" = (select "auth"."uid"()))
  WITH CHECK ("lensers"."is_active_lenser"((select "auth"."uid"()))
    AND "user_id" = (select "auth"."uid"()));

ALTER POLICY "p_lensers_select_self"
  ON "lensers"."profiles"
  USING ("user_id" = (select "auth"."uid"()));

ALTER POLICY "p_lensers_toggle_waitinglist"
  ON "lensers"."profiles"
  USING ("user_id" = (select "auth"."uid"()))
  WITH CHECK ("user_id" = (select "auth"."uid"()));

ALTER POLICY "p_lensers_update_waitinglist"
  ON "lensers"."profiles"
  USING ("user_id" = (select "auth"."uid"()))
  WITH CHECK ("user_id" = (select "auth"."uid"()));

ALTER POLICY "profiles_owner_update"
  ON "lensers"."profiles"
  USING ("user_id" = (select "auth"."uid"()))
  WITH CHECK ("user_id" = (select "auth"."uid"()));

ALTER POLICY "service role can update is_super_admin"
  ON "lensers"."profiles"
  USING ((select "auth"."role"()) = 'service_role'::"text")
  WITH CHECK ((select "auth"."role"()) = 'service_role'::"text");

ALTER POLICY "social_links_owner_delete"
  ON "lensers"."social_links"
  USING ("lensers"."is_active_lenser"((select "auth"."uid"()))
    AND "lenser_id" = "lensers"."current_active_lenser_id"());

ALTER POLICY "social_links_owner_insert"
  ON "lensers"."social_links"
  WITH CHECK ("lensers"."is_active_lenser"((select "auth"."uid"()))
    AND "lenser_id" = "lensers"."current_active_lenser_id"());

ALTER POLICY "social_links_owner_update"
  ON "lensers"."social_links"
  USING ("lensers"."is_active_lenser"((select "auth"."uid"()))
    AND "lenser_id" = "lensers"."current_active_lenser_id"())
  WITH CHECK ("lensers"."is_active_lenser"((select "auth"."uid"()))
    AND "lenser_id" = "lensers"."current_active_lenser_id"());

ALTER POLICY "tag_follows_delete_self"
  ON "lensers"."tag_follows"
  USING ("lenser_id" = (
    SELECT "profiles"."id" FROM "lensers"."profiles"
     WHERE "profiles"."user_id" = (select "auth"."uid"())
     LIMIT 1
  ));

ALTER POLICY "tag_follows_insert_self"
  ON "lensers"."tag_follows"
  WITH CHECK ("lenser_id" = (
    SELECT "profiles"."id" FROM "lensers"."profiles"
     WHERE "profiles"."user_id" = (select "auth"."uid"())
     LIMIT 1
  ));

ALTER POLICY "view_own_activity_only"
  ON "lensers"."profiles"
  USING ("user_id" = (select "auth"."uid"()));

ALTER POLICY "Select own badges"
  ON "lensers"."badges"
  USING ((EXISTS (
    SELECT 1 FROM "lensers"."profiles" "l"
     WHERE "l"."id" = "badges"."lenser_id"
       AND "l"."user_id" = (select "auth"."uid"())
  )));

-- ── ops ─────────────────────────────────────────────────────

ALTER POLICY "admin_and_service_can_read_contacts"
  ON "ops"."contact"
  USING ((select "auth"."role"()) = 'admin'::"text"
    OR (select "current_setting"('request.jwt.claim.role'::"text", true)) = 'service_role'::"text");

ALTER POLICY "lenser_can_read_their_contacts"
  ON "ops"."contact"
  USING ("lenser_id" IS NOT NULL
    AND (SELECT "l"."user_id" FROM "lensers"."profiles" "l"
          WHERE "l"."id" = "contact"."lenser_id") = (select "auth"."uid"()));

-- ── system ──────────────────────────────────────────────────

ALTER POLICY "entity_translations_service_full"
  ON "system"."entity_translations"
  USING ((select "auth"."role"()) = 'service_role'::"text")
  WITH CHECK ((select "auth"."role"()) = 'service_role'::"text");

ALTER POLICY "system_languages_full"
  ON "system"."languages"
  USING ((select "auth"."role"()) = 'service_role'::"text")
  WITH CHECK ((select "auth"."role"()) = 'service_role'::"text");

-- ── xp ──────────────────────────────────────────────────────

ALTER POLICY "lenser_level_ups_select_own"
  ON "xp"."level_ups"
  USING ("lenser_id" = (select "auth"."uid"()));

ALTER POLICY "xp_event_verifications_select_own"
  ON "xp"."event_verifications"
  USING ((EXISTS (
    SELECT 1 FROM "xp"."events" "e"
     WHERE "e"."id" = "event_verifications"."event_id"
       AND "e"."lenser_id" = (select "auth"."uid"())
  )));

ALTER POLICY "xp_events_select_own"
  ON "xp"."events"
  USING ("lenser_id" = (select "auth"."uid"()));

ALTER POLICY "xp_levels_service_only"
  ON "xp"."levels"
  USING ((select "auth"."role"()) = 'service_role'::"text")
  WITH CHECK ((select "auth"."role"()) = 'service_role'::"text");

ALTER POLICY "xp_monthly_rollup_select_own"
  ON "xp"."monthly_rollup"
  USING ("lenser_id" = (select "auth"."uid"()));

ALTER POLICY "xp_policy_service_only"
  ON "xp"."policy"
  USING ((select "auth"."role"()) = 'service_role'::"text")
  WITH CHECK ((select "auth"."role"()) = 'service_role'::"text");

ALTER POLICY "xp_rules_service_only"
  ON "xp"."rules"
  USING ((select "auth"."role"()) = 'service_role'::"text")
  WITH CHECK ((select "auth"."role"()) = 'service_role'::"text");

ALTER POLICY "xp_season_totals_select_own"
  ON "xp"."season_totals"
  USING ("lenser_id" = (select "auth"."uid"()));

ALTER POLICY "xp_seasons_service_only"
  ON "xp"."seasons"
  USING ((select "auth"."role"()) = 'service_role'::"text")
  WITH CHECK ((select "auth"."role"()) = 'service_role'::"text");

ALTER POLICY "xp_streaks_select_own"
  ON "xp"."streaks"
  USING ("lenser_id" = (select "auth"."uid"()));

ALTER POLICY "xp_totals_select_own"
  ON "xp"."totals"
  USING ("lenser_id" = (select "auth"."uid"()));

ALTER POLICY "p_xp_totals_select_self"
  ON "xp"."totals"
  USING ("lenser_id" IN (
    SELECT "profiles"."id" FROM "lensers"."profiles"
     WHERE "profiles"."user_id" = (select "auth"."uid"())
  ));


-- ============================================================
-- SECTION 2: Drop duplicate permissive policies
-- Only strictly-identical duplicates — same USING clause,
-- same action, same roles.
-- ============================================================

-- analytics.lenser_activity: two identical deny-all policies
DROP POLICY "deny_all_lenser_activity" ON "analytics"."lenser_activity";

-- analytics.lenser_join_log: duplicate SELECT + redundant blanket deny
DROP POLICY "public_select_join_log"   ON "analytics"."lenser_join_log";
DROP POLICY "join_log_no_write"        ON "analytics"."lenser_join_log";

-- analytics.page_views: blanket deny redundant with per-action denies
DROP POLICY "deny_all"                 ON "analytics"."page_views";

-- analytics.product_feedback: duplicate SELECT + duplicate INSERT
DROP POLICY "p_feedback_select_own"    ON "analytics"."product_feedback";
DROP POLICY "anyone_can_insert_feedback" ON "analytics"."product_feedback";

-- content.tags: duplicate public SELECT
DROP POLICY "tags_public_select"       ON "content"."tags";


-- ============================================================
-- SECTION 3: Drop duplicate indexes
-- ============================================================

-- Duplicate of idx_prompt_translations_original (same cols + WHERE)
DROP INDEX IF EXISTS "content"."idx_prompt_translations_prompt_original";

-- Duplicate of idx_thread_translations_original (same cols + WHERE)
DROP INDEX IF EXISTS "content"."idx_thread_translations_thread_original";

-- PK languages_code_pkey already enforces uniqueness.
-- DROP CASCADE removes the constraint and all FKs that depend on its backing index,
-- then we re-create each FK so Postgres binds them to the PK.
ALTER TABLE "core"."languages" DROP CONSTRAINT IF EXISTS "languages_code_key" CASCADE;

ALTER TABLE "content"."prompt_translations"
  ADD CONSTRAINT "prompt_translations_language_code_fk"
    FOREIGN KEY ("language_code") REFERENCES "core"."languages"("code") ON DELETE RESTRICT;

ALTER TABLE "content"."tag_translations"
  ADD CONSTRAINT "tag_translations_language_code_fk"
    FOREIGN KEY ("language_code") REFERENCES "core"."languages"("code") ON DELETE RESTRICT;

ALTER TABLE "content"."thread_translations"
  ADD CONSTRAINT "thread_translations_language_code_fk"
    FOREIGN KEY ("language_code") REFERENCES "core"."languages"("code") ON DELETE RESTRICT;

ALTER TABLE "lensers"."profiles"
  ADD CONSTRAINT "profiles_preferred_language_fk"
    FOREIGN KEY ("preferred_language") REFERENCES "core"."languages"("code") ON DELETE RESTRICT;


-- ============================================================
-- SECTION 4: Add missing FK covering indexes
-- ============================================================

-- analytics
CREATE INDEX IF NOT EXISTS "idx_lenser_activity_lenser_id"
  ON "analytics"."lenser_activity" ("lenser_id");

CREATE INDEX IF NOT EXISTS "idx_page_views_lenser_id"
  ON "analytics"."page_views" ("lenser_id");

CREATE INDEX IF NOT EXISTS "idx_page_views_user_id"
  ON "analytics"."page_views" ("user_id");

-- battles
CREATE INDEX IF NOT EXISTS "idx_battles_forum_thread_id"
  ON "battles"."battles" ("forum_thread_id")
  WHERE "forum_thread_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_battles_rubric_id"
  ON "battles"."battles" ("rubric_id")
  WHERE "rubric_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_battles_winner_contender_id"
  ON "battles"."battles" ("winner_contender_id")
  WHERE "winner_contender_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_events_actor_id"
  ON "battles"."events" ("actor_id");

CREATE INDEX IF NOT EXISTS "idx_invitations_inviter_id"
  ON "battles"."invitations" ("invited_by");

CREATE INDEX IF NOT EXISTS "idx_scorecards_contender_id"
  ON "battles"."scorecards" ("contender_id");

CREATE INDEX IF NOT EXISTS "idx_scorecards_rubric_criterion_id"
  ON "battles"."scorecards" ("rubric_criterion_id");

CREATE INDEX IF NOT EXISTS "idx_scorecards_scorer_model_id"
  ON "battles"."scorecards" ("scorer_model_id")
  WHERE "scorer_model_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_templates_rubric_id"
  ON "battles"."templates" ("rubric_id")
  WHERE "rubric_id" IS NOT NULL;

-- content
CREATE INDEX IF NOT EXISTS "idx_prompt_translations_language_code"
  ON "content"."prompt_translations" ("language_code");

CREATE INDEX IF NOT EXISTS "idx_tag_suggestions_tag_id"
  ON "content"."tag_suggestions" ("tag_id");

CREATE INDEX IF NOT EXISTS "idx_tag_translations_language_code"
  ON "content"."tag_translations" ("language_code");

CREATE INDEX IF NOT EXISTS "idx_thread_replies_lenser_id"
  ON "content"."thread_replies" ("lenser_id");

CREATE INDEX IF NOT EXISTS "idx_thread_translations_language_code"
  ON "content"."thread_translations" ("language_code");

-- lensers
CREATE INDEX IF NOT EXISTS "idx_profiles_preferred_language"
  ON "lensers"."profiles" ("preferred_language");

CREATE INDEX IF NOT EXISTS "idx_waiting_list_tokens_email"
  ON "lensers"."waiting_list_tokens" ("email");

CREATE INDEX IF NOT EXISTS "idx_waiting_list_unsubscribe_tokens_email"
  ON "lensers"."waiting_list_unsubscribe_tokens" ("email");

-- xp
CREATE INDEX IF NOT EXISTS "idx_xp_event_verifications_event_id"
  ON "xp"."event_verifications" ("event_id");

CREATE INDEX IF NOT EXISTS "idx_xp_level_ups_lenser_id"
  ON "xp"."level_ups" ("lenser_id");

CREATE INDEX IF NOT EXISTS "idx_xp_season_totals_lenser_id"
  ON "xp"."season_totals" ("lenser_id");

COMMIT;


-- ============================================================
-- ROLLBACK SCRIPT (run manually if needed)
-- ============================================================
-- BEGIN;
--
-- -- Revert Section 1: restore bare auth.uid() / auth.role() / auth.jwt()
-- -- (run the original CREATE POLICY expressions from migration 20260321)
-- -- Example pattern:
-- -- ALTER POLICY "threads_owner_select" ON content.threads
-- --   USING (lensers.is_active_lenser(auth.uid()) AND lenser_id = lensers.current_active_lenser_id());
-- -- ... repeat for all ~65 policies ...
--
-- -- Revert Section 2: re-create dropped policies
-- CREATE POLICY "deny_all_lenser_activity" ON analytics.lenser_activity USING (false) WITH CHECK (false);
-- CREATE POLICY "public_select_join_log" ON analytics.lenser_join_log FOR SELECT USING (true);
-- CREATE POLICY "join_log_no_write" ON analytics.lenser_join_log USING (false) WITH CHECK (false);
-- CREATE POLICY "deny_all" ON analytics.page_views USING (false) WITH CHECK (false);
-- CREATE POLICY "p_feedback_select_own" ON analytics.product_feedback FOR SELECT TO authenticated USING (user_id = auth.uid());
-- CREATE POLICY "anyone_can_insert_feedback" ON analytics.product_feedback FOR INSERT WITH CHECK (true);
-- CREATE POLICY "tags_public_select" ON content.tags FOR SELECT USING (visibility = 'public'::content.tag_visibility_enum);
--
-- -- Revert Section 3: re-create dropped indexes
-- CREATE INDEX idx_prompt_translations_prompt_original ON content.prompt_translations (prompt_id) WHERE is_original = true;
-- CREATE INDEX idx_thread_translations_thread_original ON content.thread_translations (thread_id) WHERE is_original = true;
-- ALTER TABLE core.languages ADD CONSTRAINT languages_code_key UNIQUE (code);
-- ALTER TABLE content.prompt_translations  DROP CONSTRAINT prompt_translations_language_code_fk, ADD CONSTRAINT prompt_translations_language_code_fk  FOREIGN KEY (language_code) REFERENCES core.languages(code) ON DELETE RESTRICT;
-- ALTER TABLE content.tag_translations     DROP CONSTRAINT tag_translations_language_code_fk,    ADD CONSTRAINT tag_translations_language_code_fk     FOREIGN KEY (language_code) REFERENCES core.languages(code) ON DELETE RESTRICT;
-- ALTER TABLE content.thread_translations  DROP CONSTRAINT thread_translations_language_code_fk, ADD CONSTRAINT thread_translations_language_code_fk  FOREIGN KEY (language_code) REFERENCES core.languages(code) ON DELETE RESTRICT;
-- ALTER TABLE lensers.profiles             DROP CONSTRAINT profiles_preferred_language_fk,        ADD CONSTRAINT profiles_preferred_language_fk         FOREIGN KEY (preferred_language) REFERENCES core.languages(code) ON DELETE RESTRICT;
--
-- -- Revert Section 4: drop newly created FK indexes
-- DROP INDEX IF EXISTS analytics.idx_lenser_activity_lenser_id;
-- DROP INDEX IF EXISTS analytics.idx_page_views_lenser_id;
-- DROP INDEX IF EXISTS analytics.idx_page_views_user_id;
-- DROP INDEX IF EXISTS battles.idx_battles_forum_thread_id;
-- DROP INDEX IF EXISTS battles.idx_battles_rubric_id;
-- DROP INDEX IF EXISTS battles.idx_battles_winner_contender_id;
-- DROP INDEX IF EXISTS battles.idx_events_actor_id;
-- DROP INDEX IF EXISTS battles.idx_invitations_inviter_id;
-- DROP INDEX IF EXISTS battles.idx_scorecards_contender_id;
-- DROP INDEX IF EXISTS battles.idx_scorecards_rubric_criterion_id;
-- DROP INDEX IF EXISTS battles.idx_scorecards_scorer_model_id;
-- DROP INDEX IF EXISTS battles.idx_templates_rubric_id;
-- DROP INDEX IF EXISTS content.idx_prompt_translations_language_code;
-- DROP INDEX IF EXISTS content.idx_tag_suggestions_tag_id;
-- DROP INDEX IF EXISTS content.idx_tag_translations_language_code;
-- DROP INDEX IF EXISTS content.idx_thread_replies_lenser_id;
-- DROP INDEX IF EXISTS content.idx_thread_translations_language_code;
-- DROP INDEX IF EXISTS lensers.idx_profiles_preferred_language;
-- DROP INDEX IF EXISTS lensers.idx_waiting_list_tokens_email;
-- DROP INDEX IF EXISTS lensers.idx_waiting_list_unsubscribe_tokens_email;
-- DROP INDEX IF EXISTS xp.idx_xp_event_verifications_event_id;
-- DROP INDEX IF EXISTS xp.idx_xp_level_ups_lenser_id;
-- DROP INDEX IF EXISTS xp.idx_xp_season_totals_lenser_id;
--
-- COMMIT;
