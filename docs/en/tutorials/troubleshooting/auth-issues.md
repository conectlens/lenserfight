---
title: Auth Issues
description: Diagnose and fix authentication failures — login loops, JWT errors, OAuth failures, and permission issues.
head:
  - - meta
    - name: og:title
      content: Auth Issues — LenserFight Troubleshooting
  - - meta
    - name: og:description
      content: Fix authentication failures, login loops, JWT errors, and permission issues.
---

# Auth Issues

Diagnosis and resolution guide for authentication and authorization problems.

---

## Login redirect loop

### Symptoms
- Browser redirects between web app and auth app infinitely
- URL alternates between `localhost:3000` and `localhost:3004`

### Root cause
Auth URL mismatch between the web app and auth app configuration.

### Diagnosis
1. Check `AUTH_BASE_URL` in `.env.local`
2. Verify the auth app is running on the expected port
3. Check browser cookies/localStorage for stale tokens

### Fixes
1. Ensure `AUTH_BASE_URL=http://localhost:3004` matches the running auth app
2. Clear browser storage: DevTools → Application → Clear site data
3. Restart both web and auth apps

### Prevention
- Keep `.env.local` in sync when changing ports
- Use `pnpm nx run-many -t serve -p web,auth` to start both together

---

## JWT expired / invalid token

### Symptoms
- `401 Unauthorized` on API calls
- `JWT expired` error in console
- User unexpectedly signed out

### Root cause
Access token expired and refresh failed, or token was corrupted.

### Diagnosis
1. Open DevTools → Application → Local Storage
2. Find `sb-*-auth-token`
3. Decode the `access_token` at [jwt.io](https://jwt.io)
4. Check the `exp` field

### Fixes
1. **Clear and re-login:**
   ```
   DevTools → Application → Local Storage → Clear
   ```
   Then navigate to the login page.

2. **Check Supabase status:**
   ```bash
   pnpm supabase status
   ```

3. **Verify time sync** — JWT validation fails if server and client clocks differ significantly

### Prevention
- The Supabase client auto-refreshes tokens; ensure the `onAuthStateChange` listener is connected
- Set reasonable token expiry in `supabase/config.toml`

---

## OAuth callback failures

### Symptoms
- After clicking "Sign in with Google/GitHub," the page shows an error
- Redirect URI mismatch error from the OAuth provider

### Root cause
The OAuth app's redirect URI does not match the Supabase callback URL.

### Diagnosis
1. Check the error message from the OAuth provider
2. Verify redirect URIs in:
   - Google Cloud Console / GitHub Developer Settings
   - `supabase/config.toml` (`auth.external.*` section)

### Fixes
1. **Local development redirect URI:**
   ```
   http://127.0.0.1:54321/auth/v1/callback
   ```

2. **Production redirect URI:**
   ```
   https://your-supabase-project.supabase.co/auth/v1/callback
   ```

3. Ensure the OAuth app status is not "testing" (Google limits test apps to 100 users)

### Prevention
- Document redirect URIs in your project setup guide
- Test OAuth flows after every Supabase URL change

---

## Permission denied (RLS)

### Symptoms
- Queries return empty arrays when data exists
- `42501` PostgreSQL error code
- `permission denied for table` errors

### Root cause
Row-Level Security policies block the current user from accessing the data.

### Diagnosis
```sql
-- Check current user
SELECT auth.uid();

-- Check policies on the table
SELECT * FROM pg_policies WHERE tablename = 'your_table';

-- Test with service role (bypasses RLS)
-- Use Supabase Studio or psql with the service role connection string
```

### Fixes
1. **Verify the user owns the data** — check `owner_id` or `user_id` columns
2. **Check workspace membership** — user may not be in the required workspace
3. **Review RLS policies** — ensure the `USING` clause covers your use case
4. **Use service role for debugging** — temporarily test with the service role key

### Prevention
- Write RLS policies with test cases
- Use `supabase test db` to validate policies against test data

---

## API key issues

### Symptoms
- `Invalid API key` error
- `apikey` header missing
- `PGRST301` (JWT required)

### Root cause
Wrong or missing Supabase anon key in the environment configuration.

### Fixes
1. Run `pnpm supabase status` and copy the `anon key`
2. Update `SUPABASE_ANON_KEY` in `.env.local`
3. Restart the dev server

### Prevention
- After `pnpm supabase stop && pnpm supabase start`, the keys may change
- Script the key extraction: `pnpm supabase status | grep anon`

---

## Next steps

- [Database Issues](/en/tutorials/troubleshooting/database-issues)
- [Build Failures](/en/tutorials/troubleshooting/build-failures)
- [Local Authentication](/en/tutorials/local/authentication)
