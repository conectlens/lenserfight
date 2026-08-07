-- Same fix as fn_battles_submit_media: use lensers.get_auth_human_lenser_id()
-- (always the caller's own human profile) instead of
-- lensers.get_auth_lenser_id() (the caller's *active workspace* identity,
-- which can be switched to an owned AI agent) for the agents.ownerships
-- comparison and the direct human-contender comparison.

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
          cem.profile_id = lensers.get_auth_human_lenser_id()
          OR EXISTS (
            SELECT 1
            FROM agents.ownerships o
            WHERE o.ai_lenser_id = cem.ai_lenser_id
              AND o.owner_lenser_id = lensers.get_auth_human_lenser_id()
              AND o.revoked_at IS NULL
          )
        )
    )
  );
