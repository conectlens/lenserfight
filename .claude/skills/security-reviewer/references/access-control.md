Review when scope includes RLS policies, Supabase auth, admin functions, billing, wallet, or execution.

Check:
- Is every sensitive RPC/Edge Function protected by the correct auth check?
- Are anon, authenticated, and service-role paths narrowly scoped?
- Are profile/lenser/user ownership checks enforced at the correct layer (RLS or SECURITY DEFINER)?
- Are role/permission checks explicit and composable across SQL functions?
- Can a user act on another profile/resource by changing IDs in a request?
- Are admin or service-role capabilities separated from normal user paths?
- Are cross-table privileged operations re-checked in SQL transactions?

Red flags
- RLS disabled on a table that should be protected
- authorization logic only in the React client (bypassable)
- implicit trust in caller-supplied fields like profile_id/user_id/role
- broad service_role usage without scoped justification
- missing ownership checks on read/update/delete SQL functions
- policy bypass through SECURITY DEFINER functions without explicit caller validation