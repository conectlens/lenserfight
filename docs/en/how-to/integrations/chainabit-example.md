---
title: Chainabit Reference Example
description: Step-by-step walkthrough of the canonical OSS connector adapter shipped under examples/connectors/chainabit-example.
---

# Chainabit Reference Example

`examples/connectors/chainabit-example/` is the canonical reference adapter — a minimal Node.js project that demonstrates the full `lf connectors add → register → verify → dispatch` lifecycle in under 100 lines.

## Run it

```bash
cd examples/connectors/chainabit-example
cp .env.example .env

# 1. Register the connector and capture the service token
lenserfight connectors add chainabit \
  --name "Chainabit Reference" \
  --slug chainabit \
  --scopes lenses:read

# Paste the printed service_token into .env → LENSERFIGHT_SERVICE_TOKEN
# Set LENSERFIGHT_CONNECTOR_ENDPOINT to a webhook target you control

# 2. Run the demo
pnpm install
pnpm demo

# 3. Verify reachability via the CLI
lenserfight connectors test chainabit
```

## What the demo does

1. **Registers** a `chainabit` adapter in the connector registry via `registerConnectorAdapter`.
2. **Verifies** the service token by calling `adapter.verify(token)` — confirms the granted scopes.
3. **Dispatches** a `lens.published` event payload to the configured webhook endpoint.

Exit codes:

| Code | Meaning |
|---|---|
| `0` | All steps succeeded |
| `1` | Missing env vars |
| `2` | Token verification failed |
| `3` | Dispatch failed (network/HTTP error) |

## Files

| File | Purpose |
|---|---|
| [`src/adapter.ts`](https://github.com/conectlens/lenserfight/blob/main/examples/connectors/chainabit-example/src/adapter.ts) | Wraps `HttpConnectorAdapter` to produce a `ConnectorAdapterV1` |
| [`src/index.ts`](https://github.com/conectlens/lenserfight/blob/main/examples/connectors/chainabit-example/src/index.ts) | Runnable demo flow |
| [`.env.example`](https://github.com/conectlens/lenserfight/blob/main/examples/connectors/chainabit-example/.env.example) | Required env vars (token + endpoint) |

## Token rotation

```bash
lenserfight connectors rotate chainabit
```

The previous token is revoked immediately — replay attempts return `401`. Update `LENSERFIGHT_SERVICE_TOKEN` and re-run `pnpm demo`.

## Adapt for your own service

The example deliberately stays minimal. To productionize:

1. **Replace the metadata** in `src/adapter.ts` with your own slug, name, and scope set.
2. **Wire the registration** at your service's startup, not in a one-shot script.
3. **Persist the service token** in your secrets manager rather than `.env`.
4. **Add retries** at the dispatch site if your downstream system has transient failures (the adapter itself should not retry — surface failures as `ok: false`).

## See also

- [Build an adapter quickstart](build-an-adapter.md)
- [Adapter interface reference](/en/reference/connectors/adapter-interface)
- [Token scopes (v1)](/en/reference/connectors/scopes)
- [`lf connectors` CLI reference](/en/reference/cli/connectors)
