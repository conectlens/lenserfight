---
title: Create Team drawer
description: Bootstrap a new team graph with a name, coordination style, and autonomy level.
---

# Create Team drawer

Opened from the [Team Builder Section](../team-builder).

## Fields

| Field | Required | Notes |
|---|---|---|
| **Name** | yes | Surfaced in the builder list and `/teams` URLs |
| **Coordination style** | yes | `round-robin` / `manager-worker` / `consensus` |
| **Autonomy level** | yes | `0` (every step gated) … `3` (fully autonomous within budget) |

## Coordination styles

| Style | Behaviour |
|---|---|
| `round-robin` | Members take turns on incoming work |
| `manager-worker` | Lead routes, workers execute |
| `consensus` | All members run, lead reconciles outputs |

## Autonomy levels

| Level | Approval policy |
|---|---|
| `0` | Every step requires human approval |
| `1` | Read-only steps auto-approve |
| `2` | Network calls auto-approve within budget |
| `3` | Fully autonomous within daily cap |

## After creation

The team starts **empty**. Use the [Add Team Member drawer](./add-team-member) to attach AI Lensers, then [Team Edges drawer](./team-edges) to define handoffs.


## Code-backed workflow

Source of truth: CreateTeamDrawer.tsx.

1. Create or edit team name, description, active state, and initial execution strategy.
2. Creating a team gives Builder a stable container for members and edges.
3. Verify the new team is selectable before adding members.

## Related

- [Team Builder Section](../team-builder)
- [Build a Multi-Agent Team](/en/how-to/agents/build-a-multi-agent-team)
