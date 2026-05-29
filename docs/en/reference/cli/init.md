---
title: lf init
description: Initialize user-level lenserfight.json under your OS config directory. Use --project for a repo-local file.
---

# `lf init`

Creates **user-level** `lenserfight.json` under your OS config directory (e.g. `~/.config/lenserfight/lenserfight.json` on Linux) and ensures `config.json` exists for auth tokens. Nothing is written into the current git repository unless you pass `--project`.

```bash
lf init                           # cloud mode (default) → user config dir
lf init --mode local              # local Supabase stack
lf init --mode cloud --url https://your-project.supabase.co
lf init --project                 # optional: .lenserfight/lenserfight.json in cwd
```

For a guided experience, use [`lf setup`](setup.md) or [`lf onboard`](onboard.md) instead.

---

## Config layers

| File | Scope | Contains | Safe to commit? |
|---|---|---|---|
| `~/.config/lenserfight/lenserfight.json` (Linux) | User | mode, Supabase URL, ports | **No** — stays on your machine |
| `~/.config/lenserfight/config.json` | User | auth tokens, dev tokens | **No** |
| `.lenserfight/lenserfight.json` | Project (`--project` only) | mode, URL, ports (team override) | Yes, if the team agrees |

Secrets are never written to `lenserfight.json` — use environment variables or `config.json` after `lf auth login`.

---

## Examples

### Local mode

```bash
lf init --mode local
```

Output:

```
✔ Created user config: /home/you/.config/lenserfight/lenserfight.json (mode: local)
✔ Created /home/you/.config/lenserfight/config.json (tokens stored here after login)
ℹ Anon key : local Supabase defaults (auto)
ℹ URL      : http://127.0.0.1:54321
```

### Cloud mode (default)

```bash
lf init --mode cloud --url https://xyzproject.supabase.co
```

Output:

```
✔ Created user config: …/lenserfight.json (mode: cloud)
ℹ Anon key : detected in .env/.env.local
ℹ URL      : https://xyzproject.supabase.co
```

If the anon key is missing:

```
⚠ Anon key : not found. Set SUPABASE_ANON_KEY in .env.local or your shell environment.
```

### Re-initializing

If user config already exists, `lf init` warns before overwriting:

```
⚠ User config already exists (mode: local)
ℹ Overwriting with mode: cloud
```

---

## Options

| Flag | Type | Default | Description |
|---|---|---|---|
| `--mode` | string | `cloud` | Environment mode: `local` or `cloud` |
| `--url` | string | — | Supabase URL (auto-detected as `http://127.0.0.1:54321` for local mode) |
| `--source` | string | `auto` | Key source hint: `auto`, `env`, `supabase` |
| `--project` | boolean | `false` | Write `.lenserfight/lenserfight.json` in the current directory |

---

## Related

- [`lf setup`](setup.md) — guided onboarding wizard
- [`lf doctor`](doctor.md) — validate environment health after init
- [`lf onboard`](onboard.md) — friendly first-run flow
- [Configuration concept](configuration.md)

<!-- AUTO-GEN-START -->

# `lf init`

Initialize .lenserfight.json. Keys are never stored here — use env vars or ~/.lenserfight/lenserfight.json.

| Flag | Type | Required | Description |
|---|---|---|---|
| `--mode` | string | no | Environment mode: local or cloud |
| `--url` | string | no | Supabase URL (optional — auto-detected for local mode) |
| `--source` | string | no | Key source hint: auto (default), env, supabase |

<!-- AUTO-GEN-END -->
