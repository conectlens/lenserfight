---
title: LenserFight Trust Gateway (LTG)
description: Index of the Trust Gateway architecture, trust model, sync model, security rules, requirements, and rollout roadmap.
---

# LenserFight Trust Gateway (LTG)

The LenserFight Trust Gateway (LTG) is the secure coordination boundary between local developer machines, trusted runners, AI agents, AI agent teams, workflows, localhost services, Tailscale-trusted devices, and the LenserFight Cloud account.

It is **not** a replacement for the existing `lf gateway` CLI — it is the documented, signed, conflict-aware platform that the existing command grows into.

## Read in order

1. [Architecture](architecture.md) — what runs where, how the daemon, CLI, libs, and DB fit together.
2. [Trust model](trust-model.md) — device, lenser, and execution trust ladders, and who can elevate which level.
3. [Sync model](sync.md) — three sync scopes (local / Tailscale / cloud), object class authority, conflict resolution.
4. [Security rules](security-rules.md) — zero trust, least privilege, signed envelopes, replay protection, kill switch, audit, defense-in-depth.
5. [Requirements](requirements.md) — sector-standard requirements checklist (one section per concern).
6. [Roadmap](roadmap.md) — phased delivery (A → G) with explicit acceptance criteria per phase.
7. [Release readiness](release-readiness.md) — pre-OSS release gates, blockers, and go/no-go criteria.
8. [Rollout and rollback](rollout-rollback.md) — operator runbook for staging, release, and emergency disablement.
9. [Security review](security-review.md) — pre-OSS findings, least-privilege checks, and residual risk decisions.
10. [OSS cutover](oss-cutover.md) — final release candidate checklist and go/no-go decision.

## Authoritative documents

- The canonical RFC: [RFC-0003: LenserFight Trust Gateway](../../rfcs/RFC-0003-trust-gateway.md).
- The CLI reference: [`lf gateway` CLI Reference](../../reference/cli/gateway.md).

## Naming

- **LenserFight Trust Gateway** — full product name.
- **LTG** — short name in code comments and docs.
- **`lf gateway`** — CLI surface; preserved verbatim across the rollout.
- **`apps/gateway/`** — long-running daemon (new in Phase D).

## Scope

The LTG covers:

- **Identity** — per-device Ed25519 keypairs, OS-keychain-resident.
- **Signing** — a single `SignedEnvelope` shape used for execution attestations, sync push/pull, and any future signed RPC.
- **Sync** — outbox + watermarks across local mesh, Tailscale, and cloud.
- **Trust evaluation** — server-side, signature-verified.
- **Anti-cheat** — battle execution attestation that materially raises trust and reputation.
- **Operational guardrails** — kill switch propagation, doctor diagnostics, audit chain.

The LTG explicitly does **not** cover:

- End-to-end encryption beyond TLS / WireGuard channels (future RFC).
- Cross-Lenser federation (single-account by design).
- Replacing Supabase Realtime (we layer on top).
- Public battles enablement (still gated by [`docs/reference/platform-api/beta-roadmap.md`](../../reference/platform-api/beta-roadmap.md)).
