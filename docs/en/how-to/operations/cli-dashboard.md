---
title: "Operate LenserFight from the TUI dashboard"
description: "Open the lf TUI dashboard, read its profile/health header and action-log tail, and use the ':' command bar to run any command with live autocomplete."
---

# Operate LenserFight from the TUI dashboard

The `lf` command, run with no subcommand, opens an interactive terminal dashboard. Use it for quick triage — checking which profile is active, whether the platform is reachable, and what your agents have done in the last few minutes — and as a launchpad for running any command without leaving the dashboard.

## Open the dashboard

```bash
lf
```

The dashboard takes over the current terminal (alternate screen buffer). Press `q` or `Esc` to exit; the cursor and your regular scrollback are restored.

The dashboard respects the active CLI profile and the [profile resolution order](/en/reference/cli/profile#profile-resolution-order). To inspect a different backend, switch first:

```bash
LF_PROFILE=staging lf
# or
lf profile use staging && lf
```

**Non-interactive output.** When stdout or stdin is not a TTY (piped, redirected, or run in CI), the dashboard renders a single static frame and exits instead of waiting for keyboard input:

```bash
lf < /dev/null
```

**Small terminals.** If the terminal is smaller than roughly 60 columns by 15 rows, the dashboard renders a simplified plain-text summary instead of the full layout.

## Layout tour

1. **Health panel.** Brand, the active profile name, and a colored health badge (`HEALTHY` green or `DOWN` red), plus an agent workspace banner when one is selected ([`lf agents use`](/en/reference/cli/agent-lifecycle)).
2. **Recent agent logs.** Up to 10 rows from `agents.action_logs`, newest first, showing time, action type, and a truncated payload preview.
3. **Recent commands.** The last few commands you ran from the `:` command bar this session, with a pass/fail indicator.
4. **Key-binding footer** and, when open, the `:` command bar.

## The `:` command bar

Press `:` to open the command bar. Suggestions are generated live from the CLI's own command tree — every real command is reachable, and newly added commands show up automatically without a docs update.

| Key | Action |
|---|---|
| `:` | Open the command bar. |
| *(type)* | Filter suggestions (prefix matches rank first). |
| `Tab` / `↑` / `↓` | Cycle through suggestions. |
| `Enter` | Run the highlighted suggestion, or the typed command if none is selected. |
| `Esc` | Close the command bar without running anything. |

Commands run **in-process** — the dashboard does not spawn a `lf` subprocess. Every command still enforces its own `--confirm` and safety gates exactly as it would from a plain shell invocation; nothing is bypassed. After a command finishes, its output stays on screen with a "press q / Enter to return" prompt, then the dashboard re-renders with the updated action log and recent-commands list.

A command that exits with an error does not crash the dashboard — you're returned to the live view, ready to try again.

## Key bindings

| Key | Action |
|---|---|
| `:` | Command bar (live autocomplete over the full command tree). |
| `q` / `Esc` / `Ctrl-C` | Quit and restore the cursor. |
| `g` `w` `e` `k` `a` `b` `s` `m` `l` `f` | Domain quick-keys (agents, workflows, execute, configure, approvals, battles, schedules, memory, lensers, feed) — currently show a "not yet implemented in this build" notice. Per-domain drill-down screens are planned for a follow-up release; use `:` to run any command from that domain directly in the meantime. |

## When to use it

- Quick triage during an incident — confirm the platform is up and skim the latest action logs in one place.
- Pre-flight check before kicking off a scheduled workflow — verify that the active profile matches the environment you intend to mutate.
- Running one-off commands without recalling exact subcommand names — type a few characters into the `:` bar and pick from the live suggestions.

The dashboard is not built for long stares. It re-renders every 2 seconds; staring at it for an hour will scroll your scrollback into oblivion. For long-running observation, prefer:

- [`lf top`](/en/reference/cli/top) — dedicated real-time telemetry: CPU, memory, GPU, service health, battle load, and rolling graphs.
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
| Command bar (run any command) | Yes | No |
| Agent action logs | Yes | No |

The two tools are complementary: use `lf` for agent-level triage and running commands; use `lf top` for infrastructure-level monitoring.

## Troubleshooting

**Terminal is too small / output wraps awkwardly.**
Resize the terminal above roughly 60x15; the dashboard falls back to a plain-text summary below that threshold and returns to the full layout once it's large enough.

**Boxes show as `[42m HEALTHY [0m` literal characters.**
Your terminal is not interpreting ANSI escape sequences. Set `TERM=xterm-256color` (or another ANSI-aware value) before launching, or run inside a modern terminal emulator.

**Cursor stays hidden after exit.**
The dashboard hides the cursor on entry and restores it on a clean exit (`q`, `Esc`, `SIGINT`, `SIGTERM`). If a kill `-9` or terminal crash bypassed the cleanup, run `printf '\033[?25h'` or `reset` to restore it.

**Nothing happens when I press `a` / `b` / `s` / `m` / `g` / `w` / `e` / `k` / `l` / `f`.**
These domain quick-keys are placeholders in this build — per-domain drill-down is planned for a follow-up release. Use `:` followed by the command name instead (for example `:battle list`).

**No action logs appear.**
The active profile may not have credentials with read access to `agents.action_logs`. Sign in with `lf auth login` or attach an `access_token` to the profile via `lf profile create --token …`.

## Related

- [`lf top`](/en/reference/cli/top) — runtime telemetry dashboard (CPU, GPU, services, battles).
- [`lf profile`](/en/reference/cli/profile) — manage profiles the dashboard reads from.
- [`lf completion`](/en/reference/cli/completion) — shell completion for commands you can also reach from the `:` command bar.
- [Migrating from `lf assist`](/en/reference/cli/migration-assist-to-tui) — what changed if you used the removed `assist` command.
- [Using the Kill Switch](/en/how-to/kill-switch) — the same triage workflow without the TUI.
