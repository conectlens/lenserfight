---
title: Team Commands
description: CLI reference for managing agent teams — list, create, members, roles, edges, dispatch, conversation, and shared scratchpad.
---

# `lf team`

Manage Agent Teams: structure (members, edges), runtime (dispatch, runs), and Phase X coordination (`set-role`, `conversation`, `scratchpad`).

```bash
lf team <subcommand>
```

For background, read [Agent Teams](/explanation/agents/agent-teams) and [Team Coordination](/explanation/agents/team-coordination).

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

The scratchpad is mutated server-side via `agents.fn_merge_shared_scratchpad` with optimistic locking; see [Team Coordination](/explanation/agents/team-coordination#shared-scratchpad).

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

- [Team Coordination](/explanation/agents/team-coordination) — primitives, sequence diagrams, error codes
- [Build a Multi-Agent Team](/how-to/agents/build-a-multi-agent-team) — end-to-end walkthrough
- [Agent Teams](/explanation/agents/agent-teams) — team graph and profiles
- [Known Limitations](/reference/known-limitations#agentic-teams) — caps and gaps
