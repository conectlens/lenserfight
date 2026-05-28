-- =============================================================================
-- pgTAP — Phase 27: Wallet schema and RPC structural coverage
-- =============================================================================
BEGIN;

SELECT plan(9);

-- 1. wallet.accounts table exists
SELECT has_table(
  'wallet',
  'accounts',
  'wallet.accounts table should exist'
);

-- 2. wallet.transactions table exists
SELECT has_table(
  'wallet',
  'transactions',
  'wallet.transactions table should exist'
);

-- 3. wallet.credit_account function exists
SELECT has_function(
  'wallet',
  'credit_account',
  ARRAY['uuid', 'bigint', 'wallet.transaction_type_enum', 'text', 'uuid', 'text', 'jsonb'],
  'wallet.credit_account should exist'
);

-- 4. wallet.debit_account function exists
SELECT has_function(
  'wallet',
  'debit_account',
  ARRAY['uuid', 'bigint', 'wallet.transaction_type_enum', 'text', 'uuid', 'text', 'jsonb'],
  'wallet.debit_account should exist'
);

-- 5. wallet.get_balance function exists
SELECT has_function(
  'wallet',
  'get_balance',
  ARRAY['uuid'],
  'wallet.get_balance should exist'
);

-- 6. wallet.reserve_credits function exists
SELECT has_function(
  'wallet',
  'reserve_credits',
  ARRAY['uuid', 'bigint', 'uuid', 'text'],
  'wallet.reserve_credits should exist'
);

-- 7. wallet.credit_account is SECURITY DEFINER
SELECT ok(
  (
    SELECT prosecdef
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'wallet'
      AND p.proname = 'credit_account'
  ),
  'wallet.credit_account should be SECURITY DEFINER'
);

-- 8. wallet.debit_account is SECURITY DEFINER
SELECT ok(
  (
    SELECT prosecdef
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'wallet'
      AND p.proname = 'debit_account'
  ),
  'wallet.debit_account should be SECURITY DEFINER'
);

-- 9. authenticated role cannot call wallet.credit_account directly (service-role only)
SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'wallet.credit_account(uuid, bigint, wallet.transaction_type_enum, text, uuid, text, jsonb)',
    'EXECUTE'
  ),
  'authenticated should NOT be able to execute wallet.credit_account'
);

SELECT finish();
ROLLBACK;
