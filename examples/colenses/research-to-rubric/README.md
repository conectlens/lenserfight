# Research to Rubric Colens

Demonstrates a multi-step `COLENS.MD` that references a Lens, two AI lensers, an approval gate, and an evaluation rubric.

Use this pattern when a colens needs to produce inspectable artifacts before a battle or evaluation run.

## Files Included

- `COLENS.MD` — valid colens automation object.

## Setup

```bash
pnpm nx run cli:build
```

## Run Command

```bash
node dist/apps/cli/main.js colens run examples/colenses/research-to-rubric/COLENS.MD --inputs '{"topic":"local battle scoring"}'
```

## Expected Output

The CLI reports `Simulated colens Research to Rubric Colens`, `Status: ready`, and `Steps: 4`. It writes JSON and Markdown simulation reports under `.lenserfight/`.

## Configuration Notes

This is a local simulation. It validates the file and writes a run report, but it does not execute model calls.

## Tutorial

Follow [Research to Rubric Colens Tutorial](../../../docs/en/tutorials/developer-examples/research-to-rubric-colens.md).
