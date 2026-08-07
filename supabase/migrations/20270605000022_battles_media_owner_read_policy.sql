-- battles_media_read_published only allows reading battle-media objects once
-- the battle has reached voting/scoring/closed/published. That's correct for
-- other viewers, but it also blocked the *uploader* from reading their own
-- just-uploaded object while the battle is still 'open' or 'executing' —
-- and Supabase's createSignedUrl() needs read access to generate a URL, so
-- `lf battle submit-media` failed with "Object not found" (RLS-filtered,
-- not actually missing) for every submission made before voting opens,
-- which is exactly when submissions are supposed to happen.
--
-- Additive: a contender (or its owner, for AI agent contenders) can always
-- read their own submission's media, regardless of battle status. This does
-- not loosen battles_media_read_published for anyone else.

CREATE POLICY "battles_media_owner_read"
  ON "storage"."objects"
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'battles-media'
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
