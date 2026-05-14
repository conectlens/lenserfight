---
title: AI Cost Governance & BYOK Architecture
description: Reservation-based escrow ledger, BYOK reservation binding, and the saga workers run for every AI provider call.
---

# AI Cost Governance & BYOK Architecture

LenserFight charges real money to real provider APIs every time an AI Lenser
runs. The cost-governance plane exists so that *no* provider call can be made
without first proving the spend is allowed, recorded, and reversible.

## Core idea

A provider call is a four-step saga:

```
QUOTE  →  RESERVE  →  EXECUTE (stream-metered)  →  COMMIT  or  RELEASE
                                  │
                                  └──▶ over-limit ──▶ ABORT + RELEASE
```

The reservation is **the unforgeable per-call token**. Holding a reservation
is required to:

- Resolve a BYOK key (`fn_byok_key_resolve_v2`)
- Bill credits to a tenant
- Emit billing events

Reservations are created server-side, bound to `{ai_lenser_id, model_id,
provider_key, status, held_until}`, and cannot be tampered with by clients.

## Tables (schema `billing`)

| Table | Role |
|---|---|
| `runtime_settings` | Singleton config: `enforce`, `byok_require_reservation`, default TTL, headroom %. |
| `pricing_snapshots` | Immutable pin of `ai.model_pricing` row at quote time. |
| `cost_reservations` | The saga state row. Status: `held → committed | released | expired`. |
| `ledger_entries` | Append-only double-entry ledger. Hash-chained per reservation. |
| `budget_policies` | Scope-keyed budgets (`agent`/`org`/`user`). CG2 wires the evaluator. |
| `provider_circuit_state` | Surface for CG6 (cost-aware fallback router). |
| `spend_anomalies` | Surface for CG7 (anomaly detector). |

## RPCs (schema `public`, all `SECURITY DEFINER`)

| RPC | Caller | Purpose |
|---|---|---|
| `fn_cost_quote` | authenticated, service_role | Pure-read estimate + pin pricing snapshot. |
| `fn_cost_reserve` | service_role | Held reservation + `debit_hold` ledger entry. Idempotent. |
| `fn_cost_meter_tick` | service_role | Monotonic running-credits update; returns `over_limit` past headroom. |
| `fn_cost_commit` | service_role | Held → committed. Posts reversal + `debit_commit`. Settles `agents.quota_snapshots`. |
| `fn_cost_release` | service_role | Held → released. Posts reversal ledger entry. |
| `fn_cost_expire_reservations` | service_role (cron) | Releases reservations past `held_until`. |
| `fn_byok_key_resolve_v2` | service_role | BYOK key bound to a held reservation. |
| `fn_byok_key_resolve` | service_role (legacy) | Pre-CG1 callers; gated by `byok_require_reservation`. |
| `fn_get_my_cost_reservations` | authenticated | Owner-scoped UI read. |

## Security model

- **Append-only ledger.** A BEFORE-UPDATE/DELETE trigger raises `P0001` on any
  mutation of `billing.ledger_entries`. The hash chain (`prev_hash + canonical
  row → sha256 → entry_hash`) makes silent rewrites detectable.
- **RLS deny-first.** All `billing.*` tables are RLS-on with `service_role` as
  the only writer. Owners read their own reservations and ledger entries via
  RLS-scoped policies that join through `agents.ai_lensers → lensers.profiles
  → auth.users`.
- **BYOK binding.** `fn_byok_key_resolve_v2` cross-checks four invariants on
  every call: reservation exists, status = `held`, `held_until > now()`,
  `ai_lenser_id` matches, `provider_key` matches. Optional model binding via
  the reservation's `model_id ↔ ai.models.key`. A committed/expired/released
  reservation cannot be reused for another provider call.
- **Service-role-only RPCs.** Workers (`apps/platform-api`, `apps/gateway`)
  run with the service-role key. The SPA never sees a reservation API and
  cannot mint one.
- **Idempotency.** `cost_reservations.idempotency_key` is unique per
  `(ai_lenser_id, idempotency_key)`; replay returns the original row.

## Failure modes

| Failure | Behavior |
|---|---|
| Agent paused / kill switch on | `fn_cost_reserve` raises `E_KILL_SWITCH` / `E_AGENT_PAUSED`. |
| Daily budget would breach | `fn_cost_reserve` raises `E_BUDGET_EXCEEDED` (only when `enforce = true`). |
| Pricing row missing | `fn_cost_quote` raises `E_PRICING_UNAVAILABLE`. |
| Worker crash after `reserve` | `fn_cost_expire_reservations` (pg_cron, every 60 s) flips `held → released` with `reason='worker_timeout'` and posts the reversal entry. |
| Mid-stream over-limit | `fn_cost_meter_tick` returns `over_limit=true`; worker fires `AbortSignal`. |
| Stale BYOK call after commit | `fn_byok_key_resolve_v2` raises `E_BYOK_CONTEXT_INVALID`. |

## Rollout

CG1 is bundled in migration `20271217000000_phase_cg1_cost_governance.sql`.
Rollback is **forward-only via feature flag**:

| Flag | Effect when `false` |
|---|---|
| `billing.runtime_settings.enforce` | Reservations still record, budget checks skipped (shadow mode). |
| `billing.runtime_settings.byok_require_reservation` | Legacy `fn_byok_key_resolve` still works. |

Flip `enforce = true` after CG2 ships and budget policies are populated. Flip
`byok_require_reservation = true` only after every gateway worker upgrades to
the v2 BYOK resolve path.

## TypeScript surfaces

- `@lenserfight/infra/cost` exports `CostGovernanceEngine` — the single object
  workers use to run a reservation saga. `runWithReservation` wraps any async
  body in `reserve → body → commit | release`.
- `@lenserfight/infra/byok` exports `BYOKKeyClient.withKey()` — the only way
  to get plaintext provider credentials. Refuses calls without a
  `reservationId`; refuses calls when the reservation is not `held`.

## Pointers

- RFC: [RFC-0004: AI Cost Governance & BYOK](../../rfcs/RFC-0004-cost-governance.md)
- Migration: `supabase/migrations/20271217000000_phase_cg1_cost_governance.sql`
- pgTAP coverage: `supabase/tests/87_cg1_billing_ledger.sql`,
  `88_cg1_reservation_lifecycle.sql`, `89_cg1_byok_reservation_binding.sql`
- Workers (CG1 wires next): `apps/platform-api/src/worker/*`, `apps/gateway/src/main.ts`
- Future phases: CG2 (policy evaluator), CG3 (RPM/TPM), CG4 (adapter usage
  introspection), CG5 (streaming abort), CG6 (cost-aware router + degrade),
  CG7 (anomaly detector), CG8 (KMS envelope + org-scoped budgets).
