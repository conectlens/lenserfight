-- Battle invite links: viral QR / public / private shareable tokens for battles.
-- Distinct from battles.invitations (person-to-person direct invitations).
-- Consumed by `lf invite create`, `lf invite qr`, `lf invite stats`, `lf invite list`.

-- ── Type ─────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'invite_link_type' AND n.nspname = 'battles'
  ) THEN
    CREATE TYPE battles.invite_link_type AS ENUM ('public', 'private', 'link', 'qr');
  END IF;
END $$;

-- ── Table ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS battles.invite_links (
  id              UUID                      PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id       UUID                      NOT NULL
                    REFERENCES battles.battles(id) ON DELETE CASCADE,
  created_by      UUID                      NOT NULL
                    REFERENCES lensers.profiles(id) ON DELETE CASCADE,
  type            battles.invite_link_type  NOT NULL DEFAULT 'public',
  token           TEXT                      NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(10), 'hex'),
  invite_url      TEXT                      NOT NULL,
  target_handle   TEXT,
  accepted_at     TIMESTAMPTZ,
  click_count     INTEGER                   NOT NULL DEFAULT 0 CHECK (click_count >= 0),
  qr_scan_count   INTEGER                   NOT NULL DEFAULT 0 CHECK (qr_scan_count >= 0),
  created_at      TIMESTAMPTZ               NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,

  CONSTRAINT invite_links_private_requires_target
    CHECK (type <> 'private' OR target_handle IS NOT NULL)
);

ALTER TABLE battles.invite_links OWNER TO postgres;

COMMENT ON TABLE battles.invite_links IS
  'Shareable battle invite tokens (QR, public link, private). Distinct from battles.invitations (direct person-to-person requests).';

CREATE INDEX IF NOT EXISTS idx_invite_links_battle_id  ON battles.invite_links (battle_id);
CREATE INDEX IF NOT EXISTS idx_invite_links_created_by ON battles.invite_links (created_by);
CREATE INDEX IF NOT EXISTS idx_invite_links_token       ON battles.invite_links (token);

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE battles.invite_links ENABLE ROW LEVEL SECURITY;

-- Battle creator can insert links for their own battles.
CREATE POLICY invite_links_insert ON battles.invite_links
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = lensers.get_auth_lenser_id()
    AND EXISTS (
      SELECT 1 FROM battles.battles b
       WHERE b.id = battle_id
         AND b.creator_lenser_id = lensers.get_auth_lenser_id()
    )
  );

-- Owner can see all their links; anyone can select by token (for acceptance flow).
CREATE POLICY invite_links_select ON battles.invite_links
  FOR SELECT TO authenticated
  USING (
    created_by = lensers.get_auth_lenser_id()
  );

-- Allow anon to read by token (public/qr links accessed before sign-in).
CREATE POLICY invite_links_select_anon ON battles.invite_links
  FOR SELECT TO anon
  USING (type IN ('public', 'link', 'qr'));

-- Only counter increments are allowed by authenticated users (via SECURITY DEFINER fn).
-- Direct UPDATE is blocked for all roles to prevent tampering.

-- ── fn_battle_invite_create ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_battle_invite_create(
  p_battle_id     UUID,
  p_type          TEXT    DEFAULT 'public',
  p_target_handle TEXT    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, battles, lensers
AS $$
DECLARE
  v_caller      UUID;
  v_link_type   battles.invite_link_type;
  v_token       TEXT;
  v_url         TEXT;
  v_id          UUID;
  v_base_url    TEXT := 'https://lenserfight.com';
BEGIN
  v_caller := lensers.get_auth_lenser_id();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  -- Validate caller owns the battle.
  IF NOT EXISTS (
    SELECT 1 FROM battles.battles b
     WHERE b.id = p_battle_id
       AND b.creator_lenser_id = v_caller
  ) THEN
    RAISE EXCEPTION 'battle_not_found_or_not_owner' USING ERRCODE = 'P0001';
  END IF;

  -- Validate type.
  BEGIN
    v_link_type := p_type::battles.invite_link_type;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'invalid_invite_type: %', p_type USING ERRCODE = 'P0001';
  END;

  -- Private requires target_handle.
  IF v_link_type = 'private' AND p_target_handle IS NULL THEN
    RAISE EXCEPTION 'private_invite_requires_target_handle' USING ERRCODE = 'P0001';
  END IF;

  -- Generate token and URL.
  v_token := encode(gen_random_bytes(10), 'hex');

  -- Build battle slug from battle id (slug stored on battle or fallback to id).
  SELECT COALESCE(
    (SELECT b.slug FROM battles.battles b WHERE b.id = p_battle_id),
    p_battle_id::TEXT
  ) INTO v_url;
  v_url := v_base_url || '/b/' || v_url || '?ref=' || v_token;

  INSERT INTO battles.invite_links (
    battle_id, created_by, type, token, invite_url, target_handle
  ) VALUES (
    p_battle_id, v_caller, v_link_type, v_token, v_url, p_target_handle
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'id',         v_id,
    'token',      v_token,
    'invite_url', v_url,
    'type',       p_type,
    'battle_id',  p_battle_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_battle_invite_create(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.fn_battle_invite_create(UUID, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.fn_battle_invite_create(UUID, TEXT, TEXT) IS
  'Creates a battle invite link (public/private/link/qr). Caller must own the battle. Returns id, token, and invite_url.';

-- ── fn_battle_invite_stats ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_battle_invite_stats(
  p_battle_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, battles, lensers
AS $$
DECLARE
  v_caller UUID;
BEGIN
  v_caller := lensers.get_auth_lenser_id();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  -- Only the battle owner can view stats.
  IF NOT EXISTS (
    SELECT 1 FROM battles.battles b
     WHERE b.id = p_battle_id
       AND b.creator_lenser_id = v_caller
  ) THEN
    RAISE EXCEPTION 'battle_not_found_or_not_owner' USING ERRCODE = 'P0001';
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'battle_id',    p_battle_id,
      'link_clicks',  COALESCE(SUM(click_count)   FILTER (WHERE type IN ('public','link')), 0),
      'qr_scans',     COALESCE(SUM(qr_scan_count) FILTER (WHERE type = 'qr'),              0),
      'accepted',     COUNT(*) FILTER (WHERE accepted_at IS NOT NULL),
      'total_links',  COUNT(*)
    )
    FROM battles.invite_links
   WHERE battle_id = p_battle_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_battle_invite_stats(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.fn_battle_invite_stats(UUID) TO authenticated;

COMMENT ON FUNCTION public.fn_battle_invite_stats(UUID) IS
  'Returns aggregated click, scan, accepted, and total-link counts for a battle. Caller must own the battle.';

-- ── fn_battle_invite_list ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_battle_invite_list(
  p_battle_id UUID,
  p_limit     INT DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, battles, lensers
AS $$
DECLARE
  v_caller UUID;
  v_rows   JSONB;
BEGIN
  v_caller := lensers.get_auth_lenser_id();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM battles.battles b
     WHERE b.id = p_battle_id
       AND b.creator_lenser_id = v_caller
  ) THEN
    RAISE EXCEPTION 'battle_not_found_or_not_owner' USING ERRCODE = 'P0001';
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id',             il.id,
      'type',           il.type,
      'token',          il.token,
      'invite_url',     il.invite_url,
      'target_handle',  il.target_handle,
      'click_count',    il.click_count,
      'qr_scan_count',  il.qr_scan_count,
      'accepted_at',    il.accepted_at,
      'created_at',     il.created_at,
      'expires_at',     il.expires_at
    )
    ORDER BY il.created_at DESC
  )
  INTO v_rows
  FROM (
    SELECT * FROM battles.invite_links
     WHERE battle_id = p_battle_id
     LIMIT LEAST(p_limit, 200)
  ) il;

  RETURN COALESCE(v_rows, '[]'::JSONB);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_battle_invite_list(UUID, INT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.fn_battle_invite_list(UUID, INT) TO authenticated;

COMMENT ON FUNCTION public.fn_battle_invite_list(UUID, INT) IS
  'Lists invite links for a battle (up to 200). Caller must own the battle.';

-- ── fn_battle_invite_accept ──────────────────────────────────────────────────
-- Called when a user follows an invite link and completes sign-in.
-- Increments the appropriate counter and sets accepted_at if this is the
-- first acceptance on a private link.

CREATE OR REPLACE FUNCTION public.fn_battle_invite_accept(
  p_token     TEXT,
  p_via_qr    BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, battles, lensers
AS $$
DECLARE
  v_link  battles.invite_links%ROWTYPE;
BEGIN
  SELECT * INTO v_link
    FROM battles.invite_links
   WHERE token = p_token
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invite_token_not_found' USING ERRCODE = 'P0001';
  END IF;

  IF v_link.expires_at IS NOT NULL AND v_link.expires_at < NOW() THEN
    RAISE EXCEPTION 'invite_token_expired' USING ERRCODE = 'P0001';
  END IF;

  -- Increment the right counter.
  IF p_via_qr OR v_link.type = 'qr' THEN
    UPDATE battles.invite_links
       SET qr_scan_count = qr_scan_count + 1,
           accepted_at   = COALESCE(accepted_at, NOW())
     WHERE id = v_link.id;
  ELSE
    UPDATE battles.invite_links
       SET click_count  = click_count + 1,
           accepted_at  = COALESCE(accepted_at, NOW())
     WHERE id = v_link.id;
  END IF;

  RETURN jsonb_build_object(
    'battle_id',  v_link.battle_id,
    'type',       v_link.type,
    'invite_url', v_link.invite_url
  );
END;
$$;

-- Intentionally granted to anon so the acceptance flow works before sign-in.
REVOKE ALL ON FUNCTION public.fn_battle_invite_accept(TEXT, BOOLEAN) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.fn_battle_invite_accept(TEXT, BOOLEAN) TO anon;
GRANT  EXECUTE ON FUNCTION public.fn_battle_invite_accept(TEXT, BOOLEAN) TO authenticated;

COMMENT ON FUNCTION public.fn_battle_invite_accept(TEXT, BOOLEAN) IS
  'Records a click or QR scan on a battle invite token. Granted to anon so it works before the visitor has an account.';
