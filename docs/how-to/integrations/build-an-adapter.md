---
title: Build a Connector Adapter
description: Quickstart for implementing a custom ConnectorAdapterV1 against the LenserFight alpha SDK.
---

# Build a Connector Adapter

This guide walks through implementing a custom `ConnectorAdapterV1` against the alpha SDK. For a runnable end-to-end flow, see the [chainabit example walkthrough](chainabit-example.md).

## 1. Install

```bash
pnpm add @lenserfight/adapters-connector
```

## 2. Register a connector

```bash
lenserfight connectors add my-saas \
  --name "My SaaS Integration" \
  --slug my-saas \
  --scopes lenses:read,workflows:read
```

The CLI prints the **service token exactly once**. Save it in a secrets manager — it cannot be retrieved later.

## 3. Implement the adapter

For most integrations, wrap the built-in `HttpConnectorAdapter`:

```ts
import {
  HttpConnectorAdapter,
  type ConnectorAdapterV1,
} from '@lenserfight/adapters/connector'

export function createMySaasAdapter(opts: {
  endpoint: string
  serviceToken: string
}): ConnectorAdapterV1 {
  return new HttpConnectorAdapter({
    metadata: {
      slug: 'my-saas',
      name: 'My SaaS Integration',
      kind: 'api',
      scopes: ['lenses:read', 'workflows:read'],
      isActive: true,
    },
    endpoint: opts.endpoint,
    serviceToken: opts.serviceToken,
  })
}
```

If you need custom transport (e.g. signed webhooks, message queues), implement `ConnectorAdapterV1` directly:

```ts
import type {
  ConnectorAdapterV1,
  ConnectorMetadata,
  DispatchEvent,
  DispatchResult,
  VerifyResult,
} from '@lenserfight/adapters/connector'

class SqsConnectorAdapter implements ConnectorAdapterV1 {
  constructor(private readonly meta: ConnectorMetadata) {}
  id() { return this.meta.slug }
  metadata() { return this.meta }
  async verify(token: string): Promise<VerifyResult> { /* ... */ }
  async dispatch(event: DispatchEvent): Promise<DispatchResult> { /* ... */ }
}
```

## 4. Register at startup

```ts
import { registerConnectorAdapter } from '@lenserfight/adapters/connector'

registerConnectorAdapter('my-saas', () =>
  createMySaasAdapter({
    endpoint: process.env.MY_SAAS_WEBHOOK!,
    serviceToken: process.env.LENSERFIGHT_SERVICE_TOKEN!,
  }),
)
```

## 5. Verify locally

```bash
lenserfight connectors test my-saas
```

Expected output:

```json
{
  "ok": true,
  "latency_ms": 12,
  "scopes": ["lenses:read", "workflows:read"]
}
```

## 6. Rotate before production

```bash
lenserfight connectors rotate my-saas
```

The previous token is revoked immediately — old token returns `401`. Update the token in your runtime and redeploy.

## Patterns to follow

- **Never throw from `dispatch`.** Surface transport failures as `{ ok: false, error }` so the caller can decide whether to retry.
- **Pin to `ConnectorAdapterV1`.** Don't use the unversioned `ConnectorAdapter` alias for long-lived code — the alias may be re-pointed at v2.
- **Match the scope grammar.** Only declare scopes from the [v1 grammar](/reference/connectors/scopes); unknown scopes are rejected at registration time.
- **Treat the service token like a password.** Store it in a secrets manager; rotate on staff turnover.

## See also

- [Adapter interface reference](/reference/connectors/adapter-interface)
- [Token scopes (v1)](/reference/connectors/scopes)
- [`lf connectors` CLI reference](/reference/cli/connectors)
- [Chainabit example walkthrough](chainabit-example.md)
