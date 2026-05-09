-- Phase 10: Connector RPCs
--
-- The six functions backing `lenserfight connectors {list,view,add,remove,rotate,test}`.
-- All are SECURITY DEFINER, search_path locked, and grant-restricted to authenticated.
-- Caller's active personal workspace is the implicit ownership boundary; the
-- workspace_id column on `connectors.connectors` enforces tenant isolation.
--
-- Rollback strategy
-- -----------------
-- DROP FUNCTION public.fn_connectors_list();
-- DROP FUNCTION public.fn_connector_get(text);
-- DROP FUNCTION public.fn_connector_create(text, text, text, text[]);
-- DROP FUNCTION public.fn_connector_remove(text);
-- DROP FUNCTION public.fn_connector_rotate(text);
-- DROP FUNCTION public.fn_connector_test(text);

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── helpers ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION "connectors"."fn_active_workspace_id"()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, tenancy, lensers
AS $$
    SELECT w.id
    FROM tenancy.workspaces w
    WHERE w.owner_lenser_id = lensers.get_auth_lenser_id()
      AND w.type = 'personal'
      AND w.status = 'active'
    ORDER BY w.created_at ASC
    LIMIT 1
$$;

ALTER FUNCTION "connectors"."fn_active_workspace_id"() OWNER TO postgres;

-- v1 scope allow-list — kept in sync with libs/adapters/connector/src/lib/scopes.ts
CREATE OR REPLACE FUNCTION "connectors"."fn_valid_scopes"()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT ARRAY[
        'lenses:read', 'lenses:write',
        'agents:read', 'agents:write',
        'workflows:read', 'workflows:write',
        'threads:read', 'threads:write',
        'community:read', 'community:write',
        'connectors:read', 'connectors:write'
    ]::text[]
$$;

CREATE OR REPLACE FUNCTION "connectors"."fn_assert_known_scopes"(p_scopes text[])
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_unknown text[];
BEGIN
    SELECT array_agg(s)
      INTO v_unknown
      FROM unnest(p_scopes) s
     WHERE s <> ALL ("connectors"."fn_valid_scopes"());
    IF v_unknown IS NOT NULL THEN
        RAISE EXCEPTION 'unknown scopes: %', array_to_string(v_unknown, ',')
              USING ERRCODE = '22023';
    END IF;
END
$$;

-- token hashing — sha256(token) hex-encoded
CREATE OR REPLACE FUNCTION "connectors"."fn_hash_token"(p_token text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT encode(digest(p_token, 'sha256'), 'hex')
$$;

-- ── public RPCs ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION "public"."fn_connectors_list"()
RETURNS TABLE (
    "slug" text,
    "name" text,
    "description" text,
    "scopes" text[],
    "is_active" boolean,
    "kind" text,
    "created_at" timestamptz,
    "last_used_at" timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, connectors
AS $$
    SELECT c.slug,
           c.name,
           c.description,
           COALESCE(
               (SELECT t.scopes
                  FROM connectors.connector_tokens t
                 WHERE t.connector_id = c.id
                   AND t.revoked_at IS NULL
                 ORDER BY t.created_at DESC
                 LIMIT 1),
               ARRAY[]::text[]
           ) AS scopes,
           c.is_active,
           c.kind,
           c.created_at,
           c.last_used_at
      FROM connectors.connectors c
     WHERE c.workspace_id = connectors.fn_active_workspace_id()
     ORDER BY c.created_at DESC
$$;

ALTER FUNCTION "public"."fn_connectors_list"() OWNER TO postgres;

CREATE OR REPLACE FUNCTION "public"."fn_connector_get"(p_slug text)
RETURNS TABLE (
    "slug" text,
    "name" text,
    "description" text,
    "scopes" text[],
    "is_active" boolean,
    "kind" text,
    "created_at" timestamptz,
    "last_used_at" timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, connectors
AS $$
    SELECT c.slug,
           c.name,
           c.description,
           COALESCE(
               (SELECT t.scopes
                  FROM connectors.connector_tokens t
                 WHERE t.connector_id = c.id
                   AND t.revoked_at IS NULL
                 ORDER BY t.created_at DESC
                 LIMIT 1),
               ARRAY[]::text[]
           ) AS scopes,
           c.is_active,
           c.kind,
           c.created_at,
           c.last_used_at
      FROM connectors.connectors c
     WHERE c.workspace_id = connectors.fn_active_workspace_id()
       AND c.slug = p_slug
     LIMIT 1
$$;

ALTER FUNCTION "public"."fn_connector_get"(text) OWNER TO postgres;

CREATE OR REPLACE FUNCTION "public"."fn_connector_create"(
    p_name text,
    p_slug text,
    p_description text,
    p_scopes text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, connectors
AS $$
DECLARE
    v_workspace_id uuid := connectors.fn_active_workspace_id();
    v_user_id      uuid := auth.uid();
    v_connector_id uuid;
    v_token_raw    text;
    v_token_hash   text;
    v_token_prefix text;
BEGIN
    IF v_workspace_id IS NULL THEN
        RAISE EXCEPTION 'no active workspace for caller'
              USING ERRCODE = '42501';
    END IF;

    PERFORM connectors.fn_assert_known_scopes(p_scopes);
    IF cardinality(p_scopes) = 0 THEN
        RAISE EXCEPTION 'p_scopes must be non-empty' USING ERRCODE = '22023';
    END IF;

    INSERT INTO connectors.connectors (workspace_id, slug, name, description, created_by)
    VALUES (v_workspace_id, p_slug, p_name, NULLIF(p_description, ''), v_user_id)
    RETURNING id INTO v_connector_id;

    -- 32 random bytes → ~43-char base64url; "lf_" prefix marks origin.
    v_token_raw    := 'lf_' || encode(gen_random_bytes(32), 'base64');
    v_token_raw    := replace(replace(replace(v_token_raw, '+', '-'), '/', '_'), '=', '');
    v_token_hash   := connectors.fn_hash_token(v_token_raw);
    v_token_prefix := substring(v_token_raw FROM 1 FOR 11);

    INSERT INTO connectors.connector_tokens (connector_id, token_hash, token_prefix, scopes)
    VALUES (v_connector_id, v_token_hash, v_token_prefix, p_scopes);

    RETURN jsonb_build_object(
        'slug',          p_slug,
        'name',          p_name,
        'scopes',        p_scopes,
        'service_token', v_token_raw,
        'token_prefix',  v_token_prefix
    );
END
$$;

ALTER FUNCTION "public"."fn_connector_create"(text, text, text, text[]) OWNER TO postgres;

CREATE OR REPLACE FUNCTION "public"."fn_connector_remove"(p_slug text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, connectors
AS $$
DECLARE
    v_connector_id uuid;
BEGIN
    SELECT c.id INTO v_connector_id
      FROM connectors.connectors c
     WHERE c.workspace_id = connectors.fn_active_workspace_id()
       AND c.slug = p_slug;

    IF v_connector_id IS NULL THEN
        RAISE EXCEPTION 'connector not found: %', p_slug USING ERRCODE = 'P0002';
    END IF;

    UPDATE connectors.connectors
       SET is_active = false
     WHERE id = v_connector_id;

    UPDATE connectors.connector_tokens
       SET revoked_at = now()
     WHERE connector_id = v_connector_id
       AND revoked_at IS NULL;
END
$$;

ALTER FUNCTION "public"."fn_connector_remove"(text) OWNER TO postgres;

CREATE OR REPLACE FUNCTION "public"."fn_connector_rotate"(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, connectors
AS $$
DECLARE
    v_connector_id uuid;
    v_scopes       text[];
    v_token_raw    text;
    v_token_hash   text;
    v_token_prefix text;
BEGIN
    SELECT c.id INTO v_connector_id
      FROM connectors.connectors c
     WHERE c.workspace_id = connectors.fn_active_workspace_id()
       AND c.slug = p_slug
       AND c.is_active = true;

    IF v_connector_id IS NULL THEN
        RAISE EXCEPTION 'connector not found or inactive: %', p_slug USING ERRCODE = 'P0002';
    END IF;

    SELECT t.scopes INTO v_scopes
      FROM connectors.connector_tokens t
     WHERE t.connector_id = v_connector_id
       AND t.revoked_at IS NULL
     ORDER BY t.created_at DESC
     LIMIT 1;

    IF v_scopes IS NULL THEN
        RAISE EXCEPTION 'no active token to rotate for connector: %', p_slug USING ERRCODE = 'P0002';
    END IF;

    UPDATE connectors.connector_tokens
       SET revoked_at = now()
     WHERE connector_id = v_connector_id
       AND revoked_at IS NULL;

    v_token_raw    := 'lf_' || encode(gen_random_bytes(32), 'base64');
    v_token_raw    := replace(replace(replace(v_token_raw, '+', '-'), '/', '_'), '=', '');
    v_token_hash   := connectors.fn_hash_token(v_token_raw);
    v_token_prefix := substring(v_token_raw FROM 1 FOR 11);

    INSERT INTO connectors.connector_tokens (connector_id, token_hash, token_prefix, scopes)
    VALUES (v_connector_id, v_token_hash, v_token_prefix, v_scopes);

    RETURN jsonb_build_object(
        'slug',          p_slug,
        'service_token', v_token_raw,
        'token_prefix',  v_token_prefix
    );
END
$$;

ALTER FUNCTION "public"."fn_connector_rotate"(text) OWNER TO postgres;

CREATE OR REPLACE FUNCTION "public"."fn_connector_test"(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, connectors
AS $$
DECLARE
    v_connector_id uuid;
    v_scopes       text[];
    v_started_at   timestamptz := clock_timestamp();
BEGIN
    SELECT c.id INTO v_connector_id
      FROM connectors.connectors c
     WHERE c.workspace_id = connectors.fn_active_workspace_id()
       AND c.slug = p_slug
       AND c.is_active = true;

    IF v_connector_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'latency_ms', 0, 'scopes', '[]'::jsonb);
    END IF;

    SELECT t.scopes INTO v_scopes
      FROM connectors.connector_tokens t
     WHERE t.connector_id = v_connector_id
       AND t.revoked_at IS NULL
     ORDER BY t.created_at DESC
     LIMIT 1;

    UPDATE connectors.connectors
       SET last_used_at = now()
     WHERE id = v_connector_id;

    RETURN jsonb_build_object(
        'ok',         v_scopes IS NOT NULL,
        'latency_ms', EXTRACT(MILLISECOND FROM clock_timestamp() - v_started_at)::int,
        'scopes',     COALESCE(v_scopes, ARRAY[]::text[])
    );
END
$$;

ALTER FUNCTION "public"."fn_connector_test"(text) OWNER TO postgres;

-- ── grants ─────────────────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION "public"."fn_connectors_list"() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION "public"."fn_connector_get"(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION "public"."fn_connector_create"(text, text, text, text[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION "public"."fn_connector_remove"(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION "public"."fn_connector_rotate"(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION "public"."fn_connector_test"(text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION "public"."fn_connectors_list"() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION "public"."fn_connector_get"(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION "public"."fn_connector_create"(text, text, text, text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION "public"."fn_connector_remove"(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION "public"."fn_connector_rotate"(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION "public"."fn_connector_test"(text) TO authenticated, service_role;
