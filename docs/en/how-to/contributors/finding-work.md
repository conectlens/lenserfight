---
title: Finding work
description: A map of where to look for contribution opportunities in LenserFight — good first issues, library owners, review SLAs, and where to ask questions.
---

# Finding work

## Good first issues

The fastest way to contribute is to pick a ticket already scoped and ready for an outside contributor.

On GitHub, filter by **label: `good first issue`** → [open issues](https://github.com/conectlens/lenserfight/issues?q=is%3Aopen+label%3A%22good+first+issue%22).

Each good-first-issue ticket has:
- A one-paragraph description of what needs changing.
- A 3-line acceptance block (what done looks like).
- A link to the relevant lib or file.

If you are unsure whether an issue is still available, comment "I'd like to work on this" — a maintainer will confirm or suggest alternatives.

## Library map

| Library | What it owns | Primary reviewer |
|---------|-------------|-----------------|
| `apps/cli` | CLI commands, local battle engine, telemetry | @ofcskn |
| `apps/docs` | VitePress config, docs site layout | @ofcskn |
| `apps/platform-api` | HTTP routes, health endpoint | @ofcskn |
| `apps/web` | Router, page shells, web app | @ofcskn |
| `libs/features/*` | Vertical feature slices (battles, agents, lenses, …) | @ofcskn |
| `libs/domain/*` | Business types and invariants | @ofcskn |
| `libs/data/*` | Supabase repos and caching | @ofcskn |
| `libs/ui/*` | Design system components | @ofcskn |
| `libs/adapters/connector` | Connector SDK | @ofcskn |
| `docs/**` | Documentation content (markdown) | anyone — low barrier |
| `supabase/migrations` | Schema, RLS, SQL functions | @ofcskn (migration review required) |

## Review SLA

| PR size | Expected first review |
|---------|----------------------|
| Docs-only | ≤ 48 h |
| Small feature / bug fix (< 200 lines) | ≤ 72 h |
| Medium feature (200–500 lines) | ≤ 5 business days |
| Large / cross-layer | Schedule a discussion first |

These are best-effort targets from a solo maintainer. If your PR has no review after the SLA, ping in the GitHub Discussion thread or comment on the PR.

## Where to ask questions

- **GitHub Discussions → Q&A** — for architecture questions, "should I build X" checks, or understanding existing behaviour.
- **GitHub Issues** — for bugs or tracked features only. Questions in issues will be moved to Discussions.
- **PR comments** — for code-level questions once you have a draft PR open.

## Types of contributions that land quickly

The following are high-signal, low-friction contributions:

- **Docs fixes**: typos, broken links, outdated flag names, missing TR translations.
- **CLI test coverage**: adding spec files for existing commands (see `apps/cli/src/commands/*.spec.ts` for patterns).
- **Examples**: new scenarios under `examples/local-battle/` (copy `haiku-shootout/` as a template).
- **Known limitations**: if you hit a real constraint and it is not documented in `docs/reference/known-limitations.md`, add it.

## What to avoid

- Do not add new client-exposed environment switches without a matching entry in `docs/reference/known-preview-surfaces.md` and `docs/en/reference/platform-api/environment-variables.md`.
- Do not touch `supabase/migrations/` without reading the [migration risk checklist](/en/how-to/contributors/release-checklist).
- Do not claim a surface is "Stable" in docs if it requires a feature flag or a cloud environment.

## Your first contribution walkthrough

1. Fork the repo; create a branch from `development`.
2. Run `pnpm setup:doctor` to verify your environment.
3. Run `pnpm install --frozen-lockfile`.
4. Make your change.
5. Run `pnpm docs:audit` (docs changes) or `pnpm smoke` (code changes).
6. Open a PR to `development` — use the PR template checklist.

The complete flow is in [Development Setup](/en/how-to/contributors/development-setup).
