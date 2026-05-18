# Documentation Audit Summary — 2026-05-18

## Scope

Full synchronization audit of `apps/docs`, `docs/en/**`, README files, CLI docs, workflow docs, provider docs, gateway docs, and deployment docs against current implementation state.

---

## Classification Results

### VALID (Accurate, implementation-aligned)

| Area | Files | Evidence |
|------|-------|----------|
| Gateway documentation | 11 files in `docs/en/explanation/gateway/` | All claims verified against `apps/gateway/src/` — Phase D complete, architecture accurate |
| CLI documentation | 74 files in `docs/en/reference/cli/` | All 62 commands documented, flags/examples match implementation |
| Battle documentation | 8+ files | 5 battle types, execution flow, replay, judging all match `libs/features/battles/` |
| Execution API reference | `docs/en/reference/platform-api/` | Cloud API (Cloudflare Workers) correctly documented |
| Provider adapters (runtime) | 10 providers | openai, anthropic, google, mistral, ollama, fal, stability, elevenlabs, kling, suno — all have real adapters |
| DAG simulation/validation | `docs/en/reference/workflows/execution-engine.md` | Kahn's algorithm, cycle detection, wave calc — all match `libs/domains/execution/src/simulate.ts` |
| Workflow SSE events | Event taxonomy docs | 26+ event types match `workflow-events.ts` exactly |

### STALE (Fixed in this audit)

| Issue | Files Fixed | Change |
|-------|------------|--------|
| `platform-api` → `worker` rename | `docker.md`, `vps.md`, `installation.md`, `development-workflow.md` | Updated all build commands, paths, process names |
| Broken cross-repo link | `reference/workflows/execution-engine.md` | Removed dead `lenserfight-platform/apps/api/` link |
| Worker described as HTTP API | `docker.md`, `vps.md` | Clarified worker is background-only, no HTTP surface |
| Worker architecture diagram | `docker.md` | Updated from "Platform API (8786)" to "Worker (background)" |
| Midjourney listed as `byok_only` | `providers/midjourney/index.md`, `reference/ai-providers.md` | Marked as `deprecated` (no public API, no adapter) |

### PARTIAL (Missing important implementation details — now fixed)

| Issue | Files Fixed | Change |
|-------|------------|--------|
| Workflow node catalog claims all nodes are executable | `reference/workflows/workflow-node-catalog.md` | Added implementation status warning banner + per-section status markers |
| Workflow engine architecture missing status note | `explanation/workflows/workflow-engine-architecture.md` | Added info box clarifying Lens-only execution support |
| Worker loop path stale | `explanation/workflows/workflow-engine-architecture.md` | Fixed `apps/platform-api/src/worker/` → `apps/worker/src/worker/` |

### EXPERIMENTAL (Documents incomplete functionality)

| Area | Status | Notes |
|------|--------|-------|
| Workflow node types (Logic, Data, AI, Storage, Communication, Integrations, Media, Battle) | Designed, not executable | 40+ node types in UI palette but only Lens nodes run |
| Workflow scheduling | Schema exists, no scheduler | `workflow_schedules` table populated but no execution trigger |
| Async media providers (Sora, Kling, Suno) | Polling framework exists | Integration status depends on external API availability |
| Catalog-only providers (openrouter, perplexity, xai, groq, deepseek, bedrock, runway, litellm, lmstudio) | No adapter code | Pure BYOK gateway pass-through, no native runtime |

### DUPLICATED

| Issue | Locations | Recommendation |
|-------|-----------|----------------|
| Changelog synced in 2 places | root `changelog.md`, `apps/docs/changelog.md` | Auto-synced by VitePress config — acceptable |
| Turkish translations (113 files) | `docs/tr/` | Subset of English; may lag behind — acceptable for now |

### DEAD (References removed systems)

None found after fixes applied. All `platform-api` references to the *documentation section* are valid (they describe the cloud execution API). The removed *local app path* references have been corrected.

---

## Provider Capability Matrix (Verified)

| Provider | Text | Image Gen | Video Gen | Audio Gen | Vision Input | Document Input | Status |
|----------|------|-----------|-----------|-----------|-------------|---------------|--------|
| openai | ✅ | ✅ (DALL-E) | 🟡 (Sora polling) | ❌ | ✅ | ⚠️ (fallback to text) | Runnable |
| anthropic | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | Runnable |
| google | ✅ | ✅ (Imagen) | 🟡 (Veo polling) | 🟡 (Lyria polling) | ✅ | ✅ | Runnable |
| mistral | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | Runnable |
| ollama | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | Runnable |
| fal | ❌ | ✅ (Flux) | ✅ | ❌ | ❌ | ❌ | Runnable |
| stability | ❌ | ✅ (SD4) | ❌ | ❌ | ✅ (ref image) | ❌ | Runnable |
| elevenlabs | ❌ | ❌ | ❌ | ✅ (TTS) | ❌ | ❌ | Runnable |
| kling | ❌ | ❌ | ✅ | ❌ | ✅ (img2vid) | ❌ | Runnable |
| suno | ❌ | ❌ | ❌ | ✅ (music) | ❌ | ❌ | Runnable |
| midjourney | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Deprecated |

---

## Remaining Documentation Risks

1. **Workflow examples in tutorials** (`tutorials/workflow-examples/`) — 5 large example docs (20-29KB each) describe multi-node workflows that cannot currently execute end-to-end. They should be marked as design references, not runnable tutorials.

2. **Sparse `workflow.md` CLI reference** — The `docs/en/reference/cli/workflow.md` is minimal; should be expanded with subcommand documentation.

3. **Turkish translation lag** — `docs/tr/` has 113 files vs 527 English files. Some translated content may reference stale architecture.

4. **Stub locale docs** — 8 languages (es, fr, de, it, ja, ko, pt, ru, zh) have only 3 placeholder files each.

5. **OpenAI document input** — Docs claim "document" input modality but implementation falls back to text with a note. Consider clarifying this limitation.

---

## Follow-up Issues Required

1. **Workflow DAG runner implementation** — Most critical gap. Without this, 39/40 node types are design-only.
2. **Workflow tutorial accuracy pass** — Mark large tutorial examples as "design reference" until DAG runner ships.
3. **Turkish docs refresh** — Audit `docs/tr/` for stale `platform-api` references.
4. **Provider multimodal capability matrix doc** — Consider generating from `capability-matrix.ts` to prevent drift.
5. **CLI workflow subcommand docs** — Expand sparse `workflow.md` reference.

---

## Files Modified in This Audit

- `docs/en/tutorials/deployment/docker.md` — 5 edits (architecture, Dockerfile, compose, build, health checks)
- `docs/en/tutorials/deployment/vps.md` — 3 edits (build, PM2, monitoring)
- `docs/en/tutorials/local/installation.md` — 3 edits (serve command, scripts table, env var)
- `docs/en/tutorials/local/development-workflow.md` — 2 edits (tree structure, debugging)
- `docs/en/reference/workflows/execution-engine.md` — 1 edit (broken cross-repo link)
- `docs/en/reference/workflows/workflow-node-catalog.md` — 12 edits (status banner + section markers)
- `docs/en/explanation/workflows/workflow-engine-architecture.md` — 2 edits (status note, worker path)
- `docs/en/providers/midjourney/index.md` — 1 edit (deprecated status)
- `docs/en/reference/ai-providers.md` — 1 edit (deprecated section)
