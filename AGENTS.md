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

## Operating model

This repository is optimized for Codex using a layered instruction model:
- persistent repo guidance in `AGENTS.md`
- Codex runtime config in `.codex/config.toml`
- role-specific behavior in `.codex/agents/*.toml`
- reusable project skills in `.agents/skills/*`, `.claude/skills/*`, and `.gemini/skills/*`

## Project defaults

- Prefer existing repository skills from the local skills folders before inventing a new workflow.
- Keep changes minimal, local, and reversible.
- Preserve architectural boundaries between product, UI, tests, and Supabase concerns.
- When reviewing, prioritize correctness, security, migration safety, and maintainability over style-only commentary.
- When editing docs, keep them operational and concrete. Avoid marketing language.

## Role routing

Use these roles intentionally:
- `ci-monitor`: investigate CI failures, flaky checks, and release-blocking pipeline regressions.
- `explorer`: trace code paths and gather evidence without editing.
- `reviewer`: perform focused risk reviews for architecture, release readiness, data access, and security.
- `worker`: implement narrowly scoped fixes once the path is clear.

## Preferred skill activation

When the task clearly matches a project skill, activate the relevant skill from `.agents/skills`, especially for:

### Architecture & repo
- `repo-architecture-auditor` — repo shape, Nx tags, import cycles, dependency drift
- `repo-performance-guard` — overfetching, pagination, query/rendering perf patterns
- `feature-slice-designer` — new feature placement across layers
- `grasp-ooad-review` — code responsibility, coupling, cohesion, refactor direction

### Frontend & UI
- `vite-performance-engineer` — Vite bundle/runtime performance
- `tailwind-ui-ux-reviewer` — Tailwind, UX, accessibility, visual consistency
- `ui-contract-guard` — shared UI contracts, tokens, platform entrypoints
- `apps-language-rules` — i18n strings, locale coverage, hreflang SEO
- `language-integrator` — adding or porting a new language/locale

### Mobile (apps/mobile)
- `mobile-app-designer` — screen design, iOS/Android specifics, design system
- `mobile-app-integrator` — new mobile feature implementation
- `mobile-app-product-owner` — mobile product decisions and roadmap
- `mobile-app-reviewer` — mobile performance, security, permissions, render cost
- `mobile-language-checker` — mobile locale resolution, language settings
- `mobile-ruleset` — canonical mobile design rules

#### Mobile env var rules
- **Never use `import.meta.env.*`** in code bundled by Metro (Expo/Hermes). Hermes does not support `import.meta`.
- Use `process.env.EXPO_PUBLIC_*` for all client-visible env vars in mobile and shared-with-mobile code. Only vars with the `EXPO_PUBLIC_` prefix are inlined by Expo at build time — see `apps/mobile/.env.example`.
- Web-only files using `import.meta.env`, `window.*`, or `react-router-dom` that are exported from a shared barrel must have a `.native.tsx` stub so Metro resolves the stub instead of the web file.

### Testing & review
- `unit-test-planner` — test scope and layering decisions
- `unit-tester` — writing unit/integration tests
- `deep-code-reviewer` — correctness bugs, race conditions, type-safety, security
- `security-reviewer` — security across RLS, Edge Functions, React client, CLI auth

### Contracts & data
- `contract-dto-consistency-reviewer` — contract/DTO/domain mismatch
- `api-contract-reviewer` — RPC/PostgREST API contracts and response types
- `repository-pattern-reviewer` — repository/cache/data access review

### Supabase & database
- `supabase-schema-reviewer` — Supabase schema design
- `database-schema-reviewer` — general Postgres schema, integrity, migration safety
- `supabase-rls-security-reviewer` — RLS, grants, exposed schemas, definer risk
- `supabase-index-trigger-reviewer` — indexes, triggers, write amplification
- `supabase-api-rpc-reviewer` — RPC/functions and API exposure
- `migration-risk-reviewer` — migration blast radius and rollout

### Delivery & ops
- `smart-commit` — staging and committing changes
- `docs-publication-manager` — public/internal docs and README quality
- `product-owner-decider` — product decisions, scope cuts, acceptance
- `release-readiness-reviewer` — release gate review

## Delivery expectations

- Summaries should lead with concrete findings, not generic reassurance.
- For risky changes, provide rollout and rollback notes.
- For DB or Supabase work, explicitly call out grants, RLS, indexes, triggers, and contract implications.
- For frontend work, call out UX regressions, accessibility, and bundle/runtime impact.
- For tests, explain why each proposed test belongs at that layer.

## Validation

Before finalizing:
- run the smallest relevant validation available
- mention what was validated and what was not
- if CI or local checks were not run, say so explicitly

<!-- nx configuration end-->
