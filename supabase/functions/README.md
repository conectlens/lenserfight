# Supabase Edge Functions — Developer Guide

All edge functions live under `supabase/functions/`. They run in the **Deno** runtime inside the local Supabase Docker stack when developing locally, and on Supabase's infrastructure in production.

---

## Table of contents

1. [Functions in this repo](#functions-in-this-repo)
2. [Local development setup](#local-development-setup)
3. [Common error: "name resolution failed"](#common-error-name-resolution-failed)
4. [Environment variables and secrets](#environment-variables-and-secrets)
5. [BYOK dev resolver — enabling fn_get_my_key_secret locally](#byok-dev-resolver)
6. [Deploying to production](#deploying-to-production)
7. [Testing a function manually](#testing-a-function-manually)
8. [CORS and the allowed-origin whitelist](#cors-and-the-allowed-origin-whitelist)
9. [Shared code (_shared/)](#shared-code)

---

## Functions in this repo

| Function | Path | Purpose |
|---|---|---|
| `execute-stream` | `execute-stream/` | SSE streaming for text generation (BYOK cloud + Chainabit credit) |
| `trigger-execution` | `trigger-execution/` | Generative media (image / video / audio) dispatch |
| `ai-judge-battle` | `ai-judge-battle/` | AI judge scoring for battle runs |
| `poll-async-executions` | `poll-async-executions/` | Polls external provider task IDs for async media jobs |
| `generate-battle-og-image` | `generate-battle-og-image/` | OG image generation for battle share links |
| `score-vote-risk` | `score-vote-risk/` | Vote manipulation detection |
| `send-battle-result-email` | `send-battle-result-email/` | Transactional battle result emails |
| `chainabit-oauth-callback` | `chainabit-oauth-callback/` | Chainabit OAuth 2.0 callback handler |
| `chainabit-webhook` | `chainabit-webhook/` | Incoming Chainabit webhooks |
| `partner-balance` | `partner-balance/` | Proxy: Chainabit account balance |
| `partner-models` | `partner-models/` | Proxy: available models from Chainabit |
| `partner-provision` | `partner-provision/` | Provision a Chainabit developer account |
| `partner-refresh-token` | `partner-refresh-token/` | OAuth token refresh |
| `partner-revoke` | `partner-revoke/` | Revoke Chainabit OAuth token |
| `partner-send-claim` | `partner-send-claim/` | Send a Chainabit credit claim |
| `test-provider` | `test-provider/` | One-shot provider key validation |

---

## Local development setup

### 1. Start the Supabase stack

```sh
pnpm supabase start
```

After it starts, note the printed keys — you need them in the next step.

### 2. Create `supabase/functions/.env`

This file is loaded automatically by `supabase functions serve`. It is gitignored.

```sh
# supabase/functions/.env
#
# DO NOT put SUPABASE_URL, SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY here.
# The CLI rejects any var starting with SUPABASE_ and injects those automatically
# from the running local stack. Adding them causes a warning and they are skipped.

# Chainabit local instance (only needed if testing Chainabit-funded paths):
CHAINABIT_API_URL=http://host.docker.internal:4000

# CORS allowlist — browser origins permitted to call these functions:
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4200,http://localhost:5173,http://127.0.0.1:5173
```

> **Why `host.docker.internal` and not `localhost`?**
> Edge functions run inside a Docker container. `localhost` inside that container points to the container itself, not your machine. `host.docker.internal` is the Docker-provided DNS name that always resolves to the host — see [the next section](#common-error-name-resolution-failed).

### 3. Serve functions locally

```sh
pnpm supabase functions serve
```

This starts all functions on `http://127.0.0.1:54321/functions/v1/<name>`.

To serve only one function:

```sh
pnpm supabase functions serve execute-stream
```

### 4. Call a function

```sh
curl -i -X POST http://127.0.0.1:54321/functions/v1/execute-stream \
  -H "Authorization: Bearer <anon or user JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello"}],
    "funding_source": "user_byok_cloud",
    "key_ref_id": "<ai.keys UUID>"
  }'
```

---

## Common error: "name resolution failed"

```json
{ "message": "name resolution failed" }
```

This error means the edge function container tried to resolve a hostname (e.g. `api.openai.com`, `127.0.0.1`, `localhost`) and DNS failed inside Docker.

### Root cause

`supabase functions serve` runs Deno inside a Docker container. The container has its own network namespace:

- `localhost` / `127.0.0.1` inside the container → **the container itself**, not your machine.
- External hostnames like `api.openai.com` → **only reachable if Docker has outbound internet access**.

### Fix 1 — Missing `supabase/functions/.env` file

The functions directory must have a `.env` file, even if it only contains non-`SUPABASE_*` vars. Without it, `CHAINABIT_API_URL` is undefined and the function tries to fetch from `undefined` → DNS failure.

Create `supabase/functions/.env` as shown in [step 2 above](#2-create-supabasefunctionsenv). The Supabase CLI injects `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` automatically — do not add them to `.env` (the CLI skips any var starting with `SUPABASE_` with a warning).

### Fix 2 — External API URLs pointing to localhost (Chainabit local dev)

If you run Chainabit locally at `http://localhost:4000` and set `CHAINABIT_API_URL=http://localhost:4000`, the container can't reach it.

**Change to:**
```sh
CHAINABIT_API_URL=http://host.docker.internal:4000
```

### Fix 3 — "Invalid JWT" / ES256 key type error

```
TypeError: Key for the ES256 algorithm must be of type CryptoKey. Received an instance of Uint8Array
{"msg":"Invalid JWT"}
```

Newer Supabase CLI versions sign JWTs with asymmetric ES256 keys, but the edge runtime gateway receives the raw HS256 secret bytes — causing a type mismatch. The correct fix is `verify_jwt = false` per function in `config.toml`, which disables the redundant gateway-level check. This is safe because every function already calls `auth.getUser()` internally, which hits the Auth API for the real JWT verification.

`supabase/config.toml` already has these entries for all functions in this repo:

```toml
[functions.execute-stream]
verify_jwt = false

[functions.trigger-execution]
verify_jwt = false
# ... (all other functions)
```

After this change is present, restart and serve:

```sh
pnpm supabase stop && pnpm supabase start
pnpm supabase functions serve --env-file supabase/functions/.env
```

### Fix 4 — No internet access from Docker

On some corporate networks or VPNs, Docker containers can't reach the internet. Check:

```sh
docker run --rm alpine nslookup api.openai.com
```

If that fails, your Docker networking is blocked by a firewall or VPN. Fix the Docker network config or test from a machine with internet access.

### Fix 4 — Wrong port

The local Supabase API listens on `54321`, not `5432` (that's the Postgres port). Double-check:

```sh
pnpm supabase status
```

---

## Environment variables and secrets

### Local: `supabase/functions/.env`

Loaded automatically by `supabase functions serve`. Never commit this file — it is in `.gitignore`.

```sh
SUPABASE_URL=http://host.docker.internal:54321
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
CHAINABIT_API_URL=http://host.docker.internal:4000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Production: Supabase secrets

```sh
# Set a secret
pnpm supabase secrets set CHAINABIT_API_URL=https://api.chainabit.com

# Set multiple at once from a file
pnpm supabase secrets set --env-file ./supabase/functions/.env.production

# List current secrets (values are masked)
pnpm supabase secrets list
```

Supabase automatically injects `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in production — do not set those manually.

---

## BYOK dev resolver

`fn_get_my_key_secret` is a SQL function that lets local dev tooling read a user's BYOK key without going through the full Vault path. It is **disabled by default** to prevent key exfiltration if the function is accidentally reached in staging or preview environments.

### Enable it on your local DB

```sh
pnpm supabase:enable-byok-resolver
```

This runs `scripts/enable-byok-dev-resolver.sh`, which reads `project_id` from `supabase/config.toml` and connects to the correct container — no hardcoded names.

**This setting persists across `supabase stop` / `supabase start` restarts** because it is stored in the database itself. After `supabase db reset` (which drops and recreates the DB), re-run it.

### Verify it is active

```sh
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  -c "SHOW \"app.allow_dev_byok_resolver\";"
# Expected output: true
```

### How it works

The function reads the GUC setting `app.allow_dev_byok_resolver`. If it is not `'true'`, the function raises `insufficient_privilege` (SQLSTATE `42501`). This gate is enforced inside Postgres — there is no client-side bypass.

---

## Deploying to production

### Deploy a single function

```sh
pnpm supabase functions deploy execute-stream
```

### Deploy all functions

```sh
pnpm supabase functions deploy
```

### Deploy without JWT verification (not recommended for user-facing endpoints)

```sh
pnpm supabase functions deploy execute-stream --no-verify-jwt
```

### Check deploy status

```sh
pnpm supabase functions list
```

### Full deploy sequence (safe)

```sh
# 1. Make sure local tests pass
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  -f supabase/tests/17_byok_security.sql

# 2. Apply any pending migrations to production
pnpm supabase db push

# 3. Set any new secrets
pnpm supabase secrets set ALLOWED_ORIGINS=https://lenserfight.com,https://app.lenserfight.com

# 4. Deploy
pnpm supabase functions deploy
```

---

## Testing a function manually

### execute-stream (BYOK cloud path)

```sh
JWT="<your user JWT from browser devtools>"
KEY_ID="<UUID from ai.keys table>"

curl -N -X POST http://127.0.0.1:54321/functions/v1/execute-stream \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d "{
    \"provider\": \"anthropic\",
    \"model\": \"claude-haiku-4-5-20251001\",
    \"messages\": [{\"role\": \"user\", \"content\": \"Say hello\"}],
    \"funding_source\": \"user_byok_cloud\",
    \"key_ref_id\": \"$KEY_ID\"
  }"
```

The `-N` flag disables curl's output buffering so you see SSE tokens as they arrive.

### trigger-execution (media generation)

```sh
curl -X POST http://127.0.0.1:54321/functions/v1/trigger-execution \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d "{
    \"model_id\": \"dall-e-3\",
    \"funding_source\": \"user_byok_cloud\",
    \"byok_key_ref_id\": \"$KEY_ID\",
    \"generative_media_params\": {
      \"output_modality\": \"image\",
      \"prompt\": \"A futuristic robot in a neon city\"
    },
    \"input_snapshot\": {}
  }"
```

### Get a JWT for local testing

```sh
# Via Supabase Auth API with a test user
curl -X POST http://127.0.0.1:54321/auth/v1/token?grant_type=password \
  -H "apikey: <anon key>" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "testpassword"}'
```

---

## CORS and the allowed-origin whitelist

`supabase/functions/_shared/cors.ts` controls which browser origins can call the functions. The default allowlist:

```
http://localhost:3000
http://localhost:4200
http://localhost:5173
http://127.0.0.1:5173
https://lenserfight.com
https://www.lenserfight.com
https://app.lenserfight.com
```

To extend it for a preview deployment or staging domain, set the `ALLOWED_ORIGINS` secret:

```sh
pnpm supabase secrets set ALLOWED_ORIGINS=https://preview.lenserfight.com,https://staging.lenserfight.com
```

Non-browser callers (CLI, server-to-server) do not send an `Origin` header and are unaffected by this list.

---

## Shared code

`supabase/functions/_shared/cors.ts` — CORS helpers used by all functions.

Import pattern:
```ts
import { corsHeaders, handleCors, errResponse, jsonResponse } from '../_shared/cors.ts'
```

Key exports:

| Export | Use |
|---|---|
| `handleCors(req)` | Call at the top of every handler; returns a preflight `Response` or `null` |
| `corsHeaders(req)` | Returns headers for a normal response with origin verified against allowlist |
| `errResponse(code, message, status, req)` | JSON error response with correct CORS headers |
| `jsonResponse(body, status, req)` | JSON success response with correct CORS headers |
| `CORS_HEADERS` | Legacy constant for partner-* endpoints — do not use in new endpoints |

Always pass `req` as the last argument to `errResponse` and `jsonResponse` so the Origin header is echoed back correctly. Omitting `req` falls back to `Access-Control-Allow-Origin: *`.
