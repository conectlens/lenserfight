# Review Agent Team

Demonstrates two AI agent automation objects coordinated by an `AGENT_TEAM.md`.

Use this pattern when you want a workflow to separate responsibilities between agents instead of making one agent do planning, drafting, and review.

## Files Included

- `researcher/AGENT.md` — topic-framing agent.
- `reviewer/AGENT.md` — rubric-review agent.
- `AGENT_TEAM.md` — team definition and coordination rules.

## Setup

```bash
pnpm nx run cli:build
```

## Run Command

```bash
node dist/apps/cli/main.js validate examples/agents/review-agent-team
```

## Expected Output

The CLI reports three valid automation objects: two `agent` files and one `agent_team`.

## Configuration Notes

The model policy uses Ollama model keys as local-friendly defaults. Validation does not require Ollama.

## Tutorial

Follow [Review Agent Team Tutorial](../../../docs/tutorials/developer-examples/review-agent-team.md).
