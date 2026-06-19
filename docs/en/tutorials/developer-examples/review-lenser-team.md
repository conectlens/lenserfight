---
title: Review Lenser Team Tutorial
description: Validate two AI lensers and an lenser team that coordinate battle preparation work.
---

# Review Lenser Team Tutorial

## Purpose

Learn how LenserFight represents AI lensers and AI lenser teams as portable automation objects.

## Concepts Covered

AI lenser, AI lenser team, team lead, shared tools, colens ownership, execution policy.

## What You Will Build

You will validate [`examples/lensers/review-lenser-team`](../../../../examples/lensers/review-lenser-team/README.md), a researcher lenser, reviewer lenser, and team definition.

## Prerequisites

- Node 22.
- Dependencies installed.
- CLI built with `pnpm nx run cli:build`.

## File Structure

```text
examples/lensers/review-lenser-team/
  researcher/
    SKILL.md
  reviewer/
    SKILL.md
  TEAM.MD
  README.md
```

## Step-by-Step Walkthrough

1. Open `researcher/SKILL.md` and inspect `role`, `capabilities`, `model_policy`, and `allowed_actions`.
2. Open `reviewer/SKILL.md` and compare its responsibilities.
3. Open `TEAM.MD` and inspect `members`, `team_lead_lenser`, and `colens_ownership`.
4. Validate the folder.

## How to Run the Example

```bash
pnpm nx run cli:build
node dist/apps/cli/main.js validate examples/lensers/review-lenser-team
```

## Expected Output

The CLI lists three valid objects: two `agent` files and one `agent_team` file.

## How the Example Works Internally

Agent objects carry instructions and execution policy. The team object does not merge the agents; it coordinates them by declaring roles, responsibilities, shared tools, and colens ownership.

## Common Errors and Troubleshooting

- Agent files require `# Purpose`, `# Instructions`, and `# Execution Policy`.
- Team files require `# Team Purpose`, `# Members`, and `# Collaboration Rules`.
- IDs must match references used in colenss if you want the files to line up conceptually.

## Suggested Modifications

- Add a third agent for result aggregation.
- Require approval for `publish` in each agent's allowed actions.
- Assign the team to a different colens ID.

## Example Folder

[`examples/lensers/review-lenser-team`](../../../../examples/lensers/review-lenser-team/README.md)
