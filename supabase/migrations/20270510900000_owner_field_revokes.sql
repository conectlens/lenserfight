-- Phase Z10: Revoke client UPDATE privileges on ownership and counter columns.
-- Even with RLS WITH CHECK clauses, defense-in-depth: GRANT-level revocation
-- ensures PostgREST cannot expose UPDATE on these columns to anon /
-- authenticated. Service-role bypasses these privileges and continues to
-- write via SECURITY DEFINER functions and triggers.

DO $$
DECLARE
  r record;
  protected text[] := ARRAY[
    'id','user_id','lenser_id','owner_id','created_at','updated_at',
    'score','elo_rating','reputation','xp','points',
    'view_count','reply_count','vote_count','like_count','reaction_count',
    'follower_count','following_count','total_vote_count','total_tokens',
    'raw_vote_count','weighted_vote_sum',
    'moderation_state','moderation_status','approved_at','approved_by'
  ];
  col text;
BEGIN
  FOR r IN
    SELECT n.nspname AS sch, c.relname AS rel
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r'
      AND n.nspname NOT IN ('pg_catalog','information_schema','auth','storage','realtime','supabase_functions','net','vault','extensions','graphql','graphql_public','pgsodium','cron')
  LOOP
    FOREACH col IN ARRAY protected LOOP
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = r.sch AND table_name = r.rel AND column_name = col
      ) THEN
        BEGIN
          EXECUTE format('REVOKE UPDATE (%I) ON %I.%I FROM authenticated, anon',
                         col, r.sch, r.rel);
        EXCEPTION WHEN others THEN
          -- Some tables don't have direct grants to revoke; safe to ignore.
          NULL;
        END;
      END IF;
    END LOOP;
  END LOOP;
END $$;
