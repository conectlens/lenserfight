---
title: ConnectorAdapterV1 Interface
description: TypeScript reference for the versioned ConnectorAdapterV1 contract and built-in HttpConnectorAdapter.
---

# `ConnectorAdapterV1`

The versioned contract every connector adapter implements. Pin to this symbol — the unversioned `ConnectorAdapter` alias may be re-pointed at a future v2.

```ts
import type { ConnectorAdapterV1 } from '@lenserfight/adapters/connector'
```

## Methods

| Method | Returns | Purpose |
|---|---|---|
| `id()` | `string` | Stable identifier; matches the registry key. |
| `metadata()` | `ConnectorMetadata` | Static description (slug, name, kind, scopes). |
| `verify(token)` | `Promise<VerifyResult>` | Validate a service token; return its scopes. |
| `dispatch(event)` | `Promise<DispatchResult>` | Send an event to the external system. **Must resolve** — surface failures via `ok: false`. |

## Types

### `ConnectorMetadata`

```ts
interface ConnectorMetadata {
  slug: string                              // workspace-unique slug, 3–64 chars, [a-z0-9_-]
  name: string                              // display name
  kind: 'api' | 'webhook'
  scopes: readonly ConnectorScope[]         // see scopes.md
  isActive: boolean
  description?: string | null
  createdAt?: string
  lastUsedAt?: string | null
}
```

### `VerifyResult`

```ts
interface VerifyResult {
  ok: boolean
  scopes: ConnectorScope[]
  reason?: 'token_missing' | 'token_revoked' | 'scope_mismatch' | 'unknown_connector'
}
```

### `DispatchEvent` / `DispatchResult`

```ts
interface DispatchEvent {
  type: string                               // e.g. 'lens.published'
  payload: Record<string, unknown>
}

interface DispatchResult {
  ok: boolean
  latencyMs: number
  status?: number
  error?: string
}
```

## Built-in: `HttpConnectorAdapter`

Default `kind: 'api'` adapter. POSTs JSON with bearer auth and an `x-lenserfight-event` header. Surfaces network errors and non-2xx responses as `ok: false` (never throws).

```ts
import { HttpConnectorAdapter } from '@lenserfight/adapters/connector'

const adapter = new HttpConnectorAdapter({
  metadata: {
    slug: 'chainabit',
    name: 'Chainabit',
    kind: 'api',
    scopes: ['lenses:read'],
    isActive: true,
  },
  endpoint: 'https://chainabit.example/lf-webhook',
  serviceToken: process.env.LENSERFIGHT_SERVICE_TOKEN!,
  // optional: timeoutMs (default 10_000), fetchImpl (for tests)
})
```

## Registry

```ts
import {
  registerConnectorAdapter,
  getConnectorAdapter,
  setDefaultConnectorAdapter,
  listConnectorAdapters,
} from '@lenserfight/adapters/connector'

registerConnectorAdapter('chainabit', () => createChainabitAdapter(...))
const adapter = getConnectorAdapter('chainabit')
```

Lookup behavior:

- First registration becomes the default.
- `getConnectorAdapter()` (no arg) returns the default.
- Re-registering the same id replaces the factory.
- `unregisterConnectorAdapter(id)` clears the default if it pointed at `id`.

## Errors

`ConnectorScopeError` is thrown by call sites that need to short-circuit when a granted token lacks a required scope. The Postgres equivalent is `SQLSTATE 42501` returned by `connectors.fn_assert_scope`.

```ts
import { ConnectorScopeError } from '@lenserfight/adapters/connector'

if (!granted.includes(required)) {
  throw new ConnectorScopeError(required, granted)
}
```

## See also

- [Token scopes (v1)](scopes.md)
- [`lf connectors` CLI reference](/en/reference/cli/connectors)
- [RFC-0001](/en/rfcs/RFC-0001-connector-interface)
