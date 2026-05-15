---
title: Team Edges drawer
description: Edit handoff edges between team members — from, to, optional condition, priority.
---

# Team Edges drawer

Opened from the [Team Builder Section](../team-builder).

## What's an edge?

An **edge** says: *"after node A finishes, hand the output to node B."* Edges are the wiring of a multi-agent graph.

## Fields per edge

| Field | Required | Notes |
|---|---|---|
| **From** | yes | A node currently in the team |
| **To** | yes | A different node currently in the team |
| **Condition** | no | JSONPath predicate evaluated against the previous node's output |
| **Priority** | yes (default 0) | When multiple edges match, the highest priority wins |

## Condition syntax

The condition is evaluated against the upstream node's output JSON. The edge fires only when the expression is truthy.

```
$.status == "approved"
$.score >= 0.8
$.flagged == true
```

## Priority example

If node A has two outgoing edges:

| Edge | Condition | Priority |
|---|---|---|
| A → judge | `$.score < 0.5` | 100 |
| A → publisher | `true` | 0 |

The first matching edge by priority wins, so low-scoring outputs go to the judge instead of being published.


## Code-backed workflow

Source of truth: TeamEdgesDrawer.tsx and direct edge creation in AgentTeamSection.tsx.

1. Create or update handoff edges between two different team members.
2. Edges model responsibility transfer, not workflow graph nodes.
3. Verify the edge line appears in Builder and run traces show the handoff path.

## Related

- [Team Builder Section](../team-builder)
- [Add Team Member drawer](./add-team-member)
- [Team Coordination](/en/explanation/agents/team-coordination)
