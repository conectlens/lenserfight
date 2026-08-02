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
name. No application behavior, public APIs, package scripts, CI workflows, local dev commands,
deployment processes, doc routes, MCP config, Supabase operations, or release behavior was changed.

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
| `docker-compose.dev.yml` | Development tooling | Keep | `docker compose` resolves compose files relative to the current directory by convention; root is where contributors are expected to run it from. A dedicated `docker/` directory for this one file would be a new abstraction layer for no functional gain. |
| `scripts/`, `tools/` | Development tooling | Keep | Both are already directories (not loose root files), both are extensively referenced from `package.json` scripts, and both are already used per their existing (different) purposes — `scripts/` for shell-first dev/ops tasks, `tools/` for Node-based doc/CI utilities. No misplaced root files to route into either. |

## Findings needing a decision (not acted on here)

1. **`CHANGELOG.md` / `.releaserc` drift** (see table above). Options: wire a workflow that actually
   runs root `semantic-release`, scope `.releaserc` down to match what's really released from `main`,
   or archive the file and document that release notes now live per-package. Any of these changes
   release behavior and needs a maintainer call.
2. **`AGENTS.md`'s "Operating Model" section** references `.codex/config.toml` and
   `.codex/agents/*.toml`, neither of which exists in this repo (flagged in the earlier commit on
   this PR). Needs a call on whether that's planned work or dead documentation.

## Validation

No files were moved, renamed, or deleted by this audit — only this document was added, plus the
`AGENTS.md`/`CLAUDE.md`/`GEMINI.md` and `.claude`/`.cursor`/`.gemini`/`.agents` skills consolidation
from the earlier commit on this PR. Since nothing referenced by build, lint, test, or CI
configuration changed here, there is nothing new for those to validate; see the earlier commit's
message for what was verified there (symlink resolution, content parity across tools).
