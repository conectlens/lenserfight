# Reference

Check:
- RLS enabled on every user-facing table
- SELECT/INSERT/UPDATE/DELETE symmetry where intended
- `auth.uid()` and ownership semantics
- admin/service-role boundaries
- exposed schemas and grants
- view leakage through underlying tables
- `security definer` vs `security invoker`
- search_path hardening
- function execute grants
- accidental public access to internal analytics/admin objects

Output must include:
1. object reviewed
2. actor affected
3. exact risk
4. severity
5. recommended SQL change