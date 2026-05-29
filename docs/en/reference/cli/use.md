---
title: lf use
description: Show or persistently switch the active mode (local / cloud) for the LenserFight CLI.
---

# `lf use`

```
lf use [local|cloud] [--json]
```

Show the current active mode or switch it persistently. Mode is written to `.lenserfight/lenserfight.json` and applies to every subsequent `lf` invocation in that directory.

---

## Subcommands / arguments

| Argument | Description |
|----------|-------------|
| _(none)_ | Print the current mode and its source |
| `local` | Switch to local mode (Supabase on `localhost`) |
| `cloud` | Switch to cloud mode (lenserfight.com API) |

---

## Show current mode

```bash
lf use
```

Output:

```
  ──────────────────────────────────────
  ●  Active mode   local
     Source        /your/project/.lenserfight/lenserfight.json
  ──────────────────────────────────────

  Switch:  lf use cloud  ·  per-invocation: lf --cloud <cmd>
```

The `Source` line tells you whether the mode comes from:

- Your project config file (`.lenserfight/lenserfight.json`)
- An environment override (`LF_LOCAL` / `LF_CLOUD` / `--local` / `--cloud` flag)
- The built-in default (`cloud`) when no project config exists

### JSON output

```bash
lf use --json
```

```json
{
  "mode": "local",
  "source": "/your/project/.lenserfight/lenserfight.json",
  "configPath": "/your/project/.lenserfight/lenserfight.json"
}
```

---

## Switch mode

```bash
lf use cloud    # switch to cloud
lf use local    # switch to local
```

`lf use` writes the `mode` field in `.lenserfight/lenserfight.json`. If the file does not exist yet, it is created. All subsequent commands in that directory use the new mode without any flags.

**Example — cloud to local:**

```bash
lf use local
# ✔ Switched to local mode.
# ℹ Config: /your/project/.lenserfight/lenserfight.json
# ℹ Start local services:  lf setup --mode local
# ℹ Override per-command:  lf --local <cmd>
```

**Example — local to cloud:**

```bash
lf use cloud
# ✔ Switched to cloud mode.
# ℹ Config: /your/project/.lenserfight/lenserfight.json
# ℹ Authenticate:          lf auth login
# ℹ Override per-command:  lf --cloud <cmd>
```

**No-op:** If you run `lf use cloud` and the project is already in cloud mode, the command exits without rewriting the file:

```bash
lf use cloud
# ℹ Already in cloud mode — nothing changed.
```

---

## Per-invocation override

`lf use` sets a **persistent** mode. To override for a single command without touching the config file, use the global `--local` or `--cloud` flag:

```bash
lf --cloud lf status          # check cloud status without switching permanently
lf --local lf db migrate      # run a migration against local Supabase
```

These flags work with any `lf` command and are processed before the subcommand runs.

You can also export them as environment variables for the duration of a shell session:

```bash
export LF_CLOUD=1   # all lf commands in this shell use cloud mode
export LF_LOCAL=1   # all lf commands in this shell use local mode
```

---

## Mode comparison

| | `local` | `cloud` |
|---|---|---|
| Supabase URL | `http://127.0.0.1:54321` | `https://<your-project>.supabase.co` |
| API base URL | `http://localhost:8786` | `https://api.lenserfight.com` |
| Auth required | No (local dev keys used) | Yes — run `lf auth login` |
| Prerequisites | Docker + Supabase CLI + `lf setup --mode local` | Node ≥ 22, network access |

---

## Flags

| Flag | Description |
|------|-------------|
| `--json` | Emit mode, source, and config path as JSON (only valid without a positional argument) |

---

## Related commands

- [`lf init`](./init.md) — Initialize a new project config, optionally passing `--mode local|cloud`
- [`lf status`](./status.md) — Shows the active mode in the `Mode` row alongside auth and environment state
- [`lf auth login`](./auth.md) — Authenticate with the cloud API (required after switching to cloud)
- [`lf setup`](./setup.md) — Guided onboarding wizard; accepts `--mode local|cloud`
- [`lf doctor`](./doctor.md) — Validate environment health for the active mode
- [Configuration](./configuration.md) — Full reference for `.lenserfight/lenserfight.json`
