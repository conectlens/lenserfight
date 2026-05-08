---
title: Completion Commands
description: CLI reference for installing shell completion for lf — bash, zsh, and fish are supported, with an idempotent installer.
---

# `lf completion`

Generate or install shell completion scripts for the `lf` (and `lenserfight`) command. Completion covers the top-level subcommand list (`agent`, `battle`, `schedule`, …); per-flag completion is not in scope for the current milestone.

See also: [`lf profile`](./profile.md) for managing CLI profiles, and [Operate LenserFight from the TUI dashboard](/how-to/operations/cli-dashboard).

## Supported shells

| Shell | Generator | Install target |
|---|---|---|
| bash | `lf completion bash` | appended to `~/.bashrc` |
| zsh | `lf completion zsh` | appended to `~/.zshrc` |
| fish | `lf completion fish` | written to `~/.config/fish/completions/lf.fish` |

Each generator emits a self-contained script prefixed with the sentinel comment `# lenserfight-completion`. The sentinel is what `lf completion install` checks for on subsequent runs to stay idempotent.

## `lf completion <shell>`

Print the completion script for the given shell to stdout. Pipe it to a file or `source` it directly.

```bash
# Print the script
lf completion bash
lf completion zsh
lf completion fish

# Source it once for the current shell session
source <(lf completion bash)
source <(lf completion zsh)

# Write it to a file you control
lf completion fish > ~/.config/fish/completions/lf.fish
```

The script is the same one `lf completion install` writes — running it manually is useful when you maintain your shell config in a dotfiles repo and want full control over placement.

## `lf completion install`

Install the completion script into the appropriate shell rc file. Idempotent.

```bash
lf completion install
lf completion install --shell zsh
lf completion install --shell bash --force
```

| Flag | Description |
|---|---|
| `--shell <name>` | One of `auto`, `bash`, `zsh`, `fish`. Default `auto`. |
| `--force` | Re-install even if the sentinel comment is already present. |

Behavior:

- `auto` resolves the shell from `$SHELL`. If `$SHELL` is unset or unrecognised, the command exits 1 — pass `--shell` explicitly.
- For bash and zsh, the script is **appended** to the rc file with a leading newline. The sentinel `# lenserfight-completion` guards against double-append.
- For fish, the script is **written** to a dedicated completion file at `~/.config/fish/completions/lf.fish`. The parent directory is created if missing.
- After install, reload your shell or run `source <rc-file>`.

## Troubleshooting

**Completion doesn't activate after install.**
For bash and zsh, the new block is appended but not loaded into the running shell. Run `source ~/.bashrc` (or `~/.zshrc`) or open a new terminal.

**`lf completion install` says it is already installed.**
The sentinel `# lenserfight-completion` was found in the rc file. Pass `--force` to re-append (useful after a CLI upgrade that changes the top-level command list).

**`auto` shell detection fails.**
The CLI inspects `$SHELL`. If you run from a non-interactive context (CI, cron) the variable may be empty. Pass `--shell bash|zsh|fish` explicitly.

**Completion shows commands that no longer exist.**
The completion script is a static snapshot of the top-level command list at install time. After upgrading `lf`, re-run `lf completion install --force`.

## Limitations

- Top-level subcommand completion only — per-subcommand flag completion (e.g. completing `--workflow` after `lf schedule create`) is intentionally out of scope.
- The script binds completion to both `lf` and `lenserfight` so either entry point works.
