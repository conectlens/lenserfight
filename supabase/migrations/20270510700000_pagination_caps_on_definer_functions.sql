-- Phase Z8: Cap unbounded SECURITY DEFINER list functions.
-- Audit flagged:
--   * lenses.fn_list_versions(p_lens_id)         — RETURNS SETOF, no LIMIT
--   * ai.fn_get_my_api_keys()                    — RETURNS TABLE, no LIMIT
--   * authz.fn_list_developer_tokens()           — RETURNS TABLE, no LIMIT
--
-- We do not rewrite the function bodies here (they may be referenced by
-- views or other functions and the rewrite needs review). Instead we add a
-- thin wrapper: <fn>_paged(p_limit, p_cursor) that clamps p_limit and
-- enforces a server-side maximum. App callers should migrate to the _paged
-- variant; the original is left for backward compatibility but its
-- comment/notice flags it deprecated.
--
-- Pattern mirrors fn_get_notifications keyset pagination.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p
             JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'lenses' AND p.proname = 'fn_list_versions') THEN
    EXECUTE $f$
      CREATE OR REPLACE FUNCTION lenses.fn_list_versions_paged(
        p_lens_id uuid,
        p_limit   int  DEFAULT 50,
        p_cursor  timestamptz DEFAULT NULL
      )
      RETURNS SETOF lenses.versions
      LANGUAGE sql
      SECURITY DEFINER
      SET search_path = ''
      AS $body$
        SELECT *
        FROM lenses.versions v
        WHERE v.lens_id = p_lens_id
          AND (p_cursor IS NULL OR v.created_at < p_cursor)
        ORDER BY v.created_at DESC
        LIMIT LEAST(GREATEST(coalesce(p_limit, 50), 1), 100)
      $body$;
    $f$;
    COMMENT ON FUNCTION lenses.fn_list_versions(uuid)
      IS 'DEPRECATED: use lenses.fn_list_versions_paged(p_lens_id, p_limit, p_cursor).';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p
             JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'ai' AND p.proname = 'fn_get_my_api_keys') THEN
    -- The body is owner-scoped; we just enforce a hard cap by wrapping the
    -- existing function via a paged shim. Schema of result is dynamic, so
    -- we expose it as JSONB rows that the app can typecast.
    EXECUTE $f$
      CREATE OR REPLACE FUNCTION ai.fn_get_my_api_keys_paged(
        p_limit  int DEFAULT 50,
        p_offset int DEFAULT 0
      )
      RETURNS SETOF jsonb
      LANGUAGE sql
      SECURITY DEFINER
      SET search_path = ''
      AS $body$
        SELECT to_jsonb(t)
        FROM ai.fn_get_my_api_keys() t
        OFFSET GREATEST(coalesce(p_offset, 0), 0)
        LIMIT LEAST(GREATEST(coalesce(p_limit, 50), 1), 100)
      $body$;
    $f$;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p
             JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'authz' AND p.proname = 'fn_list_developer_tokens') THEN
    EXECUTE $f$
      CREATE OR REPLACE FUNCTION authz.fn_list_developer_tokens_paged(
        p_limit  int DEFAULT 50,
        p_offset int DEFAULT 0
      )
      RETURNS SETOF jsonb
      LANGUAGE sql
      SECURITY DEFINER
      SET search_path = ''
      AS $body$
        SELECT to_jsonb(t)
        FROM authz.fn_list_developer_tokens() t
        OFFSET GREATEST(coalesce(p_offset, 0), 0)
        LIMIT LEAST(GREATEST(coalesce(p_limit, 50), 1), 100)
      $body$;
    $f$;
  END IF;
END $$;
