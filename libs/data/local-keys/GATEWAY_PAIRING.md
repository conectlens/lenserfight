# Gateway Pairing — Security Design

Describes how the LenserFight browser frontend establishes and maintains a durable, revocable trust
relationship with the local LenserFight gateway daemon (`lf gateway serve`).

---

## 1. Overview

The gateway daemon binds to `127.0.0.1` only and accepts requests from a hard-coded origin
allow-list. A 256-bit random bearer token, printed once by `lf gateway pair --web`, is the
credential used to authenticate browser requests.

**Problem (pre-v1)**: the token was stored in `sessionStorage` and died when the tab closed,
requiring the user to paste a new token every session.

**Solution (v1, this implementation)**: the token is persisted in IndexedDB with TTL enforcement,
gateway-identity fingerprint binding, and explicit revocation paths. Auto-reconnect on page mount
restores the session without user interaction as long as the pairing is still valid.

---

## 2. Pairing Lifecycle

```
lf gateway pair --web
  └─ prints bootstrap token to terminal

User pastes token into UI
  └─ pairGateway(token) in useLocalKeyStore
       ├─ client.setToken(token)         — sets in-memory _memToken + sessionStorage
       └─ client.persistPairing()        — async: GET /identity → SHA-256 → IDB.save()

Next page load / new tab
  └─ reconnectFromStoredPairing() in useLocalKeyStore mount effect
       ├─ GET /identity → currentFingerprint
       ├─ IDB.load(currentFingerprint)
       │    ├─ ok        → restore _memToken, proceed
       │    ├─ expired   → delete record, show re-pair UI
       │    ├─ mismatch  → delete record, show re-pair UI
       │    └─ not_found → show pairing token input
       └─ healthCheck() → update availability state

Gateway returns 401
  └─ parseBody() in gateway-client
       ├─ pairingStore.revoke()          — delete IDB record
       └─ throw LocalKeyStoreError('pairing_revoked')
            └─ useLocalKeyStore refresh() → setAvailability('pairing_revoked')

User clicks "Forget this gateway"
  └─ forgetGateway() in useLocalKeyStore
       └─ client.forgetGateway()
            ├─ _memToken = null
            ├─ sessionStorage.removeItem(SESSION_TOKEN_KEY)
            └─ pairingStore.forget()     — delete IDB record
```

---

## 3. Storage Decision

| Property | sessionStorage | localStorage | IndexedDB (chosen) |
|---|---|---|---|
| Persists across tabs | ✗ | ✓ | ✓ |
| Persists across browser restart | ✗ | ✓ | ✓ |
| Origin-scoped | ✓ | ✓ | ✓ |
| Shown in DevTools "Local Storage" tab | — | ✓ | ✗ (separate "IndexedDB" tab) |
| Synchronous API | ✓ | ✓ | ✗ (async — non-blocking) |
| Supports structured objects | ✗ | ✗ (strings only) | ✓ |
| XSS readable | ✓ | ✓ | ✓ (unchanged risk) |

IndexedDB was chosen over localStorage because it is async (no main-thread blocking), supports
structured data without JSON round-tripping, and is not prominently surfaced in the DevTools
"Application → Local Storage" panel — reducing the accidental exposure surface during support
sessions.

---

## 4. TTL Rationale

Two TTL fields coexist in `GatewayPairingRecord`:

| Field | Duration | Behaviour |
|---|---|---|
| `expiresAt` | 30 days | Rolling — reset on every successful `load()`. Active users never expire. |
| `absoluteExpiresAt` | 90 days | Hard cap — never refreshed. Forces re-pair after 90 days regardless. |

Rationale:
- **30-day rolling**: matches typical "remember this device" patterns (GitHub, npm). A user who
  hasn't touched local keys in a month is unlikely to still have the same daemon running.
- **90-day absolute**: defence in depth. Limits the window in which a stolen token (e.g. via XSS,
  browser history, backup) can be replayed. The gateway's OS keychain is the primary protection;
  IDB expiry is a second layer.

Constants are exported (`ROLLING_TTL_MS`, `ABSOLUTE_TTL_MS`) and can be adjusted without
changing the record schema.

---

## 5. Revocation Semantics

Three distinct revocation paths:

### 5a. HTTP 401 from gateway (token rotated)

Triggered by `lf gateway pair --rotate`. The gateway issues a new token and invalidates all
previous ones. The next authenticated request returns 401.

`gateway-client.ts` detects 401 in `parseBody()`, calls `pairingStore.revoke()` (fire-and-forget
IDB delete), and throws `LocalKeyStoreError('pairing_revoked')`. The hook sets
`availability = 'pairing_revoked'` and the UI shows a red "Pairing revoked" panel with a re-pair
input.

### 5b. Gateway identity mismatch (daemon reinstalled)

The gateway generates an Ed25519 keypair at first run and exposes the public key at
`GET /identity`. `persistPairing()` computes SHA-256 of that key and stores it alongside the
token. On reconnect, `IDB.load(currentFingerprint)` sees the mismatch and returns
`{ status: 'mismatch' }`, which is treated as `'pairing_expired'` in the UI (same amber
"pairing expired" panel).

### 5c. TTL expiry

Handled by `load()` — see §4.

### 5d. User action ("Forget this gateway")

`forgetGateway()` clears in-memory state, sessionStorage, and IDB. Treated as a clean slate;
the UI returns to the `gateway_not_paired` / pairing token input state.

---

## 6. Gateway Identity Fingerprint

**Why**: without fingerprint binding, a stored token for gateway A would be presented to gateway B
(e.g. after reinstalling the daemon). Since both are local, the domain-level threat is low, but
the fingerprint provides an extra correctness guarantee: you always authenticate to the gateway
you originally paired with.

**How**:
1. `GET {baseUrl}/identity` — unauthenticated, returns `{ public_key: "<base64 Ed25519 pubkey>" }`.
2. `crypto.subtle.digest('SHA-256', new TextEncoder().encode(publicKey))` → hex string.
3. Stored in `GatewayPairingRecord.gatewayFingerprint`.

**Edge case**: if the gateway is unreachable at pairing time (e.g. token pasted before daemon
restarts), `fetchGatewayFingerprint()` returns `'unknown'`. The next reconnect attempt where the
gateway IS reachable will compute the real fingerprint, see a mismatch against `'unknown'`, and
surface `pairing_expired` → re-pair required. This is intentional: we prefer false negatives
(re-pair once) over silently accepting an unbound credential.

---

## 7. "Forget This Gateway" Flow

Available in the funding source toggle when `localKeyAvailability === 'available'` and
`onForgetGateway` is provided.

Clicking the link:
1. Calls `funding.forgetGateway()`.
2. `useLocalKeyStore.forgetGateway()` → `client.forgetGateway()` → clears `_memToken`,
   `sessionStorage`, and IDB record.
3. Hook sets `availability = 'gateway_not_paired'` and clears `localKeys = []`.
4. UI transitions immediately to the pairing token input panel.

No network call is made. The gateway daemon is not notified; only the browser side forgets.

---

## 8. Security Tradeoffs

| Property | Posture |
|---|---|
| Survives tab close | ✓ (IDB persists) |
| Survives browser restart | ✓ (IDB persists) |
| Origin-scoped | ✓ (IDB is same-origin only) |
| Gateway identity binding | ✓ (SHA-256 fingerprint) |
| TTL enforcement | ✓ (30d rolling / 90d absolute) |
| Revocation on 401 | ✓ (IDB record deleted) |
| Explicit "Forget" action | ✓ |
| Raw token stored in plaintext | ✗ (MVP limitation — see §9) |
| XSS can read token from IDB | ✗ (same origin-level risk as localStorage) |
| CSRF | N/A (bearer token in header, not cookie) |
| Network exposure | N/A (gateway binds to 127.0.0.1 only) |

The gateway's loopback-only bind (`127.0.0.1`) and origin allow-list enforced by the daemon are
the primary access control layers. IDB TTL and fingerprint binding are secondary hardening.

---

## 9. Upgrade Path (v2 — not yet implemented)

The current implementation stores the raw bootstrap bearer token in IDB. This means:
- IDB access (e.g. via XSS) yields the master credential.
- The token cannot be individually revoked per-browser (only globally via `--rotate`).

**Proposed v2 design** (requires a new gateway endpoint):

```
Browser                          Gateway
  │                                 │
  │── POST /auth/browser-grant ─────▶
  │   { bootstrap_token, origin }   │
  │                                 │── validate bootstrap_token
  │                                 │── generate short-lived grant (UUID + expiry)
  │                                 │── store in grant registry
  │◀── { grant_token, expires_at } ──
  │                                 │
  │── store grant_token in IDB ─────│
  │   (NOT the bootstrap_token)     │
  │                                 │
  │── subsequent requests: ─────────▶
  │   Authorization: Bearer <grant_token>
```

Properties gained:
- The master bootstrap token is used **once** and never stored in the browser.
- Each browser/tab gets a unique revocable grant credential.
- Gateway can revoke a specific grant (e.g. lost laptop) without rotating the master token.
- grant_token has a shorter TTL enforced by the gateway (e.g. 7d with refresh).

Gateway-side requirements for v2:
- `POST /auth/browser-grant` endpoint accepting `{ bootstrap_token, origin }`.
- In-memory or on-disk grant registry (grant_id → { origin, expiresAt, revoked }).
- `DELETE /auth/browser-grant/:id` for explicit per-grant revocation.
- All existing endpoints must accept both bootstrap_token (for CLI) and grant_token (for browser).
- `GET /identity` remains unauthenticated (fingerprint binding still needed).

Until v2 is implemented, the mitigation is the gateway's own origin allow-list: only the
configured origin can use the bearer token even if it leaks to another page.
