---
name: docs-manager
description: Refactor stale documentation or add new pages under docs/en/** (and other active locales). Covers Diátaxis classification, VitePress sidebar updates in apps/docs/.vitepress/config.ts, and build validation. Use when the user asks to update, fix, refactor, or add documentation pages — even when they don't explicitly say "docs."
---

# docs-manager

Helps with documentation work in this repo.

## Sources of truth

| What to verify | Where to look |
|---|---|
| Feature behavior | `libs/domains/*` |
| Platform rules | `libs/platform/*` |
| DB schema / RLS | `supabase/migrations/*` |
| CLI commands & flags | `apps/cli/src/commands/*` |
| Existing doc content | `docs/en/**` (default) · other active locales (e.g. `docs/tr/**`) |
| Sidebar config | `apps/docs/.vitepress/config.ts` |

## Diátaxis quick guide

| Type | Folder | For |
|---|---|---|
| tutorial | `tutorials/` | Learning by doing |
| how-to | `how-to/` | Reaching a goal |
| reference | `reference/` | Looking things up |
| explanation | `explanation/` | Understanding concepts |

When unsure: how-to if the reader *does* something; reference if they *look up* something.

## Language flow (GRASP — Information Expert + Pure Fabrication)

`/en/` is the default and the **Information Expert** for documentation content — the canonical source other locales are derived from. Write or update English first, then adapt to each other active locale (e.g. `/tr/`) as a downstream port. This keeps a single authoritative origin and prevents conflicting edits across languages (low coupling, high cohesion).

- Always create/update the `docs/en/**` page first.
- After EN is correct, adapt to each other active locale present under `docs/<lang>/**`.
- If a locale's page doesn't exist yet, mirror the structure and mark untranslated prose with `<!-- TODO: translate -->`.

## SEO & GEO

Write pages so both search engines and generative-AI answer engines can surface them: meaningful `title`/`description` frontmatter, clear H1, semantic headings, plain factual phrasing, and unambiguous entity names (product, command, API).

## Suggested flow

1. Find the gap — grep `docs/en/` (and other active locale folders), check the sidebar.
2. Compare doc against the source of truth listed above.
3. Update only what drifted. Keep the existing voice.
4. Write/update EN first, then adapt to other active locales.
5. Update `apps/docs/.vitepress/config.ts` if a page was added or moved.
6. Run `pnpm nx build docs` and fix broken links.

## Notes

- Don't expose internal services, private admin flows, or implementation internals.
- CLI examples should match current `lf` signatures.
- API examples should match current RPC/REST contracts.
- [references/REFERENCE.md](references/REFERENCE.md) holds optional starter templates per Diátaxis type — useful when starting from scratch, but existing pages already vary in shape, so match the neighbors' format rather than forcing the template.
