---
title: Environment Secrets and Security Boundaries
description: Keep server-only secrets out of client bundles — understand the LenserFight client/server env boundary, what goes where, and how to audit your configuration.
head:
  - - meta
    - name: og:title
      content: Environment Secrets Security — LenserFight Advanced
  - - meta
    - name: og:description
      content: Learn which secrets are safe in client bundles and which must stay server-only in LenserFight.
---

# Environment Secrets and Security Boundaries

## Goal

Understand the client/server environment boundary in LenserFight, correctly place secrets in the right `.env` file, and verify that no server-only secrets are leaking into the browser bundle.

---

## Prerequisites

- [Local Installation](/en/tutorials/local/installation) completed
- `.env.local` and `apps/web/.env.local` set up

---

## Expected Result

- `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are never included in any client-side bundle
- `VITE_` prefixed variables are intentionally public and known to you
- You can audit your own setup using the built-in tools

---

## The Two-Environment Model

LenserFight runs across two distinct runtime environments with different trust levels:

| Environment | Examples | Who can read it |
|---|---|---|
| **Server / CLI / Worker** | Node.js, Cloudflare Workers, Supabase Edge Functions, the `lf` CLI | Backend processes only |
| **Browser (client)** | `apps/web`, `apps/arena`, `apps/auth` — compiled by Vite | Anyone with DevTools |

**The fundamental rule**: anything in the browser bundle is public. API keys, service role tokens, and database passwords must never reach the client.

---

## How Vite Enforces the Boundary

Vite (used by all browser apps in this monorepo) only exposes environment variables to the browser if they are explicitly prefixed with `VITE_`.

Any variable **without** the `VITE_` prefix is stripped from the client build. This is not optional — Vite enforces it at build time.

```
# .env.local in apps/web/

VITE_SUPABASE_URL=http://127.0.0.1:54321       # ✅ Browser-safe — public URL
VITE_SUPABASE_ANON_KEY=eyJhbGci...             # ✅ Browser-safe — anon key is designed to be public
VITE_APP_ENV=development                        # ✅ Browser-safe — non-sensitive

SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...          # ✅ Server-only — Vite strips this
SUPABASE_URL=http://127.0.0.1:54321            # ✅ Server-only — stripped (no VITE_ prefix)
```

---

## The Anon Key is Public by Design

The Supabase anon key is **not a secret**. It is a JWT with a fixed `role: "anon"` claim that PostgREST uses to identify unauthenticated requests. Its security model is Row-Level Security, not key secrecy.

It is safe to:
- Commit `VITE_SUPABASE_ANON_KEY` to your `.env.example`
- Expose it in the browser bundle
- Log it in development

It is not safe to:
- Use the anon key on the server to bypass RLS (use the service role key for that, server-side only)

---

## Variable Placement Reference

Use this table to decide which file a variable belongs in:

| Variable | Server-only? | Lives in |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Root `.env.local` only |
| `SUPABASE_URL` | **Yes** (server builds) | Root `.env.local` |
| `VITE_SUPABASE_URL` | No — browser safe | `apps/web/.env.local` |
| `VITE_SUPABASE_ANON_KEY` | No — browser safe | `apps/web/.env.local` |
| `LENSERFIGHT_API_KEY` | **Yes** | Root `.env.local` only |
| `CHAINABIT_PARTNER_API_KEY` | **Yes** | Root `.env.local` only |
| `LENSERFIGHT_KEYS_PASSPHRASE` | **Yes** | Root `.env.local` only |
| `LF_GATEWAY_BIND` | **Yes** (gateway daemon) | Root `.env.local` only |
| `GEMINI_API_KEY` | **Yes** | Root `.env.local` only |
| `VITE_CAPTCHA_SITE_KEY` | No — browser safe | `apps/web/.env.local` |
| `VITE_POSTHOG_PROJECT_TOKEN` | No — browser safe | `apps/web/.env.local` |

---

## Steps

### 1. Map your variables to the correct files

For a new variable, ask three questions:

1. **Does this variable contain a credential or token that grants server access?** → Server-only. Put it in root `.env.local`.
2. **Is this variable needed at build time in the browser app?** → Prefix with `VITE_` and put it in `apps/web/.env.local`.
3. **Is this variable needed only by the CLI or worker?** → Root `.env.local` or the app's own `.env.local`.

---

### 2. Verify the build does not leak server-only variables

After any `.env` change, inspect the built bundle:

```bash
# Build the web app
pnpm nx run web:build

# Search the output for known secret values
grep -r "your-service-role-key-prefix" dist/apps/web/
```

If `grep` finds a match in `dist/apps/web/`, the secret was included in the client bundle. This is a build configuration error.

More comprehensive audit:

```bash
# Check for any Supabase service role JWT structure in the bundle
grep -r "service_role" dist/apps/web/ 2>/dev/null | grep -v ".map"
```

The service role JWT contains the literal string `"role":"service_role"` — if that appears in any `dist/apps/web/*.js` file, a secret leaked.

---

### 3. Audit your `.env.example` files

The `.env.example` files are committed to the repository. They must contain only placeholder values — never real credentials.

Check the examples:

```bash
# Ensure no real keys are in example files
cat .env.example | grep -v "^#" | grep "KEY\|SECRET\|PASSWORD\|TOKEN"
```

Each sensitive-looking value should be a placeholder like `your-service-role-key-here` or be left empty.

---

### 4. Use `lf security` for a runtime audit

The CLI includes a security audit command:

```bash
lf security audit
```

This checks:
- Whether the CLI's active config uses the service role key where the anon key should be
- Whether any `.env` files in the current project expose known high-risk patterns
- Key store encryption status

---

### 5. Supabase Edge Functions

Edge Functions are server-side (run on Deno in Supabase's infrastructure). They can safely read secrets from Supabase's encrypted secret store:

```bash
# Set a secret for an Edge Function
pnpm supabase secrets set MY_API_KEY=sk-real-key-here

# List secrets (values masked)
pnpm supabase secrets list
```

Do **not** hardcode API keys in Edge Function source files. Source files are committed to the repository — only the secrets store is encrypted and access-controlled.

For local development, Edge Functions read from `supabase/functions/.env` (gitignored):

```bash
# supabase/functions/.env
MY_API_KEY=sk-dev-key-for-local-only
```

---

## Common Issues

### Issue: A new environment variable is `undefined` in the web app

**Cause**: The variable was added to root `.env.local` without a `VITE_` prefix.

**Fix**: Add a `VITE_`-prefixed version to `apps/web/.env.local`:

```bash
# apps/web/.env.local
VITE_MY_NEW_VAR=value
```

Then access it in code as `import.meta.env.VITE_MY_NEW_VAR`.

---

### Issue: A secret appears in the browser bundle

**Cause**: The variable was accidentally given a `VITE_` prefix, or was imported into a shared module used by both server and client code.

**Fix**:
1. Remove the `VITE_` prefix from the variable in `apps/web/.env.local`.
2. Audit any `import.meta.env.VITE_*` references that reference secrets.
3. Move secret access to server-only code paths (Edge Functions, Worker, Node.js scripts).

---

### Issue: `SUPABASE_SERVICE_ROLE_KEY` used client-side to bypass RLS

**Cause**: A developer used the service role key in a React component or frontend module to work around a missing RLS policy.

**Why this is critical**: Using the service role key client-side exposes it to any user who opens DevTools. It grants full database access to anyone who finds it.

**Fix**:
1. Remove the service role key from all client-side code immediately.
2. Write a proper RLS policy for the data access pattern that was being bypassed.
3. If the operation truly requires elevated permissions, move it to a Supabase Edge Function with the service role key set as a Supabase secret.

---

### Issue: CLI fails with `missing required env var`

**Cause**: A required variable for the CLI is not set in the environment the CLI is invoked from.

**Fix**:
```bash
# Check what the CLI sees
lf env

# Load your .env.local into the shell session
set -a && source .env.local && set +a
lf <command>
```

---

## Security Checklist

Before opening a PR that changes environment configuration:

- [ ] No real credentials in `.env.example` files
- [ ] All new `VITE_` variables are genuinely non-sensitive
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is not in any `apps/web/` env file
- [ ] Any secret used in an Edge Function is set via `pnpm supabase secrets set`, not hardcoded in source
- [ ] `dist/apps/web/` bundle does not contain any credential strings
- [ ] `lf security audit` passes

---

## Related Docs

- [Environment Variables Reference](/en/reference/platform-api/environment-variables)
- [Worker Environment Variables](/en/reference/worker/environment-variables)
- [Security Policy](/en/how-to/contributors/security)
- [Local Keys and the Trust Gateway](/en/explanation/security/local-keys)

## Next Steps

- [Debugging the CLI](/en/tutorials/advanced/debugging-the-cli) — diagnose runtime errors after confirming environment is correct
- [Writing Tests for a Feature](/en/tutorials/advanced/writing-tests-for-a-feature) — validate your changes before opening a PR
