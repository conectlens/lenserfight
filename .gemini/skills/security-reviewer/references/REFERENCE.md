Security review reference.

Use this method:

1. Define scope
- Which libs/features/files/flows are in scope?
- What external callers or internal actors interact with them?

2. Identify assets
- identity / Supabase auth session
- credentials/tokens (BYOK keys, provider secrets)
- profile/workspace/lenser boundaries
- billing/wallet credits
- execution permissions
- personal or sensitive data
- webhook trust

3. Identify entrypoints
- Supabase RPC functions (supabase/migrations/*.sql)
- Edge Functions (supabase/functions/*)
- React feature hooks (libs/features/*/src/**/use*.ts)
- CLI commands (apps/cli/src/commands/*)
- Supabase auth callbacks (apps/auth/)
- cron jobs (pg_cron in migrations)
- DB triggers and mutations

4. Map trust boundaries
- anon vs authenticated (Supabase RLS)
- authenticated vs privileged (service_role)
- own profile vs other profiles
- platform admin vs regular user
- client (React/CLI) vs Edge Function vs Postgres RLS

5. Review control placement
- authn via Supabase auth JWT verification
- authz via RLS policies (supabase/migrations/) and SQL SECURITY DEFINER functions
- validation in domain types (libs/domain/*) and Edge Function request parsing
- output sanitization in repository layer (libs/data/*) and API response types (libs/api/*)
- security-critical state changes in SQL transactions (supabase/migrations/*)

6. Report
For each finding include:
- severity
- affected scope
- exploit scenario
- root cause
- minimal remediation
- follow-up tests

Severity guide
- Critical: account takeover, profile escape, financial abuse, arbitrary privileged action
- High: privilege escalation, replay/double-spend, sensitive data leak, broken webhook trust
- Medium: weak validation, inconsistent RLS enforcement, noisy sensitive logs
- Low: hardening gaps, ambiguous ownership, brittle security design

Authentication, authorization, and trust boundary analysis  
Load when reviewing RLS policies, Supabase auth, or profile/workspace isolation  
See [access control checks](access-control.md)

DTO validation, request handling, and response exposure risks  
Load when reviewing Edge Functions, libs/api/*, or libs/data/*  
See [input/output validation rules](input-output.md)

Concurrency safety, data integrity, and idempotency guarantees  
Load when reviewing wallet, billing, execution, or transactional flows  
See [integrity checks](integrity.md)

Architecture security rules based on GRASP and OOAD  
Load when reviewing module design or security ownership  
See [design rules](design-rules.md)

Infrastructure and operational security  
Load when reviewing database access, providers, logging, or config  
See [operational checks](operations.md)
