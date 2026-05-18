---
title: Local Keys & Gateway
description: How Local Keys are stored, encrypted, and served to the browser and CLI via the LenserFight Gateway loopback daemon — architecture, security model, and setup.
---

# Local Keys & Gateway

Local Keys are API keys that live **only on your machine**, encrypted at rest under a master passphrase that LenserFight never sees. Execution reads the key through the LenserFight Gateway daemon running on your machine — no key material ever touches the cloud.

> **This page covers the architecture and security model in depth.**
> For a quick-start comparison of all funding modes, see [Funding Sources](/en/explanation/lenses/funding-sources).

---

## Architecture

```
┌──────────────────┐  HTTP (loopback, bearer auth)  ┌──────────────────┐  fs (0600/0700)
│  apps/web        │ ────────────────────────────>  │  apps/gateway    │ ──────────────> ~/.lenserfight/keys/
│  (browser)       │   /keys CRUD + /keys/:id/resolve│  (Node daemon)   │                <id>.json (AES-256-GCM)
└──────────────────┘                                 └──────────────────┘
                                                              ▲
                                                              │ direct fs
                                                              │
                                                     ┌──────────────────┐
                                                     │  apps/cli        │
                                                     │  lf keys *       │
                                                     └──────────────────┘
```

The browser holds **no** ciphertext and **no** persistent state about your keys. Every read goes through the gateway loopback daemon. The same store serves:

- The **browser** via the gateway's `/keys` endpoints.
- The **CLI** (`lf keys *`) directly via the filesystem.
- Any future runner built on `libs/data/local-keys`.

There is no separate browser-only store — the previous IndexedDB design has been removed.

---

## Setup

You need two short-lived CLI commands and one token paste in the browser.

### 1. Start the gateway

In a terminal — **leave this running**:

```bash
# Same machine — gateway and browser on the same box (most common).
lf gateway serve --keys-only

# Tailscale or LAN — browser on another device, gateway on this one.
lf gateway serve --keys-only --bind 0.0.0.0
```

`--keys-only` skips the identity/session/lenser/kill_switch preconditions used by the signed-coordination feature. It also allows binding a non-loopback address without a Tailscale consent file.

### 2. Initialise keys and add a provider key

In another terminal:

```bash
# One-time: generate the master passphrase (stored in your OS keychain)
# and create ~/.lenserfight/keys/.
lf keys init

# Add a key — value is read from stdin so it doesn't enter shell history.
lf keys add --provider openai --label "Prod"

# Print the pairing token the browser needs.
lf gateway pair --web
```

### 3. Pair the browser

1. Open the LenserFight web app on any lens, battle, or workflow page (anywhere with a Funding panel).
2. In the Funding panel, click the **Local Keys** tile.
3. A **Paste your pairing token below ↓** box appears. Paste the token from `lf gateway pair --web` and click **Pair gateway**.

The keys added with `lf keys add` will now appear in the picker.

The pairing token lives in `sessionStorage` only. Close the tab and you'll need to re-run `lf gateway pair --web` for a fresh token. There is no global Settings → Local Keys page — the pair input is inline inside the Funding panel because that is the only place Local Keys are used.

---

## Key management commands

| Command | Purpose |
|---|---|
| `lf keys init` | One-time setup: creates `~/.lenserfight/keys/`, stores master passphrase in OS keychain |
| `lf keys add --provider <p> --label <l>` | Add a new key (value read from stdin) |
| `lf keys list` | List all stored key IDs and metadata |
| `lf keys rotate <id>` | Re-encrypt a key under a new IV |
| `lf keys remove <id>` | Delete a key envelope |
| `lf keys doctor` | Verify all envelopes can be decrypted |

See the [CLI keys reference](/en/reference/cli/keys) for the full surface.

---

## Encryption at rest

Each key lives in its own envelope at `~/.lenserfight/keys/<id>.json`:

```json
{
  "v": 1,
  "alg": "aes-256-gcm",
  "kdf": "scrypt",
  "salt": "<16 bytes>",
  "iv": "<12 bytes>",
  "ciphertext": "...",
  "tag": "<16 bytes>",
  "meta": { "id": "...", "provider": "openai", "label": "Prod", "createdAt": "..." }
}
```

- **Per-key salt + scrypt KDF** (N=2¹⁵, r=8, p=1, dkLen=32). Brute force must grind scrypt for every individual key.
- **AES-256-GCM** with a fresh 12-byte IV per encryption. The auth tag detects tampering and refuses to decrypt.
- **File mode 0600**, parent directory mode 0700. The store refuses to follow symlinks and rejects any ID that does not match `^[A-Za-z0-9_-]{20,40}$`.
- **Master passphrase** lives in the OS keychain under service `lenserfight-keys`. Never written to any file. CI may use the env var `LENSERFIGHT_KEYS_PASSPHRASE` instead.

---

## Browser ↔ gateway authentication

| Check | Defense |
|---|---|
| Cross-origin browser JS calling the gateway | Origin allow-list (`lenserfight.com`, subdomains, `localhost`/`127.0.0.1`). All others → 403. |
| Disallowed-origin preflight | Returns 403 — browser never sees the response body. |
| Bearer token | 32 random bytes generated by `lf gateway pair`, held in the OS keychain by the gateway and in `sessionStorage` by the browser. Constant-time comparison. |
| Brute force on `/keys/:id/resolve` | 60/min per token, burst of 5 — 429 + audit log. |
| Body abuse | Hard 64 KiB cap; larger payloads → 413. |

The gateway only binds to loopback by default. The `--bind` flag accepts a specific IP — it will not bind to `0.0.0.0` unless you explicitly pass it.

For the full threat-model breakdown, see [Local Keys security model](/en/explanation/security/local-keys).

---

## Ollama (local models)

Ollama runs AI models entirely on your machine. For local Ollama models, **no API key is required** — Ollama connects to `localhost:11434`. An optional key field is available for cloud-routed Ollama models only.

---

## Migrating from the old IndexedDB store

If you used Local Keys before this version, the old IndexedDB database (`lenserfight-local-keys`) is auto-deleted on first load after upgrade. Re-add your keys with `lf keys add`. There is no export path from the legacy store.

---

## When to use Local Keys

- You are self-hosting LenserFight and prefer to keep all secrets on your machine.
- You move between the CLI and the browser and want a single source of truth for provider keys.
- You want to test AI providers without a LenserFight account.

---

## Cloud BYOK in local development

Cloud BYOK keys are stored in Supabase Vault and decrypted server-side at execution time. In local development the execute-stream edge function is not available, so there is a dev-only escape hatch: `fn_get_my_key_secret`, a Postgres RPC that decrypts a caller-owned vault key and returns the plaintext to the browser.

### Why it is disabled by default

The function exposes raw API key material over PostgREST. Shipping it enabled would mean any accidental connection to a non-local Supabase (staging, prod) would allow any authenticated user to extract other users' secrets. To prevent this:

- **Server-side gate:** The function raises `42501 insufficient_privilege` unless the Postgres GUC `app.allow_dev_byok_resolver` is explicitly set to `'true'` on the database. This GUC is never set in staging or production.
- **Client-side gate:** `walletApiClient.resolveByokKeyForLocalDev()` throws immediately if `import.meta.env.DEV` is false, so the call is tree-shaken out of production builds entirely.

Both gates must pass. The server-side gate is the authoritative security boundary.

### Enabling it locally

Run once after `pnpm supabase start` (or after any `db reset`):

```bash
pnpm supabase:enable-byok-resolver
# or directly:
bash scripts/enable-byok-dev-resolver.sh
```

The script connects to the running Supabase container as `supabase_admin` (the only role that can set database-level GUCs) and runs:

```sql
ALTER DATABASE postgres SET "app.allow_dev_byok_resolver" = 'true';
SELECT pg_reload_conf();
```

The setting persists until the DB is dropped — you do not need to re-run it between server restarts, only after `supabase stop --no-backup` or `pnpm supabase db reset`.

### Error reference

| Error | Code | Cause | Fix |
|---|---|---|---|
| `fn_get_my_key_secret is disabled in this environment` | `42501` | GUC not set | Run `pnpm supabase:enable-byok-resolver` |
| `Key not found, revoked, or not owned by caller` | `P0001` | Wrong `key_id` or key revoked | Check `ai.keys` table for an active key owned by the current user |
| `Failed to decrypt key from vault` | `P0001` | Vault entry missing | Re-add the key via Settings → BYOK |

---

## See also

- [Funding Sources](/en/explanation/lenses/funding-sources) — comparison of all three funding modes
- [Local Keys security model](/en/explanation/security/local-keys)
- [`lf keys` CLI reference](/en/reference/cli/keys)
- [`lf gateway` CLI reference](/en/reference/cli/gateway)
- [BYOK execution guide](/en/how-to/battles/byok-execution)
