---
title: Research to Rubric Colens Tutorial
description: Simulate a multi-step file-first colens that prepares battle tasks and scoring rubrics.
---

# Research to Rubric Colens Tutorial

## Purpose

Learn how LenserFight represents a Colens as a local `SKILL.md` automation object with ordered steps, lenser references, a Lens reference, and approval gates.

## Concepts Covered

Colens, Lens reference, AI lenser, AI lenser team, approval gate, evaluation output, run report.

## What You Will Build

You will simulate [`examples/colenses/research-to-rubric`](../../../../examples/colenses/research-to-rubric/README.md), a colens that turns a topic into a battle task and rubric.

## Prerequisites

- Node 22.
- Dependencies installed.
- CLI built with `pnpm nx run cli:build`.

## File Structure

```text
examples/colenses/research-to-rubric/
  SKILL.md
  README.md
```

## Step-by-Step Walkthrough

1. Open `SKILL.md`.
2. Inspect `colens_type: evaluation`.
3. Review the four steps: `lens_execution`, two `agent_task` steps, and an `approval_gate`.
4. Pass a topic through `--inputs`.
5. Inspect the generated runtime report paths printed by the CLI.

## How to Run the Example

```bash
pnpm nx run cli:build
node dist/apps/cli/main.js colens run examples/colenses/research-to-rubric/SKILL.md --inputs '{"topic":"local battle scoring"}'
```

## Expected Output

```text
Simulated colens Research to Rubric Colens
Status: ready
Steps: 4
JSON report: <user-runtime>/workspaces/<id>/runs/...
Markdown report: <user-runtime>/workspaces/<id>/reports/...
```

## How the Example Works Internally

The CLI validates the automation object, reads `frontmatter.steps`, summarizes each step as `<id> (<type>)`, and writes a local report. This is a simulation scaffold; it does not dispatch provider calls.

## Common Errors and Troubleshooting

- `Colens validation failed`: check `kind: colens`, `schema_version`, `id`, and `name`.
- `Invalid JSON supplied to --inputs`: quote the JSON object correctly.
- No report appears: run from the repository root so `.lenserfight/` is created where you expect.

## Suggested Modifications

- Add a `human_review_notes` input.
- Change `retry_policy.max_attempts`.
- Add another `agent_task` for score aggregation.

## Example Folder

[`examples/colenses/research-to-rubric`](../../../../examples/colenses/research-to-rubric/README.md)
