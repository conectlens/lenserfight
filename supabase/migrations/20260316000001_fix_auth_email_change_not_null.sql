-- Fix: auth.users.email_change must be NOT NULL (GoTrue scan error)
-- GoTrue expects `email_change text NOT NULL DEFAULT ''`.
-- If the column was created without a default, NULL values cause a scan error on /token.

DO $$
BEGIN
    -- Backfill NULLs
    UPDATE auth.users SET email_change = '' WHERE email_change IS NULL;

    -- Set default
    ALTER TABLE auth.users ALTER COLUMN email_change SET DEFAULT '';

    -- Enforce NOT NULL
    ALTER TABLE auth.users ALTER COLUMN email_change SET NOT NULL;
EXCEPTION
    WHEN insufficient_privilege THEN
        -- If running as postgres (not supabase_admin), try via supabase_admin
        RAISE NOTICE 'Insufficient privilege to alter auth.users, skipping NOT NULL enforcement';
END;
$$;
