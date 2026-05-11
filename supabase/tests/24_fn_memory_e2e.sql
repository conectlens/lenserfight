-- =============================================================================
-- pgTAP — Phase 24: Memory RPC structural coverage
-- =============================================================================
BEGIN;

SELECT plan(7);

-- 1. agents.memories table exists
SELECT has_table(
  'agents',
  'memories',
  'agents.memories table should exist'
);

-- 2. agents.memory_profiles table exists
SELECT has_table(
  'agents',
  'memory_profiles',
  'agents.memory_profiles table should exist'
);

-- 3. fn_write_memory_entry exists
SELECT has_function(
  'public',
  'fn_write_memory_entry',
  ARRAY['uuid', 'text', 'text', 'text', 'numeric', 'timestamp with time zone', 'uuid', 'jsonb'],
  'fn_write_memory_entry should exist'
);

-- 4. fn_read_memory_entries exists
SELECT has_function(
  'public',
  'fn_read_memory_entries',
  ARRAY['uuid', 'text', 'integer', 'uuid'],
  'fn_read_memory_entries should exist'
);

-- 5. fn_write_memory_entry is SECURITY DEFINER
SELECT ok(
  (
    SELECT prosecdef
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'fn_write_memory_entry'
  ),
  'fn_write_memory_entry should be SECURITY DEFINER'
);

-- 6. fn_read_memory_entries is SECURITY DEFINER
SELECT ok(
  (
    SELECT prosecdef
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'fn_read_memory_entries'
  ),
  'fn_read_memory_entries should be SECURITY DEFINER'
);

-- 7. agents.memories.profile_id column exists
SELECT has_column(
  'agents',
  'memories',
  'profile_id',
  'agents.memories.profile_id should exist'
);

SELECT finish();
ROLLBACK;
