---
title: Build a Multi-Agent Team
description: Wire two or more AI Lensers into a coordinated team — assign roles, dispatch a team run, and inspect messages and the shared scratchpad from the CLI.
---

# Build a Multi-Agent Team

This walkthrough takes an existing team with at least two members and exercises the Phase X coordination primitives end to end: roles, conversation, shared scratchpad.

For background on the primitives, read [Team Coordination](/en/explanation/agents/team-coordination) first.

---

## Prerequisites

- A row in `agents.teams` you own (via the AI Lenser's owner).
- At least **two** rows in `agents.team_members` for that team — both `is_active = true`.
- A workflow that can be dispatched against the team. See [Agent Teams](/en/explanation/agents/agent-teams) for the team-creation path; `lf team create` and `lf team add-member` work too.
- The CLI authenticated for the owner (`lf auth login`).

::: tip Inspect first
Run `lf team inspect <handle>` (where `<handle>` is the AI Lenser handle) to dump the workspace bootstrap — teams, members, edges, and recent runs in one round trip.
:::

---

## Step 1 — Assign roles

Pick one member to lead and at least one to execute. Update `team_members.role` via the CLI:

```bash
# leader can delegate; executor runs assigned sub-tasks
lf team set-role <leader-member-id> leader
lf team set-role <executor-member-id> executor
```

Allowed values: `leader`, `executor`, `reviewer`, `observer`, `operator`. Any other value is rejected client-side, and the database CHECK will reject it server-side as well.

::: tip Add a reviewer
A team member with role `reviewer` flips `agents.fn_node_requires_review` to `true` for any team run on this team. The execution engine consults this before completing a node, so reviewer-staffed teams gate completion implicitly.
:::

---

## Step 2 — Trigger a team run

Use the existing dispatch path:

```bash
lf team run \
  --assignment <workflow-assignment-id> \
  --ai-lenser <ai-lenser-id> \
  --team-id <team-id> \
  --workflow-id <workflow-id> \
  --metadata '{"inputs":{"prompt":"Summarize quarterly results"}}'
```

The command inserts a `team_runs` row with status `queued`. The engine claims it on the next dispatch tick.

You can also dispatch from a workflow lenser or a CRON schedule — any path that produces a `team_runs` row works.

---

## Step 3 — Watch the conversation

Once agents start exchanging messages, view the threaded log:

```bash
lf team conversation <team-run-id>
```

Each line shows `[time] from→to: kind — payload-preview`, indented by thread depth (parent → child). Pass `--json` for the raw rows:

```bash
lf team conversation <team-run-id> --json
```

The view is bounded at depth 50 and ordered by `occurred_at` ascending. To narrow output, use `--limit`.

---

## Step 4 — Read the scratchpad

The shared scratchpad is the team's working memory for the run:

```bash
lf team scratchpad <team-run-id>
```

Output:

```text
Version: 3
Scratchpad:
{
  "draft_summary": "...",
  "review_notes": "..."
}
```

Use `--json` to print the raw document only.

---

## Step 5 (optional) — Merge into the scratchpad

The merge entry point is the SQL RPC `agents.fn_merge_shared_scratchpad`. There is no dedicated CLI command yet; if your agent runtime does not call it directly, use SQL:

```sql
SELECT agents.fn_merge_shared_scratchpad(
  '<team-run-id>'::uuid,
  '{"review_notes":"approved by reviewer"}'::jsonb,
  3   -- expected current version
);
```

On success the function returns the new document and version. If another writer beat you to it, Postgres raises `ERRCODE 40001` and your transaction must re-read the version and retry.

::: tip Merge semantics
The patch is applied with `||`. Top-level keys overwrite; nested objects are not deep-merged. To preserve siblings inside a nested object, read the current value, merge in your process, and write the full sub-object back.
:::

---

## Troubleshooting

### `40001 scratchpad_version_conflict`

Two writers raced. Re-read `shared_scratchpad_version`, recompute your patch, and call the RPC again. Wrap retries in a bounded loop.

### `54000 team_messages_cap_exceeded`

The team run hit the 1000-message cap. The bus is intentionally bounded; existing messages survive but new sends fail. Either close out the run or coordinate with an operator to bump the constant in `agents.fn_enforce_team_messages_cap()`.

### `team_members_role_check` violation

A `set-role` call landed a value outside `('leader','executor','reviewer','observer','operator')`. Use one of the five canonical values.

---


## Code-backed workflow

Source of truth: libs/features/agents/src/lib/components/sections/AgentTeamSection.tsx plus the team drawers under libs/features/agents/src/lib/components/drawers. Builder edits are persisted through agentWorkspaceService mutations for teams, members, and edges.

1. Create the team first so every node and edge has a stable team id.
2. Add members from agents owned by the active workspace. Direct member addition and drawer-based member creation both refresh the workspace bootstrap.
3. Connect members with edges only after both endpoints exist. The UI rejects self-connections.
4. Keep one active team in focus before dispatching a workflow assignment.

Verification: open [Team Builder](./workspace/team-builder), confirm members and edges, then run a workflow and inspect [Runs](./workspace/runs).

## Related

- [Team Coordination](/en/explanation/agents/team-coordination) — primitives and sequence diagrams
- [Agent Teams](/en/explanation/agents/agent-teams) — team graph and configuration profiles
- [`lf team` reference](/en/reference/cli/team) — full CLI surface
- [Known Limitations](/en/reference/known-limitations#agentic-teams) — caps and gaps
