---
title: CLI Reference
description: ConnectedLenses commands available in apps/cli today, plus the proposed team / schedule / approval surfaces. The CLI uses the same RPCs and DTOs as the web frontend.
---

# CLI Reference

The LenserFight CLI lives at [apps/cli/src/main.ts](../../apps/cli/src/main.ts) and ships as `lenserfight`. It uses [citty](https://github.com/unjs/citty) for command parsing and consumes the same Postgres RPCs and `@lenserfight/types` DTOs as the web frontend — there is no CLI-only business logic.

```bash
lenserfight <command> [subcommand] [flags]
```

This page lists every ConnectedLenses-relevant command. Commands that already exist link to source. Commands marked **Proposed** are in [Future work](#future-work).

## Existing top-level commands

The full list of subcommands registered in [main.ts](../../apps/cli/src/main.ts):

| Command | Source | ConnectedLenses-relevant? |
|---------|--------|---------------------------|
| `init` | [init.ts](../../apps/cli/src/commands/init.ts) | Project bootstrap |
| `doctor` | [doctor.ts](../../apps/cli/src/commands/doctor.ts) | Diagnostics |
| `dev` | [dev.ts](../../apps/cli/src/commands/dev.ts) | Local-dev orchestration |
| `seed` | [seed.ts](../../apps/cli/src/commands/seed.ts) | DB seed |
| `reset` | [reset.ts](../../apps/cli/src/commands/reset.ts) | DB reset |
| `status` | [status.ts](../../apps/cli/src/commands/status.ts) | Deployment status |
| `auth` | [auth.ts](../../apps/cli/src/commands/auth.ts) | Session login/logout |
| `config` | [config.ts](../../apps/cli/src/commands/config.ts) | CLI config |
| `setup` | [setup.ts](../../apps/cli/src/commands/setup.ts) | Bootstrap helpers |
| `lenser` | [lenser.ts](../../apps/cli/src/commands/lenser.ts) | **Yes** — agent lenser integration |
| `agent` | [main.ts:29](../../apps/cli/src/main.ts#L29) | Deprecated alias of `lenser` |
| `inspect` | [inspect.ts](../../apps/cli/src/commands/inspect.ts) | **Yes** — execution inspection |
| `run` | [run.ts](../../apps/cli/src/commands/run.ts) | **Yes** — execute lens / workflow |
| `publish` | [publish.ts](../../apps/cli/src/commands/publish.ts) | **Yes** — publish lens version |
| `lens` | [lens.ts](../../apps/cli/src/commands/lens.ts) | **Yes** — lens authoring |
| `lenses` | [lenses.ts](../../apps/cli/src/commands/lenses.ts) | **Yes** — lens listing/search |
| `lenser` | [lenser.ts](../../apps/cli/src/commands/lenser.ts) | **Yes** — identity ops |
| `providers` | [providers.ts](../../apps/cli/src/commands/providers.ts) | **Yes** — list AI providers |
| `models` | [models.ts](../../apps/cli/src/commands/models.ts) | **Yes** — list AI models |
| `gateway` | [gateway.ts](../../apps/cli/src/commands/gateway.ts) | **Yes** — execution gateway |
| `ai` | [ai.ts](../../apps/cli/src/commands/ai.ts) | **Yes** — AI catalog ops |
| `tag` | [tag.ts](../../apps/cli/src/commands/tag.ts) | Tag CRUD |
| `feed` | [feed.ts](../../apps/cli/src/commands/feed.ts) | Feed |
| `leaderboard` | [leaderboard.ts](../../apps/cli/src/commands/leaderboard.ts) | Leaderboard |
| `template` | [template.ts](../../apps/cli/src/commands/template.ts) | Workflow template scaffolding |
| `connectors` | [connectors.ts](../../apps/cli/src/commands/connectors.ts) | Connector metadata |
| `connect` | [connect.ts](../../apps/cli/src/commands/connect.ts) | Register connector |
| `invite` | [invite.ts](../../apps/cli/src/commands/invite.ts) | Invitations |
| `report` | [report.ts](../../apps/cli/src/commands/report.ts) | Reporting |
| `rubric` | [rubric.ts](../../apps/cli/src/commands/rubric.ts) | Rubric editing |
| `communities` | [communities.ts](../../apps/cli/src/commands/communities.ts) | Community ops |
| `battle` | [battle.ts](../../apps/cli/src/commands/battle.ts) | Battle ops |
| `tool` | [tool.ts](../../apps/cli/src/commands/tool.ts) | **Yes** — tool authoring, registry, assignments, invocations, approvals |
| `memory` | [memory.ts](../../apps/cli/src/commands/memory.ts) | **Yes** — memory profile + entry management |

## Lens commands

`lens` is grouped subcommands. Source: [apps/cli/src/commands/lens.ts](../../apps/cli/src/commands/lens.ts).

```bash
lenserfight lens <subcommand>
```

| Subcommand | Purpose |
|------------|---------|
| `version list` | List versions of a lens |
| `version create` | Create a new draft version |
| `version publish` | Publish a draft version |
| `resource attach` | Attach a resource (parameter binding via `lenses.tools`) |
| `import` | Import lens from external source |

Lens listing/search is the separate `lenses` command:

```bash
lenserfight lenses search <query>
lenserfight lenses filter --tag <slug> --sort newest|trending|popular
```

## Run commands

```bash
lenserfight run <subcommand>
```

Source: [apps/cli/src/commands/run.ts](../../apps/cli/src/commands/run.ts). Subcommand surface roughly mirrors `workflowsService.startRun` and the run-state projection.

The lenser integration uses citty and is documented at [docs/reference/cli/run.md](../cli/run).

## Inspect commands

```bash
lenserfight inspect <subcommand>
```

Source: [apps/cli/src/commands/inspect.ts](../../apps/cli/src/commands/inspect.ts). Wraps `fn_get_workflow_run_state` and `fn_get_run_provenance` to render the n8n-style inspector in the terminal.

## Lenser / Agent commands

```bash
lenserfight lenser <subcommand>
```

Source: [apps/cli/src/commands/lenser.ts](../../apps/cli/src/commands/lenser.ts). Documented at [docs/reference/cli/agent.md](../cli/agent). Subcommands: `connect`, `list`, `view`, `enable`, `remove`, `test`, `types`.

These are agent **lenser** commands — registering an external lenser (e.g. local Ollama, a remote MCP server) for an Agent Lenser. They are **not** team management commands.

## AI catalog commands

```bash
lenserfight providers list
lenserfight models list [--provider <key>] [--capability <tag>] [--modality <tag>]
lenserfight ai <subcommand>
```

Sources:

- [providers.ts](../../apps/cli/src/commands/providers.ts) — wraps `fn_ai_catalog_providers`.
- [models.ts](../../apps/cli/src/commands/models.ts) — wraps `fn_ai_catalog_models`.
- [ai.ts](../../apps/cli/src/commands/ai.ts) — additional catalog ops.

## Lenser commands

```bash
lenserfight lenser <subcommand>
```

Source: [apps/cli/src/commands/lenser.ts](../../apps/cli/src/commands/lenser.ts). Identity operations for human and agent lensers.

## Publish commands

```bash
lenserfight publish <subcommand>
```

Source: [apps/cli/src/commands/publish.ts](../../apps/cli/src/commands/publish.ts). Publishes lens versions via `fn_publish_lens_version`.

## Memory commands

Full spec: [memory-per-agent.md](./memory-per-agent#cli).

```bash
lenserfight memory list-profiles --agent <ai-lenser-id>
lenserfight memory list-entries  --profile <profile-id> [--scope project|conversation|global] [--limit 50]
lenserfight memory write-entry   --profile <profile-id> --scope project --source manual --content "..." [--confidence 0.8]
lenserfight memory redact <memory-entry-id> --reason "..."
lenserfight memory summarize     --profile <profile-id>
```

All list commands support `--json` for script-friendly output.

Source: [apps/cli/src/commands/memory.ts](../../apps/cli/src/commands/memory.ts)

## Tool commands (expanded)

Full spec: [tools.md](./tools#cli).

```bash
# Contract authoring
lenserfight tool test     <path/to/TOOL.md> [--json]
lenserfight tool register --file <path/to/TOOL.md> [--apply]

# Registry + assignments
lenserfight tool list [--registry|--assignments|--profiles] [--agent <id>]
lenserfight tool assign  --tool <tool-id> --agent <ai-lenser-id> [--profile <profile-id>]
lenserfight tool revoke  --tool <tool-id> --agent <ai-lenser-id>

# Runtime invocations
lenserfight tool invocations [--status pending|running|completed|failed] [--agent <id>] [--team-run <id>] [--limit 50]
lenserfight tool approve <invocation-id>
lenserfight tool reject  <invocation-id> --reason "<text>"
```

Source: [apps/cli/src/commands/tool.ts](../../apps/cli/src/commands/tool.ts)

## Future work

Three additional top-level commands are needed for full ConnectedLenses CLI parity. None exists today.

### `team` command (Proposed)

```bash
lenserfight team <subcommand>
```

| Subcommand | Maps to |
|------------|---------|
| `list` | `agentWorkspaceService.getWorkspaceBootstrap(handle).teams` |
| `create --ai-lenser <id> --name <name> [--description <text>]` | `agentWorkspaceService.createTeam` |
| `members --team <id>` | `agentWorkspaceService.listTeamMembers` |
| `add-member --team <id> --agent <id> --role <role> [--lane <n>]` | INSERT `agents.team_members` |
| `remove-member --member <id>` | DELETE `agents.team_members` |
| `edges --team <id>` | `agentWorkspaceService.listTeamEdges` |
| `add-edge --team <id> --source <member> --target <member> --type <edge_type> [--blocking]` | INSERT `agents.team_edges` |
| `assign --team <id> --workflow <id> [--approval-policy <json>]` | INSERT `agents.workflow_assignments` |
| `dispatch --assignment <id> [--inputs <json>]` | Manual team-run dispatch |
| `runs --ai-lenser <id> [--limit <n>]` | `agents.team_runs` recent |

### `schedule` command (Proposed)

```bash
lenserfight schedule <subcommand>
```

| Subcommand | Maps to |
|------------|---------|
| `list [--workflow <id>]` | [`fn_get_workflow_schedules`](../../supabase/migrations/20260428010000_ai_catalog_agent_control_room.sql#L692) |
| `inspect --schedule <id>` | Single-row read of `lenses.workflow_schedules` |
| `create --workflow <id> --cron <expr> --timezone <tz> --assignee-type agent\|team --assignee-id <id> [--inputs-template <json>] [--approval-policy <json>] [--retry-policy <json>] [--failure-policy <json>] [--queue-policy <json>] [--inactive]` | [`fn_upsert_workflow_schedule`](../../supabase/migrations/20260428010000_ai_catalog_agent_control_room.sql#L762) |
| `update --schedule <id> [...same flags as create]` | Same RPC with `p_schedule_id` |
| `pause --schedule <id>` | UPDATE `is_active=false` (or proposed `fn_pause_workflow_schedule`) |
| `resume --schedule <id>` | UPDATE `is_active=true` (or proposed `fn_resume_workflow_schedule`) |
| `delete --schedule <id>` | DELETE row |
| `history --schedule <id> [--limit <n>]` | Read of `last_run_at` / `last_completed_at` history |

### `approval` command (Proposed)

```bash
lenserfight approval <subcommand>
```

| Subcommand | Maps to |
|------------|---------|
| `list [--ai-lenser <id>]` | `agents.team_runs WHERE approval_status='pending'` (eventually `agents.approval_requests_v`) |
| `inspect --request <id>` | Single-row read with assignment join |
| `approve --request <id> [--reason <text>] [--modifications <json>]` | `fn_decide_approval` (proposed) |
| `reject --request <id> [--reason <text>]` | `fn_decide_approval` (proposed) |
| `audit --request <id>` | `agents.agent_run_events` for this team_run |

### `execution` command (Proposed)

A unified inspector across `workflow_runs` and `team_runs`:

```bash
lenserfight execution list [--ai-lenser <id>] [--status <status>]
lenserfight execution inspect --run <id>
lenserfight execution provenance --run <id>
lenserfight execution events --run <id> [--after <event-id>] [--follow]
lenserfight execution cancel --run <id>
lenserfight execution retry --run <id>
```

Maps to `workflowsService.getRunState`, `getRunProvenance`, `listRunEvents`, `updateRunStatus`.

## Authoring guidance

When adding a ConnectedLenses-related CLI command:

1. Use [citty](https://github.com/unjs/citty)'s `defineCommand` (matches existing pattern in [lens.ts](../../apps/cli/src/commands/lens.ts)).
2. Import service-layer methods from `@lenserfight/data-repositories`. Do not call Supabase directly.
3. Use `@lenserfight/types` for DTOs. Do not declare CLI-local request/response shapes.
4. Render output with [consola](https://github.com/unjs/consola) so the format matches the rest of the CLI.
5. Support `--json` flag on list commands so output is parseable in scripts.
6. Surface RPC errors with their SQLSTATE code (see [api-reference.md](./api-reference#error-model)).

## Related

- [API reference](./api-reference)
- [DTO reference](./dto-reference)
- [Workflow execution](./workflow-execution)
- [Existing CLI docs index](../cli/index)
