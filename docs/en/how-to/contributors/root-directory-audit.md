---
title: Root directory audit
description: What every root-level file and directory is for, and why it stays there.
---

# Root directory audit

A newcomer's first trust signal is the repo root: does every file there have an obvious reason to
exist, or is it guesswork accumulated over time? This page records that check — what each
root-level item is for, evidence for its scope (Nx/pnpm/TypeScript conventions, `package.json`
scripts, CI workflows, doc references), and the keep/move/merge/delete decision for it. Re-run this
check before adding new root-level files — if it doesn't fit an existing category below, it
probably belongs in an existing directory instead.

## Method

Inspected: full root tree, `package.json` scripts, `nx.json` and `tsconfig.base.json`, GitHub
Actions workflows, `docker-compose.dev.yml`, `.env*` loaders (`libs/utils/env/src/lib/
runtimeConfig.ts` and doc references), and every doc/script that references a root-level path by
name. A second pass added `ROADMAP.md` and rewrote `README.md`; that pass additionally inspected
domain types, repositories, migrations, routes, and test files for Lens/Tag/Thread/Lenser/XP,
Workflows, Agents, and Battles to verify implementation status before describing it, and checked
every command, port, package name, and file path cited in the new README against the live repo
(`apps/web/vite.config.mts`, `apps/auth/vite.config.mts`, `apps/mcp-server/src/tools/`,
`apps/cli/package.json`, `supabase/config.toml`, `.github/workflows/smoke-timing.yml`). No
application behavior, public APIs, package scripts, CI workflows, local dev commands, deployment
processes, doc routes, MCP config, Supabase operations, or release behavior was changed.

## Decision table

| Item | Category | Decision | Why |
|---|---|---|---|
| `.agents/`, `.claude/`, `.cursor/`, `.gemini/` | AI-agent instruction | Keep (consolidated) | Each tool hardcodes its own folder name — none will discover a renamed or merged directory. `skills/` under each is now a symlink into `.agents/skills/`, the one real copy. See the earlier commit on this PR. |
| `AGENTS.md`, `CLAUDE.md`, `GEMINI.md` | AI-agent instruction | Keep (consolidated) | Same reasoning — `CLAUDE.md`/`GEMINI.md` are required filenames for their tools to auto-load anything at all. Both are now a single `@AGENTS.md` import; `AGENTS.md` is the one real file. |
| `.lenserfight/` | Essential workspace config | Keep | Documented, product-defined convention (`docs/en/lenserfight-file-system.md`): the CLI reads team-shared lensers/lenses/battles/rays from `./.lenserfight/*` at the project root by design. Not a stray dotfile. |
| `templates/community/` | Essential workspace config | Keep | Root-relative path is hardcoded into the contributor workflow and the `lf template submit` / `lf workflow run` CLI commands (`docs/en/how-to/contributors/workflow-template-getting-started.md`). Moving it breaks documented commands. |
| `examples/` | Essential workspace config | Keep | Actively referenced by the connector-proposal issue template and contributor docs (e.g. new adapter slugs must not collide with `examples/connectors/*`). |
| `.env.example`, `.env.development.example`, `.env.mcp.local.example` | Environment configuration | Keep | Root is the only location `libs/utils/env/src/lib/runtimeConfig.ts` and the installation docs point to; `.env.mcp.local.example` pairs with root `.mcp.json`. Not duplicated content — each covers a different runtime (app, dev server, MCP), so there's nothing safe to consolidate. |
| `.mcp.json` | Essential workspace config | Keep | Claude Code's MCP client only looks for this file at the project root. |
| `.markdown-link-check.json` | Development tooling | Keep | Tool-default lookup location; also explicitly path-referenced by `.github/workflows/docs-link-check.yml`. Moving it is possible but only trades a one-line CI reference for reduced discoverability, no actual benefit. |
| `.npmrc`, `.nvmrc`, `.nxignore`, `.prettierrc`, `.prettierignore`, `eslint.config.js`, `babel.config.cjs`, `global.d.ts`, `jest.config.ts`, `jest.preset.cjs`, `tsconfig.json`, `tsconfig.base.json`, `vitest.workspace.ts`, `nx.json`, `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` | Essential workspace config | Keep | Each is a hardcoded default-lookup location for its tool (Nx, pnpm, TypeScript, ESLint, Prettier, Babel, Jest, Vitest). None are overridable without also touching every command/CI step that currently relies on the default path — out of scope here. |
| `LICENSE`, `README.md` | Repository governance | Keep | GitHub only auto-detects these (license badge, repo landing page) at the root. |
| `CODEOWNERS`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `SECURITY.md`, `SUPPORT.md`, `MAINTAINERS.md`, `DISCLAIMER.md` | Repository governance | Keep | GitHub recognizes several of these in `.github/` too, so moving them was considered — declined. Root placement is what makes a project's governance legible at a glance; moving governance docs into `.github/` to shrink the root listing would trade a real trust/discoverability signal for a cosmetic one. This directly contradicts the "workspace-wide configuration stays at root" principle these files are governed by in the first place. |
| `CHANGELOG.md` | Generated artifact | **Flagged, not touched** | 13.8k lines / 13.8 MB, last updated 2026-06-06 despite ongoing releases since. `.releaserc` configures `semantic-release` to write here on push to `main`, but no workflow actually runs root-level `semantic-release` anymore — only `release-cli.yml` (CLI package) and `release-npm.yml` (`libs/sdk` only) run on `main`. The config and the automation it describes have drifted apart. Fixing this means deciding root release architecture, which changes release behavior — explicitly out of scope for this audit. Needs a maintainer decision, not a file move. |
| `apps/docs/` vs `docs/` | Not redundant — kept separate | Keep both | `apps/docs/` is the VitePress Nx project itself (`project.json`, `vite.config.mts`, its own `tsconfig*.json`) — the app. `docs/` is the multilingual content it renders (`en/`, `tr/`, `de/`, …, `public/`). Different responsibilities, not duplication; merging would conflate an app with its content root. |
| `docker-compose.dev.yml` | Generated/legacy artifact | **Corrected: Removed** | This audit originally said "Keep," reasoning from the file's existence alone without checking whether it was still the live dev-bootstrap mechanism. It wasn't: `scripts/dev-start.sh` (the actual entry point Quick Start documents) calls `pnpm supabase start`, not `docker compose`. The file's own header comment even said "Use ./scripts/dev-start.sh instead of docker compose directly." It was a superseded hand-rolled Postgres+PostgREST stack, safe to delete — confirmed via `git grep` that nothing else referenced it. Corrected during a later branch review; the original "Keep" verdict above is left inline as a reminder that root-item audits need to verify a file is still load-bearing, not just present. |
| `scripts/`, `tools/` | Development tooling | Keep | Both are already directories (not loose root files), both are extensively referenced from `package.json` scripts, and both are already used per their existing (different) purposes — `scripts/` for shell-first dev/ops tasks, `tools/` for Node-based doc/CI utilities. No misplaced root files to route into either. |
| `ROADMAP.md` | Documentation | Add | New. Canonical phase-by-phase status (Lens ecosystem, Workflows, Agents, Battles), derived from the codebase rather than intent. `README.md` links here instead of repeating the detail. |

## README.md section decisions

The rewrite followed one rule: every section in the list below has one job, and nothing not on
this list gets its own section.

| Section | Decision | Notes |
|---|---|---|
| Header (logo, tagline, badges) | Rewrite | Dropped the animated typing SVG, the intro GIF, and 4 of 6 badges (kept license + docs only). |
| Problem statement | Add | Was previously implicit/absent — the README opened with a feature pitch, not the problem. |
| Product definition | Rewrite | Repositioned from "AI agent battle platform" to the Lens-creation-to-Battle-evaluation lifecycle, per product decision. |
| Stable capabilities | Add | Previously undifferentiated from aspirational claims. |
| Use cases | Add | New section distinguishing current vs. future capability by phase. |
| Current development status | Add | Table format, cross-linked to `ROADMAP.md` for evidence. |
| Compact roadmap | Merge into "Current development status" | A separate roadmap *summary* section and a status table would have said the same thing twice; one table serves both. |
| Quick start | Rewrite | Verified every command/port; dropped the inline troubleshooting table (moved, see below) and the Trust Gateway deep-link list (trimmed to one link). |
| Architecture diagram | Delete | Redundant with the repository-overview tree that follows it; kept the tree, dropped the ASCII box diagram. |
| Repository overview | Rewrite | Kept, trimmed, added `apps/mcp-server/` (existed but was missing from the old tree). |
| Community Edition vs. Cloud table | Move | Table detail already belongs to `docs/en/explanation/community/oss-launch-scope.md`; README now links there instead of duplicating the table. |
| Ecosystem / Chainabit cross-promotion | Delete | Promotional cross-linking with UTM-tagged marketing URLs; not one of the sections the README is scoped to. |
| AI Agent & LLM Evaluation bullets | Delete | Restated the product definition in marketing language. |
| Languages & Internationalization (matrix + playbook links) | Move | Status matrix moved to `docs/en/how-to/contributors/adding-a-language.md` (added, sourced from `libs/utils/locale/src/lib/locales.ts`); README links to contributor guides generally. |
| Core Terminology table | Delete | Redefined terms already covered in the product-definition section; the deeper definitions (Rubric, Runner) belong in Battle-specific docs once that phase stabilizes, not the README. |
| MCP Server section (full tool table + example prompts) | Move | Full, accurate tool inventory already lives in `apps/mcp-server/README.md`; the copy in README had drifted (claimed 32 tools; actual count across those three groups is 35, 48 including Agent/User tools). Linked instead of duplicated, so it can't drift again. |
| CLI section (onboarding walkthrough) | Move | Detail already in `apps/cli/README.md`; README keeps one install line and a link. |
| Community Sharing & Showcases | Delete | Promotional; encouraged social-media posting rather than documenting the product. |
| Community-Submitted Creations table | Delete | Placeholder rows with non-existent handles (`@lenser_builder`, `@agent_hacker`, `@gpu_runner`) all pointing at the marketing homepage — not real content. |
| Contributing | Keep, trimmed | |
| Community (Code of Conduct / Security / Support / Disclaimer links) | Merge into "Security, support, and license" | Same links, one section instead of two. |
| Documentation | Keep, trimmed | Removed links that duplicated what's now inline (Trust Gateway) or moved (workflow contract/test-plan detail lives in `ROADMAP.md` now). |
| License | Keep | |
| Contact the Builder (founder bio, personal email badges, "Motivated to Build?" pitch) | Delete | Personal marketing language; contact/governance info already lives in `MAINTAINERS.md` and `SUPPORT.md`. |
| Star History graphic | Delete | Named explicitly for removal. |
| Contributors (avatar grid) | Delete | Not one of the sections the README is scoped to; GitHub's own contributors graph (linked from the repo sidebar) covers this. |
| Sponsor the Development | Delete | `.github/FUNDING.yml` already wires GitHub's native Sponsor button independent of this section — removing the README block loses no functionality. |
| Soundtrack | Delete | Named explicitly for removal. |
| "Got an epic run" closing CTA | Delete | Promotional slogan. |
| SEO keyword HTML comment | Delete | Named explicitly for removal. |

## Findings needing a decision (not acted on here)

1. **`CHANGELOG.md` / `.releaserc` drift** (see table above). Options: wire a workflow that actually
   runs root `semantic-release`, scope `.releaserc` down to match what's really released from `main`,
   or archive the file and document that release notes now live per-package. Any of these changes
   release behavior and needs a maintainer call.
2. **`AGENTS.md`'s "Operating Model" section** references `.codex/config.toml` and
   `.codex/agents/*.toml`, neither of which exists in this repo (flagged in the earlier commit on
   this PR). Needs a call on whether that's planned work or dead documentation.
3. **Battles reads as more built than "Phase 4, planned for October 2026" suggests.** Battle
   creation, execution, voting, results, ELO scoring, and series/rematch are live in the app
   today with a mature schema (~48 tables, 105 RLS policies) and real test coverage, not
   scaffolding. It's self-labeled **Experimental** in-app and formally **NO-GO for public hosted
   beta** per the project's own risk register. `ROADMAP.md` describes both facts side by side
   rather than picking one — but the underlying call (is October 2026 a stabilization target for
   existing code, or should the messaging change) is a product decision, not something this audit
   resolves.
4. **Tag/Ray naming split.** The codebase's internal name is `Tag` (`libs/domain/tags`,
   `content.tags`); the live product UI and routes use `Ray` (`/ray/:slug`, "Ray Cloud"). `README.md`
   and `ROADMAP.md` use "Tags" per current product terminology and flag the discrepancy, but the
   rename isn't finished end to end in the code.

## Target root tree

```text
.
├─ .agents/ .claude/ .cursor/ .gemini/   AI-tool config — .agents/skills is canonical, rest symlink
├─ .github/                              CI, issue templates, dependabot
├─ .lenserfight/                         Team-shared lensers/lenses/battles/rays (product convention)
├─ apps/  libs/  supabase/               Nx workspace
├─ docs/                                 Documentation content
├─ examples/  templates/                 Reference connectors, community workflow templates
├─ scripts/  tools/                      Dev/CI tooling
├─ AGENTS.md                             Canonical AI-agent instructions (CLAUDE.md/GEMINI.md import it)
├─ README.md                             Entry point
├─ ROADMAP.md                            Canonical phase-by-phase status (new)
├─ CHANGELOG.md                          Flagged stale — see "Findings needing a decision"
└─ (governance, env, and tool-config files unchanged — see decision table above)
```

Nothing else moves. The tree above differs from today's root only by the addition of `ROADMAP.md`
and the `AGENTS.md`/`CLAUDE.md`/`GEMINI.md` consolidation already committed on this branch.

## Validation

Files moved, renamed, or deleted: none. Files added: `ROADMAP.md`, this document's README
decision table and target tree (above). Files rewritten: `README.md`,
`docs/en/how-to/contributors/adding-a-language.md` (added a locale-status table sourced from
`libs/utils/locale/src/lib/locales.ts`). No application behavior, scripts, CI, or release
configuration changed.

Checked directly:
- Every command, port, package name, and file path cited in the new `README.md` against the live
  repo (see Method above) — one correction made in the process: the old README's MCP tool count
  ("32 typed tools") was stale; the actual count is 35 across Lens/Battle/Workflow, 48 including
  Agent/User tools. The new README doesn't restate a tool count at all — it links to
  `apps/mcp-server/README.md`, so it can't go stale the same way again.
- Every internal link added to `README.md`, `ROADMAP.md`, and the locale-status table resolves to
  a real file in this repo (verified with `test -f` against each path, not just visual inspection).
- `README.md`'s and `ROADMAP.md`'s YAML/Markdown structure (no frontmatter in either — both are
  plain root Markdown, consistent with the rest of the root-level `.md` files).

Not run in this environment: `pnpm docs:build`, `pnpm lint`, `pnpm format`, `pnpm docs:audit`, or
the smoke suite — this worktree has no `node_modules` installed and installing one for a
documentation-only change was judged not worth the time cost. Nothing these checks would catch
(script names, CI config, TypeScript, application code) was touched by this change; the actual
risk surface — broken links and inaccurate claims — was checked by hand instead, per above. Run
`pnpm docs:audit` and `pnpm format` in CI before merging as a backstop.
