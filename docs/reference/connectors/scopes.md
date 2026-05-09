---
title: Connector Token Scopes (v1)
description: Canonical v1 scope grammar for LenserFight service tokens. Locked under RFC-0001 — additive-only changes after Phase 10.
---

# Connector Token Scopes (v1)

Service tokens issued by `lenserfight connectors add` carry a fixed set of scopes from the **v1 grammar** below. Once a token has a scope, the platform API enforces it on every RPC call: a `lenses:read` token cannot call `fn_battles_create` or any other RPC that requires a scope it does not hold.

## Source of truth

The v1 scope list is defined in three places, all kept in sync:

| Location | What it owns |
|---|---|
| [`libs/adapters/connector/src/lib/scopes.ts`](https://github.com/conectlens/lenserfight-web/blob/main/libs/adapters/connector/src/lib/scopes.ts) | TypeScript constant `CONNECTOR_SCOPES` + `ConnectorScope` literal type |
| `connectors.fn_valid_scopes()` (Supabase) | Postgres allow-list rejected by `fn_connector_create` |
| This page | Canonical human reference |

## v1 scope list

| Scope | Grants |
|---|---|
| `lenses:read` | List/read lenses, versions, parameters, and metadata |
| `lenses:write` | Create, update, fork, version, and publish lenses |
| `agents:read` | List/read AI lensers, agents, bindings, and run history |
| `agents:write` | Create or update AI lensers, bindings, and agent settings |
| `workflows:read` | List/read workflows, runs, and node results |
| `workflows:write` | Create, update, execute, retry, and cancel workflows |
| `threads:read` | Read threads, replies, and reactions |
| `threads:write` | Create, update, and react to threads and replies |
| `community:read` | Read community profiles, members, and lenser metadata |
| `community:write` | Update community profile and manage memberships |
| `connectors:read` | List/view registered connectors and their token metadata |
| `connectors:write` | Register, rotate, and remove connectors |

## Granting at create time

```bash
lenserfight connectors add chainabit \
  --name "Chainabit Risk Scoring" \
  --slug chainabit \
  --scopes lenses:read,workflows:read
```

Comma-separated. Whitespace is trimmed. Unknown scopes are rejected before the RPC runs (CLI exits `1`).

## Enforcement

When a token-scoped RPC is called without the required scope, Postgres raises `SQLSTATE 42501` (`insufficient_privilege`). The CLI maps this to:

```
Error: Connector token is missing a required scope (...).
Rotate with: lenserfight connectors rotate <slug> --scopes <scope[,scope...]>
```

and exits with code `2` (distinct from generic RPC failures, which exit `1`).

## Stability guarantees (v1)

- **Names are frozen.** A scope name in v1 will never be renamed or repurposed.
- **Additive only.** New scopes may be appended in minor releases.
- **Removal requires a major.** Removing or splitting a v1 scope ships as `ConnectorAdapterV2` with a separate allow-list.

See [RFC-0001](/rfcs/RFC-0001-connector-interface) for the full governance contract.
