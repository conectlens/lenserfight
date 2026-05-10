---
title: Research to Rubric Workflow Tutorial
description: Simulate a multi-step file-first workflow that prepares battle tasks and scoring rubrics.
---

# Research to Rubric Workflow Tutorial

## Purpose

Learn how LenserFight represents a Workflow as a local `WORKFLOW.md` automation object with ordered steps, agent references, a Lens reference, and approval gates.

## Concepts Covered

Workflow, Lens reference, AI agent, AI agent team, approval gate, evaluation output, run report.

## What You Will Build

You will simulate [`examples/workflows/research-to-rubric`](../../../examples/workflows/research-to-rubric/README.md), a workflow that turns a topic into a battle task and rubric.

## Prerequisites

- Node 22.
- Dependencies installed.
- CLI built with `pnpm nx run cli:build`.

## File Structure

```text
examples/workflows/research-to-rubric/
  WORKFLOW.md
  README.md
```

## Step-by-Step Walkthrough

1. Open `WORKFLOW.md`.
2. Inspect `workflow_type: evaluation`.
3. Review the four steps: `lens_execution`, two `agent_task` steps, and an `approval_gate`.
4. Pass a topic through `--inputs`.
5. Inspect the generated `.lenserfight/reports/` and `.lenserfight/runs/` files.

## How to Run the Example

```bash
pnpm nx run cli:build
node dist/apps/cli/main.js workflow run examples/workflows/research-to-rubric/WORKFLOW.md --inputs '{"topic":"local battle scoring"}'
```

## Expected Output

```text
Simulated workflow Research to Rubric Workflow
Status: ready
Steps: 4
JSON report: .lenserfight/runs/...
Markdown report: .lenserfight/reports/...
```

## How the Example Works Internally

The CLI validates the automation object, reads `frontmatter.steps`, summarizes each step as `<id> (<type>)`, and writes a local report. This is a simulation scaffold; it does not dispatch provider calls.

## Common Errors and Troubleshooting

- `Workflow validation failed`: check `kind: workflow`, `schema_version`, `id`, and `name`.
- `Invalid JSON supplied to --inputs`: quote the JSON object correctly.
- No report appears: run from the repository root so `.lenserfight/` is created where you expect.

## Suggested Modifications

- Add a `human_review_notes` input.
- Change `retry_policy.max_attempts`.
- Add another `agent_task` for score aggregation.

## Example Folder

[`examples/workflows/research-to-rubric`](../../../examples/workflows/research-to-rubric/README.md)
