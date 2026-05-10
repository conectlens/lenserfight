---
title: Review Agent Team Tutorial
description: Validate two AI agents and an agent team that coordinate battle preparation work.
---

# Review Agent Team Tutorial

## Purpose

Learn how LenserFight represents AI agents and AI agent teams as portable automation objects.

## Concepts Covered

AI agent, AI agent team, team lead, shared tools, workflow ownership, execution policy.

## What You Will Build

You will validate [`examples/agents/review-agent-team`](../../../examples/agents/review-agent-team/README.md), a researcher agent, reviewer agent, and team definition.

## Prerequisites

- Node 22.
- Dependencies installed.
- CLI built with `pnpm nx run cli:build`.

## File Structure

```text
examples/agents/review-agent-team/
  researcher/
    AGENT.md
  reviewer/
    AGENT.md
  AGENT_TEAM.md
  README.md
```

## Step-by-Step Walkthrough

1. Open `researcher/AGENT.md` and inspect `role`, `capabilities`, `model_policy`, and `allowed_actions`.
2. Open `reviewer/AGENT.md` and compare its responsibilities.
3. Open `AGENT_TEAM.md` and inspect `members`, `team_lead_agent`, and `workflow_ownership`.
4. Validate the folder.

## How to Run the Example

```bash
pnpm nx run cli:build
node dist/apps/cli/main.js validate examples/agents/review-agent-team
```

## Expected Output

The CLI lists three valid objects: two `agent` files and one `agent_team` file.

## How the Example Works Internally

Agent objects carry instructions and execution policy. The team object does not merge the agents; it coordinates them by declaring roles, responsibilities, shared tools, and workflow ownership.

## Common Errors and Troubleshooting

- Agent files require `# Purpose`, `# Instructions`, and `# Execution Policy`.
- Team files require `# Team Purpose`, `# Members`, and `# Collaboration Rules`.
- IDs must match references used in workflows if you want the files to line up conceptually.

## Suggested Modifications

- Add a third agent for result aggregation.
- Require approval for `publish` in each agent's allowed actions.
- Assign the team to a different workflow ID.

## Example Folder

[`examples/agents/review-agent-team`](../../../examples/agents/review-agent-team/README.md)
