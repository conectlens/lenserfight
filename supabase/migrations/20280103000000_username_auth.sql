-- ============================================================
-- Username Authentication: handle → email resolution
-- ============================================================
-- Enables login via @handle / username in addition to email.
-- Supabase Auth requires an email to call signInWithPassword,
-- so this function resolves a stored profile handle to the
-- associated auth email — server-side and with least privilege.
--
-- Security notes
-- ──────────────
-- • SECURITY DEFINER so the function can read auth.users, which
--   is inaccessible to the anon/authenticated roles directly.
-- • Returns NULL for any unknown, deleted, or non-human handle
--   rather than raising an exception, so callers cannot use the
--   error shape to distinguish "handle not found" from "wrong
--   password" (account enumeration resistance).
-- • The returned email must NOT be displayed back to the user.
--   Callers should use it only as the email argument to
--   supabase.auth.signInWithPassword and surface a generic
--   "Invalid login credentials" on failure.
-- • Rate-limiting is enforced by Supabase Auth's built-in
--   per-IP and per-user throttling on signInWithPassword.
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_resolve_handle_to_email(
  p_handle text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, lensers
AS $$
DECLARE
  v_normalized text;
  v_user_id    uuid;
  v_email      text;
BEGIN
  -- 1. Normalise: strip leading @, trim whitespace, fold to lowercase
  v_normalized := lower(trim(regexp_replace(p_handle, '^@+', '')));

  -- 2. Reject inputs that cannot possibly be a stored handle
  --    (stored format: ^[a-z0-9._]{4,24}$)
  IF v_normalized !~ '^[a-z0-9._]{4,24}$' THEN
    RETURN NULL;
  END IF;

  -- 3. Look up the lenser profile — human accounts only, not deleted
  SELECT user_id
    INTO v_user_id
    FROM lensers.profiles
   WHERE handle = v_normalized
     AND type   = 'human'
     AND status NOT IN ('deleted'::lenser_status, 'pending_deletion'::lenser_status)
   LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- 4. Fetch the email from auth.users
  SELECT email
    INTO v_email
    FROM auth.users
   WHERE id         = v_user_id
     AND deleted_at IS NULL
   LIMIT 1;

  -- Returns NULL when auth record is gone (orphaned profile)
  RETURN v_email;
END;
$$;

-- Least-privilege grants: anon is required because the caller
-- is not yet authenticated at login time.
REVOKE ALL ON FUNCTION public.fn_resolve_handle_to_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_resolve_handle_to_email(text) TO anon;
GRANT EXECUTE ON FUNCTION public.fn_resolve_handle_to_email(text) TO authenticated;

COMMENT ON FUNCTION public.fn_resolve_handle_to_email IS
  'Resolves a profile handle (username) to the associated auth.users email. '
  'Used exclusively by login flows to support handle+password authentication. '
  'Returns NULL for missing, deleted, or non-human handles. '
  'SECURITY: never surface the return value or its NULL state to end users; '
  'always return a generic "Invalid login credentials" error to callers.';
