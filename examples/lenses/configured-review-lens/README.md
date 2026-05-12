# Configured Review Lens

Demonstrates a Lens with explicit input configuration and a structured output contract.

Use this pattern when a prompt needs caller-controlled behavior, such as review strictness, mode, audience, or focus area.

## Files Included

- `LENS.md` — configured review lens with JSON-style input and output schemas.

## Setup

```bash
pnpm nx run cli:build
```

## Run Command

```bash
node dist/apps/cli/main.js validate examples/lenses/configured-review-lens
```

## Expected Output

The CLI reports one valid `lens` object.

## Configuration Notes

The schema is documentation and validation metadata for the file-first object. This example does not execute the prompt by itself.

## Tutorial

Follow [Configured Review Lens Tutorial](../../../docs/en/tutorials/developer-examples/configured-review-lens.md).
