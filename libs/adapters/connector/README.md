# @lenserfight/adapters-connector

Public connector SDK alpha for LenserFight integrations. Defines the versioned `ConnectorAdapterV1` interface, the canonical token-scope grammar, and a default HTTP adapter for `kind: 'api'` connectors.

This package is the foundation that Phase 16 promotes to `@lenserfight/sdk` v1. The interface is marked `@experimental` and may change before v1.

## Quick start

```ts
import {
  ConnectorAdapterV1,
  CONNECTOR_SCOPES,
  registerConnectorAdapter,
  HttpConnectorAdapter,
} from '@lenserfight/adapters/connector'
```

See [docs/reference/connectors](../../../docs/reference/connectors/index.md) for the full reference and [examples/connectors/chainabit-example](../../../examples/connectors/chainabit-example/README.md) for a runnable integration.
