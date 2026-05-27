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
- LenserFight is an Nx monorepo with apps, layered `libs/*`, and a Supabase backend.
- Prioritize clear module boundaries, low coupling, and production-safe migrations.
- Prefer compact, auditable outputs over verbose explanations.

## Architecture defaults
- `apps/web` is the app entry and composition root.
- `libs/domain/*` holds business concepts, invariants, and core types.
- `libs/api/*` defines contracts and DTOs.
- `libs/data/*` handles repositories, caching, and Supabase integration.
- `libs/features/*` contains vertical feature slices and orchestration.
- `libs/infra/*` holds analytics, moderation, and storage adapters.
- `libs/providers/*` contains app-provider integrations.
- `libs/shared/*` contains cross-cutting shared domain pieces.
- `libs/types/*` holds shared type packages.
- `libs/ui/*` contains reusable UI components, forms, layout, modals, theme, and tokens.
- `libs/utils/*` contains low-level shared utilities only.
- `supabase/` contains schema, migrations, SQL functions, and database security concerns.

## Working rules
- Respect Nx boundaries. Do not introduce cross-layer imports without a clear architectural reason.
- Keep domain logic out of UI and route files.
- Keep Supabase changes secure by default: least privilege, RLS-first, exposed schema review, migration rollback awareness.
- Prefer editing existing libraries over creating new ones unless the boundary is clearly justified.
- Keep public APIs of libraries intentional and small.
- When adding features, decide placement first, then implementation.
- When modifying migrations, assess blast radius before proposing changes.

## Mobile env var rules (apps/mobile and libs/* shared with mobile)
- **NEVER use `import.meta.env.*`** in code that Metro (Expo/Hermes) bundles. Hermes does not support `import.meta`.
- Use `process.env.EXPO_PUBLIC_*` for all client-visible env vars in mobile code. Expo inlines only vars with the `EXPO_PUBLIC_` prefix at build time — see `apps/mobile/.env.example` for the canonical list.
- Web-only files that use `import.meta.env`, `window.*`, or `react-router-dom` and are exported from a shared barrel **must** have a `.native.tsx` stub alongside them so Metro resolves the stub instead of the web version.

## Skill routing
Use the matching skill when work is specialized:

### Architecture & repo
- repo shape or dependency drift → `repo-architecture-auditor`
- Nx tags/import direction/cycles → `repo-architecture-auditor`
- query/rendering/perf patterns, overfetching, pagination → `repo-performance-guard`
- new feature placement across layers → `feature-slice-designer`
- code responsibility, coupling, cohesion, refactor direction → `grasp-ooad-review`

### Frontend & UI
- Vite bundle/runtime performance → `vite-performance-engineer`
- Tailwind, UX, accessibility, visual consistency → `tailwind-ui-ux-reviewer`
- shared UI contracts (libs/ui, tokens, platform entrypoints) → `ui-contract-guard`
- i18n strings, locale coverage, hreflang SEO → `apps-language-rules`
- adding or porting a new language/locale → `language-integrator`

### Mobile (apps/mobile)
- screen design, iOS/Android specifics, design system → `mobile-app-designer`
- new mobile feature implementation → `mobile-app-integrator`
- mobile product decisions and roadmap → `mobile-app-product-owner`
- mobile performance, security, permissions, render cost → `mobile-app-reviewer`
- mobile locale resolution, language settings → `mobile-language-checker`
- canonical mobile design rules → `mobile-ruleset`

### Testing & review
- test scope and layering → `unit-test-planner`
- writing unit/integration tests → `unit-tester`
- deep correctness, race conditions, security bugs → `deep-code-reviewer`
- security (RLS, Edge Functions, React client, CLI auth) → `security-reviewer`

### Contracts & data
- contract/DTO/domain mismatch → `contract-dto-consistency-reviewer`
- RPC/PostgREST API contracts and response types → `api-contract-reviewer`
- repository/cache/data access review → `repository-pattern-reviewer`

### Supabase & database
- Supabase schema design → `supabase-schema-reviewer`
- general Postgres schema, integrity, migration safety → `database-schema-reviewer`
- RLS, grants, exposed schemas, definer risk → `supabase-rls-security-reviewer`
- indexes, triggers, write amplification → `supabase-index-trigger-reviewer`
- RPC/functions and API exposure → `supabase-api-rpc-reviewer`
- migration blast radius and rollout → `migration-risk-reviewer`

### Delivery & ops
- staging and committing changes → `smart-commit`
- public/internal docs and README quality → `docs-publication-manager`
- product decisions, scope cuts, acceptance → `product-owner-decider`
- release gate review → `release-readiness-reviewer`

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
