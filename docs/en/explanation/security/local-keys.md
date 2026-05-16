---
title: Local Keys — security model
description: Threat model, encryption-at-rest design, pairing flow, recovery, and backup posture for the LenserFight local BYOK key store.
---

# Local Keys — security model

This page is the canonical security reference for the `user_byok_local`
funding source. It covers where the keys live on disk, how they are
encrypted, how the browser reaches them without ever caching ciphertext,
and the threats the design does and does not defend against.

If you only need usage instructions, see [Funding Sources](/en/explanation/lenses/funding-sources) and the [`lf keys`](/en/reference/cli/keys) CLI reference.

## What "Local Keys" means now

Local BYOK keys live in **`~/.lenserfight/keys/`** on the user's machine,
encrypted at rest under a master passphrase held in the OS keychain.

The browser **never** holds ciphertext, **never** holds the master
passphrase, and only holds plaintext for the lifetime of a single
in-flight request. All access goes through the **LenserFight Gateway**
loopback daemon (`apps/gateway`, default `127.0.0.1:38080`). The same
store is accessed by:

- **`apps/web`** via the gateway's HTTP `/keys` surface, authenticated by
  a bearer token paired once per origin.
- **`apps/cli`** via direct filesystem access from the `lf keys *`
  commands — same code path, no HTTP.

The earlier IndexedDB-encrypted store is **gone**. On first load after
upgrade, the browser deletes the legacy database
(`lenserfight-local-keys`) and surfaces a one-time pointer to the new
pairing flow.

## Encryption at rest

Each key lives in its own envelope file at
`~/.lenserfight/keys/<id>.json`:

```json
{
  "v": 1,
  "alg": "aes-256-gcm",
  "kdf": "scrypt",
  "salt": "<base64(16 bytes)>",
  "iv":   "<base64(12 bytes)>",
  "ciphertext": "...",
  "tag":  "<base64(16 bytes)>",
  "meta": {
    "id": "<20-40 char [A-Za-z0-9_-]>",
    "provider": "openai",
    "label": "Prod",
    "createdAt": "..."
  }
}
```

Key design choices:

- **Per-key salt + scrypt KDF.** `N=2^15, r=8, p=1, dkLen=32`. One derivation per envelope. An attacker who steals the directory has to grind scrypt independently for every key — there is no global key to recover.
- **AES-256-GCM** with a fresh 12-byte IV per encryption. Any tampering with `ciphertext`, `iv`, or `tag` causes `decryption_failed`.
- **Atomic writes.** Envelopes are written via `O_EXCL | O_NOFOLLOW` to a temp file, then renamed over the target on POSIX. There is never a half-written envelope on disk.
- **File mode 0600**, parent dir 0700. The store refuses to read or write through a symlink and rejects ids that don't match `^[A-Za-z0-9_-]{20,40}$`.
- **Master passphrase** is held in the OS keychain (`lenserfight-keys` service). Never written into any LenserFight file. CI may set `LENSERFIGHT_KEYS_PASSPHRASE` instead; setting both is refused unless `LENSERFIGHT_KEYS_PASSPHRASE_FORCE_ENV=1` is also set.

## Browser ↔ gateway boundary

| Check | What happens | Why |
| --- | --- | --- |
| **Origin allow-list** | `Origin` must match `lenserfight.com`, a subdomain, `localhost`, or `127.0.0.1` on any port. Anything else → 403. | A malicious open tab on any other origin can `fetch('http://127.0.0.1:38080/...')`. The allow-list blocks that. |
| **Bearer token** | 32 random bytes minted by `lf gateway pair`, stored in OS keychain (server side) and `sessionStorage` (browser). Constant-time compare. | Without a token, no other process on the machine can call `/keys/*`. |
| **Token storage in the browser** | `sessionStorage` only — **not** cookie, **not** localStorage, **not** IndexedDB. | `sessionStorage` dies with the tab, the user re-pairs anytime. No cross-tab leakage, no automatic refresh from disk. |
| **Rate limit** | `/keys/:id/resolve` is capped at 60/min per token, burst 5. Excess → 429 + audit log. | A compromised origin that *can* reach the gateway shouldn't be able to exfiltrate every key in a few seconds. |
| **Body size** | Hard 64 KiB cap. Larger payloads → 413. | Catch obvious abuse early; keys are small. |
| **Loopback only** | Server refuses to bind `0.0.0.0` or `::`. | The gateway is for this machine; never put it on the network. |

## Threat model

| Threat | Defense | Residual risk |
| --- | --- | --- |
| Disk theft (laptop lost) | AES-256-GCM at rest under a passphrase held in the OS keychain. | If your OS login + keychain unlock are weak, an attacker with physical access can decrypt. Same risk as any password manager — pick a strong login and require auth-after-sleep. |
| Same-user malware reading `~/.lenserfight/keys/` | Mode 0600 only blocks unprivileged peers; same-UID processes can read **ciphertext** but need OS-keychain access to decrypt. | Defense-in-depth is OS sandboxing (macOS TCC, Linux AppArmor / cgroups). |
| Cross-origin browser JS calling the gateway | Origin allow-list + bearer token in `sessionStorage` (not cookie, not localStorage). CSRF impossible without Origin spoof, which `fetch` blocks. | A compromised lenserfight.com origin can pull keys via XSS — mitigations are strict CSP and SRI on the LenserFight web app. |
| Loopback eavesdropping | Loopback traffic never leaves the kernel. No on-the-wire risk. | None. |
| Path traversal / symlink swap | Strict id regex; `O_NOFOLLOW`; refuse symlinks on read, write, and unlink. | None. |
| Envelope tampering | AES-GCM auth tag — any modification fails decryption with `decryption_failed`. | None. |
| Cloud backup ingesting `~/.lenserfight/` | The directory is **not** in default home-backup roots on macOS/Windows. | A misconfigured cloud backup of `$HOME` would include ciphertext — useless without the passphrase. |
| Brute force on `/keys/:id/resolve` | 60/min per token, burst 5; audit log on each failure. | None for casual abuse. A patient attacker can still grind across many resolves — pair with strong origin + token. |
| Master passphrase exposed via env var | `LENSERFIGHT_KEYS_PASSPHRASE` only honored when the OS keychain is unavailable, unless `LENSERFIGHT_KEYS_PASSPHRASE_FORCE_ENV=1`. | Linux `/proc/<pid>/environ` is readable by the same UID — keep the env var in CI only, never in your shell rc. |

## Recovery

If you lose the master passphrase, **the keys are unrecoverable.** scrypt is designed to be expensive enough that brute force is infeasible, and the passphrase is the only way to derive any of the per-key keys. Re-add the keys with `lf keys add`.

If your OS keychain is wiped (system reinstall, profile reset), set the env var to recover access — but the OS-keychain copy of the passphrase is gone, so you should re-pair the gateway and reseat the passphrase via `lf keys init --force`.

## Opting out of cloud backup

- **macOS**: `xattr -w com.apple.metadata:com_apple_backup_excludeItem com.apple.backupd ~/.lenserfight` excludes the directory from Time Machine. For iCloud Drive, place `~/.lenserfight/` outside `~/Documents` (the default — no action needed).
- **Windows**: `~/.lenserfight/` lives in `%USERPROFILE%`. Add it to OneDrive's "Exclude folders" list under Settings → Account if your `%USERPROFILE%` is OneDrive-synced.
- **Linux**: Most desktop sync clients exclude dotfiles by default. Verify your tool's behavior before storing real keys.

## What this design does NOT protect against

- A compromised LenserFight web app origin running JS with `fetch` access to the paired gateway (defense: CSP, SRI, browser sandboxing — the same issues face any web wallet).
- Native malware running as the same OS user with keychain access.
- A determined attacker with physical access to an unlocked machine.

If any of those are in scope for your threat model, run Local Keys only on machines you fully control, and consider isolating the gateway in a separate user / VM.

## See also

- [`lf keys` CLI reference](/en/reference/cli/keys)
- [Funding sources overview](/en/explanation/lenses/funding-sources)
- [Repository security policy](https://github.com/conectlens/lenserfight/blob/main/SECURITY.md)
