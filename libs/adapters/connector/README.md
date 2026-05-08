# @lenserfight/adapters-connector

Public connector SDK for LenserFight integrations. Defines the versioned `ConnectorAdapterV1` interface, the canonical token-scope grammar, and a default HTTP adapter for `kind: 'api'` connectors.

## Stability

`ConnectorAdapterV1` is **stable** as of Phase M (2026-05-08). The interface is governed by RFC-0001:

- **Breaking changes** (renames, removals, semantic changes) require a new versioned interface (`ConnectorAdapterV2`) and a deprecation cycle for V1 with overlapping support.
- **Additive, optional fields** may land in V1 minor releases.
- **The token-scope grammar** in `CONNECTOR_SCOPES` is also stable; new scopes are additive only.

Pin to the versioned symbol (`ConnectorAdapterV1`) rather than the unversioned alias (`ConnectorAdapter`) so a future V2 does not silently change the shape of long-lived adapters.

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
