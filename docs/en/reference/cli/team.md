---
title: Team Commands
description: CLI reference for managing agent teams — list, create, members, roles, edges, dispatch, conversation, and shared scratchpad.
---

# `lf team`

Manage Agent Teams: structure (members, edges), runtime (dispatch, runs), and Phase X coordination (`set-role`, `conversation`, `scratchpad`).

```bash
lf team <subcommand>
```

For background, read [Agent Teams](/en/explanation/agents/agent-teams) and [Team Coordination](/en/explanation/agents/team-coordination).

---

## Structure

| Subcommand | Purpose |
|---|---|
| `list` | List teams owned by an AI workspace. |
| `create` | Create a new team. |
| `inspect` | Bootstrap dump — teams, members, edges, runs, profiles, assignments. |
| `members` | List members of a team. |
| `add-member` | Add an agent to a team. |
| `remove-member` | Remove a member from a team. |
| `set-role` | Update a member role (Phase X). |
| `edges` | List typed edges in a team graph. |
| `add-edge` | Add a typed edge between two members. |

## Runtime

| Subcommand | Purpose |
|---|---|
| `assign` | Bind a workflow to a team or agent. |
| `dispatch` (alias `run`) | Manually dispatch a workflow assignment as a team run. |
| `runs` | List recent team runs. |
| `conversation` | Show the threaded message log for a team run (Phase X). |
| `scratchpad` | Show the shared scratchpad and version for a team run (Phase X). |

---

## `lf team conversation`

Render the threaded inter-agent message log for a team run. Reads `agents.v_team_run_conversation`, which reconstructs parent/child chains via recursive CTE (depth-bounded at 50).

```bash
lf team conversation <run-id>
lf team conversation <run-id> --limit 200
lf team conversation <run-id> --json
```

| Argument / flag | Description |
|---|---|
| `<run-id>` | Required. Team run UUID. |
| `--limit <n>` | Max rows. Default 100. |
| `--json` | Output raw rows as JSON. |

Output format (table mode):

```text
[12:04:07] a1b2c3d4→e5f6g7h8: task_request — {"step":"summarize","input":"..."}
  [12:04:11] e5f6g7h8→a1b2c3d4: task_response — {"summary":"..."}
[12:04:14] a1b2c3d4→all: info — {"status":"summary ready"}
```

Indentation reflects thread depth. `to=all` means broadcast (`to_agent_id IS NULL`).

---

## `lf team scratchpad`

Show the shared scratchpad JSON and its version for a team run.

```bash
lf team scratchpad <run-id>
lf team scratchpad <run-id> --json
```

| Argument / flag | Description |
|---|---|
| `<run-id>` | Required. Team run UUID. |
| `--json` | Print only the raw `shared_scratchpad` document. |

The scratchpad is mutated server-side via `agents.fn_merge_shared_scratchpad` with optimistic locking; see [Team Coordination](/en/explanation/agents/team-coordination#shared-scratchpad).

---

## `lf team set-role`

Update a team member's role.

```bash
lf team set-role <member-id> <role>
```

| Argument | Description |
|---|---|
| `<member-id>` | Required. `agents.team_members.id` UUID. |
| `<role>` | Required. One of `leader`, `executor`, `reviewer`, `observer`, `operator`. |

The role is validated client-side before the PATCH and again by the `team_members_role_check` CHECK. Any other value is rejected with a non-zero exit code.

::: tip Reviewer role
At least one active member with role `reviewer` flips `agents.fn_node_requires_review` to `true` for any run on this team — the execution engine gates node completion accordingly.
:::

---

## Examples

```bash
# Promote one member, demote another
lf team set-role 4f3a... leader
lf team set-role 7c1b... executor

# Trigger a run, then watch it
lf team run --assignment <id> --ai-lenser <id> \
  --team-id <id> --workflow-id <id>
lf team conversation <run-id>
lf team scratchpad <run-id>
```

---

## Related

- [Team Coordination](/en/explanation/agents/team-coordination) — primitives, sequence diagrams, error codes
- [Build a Multi-Agent Team](/en/how-to/agents/build-a-multi-agent-team) — end-to-end walkthrough
- [Agent Teams](/en/explanation/agents/agent-teams) — team graph and profiles
- [Known Limitations](/en/reference/known-limitations#agentic-teams) — caps and gaps

<!-- AUTO-GEN-START -->

# `lf team`

Manage agent teams (ConnectedLenses team domain).

## `lf team list`

List teams owned by an AI workspace.

| Flag | Type | Required | Description |
|---|---|---|---|
| `--ai-lenser` | string | yes | AI Lenser UUID (agents.ai_lensers.id) |
| `--json` | boolean | no | Output as JSON |

## `lf team create`

Create a new team for an AI workspace.

| Flag | Type | Required | Description |
|---|---|---|---|
| `--ai-lenser` | string | yes | AI Lenser UUID (owner of the team) |
| `--name` | string | yes | Team name |
| `--description` | string | no | Team description |
| `--template` | string | no |  |

## `lf team inspect`

Fetch the agent workspace bootstrap for a profile handle.

| Flag | Type | Required | Description |
|---|---|---|---|
| `<handle>` | positional | yes | AI lenser handle |

## `lf team members`

List members of a team.

| Flag | Type | Required | Description |
|---|---|---|---|
| `--team` | string | yes | Team UUID |
| `--json` | boolean | no | Output as JSON |

## `lf team add-member`

Add an agent to a team.

| Flag | Type | Required | Description |
|---|---|---|---|
| `--team` | string | yes | Team UUID |
| `--agent` | string | yes | Agent (AI Lenser) UUID |
| `--role` | string | no | Member role |
| `--responsibility` | string | no | Responsibility text |
| `--lane` | string | no | Parallel lane index |
| `--sort-order` | string | no | Sort order within lane |
| `--personality-profile` | string | no | Personality profile UUID |
| `--memory-profile` | string | no | Memory profile UUID |
| `--tool-profile` | string | no | Tool profile UUID |
| `--model-profile` | string | no | Model profile UUID |

## `lf team remove-member`

Remove a member from a team.

| Flag | Type | Required | Description |
|---|---|---|---|
| `--member` | string | yes | Team Member UUID |

## `lf team set-role`

Update a team member role (leader|executor|reviewer|observer|operator).

| Flag | Type | Required | Description |
|---|---|---|---|
| `<member-id>` | positional | yes | Team member UUID |
| `<role>` | positional | yes | New role |

## `lf team edges`

List edges of a team graph.

| Flag | Type | Required | Description |
|---|---|---|---|
| `--team` | string | yes | Team UUID |
| `--json` | boolean | no | Output as JSON |

## `lf team add-edge`

Add a typed edge between two team members.

| Flag | Type | Required | Description |
|---|---|---|---|
| `--team` | string | yes | Team UUID |
| `--source` | string | yes | Source team member UUID |
| `--target` | string | yes | Target team member UUID |
| `--type` | string | no | Edge type: delegates | reviews | reports_to | shares_context | handoff |
| `--blocking` | boolean | no | Mark edge as blocking (source waits on target) |

## `lf team assign`

Bind a workflow to a team or agent (workflow_assignment).

| Flag | Type | Required | Description |
|---|---|---|---|
| `--ai-lenser` | string | yes | AI Lenser UUID that owns the assignment |
| `--workflow` | string | yes | Workflow UUID |
| `--assignee-kind` | string | no | agent | team |
| `--assignee-id` | string | yes | Agent or team UUID |
| `--approval-policy` | string | no | JSON object |
| `--retry-policy` | string | no | JSON object |
| `--failure-policy` | string | no | JSON object |
| `--queue-policy` | string | no | JSON object |

## `lf team dispatch`

Manually dispatch a workflow assignment as a team run.

| Flag | Type | Required | Description |
|---|---|---|---|
| `--assignment` | string | yes | Workflow assignment UUID |
| `--ai-lenser` | string | yes | AI Lenser UUID |
| `--team-id` | string | no | Team UUID (when assignment targets a team) |
| `--workflow-id` | string | yes | Workflow UUID (must match assignment) |
| `--metadata` | string | no | JSON object passed as team_runs.metadata (e.g. inputs, gate context) |

## `lf team dispatch`

Manually dispatch a workflow assignment as a team run.

| Flag | Type | Required | Description |
|---|---|---|---|
| `--assignment` | string | yes | Workflow assignment UUID |
| `--ai-lenser` | string | yes | AI Lenser UUID |
| `--team-id` | string | no | Team UUID (when assignment targets a team) |
| `--workflow-id` | string | yes | Workflow UUID (must match assignment) |
| `--metadata` | string | no | JSON object passed as team_runs.metadata (e.g. inputs, gate context) |

## `lf team runs`

List recent team runs for an AI workspace.

| Flag | Type | Required | Description |
|---|---|---|---|
| `--ai-lenser` | string | yes | AI Lenser UUID |
| `--limit` | string | no | Max rows (default 20) |
| `--json` | boolean | no | Output as JSON |

## `lf team conversation`

Show the threaded message conversation for a team run.

| Flag | Type | Required | Description |
|---|---|---|---|
| `<run-id>` | positional | yes | Team run UUID |
| `--limit` | string | no | Max rows (default 100) |
| `--json` | boolean | no | Output as JSON |

## `lf team scratchpad`

Show the shared scratchpad and version for a team run.

| Flag | Type | Required | Description |
|---|---|---|---|
| `<run-id>` | positional | yes | Team run UUID |
| `--json` | boolean | no | Output the raw JSON document |

<!-- AUTO-GEN-END -->
