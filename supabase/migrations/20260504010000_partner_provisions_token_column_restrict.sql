-- Revoke the `token` column from the PostgREST-accessible grant so that
-- authenticated users cannot read raw partner credentials via the REST API.
-- The platform-api service role (bypasses RLS) is unaffected.
-- All other columns remain readable under the existing RLS SELECT policy.
REVOKE SELECT ON public.partner_provisions FROM authenticated;

GRANT SELECT (
  id,
  user_id,
  partner_name,
  external_id,
  account_id,
  token_scopes,
  starter_credits,
  metadata,
  created_at,
  updated_at
) ON public.partner_provisions TO authenticated;
