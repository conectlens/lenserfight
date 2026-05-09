# `@lenserfight/infra/gateway`

Sync engine, conflict resolver, leader election, transport detector, and object class registry for the LenserFight Trust Gateway (LTG).

This library is consumed by:

- [`apps/gateway`](../../../apps/gateway) — the long-running daemon.
- [`apps/cli`](../../../apps/cli) — `lf gateway sync|peers|policy` subcommands.

## Modules

| Module | Purpose |
|--------|---------|
| `object-classes.ts` | Per-object-class authority + merge policy registry. |
| `sync-engine.ts` | Outbox flush + pull loop orchestration. |
| `conflict-resolver.ts` | LWW-with-vector-clock merge functions. |
| `tailscale-detector.ts` | Detects Tailscale (CGNAT 100.64/10) interfaces. |
| `leader-election.ts` | Acquires / refreshes peer leases via the data layer. |
| `kill-switch.ts` | Polls workspace policy state. |

## See also

- [RFC-0003 §7](../../../docs/rfcs/RFC-0003-trust-gateway.md#7-sync-engine)
- [Sync model](../../../docs/explanation/gateway/sync.md)
