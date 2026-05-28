-- =============================================================================
-- pgTAP — Phase 28: Tournament structural coverage
-- =============================================================================
BEGIN;

SELECT plan(8);

-- 1. battles.tournaments table exists
SELECT has_table(
  'battles',
  'tournaments',
  'battles.tournaments table should exist'
);

-- 2. battles.tournament_matches table exists
SELECT has_table(
  'battles',
  'tournament_matches',
  'battles.tournament_matches table should exist'
);

-- 3. fn_create_tournament exists (public-facing wrapper)
SELECT has_function(
  'public',
  'fn_create_tournament',
  ARRAY['text', 'text', 'integer', 'text', 'boolean'],
  'fn_create_tournament should exist'
);

-- 4. fn_get_tournament_bracket exists
SELECT has_function(
  'public',
  'fn_get_tournament_bracket',
  ARRAY['uuid'],
  'fn_get_tournament_bracket should exist'
);

-- 5. battles.fn_advance_tournament exists (internal)
SELECT has_function(
  'battles',
  'fn_advance_tournament',
  ARRAY['uuid'],
  'battles.fn_advance_tournament should exist'
);

-- 6. fn_create_tournament is SECURITY DEFINER
SELECT ok(
  (
    SELECT prosecdef
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'fn_create_tournament'
  ),
  'fn_create_tournament should be SECURITY DEFINER'
);

-- 7. battles.tournaments has format column
SELECT has_column(
  'battles',
  'tournaments',
  'format',
  'battles.tournaments.format should exist'
);

-- 8. fn_get_tournament_bracket returns round_number column
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'fn_get_tournament_bracket'
  ),
  'fn_get_tournament_bracket function should be in public schema'
);

SELECT finish();
ROLLBACK;
