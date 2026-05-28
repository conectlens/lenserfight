# Mock Review Connector

Demonstrates the connector adapter pattern with a dependency-free local mock. The object implements the same methods as `ConnectorAdapterV1`: `id`, `metadata`, `verify`, and `dispatch`.

Use this pattern when you need to test connector registration, token handling, event dispatch, and failure paths before wiring an HTTP service.

## Files Included

- `src/index.mjs` — mock connector adapter.
- `src/demo.mjs` — local demo that verifies a token and dispatches a `lens.published` event.

## Setup

No install step is required beyond Node 22.

## Run Command

```bash
node examples/connectors/mock-review-connector/src/demo.mjs
```

## Expected Output

The demo prints adapter metadata, a successful token verification result, a successful dispatch result, and the in-memory event received by the connector.

## Configuration Notes

The demo token is `dev-service-token`. It is intentionally fake and safe to commit. Real connectors should receive service tokens from the LenserFight connector registration flow and store them outside source control.

## Tutorial

Follow [Mock Review Connector Tutorial](../../../docs/en/tutorials/developer-examples/mock-review-connector.md).
