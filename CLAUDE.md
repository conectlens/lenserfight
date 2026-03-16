<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

# LenserFight Claude Guide

## Project focus
- LenserFight is an Nx monorepo with a Vite React web app, layered libraries, and a Supabase backend.
- Prioritize clear module boundaries, low coupling, and production-safe migrations.
- Prefer compact, auditable outputs over verbose explanations.

## Architecture defaults
- `apps/forum` is the app entry and composition root.
- `libs/domain/*` holds business concepts, invariants, and core types.
- `libs/api/*` defines contracts and DTOs.
- `libs/data/*` handles repositories, caching, and Supabase integration.
- `libs/features/*` contains vertical feature slices and orchestration.
- `libs/ui/*` contains reusable UI primitives, layout, forms, and modals.
- `libs/utils/*` contains low-level shared utilities only.
- `supabase/` contains schema, migrations, SQL functions, and database security concerns.
- `tools/dev-proxy/` contains the local dev reverse proxy. Port discovery is automated; do not hardcode ports there.

## Working rules
- Respect Nx boundaries. Do not introduce cross-layer imports without a clear architectural reason.
- Keep domain logic out of UI and route files.
- Keep Supabase changes secure by default: least privilege, RLS-first, exposed schema review, migration rollback awareness.
- Prefer editing existing libraries over creating new ones unless the boundary is clearly justified.
- Keep public APIs of libraries intentional and small.
- When adding features, decide placement first, then implementation.
- When modifying migrations, assess blast radius before proposing changes.

## Skill routing
Use the matching skill when work is specialized:
- repo shape or dependency drift → `repo-architecture-auditor`
- Nx tags/import direction/cycles → `nx-boundary-reviewer`
- new feature placement across layers → `feature-slice-designer`
- Vite bundle/runtime performance → `vite-performance-engineer`
- Tailwind, UX, accessibility, visual consistency → `tailwind-ui-ux-reviewer`
- test scope and layering → `unit-test-planner`
- contract/DTO/domain mismatch → `contract-dto-consistency-reviewer`
- repository/cache/data access review → `repository-pattern-reviewer`
- Supabase schema design → `supabase-schema-reviewer`
- RLS, grants, exposed schemas, definer risk → `supabase-rls-security-reviewer`
- indexes, triggers, write amplification → `supabase-index-trigger-reviewer`
- RPC/functions and API exposure → `supabase-api-rpc-reviewer`
- migration blast radius and rollout → `migration-risk-reviewer`
- public/internal docs and README quality → `docs-publication-manager`
- product decisions, scope cuts, acceptance → `product-owner-decider`
- release gate review → `release-readiness-reviewer`
- release notes/changelog generation → `changelog-release-writer`

## Team routing
Use team playbooks only for broad, cross-layer work:
- major DB/security work → `teams/supabase-platform-team.md`
- app UX/perf work → `teams/frontend-experience-team.md`
- cross-layer feature delivery → `teams/feature-delivery-team.md`
- release preparation → `teams/release-governance-team.md`
- structural refactors → `teams/architecture-review-team.md`

## Output style
- Be concrete.
- Prefer checklists, risk tables, file-by-file action plans, and acceptance criteria.
- Minimize filler.
- When uncertain, state the uncertainty and what evidence would resolve it.

<!-- nx configuration end-->
