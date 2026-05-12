-- Phase AY — Media outputs on battle submissions.
--
-- Adds the three columns the battle UI needs to render image / video / audio
-- contender outputs side-by-side, and extends fn_get_battle_submissions to
-- include them.
--
-- output_modality is intentionally an open text + CHECK; the workflow output
-- pipeline may add new modalities (e.g. multi-image, 3D) without a migration.

ALTER TABLE battles.submissions
  ADD COLUMN IF NOT EXISTS media_url       TEXT,
  ADD COLUMN IF NOT EXISTS mime_type       TEXT
    CHECK (mime_type IS NULL OR char_length(mime_type) <= 128),
  ADD COLUMN IF NOT EXISTS output_modality TEXT
    CHECK (output_modality IS NULL OR output_modality IN ('text','image','video','audio'));

COMMENT ON COLUMN battles.submissions.media_url IS
  'Phase AY: signed URL (or proxy URL) pointing at the media artifact produced '
  'by the contender. NULL for plain-text submissions.';
COMMENT ON COLUMN battles.submissions.output_modality IS
  'Phase AY: discriminator the UI uses to pick the right renderer.';

DROP FUNCTION IF EXISTS public.fn_get_battle_submissions(uuid);

CREATE OR REPLACE FUNCTION public.fn_get_battle_submissions(p_battle_id uuid)
RETURNS TABLE(
  id               uuid,
  battle_id        uuid,
  contender_id     uuid,
  content_text     text,
  content_url      text,
  status           text,
  submitted_at     timestamptz,
  execution_run_id uuid,
  is_final         boolean,
  media_url        text,
  mime_type        text,
  output_modality  text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, battles
AS $$
  SELECT s.id, s.battle_id, s.contender_id, s.content_text, s.content_url,
         s.status::text, s.submitted_at, s.execution_run_id, s.is_final,
         s.media_url, s.mime_type, s.output_modality
  FROM battles.submissions s
  JOIN battles.battles b ON b.id = s.battle_id
  WHERE s.battle_id = p_battle_id
    AND b.deleted_at IS NULL
    AND (
      b.status::text = 'published'   -- anon: only published results are public
      OR auth.uid() IS NOT NULL      -- authenticated: any non-deleted battle is accessible
    );
$$;

ALTER FUNCTION public.fn_get_battle_submissions(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_battle_submissions(uuid)
  TO anon, authenticated, service_role;
