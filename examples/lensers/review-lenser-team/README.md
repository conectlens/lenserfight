# Review Lenser Team

Demonstrates two AI lenser automation objects coordinated by a `TEAM.MD`.

Use this pattern when you want a colens to separate responsibilities between lensers instead of making one lenser do planning, drafting, and review.

## Files Included

- `researcher/LENSER.MD` — topic-framing lenser.
- `reviewer/LENSER.MD` — rubric-review lenser.
- `TEAM.MD` — team definition and coordination rules.

## Setup

```bash
pnpm nx run cli:build
```

## Run Command

```bash
node dist/apps/cli/main.js validate examples/lensers/review-lenser-team
```

## Expected Output

The CLI reports three valid automation objects: two `lenser` files and one `agent_team`.

## Configuration Notes

The model policy uses Ollama model keys as local-friendly defaults. Validation does not require Ollama.

## Tutorial

Follow [Review Lenser Team Tutorial](../../../docs/en/tutorials/developer-examples/review-lenser-team.md).
