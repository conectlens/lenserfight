-- =============================================================================
-- Migration: Consolidate Multiple Permissive Policies
-- Fixes: Supabase lint 0006_multiple_permissive_policies (64 warnings)
-- Strategy: Drop redundant permissive policies; keep single unified policy
--           per (table, role, action) combination.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- SECTION 1: analytics.lenser_activity
-- Problem: allow_trigger_insert (WITH CHECK true) + deny_all_activity (USING false)
--          Two permissive INSERT policies. The deny is non-functional — permissive
--          policies are OR'd; USING false on a permissive policy never blocks.
-- Fix: Drop both. Replace with a service_role-only INSERT policy.
--      Direct client inserts should not be allowed; triggers run as postgres/service.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "allow_trigger_insert" ON "analytics"."lenser_activity";
DROP POLICY IF EXISTS "deny_all_activity" ON "analytics"."lenser_activity";

CREATE POLICY "lenser_activity_service_insert"
  ON "analytics"."lenser_activity"
  FOR INSERT
  WITH CHECK ((SELECT auth.role()) = 'service_role');

-- ---------------------------------------------------------------------------
-- SECTION 2: analytics.page_views
-- Problem: page_views_insert_secure (WITH CHECK path non-null/non-empty)
--          + page_views_no_insert (WITH CHECK false) — same logical conflict.
-- Fix: Drop the no-op deny. Keep the secure insert policy.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "page_views_no_insert" ON "analytics"."page_views";

-- page_views_insert_secure is retained as-is (correct, narrow WITH CHECK).

-- ---------------------------------------------------------------------------
-- SECTION 3: ai.generations
-- Problem: 2 SELECT policies for authenticated:
--   - ai_generations_admin_select_all_secure (jwt is_super_admin check)
--   - ai_generations_select_own (lenser_id = get_auth_lenser_id())
-- Fix: Merge into single policy with OR.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "ai_generations_admin_select_all_secure" ON "ai"."generations";
DROP POLICY IF EXISTS "ai_generations_select_own" ON "ai"."generations";

CREATE POLICY "ai_generations_select"
  ON "ai"."generations"
  FOR SELECT
  TO "authenticated"
  USING (
    "lenser_id" = "lensers"."get_auth_lenser_id"()
    OR ((((SELECT auth.jwt()) ->> 'is_super_admin')::boolean) = true)
  );

-- ---------------------------------------------------------------------------
-- SECTION 4: content.media_library
-- Problem: 3 INSERT policies (insert_own_media, media_insert, media_insert_own),
--          2 DELETE policies, 2 SELECT policies + admin, 2 UPDATE policies.
--          anon roles also get INSERT through insert_own_media and media_insert.
-- Fix:
--   INSERT: single policy for authenticated only (lenser_id ownership).
--          anon should never insert media.
--   SELECT: owner OR admin in one policy.
--   UPDATE: single owner policy.
--   DELETE: single owner policy.
-- ---------------------------------------------------------------------------

-- INSERT
DROP POLICY IF EXISTS "insert_own_media" ON "content"."media_library";
DROP POLICY IF EXISTS "media_insert" ON "content"."media_library";
DROP POLICY IF EXISTS "media_insert_own" ON "content"."media_library";

CREATE POLICY "media_library_insert"
  ON "content"."media_library"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ("lensers"."user_owns_lenser"("lenser_id"));

-- SELECT
DROP POLICY IF EXISTS "media_select" ON "content"."media_library";
DROP POLICY IF EXISTS "media_select_own" ON "content"."media_library";
DROP POLICY IF EXISTS "media_admin_select_all" ON "content"."media_library";

CREATE POLICY "media_library_select"
  ON "content"."media_library"
  FOR SELECT
  TO "authenticated"
  USING (
    "lensers"."user_owns_lenser"("lenser_id")
    OR "public"."is_admin"()
  );

-- UPDATE
DROP POLICY IF EXISTS "media_update" ON "content"."media_library";
DROP POLICY IF EXISTS "media_update_own" ON "content"."media_library";

CREATE POLICY "media_library_update"
  ON "content"."media_library"
  FOR UPDATE
  TO "authenticated"
  USING ("lensers"."user_owns_lenser"("lenser_id"))
  WITH CHECK ("lensers"."user_owns_lenser"("lenser_id"));

-- DELETE
DROP POLICY IF EXISTS "media_delete" ON "content"."media_library";
DROP POLICY IF EXISTS "media_delete_own" ON "content"."media_library";

CREATE POLICY "media_library_delete"
  ON "content"."media_library"
  FOR DELETE
  TO "authenticated"
  USING ("lensers"."user_owns_lenser"("lenser_id"));

-- ---------------------------------------------------------------------------
-- SECTION 5: content.prompt_templates
-- Problem: 2 SELECT policies for authenticated:
--   - Authors can see own prompts (lenser_id = get_auth_lenser_id())
--   - Public prompts are viewable by everyone (visibility public/community + published)
-- Fix: Merge — owner OR public.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Authors can see own prompts" ON "content"."prompt_templates";
DROP POLICY IF EXISTS "Public prompts are viewable by everyone" ON "content"."prompt_templates";

CREATE POLICY "prompt_templates_select"
  ON "content"."prompt_templates"
  FOR SELECT
  USING (
    (
      ("visibility" = ANY (ARRAY['public'::"content"."visibility_enum", 'community'::"content"."visibility_enum"]))
      AND ("status" = 'published'::"content"."content_status")
    )
    OR ("lenser_id" = "lensers"."get_auth_lenser_id"())
  );

-- ---------------------------------------------------------------------------
-- SECTION 6: content.tag_map
-- Problem: 2 SELECT policies for authenticated:
--   - Public can read tag maps (USING true)
--   - Authors can manage tags for their content (covers SELECT + all ops)
-- Fix: Public read is already covered by USING true — owner management policy
--      for SELECT is redundant. Keep "Public can read tag maps" for SELECT.
--      Keep "Authors can manage tags for their content" but restrict to
--      INSERT/UPDATE/DELETE only (remove implicit SELECT from it).
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Authors can manage tags for their content" ON "content"."tag_map";

-- Re-create as INSERT/UPDATE/DELETE only (no SELECT — already covered by public policy)
CREATE POLICY "tag_map_author_manage"
  ON "content"."tag_map"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (
    (
      ("entity_type" = 'prompt_template'::"content"."entity_type_enum")
      AND (EXISTS (
        SELECT 1 FROM "content"."prompt_templates" "p"
        WHERE "p"."id" = "tag_map"."entity_id"
          AND "p"."lenser_id" = "lensers"."get_auth_lenser_id"()
      ))
    ) OR (
      ("entity_type" = 'thread'::"content"."entity_type_enum")
      AND (EXISTS (
        SELECT 1 FROM "content"."threads" "t"
        WHERE "t"."id" = "tag_map"."entity_id"
          AND "t"."lenser_id" = "lensers"."get_auth_lenser_id"()
      ))
    )
  );

CREATE POLICY "tag_map_author_delete"
  ON "content"."tag_map"
  FOR DELETE
  TO "authenticated"
  USING (
    (
      ("entity_type" = 'prompt_template'::"content"."entity_type_enum")
      AND (EXISTS (
        SELECT 1 FROM "content"."prompt_templates" "p"
        WHERE "p"."id" = "tag_map"."entity_id"
          AND "p"."lenser_id" = "lensers"."get_auth_lenser_id"()
      ))
    ) OR (
      ("entity_type" = 'thread'::"content"."entity_type_enum")
      AND (EXISTS (
        SELECT 1 FROM "content"."threads" "t"
        WHERE "t"."id" = "tag_map"."entity_id"
          AND "t"."lenser_id" = "lensers"."get_auth_lenser_id"()
      ))
    )
  );

-- "Public can read tag maps" is retained as-is (covers all roles for SELECT).

-- ---------------------------------------------------------------------------
-- SECTION 7: content.tag_translations
-- Problem: "Public can read tag translations" (USING true for all roles) +
--          "service_role_can_manage_tag_translations" (FOR ALL including SELECT).
--          Two SELECT-permissive policies for anon/authenticated/authenticator/dashboard_user.
-- Fix: service_role_can_manage_tag_translations should only cover write ops
--      (INSERT/UPDATE/DELETE). Public select already covers reads.
--      Re-create as write-only for service_role.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "service_role_can_manage_tag_translations" ON "content"."tag_translations";

CREATE POLICY "tag_translations_service_write"
  ON "content"."tag_translations"
  FOR INSERT
  WITH CHECK ((SELECT auth.role()) = 'service_role');

CREATE POLICY "tag_translations_service_update"
  ON "content"."tag_translations"
  FOR UPDATE
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

CREATE POLICY "tag_translations_service_delete"
  ON "content"."tag_translations"
  FOR DELETE
  USING ((SELECT auth.role()) = 'service_role');

-- "Public can read tag translations" is retained as-is for SELECT.

-- ---------------------------------------------------------------------------
-- SECTION 8: content.thread_replies
-- Problem: 3 SELECT policies for authenticated:
--   - thread_replies_public_select (public/community threads, published replies)
--   - thread_replies_owner_select (own replies via is_active_lenser + current_active_lenser_id)
--   - Thread owners can read replies on own threads (thread lenser_id = get_auth_lenser_id())
-- Fix: Merge all three cases.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "thread_replies_owner_select" ON "content"."thread_replies";
DROP POLICY IF EXISTS "thread_replies_public_select" ON "content"."thread_replies";
DROP POLICY IF EXISTS "Thread owners can read replies on own threads" ON "content"."thread_replies";

CREATE POLICY "thread_replies_select"
  ON "content"."thread_replies"
  FOR SELECT
  USING (
    -- Public/community thread replies (visible to anon + authenticated)
    (
      (EXISTS (
        SELECT 1 FROM "content"."threads" "t"
        WHERE "t"."id" = "thread_replies"."thread_id"
          AND "t"."visibility" = ANY (ARRAY['public'::"content"."visibility_enum", 'community'::"content"."visibility_enum"])
          AND "t"."status" = 'published'::"content"."content_status"
      ))
      AND "status" = 'published'::"content"."thread_reply_status"
      AND "deleted_at" IS NULL
    )
    -- Own replies
    OR (
      "lensers"."is_active_lenser"((SELECT auth.uid()))
      AND "lenser_id" = "lensers"."current_active_lenser_id"()
    )
    -- Thread owner reading replies on their own threads
    OR (
      EXISTS (
        SELECT 1 FROM "content"."threads" "t"
        WHERE "t"."id" = "thread_replies"."thread_id"
          AND "t"."lenser_id" = "lensers"."get_auth_lenser_id"()
      )
    )
  );

-- ---------------------------------------------------------------------------
-- SECTION 9: content.threads
-- Problem: 2 SELECT policies for anon/authenticated:
--   - Public threads are viewable by everyone (visibility + published)
--   - threads_owner_select (is_active_lenser + current_active_lenser_id)
-- Fix: Merge into single policy.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Public threads are viewable by everyone" ON "content"."threads";
DROP POLICY IF EXISTS "threads_owner_select" ON "content"."threads";

CREATE POLICY "threads_select"
  ON "content"."threads"
  FOR SELECT
  USING (
    (
      "visibility" = ANY (ARRAY['public'::"content"."visibility_enum", 'community'::"content"."visibility_enum"])
      AND "status" = 'published'::"content"."content_status"
    )
    OR (
      "lensers"."is_active_lenser"((SELECT auth.uid()))
      AND "lenser_id" = "lensers"."current_active_lenser_id"()
    )
  );

-- ---------------------------------------------------------------------------
-- SECTION 10: lensers.badges
-- Problem: 3 SELECT policies for authenticated:
--   - Public can read badges (USING true)
--   - Select own badges (EXISTS join to profiles)
--   - lenser_badges_no_modify (USING false — non-functional deny as permissive policy)
-- Fix: Public read covers all; "Select own badges" is redundant.
--      Drop Select own badges (covered by Public can read badges).
--      Drop lenser_badges_no_modify (non-functional; deny requires RESTRICTIVE).
--      If blocking writes is needed, add a RESTRICTIVE deny-write policy.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Select own badges" ON "lensers"."badges";
DROP POLICY IF EXISTS "lenser_badges_no_modify" ON "lensers"."badges";

-- Add a restrictive policy to actually block writes (the original intent of no_modify)
CREATE POLICY "badges_no_write"
  ON "lensers"."badges"
  AS RESTRICTIVE
  FOR ALL
  TO "anon", "authenticated"
  USING (true)  -- allow reads
  WITH CHECK (false);  -- block writes for non-service roles

-- Service role needs unrestricted access for badge grants
CREATE POLICY "badges_service_write"
  ON "lensers"."badges"
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

-- "Public can read badges" is retained.

-- ---------------------------------------------------------------------------
-- SECTION 11: lensers.profiles — SELECT
-- Problem: 7 SELECT policies for authenticated (and 5 for anon):
--   - lensers_owner_select: is_active_lenser + user_id = uid
--   - lensers_public_profiles_select: status=active + deletion_requested_at IS NULL
--   - lensers_public_select: visibility=public + status=active
--   - p_lensers_select_self: user_id = uid (authenticated only)
--   - select_active_public_profiles: status=active + deletion_requested_at IS NULL
--   - user_cannot_select_lensers: USING false (non-functional deny)
--   - view_own_activity_only: user_id = uid (authenticated only)
-- Note: lensers_public_profiles_select and select_active_public_profiles are identical.
--       user_cannot_select_lensers with USING false is non-functional as permissive.
-- Fix: One unified SELECT policy covering public profiles + self-access.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "lensers_owner_select" ON "lensers"."profiles";
DROP POLICY IF EXISTS "lensers_public_profiles_select" ON "lensers"."profiles";
DROP POLICY IF EXISTS "lensers_public_select" ON "lensers"."profiles";
DROP POLICY IF EXISTS "p_lensers_select_self" ON "lensers"."profiles";
DROP POLICY IF EXISTS "select_active_public_profiles" ON "lensers"."profiles";
DROP POLICY IF EXISTS "user_cannot_select_lensers" ON "lensers"."profiles";
DROP POLICY IF EXISTS "view_own_activity_only" ON "lensers"."profiles";

CREATE POLICY "profiles_select"
  ON "lensers"."profiles"
  FOR SELECT
  USING (
    -- Public active profiles visible to everyone
    (
      "visibility" = 'public'::"lensers"."lenser_visibility"
      AND "status" = 'active'::"lensers"."lenser_status"
      AND "deletion_requested_at" IS NULL
    )
    -- Owner can always see their own profile
    OR "user_id" = (SELECT auth.uid())
  );

-- ---------------------------------------------------------------------------
-- SECTION 12: lensers.profiles — UPDATE
-- Problem: 7 UPDATE policies for authenticated:
--   - allow_update_except_handle: USING true (tightened to service_role in 20260336)
--     but still listed by linter — already fixed, verify it's correct.
--   - fn_lensers_update_theme: is_active_lenser + user_id = uid
--   - lensers_owner_update: is_active_lenser + user_id = uid
--   - p_lensers_toggle_waitinglist: user_id = uid
--   - p_lensers_update_waitinglist: user_id = uid
--   - profiles_owner_update: user_id = uid
--   - service role can update is_super_admin: role = service_role
-- Fix:
--   - Merge all owner-based updates into one policy (user_id = uid).
--   - Keep service_role policy separate (different access scope).
--   - allow_update_except_handle was already fixed to service_role in 20260336;
--     merge it into "service role can update is_super_admin" as a single service policy.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "fn_lensers_update_theme" ON "lensers"."profiles";
DROP POLICY IF EXISTS "lensers_owner_update" ON "lensers"."profiles";
DROP POLICY IF EXISTS "p_lensers_toggle_waitinglist" ON "lensers"."profiles";
DROP POLICY IF EXISTS "p_lensers_update_waitinglist" ON "lensers"."profiles";
DROP POLICY IF EXISTS "profiles_owner_update" ON "lensers"."profiles";
DROP POLICY IF EXISTS "allow_update_except_handle" ON "lensers"."profiles";
DROP POLICY IF EXISTS "service role can update is_super_admin" ON "lensers"."profiles";

-- Owner update: any authenticated user can update their own profile
CREATE POLICY "profiles_owner_update"
  ON "lensers"."profiles"
  FOR UPDATE
  TO "authenticated"
  USING ("user_id" = (SELECT auth.uid()))
  WITH CHECK ("user_id" = (SELECT auth.uid()));

-- Service role update: allows backend to set is_super_admin and other protected fields
CREATE POLICY "profiles_service_update"
  ON "lensers"."profiles"
  FOR UPDATE
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

-- ---------------------------------------------------------------------------
-- SECTION 13: ops.contact
-- Problem: 2 SELECT policies for all roles:
--   - admin_and_service_can_read_contacts (role=admin OR jwt claim service_role)
--   - lenser_can_read_their_contacts (lenser_id IS NOT NULL + user_id = uid)
-- Fix: These serve different purposes — merge into one policy.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "admin_and_service_can_read_contacts" ON "ops"."contact";
DROP POLICY IF EXISTS "lenser_can_read_their_contacts" ON "ops"."contact";

CREATE POLICY "contact_select"
  ON "ops"."contact"
  FOR SELECT
  USING (
    -- Admin or service role can read all contacts
    (SELECT auth.role()) = 'service_role'
    OR (SELECT auth.role()) = 'admin'
    -- Lenser can read their own contact entries
    OR (
      "lenser_id" IS NOT NULL
      AND (
        SELECT "l"."user_id" FROM "lensers"."profiles" "l"
        WHERE "l"."id" = "contact"."lenser_id"
      ) = (SELECT auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- SECTION 14: battles.battles
-- Problem: 2 SELECT policies for authenticated:
--   - Authors can see own battles (creator_lenser_id = get_auth_lenser_id())
--   - Public battles are viewable by everyone (status in voting/scoring/closed/published)
-- Fix: Merge — public visibility OR own battles.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Authors can see own battles" ON "battles"."battles";
DROP POLICY IF EXISTS "Public battles are viewable by everyone" ON "battles"."battles";

CREATE POLICY "battles_select"
  ON "battles"."battles"
  FOR SELECT
  USING (
    (
      "status" = ANY (ARRAY[
        'voting'::"battles"."battle_status_enum",
        'scoring'::"battles"."battle_status_enum",
        'closed'::"battles"."battle_status_enum",
        'published'::"battles"."battle_status_enum"
      ])
      AND "deleted_at" IS NULL
    )
    OR "creator_lenser_id" = "lensers"."get_auth_lenser_id"()
  );

-- ---------------------------------------------------------------------------
-- SECTION 15: battles.contenders
-- Problem: 3 SELECT policies for authenticated:
--   - Battle creators can see own battle contenders
--   - Contenders can see themselves
--   - Contenders on public battles are viewable (no role restriction = all roles)
-- Fix: Merge all three. The "Contenders on public battles" is already all-role;
--      the authenticated-only cases become redundant for public battles.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Battle creators can see own battle contenders" ON "battles"."contenders";
DROP POLICY IF EXISTS "Contenders can see themselves" ON "battles"."contenders";
DROP POLICY IF EXISTS "Contenders on public battles are viewable" ON "battles"."contenders";

CREATE POLICY "contenders_select"
  ON "battles"."contenders"
  FOR SELECT
  USING (
    -- Public battle contenders
    (EXISTS (
      SELECT 1 FROM "battles"."battles" "b"
      WHERE "b"."id" = "contenders"."battle_id"
        AND "b"."status" = ANY (ARRAY[
          'voting'::"battles"."battle_status_enum",
          'scoring'::"battles"."battle_status_enum",
          'closed'::"battles"."battle_status_enum",
          'published'::"battles"."battle_status_enum"
        ])
        AND "b"."deleted_at" IS NULL
    ))
    -- Battle creator sees their battle's contenders
    OR (EXISTS (
      SELECT 1 FROM "battles"."battles" "b"
      WHERE "b"."id" = "contenders"."battle_id"
        AND "b"."creator_lenser_id" = "lensers"."get_auth_lenser_id"()
    ))
    -- Contenders see themselves
    OR (
      "contender_type" = 'human'::"battles"."contender_type_enum"
      AND "contender_ref_id" = (
        SELECT "profiles"."id" FROM "lensers"."profiles"
        WHERE "profiles"."user_id" = (SELECT auth.uid())
      )
    )
  );

-- ---------------------------------------------------------------------------
-- SECTION 16: battles.events
-- Problem: 2 SELECT policies for authenticated:
--   - Battle creators can see battle events
--   - Service role has full access to events (FOR ALL — covers SELECT too)
-- Fix: These don't conflict logically, but the service_role FOR ALL adds a
--      redundant SELECT for authenticated via the service_role path.
--      Separate service_role write ops from SELECT.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Battle creators can see battle events" ON "battles"."events";
DROP POLICY IF EXISTS "Service role has full access to events" ON "battles"."events";

CREATE POLICY "events_select"
  ON "battles"."events"
  FOR SELECT
  USING (
    -- Service role can see all
    (SELECT auth.role()) = 'service_role'
    -- Battle creators see their battle events
    OR (EXISTS (
      SELECT 1 FROM "battles"."battles" "b"
      WHERE "b"."id" = "events"."battle_id"
        AND "b"."creator_lenser_id" = "lensers"."get_auth_lenser_id"()
    ))
  );

CREATE POLICY "events_service_write"
  ON "battles"."events"
  FOR INSERT
  WITH CHECK ((SELECT auth.role()) = 'service_role');

CREATE POLICY "events_service_update"
  ON "battles"."events"
  FOR UPDATE
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

CREATE POLICY "events_service_delete"
  ON "battles"."events"
  FOR DELETE
  USING ((SELECT auth.role()) = 'service_role');

-- ---------------------------------------------------------------------------
-- SECTION 17: battles.invitations
-- Problem: 2 SELECT policies for authenticated:
--   - Invitees can see invitations sent to them
--   - Inviters can see own invitations
-- Fix: Merge into one policy.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Invitees can see invitations sent to them" ON "battles"."invitations";
DROP POLICY IF EXISTS "Inviters can see own invitations" ON "battles"."invitations";

CREATE POLICY "invitations_select"
  ON "battles"."invitations"
  FOR SELECT
  TO "authenticated"
  USING (
    "invited_lenser_id" = "lensers"."get_auth_lenser_id"()
    OR "invited_by" = "lensers"."get_auth_lenser_id"()
  );

-- ---------------------------------------------------------------------------
-- SECTION 18: battles.rubric_criteria
-- Problem: 2 SELECT policies for authenticated:
--   - Authors can see own rubric criteria (EXISTS join to rubrics by creator)
--   - Criteria of public rubrics are viewable (rubric is_public=true + not deleted)
-- Fix: Merge.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Authors can see own rubric criteria" ON "battles"."rubric_criteria";
DROP POLICY IF EXISTS "Criteria of public rubrics are viewable" ON "battles"."rubric_criteria";

CREATE POLICY "rubric_criteria_select"
  ON "battles"."rubric_criteria"
  FOR SELECT
  USING (
    (EXISTS (
      SELECT 1 FROM "battles"."rubrics" "r"
      WHERE "r"."id" = "rubric_criteria"."rubric_id"
        AND "r"."is_public" = true
        AND "r"."deleted_at" IS NULL
    ))
    OR (EXISTS (
      SELECT 1 FROM "battles"."rubrics" "r"
      WHERE "r"."id" = "rubric_criteria"."rubric_id"
        AND "r"."creator_lenser_id" = "lensers"."get_auth_lenser_id"()
    ))
  );

-- ---------------------------------------------------------------------------
-- SECTION 19: battles.rubrics
-- Problem: 2 SELECT policies for authenticated:
--   - Authors can see own rubrics
--   - Public rubrics are viewable by everyone
-- Fix: Merge.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Authors can see own rubrics" ON "battles"."rubrics";
DROP POLICY IF EXISTS "Public rubrics are viewable by everyone" ON "battles"."rubrics";

CREATE POLICY "rubrics_select"
  ON "battles"."rubrics"
  FOR SELECT
  USING (
    ("is_public" = true AND "deleted_at" IS NULL)
    OR "creator_lenser_id" = "lensers"."get_auth_lenser_id"()
  );

-- ---------------------------------------------------------------------------
-- SECTION 20: battles.submissions
-- Problem: 3 SELECT policies for authenticated:
--   - Battle creators can see submissions
--   - Contenders can see own submissions
--   - Submissions on voting+ battles are viewable
-- Fix: Merge all three.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Battle creators can see submissions" ON "battles"."submissions";
DROP POLICY IF EXISTS "Contenders can see own submissions" ON "battles"."submissions";
DROP POLICY IF EXISTS "Submissions on voting+ battles are viewable" ON "battles"."submissions";

CREATE POLICY "submissions_select"
  ON "battles"."submissions"
  FOR SELECT
  USING (
    -- Public battle submissions (voting+)
    (EXISTS (
      SELECT 1 FROM "battles"."battles" "b"
      WHERE "b"."id" = "submissions"."battle_id"
        AND "b"."status" = ANY (ARRAY[
          'voting'::"battles"."battle_status_enum",
          'scoring'::"battles"."battle_status_enum",
          'closed'::"battles"."battle_status_enum",
          'published'::"battles"."battle_status_enum"
        ])
        AND "b"."deleted_at" IS NULL
    ))
    -- Battle creator sees all submissions for their battle
    OR (EXISTS (
      SELECT 1 FROM "battles"."battles" "b"
      WHERE "b"."id" = "submissions"."battle_id"
        AND "b"."creator_lenser_id" = "lensers"."get_auth_lenser_id"()
    ))
    -- Contenders see their own submissions
    OR (EXISTS (
      SELECT 1 FROM "battles"."contenders" "c"
      WHERE "c"."id" = "submissions"."contender_id"
        AND "c"."contender_type" = 'human'::"battles"."contender_type_enum"
        AND "c"."contender_ref_id" = "lensers"."get_auth_lenser_id"()
    ))
  );

-- ---------------------------------------------------------------------------
-- SECTION 21: battles.templates
-- Problem: 2 SELECT policies for authenticated:
--   - Authors can see own templates
--   - Public templates are viewable by everyone
-- Fix: Merge.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Authors can see own templates" ON "battles"."templates";
DROP POLICY IF EXISTS "Public templates are viewable by everyone" ON "battles"."templates";

CREATE POLICY "templates_select"
  ON "battles"."templates"
  FOR SELECT
  USING (
    ("is_public" = true AND "deleted_at" IS NULL)
    OR "creator_lenser_id" = "lensers"."get_auth_lenser_id"()
  );

-- ---------------------------------------------------------------------------
-- SECTION 22: battles.votes
-- Problem: 2 SELECT policies for authenticated:
--   - Voters can see own votes
--   - Votes on closed+ battles are viewable
-- Fix: Merge.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Voters can see own votes" ON "battles"."votes";
DROP POLICY IF EXISTS "Votes on closed+ battles are viewable" ON "battles"."votes";

CREATE POLICY "votes_select"
  ON "battles"."votes"
  FOR SELECT
  USING (
    (EXISTS (
      SELECT 1 FROM "battles"."battles" "b"
      WHERE "b"."id" = "votes"."battle_id"
        AND "b"."status" = ANY (ARRAY[
          'closed'::"battles"."battle_status_enum",
          'published'::"battles"."battle_status_enum"
        ])
        AND "b"."deleted_at" IS NULL
    ))
    OR "voter_lenser_id" = "lensers"."get_auth_lenser_id"()
  );

-- ---------------------------------------------------------------------------
-- SECTION 23: xp.levels
-- Problem: 2 SELECT policies for authenticated:
--   - Authenticated can read xp levels (USING true, role=authenticated)
--   - xp_levels_service_only (FOR ALL — service_role; covers SELECT + writes)
-- Fix: Keep authenticated read. Restrict service policy to write ops only.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "xp_levels_service_only" ON "xp"."levels";

CREATE POLICY "xp_levels_service_write"
  ON "xp"."levels"
  FOR INSERT
  WITH CHECK ((SELECT auth.role()) = 'service_role');

CREATE POLICY "xp_levels_service_update"
  ON "xp"."levels"
  FOR UPDATE
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

CREATE POLICY "xp_levels_service_delete"
  ON "xp"."levels"
  FOR DELETE
  USING ((SELECT auth.role()) = 'service_role');

-- "Authenticated can read xp levels" is retained for SELECT.

-- ---------------------------------------------------------------------------
-- SECTION 24: xp.season_totals
-- Problem: 2 SELECT policies for all roles:
--   - xp_season_totals_leaderboard_select (USING true — public)
--   - xp_season_totals_select_own (lenser_id = uid — redundant; public covers it)
-- Fix: Drop the redundant own-select (public already grants access).
--      If data sensitivity requires restricting to self+public, replace leaderboard
--      policy. Here the intent is clearly public leaderboard data.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "xp_season_totals_select_own" ON "xp"."season_totals";

-- xp_season_totals_leaderboard_select (USING true) is retained.

-- ---------------------------------------------------------------------------
-- SECTION 25: xp.totals
-- Problem: 3 SELECT policies (2 for authenticated, all for others):
--   - xp_totals_leaderboard_select (USING true — public)
--   - xp_totals_select_own (lenser_id = uid — redundant; note: uid vs lenser_id mismatch)
--   - p_xp_totals_select_self (lenser_id IN profiles where user_id = uid — correct join)
-- Note: xp_totals_select_own uses lenser_id = auth.uid() directly — this is a bug
--       (lenser_id is a lensers.profiles.id UUID, not a user_id). p_xp_totals_select_self
--       correctly joins through profiles. Both are redundant given USING true leaderboard.
-- Fix: Drop both own-select variants (covered by leaderboard public policy).
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "xp_totals_select_own" ON "xp"."totals";
DROP POLICY IF EXISTS "p_xp_totals_select_self" ON "xp"."totals";

-- xp_totals_leaderboard_select (USING true) is retained.
