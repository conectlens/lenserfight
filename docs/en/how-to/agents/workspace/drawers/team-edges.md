---
title: Team Edges drawer
description: Create and delete directed handoff edges between team members — source, target, edge type, and optional blocking flag.
---

# Team Edges drawer

Opened from the [Team Builder Section](../team-builder).

## What's an edge?

An **edge** says: *"after member A's step completes, pass execution (and output) to member B."* Edges are the wiring of a multi-agent execution graph.

## Fields (Add edge form)

| Field | Notes |
|---|---|
| **Source member** | The member that initiates the handoff. Identified by role + lane |
| **Target member** | The member that receives the handoff. Must differ from source |
| **Edge type** | Semantic label — see table below |
| **Blocking** | When checked, the run halts at this edge until the target step completes |

## Edge types

| Type | Meaning |
|---|---|
| `delegates` | Source hands off ownership of a task to target |
| `reviews` | Source checks and validates target's output before the run continues |
| `reports_to` | Source sends status/summary upward in the hierarchy |
| `shares_context` | Source copies relevant memory to target without transferring execution |
| `handoff` | Sequential execution transfer — source is done, target picks up |

## Blocking vs. non-blocking

| Mode | Behaviour |
|---|---|
| Non-blocking (default) | Source's output is forwarded; the run continues in parallel |
| Blocking | The run pauses at this edge until the target member's step is marked complete |

Use blocking edges for synchronous pipelines where downstream steps depend on the upstream result. Use non-blocking for fire-and-forget notifications or parallel enrichment.

## Validation

- Source and target must be different members in the same team.
- At least two members must exist before edges can be added.
- Duplicate edges (same source, target, and type) overwrite rather than stack.

## Side effects

- Inserts or updates an `agent_team_edges` row.
- Edge connections are reflected in the Team Builder graph view immediately after save.
- In-flight runs follow the edge graph as it existed when the run was dispatched.

## Related

- [Team Builder Section](../team-builder)
- [Add Team Member drawer](./add-team-member)
- [Create Team drawer](./create-team)
- [Team Coordination](/en/explanation/agents/team-coordination)
