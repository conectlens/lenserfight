# Model Review Battle

Demonstrates a portable `PRIVATE_BATTLE.md` that can be simulated without providers or executed locally with Ollama.

Use this pattern when you want to compare agents, models, prompts, or workflows before creating a cloud battle.

## Files Included

- `PRIVATE_BATTLE.md` — battle participants, evaluation method, metrics, and task body.

## Setup

```bash
pnpm nx run cli:build
```

Optional execution requires Ollama with `llama3.1` available.

## Run Command

Simulation only:

```bash
node dist/apps/cli/main.js battle run examples/battles/model-review-battle/PRIVATE_BATTLE.md
```

Optional execution:

```bash
node dist/apps/cli/main.js battle run examples/battles/model-review-battle/PRIVATE_BATTLE.md --execute --judge human
```

## Expected Output

Simulation reports `Participants: 2` and writes `.lenserfight/` report artifacts. Execution streams contender outputs and writes `model-review-battle.result.md` plus `model-review-battle.result.json`.

## Configuration Notes

The example is safe by default because simulation does not call providers. Use `--execute` only when Ollama is running locally or provider credentials are intentionally configured.

## Tutorial

Follow [Model Review Battle Tutorial](../../../docs/en/tutorials/developer-examples/model-review-battle.md).
