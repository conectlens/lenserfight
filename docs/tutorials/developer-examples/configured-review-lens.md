---
title: Configured Review Lens Tutorial
description: Build a configurable Lens with strictness modes and structured findings.
---

# Configured Review Lens Tutorial

## Purpose

Show how a Lens can expose safe runtime configuration without changing the prompt each time.

## Concepts Covered

Lens configuration, input contracts, output contracts, review rubrics, evaluation references.

## What You Will Build

You will validate [`examples/lenses/configured-review-lens`](../../../examples/lenses/configured-review-lens/README.md), a review Lens with `light`, `normal`, and `strict` modes.

## Prerequisites

- Node 22.
- Dependencies installed.
- CLI built with `pnpm nx run cli:build`.

## File Structure

```text
examples/lenses/configured-review-lens/
  LENS.md
  README.md
```

## Step-by-Step Walkthrough

1. Open `LENS.md`.
2. Inspect `input_schema.properties.strictness`. The enum is the supported configuration surface.
3. Inspect `focus_areas`; it is optional and lets a caller bias the review.
4. Read the prompt rules. They map configuration to behavior.
5. Validate the folder.

## How to Run the Example

```bash
pnpm nx run cli:build
node dist/apps/cli/main.js validate examples/lenses/configured-review-lens
```

## Expected Output

The CLI reports one valid `lens` object.

## How the Example Works Internally

The Lens remains a portable markdown object. The input schema documents the supported parameters, while the prompt explains how an AI agent should interpret them.

## Common Errors and Troubleshooting

- Enum values must be strings. Use `light`, `normal`, or `strict`.
- Keep findings structured. Free-form prose is harder to score later.
- If validation misses a schema mistake, remember the current validator checks object shape and required sections, not full JSON Schema semantics.

## Suggested Modifications

- Add a `max_findings` input.
- Add `security` as a required focus area for strict mode.
- Pair this Lens with the Research to Rubric Workflow.

## Example Folder

[`examples/lenses/configured-review-lens`](../../../examples/lenses/configured-review-lens/README.md)
