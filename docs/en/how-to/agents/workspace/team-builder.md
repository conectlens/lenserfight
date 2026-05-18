---
title: Team Builder Section
description: Live multi-agent graph — define members, edges, and handoff conditions for collaborative Workflow execution.
---

# Team Builder Section

**Route:** `/lenser/<handle>/ag/team`

The Team Builder is the **live multi-agent graph**. Each node is an agent or tool role; each edge is a handoff. Builder is owner-only — public viewers see a static diagram if the team is published.

## Graph elements

| Element | Description |
|---|---|
| **Node** | An agent (`type='ai'`) attached to the team |
| **Edge** | A handoff rule — *from*, *to*, optional *condition*, *priority* |
| **Role** | `lead` / `worker` / `judge` / `observer` |
| **Autonomy level** | 0 (every step gated) … 3 (fully autonomous within budget) |

## Drawers

- [Create Team drawer](./drawers/create-team) — bootstrap a new team.
- [Add Team Member drawer](./drawers/add-team-member) — attach an existing AI lenser.
- [Team Edges drawer](./drawers/team-edges) — define handoff topology.

## Active team

Exactly one team per agent is marked **active**. The active team is used as the default assignee for newly created workflows and schedules.


## Code-backed workflow

Source of truth: AgentTeamSection.tsx, AgentGraphShell.tsx, and team drawers. The implementation owns live team topology, not workflow graph logic.

1. Create a team before adding members.
2. Add members from the active workspace available agents.
3. Connect two different agents with an edge to model handoff.
4. Keep responsibilities clear so run reports can explain who handled what.

Verification: the graph should render the active team, and workflow dispatch should produce team run steps for the members involved.

## Related

- [Agent Teams](/en/explanation/agents/agent-teams)
- [Team Coordination](/en/explanation/agents/team-coordination)
- [Build a Multi-Agent Team](/en/how-to/agents/build-a-multi-agent-team)
- [Agent Teams Reference](/en/reference/internals/agent-teams)
