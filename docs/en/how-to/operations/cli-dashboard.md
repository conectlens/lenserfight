---
title: "Operate LenserFight from the interactive shell"
description: "Open the lf interactive shell, run any command directly from its transcript-and-input loop, and use history, completion, and the fuzzy palette to find commands fast."
---

# Operate LenserFight from the interactive shell

The `lf` command, run with no subcommand, opens a Claude Code–style interactive shell: a
single scrollable transcript of everything you've run, with a persistent input at the
bottom. There is no sidebar, no per-domain screens, and no menu navigation — every `lf`
command and subcommand is executable directly by typing it, exactly as it would run from
a plain shell.

## Open the shell

```bash
lf
```

The shell takes over the current terminal (alternate screen buffer). Type `/quit`, or
press `Ctrl+C` with nothing running, to exit; the cursor and your regular scrollback are
restored.

The shell respects the active CLI profile and the [profile resolution order](/en/reference/cli/profile#profile-resolution-order). To inspect a different backend, switch first:

```bash
LF_PROFILE=staging lf
# or
lf profile use staging && lf
```

**Non-interactive output.** When stdout or stdin is not a TTY (piped, redirected, or run in CI), a single static status frame is printed instead of waiting for keyboard input:

```bash
lf < /dev/null
```

**Small terminals.** If the terminal is smaller than roughly 60 columns by 15 rows, a simplified plain-text summary is shown instead of the full layout.

## Layout

1. **Transcript.** Every command you've run, its output, and its result, from oldest to newest — a real, persistent scrollback, not a screen that gets wiped between commands.
2. **Status line.** One compact line above the input: active profile, health, current working directory, running-job count, and pending-approval count. It never competes with the input for space.
3. **Input.** Always focused after a command finishes. Type a command name, a `/` shell control, or a `!` shell-out and press Enter.

A captured session (`lf`, then `doctor`, then `/quit`) looks like this:

```text
 ● LenserFight CLI v1.2.0
   Type a command, or /help for a shortcut reference. Ctrl+C to quit.

 profile e2e-sweep · ● healthy · ~/projects/lenserfight
 ❯ doctor

   ✔ All requested checks passed.
   ✔ Operator Lenser: "All systems nominal. Ship with confidence."
 ✓ done in 35ms

 profile e2e-sweep · ● healthy · ~/projects/lenserfight
 ❯ /quit
```

## Running commands

Type any command name — case, a leading `lf`/`lenserfight`, and a leading `/` are all
normalized before dispatch, so `AGENTS`, `agents`, `/agents`, and `lf agents` all resolve
to the same command:

```text
❯ agents list
❯ AGENTS list
❯ /agents list
❯ lf agents list
```

All four run identically. This normalization happens against the CLI's own command tree
— the same canonical registry used for routing a plain `lf <command>` invocation — so a
newly added command is reachable here automatically, with no separate dashboard-specific
wiring to keep in sync.

Commands run through the exact same routing, arg parsing, and `--confirm`/safety gate as
a plain terminal invocation; nothing is bypassed. Output streams into the transcript as
the command produces it — long-running commands (workflow streaming, battle execution)
show live progress instead of going silent until they finish.

### History and search

| Key | Action |
|---|---|
| `↑` / `↓` | Recall previous commands. Retry a failed command by recalling it and pressing Enter again. |
| `Ctrl+R` | Reverse-search history — type to filter, `↑`/`↓` to move, `Enter` to fill the input. |
| `/history` | List recently typed commands in the transcript. |

### Completion and discovery

| Key | Action |
|---|---|
| `Tab` | Complete the command name being typed. |
| *(type)* | Matching commands are suggested inline below the input as you type. |
| `Ctrl+K` | Open a fuzzy searchable command palette across the full command tree. Selecting an entry fills the input — it doesn't dispatch immediately, so you can still add arguments. |

A command that doesn't match anything shows the invalid token and the closest valid
alternatives ("did you mean…") instead of a bare failure.

### Cancellation

`Ctrl+C` while a command is running cancels that command and returns focus to the input
— it does not exit the shell. `Ctrl+C` with nothing running exits the shell.

### Errors

By default, a failed command shows a concise, human-readable cause and a recovery hint
— never a raw stack trace. Pass `--debug` on launch, or run `/debug` inside the shell to
toggle it for the rest of the session, to see full diagnostic detail on failures.

## Local shell access

Prefix a line with `!` to run it as a real shell command instead of an `lf` command:

```text
❯ !git status
❯ !ls -la
❯ !cd ..
```

- The exact command is echoed before it runs.
- The working directory persists across `!` commands, including `!cd` (a spawned shell's
  own `cd` never persists back to the parent process, so it's tracked and applied
  directly).
- stdout and stderr stream separately, and the exit code is reported.
- Commands matching common destructive patterns (`rm -rf`, `git push --force`,
  `git reset --hard`, `git clean -f`, `DROP TABLE`, …) require confirmation before
  running.

## Shell-only controls

These are handled by the shell itself, not dispatched as `lf` subcommands:

| Command | Action |
|---|---|
| `/help` | Open a searchable keyboard-shortcut and command-discovery reference. |
| `/clear` | Clear the transcript. |
| `/history` | Show recently typed commands. |
| `/status` | Run the real `status` command. |
| `/settings` | Run the real `configure` command. |
| `/debug` | Toggle full error detail for the rest of the session. |
| `/quit` | Exit the shell. |

## When to use it

- Running a sequence of commands without leaving the shell to retype `lf` each time, with
  a real transcript of what you ran and what it returned.
- Quick triage during an incident — confirm the platform is up and skim recent activity
  in one place, then run whatever follow-up command the situation calls for, in place.
- Pre-flight check before kicking off a scheduled workflow — verify the active profile in
  the status line matches the environment you intend to mutate.
- Discovering commands you don't remember the exact name for — start typing, or open
  `Ctrl+K`, and pick from live suggestions.

For long unattended observation, prefer a dedicated telemetry view instead of staring at
the shell:

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

Key differences from the interactive shell:

| Feature | `lf` (no subcommand) | `lf top` |
|---|---|---|
| Refresh cadence | 2 seconds | 1 second (configurable) |
| CPU/memory bars | No | Yes |
| GPU detection | No | Yes (NVIDIA via `nvidia-smi`) |
| Service health probes | Supabase only | Ollama, Supabase, Cloud API, Docker |
| Battle load | No | Yes (local battles) |
| Run any command in place | Yes | No |
| Persistent command transcript | Yes | No |

The two tools are complementary: use `lf` to run commands and read their output; use `lf top` for infrastructure-level monitoring.

## Troubleshooting

**Terminal is too small / output wraps awkwardly.**
Resize the terminal above roughly 60x15; below that threshold a plain-text summary is shown instead of the full layout, and the full layout returns once it's large enough.

**Boxes show as `[42m HEALTHY [0m` literal characters.**
Your terminal is not interpreting ANSI escape sequences. Set `TERM=xterm-256color` (or another ANSI-aware value) before launching, or run inside a modern terminal emulator.

**Cursor stays hidden after exit.**
The shell hides the cursor on entry and restores it on a clean exit (`/quit`, `Ctrl+C`, `SIGINT`, `SIGTERM`). If a kill `-9` or terminal crash bypassed the cleanup, run `printf '\033[?25h'` or `reset` to restore it.

**A command I ran needs interactive login/confirmation and seems stuck.**
Commands that prompt (e.g. `lf auth login` without `--no-browser`, or a destructive command's typed-phrase confirmation) take over stdin for that prompt, same as running them from a plain terminal — this is expected, not a hang. `Ctrl+C` cancels it.

**No recent activity appears.**
The active profile may not have credentials with read access. Sign in with `lf auth login` or attach an `access_token` to the profile via `lf profile create --token …`.

## Related

- [`lf top`](/en/reference/cli/top) — runtime telemetry dashboard (CPU, GPU, services, battles).
- [`lf profile`](/en/reference/cli/profile) — manage profiles the shell reads from.
- [`lf completion`](/en/reference/cli/completion) — shell completion for commands you can also reach with `Tab`/`Ctrl+K` inside `lf` itself.
- [Migrating from `lf assist`](/en/reference/cli/migration-assist-to-tui) — what changed if you used the removed `assist` command.
- [Using the Kill Switch](/en/how-to/kill-switch) — the same triage workflow without the interactive shell.
