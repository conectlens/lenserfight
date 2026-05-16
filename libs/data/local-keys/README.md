# `@lenserfight/data/local-keys`

File-backed local BYOK key store. Encrypts API keys at rest under a master
passphrase held in the OS keychain (or `LENSERFIGHT_KEYS_PASSPHRASE` in
CI), and exposes a `LocalKeyStorePort` consumed by:

- **`apps/cli`** via direct filesystem access (`lf keys *`).
- **`apps/gateway`** via the loopback HTTP `/keys` surface.
- **`apps/web`** via `LocalKeysGatewayClient` (browser-safe, talks to the
  gateway over `127.0.0.1:38080`).

## Entry points

| Specifier | Audience | What it exports |
| --- | --- | --- |
| `@lenserfight/data/local-keys` | Node (CLI, gateway, tests) | `LocalKeyStore`, `PassphraseProvider`, cipher utilities, path helpers, audit log. |
| `@lenserfight/data/local-keys-browser` | Browser (`apps/web`) | `LocalKeysGatewayClient`, types, errors. No Node imports. |

## Security model

The threat model is documented at
[`docs/en/explanation/security/local-keys.md`](../../../docs/en/explanation/security/local-keys.md).
Headline guarantees:

- Per-key 16-byte salt + scrypt KDF (`N=2^15, r=8, p=1`).
- AES-256-GCM with fresh 12-byte IV per encryption; auth-tag detects
  tampering.
- File mode `0600`, parent dir `0700`, `O_NOFOLLOW`.
- Strict id regex (`/^[A-Za-z0-9_-]{20,40}$/`) — no path traversal.
- Atomic writes via `O_EXCL` + `rename(2)`.
- Master passphrase never written to any file under `~/.lenserfight/`.

## Layout

```
src/
  index.ts              ← Node entry
  browser.ts            ← Browser entry (fetch only)
  lib/
    ports.ts            ← LocalKeyStorePort, errors, metadata
    envelope.ts         ← KeyEnvelope schema + parse
    cipher.ts           ← AES-256-GCM + scrypt KDF (Node only)
    paths.ts            ← Dir layout, mode enforcement, atomic writes
    passphrase.ts       ← OS-keychain-backed master passphrase
    audit.ts            ← Append-only audit log
    store.ts            ← LocalKeyStore (Information Expert)
    browser/
      gateway-client.ts ← LocalKeysGatewayClient (fetch over loopback)
tests/
  cipher.spec.ts        ← AES-GCM correctness + nonce/salt uniqueness
  envelope.spec.ts      ← Schema round-trip + corrupt-envelope handling
  paths.spec.ts         ← 0600/0700 modes, symlink refusal, traversal
  passphrase.spec.ts    ← Keychain ↔ env fallback rules
  store.spec.ts         ← End-to-end CRUD + permission checks
  gateway-client.spec.ts ← Bearer header, 401/403/429/404 mapping, no key caching
```

## Running tests

```bash
pnpm nx test data-local-keys
```

51 tests cover the lib in isolation. End-to-end tests for the gateway
HTTP surface live in `apps/gateway/src/handlers/keys.spec.ts` and
`apps/gateway/src/auth/bearer.spec.ts`.
