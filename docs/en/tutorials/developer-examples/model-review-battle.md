---
title: Model Review Battle Tutorial
description: Simulate or execute a portable private battle between two local model contenders.
---

# Model Review Battle Tutorial

## Purpose

Learn how a portable `PRIVATE_BATTLE.md` describes participants, evaluation, reporting, and an optional executable task.

## Concepts Covered

Battle, fighter/contender, runner/provider, local execution, judging, result artifacts.

## What You Will Build

You will simulate [`examples/battles/model-review-battle`](../../../examples/battles/model-review-battle/README.md), then optionally execute it with Ollama.

## Prerequisites

- Node 22.
- Dependencies installed.
- CLI built with `pnpm nx run cli:build`.
- Optional: Ollama with `llama3.1` for execution.

## File Structure

```text
examples/battles/model-review-battle/
  PRIVATE_BATTLE.md
  README.md
```

## Step-by-Step Walkthrough

1. Open `PRIVATE_BATTLE.md`.
2. Inspect `participants`. Each participant has `type`, `ref`, `provider`, and `model`.
3. Inspect `metrics` and `rubric_ref`.
4. Run simulation first.
5. If Ollama is ready, execute with `--execute --judge human`.

## How to Run the Example

Simulation:

```bash
pnpm nx run cli:build
node dist/apps/cli/main.js battle run examples/battles/model-review-battle/PRIVATE_BATTLE.md
```

Optional execution:

```bash
node dist/apps/cli/main.js battle run examples/battles/model-review-battle/PRIVATE_BATTLE.md --execute --judge human
```

## Expected Output

Simulation reports two participants and writes local report artifacts. Execution streams both contender outputs and writes:

```text
model-review-battle.result.md
model-review-battle.result.json
```

## How the Example Works Internally

Simulation validates the private battle and reports readiness. Execution creates a local battle state, maps the first two executable participants to contender slots A and B, streams provider output, and writes result artifacts.

## Common Errors and Troubleshooting

- `Execution requires at least 2 participants`: both selected participants need `provider` and `model`.
- Provider errors: start Ollama and pull the configured models.
- Do not commit result files if prompts or outputs are sensitive.

## Suggested Modifications

- Change participant models.
- Add `human_judge_required: true`.
- Replace the task body with a prompt from your own project.

## Example Folder

[`examples/battles/model-review-battle`](../../../examples/battles/model-review-battle/README.md)
