-- Fix: battles_select RLS policy excluded 'open' and 'executing' statuses, making
-- battles invisible to anon users immediately after a creator publishes them.
-- Status lifecycle: draft → open → executing → voting → scoring → closed → published → archived
-- 'open' and 'executing' are now included so publicly-launched battles are visible to all.
-- 'draft' (private setup) and 'archived' remain hidden from non-creators.

DROP POLICY IF EXISTS "battles_select" ON "battles"."battles";

CREATE POLICY "battles_select" ON "battles"."battles" FOR SELECT
USING (
  (
    "status" = ANY (ARRAY[
      'open'::"battles"."battle_status_enum",
      'executing'::"battles"."battle_status_enum",
      'voting'::"battles"."battle_status_enum",
      'scoring'::"battles"."battle_status_enum",
      'closed'::"battles"."battle_status_enum",
      'published'::"battles"."battle_status_enum"
    ])
    AND "deleted_at" IS NULL
  )
  OR "creator_lenser_id" = "lensers"."get_auth_lenser_id"()
);
