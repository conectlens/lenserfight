# Universal Export System

LenserFight lets you export any first-class entity — **battles, workflows, lenses, agents** — into a portable file that you can share, audit, replay, or commit to git. This page explains the architecture, the security guarantees, and how to plug a new entity or format into the pipeline.

> **Status.** Phase **EX-1** is shipped: single-file exports for `battle` and `lens` in `markdown` and `json`. Bundles, YAML, workflow/agent serializers, and the localhost-desktop transport land in EX-2 through EX-5.

## TL;DR

| You want…                                | Format     | Destination       | Tooling that consumes it       |
| ---------------------------------------- | ---------- | ----------------- | ------------------------------ |
| Share a battle on GitHub                 | `markdown` | Cloud / Device    | GitHub auto-renders frontmatter |
| Feed an agent into a script              | `json`     | Cloud / Device    | LenserFight SDK + Claude API   |
| Commit a workflow to a repo (EX-2)       | `yaml`     | Workspace         | `lf run -f workflow.yaml`      |
| Snapshot everything for backup (EX-2)    | `bundle`   | Cloud (`.zip`)    | `lf import bundle.zip`         |

Pick **Markdown** for humans, **JSON** for code, **YAML** for GitOps.

## Layers (Nx boundaries)

| Layer                          | Package                          | Responsibility                                                         |
| ------------------------------ | -------------------------------- | ---------------------------------------------------------------------- |
| `libs/domain/exports`          | `@lenserfight/domain/exports`    | Envelope, manifest, canonical-JSON, redaction policy, invariants       |
| `libs/api/exports`             | `@lenserfight/api/exports`       | DTOs, error codes, type guards (shared with edge fn and SDK)           |
| `libs/data/exports`            | `@lenserfight/data/exports`      | `ExportsRepositoryPort` + Supabase implementation                      |
| `libs/shared/serializers`      | `@lenserfight/shared/serializers`| Serializer registry, JSON + Markdown adapters. Isomorphic.             |
| `libs/features/exports`        | `@lenserfight/features/exports`  | `ExportOrchestrator`, transports, `ExportButton`, `ExportModal`        |
| `supabase/functions/exports-*` | _(EX-2)_                         | `exports-build` / `exports-status` / `exports-revoke` edge functions   |

The serializer registry is **isomorphic** — no DOM, no Node-only APIs — so the same code runs in the browser, in `apps/cli`, and inside Deno edge functions.

## Domain model

Every export ships inside an `ExportEnvelope<T>`:

```ts
interface ExportEnvelope<T> {
  schema: `lenserfight.export.v${number}`  // pinned major version
  schemaVersion: string                    // semver, currently "1.0.0"
  kind: ExportKind                         // battle | workflow | lens | agent | bundle
  generatedAt: string                      // ISO-8601 UTC, NOT in the checksum
  generatedBy: { userId: string | null; via: 'web' | 'cli' | 'api' }
  source:      { host: string; tenantId: string | null; commit?: string }
  visibility:  'public' | 'authenticated' | 'owner'
  redactions:  string[]                    // every JSON path stripped by policy
  data:        T                           // the typed payload
  checksum:    string                      // sha256 of canonical(data)
}
```

Three invariants are enforced inside the domain layer:

1. The checksum is computed over the **canonical JSON of `data` only**, never including `generatedAt` — so identical entities always produce identical hashes (deduplication-friendly across machines).
2. `redactions` **must be non-empty** whenever the caller does not have `owner` scope. An anonymous export of a battle with `apiKey` and `judge_prompt` lists both paths under `redactions`.
3. `schemaVersion` is bumped on any **removal or rename**, never on additive changes (Protected Variations).

Validation runs after every envelope is minted — `ExportEnvelopeFactory.build()` throws `ExportValidationError` if any invariant is broken.

## Format guarantees

| Format     | Determinism                                | Hostile-content hygiene                              |
| ---------- | ------------------------------------------ | ---------------------------------------------------- |
| `markdown` | YAML frontmatter + GFM body + checksum footer | `<script>` / `<img onerror>` stripped, control chars stripped, frontmatter strings always double-quoted with backslash escaping |
| `json`     | Canonical JSON (RFC 8785 subset)           | No NaN/Infinity, no `bigint`, UTF-8 NFC strings      |
| `yaml`     | Block style only, no anchors/aliases (EX-2)| Same control-char policy as markdown frontmatter     |

The JSON serializer round-trips itself: serialize → parse → canonicalize must produce the original bytes. The `validate()` step in the registry catches any drift before the user gets a download.

## Security model

### Redaction policy

`RedactionPolicy` is the **single authority** for what gets stripped. The same code runs server-side (edge fn) and client-side (localhost export of user-owned data), so the two paths can never diverge.

| Tier            | Always stripped                                              | Owner sees | Non-owner sees |
| --------------- | ------------------------------------------------------------ | ---------- | -------------- |
| `apiKey`, `secret`, `token`, `password`, `byok`, `authorization`, `signing_secret`, `bearer`, `credentials` | yes | ❌ | ❌ |
| `email`, `billing`, `stripe`, `ip_address`, `internal_notes`, `voter_id` | – | ✅ | ❌ |
| `judge_prompt`, `evaluation_rationale`, `admin_note`         | –          | ✅          | only if authenticated |

Tests in `libs/domain/exports/src/lib/redaction.spec.ts` cover all three tiers, nested objects, and arrays.

### Path traversal

The `safeJoinWithinRoot` helper (Pure Fabrication in the domain layer) normalizes every relative path before any filesystem adapter sees it. It refuses:

- `..` segments that escape the workspace root (after collapsing redundant `.` and double separators)
- paths containing `\0` (NUL bytes)
- empty results
- Windows-reserved names (`CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9`)

The cloud transport never touches a filesystem; the local-workspace transport (EX-4) routes every write through this helper.

### XSS / frontmatter injection

The markdown serializer treats every string as untrusted. Control characters are stripped, HTML tags and comments are stripped, and frontmatter strings are always double-quoted with backslash escaping. A title like `<script>alert(1)</script>OK` lands in the output as just `OK`. Tests in `libs/shared/serializers/src/lib/serializers.spec.ts` lock this in.

### Signed downloads (EX-2)

| Property           | Value                                                  |
| ------------------ | ------------------------------------------------------ |
| TTL                | 10 min single / 30 min bundle                          |
| Replay defence     | nonce stored in `export_jobs.request->>'nonce'`; reuse → `410 Gone` |
| Tenant isolation   | bucket key prefixed with `<tenantId>/`; cross-tenant bundles → `409 Conflict` |
| Bundle size cap    | 100 MB / request                                       |
| Rate limit         | 30 single/min, 5 bundle/hr (token bucket)              |

## GRASP / OOAD walk-through

The system uses each GRASP principle once, with a concrete callsite — no abstract theory:

| Principle              | Where                                          | What it buys                                                              |
| ---------------------- | ---------------------------------------------- | ------------------------------------------------------------------------- |
| Information Expert     | per-entity serializers (next to their domain)  | Battle owns its export shape; workflow doesn't reach into battle internals. |
| Creator                | `ExportEnvelopeFactory`                        | The only place envelopes are minted — invariants can't be bypassed.       |
| Controller             | `ExportOrchestrator`                           | UI never coordinates fetch+serialize+deliver; one entry point per use case. |
| Low Coupling           | `ExportTransport` interface                    | Cloud ↔ local swap doesn't touch serializers.                             |
| High Cohesion          | `libs/features/exports`                        | UI, hooks, runtime detection, orchestrator wiring co-located.             |
| Polymorphism           | `Serializer` + `ExportTransport`               | New formats / destinations plug in via registration, no `switch` ladder.  |
| Pure Fabrication       | `RedactionPolicy`, `SerializerRegistry`, `safeJoinWithinRoot` | No natural domain home, isolated and easy to mock.        |
| Indirection            | `ExportsRepositoryPort`                        | Edge URL / signed-URL provider / bucket can change in one place.          |
| Protected Variations   | `schemaVersion` + manifest version             | Additive fields are safe; removals require a major bump.                  |

## Reusing existing UI

`ExportModal` is composed entirely from `libs/ui/*` primitives — never raw HTML:

- `Dialog` + `ModalFooter` (overlays) for the shell and sticky footer
- `SegmentedControl` (components) for both the format and destination pickers, via `FormatSelector` / `DestinationSelector`
- `InlineNotice` (feedback) for the privacy explainer and error surface
- `Button` (components) wrapped by `ModalFooter`
- `HelpButton` (components) deep-linked to this very page

The HelpButton resolves the user's stored language via `useDocsLocale()` so a Turkish user lands on the Turkish translation of this article, an English user lands here.

## Destinations

| Transport              | Runtimes                                  | What it does                                                        |
| ---------------------- | ----------------------------------------- | ------------------------------------------------------------------- |
| `cloud-download`       | cloud / localhost-browser / localhost-desktop | Enqueues an `exports-build` job, returns a 10-min signed URL.    |
| `local-download`       | localhost-browser / localhost-desktop     | Renders the file client-side and triggers `<a download>`. No upload. |
| `local-workspace` _(EX-4)_ | localhost-desktop only                 | Writes atomically to `.lenserfight/exports/<kind>/<slug>/…`         |

`useRuntimeMode()` (backed by `useSyncExternalStore`) feeds the destination selector. SSR snapshot is always `'cloud'` so the first render is deterministic; the client may resolve to `localhost-browser` or `localhost-desktop` without a hydration mismatch.

## How to add a new format

1. Implement the `Serializer<T>` interface for the `(kind, format)` pair.
2. Register it in `libs/shared/serializers/src/lib/bootstrap.ts`.
3. Add the format to `EXPORT_FORMATS` and `formatExtension()` in `libs/domain/exports`.
4. The `FormatSelector` picks up the new option automatically; no orchestrator change.

If your serializer introduces a new field on `ExportEnvelope`, bump `EXPORT_SCHEMA_VERSION` only when the change is **removal or rename**. Additive fields stay on `1.x.y`.

## File layout (EX-4+)

```
.lenserfight/
├── exports/
│   ├── battles/<slug>/<YYYY-MM-DDTHHMMSSZ>--<shortid>.{md,json,yaml}
│   ├── workflows/<slug>/…
│   ├── lenses/<slug>/…
│   └── agents/<slug>/…
├── manifests/<exportId>.manifest.json
├── snapshots/<YYYY-MM-DD>/<exportId>.zip
└── cache/exports/<sha[:2]>/<sha>          # content-addressed dedup
```

`buildExportFilename({ slug, format })` produces the filename: kebab-case slug + ISO-8601 basic UTC + 6-char base32 short id. Collision-safe across machines and clocks.

## Phasing

| Phase | Scope                                                                            |
| ----- | -------------------------------------------------------------------------------- |
| EX-1  | Domain types, registry, JSON + Markdown for `battle` and `lens`, cloud transport. |
| EX-2  | YAML, bundle ZIP, bulk toolbar, edge fn + queue, signed URLs, audit log.          |
| EX-3  | Workflow + Agent serializers, preview modal, validation lifecycle UI, history.    |
| EX-4  | Localhost-desktop transport (Tauri bridge), `.lenserfight/exports/` writes.       |
| EX-5  | Snapshots, replay/import compatibility tests, schema v1→v2 migration framework.   |

Each phase is independently shippable behind the reliability gate.

## Related

- [`libs/domain/exports/src/lib/types.ts`](../../../../libs/domain/exports/src/lib/types.ts) — `ExportEnvelope`, `ExportManifest`, kinds, formats, visibility
- [`libs/shared/serializers/src/lib/SerializerRegistry.ts`](../../../../libs/shared/serializers/src/lib/SerializerRegistry.ts) — registration + lookup
- [`libs/features/exports/src/lib/orchestrator/ExportOrchestrator.ts`](../../../../libs/features/exports/src/lib/orchestrator/ExportOrchestrator.ts) — controller
- [`libs/features/exports/src/lib/components/ExportModal.tsx`](../../../../libs/features/exports/src/lib/components/ExportModal.tsx) — UI entry point
