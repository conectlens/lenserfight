Review when scope includes Edge Functions, libs/api/*, libs/data/*, or public API surfaces.

Check:
- Are Edge Function request bodies parsed and validated before use?
- Are enums, IDs, JSON blobs, and nested objects constrained?
- Are server-owned fields (user_id, profile_id) taken from auth context, not request body?
- Are response shapes preventing data leakage (no raw DB rows exposed)?
- Are Supabase error messages sanitized before reaching the client?
- Are logs or responses exposing secrets, internal IDs, stack traces, or policy details?

Red flags
- unbounded JSON/object inputs accepted without schema validation
- unsafe partial update patterns (caller can overwrite any field)
- direct Supabase row/error object returned as API response
- missing sanitization between DB result and client response
- validation only at the React client with no SQL-level constraint backing it
