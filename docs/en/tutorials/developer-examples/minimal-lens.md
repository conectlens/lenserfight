---
title: Minimal Lens Tutorial
description: Build and validate the smallest useful portable LenserFight lens example.
---

# Minimal Lens Tutorial

## Purpose

Learn what LenserFight means by a Lens: a portable, versioned prompt unit with input and output contracts.

## Concepts Covered

Lens, lenser-owned prompt behavior, input schema, output schema, local validation.

## What You Will Build

You will validate [`examples/lenses/minimal-lens`](../../../examples/lenses/minimal-lens/README.md), a `LENS.md` that turns a topic into three concise bullets.

## Prerequisites

- Node 22.
- Dependencies installed.
- CLI built with `pnpm nx run cli:build`.

## File Structure

```text
examples/lenses/minimal-lens/
  LENS.md
  README.md
```

## Step-by-Step Walkthrough

1. Open `LENS.md`.
2. Check the frontmatter: `kind: lens`, `schema_version`, `id`, `name`, visibility, status, and schemas.
3. Read the `# Prompt` section. This is the behavior the Lens gives to an agent or workflow step.
4. Read `# Inputs` and `# Outputs`. These sections explain the runtime contract in human-readable form.
5. Validate the folder.

## How to Run the Example

```bash
pnpm nx run cli:build
node dist/apps/cli/main.js validate examples/lenses/minimal-lens
```

## Expected Output

The CLI table lists `LENS.md`, kind `lens`, status `valid`, and then prints:

```text
Validated 1 automation markdown file(s).
```

## How the Example Works Internally

`lf validate` scans for known automation objects, parses YAML frontmatter, and checks required Lens sections: `Purpose`, `Prompt`, `Inputs`, and `Outputs`. It does not call a model.

## Common Errors and Troubleshooting

- `Missing YAML frontmatter block`: keep the opening and closing `---` lines.
- `Missing required frontmatter key name`: lenses require `name`.
- `Missing required markdown section`: use `# Purpose`, not `## Purpose`.

## Suggested Modifications

- Add another required input such as `audience`.
- Change the output contract from bullets to `{summary, risks}`.
- Reference this Lens from a workflow step.

## Example Folder

[`examples/lenses/minimal-lens`](../../../examples/lenses/minimal-lens/README.md)
