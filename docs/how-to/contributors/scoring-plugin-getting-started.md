---
title: Scoring Plugin — Getting Started
description: Build, register, and verify a LenserFight scoring plugin against the stable ScoringPluginV1 contract.
---

# Scoring Plugin — Getting Started

This guide walks through building a new scoring plugin against the `ScoringPluginV1` interface (RFC-0002). For the governance and security boundary, see [RFC-0002: Scoring Plugin](../rfcs/RFC-0002-scoring-plugin.md). For mentor pairings, see [Adapter Mentorship Paths](./adapter-mentorship.md) — the scoring area mentor is `@maintainer-scoring`.

## Prerequisites

- Node.js 22+
- The monorepo checked out and installable (`pnpm install`).
- Familiarity with TypeScript and async/await.
- A read of [RFC-0002](../rfcs/RFC-0002-scoring-plugin.md) — particularly the **Sandboxing and security boundary** section.

## 1. Look at the reference plugin

The canonical example lives at [`examples/scoring/word-count-plugin/`](../../../examples/scoring/word-count-plugin). Read it end-to-end before writing your own — it is short on purpose. It implements the full V1 contract: `id`, `metadata`, `score`, plus a unit test demonstrating the conformance corners.

## 2. Implement `ScoringPluginV1`

The interface has three methods. Implementations must resolve all promises (never throw) — surface failures via `ok: false` results instead.

```ts
import type { ScoringPluginV1, SubmissionView } from '@lenserfight/plugins-scoring'

export function createMyScoringPlugin(): ScoringPluginV1 {
  return {
    id: () => 'my-plugin',
    metadata: () => ({
      displayName: 'My Plugin',
      // Declare every signal key you will ever emit. The worker drops
      // out-of-set keys and writes a `signal_not_declared` audit row.
      signals: ['my_plugin.score'],
    }),
    score: async (submission: SubmissionView) => {
      try {
        const value = computeMySignal(submission)
        return { ok: true, signals: { 'my_plugin.score': value } }
      } catch (err) {
        return { ok: false, reason: err instanceof Error ? err.message : 'unknown' }
      }
    },
  }
}
```

The same shape is used by [`examples/scoring/word-count-plugin/src/plugin.ts`](../../../examples/scoring/word-count-plugin/src/plugin.ts).

## 3. Register the plugin

Registration adds the plugin to the in-process registry so the platform-api worker can resolve it by `id`. Registration happens at platform-api boot, not at request time:

```ts
import { registerScoringPlugin } from '@lenserfight/plugins-scoring'
import { createMyScoringPlugin } from './my-plugin'

registerScoringPlugin('my-plugin', () => createMyScoringPlugin())
```

Plugins are not loaded dynamically. Adding a plugin requires merging it into `examples/scoring/` (or wiring it into the platform-api bundle) and rebuilding. This is intentional — see RFC-0002 for the security rationale.

## 4. Test conformance

Plugin tests should cover the documented contract corners:

```ts
describe('myScoringPlugin', () => {
  const plugin = createMyScoringPlugin()

  it('emits only declared signal keys', async () => {
    const r = await plugin.score(stubSubmission())
    if (!r.ok) throw new Error('expected ok')
    for (const key of Object.keys(r.signals)) {
      expect(plugin.metadata().signals).toContain(key)
    }
  })

  it('never throws — returns ok=false on internal error', async () => {
    const r = await plugin.score(badSubmission())
    expect(typeof r.ok).toBe('boolean')
  })

  it('completes within the per-plugin timeout budget', async () => {
    const start = Date.now()
    await plugin.score(stubSubmission())
    expect(Date.now() - start).toBeLessThan(5000)
  })
})
```

Run the project's tests with `pnpm nx test plugins-scoring` and any nested example projects.

## 5. Verify the persistence path

Plugins do not write to the database directly. The worker calls `public.fn_record_scoring_plugin_signal` on their behalf. To verify end-to-end:

1. Run the platform-api worker locally with your plugin registered.
2. Create a battle and post a submission via `lf battle local run` or the cloud worker (in dev).
3. Inspect `battles.scoring_plugin_signals` for rows tagged with your `plugin_id`.
4. Confirm every row's `signal_key` is one of the keys declared in `metadata().signals`.

A row missing for a successful submission means the worker rejected your output for being out-of-set — check the `audit.action_logs` table for the matching `signal_not_declared` row.

## What's stable, what's not

`ScoringPluginV1` is governed by RFC-0002:

- **Stable in V1**: the three method signatures, the `displayName` and `signals` fields on `metadata()`, the `{ ok: true; signals } | { ok: false; reason }` result shape.
- **Subject to additive change in V1 minor releases**: optional fields on `SubmissionView`, additional well-known signal name conventions.
- **Breaking changes**: bump to `ScoringPluginV2` with a deprecation cycle; V1 continues to work during overlap.

Pin to the versioned symbol (`ScoringPluginV1`) so a future V2 cannot silently change the shape under you.

## Next steps

- [RFC-0002 Scoring Plugin](../rfcs/RFC-0002-scoring-plugin.md) — interface governance, sandboxing, and the security boundary.
- [Adapter Mentorship Paths](./adapter-mentorship.md) — how to get a draft PR reviewed by `@maintainer-scoring`.
- [Word Count plugin reference](../../../examples/scoring/word-count-plugin) — runnable canonical example.
