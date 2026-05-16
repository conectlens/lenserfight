Review when scope touches Supabase (DB/RLS/functions), external providers, logs, or config.

Check:
- Are secrets/config values handled safely? (BYOK keys, provider API keys, .env)
- Are logs sanitized? (no tokens, no user PII in plaintext)
- Are DB constraints backing critical invariants?
- Are Supabase SECURITY DEFINER functions scoped correctly?
- Are provider adapters validating signatures, timestamps, and expected identities?
- Are error mappings leaking implementation details?
- Are timeout/retry behaviors safe for state-changing operations?

Red flags
- trust in unsigned callbacks/webhooks
- shared idempotency namespaces across profiles/users
- sensitive config echoed in logs/errors
- missing DB constraints for uniqueness/ownership-critical relations
- retry on non-idempotent operations without safeguards
- service_role key used client-side
