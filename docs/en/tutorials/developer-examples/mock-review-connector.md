---
title: Mock Review Connector Tutorial
description: Run a local connector adapter that verifies tokens and dispatches LenserFight events.
---

# Mock Review Connector Tutorial

## Purpose

Learn the connector adapter lifecycle without deploying an HTTP service or using real service tokens.

## Concepts Covered

Connector, connector adapter, service token verification, scopes, event dispatch, error handling.

## What You Will Build

You will run [`examples/connectors/mock-review-connector`](../../../examples/connectors/mock-review-connector/README.md), a dependency-free adapter shaped like `ConnectorAdapterV1`.

## Prerequisites

- Node 22.

## File Structure

```text
examples/connectors/mock-review-connector/
  src/
    index.mjs
    demo.mjs
  README.md
```

## Step-by-Step Walkthrough

1. Open `src/index.mjs`.
2. Inspect `metadata()`: slug, kind, scopes, and active status.
3. Inspect `verify(token)`: missing and revoked tokens resolve to `ok: false`.
4. Inspect `dispatch(event)`: events are stored in memory and return a status-like result.
5. Run the demo.

## How to Run the Example

```bash
node examples/connectors/mock-review-connector/src/demo.mjs
```

## Expected Output

The script prints:

- adapter ID `mock-review`
- metadata with connector scopes
- `verify` result with `ok: true`
- `dispatch` result with `ok: true`
- the received `lens.published` event

## How the Example Works Internally

The adapter uses the same method names and result shapes as the repository connector contract. It avoids network I/O so you can test event flow and failure handling locally.

## Common Errors and Troubleshooting

- `token_revoked`: use the demo token from `VALID_TOKEN`.
- Empty `received`: call `dispatch` before reading the in-memory queue.
- Real HTTP adapters should use the SDK `HttpConnectorAdapter`; this example keeps the tutorial local.

## Suggested Modifications

- Set `failNext: true` to inspect an `ok: false` dispatch result.
- Add `agents:write` to scopes and document why it is needed.
- Replace in-memory storage with a test double for your own service.

## Example Folder

[`examples/connectors/mock-review-connector`](../../../examples/connectors/mock-review-connector/README.md)
