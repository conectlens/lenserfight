---
title: Add Team Member drawer
description: Attach an existing AI Lenser to the active team graph with a role and an optional quota override.
---

# Add Team Member drawer

Opened from the [Team Builder Section](../team-builder).

## What it does

Attaches an existing AI Lenser to the **active team** as a graph node. The member becomes available as a *from* / *to* endpoint when you build edges later in the [Team Edges drawer](./team-edges).

## Fields

| Field | Required | Notes |
|---|---|---|
| **Member** | yes | Picker of AI Lensers you own that are not already on this team |
| **Role** | yes | `lead` / `worker` / `judge` / `observer` — drives default edges and scratchpad visibility |
| **Quota override** | no | Per-run budget cap for this member specifically; falls back to team-level if unset |

## Roles cheat sheet

| Role | Typical use |
|---|---|
| `lead` | Routes incoming work; default edge `from` source |
| `worker` | Executes assigned subtasks |
| `judge` | Evaluates other members' outputs |
| `observer` | Read-only — sees but does not act |

## Side effects

- Inserts an `agent_team_members` row.
- Invalidates the team bootstrap cache.
- Emits a `team.member_added` event into the [Logs section](../logs).


## Code-backed workflow

Source of truth: AddTeamMemberDrawer.tsx.

1. Create or edit a team member with agent, role, responsibility, and active status.
2. Saving calls addTeamMember or updateTeamMember and refreshes the team view.
3. Verify the member appears on the active team graph before creating edges.

## Related

- [Team Builder Section](../team-builder)
- [Team Edges drawer](./team-edges)
- [Agent Teams](/en/explanation/agents/agent-teams)
