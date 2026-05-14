-- Repairs for pgTAP suites after late schema hardening.
-- Keeps test-visible contracts aligned with the current database model.

BEGIN;

-- Battle media uploads write the canonical submission content URL as well as
-- the BC-era convenience media columns, satisfying the base content invariant.
CREATE OR REPLACE FUNCTION public.fn_battles_submit_media(
  p_battle_id        UUID,
  p_contender_id     UUID,
  p_media_url        TEXT,
  p_mime_type        TEXT,
  p_output_modality  TEXT
)
RETURNS battles.submissions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, battles, extensions
AS $$
DECLARE
  v_uid       UUID := auth.uid();
  v_row       battles.submissions%ROWTYPE;
  v_is_owner  BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;
  IF p_output_modality IS NULL
     OR p_output_modality NOT IN ('image', 'video', 'audio') THEN
    RAISE EXCEPTION 'invalid_output_modality: %', p_output_modality
      USING ERRCODE = '22023';
  END IF;
  IF p_media_url IS NULL OR char_length(p_media_url) = 0 THEN
    RAISE EXCEPTION 'media_url_required' USING ERRCODE = '22023';
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM battles.contenders c
      JOIN battles.contender_entity_map cem ON cem.contender_id = c.id
     WHERE c.id           = p_contender_id
       AND c.battle_id    = p_battle_id
       AND cem.profile_id = v_uid
  )
  INTO v_is_owner;

  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'contender_not_owned' USING ERRCODE = '42501';
  END IF;

  INSERT INTO battles.submissions (
    battle_id,
    contender_id,
    content_url,
    media_url,
    mime_type,
    output_modality,
    status
  ) VALUES (
    p_battle_id,
    p_contender_id,
    p_media_url,
    p_media_url,
    p_mime_type,
    p_output_modality,
    'submitted'
  )
  ON CONFLICT (battle_id, contender_id) DO UPDATE
    SET content_url     = EXCLUDED.content_url,
        media_url       = EXCLUDED.media_url,
        mime_type       = EXCLUDED.mime_type,
        output_modality = EXCLUDED.output_modality,
        status          = 'submitted',
        submitted_at    = COALESCE(battles.submissions.submitted_at, now())
  RETURNING * INTO v_row;

  RETURN v_row;
END $$;

ALTER FUNCTION public.fn_battles_submit_media(UUID, UUID, TEXT, TEXT, TEXT) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_battles_submit_media(UUID, UUID, TEXT, TEXT, TEXT)
  TO authenticated, service_role;

-- Avoid recursive RLS between battles.series and battles.series_rounds.
CREATE OR REPLACE FUNCTION battles.fn_series_has_published_round(p_series_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM battles.series_rounds sr
      JOIN battles.battles b ON b.id = sr.battle_id
     WHERE sr.series_id = p_series_id
       AND b.status::text = 'published'
  );
$$;

CREATE OR REPLACE FUNCTION battles.fn_series_round_owner_id(p_series_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT s.creator_lenser_id
    FROM battles.series s
   WHERE s.id = p_series_id
   LIMIT 1;
$$;

DROP POLICY IF EXISTS series_select ON battles.series;
CREATE POLICY series_select ON battles.series
  FOR SELECT
  USING (
    creator_lenser_id = auth.uid()
    OR battles.fn_series_has_published_round(id)
  );

DROP POLICY IF EXISTS series_rounds_select ON battles.series_rounds;
CREATE POLICY series_rounds_select ON battles.series_rounds
  FOR SELECT
  USING (
    battles.fn_series_round_owner_id(series_id) = auth.uid()
    OR EXISTS (
      SELECT 1 FROM battles.battles b
       WHERE b.id = battle_id
         AND b.status::text = 'published'
    )
  );

-- Replace the corrupted normalizer introduced by the untracked identity
-- governance migration. The validator depends on exact canonical forms.
CREATE OR REPLACE FUNCTION identity_gov.fn_normalize_handle(p_handle text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v text := p_handle;
  v2 text;
BEGIN
  IF v IS NULL OR v = '' THEN
    RETURN '';
  END IF;

  v := replace(v, chr(8203), '');
  v := replace(v, chr(8204), '');
  v := replace(v, chr(8205), '');
  v := replace(v, chr(65279), '');
  v := normalize(v, NFKC);
  v := lower(v);

  v := replace(v, chr(1072), 'a');
  v := replace(v, chr(1077), 'e');
  v := replace(v, chr(1086), 'o');
  v := replace(v, chr(1088), 'p');
  v := replace(v, chr(1089), 'c');
  v := replace(v, chr(1093), 'x');
  v := replace(v, chr(1080), 'i');

  v := translate(v, '013457@$', 'oleastas');
  v := replace(v, '8', 'b');

  LOOP
    v2 := regexp_replace(v, '(.)\1{2,}', '\1\1', 'g');
    EXIT WHEN v2 = v;
    v := v2;
  END LOOP;

  v := regexp_replace(v, '^the[_\.-]?', '', 'g');
  v := regexp_replace(v,
    '[_\.-]?(support|help|hq|team|real|inc|corp|llc|org|net|io|app|'
    'pro|plus|admin|mod|moderator|bot|system|sys|core|api|dev|central|'
    'global|world|portal|hub|connect|verify)$',
    '', 'g');
  v := trim(both '_-.' FROM v);

  RETURN v;
END;
$$;

ALTER FUNCTION identity_gov.fn_validate_handle(text) SET search_path = 'extensions';

CREATE OR REPLACE FUNCTION identity_gov.fn_guard_lenser_handle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_verdict    text;
  v_class      text;
  v_score      smallint;
  v_reasons    text[];
BEGIN
  IF current_setting('identity_gov.allow_reserved_seed', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.handle IS NOT DISTINCT FROM NEW.handle THEN
    RETURN NEW;
  END IF;

  SELECT verdict, class_hit, risk_score, reason_codes
  INTO   v_verdict, v_class, v_score, v_reasons
  FROM   identity_gov.fn_validate_handle(NEW.handle);

  IF v_verdict = 'deny' THEN
    RAISE EXCEPTION
      'Handle "%" is reserved or protected (class: %, score: %, reasons: %). Choose a different handle.',
      NEW.handle, coalesce(v_class, 'unknown'), v_score,
      array_to_string(v_reasons, ', ')
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;
