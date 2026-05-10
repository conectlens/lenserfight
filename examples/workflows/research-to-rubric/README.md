# Research to Rubric Workflow

Demonstrates a multi-step `WORKFLOW.md` that references a Lens, two AI agents, an approval gate, and an evaluation rubric.

Use this pattern when a workflow needs to produce inspectable artifacts before a battle or evaluation run.

## Files Included

- `WORKFLOW.md` — valid workflow automation object.

## Setup

```bash
pnpm nx run cli:build
```

## Run Command

```bash
node dist/apps/cli/main.js workflow run examples/workflows/research-to-rubric/WORKFLOW.md --inputs '{"topic":"local battle scoring"}'
```

## Expected Output

The CLI reports `Simulated workflow Research to Rubric Workflow`, `Status: ready`, and `Steps: 4`. It writes JSON and Markdown simulation reports under `.lenserfight/`.

## Configuration Notes

This is a local simulation. It validates the file and writes a run report, but it does not execute model calls.

## Tutorial

Follow [Research to Rubric Workflow Tutorial](../../../docs/tutorials/developer-examples/research-to-rubric-workflow.md).
