---
title: "RFC-0001: Connector Interface (V1)"
description: Canonical RFC defining the ConnectorAdapterV1 contract, the v1 token scope grammar, and the governance rules that protect both.
---

# RFC-0001: Connector Interface (V1)

| | |
|---|---|
| **Status** | Accepted (Phase 10 alpha) |
| **Author** | LenserFight Core |
| **Phase** | 10 — Connector RFC + Public Adapter SDK Alpha |
| **Stabilizes in** | Phase 16 — `@lenserfight/sdk` v1 |
| **Supersedes** | — |

## Summary

This RFC locks the public connector interface that external systems use to integrate with LenserFight. It defines:

1. The versioned `ConnectorAdapterV1` TypeScript contract.
2. The v1 token scope grammar (12 scopes) and the rules that govern adding to / removing from it.
3. The Postgres `SQLSTATE 42501` (`insufficient_privilege`) signal used by the platform to enforce scope boundaries.
4. The registry pattern that lets consumers register additional adapters without modifying core code.

## Motivation

The OSS repository opened on May 7, 2026 with a CLI surface (`lf connectors *`) wired to RPCs that did not yet exist. Phase 10 closes that loop, but doing so without a governance contract risks early integrators building against a moving target. The RFC freezes the v1 shape and lays the groundwork Phase 16 needs to publish a stable `@lenserfight/sdk` v1 npm package.

## The interface

### `ConnectorAdapterV1`

```ts
interface ConnectorAdapterV1 {
  id(): string
  metadata(): ConnectorMetadata
  verify(token: string): Promise<VerifyResult>
  dispatch(event: DispatchEvent): Promise<DispatchResult>
}
```

- `id()` — must equal `metadata().slug`. Stable across the adapter's lifetime.
- `verify(token)` — never throws. Returns `{ ok: false, reason: ... }` on failure.
- `dispatch(event)` — never throws. Surface transport failures as `{ ok: false, error }`. Adapters must NOT retry — caller decides retry policy.
- `metadata()` — pure; safe to call hot.

### Versioning

- `ConnectorAdapterV1` is the canonical symbol. Pin to it.
- `ConnectorAdapter = ConnectorAdapterV1` is an alias. New code may use the alias; long-lived consumers should use the versioned symbol.
- A future `ConnectorAdapterV2` ships in a major release (Phase ≥17) with a separate symbol; the alias may be re-pointed.

### Registry

```ts
registerConnectorAdapter(id, factory)
getConnectorAdapter(id?)
setDefaultConnectorAdapter(id)
unregisterConnectorAdapter(id)
listConnectorAdapters()
```

First registration becomes the default. Re-registration replaces the factory. Unregistering the default clears the default — `getConnectorAdapter()` (no arg) then throws until a new registration arrives.

## Token scope grammar (v1)

| | |
|---|---|
| **Total** | 12 scopes |
| **Format** | `<resource>:<action>` where action ∈ { read, write } |
| **Source of truth** | [`libs/adapters/connector/src/lib/scopes.ts`](../../libs/adapters/connector/src/lib/scopes.ts) (TS) and `connectors.fn_valid_scopes()` (SQL) |

```
lenses:read       lenses:write
agents:read       agents:write
workflows:read    workflows:write
threads:read      threads:write
community:read    community:write
connectors:read   connectors:write
```

### Stability rules

1. **Names are frozen.** A v1 scope name will never be renamed or repurposed.
2. **Additive only.** New scopes may be appended in minor releases.
3. **Removal requires a major.** Splitting or removing a v1 scope ships as v2 with a separate allow-list.
4. **Both sources change together.** Any scope-list change must update both the TS constant and the SQL allow-list in the same PR (verified by an RFC reviewer until Phase 16 ships a generator script).

### Enforcement

When an RPC requires a scope the calling token does not hold, Postgres raises `SQLSTATE 42501`. The CLI maps this to a friendly error and exits with code `2` (distinct from generic RPC failures, which exit `1`). Phase 12 wires `connectors.fn_assert_scope` into high-risk RPCs (e.g. `fn_battles_create`).

## Governance

- **RFC process** — breaking changes to the interface or v1 scope grammar require a new RFC, ≥2 core maintainer approvals, and a 2-week comment period (Phase 16 formalizes this).
- **Versioned symbols** — additive changes (new optional fields, new helpers) may land in minor releases without an RFC.
- **Test invariant** — `apps/cli-e2e/src/connectors-scopes.spec.ts` asserts the SQL allow-list matches `CONNECTOR_SCOPES`. Drift fails CI.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Breaking change before SDK v1 (Phase 16) churns early adopters | Versioned symbol from day one (`V1` suffix); collect ≥2 real integrations before promoting to v1. |
| TS/SQL allow-lists drift | Integration test in Phase 10; generator script in Phase 16. |
| Webhook variant arrives and reshapes the dispatch contract | Dispatch returns a structured `DispatchResult`; webhook adapter implements the same interface. No branching on `kind` in core code. |

## Out of scope (for v1)

- Webhook adapter implementation (registry slot reserved; no shipped variant in alpha).
- npm publish of `@lenserfight/sdk` (Phase 16, after ≥2 real integrations).
- Multi-tenant connector tokens that span workspaces (single-workspace ownership only in v1).
- Per-RPC scope inheritance / wildcards (e.g. `lenses:*`) — flat allow-list only.

## References

- [Connectors reference](/reference/connectors/index)
- [Adapter interface](/reference/connectors/adapter-interface)
- [Token scopes (v1)](/reference/connectors/scopes)
- [Build an adapter](/how-to/integrations/build-an-adapter)
- [Chainabit example](/how-to/integrations/chainabit-example)
