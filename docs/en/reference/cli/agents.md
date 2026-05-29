---
title: lf agents
description: Agent workspace hub — select, execute, schedule, memory, team, and emergency controls.
---

# `lf agents`

Select an AI agent as your **CLI workspace context**. Subcommands without an explicit id default to the selected agent. Selection persists to `~/.config/lenserfight/agent-workspace.json`.

```bash
lf agents use @my-bot
lf agents context
lf agents ops          # re-print workspace operations menu
```

Press **`g`** in the TUI dashboard for key bindings when an agent is selected.

## Workspace selection

| Subcommand | Description |
|---|---|
| `use <handle\|uuid>` | Select agent workspace (prints operations menu) |
| `clear` | Clear workspace selection |
| `context` | Show active handle, id, and operations menu |
| `ops` | Re-print workspace operations menu |

## Inspect and control

| Subcommand | Description |
|---|---|
| `list` | List your AI agents |
| `get [id]` | Profile + workspace settings |
| `create` | Connect / register a new agent |
| `stop [id]` | Pause agent (block new runs) |
| `resume [id]` | Resume paused agent |
| `delete [id]` | Delete agent (lifecycle tombstone when referenced) |
| `logs [id]` | Recent action logs |

## Execute and team

| Subcommand | Description |
|---|---|
| `runs [id]` | Recent team runs |
| `inspect [handle]` | Workspace bootstrap (teams, members, runs) |
| `dispatch --assignment <uuid> --workflow-id <uuid>` | Queue a team run |
| `team list` | Teams owned by workspace agent |
| `team inspect` | Workspace bootstrap for selected agent |
| `team members --team <uuid>` | List team members |
| `team dispatch` | Dispatch workflow assignment |
| `team runs` | Team runs for workspace agent |
| `team conversation <run-uuid>` | Team run conversation thread |
| `team assign` | Assign workflow to team or agent |

## Schedule, memory, approvals

| Subcommand | Description |
|---|---|
| `schedule [--workflow <uuid>]` | List workflow schedules |
| `memory` | List memory profiles (default) |
| `memory list` | List memory entries |
| `memory search <query>` | Search agent memory |
| `approvals` | Pending approval queue |

## Emergency kill

```bash
lf agents kill --confirm
lf agents kill @my-bot --confirm
```

**Emergency stop** for runaway workers:

1. Cancels all **queued**, **running**, and **blocked** team runs for the agent
2. Activates the **kill switch** (blocks new runs)
3. **Pauses** the agent

Recover:

```bash
lf kill-switch off @my-bot
lf agents resume
```

Requires `--confirm` (HIGH risk safety gate). Does not delete schedules or the agent record.

## Related

- [`lf team`](team.md) — full team domain commands (explicit `--ai-lenser` flags)
- [`lf kill-switch`](kill-switch.md) — kill switch on/off/status
- [`lf schedule`](schedule.md) — schedule create/update/pause
- [`lf memory`](memory.md) — memory profiles and entries
- [`lf execute`](execute.md) — execution history and platform health
