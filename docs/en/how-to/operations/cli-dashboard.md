---
title: "Operate LenserFight from the TUI dashboard"
description: "Open the lf TUI dashboard, read its profile/health header and action-log tail, and use single-key bindings to drill into approvals, battles, schedules, and memory."
---

# Operate LenserFight from the TUI dashboard

The `lf` command, run with no subcommand, opens an interactive terminal dashboard. Use it for quick triage — checking which profile is active, whether the platform is reachable, and what your agents have done in the last few minutes.

## Open the dashboard

```bash
lf
```

The dashboard takes over the current terminal. Press `q` or `Esc` to exit.

The dashboard respects the active CLI profile and the [profile resolution order](/en/reference/cli/profile#profile-resolution-order). To inspect a different backend, switch first:

```bash
LF_PROFILE=staging lf
# or
lf profile use staging && lf
```

## Layout tour

The dashboard renders three regions, top to bottom:

1. **Header.** Workspace banner, the active profile name (highlighted), and a colored health badge (`HEALTHY` green or `DOWN` red). In **cloud** mode the badge uses hosted Supabase `GET /auth/v1/health` (with the publishable/anon key). In **local** mode it also tries a legacy platform-api `/health` when configured (not `{SUPABASE_URL}/functions/v1/health`).
2. **Status line.** Local timestamp and the refresh cadence (`refresh 2s`).
3. **Recent agent action logs.** Up to 10 rows from `agents.action_logs`, newest first, showing time, action type, and a truncated payload preview.

A footer line lists the key bindings.

## Key bindings

| Key | Action |
|---|---|
| `a` | Approvals — runs `lf approval list` in a child process. |
| `b` | Battles — runs `lf battle list`. |
| `s` | Schedules — runs `lf schedule list`. |
| `m` | Memory — runs `lf memory list-entries`. |
| `q` / `Esc` / `Ctrl-C` | Quit and restore the cursor. |

When you trigger a binding, the dashboard pauses, hands the terminal to the spawned `lf` subcommand, and returns to the live view when you press `q` after the child exits.

## When to use it

- Quick triage during an incident — confirm the platform is up and skim the latest action logs in one place.
- Pre-flight check before kicking off a scheduled workflow — verify that the active profile matches the environment you intend to mutate.
- Demo loop — show the platform "doing things" without scripting a CLI walkthrough.

The dashboard is not built for long stares. It re-renders the entire frame every 2 seconds; staring at it for an hour will scroll your scrollback into oblivion. For long-running observation, prefer:

- [`lf top`](/en/reference/cli/top) — dedicated real-time telemetry: CPU, memory, GPU, service health, battle load, and 60-second rolling graphs. Press `e` for the expanded view with per-core CPU.
- `lf execution list --json | jq` for machine-readable run state.
- Supabase Studio dashboards for SQL-level visibility.
- The web app for human-readable history.

## Runtime telemetry: `lf top`

The `lf top` command opens a separate telemetry console focused on infrastructure health rather than agent activity. Use it alongside a `battle run` session, or during `lf dev` to watch local service load.

```bash
lf top              # compact alt-screen dashboard
lf top monitor      # expanded — all panels + per-core CPU + graphs
lf top battle       # battle ops center (Ollama, VRAM, queue)
lf top stream       # pipe-friendly scrolling output
```

Key differences from the main `lf` dashboard:

| Feature | `lf` (no subcommand) | `lf top` |
|---|---|---|
| Refresh cadence | 2 seconds | 1 second (configurable) |
| CPU/memory bars | No | Yes |
| GPU detection | No | Yes (NVIDIA via `nvidia-smi`) |
| Service health probes | Supabase only | Ollama, Supabase, Cloud API, Docker |
| Battle load | No | Yes (local battles) |
| Scrolling stream mode | No | Yes (`lf top stream`) |
| Agent action logs | Yes | No |
| Keyboard sub-dashboards | Yes | No (mode toggle only) |

The two tools are complementary: use `lf` for agent-level triage and approvals; use `lf top` for infrastructure-level monitoring.

## Troubleshooting

**Terminal is too small / output wraps awkwardly.**
The TUI assumes ~80 columns of width. Resize the terminal and the next 2-second tick will redraw cleanly.

**Boxes show as `[42m HEALTHY [0m` literal characters.**
Your terminal is not interpreting ANSI escape sequences. Set `TERM=xterm-256color` (or another ANSI-aware value) before launching, or run inside a modern terminal emulator.

**Cursor stays hidden after exit.**
The dashboard hides the cursor on entry and restores it on a clean exit (`q`, `Esc`, `SIGINT`, `SIGTERM`). If a kill `-9` or terminal crash bypassed the cleanup, run `printf '\033[?25h'` or `reset` to restore it.

**Nothing happens when I press `a` / `b` / `s` / `m`.**
The dashboard spawns `lf` as a child process. If `lf` is not on `PATH` (for example when you ran the dashboard via `pnpm exec`), the child will fail to spawn. Install the CLI globally or invoke the dashboard from the same shell where `lf` resolves.

**No action logs appear.**
The active profile may not have credentials with read access to `agents.action_logs`. Sign in with `lf auth login` or attach an `access_token` to the profile via `lf profile create --token …`.

## Related

- [`lf top`](/en/reference/cli/top) — runtime telemetry dashboard (CPU, GPU, services, battles).
- [`lf profile`](/en/reference/cli/profile) — manage profiles the dashboard reads from.
- [`lf completion`](/en/reference/cli/completion) — shell completion for the subcommands the dashboard launches.
- [Using the Kill Switch](/en/how-to/kill-switch) — the same triage workflow without the TUI.
