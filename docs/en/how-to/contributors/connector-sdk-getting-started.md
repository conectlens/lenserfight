---
title: Connector SDK — Getting Started
description: Build, register, and verify a LenserFight connector adapter against the stable ConnectorAdapterV1 contract.
---

# Connector SDK — Getting Started

This guide walks through building a new connector adapter against the stable `ConnectorAdapterV1` interface (Phase M, RFC-0001). For deeper review-process details and existing adapters, see [Adapter Contribution Guide](./adapter-contribution-guide.md).

## Prerequisites

- Node.js 22+
- `@lenserfight/adapters-connector` available in your workspace (it's already in the monorepo; install from the relative workspace path or from npm once published).
- Familiarity with TypeScript modules and async/await.

## 1. Install

For an in-monorepo example:

```ts
import {
  ConnectorAdapterV1,
  CONNECTOR_SCOPES,
  HttpConnectorAdapter,
  registerConnectorAdapter,
  type ConnectorMetadata,
  type DispatchEvent,
  type DispatchResult,
  type VerifyResult,
} from '@lenserfight/adapters-connector'
```

Out-of-tree projects depend on the package directly:

```bash
pnpm add @lenserfight/adapters-connector
```

## 2. Implement `ConnectorAdapterV1`

The interface has four methods. Implementations must resolve all promises (never throw) — surface failures via `ok: false` results instead.

```ts
export function createMyAdapter(opts: {
  serviceToken: string
  endpoint: string
}): ConnectorAdapterV1 {
  const metadata: ConnectorMetadata = {
    slug: 'my-service',
    name: 'My Service',
    kind: 'api',
    scopes: [CONNECTOR_SCOPES[0]], // pin to canonical scopes
    isActive: true,
    description: 'Bridges LenserFight runs to my-service.example.com.',
  }

  const inner = new HttpConnectorAdapter({
    metadata,
    endpoint: opts.endpoint,
    serviceToken: opts.serviceToken,
  })

  return {
    id: () => 'my-service',
    metadata: () => metadata,
    verify: (token: string): Promise<VerifyResult> => inner.verify(token),
    dispatch: (event: DispatchEvent): Promise<DispatchResult> => inner.dispatch(event),
  }
}
```

The same shape is used by [`examples/connectors/chainabit-example/src/adapter.ts`](../../../examples/connectors/chainabit-example/src/adapter.ts) — read it end-to-end before writing your own.

## 3. Register the adapter

Registration adds the adapter to the in-process registry so the LenserFight runtime can resolve it by `id`. Idempotent — registering the same id twice throws.

```ts
registerConnectorAdapter('my-service', () =>
  createMyAdapter({
    serviceToken: process.env.MY_SERVICE_TOKEN!,
    endpoint: 'https://api.my-service.example.com',
  }),
)
```

Operators register the connector record in Supabase so users can grant tokens to it:

```bash
lf connectors add \
  --slug my-service \
  --name "My Service" \
  --kind api \
  --scopes "lenses:read,workflows:write"
```

## 4. Verify with the CLI

After registering and adding the connector:

```bash
lf connectors test my-service --token <service-token>
```

The CLI invokes your adapter's `verify(token)` and prints `ok` plus the returned scopes. A failed verify exits non-zero with the underlying `reason` field.

## 5. Test conformance

Adapter tests should cover the documented contract corners:

```ts
describe('MyAdapter', () => {
  it('verify returns ok=false for an expired token', async () => {
    const adapter = createMyAdapter({ serviceToken: 'expired', endpoint: '...' })
    const r = await adapter.verify('expired')
    expect(r.ok).toBe(false)
  })

  it('dispatch never throws — returns ok=false on transport error', async () => {
    const adapter = createMyAdapter({ serviceToken: 'x', endpoint: 'http://127.0.0.1:1' })
    const r = await adapter.dispatch({ type: 'noop', payload: {} })
    expect(r.ok).toBe(false)
  })
})
```

Run the project's tests with `pnpm nx test <your-project>`.

## What's stable, what's not

`ConnectorAdapterV1` is governed by RFC-0001:

- **Stable in V1**: the four method signatures, `ConnectorMetadata` shape, and the `CONNECTOR_SCOPES` grammar.
- **Subject to additive change in V1 minor releases**: optional fields on `ConnectorMetadata`, `DispatchEvent`, `DispatchResult`, `VerifyResult`.
- **Breaking changes**: bump to `ConnectorAdapterV2` with a deprecation cycle; V1 continues to work during overlap.

Pin to the versioned symbol (`ConnectorAdapterV1`), not the unversioned `ConnectorAdapter` alias, so a future V2 can't silently change the shape under you.

## Next steps

- [Adapter Contribution Guide](./adapter-contribution-guide.md) — full review process and PR labels.
- [RFC-0001 Connector Interface](../../rfcs/RFC-0001-connector-interface.md) — interface governance and change process.
- [Chainabit example adapter](../../../examples/connectors/chainabit-example/README.md) — runnable reference integration.
