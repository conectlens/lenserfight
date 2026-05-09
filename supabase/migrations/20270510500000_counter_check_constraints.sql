-- Phase Z6: Add CHECK (col >= 0) to every counter / score column.
-- Prevents leaderboard manipulation via negative deltas and protects against
-- sync bugs that decrement past zero.
--
-- Discovery is heuristic: any integer/bigint column whose name ends in
-- _count, _score, total_*, or matches reputation/elo/rating gets the CHECK
-- (NOT VALID + VALIDATE). Idempotent.

DO $$
DECLARE
  r record;
  conname text;
BEGIN
  FOR r IN
    SELECT (c.table_schema || '.' || c.table_name) AS rel,
           c.column_name AS col
    FROM information_schema.columns c
    WHERE c.data_type IN ('integer','bigint','smallint','numeric','double precision','real')
      AND c.table_schema NOT IN ('pg_catalog','information_schema','auth','storage','realtime','supabase_functions','net','vault','extensions','graphql','graphql_public','pgsodium')
      AND (
        c.column_name LIKE '%\_count' ESCAPE '\'
        OR c.column_name LIKE '%\_score' ESCAPE '\'
        OR c.column_name LIKE 'total\_%' ESCAPE '\'
        OR c.column_name IN ('view_count','reply_count','vote_count','like_count',
                              'reaction_count','share_count','follower_count',
                              'following_count','reputation','elo_rating',
                              'raw_vote_count','weighted_vote_sum','total_tokens',
                              'total_vote_count','xp','points')
      )
  LOOP
    conname := format('ck_%s_%s_nonneg', replace(r.rel,'.','_'), r.col);
    BEGIN
      EXECUTE format(
        'ALTER TABLE %s ADD CONSTRAINT %I CHECK (%I IS NULL OR %I >= 0) NOT VALID',
        r.rel, conname, r.col, r.col
      );
      EXECUTE format('ALTER TABLE %s VALIDATE CONSTRAINT %I', r.rel, conname);
    EXCEPTION
      WHEN duplicate_object THEN NULL;
      WHEN check_violation THEN
        RAISE WARNING 'Negative values present in %.%; left NOT VALID for manual cleanup', r.rel, r.col;
      WHEN others THEN
        RAISE NOTICE 'skip nonneg check on %.%: %', r.rel, r.col, SQLERRM;
    END;
  END LOOP;
END $$;
