Schema review method.

Inspect:

- supabase/migrations/* (ordered by filename timestamp)
- supabase/functions/* (Edge Functions with SQL logic)
- supabase/tests/* (pgTAP test assertions)

Verify:

- tables represent domain models clearly
- constraints enforce business rules
- migrations maintain compatibility
- schema changes are safe for production
- RLS policies are correct for each table

Report:

- issue
- affected schema objects
- impact
- suggested correction
