-- storage.objects policy "battles_media_upload" had the exact same bug
-- class as fn_battles_submit_media: it compared
-- battles.contender_entity_map.profile_id directly against auth.uid() —
-- two different id spaces (profile_id is lensers.profiles.id, linked to
-- auth.uid() via profiles.user_id, never equal to it directly) — so no
-- human contender could ever pass this check either. It also never
-- considered AI agent contenders owned by the uploader at all.
--
-- Fix: resolve the caller to their lenser profile id via
-- lensers.get_auth_lenser_id(), and accept either a matching human
-- contender or an AI agent contender the caller owns (agents.ownerships).

DROP POLICY IF EXISTS "battles_media_upload" ON "storage"."objects";

CREATE POLICY "battles_media_upload"
  ON "storage"."objects"
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'battles-media'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM battles.contenders c
      JOIN battles.contender_entity_map cem ON cem.contender_id = c.id
      WHERE c.battle_id::text = (storage.foldername(objects.name))[1]
        AND c.id::text = (storage.foldername(objects.name))[2]
        AND (
          cem.profile_id = lensers.get_auth_lenser_id()
          OR EXISTS (
            SELECT 1
            FROM agents.ownerships o
            WHERE o.ai_lenser_id = cem.ai_lenser_id
              AND o.owner_lenser_id = lensers.get_auth_lenser_id()
              AND o.revoked_at IS NULL
          )
        )
    )
  );
