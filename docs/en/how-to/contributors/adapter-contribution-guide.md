---
title: Adding a Connector Adapter
description: Step-by-step guide to contributing a new connector adapter to LenserFight.
---

# Adding a Connector Adapter

This guide walks you through implementing and contributing a new connector adapter.

## 1. Fork and Scaffold

Fork the repo, then create your adapter directory:

```
examples/connectors/<your-adapter>/
  index.ts
  <your-adapter>.adapter.ts
  <your-adapter>.adapter.spec.ts
```

## 2. Implement `ConnectorAdapterV1`

Import the interface from `libs/adapters/connector/src/lib/connector-adapter.ts`:

```ts
import type {
  ConnectorAdapterV1,
  ConnectorMetadata,
  VerifyResult,
  DispatchEvent,
  DispatchResult,
} from '@lenserfight/adapters/connector'

export class YourAdapter implements ConnectorAdapterV1 {
  id(): string {
    return 'your-adapter-v1' // stable — never rename after publication
  }

  metadata(): ConnectorMetadata {
    return {
      name: 'Your Adapter',
      description: 'One-line description of what this connects.',
      iconUrl: 'https://example.com/icon.svg',
      docsUrl: 'https://example.com/docs',
    }
  }

  async verify(token: string): Promise<VerifyResult> {
    // Validate the token against the upstream API.
    // Return granted scopes on success; { valid: false } on failure.
  }

  async dispatch(event: DispatchEvent): Promise<DispatchResult> {
    // Must always resolve — never throw.
    // Return { ok: false, reason: '...' } for soft failures.
  }
}
```

:::warning
`dispatch()` must never throw. Any unhandled rejection propagates into the workflow engine's dead-letter path. Catch all errors and return a typed failure result instead.
:::

:::tip
Use the [chainabit-example adapter](../../../examples/connectors/chainabit-example/src/adapter.ts) as the canonical reference implementation. It demonstrates how to wrap `HttpConnectorAdapter`, declare metadata, and return a `ConnectorAdapterV1` value the registry can consume.
:::

## 3. Register the Adapter

In your `index.ts`:

```ts
import { registerConnectorAdapter } from '@lenserfight/adapters/connector'
import { YourAdapter } from './<your-adapter>.adapter'

registerConnectorAdapter('your-adapter-v1', () => new YourAdapter())
```

Registration is idempotent. Registering the same `id` twice throws at startup.

## 4. Write Scope-Validation Specs

```ts
describe('YourAdapter.verify', () => {
  it('returns valid: false for an expired token', async () => { ... })
  it('returns expected scopes for a valid token', async () => { ... })
})
```

## 5. Submit Your PR

- Label the PR **`good-first-adapter`**.
- Link to **RFC-0001** (`docs/rfcs/RFC-0001-connector-interface.md`) in the PR description.
- Ensure `pnpm nx lint` and `pnpm nx test` pass for your adapter project.

## Existing adapters

The canonical reference implementation is [`examples/connectors/chainabit-example/src/adapter.ts`](../../../examples/connectors/chainabit-example/src/adapter.ts). It demonstrates:

- Returning a typed `ConnectorAdapterV1` value
- Wrapping the built-in `HttpConnectorAdapter` for the common `kind: 'api'` case
- Declaring `ConnectorMetadata` with the canonical scopes from `CONNECTOR_SCOPES`
- Structured `ok: false` error returns (never throws)

For a step-by-step walkthrough of building a new adapter, see the [Connector SDK getting started guide](./connector-sdk-getting-started.md). For mentor pairings and the first-PR walkthrough, see [Adapter Mentorship Paths](./adapter-mentorship.md) and the current [Mentor Rotation](./mentor-rotation.md).

Browse `examples/connectors/` for all community adapters. Check there first to avoid duplicating an adapter that already exists.

## Review ownership

| Scope | Reviewers required |
|---|---|
| `ConnectorAdapterV1` interface changes | 1 core maintainer (blocking) |
| New adapter in `examples/connectors/` | 1 core + 1 community reviewer |
| Bug fix to existing adapter | 1 core maintainer |
| Docs-only change to this guide | 1 core maintainer |

**SLA:** First review comment within 7 business days of PR open. If you haven't heard back, ping in the issue or add the `needs-triage` label.

Label PRs with `good-first-adapter` before requesting review — this surfaces them in the maintainer triage queue.
