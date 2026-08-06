# Migrating from `lf assist`

The `lf assist` command — an interactive agent session built on the OpenCode runtime — has been removed. This page explains what changed and where to go instead.

## What changed

- **`lf assist` is gone.** There is no replacement subcommand; running `lf assist` now prints an "unknown command" error.
- **Bare `lf` opens the TUI dashboard again.** Running `lf` with no subcommand opens the interactive [terminal dashboard](/en/how-to/operations/cli-dashboard) — a health/profile panel, a recent-activity log, and a `:` command bar with live autocomplete over every CLI command.
- **The OpenCode integration is fully removed** — the plugin bridge (`libs/adapters/opencode`), `.opencode/opencode.json` generation, and the `@opencode-ai/plugin` dependency are gone. Nothing in this codebase spawns the `opencode` binary anymore.

## If you used `lf assist` for exploration

Use the TUI dashboard's `:` command bar instead. Press `:`, start typing a command name, and pick from the live suggestions — the same discovery workflow `assist` offered, without a model in the loop:

```bash
lf
# press ':', type a few characters, Enter to run
```

Every command still enforces its own `--confirm`/safety gates exactly as it would from a plain shell invocation.

## If you used `lf assist` for agent-driven workflows

Use the [MCP server integration](/en/reference/mcp-server/index) (`apps/mcp-server`) instead. It exposes LenserFight's lens, battle, and workflow operations as MCP tools that any MCP-capable agent client (Claude Code, Claude Desktop, and others) can call directly — the same command surface `assist` wrapped, without an extra CLI-spawning layer in between.

## Related

- [Operate LenserFight from the TUI dashboard](/en/how-to/operations/cli-dashboard)
- [CLI Getting Started](/en/tutorials/cli/cli-getting-started)
- [MCP Server Setup](/en/reference/mcp-server/setup)
