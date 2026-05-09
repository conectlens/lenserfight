-- Restore the authz schema that was dropped by the community-edition cleanup block in
-- migration 20260329120000_community_base_schema.sql. The authz schema is required for
-- CLI device-authorization login (RFC 8628) and developer token management. It was
-- incorrectly classified as Chainabit-private; every LenserFight deployment needs it.

-- Schema
CREATE SCHEMA IF NOT EXISTS "authz";
ALTER SCHEMA "authz" OWNER TO "postgres";
COMMENT ON SCHEMA "authz" IS 'Private schema for device approval requests and time-bounded developer tokens. Not exposed via PostgREST; clients use public RPC wrappers only.';

-- Enum types (safe to re-create; CREATE TYPE does not have IF NOT EXISTS, so guard it)
DO $$ BEGIN
  CREATE TYPE "authz"."developer_token_status_enum" AS ENUM ('active', 'revoked', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TYPE "authz"."developer_token_status_enum" OWNER TO "postgres";

DO $$ BEGIN
  CREATE TYPE "authz"."device_approval_request_status_enum" AS ENUM ('pending', 'approved', 'exchanged', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TYPE "authz"."device_approval_request_status_enum" OWNER TO "postgres";

-- Tables
CREATE TABLE IF NOT EXISTS "authz"."device_approval_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_code" "text" NOT NULL,
    "request_secret_hash" "text" NOT NULL,
    "label" "text",
    "requested_by_user_id" "uuid",
    "requested_by_lenser_id" "uuid",
    "requested_token_ttl_hours" integer DEFAULT 24 NOT NULL,
    "status" "authz"."device_approval_request_status_enum" DEFAULT 'pending'::"authz"."device_approval_request_status_enum" NOT NULL,
    "approved_at" timestamp with time zone,
    "approved_by_user_id" "uuid",
    "approved_by_lenser_id" "uuid",
    "developer_token_id" "uuid",
    "expires_at" timestamp with time zone NOT NULL,
    "exchanged_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "login_access_token" "text",
    "login_refresh_token" "text"
);
ALTER TABLE "authz"."device_approval_requests" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "authz"."developer_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lenser_id" "uuid" NOT NULL,
    "label" "text",
    "token_hash" "text" NOT NULL,
    "token_prefix" "text" NOT NULL,
    "status" "authz"."developer_token_status_enum" DEFAULT 'active'::"authz"."developer_token_status_enum" NOT NULL,
    "issued_from_request_id" "uuid",
    "expires_at" timestamp with time zone NOT NULL,
    "revoked_at" timestamp with time zone,
    "last_used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "authz"."developer_tokens" OWNER TO "postgres";

-- Primary keys and unique constraints (idempotent — the base migration may have already created these)
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT *
    FROM (VALUES
      ('authz', 'device_approval_requests', 'device_approval_requests_pkey',                        'PRIMARY KEY ("id")'),
      ('authz', 'device_approval_requests', 'device_approval_requests_user_code_key',               'UNIQUE ("user_code")'),
      ('authz', 'device_approval_requests', 'device_approval_requests_request_secret_hash_key',     'UNIQUE ("request_secret_hash")'),
      ('authz', 'device_approval_requests', 'device_approval_requests_developer_token_id_key',      'UNIQUE ("developer_token_id")'),
      ('authz', 'developer_tokens',         'developer_tokens_pkey',                                'PRIMARY KEY ("id")'),
      ('authz', 'developer_tokens',         'developer_tokens_token_hash_key',                      'UNIQUE ("token_hash")'),
      ('authz', 'developer_tokens',         'developer_tokens_issued_from_request_id_key',          'UNIQUE ("issued_from_request_id")')
    ) AS t(schema_name, table_name, constraint_name, constraint_def)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint con
      JOIN pg_namespace n ON n.oid = con.connamespace
      WHERE n.nspname = c.schema_name
        AND con.conname = c.constraint_name
    ) THEN
      EXECUTE format(
        'ALTER TABLE ONLY %I.%I ADD CONSTRAINT %I %s',
        c.schema_name, c.table_name, c.constraint_name, c.constraint_def
      );
    END IF;
  END LOOP;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_device_approval_requests_status_expires_at" ON "authz"."device_approval_requests" USING "btree" ("status", "expires_at");
CREATE INDEX IF NOT EXISTS "idx_device_approval_requests_requested_by_user_id" ON "authz"."device_approval_requests" USING "btree" ("requested_by_user_id");
CREATE INDEX IF NOT EXISTS "idx_device_approval_requests_approved_by_user_id" ON "authz"."device_approval_requests" USING "btree" ("approved_by_user_id");
CREATE INDEX IF NOT EXISTS "idx_developer_tokens_lenser_id_created_at" ON "authz"."developer_tokens" USING "btree" ("lenser_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_developer_tokens_status_expires_at" ON "authz"."developer_tokens" USING "btree" ("status", "expires_at");
CREATE INDEX IF NOT EXISTS "idx_developer_tokens_revoked_at" ON "authz"."developer_tokens" USING "btree" ("revoked_at");

-- Foreign keys (idempotent)
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT *
    FROM (VALUES
      ('authz', 'developer_tokens',         'developer_tokens_issued_from_request_id_fkey',          'FOREIGN KEY ("issued_from_request_id") REFERENCES "authz"."device_approval_requests"("id") ON DELETE SET NULL'),
      ('authz', 'developer_tokens',         'developer_tokens_lenser_id_fkey',                       'FOREIGN KEY ("lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE'),
      ('authz', 'device_approval_requests', 'device_approval_requests_approved_by_lenser_id_fkey',   'FOREIGN KEY ("approved_by_lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE SET NULL'),
      ('authz', 'device_approval_requests', 'device_approval_requests_requested_by_lenser_id_fkey',  'FOREIGN KEY ("requested_by_lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE SET NULL')
    ) AS t(schema_name, table_name, constraint_name, constraint_def)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint con
      JOIN pg_namespace n ON n.oid = con.connamespace
      WHERE n.nspname = c.schema_name
        AND con.conname = c.constraint_name
    ) THEN
      EXECUTE format(
        'ALTER TABLE ONLY %I.%I ADD CONSTRAINT %I %s',
        c.schema_name, c.table_name, c.constraint_name, c.constraint_def
      );
    END IF;
  END LOOP;
END $$;

-- Private functions (authz schema — not exposed via PostgREST)

CREATE OR REPLACE FUNCTION "authz"."fn_generate_user_code"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'authz', 'extensions', 'public'
    AS $$
DECLARE
  v_code text;
BEGIN
  v_code := upper(substr(md5(gen_random_uuid()::text), 1, 8));
  RETURN substr(v_code, 1, 4) || '-' || substr(v_code, 5, 4);
END;
$$;
ALTER FUNCTION "authz"."fn_generate_user_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "authz"."fn_request_device_login"("p_request_ttl_minutes" integer DEFAULT 10) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'authz', 'extensions', 'public'
    AS $$
DECLARE
  v_request_id          uuid        := gen_random_uuid();
  v_request_secret      text        := encode(gen_random_bytes(32), 'hex');
  v_request_secret_hash text        := encode(digest(v_request_secret, 'sha256'), 'hex');
  v_user_code           text        := authz.fn_generate_user_code();
  v_ttl                 integer     := LEAST(GREATEST(COALESCE(p_request_ttl_minutes, 10), 1), 10);
  v_expires_at          timestamptz := now() + make_interval(mins => v_ttl);
BEGIN
  -- No auth.uid() check — this is the unauthenticated login initiation path.
  INSERT INTO authz.device_approval_requests (
      id,
      user_code,
      request_secret_hash,
      label,
      requested_by_user_id,
      requested_by_lenser_id,
      requested_token_ttl_hours,
      expires_at
  ) VALUES (
      v_request_id,
      v_user_code,
      v_request_secret_hash,
      'CLI Login',
      NULL,
      NULL,
      0,
      v_expires_at
  );

  RETURN jsonb_build_object(
    'requestId',           v_request_id,
    'requestSecret',       v_request_secret,
    'userCode',            v_user_code,
    'verificationUri',     '/device-approval?code=' || v_user_code || '&mode=login',
    'pollIntervalSeconds', 5,
    'expiresAt',           v_expires_at,
    'status',              'pending'
  );
END;
$$;
ALTER FUNCTION "authz"."fn_request_device_login"("p_request_ttl_minutes" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "authz"."fn_exchange_device_login"("p_request_id" "uuid", "p_request_secret" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'authz', 'extensions', 'public'
    AS $$
DECLARE
  v_request        authz.device_approval_requests%ROWTYPE;
  v_expected_hash  text;
  v_poll_interval  integer := 5;
BEGIN
  SELECT *
  INTO v_request
  FROM authz.device_approval_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'status',              'invalid',
      'pollIntervalSeconds', v_poll_interval
    );
  END IF;

  v_expected_hash := encode(digest(COALESCE(p_request_secret, ''), 'sha256'), 'hex');
  IF v_expected_hash IS DISTINCT FROM v_request.request_secret_hash THEN
    RAISE EXCEPTION 'Invalid device login request';
  END IF;

  IF v_request.status = 'exchanged' THEN
    RETURN jsonb_build_object(
      'status',              'invalid',
      'pollIntervalSeconds', v_poll_interval
    );
  END IF;

  IF now() > v_request.expires_at THEN
    UPDATE authz.device_approval_requests
    SET status = 'expired'
    WHERE id = v_request.id
      AND status <> 'exchanged';

    RETURN jsonb_build_object(
      'status',              'expired',
      'pollIntervalSeconds', v_poll_interval,
      'expiresAt',           v_request.expires_at
    );
  END IF;

  IF v_request.status = 'pending' OR v_request.login_access_token IS NULL THEN
    RETURN jsonb_build_object(
      'status',              'pending',
      'pollIntervalSeconds', v_poll_interval,
      'expiresAt',           v_request.expires_at
    );
  END IF;

  UPDATE authz.device_approval_requests
  SET status              = 'exchanged',
      exchanged_at        = now(),
      login_access_token  = NULL,
      login_refresh_token = NULL
  WHERE id = v_request.id;

  RETURN jsonb_build_object(
    'status',              'approved',
    'accessToken',         v_request.login_access_token,
    'refreshToken',        v_request.login_refresh_token,
    'pollIntervalSeconds', v_poll_interval
  );
END;
$$;
ALTER FUNCTION "authz"."fn_exchange_device_login"("p_request_id" "uuid", "p_request_secret" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "authz"."fn_store_device_login_session"("p_user_code" "text", "p_access_token" "text", "p_refresh_token" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'authz', 'auth', 'public'
    AS $$
DECLARE
  v_user_id        uuid := auth.uid();
  v_normalized     text := upper(replace(trim(COALESCE(p_user_code, '')), '-', ''));
  v_request        authz.device_approval_requests%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT *
  INTO v_request
  FROM authz.device_approval_requests
  WHERE replace(user_code, '-', '') = v_normalized
    AND status IN ('pending', 'approved')
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Device login request not found or expired';
  END IF;

  UPDATE authz.device_approval_requests
  SET status               = 'approved',
      approved_at          = COALESCE(approved_at, now()),
      approved_by_user_id  = COALESCE(approved_by_user_id, v_user_id),
      login_access_token   = p_access_token,
      login_refresh_token  = p_refresh_token
  WHERE id = v_request.id;

  RETURN jsonb_build_object('status', 'stored');
END;
$$;
ALTER FUNCTION "authz"."fn_store_device_login_session"("p_user_code" "text", "p_access_token" "text", "p_refresh_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "authz"."fn_approve_device_request"("p_user_code" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'authz', 'lensers', 'auth', 'public'
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_lenser_id uuid := lensers.get_auth_lenser_id();
  v_request authz.device_approval_requests%ROWTYPE;
  v_normalized_code text := upper(replace(trim(COALESCE(p_user_code, '')), '-', ''));
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT *
  INTO v_request
  FROM authz.device_approval_requests
  WHERE replace(user_code, '-', '') = v_normalized_code
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'requestId', NULL,
      'status', 'not_found',
      'approvedAt', NULL,
      'expiresAt', NULL
    );
  END IF;

  IF now() > v_request.expires_at THEN
    UPDATE authz.device_approval_requests
    SET status = 'expired'
    WHERE id = v_request.id
      AND status <> 'exchanged';

    RETURN jsonb_build_object(
      'requestId', v_request.id,
      'status', 'expired',
      'approvedAt', v_request.approved_at,
      'expiresAt', v_request.expires_at,
      'label', v_request.label
    );
  END IF;

  IF v_request.status IN ('approved', 'exchanged') THEN
    RETURN jsonb_build_object(
      'requestId', v_request.id,
      'status', 'approved',
      'approvedAt', v_request.approved_at,
      'expiresAt', v_request.expires_at,
      'label', v_request.label
    );
  END IF;

  UPDATE authz.device_approval_requests
  SET status = 'approved',
      approved_at = COALESCE(approved_at, now()),
      approved_by_user_id = COALESCE(approved_by_user_id, v_user_id),
      approved_by_lenser_id = COALESCE(approved_by_lenser_id, v_lenser_id)
  WHERE id = v_request.id;

  RETURN jsonb_build_object(
    'requestId', v_request.id,
    'status', 'approved',
    'approvedAt', COALESCE(v_request.approved_at, now()),
    'expiresAt', v_request.expires_at,
    'label', v_request.label
  );
END;
$$;
ALTER FUNCTION "authz"."fn_approve_device_request"("p_user_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "authz"."fn_request_device_approval"("p_label" "text" DEFAULT NULL::"text", "p_request_ttl_minutes" integer DEFAULT 10, "p_token_ttl_hours" integer DEFAULT 24) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'authz', 'lensers', 'auth', 'extensions', 'public'
    AS $$
DECLARE
  v_request_id uuid := gen_random_uuid();
  v_request_secret text := encode(gen_random_bytes(32), 'hex');
  v_request_secret_hash text := encode(digest(v_request_secret, 'sha256'), 'hex');
  v_user_code text := authz.fn_generate_user_code();
  v_requested_by_user_id uuid := auth.uid();
  v_requested_by_lenser_id uuid := lensers.get_auth_lenser_id();
  v_request_ttl_minutes integer := LEAST(GREATEST(COALESCE(p_request_ttl_minutes, 10), 1), 10);
  v_token_ttl_hours integer := LEAST(GREATEST(COALESCE(p_token_ttl_hours, 24), 1), 24);
  v_expires_at timestamptz := now() + make_interval(mins => LEAST(GREATEST(COALESCE(p_request_ttl_minutes, 10), 1), 10));
BEGIN
  IF v_requested_by_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO authz.device_approval_requests (
      id,
      user_code,
      request_secret_hash,
      label,
      requested_by_user_id,
      requested_by_lenser_id,
      requested_token_ttl_hours,
      expires_at
  ) VALUES (
      v_request_id,
      v_user_code,
      v_request_secret_hash,
      p_label,
      v_requested_by_user_id,
      v_requested_by_lenser_id,
      v_token_ttl_hours,
      v_expires_at
  );

  RETURN jsonb_build_object(
    'requestId', v_request_id,
    'requestSecret', v_request_secret,
    'userCode', v_user_code,
    'verificationUri', '/device-approval?code=' || v_user_code,
    'verificationUriComplete', '/device-approval?code=' || v_user_code || '&request_id=' || v_request_id::text,
    'pollIntervalSeconds', 5,
    'expiresAt', v_expires_at,
    'status', 'pending',
    'label', p_label
  );
END;
$$;
ALTER FUNCTION "authz"."fn_request_device_approval"("p_label" "text", "p_request_ttl_minutes" integer, "p_token_ttl_hours" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "authz"."fn_exchange_device_approval"("p_request_id" "uuid", "p_request_secret" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'authz', 'lensers', 'auth', 'extensions', 'public'
    AS $$
DECLARE
  v_request authz.device_approval_requests%ROWTYPE;
  v_expected_secret_hash text;
  v_token_plain text;
  v_token_hash text;
  v_token_id uuid;
  v_token_prefix text;
  v_token_created_at timestamptz;
  v_token_expires_at timestamptz;
  v_poll_interval_seconds integer := 5;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT *
  INTO v_request
  FROM authz.device_approval_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'requestId', p_request_id,
      'status', 'invalid',
      'pollIntervalSeconds', v_poll_interval_seconds,
      'expiresAt', NULL
    );
  END IF;

  v_expected_secret_hash := encode(digest(COALESCE(p_request_secret, ''), 'sha256'), 'hex');

  IF v_expected_secret_hash IS DISTINCT FROM v_request.request_secret_hash THEN
    RAISE EXCEPTION 'Invalid device approval request';
  END IF;

  IF now() > v_request.expires_at THEN
    UPDATE authz.device_approval_requests
    SET status = 'expired'
    WHERE id = v_request.id
      AND status <> 'exchanged';

    RETURN jsonb_build_object(
      'requestId', v_request.id,
      'status', 'expired',
      'pollIntervalSeconds', v_poll_interval_seconds,
      'expiresAt', v_request.expires_at
    );
  END IF;

  IF v_request.status = 'pending' THEN
    RETURN jsonb_build_object(
      'requestId', v_request.id,
      'status', 'pending',
      'pollIntervalSeconds', v_poll_interval_seconds,
      'expiresAt', v_request.expires_at,
      'approvedAt', v_request.approved_at,
      'label', v_request.label
    );
  END IF;

  v_token_plain := encode(digest(v_request.id::text || ':' || p_request_secret, 'sha256'), 'hex');
  v_token_hash := encode(digest(v_token_plain, 'sha256'), 'hex');
  v_token_prefix := left(v_token_plain, 8);
  v_token_expires_at := now() + make_interval(hours => v_request.requested_token_ttl_hours);

  SELECT id, created_at
  INTO v_token_id, v_token_created_at
  FROM authz.developer_tokens
  WHERE issued_from_request_id = v_request.id
  LIMIT 1;

  IF v_token_id IS NULL THEN
    INSERT INTO authz.developer_tokens (
        lenser_id,
        label,
        token_hash,
        token_prefix,
        issued_from_request_id,
        expires_at
    ) VALUES (
        COALESCE(v_request.approved_by_lenser_id, v_request.requested_by_lenser_id, lensers.get_auth_lenser_id()),
        v_request.label,
        v_token_hash,
        v_token_prefix,
        v_request.id,
        v_token_expires_at
    )
    RETURNING id, created_at INTO v_token_id, v_token_created_at;

    UPDATE authz.device_approval_requests
    SET status = 'exchanged',
        exchanged_at = now(),
        developer_token_id = v_token_id
    WHERE id = v_request.id;
  ELSE
    UPDATE authz.device_approval_requests
    SET status = 'exchanged',
        exchanged_at = COALESCE(exchanged_at, now()),
        developer_token_id = COALESCE(developer_token_id, v_token_id)
    WHERE id = v_request.id;
  END IF;

  RETURN jsonb_build_object(
    'requestId', v_request.id,
    'status', 'approved',
    'pollIntervalSeconds', v_poll_interval_seconds,
    'expiresAt', v_token_expires_at,
    'approvedAt', v_request.approved_at,
    'tokenId', v_token_id,
    'token', v_token_plain,
    'label', v_request.label,
    'tokenPrefix', v_token_prefix,
    'createdAt', v_token_created_at
  );
END;
$$;
ALTER FUNCTION "authz"."fn_exchange_device_approval"("p_request_id" "uuid", "p_request_secret" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "authz"."fn_list_developer_tokens"() RETURNS TABLE("id" "uuid", "label" "text", "tokenPrefix" "text", "status" "text", "expiresAt" timestamp with time zone, "createdAt" timestamp with time zone, "revokedAt" timestamp with time zone, "lastUsedAt" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'authz', 'lensers', 'auth', 'public'
    AS $$
DECLARE
  v_lenser_id uuid := lensers.get_auth_lenser_id();
BEGIN
  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.label,
    t.token_prefix AS "tokenPrefix",
    CASE
      WHEN t.revoked_at IS NOT NULL THEN 'revoked'
      WHEN t.expires_at <= now() THEN 'expired'
      ELSE 'active'
    END AS status,
    t.expires_at AS "expiresAt",
    t.created_at AS "createdAt",
    t.revoked_at AS "revokedAt",
    t.last_used_at AS "lastUsedAt"
  FROM authz.developer_tokens t
  WHERE t.lenser_id = v_lenser_id
  ORDER BY t.created_at DESC;
END;
$$;
ALTER FUNCTION "authz"."fn_list_developer_tokens"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "authz"."fn_list_developer_tokens_paged"("p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0)
RETURNS SETOF jsonb
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT to_jsonb(t)
  FROM authz.fn_list_developer_tokens() t
  OFFSET GREATEST(COALESCE(p_offset, 0), 0)
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100)
$$;
ALTER FUNCTION "authz"."fn_list_developer_tokens_paged"("p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "authz"."fn_revoke_developer_token"("p_token_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'authz', 'lensers', 'auth', 'public'
    AS $$
DECLARE
  v_lenser_id uuid := lensers.get_auth_lenser_id();
  v_rows integer;
BEGIN
  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE authz.developer_tokens
  SET revoked_at = COALESCE(revoked_at, now()),
      status = 'revoked'
  WHERE id = p_token_id
    AND lenser_id = v_lenser_id
    AND revoked_at IS NULL;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RAISE EXCEPTION 'Developer token not found or already revoked';
  END IF;
END;
$$;
ALTER FUNCTION "authz"."fn_revoke_developer_token"("p_token_id" "uuid") OWNER TO "postgres";
