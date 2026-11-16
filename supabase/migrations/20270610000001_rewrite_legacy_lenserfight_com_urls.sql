-- Move stored absolute URLs from the retired lenserfight.com domain to
-- lenserfight.win.
--
--   https://cdn.lenserfight.com/brand/...  ->  https://cdn.lenserfight.win/brand/...
--   https://moon.lenserfight.com/...       ->  https://moon.lenserfight.win/...
--
-- Scope
--   * Every text / varchar / text[] / jsonb column of the application schemas
--     (all non-system schemas) is scanned. Only values that contain a URL host
--     under lenserfight.com are rewritten, and only the host part changes.
--   * E-mail addresses (name@lenserfight.com) are never touched: the match
--     requires the host to be preceded by "//", or to be the bare cdn host.
--   * From auth, only user metadata (auth.users.raw_user_meta_data and
--     auth.identities.identity_data) is scanned, because that is where
--     provider avatar URLs live.
--   * Functions and procedures whose body hard-codes a lenserfight.com URL
--     (for example the invite-link base URL) are re-created with the new host.
--
-- Idempotent: after one run nothing matches, so a second run updates no rows.
-- Row-level user triggers are skipped (session_replication_role = replica)
-- when the role is allowed to set it, so updated_at columns and audit rows are
-- not disturbed by this bulk host rewrite.

DO $migration$
DECLARE
  -- "//host.lenserfight.com" with any number of sub-domain labels.
  c_host_pat  constant text := '(//(?:[A-Za-z0-9-]+\.)*)lenserfight\.com\M';
  c_host_rep  constant text := '\1lenserfight.win';
  -- Scheme-less cdn host stored on its own (e.g. "cdn.lenserfight.com/x.png").
  c_cdn_pat   constant text := '(^|[^@A-Za-z0-9.-])cdn\.lenserfight\.com\M';
  c_cdn_rep   constant text := '\1cdn.lenserfight.win';
  -- Cheap pre-filter for the function scan (bodies are re-checked afterwards).
  c_probe     constant text := 'lenserfight\.com';

  r           record;
  v_expr      text;
  v_rewrite   text;
  v_rows      bigint;
  v_def       text;
  v_new_def   text;
  v_fn_count  integer := 0;
  v_row_total bigint  := 0;
BEGIN
  BEGIN
    PERFORM set_config('session_replication_role', 'replica', true);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'session_replication_role not available; user triggers will fire';
  END;

  -- 1. Data columns -------------------------------------------------------
  FOR r IN
    SELECT c.table_schema AS s, c.table_name AS t, c.column_name AS col,
           c.data_type AS dt, c.udt_name AS udt
    FROM information_schema.columns c
    JOIN information_schema.tables tb
      ON tb.table_schema = c.table_schema
     AND tb.table_name   = c.table_name
     AND tb.table_type   = 'BASE TABLE'
    WHERE c.is_generated = 'NEVER'
      AND (
        c.table_schema NOT IN (
          'pg_catalog', 'information_schema', 'auth', 'storage', 'realtime',
          'extensions', 'vault', 'graphql', 'graphql_public', 'pgsodium',
          'pgsodium_masks', 'supabase_functions', 'supabase_migrations',
          'net', 'cron', 'pgbouncer', '_realtime'
        )
        OR (c.table_schema = 'auth' AND (c.table_name, c.column_name) IN (
          ('users', 'raw_user_meta_data'),
          ('identities', 'identity_data')
        ))
      )
      AND (
        c.data_type IN ('text', 'character varying', 'jsonb')
        OR (c.data_type = 'ARRAY' AND c.udt_name IN ('_text', '_varchar'))
      )
    ORDER BY c.table_schema, c.table_name, c.ordinal_position
  LOOP
    -- Build "rewrite(<value>)" for one text value.
    v_rewrite := format(
      'regexp_replace(regexp_replace(%%s, %L, %L, ''gi''), %L, %L, ''gi'')',
      c_host_pat, c_host_rep, c_cdn_pat, c_cdn_rep
    );

    IF r.dt = 'jsonb' THEN
      v_expr := format('(%s)::jsonb', format(v_rewrite, format('%I::text', r.col)));
    ELSIF r.dt = 'ARRAY' THEN
      v_expr := format(
        'ARRAY(SELECT %s FROM unnest(%I) WITH ORDINALITY AS u(e, n) ORDER BY n)::%s',
        format(v_rewrite, 'u.e'), r.col,
        CASE r.udt WHEN '_varchar' THEN 'varchar[]' ELSE 'text[]' END
      );
    ELSE
      v_expr := format(v_rewrite, format('%I', r.col));
    END IF;

    BEGIN
      EXECUTE format(
        'UPDATE %I.%I SET %I = %s WHERE %I::text ~* %L OR %I::text ~* %L',
        r.s, r.t, r.col, v_expr, r.col, c_host_pat, r.col, c_cdn_pat
      );
      GET DIAGNOSTICS v_rows = ROW_COUNT;
    EXCEPTION WHEN insufficient_privilege THEN
      -- Only reachable for the managed auth tables on restricted roles.
      RAISE WARNING 'skipped %.%.% (insufficient privilege)', r.s, r.t, r.col;
      v_rows := 0;
    END;

    IF v_rows > 0 THEN
      v_row_total := v_row_total + v_rows;
      RAISE NOTICE 'rewrote % row(s) in %.%.%', v_rows, r.s, r.t, r.col;
    END IF;
  END LOOP;

  -- 2. Functions / procedures with a hard-coded host -----------------------
  FOR r IN
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.prokind IN ('f', 'p')
      AND n.nspname NOT IN (
        'pg_catalog', 'information_schema', 'auth', 'storage', 'realtime',
        'extensions', 'vault', 'graphql', 'graphql_public', 'pgsodium',
        'pgsodium_masks', 'supabase_functions', 'supabase_migrations',
        'net', 'cron', 'pgbouncer', '_realtime'
      )
      AND NOT EXISTS (
        SELECT 1 FROM pg_depend d
        WHERE d.classid = 'pg_proc'::regclass
          AND d.objid = p.oid
          AND d.deptype = 'e'
      )
      AND p.prosrc ~* c_probe
  LOOP
    v_def := pg_get_functiondef(r.oid);
    v_new_def := regexp_replace(
      regexp_replace(v_def, c_host_pat, c_host_rep, 'gi'),
      c_cdn_pat, c_cdn_rep, 'gi'
    );
    IF v_new_def IS DISTINCT FROM v_def THEN
      EXECUTE v_new_def;
      v_fn_count := v_fn_count + 1;
      RAISE NOTICE 're-created %', r.oid::regprocedure;
    END IF;
  END LOOP;

  RAISE NOTICE 'lenserfight.com -> lenserfight.win: % row(s), % function(s)',
    v_row_total, v_fn_count;
END
$migration$;
