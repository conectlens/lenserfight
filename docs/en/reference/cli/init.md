---
title: lf init
description: Initialize .lenserfight.json. Keys are never stored here — use env vars or ~/.lenserfight/config.json.
---

# `lf init`

Creates the project-level config file `.lenserfight.json` and ensures the device-level config directory `~/.lenserfight/` exists. This is the minimal setup step — for a guided experience, use [`lf setup`](setup.md) or [`lf onboard`](onboard.md) instead.

```bash
lf init                           # local mode (default)
lf init --mode cloud --url https://your-project.supabase.co
```

---

## Two config files

| File | Scope | Contains | Safe to commit? |
|---|---|---|---|
| `.lenserfight.json` | Project | mode, Supabase URL, ports | Yes |
| `~/.lenserfight/config.json` | Device | auth tokens, dev tokens, onboarding state | **No** — gitignored by default |

`lf init` writes to `.lenserfight.json`. Secrets are never stored in the project config — they live in environment variables or the device config.

---

## Examples

### Local mode (default)

```bash
lf init
```

Output:

```
✔ Created .lenserfight.json (mode: local)
✔ Created ~/.lenserfight/config.json (tokens stored here after login)
ℹ Anon key : local Supabase defaults (auto)
ℹ URL      : http://127.0.0.1:54321
```

### Cloud mode

```bash
lf init --mode cloud --url https://xyzproject.supabase.co
```

Output:

```
✔ Created .lenserfight.json (mode: cloud)
ℹ Anon key : detected in .env/.env.local
ℹ URL      : https://xyzproject.supabase.co
```

If the anon key is missing:

```
⚠ Anon key : not found. Set SUPABASE_ANON_KEY in .env.local or your shell environment.
```

### Re-initializing

If `.lenserfight.json` already exists, `lf init` warns before overwriting:

```
⚠ .lenserfight.json already exists (mode: local)
ℹ Overwriting with mode: cloud
```

---

## Options

| Flag | Type | Default | Description |
|---|---|---|---|
| `--mode` | string | `local` | Environment mode: `local` or `cloud` |
| `--url` | string | — | Supabase URL (auto-detected as `http://127.0.0.1:54321` for local mode) |
| `--source` | string | `auto` | Key source hint: `auto`, `env`, `supabase` |

---

## Related

- [`lf setup`](setup.md) — guided onboarding wizard
- [`lf doctor`](doctor.md) — validate environment health after init
- [`lf onboard`](onboard.md) — friendly first-run flow
- [Configuration concept](configuration.md)

<!-- AUTO-GEN-START -->

# `lf init`

Initialize .lenserfight.json. Keys are never stored here — use env vars or ~/.lenserfight/config.json.

| Flag | Type | Required | Description |
|---|---|---|---|
| `--mode` | string | no | Environment mode: local or cloud |
| `--url` | string | no | Supabase URL (optional — auto-detected for local mode) |
| `--source` | string | no | Key source hint: auto (default), env, supabase |

<!-- AUTO-GEN-END -->
