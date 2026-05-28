---
title: Review Rubric Smoke Battle Tutorial
description: Run a bundled local battle spec that compares two Ollama contenders on scoring-plugin review.
---

# Review Rubric Smoke Battle Tutorial

## Purpose

Run the smallest useful local battle that exercises contenders, task text, rubric metadata, local state, and manual voting.

## Concepts Covered

Battle, fighter/contender, local runner, rubric criteria, voting, result inspection.

## What You Will Build

You will run [`examples/local-battle/review-rubric-smoke`](../../../examples/local-battle/review-rubric-smoke/README.md) through `lf battle local run --example`.

## Prerequisites

- Node 22.
- Dependencies installed.
- CLI built with `pnpm nx run cli:build`.
- `LENSERFIGHT_LOCAL_BATTLE_KEY` set for encrypted local battle state.
- Ollama running with `llama3.1`.

## File Structure

```text
examples/local-battle/review-rubric-smoke/
  spec.yaml
  README.md
```

## Step-by-Step Walkthrough

1. Open `spec.yaml`.
2. Read `task`; this is the exact prompt both contenders answer.
3. Inspect contender slots `A` and `B`.
4. Inspect the rubric criteria and pass threshold.
5. Run the example with human judging.
6. Vote and inspect status.

## How to Run the Example

```bash
pnpm nx run cli:build
export LENSERFIGHT_LOCAL_BATTLE_KEY=replace-with-a-local-passphrase
node dist/apps/cli/main.js battle local run --example review-rubric-smoke --judge human --yes
node dist/apps/cli/main.js battle local status
```

## Expected Output

The run streams output from contender A and B, stores a local battle JSON file in user runtime storage, and prints the manual vote command.

## How the Example Works Internally

The CLI loads `examples/local-battle/review-rubric-smoke/spec.yaml`, creates a local battle, adds contender A and B, calls the local battle runner, and stores outputs in encrypted local runtime state.

## Common Errors and Troubleshooting

- `Example not found`: check the folder name passed to `--example`.
- Missing local battle key: set `LENSERFIGHT_LOCAL_BATTLE_KEY` or run `lf config local-battle-key generate`.
- Ollama model errors: run `ollama pull llama3.1`.
- `No provider key available for AI judge`: use `--judge human` to skip auto-judging.

## Suggested Modifications

- Change one contender model after pulling it locally.
- Add a stricter task constraint.
- Adjust `pass_threshold` after comparing several runs.

## Example Folder

[`examples/local-battle/review-rubric-smoke`](../../../examples/local-battle/review-rubric-smoke/README.md)
