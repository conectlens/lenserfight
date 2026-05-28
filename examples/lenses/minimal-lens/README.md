# Minimal Lens

Demonstrates the smallest useful portable Lens: a versioned prompt object with an input contract, output contract, and required documentation sections.

Use this pattern when you want to teach or prototype a single reusable prompt before wiring it into a workflow or battle.

## Files Included

- `LENS.md` — valid file-first LenserFight lens automation object.

## Setup

Build the CLI from the repository root:

```bash
pnpm nx run cli:build
```

## Run Command

```bash
node dist/apps/cli/main.js validate examples/lenses/minimal-lens
```

## Expected Output

The CLI reports one valid `lens` object and prints `Validated 1 automation markdown file(s).`

## Configuration Notes

No API keys, database, or provider configuration are required. This example validates structure; it does not call an AI provider.

## Tutorial

Follow [Minimal Lens Tutorial](../../../docs/en/tutorials/developer-examples/minimal-lens.md).
