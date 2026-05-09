-- Phase C (Trust Gateway): sync engine — outbox, watermarks, peer leases,
-- and the RPCs that drive bidirectional sync between local devices and cloud.
--
-- Cross-references:
--   * RFC-0003 §7
--   * docs/explanation/gateway/sync.md (object class authority + merge policy)
--   * libs/infra/gateway/src/lib/object-classes.ts (TS source of truth)

-- ─── 1. devices.sync_outbox ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS devices.sync_outbox (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lenser_id    UUID        NOT NULL REFERENCES lensers.profiles(id) ON DELETE CASCADE,
  device_id    UUID        NOT NULL REFERENCES devices.registered_devices(id) ON DELETE CASCADE,
  object_class TEXT        NOT NULL CHECK (char_length(object_class) BETWEEN 1 AND 64),
  object_id    TEXT        NOT NULL CHECK (char_length(object_id) BETWEEN 1 AND 128),
  op           TEXT        NOT NULL CHECK (op IN ('upsert','delete')),
  payload      JSONB       NOT NULL DEFAULT '{}',
  vclock       JSONB       NOT NULL DEFAULT '{}',
  applied_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_outbox_lenser     ON devices.sync_outbox (lenser_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sync_outbox_device     ON devices.sync_outbox (device_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sync_outbox_class      ON devices.sync_outbox (object_class, applied_at);
CREATE INDEX IF NOT EXISTS idx_sync_outbox_unapplied  ON devices.sync_outbox (lenser_id, created_at) WHERE applied_at IS NULL;

COMMENT ON TABLE devices.sync_outbox IS
  'Append-only log of pending local→cloud changes per device. Written by '
  'devices.fn_sync_push after envelope verification. 30-day retention; '
  'records are archived to audit.events after applied_at + 30 days.';

ALTER TABLE devices.sync_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sync_outbox_owner_select" ON devices.sync_outbox
  FOR SELECT
  USING (
    lenser_id = (
      SELECT id FROM lensers.profiles
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );

-- ─── 2. devices.sync_watermarks ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS devices.sync_watermarks (
  lenser_id    UUID        NOT NULL REFERENCES lensers.profiles(id) ON DELETE CASCADE,
  device_id    UUID        NOT NULL REFERENCES devices.registered_devices(id) ON DELETE CASCADE,
  object_class TEXT        NOT NULL CHECK (char_length(object_class) BETWEEN 1 AND 64),
  watermark    TIMESTAMPTZ NOT NULL DEFAULT '-infinity',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (device_id, object_class)
);

CREATE INDEX IF NOT EXISTS idx_sync_watermarks_lenser ON devices.sync_watermarks (lenser_id);

COMMENT ON TABLE devices.sync_watermarks IS
  'Per-(device, object_class) cursor into the cloud changefeed for pull. '
  'Updated by devices.fn_sync_pull after a successful row return. Idempotent '
  'replay returns the same set.';

ALTER TABLE devices.sync_watermarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sync_watermarks_owner_select" ON devices.sync_watermarks
  FOR SELECT
  USING (
    lenser_id = (
      SELECT id FROM lensers.profiles
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );

-- ─── 3. devices.peer_leases (leader election among same-Lenser devices) ─────

CREATE TABLE IF NOT EXISTS devices.peer_leases (
  lease_kind  TEXT        NOT NULL CHECK (char_length(lease_kind) BETWEEN 1 AND 64),
  lenser_id   UUID        NOT NULL REFERENCES lensers.profiles(id) ON DELETE CASCADE,
  device_id   UUID        NOT NULL REFERENCES devices.registered_devices(id) ON DELETE CASCADE,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL,

  PRIMARY KEY (lease_kind, lenser_id)
);

CREATE INDEX IF NOT EXISTS idx_peer_leases_device ON devices.peer_leases (device_id);

COMMENT ON TABLE devices.peer_leases IS
  'Time-bounded leases for cross-device coordination (e.g. sync_flush). One '
  'lease per (lease_kind, lenser_id). Acquired via fn_acquire_leader_lease.';

ALTER TABLE devices.peer_leases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "peer_leases_owner_select" ON devices.peer_leases
  FOR SELECT
  USING (
    lenser_id = (
      SELECT id FROM lensers.profiles
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );

-- ─── 4. devices.fn_sync_push ─────────────────────────────────────────────────
-- Accepts a SignedEnvelope JSONB whose body is { entries: [...] }. For Phase C
-- we accept the envelope without verifying the signature (Phase F adds
-- fn_verify_attestation_signature); we already enforce ownership and replay
-- protection via nonce_cache.

CREATE OR REPLACE FUNCTION devices.fn_sync_push(p_envelope JSONB)
RETURNS TABLE (
  applied_count INT,
  rejected_count INT,
  rejections     JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = devices, lensers, public, extensions
AS $$
DECLARE
  v_lenser_id UUID;
  v_device_id UUID;
  v_kid       TEXT;
  v_nonce     TEXT;
  v_iat       BIGINT;
  v_entries   JSONB;
  v_entry     JSONB;
  v_class     TEXT;
  v_object_id TEXT;
  v_op        TEXT;
  v_payload   JSONB;
  v_vclock    JSONB;
  v_applied   INT := 0;
  v_rejected  INT := 0;
  v_reasons   JSONB := '[]';
BEGIN
  SELECT id INTO v_lenser_id
  FROM lensers.profiles
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;

  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'active_lenser_required' USING ERRCODE = '42501';
  END IF;

  v_kid   := p_envelope->>'kid';
  v_nonce := p_envelope->>'nonce';
  v_iat   := (p_envelope->>'iat')::BIGINT;
  v_entries := p_envelope->'body'->'entries';

  IF v_kid IS NULL OR v_nonce IS NULL OR v_entries IS NULL THEN
    RAISE EXCEPTION 'malformed_envelope' USING ERRCODE = '22023';
  END IF;

  -- iat ±300s window
  IF v_iat IS NULL OR ABS(EXTRACT(EPOCH FROM now())::BIGINT - v_iat) > 300 THEN
    RAISE EXCEPTION 'iat_window' USING ERRCODE = '22023';
  END IF;

  -- Resolve device + ownership.
  v_device_id := v_kid::UUID;
  IF NOT EXISTS (
    SELECT 1 FROM devices.registered_devices
    WHERE id = v_device_id
      AND lenser_id = v_lenser_id
      AND trust_level IN ('approved','trusted')
  ) THEN
    RAISE EXCEPTION 'kid_mismatch' USING ERRCODE = '42501';
  END IF;

  -- Replay protection via nonce_cache.
  BEGIN
    INSERT INTO devices.nonce_cache (nonce, device_id, expires_at)
    VALUES (v_nonce, v_device_id, now() + interval '10 minutes');
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'nonce_replay' USING ERRCODE = '23505';
  END;

  FOR v_entry IN SELECT * FROM jsonb_array_elements(v_entries)
  LOOP
    v_class := v_entry->>'object_class';
    v_object_id := v_entry->>'object_id';
    v_op := v_entry->>'op';
    v_payload := COALESCE(v_entry->'payload', '{}'::jsonb);
    v_vclock := COALESCE(v_entry->'vclock', '{}'::jsonb);

    IF v_class IS NULL OR v_object_id IS NULL OR v_op IS NULL THEN
      v_rejected := v_rejected + 1;
      v_reasons  := v_reasons || jsonb_build_object('object_id', v_object_id, 'reason', 'malformed_entry');
      CONTINUE;
    END IF;

    -- Reject cloud-authoritative classes (write attempts on edges).
    IF v_class IN ('xp_total','trust_evaluation','battle_result','policy',
                   'budget','kill_switch','dark_launch','ai_catalog') THEN
      v_rejected := v_rejected + 1;
      v_reasons  := v_reasons || jsonb_build_object('object_id', v_object_id, 'reason', 'cloud_authoritative');
      CONTINUE;
    END IF;

    -- Reject local-only classes (must never be pushed).
    IF v_class IN ('byok_key','local_battle','scratchpad_draft',
                   'keychain_entry','private_key') THEN
      v_rejected := v_rejected + 1;
      v_reasons  := v_reasons || jsonb_build_object('object_id', v_object_id, 'reason', 'local_only_class');
      CONTINUE;
    END IF;

    INSERT INTO devices.sync_outbox (
      lenser_id, device_id, object_class, object_id, op, payload, vclock
    ) VALUES (
      v_lenser_id, v_device_id, v_class, v_object_id, v_op, v_payload, v_vclock
    );
    v_applied := v_applied + 1;
  END LOOP;

  RETURN QUERY SELECT v_applied, v_rejected, v_reasons;
END;
$$;

GRANT EXECUTE ON FUNCTION devices.fn_sync_push(JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_sync_push(p_envelope JSONB)
RETURNS TABLE (applied_count INT, rejected_count INT, rejections JSONB)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, devices, extensions
AS $$
  SELECT * FROM devices.fn_sync_push(p_envelope);
$$;

GRANT EXECUTE ON FUNCTION public.fn_sync_push(JSONB) TO authenticated;

-- ─── 5. devices.fn_sync_pull ─────────────────────────────────────────────────
-- Returns sync_outbox entries newer than the watermark for each requested
-- class. Watermarks advance atomically with the row return.

CREATE OR REPLACE FUNCTION devices.fn_sync_pull(
  p_envelope       JSONB,
  p_object_classes TEXT[],
  p_limit          INT DEFAULT 100
)
RETURNS TABLE (
  id           UUID,
  object_class TEXT,
  object_id    TEXT,
  op           TEXT,
  payload      JSONB,
  vclock       JSONB,
  created_at   TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = devices, lensers, public, extensions
AS $$
DECLARE
  v_lenser_id UUID;
  v_device_id UUID;
  v_kid       TEXT;
  v_nonce     TEXT;
  v_iat       BIGINT;
  v_class     TEXT;
  v_max_class_ts TIMESTAMPTZ;
  v_now       TIMESTAMPTZ := now();
BEGIN
  SELECT lp.id INTO v_lenser_id
  FROM lensers.profiles lp
  WHERE lp.user_id = auth.uid() AND lp.status = 'active'
  LIMIT 1;

  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'active_lenser_required' USING ERRCODE = '42501';
  END IF;

  v_kid   := p_envelope->>'kid';
  v_nonce := p_envelope->>'nonce';
  v_iat   := (p_envelope->>'iat')::BIGINT;

  IF v_kid IS NULL OR v_nonce IS NULL THEN
    RAISE EXCEPTION 'malformed_envelope' USING ERRCODE = '22023';
  END IF;

  IF v_iat IS NULL OR ABS(EXTRACT(EPOCH FROM v_now)::BIGINT - v_iat) > 300 THEN
    RAISE EXCEPTION 'iat_window' USING ERRCODE = '22023';
  END IF;

  v_device_id := v_kid::UUID;
  IF NOT EXISTS (
    SELECT 1 FROM devices.registered_devices
    WHERE id = v_device_id
      AND lenser_id = v_lenser_id
      AND trust_level IN ('approved','trusted')
  ) THEN
    RAISE EXCEPTION 'kid_mismatch' USING ERRCODE = '42501';
  END IF;

  BEGIN
    INSERT INTO devices.nonce_cache (nonce, device_id, expires_at)
    VALUES (v_nonce, v_device_id, v_now + interval '10 minutes');
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'nonce_replay' USING ERRCODE = '23505';
  END;

  p_limit := LEAST(COALESCE(p_limit, 100), 200);

  -- Return rows from the requested classes that are newer than the device's
  -- per-class watermark, then advance each watermark.
  CREATE TEMP TABLE _sync_pull_result ON COMMIT DROP AS
  SELECT
    o.id,
    o.object_class,
    o.object_id,
    o.op,
    o.payload,
    o.vclock,
    o.created_at
  FROM devices.sync_outbox o
  LEFT JOIN devices.sync_watermarks w
    ON w.device_id    = v_device_id
   AND w.object_class = o.object_class
  WHERE o.lenser_id = v_lenser_id
    AND o.device_id <> v_device_id
    AND o.object_class = ANY(p_object_classes)
    AND o.created_at > COALESCE(w.watermark, '-infinity'::timestamptz)
  ORDER BY o.created_at ASC
  LIMIT p_limit;

  -- Advance watermarks atomically per class (max created_at returned).
  FOR v_class IN SELECT DISTINCT r.object_class FROM _sync_pull_result r
  LOOP
    SELECT MAX(created_at) INTO v_max_class_ts
    FROM _sync_pull_result
    WHERE object_class = v_class;

    INSERT INTO devices.sync_watermarks (lenser_id, device_id, object_class, watermark, updated_at)
    VALUES (v_lenser_id, v_device_id, v_class, v_max_class_ts, v_now)
    ON CONFLICT (device_id, object_class) DO UPDATE
      SET watermark = GREATEST(devices.sync_watermarks.watermark, EXCLUDED.watermark),
          updated_at = v_now;
  END LOOP;

  RETURN QUERY SELECT * FROM _sync_pull_result ORDER BY created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION devices.fn_sync_pull(JSONB, TEXT[], INT) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_sync_pull(
  p_envelope       JSONB,
  p_object_classes TEXT[],
  p_limit          INT DEFAULT 100
)
RETURNS TABLE (
  id           UUID,
  object_class TEXT,
  object_id    TEXT,
  op           TEXT,
  payload      JSONB,
  vclock       JSONB,
  created_at   TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, devices, extensions
AS $$
  SELECT * FROM devices.fn_sync_pull(p_envelope, p_object_classes, p_limit);
$$;

GRANT EXECUTE ON FUNCTION public.fn_sync_pull(JSONB, TEXT[], INT) TO authenticated;

-- ─── 6. devices.fn_sync_status ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION devices.fn_sync_status(p_device_id UUID)
RETURNS TABLE (
  object_class  TEXT,
  watermark     TIMESTAMPTZ,
  outbox_depth  BIGINT,
  last_error    TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = devices, lensers, public, extensions
AS $$
DECLARE
  v_lenser_id UUID;
BEGIN
  SELECT lp.id INTO v_lenser_id
  FROM lensers.profiles lp
  WHERE lp.user_id = auth.uid()
  LIMIT 1;

  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    w.object_class,
    w.watermark,
    (SELECT COUNT(*)
       FROM devices.sync_outbox o
      WHERE o.device_id = p_device_id
        AND o.object_class = w.object_class
        AND o.applied_at IS NULL)::BIGINT AS outbox_depth,
    NULL::TEXT AS last_error
  FROM devices.sync_watermarks w
  WHERE w.lenser_id = v_lenser_id
    AND w.device_id = p_device_id
  ORDER BY w.object_class;
END;
$$;

GRANT EXECUTE ON FUNCTION devices.fn_sync_status(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_sync_status(p_device_id UUID)
RETURNS TABLE (object_class TEXT, watermark TIMESTAMPTZ, outbox_depth BIGINT, last_error TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, devices, extensions
AS $$
  SELECT * FROM devices.fn_sync_status(p_device_id);
$$;

GRANT EXECUTE ON FUNCTION public.fn_sync_status(UUID) TO authenticated;

-- ─── 7. devices.fn_acquire_leader_lease ──────────────────────────────────────

CREATE OR REPLACE FUNCTION devices.fn_acquire_leader_lease(
  p_lease_kind     TEXT,
  p_device_id      UUID,
  p_lease_seconds  INT DEFAULT 30
)
RETURNS TABLE (
  holder_device_id UUID,
  holder_acquired  BOOLEAN,
  expires_at       TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = devices, lensers, public, extensions
AS $$
DECLARE
  v_lenser_id UUID;
  v_now       TIMESTAMPTZ := now();
  v_holder    UUID;
  v_expires   TIMESTAMPTZ;
  v_acquired  BOOLEAN := false;
BEGIN
  SELECT lp.id INTO v_lenser_id
  FROM lensers.profiles lp
  WHERE lp.user_id = auth.uid() AND lp.status = 'active'
  LIMIT 1;

  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'active_lenser_required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM devices.registered_devices
    WHERE id = p_device_id
      AND lenser_id = v_lenser_id
      AND trust_level IN ('approved','trusted')
  ) THEN
    RAISE EXCEPTION 'device_not_trusted' USING ERRCODE = '42501';
  END IF;

  p_lease_seconds := GREATEST(LEAST(COALESCE(p_lease_seconds, 30), 600), 5);
  v_expires := v_now + make_interval(secs => p_lease_seconds);

  INSERT INTO devices.peer_leases (lease_kind, lenser_id, device_id, acquired_at, expires_at)
  VALUES (p_lease_kind, v_lenser_id, p_device_id, v_now, v_expires)
  ON CONFLICT (lease_kind, lenser_id) DO UPDATE
    SET device_id   = CASE
                        WHEN devices.peer_leases.expires_at < v_now THEN EXCLUDED.device_id
                        ELSE devices.peer_leases.device_id
                      END,
        acquired_at = CASE
                        WHEN devices.peer_leases.expires_at < v_now THEN v_now
                        ELSE devices.peer_leases.acquired_at
                      END,
        expires_at  = CASE
                        WHEN devices.peer_leases.expires_at < v_now THEN v_expires
                        ELSE devices.peer_leases.expires_at
                      END
  RETURNING device_id, expires_at INTO v_holder, v_expires;

  v_acquired := (v_holder = p_device_id);

  RETURN QUERY SELECT v_holder, v_acquired, v_expires;
END;
$$;

GRANT EXECUTE ON FUNCTION devices.fn_acquire_leader_lease(TEXT, UUID, INT) TO authenticated;

-- ─── 8. fn_sync_resolve_conflict — placeholder for interactive merges ────────

CREATE OR REPLACE FUNCTION devices.fn_sync_resolve_conflict(
  p_outbox_id UUID,
  p_winner    JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = devices, lensers, public, extensions
AS $$
DECLARE
  v_lenser_id UUID;
BEGIN
  SELECT lp.id INTO v_lenser_id
  FROM lensers.profiles lp
  WHERE lp.user_id = auth.uid() AND lp.status = 'active'
  LIMIT 1;

  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'active_lenser_required' USING ERRCODE = '42501';
  END IF;

  UPDATE devices.sync_outbox
     SET payload   = p_winner,
         applied_at = now()
   WHERE id = p_outbox_id
     AND lenser_id = v_lenser_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'conflict_not_found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION devices.fn_sync_resolve_conflict(UUID, JSONB) TO authenticated;
