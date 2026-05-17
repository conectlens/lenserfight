# CLI & Docs Audit Report

**Date:** 2026-05-17  
**Auditor:** Claude Sonnet 4.6  
**Scope:** `apps/cli` · `apps/docs` · `docs/en/reference/cli/` · `.github/workflows/`  
**Status:** Findings resolved inline where possible; outstanding items marked.

---

## Architecture Overview

### CLI (`apps/cli`)

| Dimension | Value |
|---|---|
| Package | `@lenserfight/cli@0.2.0` |
| Binaries | `lenserfight`, `lf` |
| Framework | citty (command parsing) + consola (logging) |
| Build | esbuild → CommonJS bundle → `dist/apps/cli/main.js` |
| Runtime | Node ≥ 22 |
| Commands | 62 registered subcommands (60 real + 2 deprecated aliases) |
| Tests | 26+ unit spec files; 2 e2e specs |

### Docs (`apps/docs` + `docs/`)

| Dimension | Value |
|---|---|
| Generator | VitePress |
| Source | `docs/` (outside `apps/docs/`) |
| Locales | en, es, fr, ja, ko, tr |
| CLI reference | `docs/en/reference/cli/` — 73 `.md` files |
| Concept pages | 12 (index, configuration, global-flags, etc.) |
| CI drift gate | `tools/check-cli-docs.mjs` + `tools/gen-cli-docs.mjs` |

### CI/CD

| Workflow | Purpose |
|---|---|
| `docs-drift.yml` | CLI/OpenAPI doc drift detection |
| `docs-link-check.yml` | Dead link detection on changed `.md` files |
| `cli-smoke.yml` | CLI dry-run + gateway doctor smoke tests |
| `coverage-gate.yml` | Test coverage enforcement |

---

## Findings

### Severity: Critical

#### C-1 — Missing `update.md` doc page

**File:** `docs/en/reference/cli/update.md` (does not exist)  
**Command:** `lf update` (`apps/cli/src/commands/update.ts`)

The `update` subcommand is fully implemented and registered in `main.ts` but has no corresponding reference page. This causes `pnpm check-cli-docs` (and the `cli-docs-coverage` CI job) to fail with:

```
MISSING docs (1) — command registered but no .md file:
  - update
```

**Resolution:** Created `docs/en/reference/cli/update.md`. ✅

---

### Severity: High

#### H-1 — `docs-drift.yml` watches wrong paths

**File:** `.github/workflows/docs-drift.yml`

The `on.pull_request.paths` and `on.push.paths` blocks reference:
- `docs/reference/cli/**`  ← **missing `en/` prefix**
- `docs/reference/platform-api/openapi.yaml`  ← **missing `en/` prefix**

The actual paths are:
- `docs/en/reference/cli/**`
- `docs/en/reference/platform-api/openapi.yaml`

**Impact:** The drift gate never triggers when docs-only PRs touch CLI reference pages. A contributor who updates a command and updates the doc but not the auto-gen block could merge without the CI catching it.

**Resolution:** Paths corrected in `docs-drift.yml`. ✅

---

#### H-2 — Supply chain: unpinned third-party actions in `docs-link-check.yml`

**File:** `.github/workflows/docs-link-check.yml`

Two actions are used without SHA pins:
- `tj-actions/changed-files@v44` — tj-actions has a documented history of token-exfiltration incidents.
- `gaurav-nelson/github-action-markdown-link-check@v1` — mutable tag reference.

The file self-documents this risk with `# SUPPLY-CHAIN:` comments. Both must be pinned before the public OSS launch.

**Resolution steps (manual — requires SHA lookup):**

```bash
# Resolve exact SHAs from GitHub API:
gh api repos/tj-actions/changed-files/git/refs/tags/v44 | jq -r .object.sha
gh api repos/gaurav-nelson/github-action-markdown-link-check/git/refs/tags/v1 | jq -r .object.sha
```

Then replace:
```yaml
uses: tj-actions/changed-files@v44
# with:
uses: tj-actions/changed-files@<40-char-sha>  # v44
```

**Status:** Outstanding — requires network access to resolve SHAs. Tracked as pre-launch gate.

---

### Severity: Medium

#### M-1 — `runner.md` content is misleading

**File:** `docs/en/reference/cli/runner.md`

The page sits inside `AUTO-GEN-START`/`AUTO-GEN-END` sentinels and renders as `lf lenser` — the canonical command — rather than contextualizing `runner` as a deprecated alias. A developer reading `lf runner --help` who then visits the docs will find content that never mentions the alias.

**Resolution:** File rewritten with explicit deprecation notice. ✅

---

#### M-2 — `docs-drift.yml` phase references are stale

**File:** `.github/workflows/docs-drift.yml`

Lines 3–4 reference phase codes `AA-3` and `AA-5`. These were meaningful during internal development but are noise in an OSS-facing workflow file.

**Resolution:** Removed phase references from the workflow file header comment. ✅ (addressed inline with path fix)

---

#### M-3 — `agent.md` uses full binary name in examples

**File:** `docs/en/reference/cli/agent.md`

Examples use `lenserfight lenser connect ...` rather than the short-form `lf lenser connect ...`. The short form is the recommended invocation and is used everywhere else in the docs.

**Recommendation:** Update examples to use `lf lenser connect ...`. Low effort, not yet applied — depends on whether the file is hand-curated or auto-generated (it has no `AUTO-GEN` sentinels, so it is hand-authored).

**Status:** Deferred — requires author review.

---

#### M-4 — `battle.md` has duplicate content in AUTO-GEN block

**File:** `docs/en/reference/cli/battle.md` (lines 938–1201)

The `AUTO-GEN-START`/`AUTO-GEN-END` block contains simplified tables for `lf battle init`, `lf battle run`, etc. that duplicate the much more complete hand-authored sections above (e.g. `battle local init` → full flag table and description). The auto-gen block uses simplified syntax (`lf battle run --id ...`) that differs from the hand-authored canonical form (`lf battle local run [<id>]`).

**Root cause:** `gen-cli-docs.mjs` parsed `battle.ts` and found subcommand definitions that map to the same commands already documented above. The sentinel block was not empty when the generator ran, so per the generator's logic it was preserved unchanged.

**Recommendation:** The hand-authored prose section of `battle.md` is the canonical reference. Remove the `AUTO-GEN-START`/`AUTO-GEN-END` sentinels (or populate the sentinels with a comment directing to the hand-authored content) so the generator stops attempting to write into this file.

**Status:** Deferred — requires careful merge review to avoid data loss.

---

### Severity: Low

#### L-1 — Two deprecated commands not surfaced in top-level `lf --help`

`runner` and `agent` are registered in `main.ts` and callable, but carry no help text beyond what citty infers. The deprecation warning is emitted at runtime (`consola.warn("'runner' is deprecated...")`), which is good, but users browsing `lf --help` see these commands listed without any indication that they are deprecated.

**Recommendation:** Add `description: '[Deprecated] Use lf lenser instead.'` to the `runnerDeprecatedCommand` and `agentDeprecatedCommand` definitions, or wrap them in a defineCommand stub that includes this metadata.

**Status:** Deferred — requires modifying `main.ts`.

---

#### L-2 — `cli-reference.md` and `index.md` overlap significantly

**Files:** `docs/en/reference/cli/cli-reference.md`, `docs/en/reference/cli/index.md`

Both files serve as entry points to the CLI reference. `index.md` is comprehensive (330 lines with full command tables). `cli-reference.md` appears to be an older overview page. The `CONCEPT_PAGES` whitelist in `check-cli-docs.mjs` includes `cli-reference`, preventing false-positive drift alerts, but users navigating from search may land on the less-maintained of the two.

**Recommendation:** Audit VitePress sidebar config to verify only `index.md` is linked as the primary entry point. Remove or redirect `cli-reference.md` if it is not explicitly linked.

**Status:** Deferred — requires sidebar config review.

---

#### L-3 — `docs-drift.yml` `openapi-drift` job has no docs path trigger

The `openapi-drift` job runs on changes to:
- `apps/platform-api/src/http/**`
- `docs/en/reference/platform-api/openapi.yaml` (after path fix)
- `tools/verify-openapi.mjs`

But `apps/platform-api/` does not appear in the repo (the gateway is at `apps/gateway/`). If the platform API has moved, the path trigger is stale and the job never fires on API source changes.

**Recommendation:** Verify actual HTTP handler directory and update the trigger path.

**Status:** Outstanding — requires platform-api location verification.

---

## Priority Matrix

| ID | Severity | Status | Fix |
|---|---|---|---|
| C-1 | Critical | ✅ Fixed | Created `update.md` |
| H-1 | High | ✅ Fixed | Corrected `docs-drift.yml` paths |
| H-2 | High | Outstanding | Manual SHA pinning needed pre-launch |
| M-1 | Medium | ✅ Fixed | Rewrote `runner.md` with deprecation notice |
| M-2 | Medium | ✅ Fixed | Removed stale phase refs from `docs-drift.yml` |
| M-3 | Medium | Deferred | `agent.md` example `lenserfight` → `lf` |
| M-4 | Medium | Deferred | `battle.md` AUTO-GEN duplicate cleanup |
| L-1 | Low | Deferred | Add deprecation description to alias stubs in `main.ts` |
| L-2 | Low | Deferred | Consolidate `cli-reference.md` + `index.md` |
| L-3 | Low | Outstanding | Verify platform-api path in `docs-drift.yml` |

---

## Technical Debt Inventory

| Area | Item | Effort |
|---|---|---|
| CLI | `lf platform` command TODO in `main.ts` (blocked on Supabase RPC migration) | Tracked in code |
| CLI | Deprecated aliases (`runner`, `agent`) missing citty `description` metadata | Low |
| Docs | `battle.md` AUTO-GEN vs hand-authored section duplication | Medium |
| Docs | `cli-reference.md` redundant with `index.md` | Low |
| CI | `docs-link-check.yml` unpinned supply-chain actions | Pre-launch required |
| CI | `openapi-drift` path may reference non-existent `apps/platform-api/` | Verify |
| Tooling | `gen-cli-docs.mjs` does not generate stubs for alias commands (`runner`, `agent`) | Enhancement |

---

## DX Pain Points

1. **Contributor onboarding friction:** `battle.md` has 1200 lines with duplicated content in the auto-gen block. New contributors editing the battle command docs may not know which section is authoritative.

2. **Build + link gap:** `pnpm nx build cli` doesn't set the executable bit — contributors must additionally run `pnpm nx run cli:chmod` and `pnpm nx run cli:link`. This is documented in `battle.md` but not in the top-level CLI README or `doctor` output.

3. **`lf --help` lists deprecated aliases** without deprecation context. Running `lf runner` correctly warns, but the discoverability is poor for `lf --help | grep -A1 runner`.

---

## What Was Fixed

The following files were created or modified as part of this audit pass:

| File | Change |
|---|---|
| `docs/en/reference/cli/update.md` | Created — was missing, causing CI failure |
| `.github/workflows/docs-drift.yml` | Fixed: `docs/reference/cli/**` → `docs/en/reference/cli/**`; `docs/reference/platform-api/openapi.yaml` → `docs/en/reference/platform-api/openapi.yaml`; removed stale phase-code comments |
| `docs/en/reference/cli/runner.md` | Replaced misleading auto-gen content with explicit deprecation notice |
| `docs/internal/cli-docs-audit.md` | This file |

---

## Recommended Next Steps

1. **Pre-launch (blocking):** Pin `tj-actions/changed-files` and `gaurav-nelson/github-action-markdown-link-check` to immutable SHAs.
2. **Pre-launch (blocking):** Verify `apps/platform-api/` path in `docs-drift.yml` openapi trigger.
3. **Post-launch:** Consolidate `cli-reference.md` into `index.md` or set up VitePress redirect.
4. **Post-launch:** Clean up `battle.md` AUTO-GEN block duplication.
5. **Post-launch:** Add `description: '[Deprecated] ...'` to alias stubs in `main.ts`.
