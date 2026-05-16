---
title: Funding Sources
description: How Chainabit credits, LF Cloud Keys (BYOK cloud), and Local Keys (BYOK local) work — where keys are stored, how they are secured, and when to use each mode.
---

# Funding Sources

Every Lens execution needs a way to pay for AI inference. LenserFight supports three funding modes depending on how you run the platform.

---

## Chainabit Credits

> Available on LenserFight Cloud only.

Chainabit is the billing layer for the ConectLens ecosystem. When you run a Lens with Chainabit as the funding source, your Chainabit credit balance is charged at the platform's AI inference rates — you do not need any provider API key.

**How it works:**

1. Connect your Chainabit account in Settings → Integrations.
2. Top up credits at [chainabit.com](https://chainabit.com).
3. Select **Chainabit** in the Funding panel before running a Lens.

**Credit balance** is shown live in the toggle. If your balance reaches zero, Chainabit is automatically disabled and the toggle falls back to your cloud BYOK keys.

**When to use:** You want a frictionless, pay-as-you-go experience without managing provider API keys.

---

## LF Cloud Keys (BYOK Cloud)

> Available on LenserFight Cloud only.

"Bring Your Own Key" (BYOK) cloud mode lets you attach your own provider API keys to your LenserFight account. Keys are stored **encrypted at rest on LenserFight's servers** and are accessible from any device or session.

**How keys are stored:**

- Encrypted with AES-256 before storage.
- The plaintext key is never logged.
- Keys are scoped to your account and never shared.

**Adding keys:** Settings → API Keys → Add Key. You can add multiple keys for different providers (Anthropic, OpenAI, Google, Mistral, etc.).

**When to use:** You have existing provider API accounts and want a managed, multi-device experience with your own billing.

---

## Local Keys (BYOK Local)

Local Keys are API keys that live **only on your machine**, encrypted at rest under a master passphrase that LenserFight never sees. The browser holds **no** ciphertext and **no** persistent state about the keys — every read goes through the LenserFight Gateway loopback daemon.

```
┌──────────────────┐  HTTP (loopback, bearer auth)  ┌──────────────────┐  fs (0600/0700)
│  apps/web        │ ────────────────────────────>  │  apps/gateway    │ ────────────────>  ~/.lenserfight/keys/
│  (browser)       │   /keys CRUD + /keys/:id/resolve│  (Node daemon)   │                    <id>.json (AES-256-GCM envelopes)
└──────────────────┘                                 └──────────────────┘
                                                              ▲
                                                              │ direct fs
                                                              │
                                                     ┌──────────────────┐
                                                     │  apps/cli        │
                                                     │  lf keys *       │
                                                     └──────────────────┘
```

The same store serves the browser (via the gateway), the CLI (`lf keys *`), and any future runner you build on top of `libs/data/local-keys`. There is no longer a separate browser-only store — the previous IndexedDB design has been removed.

### Set it up

1. **Start the gateway.** It runs as a small Node daemon on `127.0.0.1:38080`:
   ```bash
   lf gateway serve
   ```
2. **Generate a master passphrase**, stored in your OS keychain (macOS Keychain, Windows Credential Manager, libsecret on Linux):
   ```bash
   lf keys init
   ```
3. **Pair the web app once per origin.** The bearer token is held in `sessionStorage` (lost when you close the tab — re-pair anytime):
   ```bash
   lf gateway pair --web
   # Settings → Local Keys → Pair Gateway → paste the printed token
   ```
4. **Add a key** (the value is read from stdin so it never appears in shell history):
   ```bash
   lf keys add --provider openai --label "Prod"
   ```

`lf keys list`, `lf keys rotate <id>`, `lf keys remove <id>`, and `lf keys doctor` are also available. See [the CLI reference](/en/reference/cli/keys) for the full surface.

### Encryption at rest

Each key lives in its own envelope at `~/.lenserfight/keys/<id>.json`:

```json
{ "v": 1, "alg": "aes-256-gcm", "kdf": "scrypt",
  "salt": "<16 bytes>", "iv": "<12 bytes>",
  "ciphertext": "...", "tag": "<16 bytes>",
  "meta": { "id": "...", "provider": "openai", "label": "Prod", "createdAt": "..." } }
```

- **Per-key salt + scrypt KDF** (N=2^15, r=8, p=1, dkLen=32). One derivation per envelope — brute force has to grind scrypt for every individual key.
- **AES-256-GCM** with a fresh 12-byte IV per encryption. The auth tag detects any tampering and refuses to decrypt.
- **File mode 0600**; parent directory mode 0700. The store refuses to follow symlinks and rejects any id that doesn't match `^[A-Za-z0-9_-]{20,40}$`.
- **Master passphrase** lives in the OS keychain under service `lenserfight-keys`. Never written to any file under `~/.lenserfight/`. CI may opt in to the env var `LENSERFIGHT_KEYS_PASSPHRASE` instead.

### Browser ↔ gateway authentication

| Check | Defense |
| --- | --- |
| Cross-origin browser JS calling the gateway | Origin allow-list (`lenserfight.com`, subdomains, `localhost`/`127.0.0.1`). |
| Disallowed-origin preflight | Returns 403 — browser never sees the response body. |
| Bearer token | 32 random bytes, generated by `lf gateway pair`, held in OS keychain by the gateway and `sessionStorage` by the browser. Constant-time comparison. |
| Brute force on `/keys/:id/resolve` | 60/min per token, burst of 5 — 429 + audit log. |
| Body abuse | Hard 64 KiB cap; payloads larger than this 413. |

The full threat-model breakdown lives at [security/local-keys](/en/explanation/security/local-keys).

### Ollama (local models)

Ollama runs AI models entirely on your machine. For local Ollama models, **no API key is required** — Ollama connects to `localhost:11434`. An optional key field is available for cloud-routed Ollama models only.

### Migrating from the old IndexedDB store

If you used Local Keys on a version prior to this one, the old IndexedDB database (`lenserfight-local-keys`) is auto-deleted on first load after upgrade. Re-add your keys with `lf keys add`. There is no export path from the legacy store — the previous per-origin encryption was a development-only safeguard.

### When to use Local Keys

- You are self-hosting LenserFight and prefer to keep all secrets on your machine.
- You move between the CLI and the browser and want a single source of truth for your provider keys.
- You want to test AI providers without creating a LenserFight account.

---

## Comparison

| Feature | Chainabit Credits | LF Cloud Keys | Local Keys |
|---|---|---|---|
| Where keys live | Chainabit account | LenserFight servers (encrypted) | `~/.lenserfight/keys/` on your machine |
| Provider key required | No | Yes | Yes |
| Available on Cloud | Yes | Yes | Yes (gateway required) |
| Available self-hosted | No | No | Yes |
| Accessible across devices | Yes | Yes | One machine — copy `~/.lenserfight/keys/` manually if you want a second |
| Works in CLI (`lf`) | Via Chainabit billing | Via cloud key API | Yes (`lf keys *`) |
| Touches the browser? | No (server-side billing) | No (server-side resolve) | Only the plaintext for the in-flight request; never stored |

---

## See also

- [Local Keys security model](/en/explanation/security/local-keys)
- [`lf keys` CLI reference](/en/reference/cli/keys)
- [BYOK execution guide](/en/how-to/battles/byok-execution)
- [BYOK Cloud Battle walkthrough](/en/tutorials/battle-walkthroughs/byok-cloud-battle)
- [Chainabit integration reference](/en/how-to/integrations/chainabit-example)
