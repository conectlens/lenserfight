---
title: "RFC-0004: AI Cost Governance & BYOK Architecture"
description: Reservation-based escrow ledger and BYOK reservation binding for LenserFight AI execution.
---

# RFC-0004: AI Cost Governance & BYOK Architecture

| | |
|---|---|
| **Status** | Accepted (CG1 shipped 2026-05-15) |
| **Author** | Principal Architecture |
| **Phase** | CG1–CG8 |
| **Created** | 2026-05-14 |
| **Supersedes** | — |
| **Superseded by** | — |

## Summary

Adds a financial-governance plane on top of LenserFight's existing BYOK v2,
pricing registry, and quota infrastructure. Every AI provider call now flows
through a four-step saga (quote → reserve → execute → commit/release) backed
by a hash-chained, append-only ledger. BYOK key resolution is bound to a
held reservation so a leaked agent_id cannot be replayed across calls.

## Motivation

Before CG1, a malicious or buggy agent could consume an entire daily budget
in a single execution because cost was computed *after* the provider call
returned, and budget was enforced only at dispatch time. There was no
mid-execution abort, no provider-key binding, and no immutable record of
spend.

This RFC closes those gaps without rewriting BYOK v2, the event bus, the
outbox, or the quota snapshots.

## Detailed design

See [Architecture: AI Cost Governance & BYOK](../explanation/architecture/cost-governance.md)
for the full schema, RPC surface, security model, failure modes, and rollout
plan.

CG1 shipped:

- `billing` schema additions: `runtime_settings`, `pricing_snapshots`,
  `cost_reservations`, `ledger_entries`, `budget_policies`,
  `provider_circuit_state`, `spend_anomalies`.
- Append-only ledger with sha256 hash chaining + UPDATE/DELETE block triggers.
- RPCs: `fn_cost_quote`, `fn_cost_reserve`, `fn_cost_meter_tick`,
  `fn_cost_commit`, `fn_cost_release`, `fn_cost_expire_reservations`,
  `fn_byok_key_resolve_v2`, `fn_get_my_cost_reservations`.
- pg_cron `cg1-cost-reservation-expiry` every 60 s.
- TypeScript surfaces: `@lenserfight/infra/cost`, `@lenserfight/infra/byok`.
- pgTAP: `supabase/tests/87..89_cg1_*.sql`.

## Drawbacks

- **One bundled migration** is harder to roll back than three smaller ones;
  mitigated by the `BILLING_ENFORCE=false` feature flag (shadow mode) and the
  `byok_require_reservation=false` legacy compatibility flag.
- **Mid-stream metering is best-effort** for providers that do not surface
  per-chunk usage; CG5 wires the streaming abort path and marks affected
  reservations `approximate=true` for finance reconciliation.
- **Hash chaining is tamper-evident, not tamper-proof.** A compromised
  `service_role` could rewrite the chain; the offline reconciliation job is
  the detection control.

## Alternatives considered

1. **HS256 JWT execution context.** Original plan. Rejected for CG1 in favor
   of using the reservation UUID as the per-call binding token — same threat
   coverage, no HMAC secret to rotate in plpgsql, simpler audit story.
2. **External orchestrator (Temporal / Kafka).** Premature for current scale.
   The saga lives in `cost_reservations.status` + the ledger; CG8 leaves a
   clean seam for a shadow-writer if/when adopted.
3. **App-layer ledger.** Rejected; financial state must live where the spend
   decision is made (Postgres) to avoid race conditions across workers.

## Unresolved questions

- Per-org credit-rate overrides (CG8): single global rate is assumed in CG1;
  `pricing_snapshots.credit_rate_usd` is already nullable-friendly via the
  optional `tenancy.orgs` join.
- Anomaly scoring window and thresholds (CG7) need real production traffic
  before being tuned; the `spend_anomalies` table is in place as a surface.

## Pointers

- Migration: `supabase/migrations/20271217000000_phase_cg1_cost_governance.sql`
- Architecture: [Cost Governance](../explanation/architecture/cost-governance.md)
- pgTAP: `supabase/tests/87_cg1_billing_ledger.sql`,
  `88_cg1_reservation_lifecycle.sql`, `89_cg1_byok_reservation_binding.sql`
- TS surfaces: `libs/infra/cost`, `libs/infra/byok`
