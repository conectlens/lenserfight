---
title: lf keys
description: Manage local BYOK API keys stored encrypted at rest in ~/.lenserfight/keys/. Same store backs apps/web (via the gateway) and apps/cli.
---

# `lf keys`

Manage local BYOK API keys stored in `~/.lenserfight/keys/` on your machine.
Each key is wrapped in an AES-256-GCM envelope; the master passphrase lives
in your OS keychain. The same on-disk store is read by `apps/web` through
the LenserFight Gateway loopback daemon.

> **Security:** New keys are **always** read from stdin (echo suppressed in
> TTYs), never from a CLI flag — they do not appear in shell history or
> process listings.

```bash
lf keys init                                   # one-time setup: generate passphrase + create ~/.lenserfight/keys/
lf keys list [--json]
lf keys add    --provider <provider> [--label <l>]   # reads key from stdin
lf keys update <id> [--label <l>] [--rotate]
lf keys rotate <id>                                 # reads new key from stdin
lf keys remove <id> [--yes]
lf keys export <id> --i-understand
lf keys doctor [--json]
```

For browser access also: `lf gateway serve` + `lf gateway pair --web`.

---

## `lf keys init`

Generate a 32-byte random master passphrase, store it in the OS keychain
(service `lenserfight-keys`, account `master`), and create the keys
directory at `~/.lenserfight/keys/` with mode 0700.

| Flag | Required | Description |
|---|---|---|
| `--force` | no | Replace an existing passphrase. **WARNING**: this makes every existing key unrecoverable. |

```bash
lf keys init
```

Backed by `PassphraseProvider.set()` from `@lenserfight/data/local-keys`.

---

## `lf keys list`

Print metadata for every local key (provider, label, id, createdAt). The
plaintext values and ciphertext **never** leave the store.

| Flag | Required | Description |
|---|---|---|
| `--json` | no | Emit raw JSON instead of a table. |

```bash
lf keys list
```

---

## `lf keys add`

Add a new key. Provider and label are flags; the key value is read from
stdin with echo suppressed when running on a TTY.

| Flag | Required | Description |
|---|---|---|
| `--provider <key>` | yes | Lower-case provider slug: `openai`, `anthropic`, `mistral`, `google`, etc. |
| `--label <l>` | no | Friendly label. Defaults to the provider slug. |

```bash
# Interactive — value read from stdin, echo off
lf keys add --provider openai --label "Prod"

# Piped — never put the key on the command line
printf '%s' "$OPENAI_API_KEY" | lf keys add --provider openai --label CI
```

---

## `lf keys update`

Update a key's label and/or rotate its value.

| Flag | Required | Description |
|---|---|---|
| `<id>` (positional) | yes | Key id from `lf keys list`. |
| `--label <l>` | no | New label. |
| `--rotate` | no | Prompt for a new key value (stdin). |

```bash
lf keys update abcd1234abcd1234abcd1234 --label "Prod (rotated)" --rotate
```

`update` and `rotate` are atomic — the new envelope is written to a temp
file and `rename(2)`'d into place. If the write fails partway, the old
envelope is preserved untouched.

---

## `lf keys rotate`

Shorthand for `lf keys update --rotate`.

```bash
lf keys rotate abcd1234abcd1234abcd1234
```

---

## `lf keys remove`

Delete a key file. The store refuses to unlink through a symbolic link.

| Flag | Required | Description |
|---|---|---|
| `<id>` (positional) | yes | Key id from `lf keys list`. |
| `--yes` | no | Skip the typed-`yes` confirmation. |

```bash
lf keys remove abcd1234abcd1234abcd1234
```

---

## `lf keys export`

Print a key's plaintext value to stdout. Requires the literal
`--i-understand` flag to discourage accidental disclosure.

| Flag | Required | Description |
|---|---|---|
| `<id>` (positional) | yes | Key id. |
| `--i-understand` | yes | "I understand this prints the secret to stdout." |

```bash
lf keys export abcd1234abcd1234abcd1234 --i-understand
```

The CLI prints a warning to stderr first; redirect to a file if you need
to capture the value:

```bash
lf keys export <id> --i-understand > my-key.txt
chmod 0600 my-key.txt
```

---

## `lf keys doctor`

Validate the keys directory and envelope integrity.

| Flag | Required | Description |
|---|---|---|
| `--json` | no | Emit raw JSON. |

Reports:

- Whether a master passphrase is configured.
- Whether the keys directory exists, and its octal mode.
- World-readable / world-writable / group-readable files (any of those is
  a finding).
- Symlinks where a regular file is expected.
- Envelopes that fail schema validation (`corrupt_envelope`).

Exit code is `0` only when every check passes.

```bash
lf keys doctor
```

---

## Pairing with the web app

To use Local Keys from the browser:

```bash
# Same machine — gateway and browser on the same box.
lf gateway serve --keys-only

# Tailscale / LAN — browser on a different device than the gateway.
lf gateway serve --keys-only --bind 0.0.0.0

# Get the pairing token (in another terminal).
lf gateway pair --web
```

`--keys-only` skips the heavy preconditions (identity, session, lenser, kill_switch) and the sync loops — those are only relevant to the full signed-coordination feature, not the Local Keys HTTP surface.

Then in the LenserFight web app:

1. Open any lens, battle, or workflow page (anywhere the **Funding** panel is shown — there is no dedicated Settings page).
2. Click the **Local Keys** tile.
3. A "Paste your pairing token below ↓" input appears. Paste the token from `lf gateway pair --web` and click **Pair gateway**.

The token is held in `sessionStorage` and dies with the tab — re-pair anytime by re-running `lf gateway pair --web`. Use `--rotate` to invalidate the previous token first.

---

## Common mistakes

- **Setting `LENSERFIGHT_KEYS_PASSPHRASE` in your shell rc.** The OS keychain is more secure. Use the env var only in CI.
- **Sharing `~/.lenserfight/keys/` to another machine via cloud sync.** Ciphertext is fine to back up, but the passphrase lives in the source machine's keychain — copy that too, or generate a new one with `lf keys init --force` (re-add keys after).
- **`lf keys export <id> > /dev/tty` in a shared terminal.** Anyone watching can see the plaintext. Pipe to a file with mode 0600 or feed it directly into the consumer.

---

## Related

- [Funding sources overview](/en/explanation/lenses/funding-sources)
- [Local Keys security model](/en/explanation/security/local-keys)
- [`lf gateway`](gateway.md) — start, status, and pair the loopback daemon
- [`lf byok`](byok.md) — server-side BYOK (per-agent keys stored in Supabase)
