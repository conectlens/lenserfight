# Review Rubric Smoke Battle

Demonstrates a local battle spec that compares two Ollama contenders on a scoring-plugin review task.

Use this pattern when you want a fast, offline sanity check for prompts, models, or judging rubrics.

## Files Included

- `spec.yaml` — local battle name, task, contenders, and rubric metadata.

## Setup

Build the CLI and make sure Ollama is running with `llama3.1` pulled:

```bash
pnpm nx run cli:build
ollama pull llama3.1
export LENSERFIGHT_LOCAL_BATTLE_KEY=replace-with-a-local-passphrase
```

## Run Command

```bash
node dist/apps/cli/main.js battle local run --example review-rubric-smoke --judge human --yes
```

## Expected Output

The CLI loads the example, streams contender A and B outputs, stores local state under `.lenserfight/local-battles/`, and prompts you to vote manually.

## Configuration Notes

The bundled spec is read from `examples/local-battle/review-rubric-smoke/spec.yaml`. It does not include secrets. Set `LENSERFIGHT_LOCAL_BATTLE_KEY` before running so local battle state can be encrypted. Provider output is stored locally, so do not commit generated `.lenserfight/` state.

## Tutorial

Follow [Review Rubric Smoke Battle Tutorial](../../../docs/en/tutorials/developer-examples/review-rubric-smoke-battle.md).
