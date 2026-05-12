---
title: "RFC-0002: Scoring Plugin (V1)"
description: Canonical RFC defining the ScoringPluginV1 contract, the registration model, the server-side sandboxing rules, and the security boundary that protects the rest of the platform.
---

# RFC-0002: Scoring Plugin (V1)

| | |
|---|---|
| **Status** | Draft — pending acceptance review |
| **Authors** | LenserFight Core, Scoring area mentor |
| **Phase** | R — Community plugin track |
| **Stabilizes in** | Phase 16 — `@lenserfight/sdk` v1 |
| **Supersedes** | — |

## Summary

This RFC pins the public scoring plugin interface that operators and community contributors use to add new evaluation signals to a battle submission. It defines:

1. The versioned `ScoringPluginV1` TypeScript contract.
2. The registration model and where plugins live in the monorepo.
3. The server-side sandboxing rules — plugins run under the service role inside the platform-api worker, never inside a user-facing route.
4. The security boundary the platform enforces around plugin output.
5. The DB sink table `battles.scoring_plugin_signals` and the writer RPC `public.fn_record_scoring_plugin_signal`.

## Motivation

The connector RFC (RFC-0001) gave external systems a stable seam for inbound integrations. The scoring surface is the symmetric outbound seam — community contributors should be able to add new evaluation signals (word count, sentiment, factuality probes, custom rubrics) without modifying the core battle worker. Without a contract, every new signal becomes a bespoke fork of the worker code.

The interface is small on purpose: a plugin maps a `SubmissionView` to a flat `Record<string, number>`. Anything more structured belongs in a separate RPC layer.

## Design

### The interface

```ts
export interface ScoringPluginV1 {
  id(): string
  metadata(): { displayName: string; signals: string[] }
  score(submission: SubmissionView): Promise<{ ok: true; signals: Record<string, number> } | { ok: false; reason: string }>
}
```

- `id()` — stable, kebab-case. Must equal the directory name under `examples/scoring/`. Once published, it is never renamed (same rule as connector adapters in RFC-0001).
- `metadata().displayName` — surfaced in the moderation admin console and the battle scoring inspector.
- `metadata().signals` — the exact set of keys the plugin will emit on success. Used to validate plugin output before it reaches the database. A plugin that returns a key not in this set has its result discarded with a `signal_not_declared` audit row.
- `score(submission)` — never throws. Surface failures as `{ ok: false, reason }`. Failures do not block a submission; they record a missing-signal audit row and the battle continues with the signals that did succeed.

`SubmissionView` is the read-only projection passed to plugins. It exposes the submission's user-facing text plus a small set of metadata fields (battle id, model id, byok flag); it does not expose moderation decisions, raw judge prompts, or any per-user identifiers beyond the participating handle. The exact shape ships with `libs/plugins/scoring/` and is governed by this RFC.

### Registration

Plugins are server-side modules registered at platform-api boot:

```ts
import { registerScoringPlugin } from '@lenserfight/plugins-scoring'
import { wordCountPlugin } from './word-count-plugin'

registerScoringPlugin('word-count', () => wordCountPlugin())
```

Registration rules mirror RFC-0001's adapter registry: first registration wins, re-registration replaces, unregistering the default clears it. Plugins are not loaded dynamically from disk; the bundle has to import them at build time.

The reference plugin lives at `examples/scoring/word-count-plugin/`.

### Sandboxing and security boundary

This is the section reviewers should pay the most attention to.

- **Plugins run server-side, under the service role.** They live in the platform-api worker process. They never run in a user-facing route, never run in the browser, and never run inside a Postgres trigger.
- **No user-supplied code path.** Plugin code is only what was bundled at deploy time. There is no plugin upload endpoint. A plugin is "installed" by merging it into `examples/scoring/` and rebuilding the platform-api image.
- **Inputs are projections, not raw rows.** `SubmissionView` is a curated read-only shape. Plugins do not receive a Supabase client, a service-role JWT, or any other capability handle. They cannot escalate to read other users' data.
- **Outputs are validated.** The platform-api worker validates that every key in `signals` was declared in `metadata().signals` before calling `public.fn_record_scoring_plugin_signal`. Out-of-set keys are dropped and audited.
- **Failures are bounded.** A plugin that takes longer than the worker's per-plugin timeout (default 5 s) is force-resolved as `{ ok: false, reason: 'timeout' }`. A plugin that throws is treated identically to one that returns `{ ok: false }`.
- **Persistence path is fixed.** Signals are persisted by `public.fn_record_scoring_plugin_signal` into `battles.scoring_plugin_signals`. Plugins do not see the table or the RPC; the worker writes the row on their behalf.

### Persistence

| Surface | Owner |
|---|---|
| Table | `battles.scoring_plugin_signals` |
| Writer RPC | `public.fn_record_scoring_plugin_signal(submission_id uuid, plugin_id text, signal_key text, signal_value numeric)` |
| Read path | Battle scoring inspector (admin) and the leaderboard recompute job |

The RPC is `SECURITY DEFINER` so the worker can write rows without granting `INSERT` on the table to anyone else. RLS on `battles.scoring_plugin_signals` blocks direct client reads except through the inspector view.

## Drawbacks

- **No dynamic plugin uploads.** Self-hosted operators who want a custom signal must rebuild the platform-api image. This is intentional — accepting plugin uploads means accepting arbitrary code execution under the service role, which is out of scope for V1.
- **Flat `Record<string, number>`.** Plugins cannot return structured per-criterion explanations. A future V2 may extend the result shape, but V1 keeps the surface small to make conformance testing tractable.
- **No client-side preview.** Operators cannot dry-run a plugin against a submission from the admin console without rerunning the scoring job. Acceptable for V1; revisit if it becomes the most-asked feature.

## Alternatives

- **WASM-sandboxed plugins.** Would let operators upload plugins safely. Rejected for V1: the operational cost (WASM toolchain, sandbox patching, signal validation in the host) outweighs the value when the same plugins can ship in `examples/scoring/`.
- **Plugins as Supabase edge functions.** Would let plugins live closer to the database. Rejected: edge functions don't have the same observability and the worker process already owns the per-submission timeout and retry policy.
- **Plugins as Postgres functions.** Rejected: SQL is the wrong shape for text-heavy signal computation, and trigger-based scoring would couple the integrity of the leaderboard to the integrity of every plugin author's SQL.

## Unresolved questions

- **Per-battle plugin opt-in.** Should a battle be able to declare which plugins run, or should the worker run every registered plugin? Lean toward "every plugin runs and the battle decides which signals to surface", but not committed.
- **Signal versioning.** When a plugin changes its scoring formula, do existing rows stay or get recomputed? Lean toward "rows are immutable; a formula change ships under a new plugin id".
- **Cross-plugin dependencies.** Should plugin B be able to consume plugin A's signals? Out of scope for V1; revisit if real demand emerges.

## Adoption plan

1. **Phase R (this RFC).** Land `libs/plugins/scoring/` with the V1 interface, `examples/scoring/word-count-plugin/` as the reference plugin, the DB sink table, and the writer RPC. The CLI and platform-api are wired but the surface is not yet promoted.
2. **Phase R+1.** Open the surface for community contributions through [Adapter Mentorship Paths](../how-to/contributors/adapter-mentorship.md) (the same mentorship rotation covers scoring plugins). Mentor handle is `@maintainer-scoring`.
3. **Phase 16.** Promote `ScoringPluginV1` into the public `@lenserfight/sdk` v1 npm package. Pin the interface symbol; future breaking changes ship as `ScoringPluginV2`.

## References

- [Scoring Plugin — Getting Started](../how-to/contributors/scoring-plugin-getting-started.md)
- [Adapter Mentorship Paths](../how-to/contributors/adapter-mentorship.md)
- [RFC-0001: Connector Interface](./RFC-0001-connector-interface.md) — interface stability rules and the registry pattern this RFC mirrors.
- [Battle Integrity Checklist](../how-to/battles/battle-integrity-checklist) — the integrity gates that any new scoring signal must respect.
