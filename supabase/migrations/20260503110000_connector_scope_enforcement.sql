-- Phase 10: Connector scope-enforcement helper
--
-- Provides `connectors.fn_assert_scope(p_granted text[], p_required text)` which
-- raises SQLSTATE 42501 (insufficient_privilege) when `p_required` is not in
-- `p_granted`. Phase 12 wires this guard into high-risk public RPCs (e.g.
-- `fn_battles_create`); Phase 10 ships only the helper plus a thin
-- `fn_connector_assert_scope` test wrapper so the integration test in
-- apps/cli-e2e can verify the contract end-to-end.
--
-- Rollback strategy
-- -----------------
-- DROP FUNCTION public.fn_connector_assert_scope(text, text[]);
-- DROP FUNCTION connectors.fn_assert_scope(text[], text);

CREATE OR REPLACE FUNCTION "connectors"."fn_assert_scope"(
    p_granted text[],
    p_required text
)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF p_required IS NULL OR p_required = '' THEN
        RETURN;
    END IF;
    IF p_granted IS NULL OR p_required <> ALL (p_granted) THEN
        RAISE EXCEPTION 'connector token missing required scope: %', p_required
              USING ERRCODE = '42501';
    END IF;
END
$$;

ALTER FUNCTION "connectors"."fn_assert_scope"(text[], text) OWNER TO postgres;

-- Test wrapper: callable from CLI / integration test to assert that the
-- scope guard rejects mismatched calls. Returns ok=true when granted.
CREATE OR REPLACE FUNCTION "public"."fn_connector_assert_scope"(
    p_required text,
    p_granted text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, connectors
AS $$
BEGIN
    PERFORM connectors.fn_assert_scope(p_granted, p_required);
    RETURN jsonb_build_object('ok', true, 'required', p_required);
END
$$;

ALTER FUNCTION "public"."fn_connector_assert_scope"(text, text[]) OWNER TO postgres;

REVOKE ALL ON FUNCTION "public"."fn_connector_assert_scope"(text, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION "public"."fn_connector_assert_scope"(text, text[]) TO authenticated, service_role;
