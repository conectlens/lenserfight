---
title: Changelog
description: Full release history for LenserFight — every version, every change.
layout: doc
---

## [0.1.0-rc1] - 2026-05-13

Release candidate for the 2026-06-12 OSS announcement. Closes the BR–BQ pre-launch wave: e2e automation, model conformance, media gates, vote hardening, wizard v2, coverage gate, browse API, anon RLS, plus the BR sign-off sweep.

### Added

- **phase BR**: announcement readiness sign-off table populated; all gate rows ✅ on local Supabase.
- **phase BS**: announcement copy drafts (`hn-post`, `x-thread`, `linkedin`, `devto`, `github-release-notes`) under `docs/.private/announcements/`; screencap registry placeholder.
- **phase BT**: `pnpm announcement:dashboard` command (`scripts/announcement-dashboard.sh`) wired with `--once` flag for CI usage; nx target `scripts:announcement-dashboard`.
- **phase BU**: `scripts/smoke.sh` prints elapsed seconds and hard-fails on >300 s; `.github/workflows/smoke-timing.yml` CI gate.
- **phase BV**: pgTAP `59_battles_create_rate_limit.sql`, `60_moderation_admin_override.sql`, `61_webhook_outbox_drain.sql`, `62_elo_change_log.sql` (plan 10 total); coverage-gate critical RPC list extended.
- **phase BW**: `@lenserfight/sdk@0.1.0-alpha.1` package scaffold at `libs/sdk/` with `createClient`, `BattleClient`, `TemplateClient`; reference docs at `docs/en/reference/sdk/index.md`; quickstart at `docs/en/how-to/integrations/sdk-quickstart.md`.
- **phase BX**: `fn_battles_next_recommendation` SECURITY DEFINER; `BattleResultCTA` component; analytics `battle_cta_clicked` event; pgTAP `63_next_recommendation.sql`.

### Notes

- This RC is cut from `development` and merged to `main` before tagging.
- `@lenserfight/sdk@0.1.0-alpha.1` publish is a manual T-1 step against the tagged commit.

## [0.10.0-alpha.2] - 2026-05-09

Pre–first-public OSS publishing pass: permissive license, brand guidelines, docs truth, contributor gates, and release metadata alignment.

### Added

- **seed**: community profile handle for the hub account is `conectlens` (lowercase) so `tenancy.fn_create_personal_workspace` slug passes `workspaces_slug_format` (`44_community_profiles.sql`; re-run `pnpm supabase:combine-seeds`).
- **seed**: AI lenser `handle` values trim trailing underscores and fall back to `model` when the slug body is empty (`07_ai_lensers.sql`; avoids `workspaces_slug_format` violations from `tenancy.fn_create_personal_workspace`).

### Fixed

- **db**: Drop Phase Z4 blanket hyphen-only `ck_*_*_format` slug constraints that conflicted with existing slug rules and seeds (`20270514000000_personal_workspace_slugify_handle.sql`); `tenancy.fn_create_personal_workspace` slugifies handles for workspace slugs.
- **db**: `public.fn_get_agent_analytics_summary` honors `request.jwt.claim.role = service_role` for trusted/service callers; `GRANT EXECUTE` to `service_role` (`20270514000001_fn_get_agent_analytics_summary_service_role_bypass.sql`).
- **db**: `GRANT USAGE ON SCHEMA reputation` plus `SELECT` on `reputation.lenser_scores` and `reputation.contender_ratings` for `anon` / `authenticated` so RLS-backed reads work (`20270514000002_reputation_schema_usage_grants.sql`).
- **test**: pgTAP `throws_ok` uses exact `SQLERRM` (NULL pattern) where messages are not fixed literals; analytics Phase 15 tests emit TAP at top level and simulate service JWT; workflow tests use seeded Alice auth; n8n tests call the 9-arg `fn_update_workflow_node_result` explicitly; Phase F pg_cron assertion is non-fatal when jobs are absent locally.

### Changed

- **license**: Community Edition relicensed from **BSL 1.1** to **Apache-2.0** (`LICENSE`, root and app `package.json` SPDX fields, OpenAPI `info.license`).
- **docs**: `open-core-model`, `license`, `governance`, `pricing`, `for-organizations` updated for Apache-2.0; new [Brand guidelines](/en/explanation/community/brand-guidelines) and root [`BRAND.md`](https://github.com/conectlens/lenserfight/blob/main/BRAND.md); VitePress sidebar link.
- **readme**: Day-one scope paragraph, `development` branch note for PRs, Trust Gateway preview framing, Node `>=22` badge, Community links include brand guidelines.
- **chore**: Root `package.json` `version` set to `0.10.0-alpha.2` to match changelog and future tags.

### Historical note

Releases **0.9.0-beta.1** and **0.10.0-alpha.1** were tagged under **BSL 1.1** with the change dates noted in their changelog entries. This release is the first Apache-2.0 line.

## [0.10.0-alpha.1] - 2026-06-12

Phase 10 — Connector RFC + Public Adapter SDK Alpha. The CLI surface for `lf connectors` (shipped in Phase 9 wired to missing RPCs) is now backed by real schema, RPCs, and a stable interface integrators can build against.

### Phase 10 — added

- **lib**: new `libs/adapters/connector` (`@lenserfight/adapters/connector`) with `ConnectorAdapterV1` interface, `CONNECTOR_SCOPES` (12-scope v1 grammar), `HttpConnectorAdapter`, and a lazy adapter registry
- **contracts**: connector request/response types and the `CONNECTOR_SCOPE_ERROR_SQLSTATE` constant in `libs/api/contracts`
- **types**: `Connector`, `ConnectorToken`, `ConnectorKind` domain types in `libs/types`
- **db**: three migrations creating `connectors.connectors` + `connectors.connector_tokens`, the six `fn_connector*` RPCs, and the `connectors.fn_assert_scope` helper (mirrored to `lenserfight-platform/supabase/`)
- **seed**: `seeds/46_connectors.sql` adds an inactive `chainabit-demo` row so `lf connectors list` is non-empty in dev
- **cli**: `lf connectors` now uses the shared scope grammar, contract types, and maps Postgres `SQLSTATE 42501` to a friendly scope error with exit code `2` (distinct from generic failures)
- **example**: `examples/connectors/chainabit-example/` — runnable reference adapter demonstrating the `add → register → verify → dispatch` flow
- **docs**: new `/reference/connectors/{index,scopes,adapter-interface}`, `/how-to/integrations/{build-an-adapter,chainabit-example}`, and the canonical `RFC-0001-connector-interface.md`; VitePress sidebar wires both top-level reference and how-to entries (TR stubs link to EN)
- **test**: 20 vitest specs in `adapters-connector` covering scopes, registry, HTTP adapter, and a static invariant guard that fails CI if the TS scope list and SQL `fn_valid_scopes()` allow-list drift apart

### Phase 10 — guardrails

- Migration rollback steps documented at the top of every new SQL file
- `connectors.*` schema and tables `REVOKE ALL` from `anon`/`authenticated`; only SECURITY DEFINER RPCs are public
- Service tokens stored only as `sha256` hash + 11-char prefix; raw token returned exactly once at create/rotate
- Workspace-scoped ownership via `tenancy.workspaces` — no cross-tenant token leakage
- `examples/` excluded from Nx graph via new `.nxignore`
- Versioned `ConnectorAdapterV1` symbol from day one (Phase 16 risk-mitigation R5)

## [0.9.0-beta.1] - 2026-05-22

First public OSS beta tag (Phase 9 — OSS Community Health Sprint).

> BSL Change Date for this release: 2028-05-22 (two years from release; converts to Apache-2.0 per `LICENSE`).

### Phases 1–8 highlights (already shipped before public open on 2026-05-07)

- Lenses, lens versions, and the workflow builder (DAG editor, run history, observability)
- AI lenser profiles + agent workspace panels (memory, tools registry, evaluations)
- Workflow execution engine (Ollama / BYOK / cloud) and `lf run exec`
- Autonomous Agent OS substrate (Phase 8): schedule plumbing, recursion guards, run state projection

### Phase 9 — fixes & hardening

- **seed**: prune stale `20_*–32_*` scale entries from `supabase/seed.manifest`; add `45_workflow_runs.sql` so `supabase db reset` produces ≥1 workflow run, ≥1 agent, ≥2 lens versions
- **gate**: `/lenserboard` is now behind cloud battles surface; onboarding return-URL falls back to `/workflows` when battles are off
- **cli**: add `--dry-run` to `lf run exec` — short-circuits before any provider/credential resolution; covered by `apps/cli/src/commands/run.spec.ts`
- **ci**: new `cli-smoke.yml`, `seeds-smoke.yml`, `web-e2e.yml`, `labels-sync.yml` workflows
- **e2e**: new `apps/web-e2e/` Playwright project with the arena/battles-gate spec
- **docs**: README gets an OSS-vs-cloud table, self-hosting flags section, and a Community section linking SECURITY/SUPPORT/COC; `contributing.md` gets a "Your first contribution" walkthrough; `development-setup.md` documents the `pnpm smoke` ready-to-PR gate
- **triage**: relabel `install_problem.yml` to `p0-install`; add `workflow_problem.yml` (`p0-workflow`) and `deferred.yml`; codify the canonical label set in `.github/labels.yml`
- **tooling**: pin Node 22 + pnpm 9 in `package.json` `engines` + `packageManager`; add `.nvmrc`; new `pnpm smoke` end-to-end gate script

## [Unreleased] - 2026-03-14
- Merge pull request #19 from conectlens/development
- feat: add new Claude skills, agents, and teams, and update Claude configuration and documentation files.
- docs: update changelog
- Merge pull request #18 from conectlens/development
- feat: Add GitHub Actions workflows for automated changelog updates and Claude AI integration for code review and assistance.
- Merge pull request #17 from conectlens/development
- Merge pull request #16 from conectlens/refactor/database-and-app
- Refactor: Migrate application features, components, and services into a new modular library structure.
- feat: Migrate project structure to Nx monorepo, introducing new features like analytics, admin, leaderboard, and generations, while refactoring existing components and utilities.
- feat: add nx apps/web.
- feat: Add agent skills for CI monitoring and Nx workspace integration, alongside related configurations and scripts.
- feat: Implement Row Level Security for owner access to prompts and threads, including reaction totals and private content fetching.
- feat: Implement comprehensive private content handling and tag management for prompts and threads, enhancing author profile and tag data fetching in repositories.
- refactor: Migrate language keys from UUIDs to codes across the database and repositories, and add Claude AI permissions.
- feat: enable viewing and editing of private prompts by their owners, and improve prompt content display
- fix: Ensure prompt content is always saved by falling back to default language
- style: Add icon color transition to ThreadReactionBar based on hasReacted status
- fix: Correct thread reaction toggle response parsing in useThreadDetailController
- feat: Implement `fn_tag_activity_log` RPC for secure tag activity logging, update public views to include tag IDs, and add input validation to the RPC.
- feat: Provide simulated data for private entities not found in public views to allow continued processing.
- refactor: Remove conditional logout and `isMock` logic from post-registration navigation.
- fix: Resolve database errors by adjusting function security and updating RLS policies for public and author access.
- refactor: Update Supabase queries from `.single()` to `.maybeSingle()` and remove redundant error checks in repositories.
- refactor: Migrate reaction and tag repositories from RPCs to direct PostgREST queries and introduce RLS for translations.
- feat: Implement robust error handling for user not found scenarios during authentication and API calls, ensuring proper logout and redirection.
- feat: Implement automatic `lenser_id` resolution for content creation via a new database function and default constraints, and update RLS policies to use this function.
- feat: Use user's preferred language for prompt and thread translations, and create tags via RPC function.
- fix: Update `sync_profile_from_auth_metadata` function to resolve profile creation failures by adapting to schema changes and correctly mapping language.
- feat: automatically log out and redirect users upon invalid JWT or user not found errors
- feat: implement core language management, content translation tables, and RLS for i18n support
- Refactor: Migrate Lenser profile components from `features/lensers` to `features/profile`, remove various adapter files, and introduce new Supabase client and migration.
- feat: Implement resilient page view logging with stale session handling and refine analytics schema API exposure and permissions.
- feat: Secure API exposure by configuring schema access and implementing Row Level Security policies.
- feat: Introduce `getLenserByHandle` service method, enhance Lenser profile data handling, and expand Supabase API schemas.
- refactor: Migrate repository data operations from RPC functions to direct table access with Row Level Security.
- feat: Add initial remote database schema migration.
- feat: add initial Supabase configuration files and update gitignore rules.
- chore: Remove mock implementations from various repositories and adapters.
- Merge branch 'development' of https://github.com/conectlens/lenserfight into development
- refactor: Standardize AI model identification to use `ai_model_slug` instead of `ai_model_id` and update CDN URLs.
- Merge pull request #14 from conectlens/development
- feat(waiting-list): add authoritative status check with loader and context integration.
- Merge pull request #13 from conectlens/development
- docs(readme): update readme.md file
- chore(package): add standard-version to the package.json
- chore(.env): add .env example
- chore: add Commitizen and conventional commit workflow
- chore(lint): run ESLint --fix to clean up.
- chore(lint): add ESLint and Prettier for import cleanup and formatting.
- fix(hooks): Fix useXP hook error to fetch updated LenserBoard data.
- fix(component): Replace the title of the Lenserboard.
- fix(service/lenser): Fix the bugs on the function.
- fix(profile): Fix Lenser stats error on the Lenser profile page.
- fix(reactions): Fix reaction errors.
- fix(sidebar): Fix compact profile errors.
- fix(register): Remove preffered language.
- Merge pull request #12 from conectlens/development
- fix(home): Fix react list unique key error.
- Merge pull request #11 from conectlens/refactor/10-shared-links
- refactor(shared-links): Remove Edge Functions and use RPC functions.
- refactor(repository): Refactor all repositories by RPC functions to avoid data leaks and improve data security.
- fix(xp): Remove xp award system completely.
- fix(repository): Use RPC in ai generation repository and fix ai models select list errors.
- fix(repository): Fix Feedback repository. Add RPC function to improve security.
- fix(contactRepository): Add fn_ops_create_contact RPC function to insert data.
- fix(error): PSQL security updates  to SELECT are applied.
- fix(error): PSQL security updates  to SELECT are applied.
- refactor(database): Remove database.types.
- Merge pull request #7 from conectlens/development
- fix(xp): Move xp system to the database to improve security and performance.
- feat: implement strict route matching in Sidebar for improved navigation accuracy
- feat: prevent app unmounting by avoiding isLoading state change during login and registration
- feat: implement URL validation utility and integrate it into generation and profile modals
- feat: enhance StarBackground component with type safety and improved options configuration
- feat: add .notes to .gitignore to exclude note files from version control
- feat: add star background with lazy loading and improve performance
- feat: Refactor routing and update paths for prompts and tags to new structure; enhance UI components and styles
- feat(public): Update vision, mission and  ecosystem manifesto.
- fix(prompts): update savePrompt to handle local state management and backend response correctly
- refactor(PromptDetailPage): optimize imports and streamline state management
- fix(header): remove console.log for lenser in Header component
- feat(admin): implement admin dashboard with analytics, user management, and feedback handling
- fix(prompts): update savePrompt to use toggleReaction for saved state management
- Merge pull request #6 from conectlens/development
- feat(auth): integrate captcha support for login, registration, and password reset flows
- Merge pull request #5 from conectlens/development
- Refactor: Update Lenser context and service methods to use handles instead of IDs
- feat(prompts): refactor usePromptDetailController and PromptDetailPage for improved analytics and state management
- fix(prompts): update copyPrompt to use toggleReaction for recording reactions
- fix(reaction): toggleReaction mutation to use reactionService and improve optimistic updates
- feat: Implement toggleReaction method in SupabaseReactionRepository and update reactionService to utilize it
- fix: Remove unnecessary method chaining in SupabaseFeedbackRepository's submitFeedback
- fix: Add missing newline at end of file in multiple components and improve text handling for better readability
- feat: Enhance Lenser repository with full and compact profile retrieval methods
- feat: Enhance thread detail tracking with analytics integration
- Refactor tag handling and validation logic
- feat(auth): Implement SessionBoundary for user session management and state reset feat(xp): Update XP repository and types to include currentLevelMaxXp refactor(socialLinks): Improve syncLinks method comments for clarity refactor(lenserStatsRow): Adjust level logic to use currentLevelMaxXp
- feat(leaderboard): Implement leaderboard feature with filters and tabs
- refactor(grant_xp): Remove grant_xp function implementation
- feat: Implement XP system with daily login rewards and profile updates
- feat(shareService): Refactor link creation to support idempotency with createOrGetSharedLink
- Merge pull request #4 from conectlens/development
- feat(theme): Enhance theme management and sidebar state persistence
- feat(actionMenu): Implement dropdown positioning and portal rendering for action menu
- feat(theme): Initialize dark theme completely.
- Merge pull request #3 from conectlens/development
- feat(settings): Enhance user display name retrieval in settings page
- feat(loginPage): Update OAuth button layout and functionality for Google and GitHub sign-in
- Merge pull request #2 from conectlens/development
- feat(waitingList): Deprecate waiting list logic and integrate with Lenser profile
- feat(threadInteraction): Optimize reaction fetching by batching user reactions and utilizing denormalized reaction totals
- feat(home): Sort top prompts by usage count for better visibility fix(settings): Update account section header and improve metadata description refactor(sidebar): Remove unnecessary background color for sidebar items fix(auth): Rename raw_user_meta_data to user_metadata for consistency fix(threads): Enhance trending tags fetching with error handling and sorting
- feat(settings): Implement feedback management in settings page with pagination and user feedback retrieval
- feat(prompts): Add updateReactionTotals method and sync reaction totals on save
- refactor(DashboardLayout): Improve modal handling and sidebar responsiveness
- refactor(tags): Refactor repositories to utilize denormalized fields for tags and author profiles
- feat(prompts): Implement usePromptDetailController for improved data handling and analytics
- refactor(thread): Clean up and optimize thread detail controller logic
- feat(context): Refactor caching mechanism for Lenser profile and improve notification fetching logic
- feat(app): Add Ecosystem, Legal, and Welcome pages with respective components and routing
- feat(auth): Implement return URL mechanism for login navigation
- feat(breadcrumbs): Improve display name formatting for better readability
- Merge pull request #1 from conectlens/development
- feat(app): Enhance content moderation with new service and policies
- feat(app): Integrate SEO strategy to update title and description by pages, fix other errors.
- fix(footer): Change the wrong title of the link in the footer.
- refactor(app): Refactor to improve performance and speed of the app.
- refactor(style): store fonts locally, add favicons of lenserfigt, upgrade tailwindcss version to 4.1.
- refactor(app): Update repositories and services for prompts, reactions, and threads to improve performance of the app.
- feat: add unified repository + react-query caching for thread and prompt lists.
- feat(initialize): Update LenserProfile page, Tag Cloud, add share link strategy and functions, update UI/UX components, fix the errors on the modals, add ai generations, ai models, or other required types for AI Generations component.
- feat(init): Initialize version 2.
- feat(init): Initialize first version.## [Unreleased] - 2026-03-14
- Merge pull request #18 from conectlens/development
- feat: Add GitHub Actions workflows for automated changelog updates and Claude AI integration for code review and assistance.
- Merge pull request #17 from conectlens/development
- Merge pull request #16 from conectlens/refactor/database-and-app
- Refactor: Migrate application features, components, and services into a new modular library structure.
- feat: Migrate project structure to Nx monorepo, introducing new features like analytics, admin, leaderboard, and generations, while refactoring existing components and utilities.
- feat: add nx apps/web.
- feat: Add agent skills for CI monitoring and Nx workspace integration, alongside related configurations and scripts.
- feat: Implement Row Level Security for owner access to prompts and threads, including reaction totals and private content fetching.
- feat: Implement comprehensive private content handling and tag management for prompts and threads, enhancing author profile and tag data fetching in repositories.
- refactor: Migrate language keys from UUIDs to codes across the database and repositories, and add Claude AI permissions.
- feat: enable viewing and editing of private prompts by their owners, and improve prompt content display
- fix: Ensure prompt content is always saved by falling back to default language
- style: Add icon color transition to ThreadReactionBar based on hasReacted status
- fix: Correct thread reaction toggle response parsing in useThreadDetailController
- feat: Implement `fn_tag_activity_log` RPC for secure tag activity logging, update public views to include tag IDs, and add input validation to the RPC.
- feat: Provide simulated data for private entities not found in public views to allow continued processing.
- refactor: Remove conditional logout and `isMock` logic from post-registration navigation.
- fix: Resolve database errors by adjusting function security and updating RLS policies for public and author access.
- refactor: Update Supabase queries from `.single()` to `.maybeSingle()` and remove redundant error checks in repositories.
- refactor: Migrate reaction and tag repositories from RPCs to direct PostgREST queries and introduce RLS for translations.
- feat: Implement robust error handling for user not found scenarios during authentication and API calls, ensuring proper logout and redirection.
- feat: Implement automatic `lenser_id` resolution for content creation via a new database function and default constraints, and update RLS policies to use this function.
- feat: Use user's preferred language for prompt and thread translations, and create tags via RPC function.
- fix: Update `sync_profile_from_auth_metadata` function to resolve profile creation failures by adapting to schema changes and correctly mapping language.
- feat: automatically log out and redirect users upon invalid JWT or user not found errors
- feat: implement core language management, content translation tables, and RLS for i18n support
- Refactor: Migrate Lenser profile components from `features/lensers` to `features/profile`, remove various adapter files, and introduce new Supabase client and migration.
- feat: Implement resilient page view logging with stale session handling and refine analytics schema API exposure and permissions.
- feat: Secure API exposure by configuring schema access and implementing Row Level Security policies.
- feat: Introduce `getLenserByHandle` service method, enhance Lenser profile data handling, and expand Supabase API schemas.
- refactor: Migrate repository data operations from RPC functions to direct table access with Row Level Security.
- feat: Add initial remote database schema migration.
- feat: add initial Supabase configuration files and update gitignore rules.
- chore: Remove mock implementations from various repositories and adapters.
- Merge branch 'development' of https://github.com/conectlens/lenserfight into development
- refactor: Standardize AI model identification to use `ai_model_slug` instead of `ai_model_id` and update CDN URLs.
- Merge pull request #14 from conectlens/development
- feat(waiting-list): add authoritative status check with loader and context integration.
- Merge pull request #13 from conectlens/development
- docs(readme): update readme.md file
- chore(package): add standard-version to the package.json
- chore(.env): add .env example
- chore: add Commitizen and conventional commit workflow
- chore(lint): run ESLint --fix to clean up.
- chore(lint): add ESLint and Prettier for import cleanup and formatting.
- fix(hooks): Fix useXP hook error to fetch updated LenserBoard data.
- fix(component): Replace the title of the Lenserboard.
- fix(service/lenser): Fix the bugs on the function.
- fix(profile): Fix Lenser stats error on the Lenser profile page.
- fix(reactions): Fix reaction errors.
- fix(sidebar): Fix compact profile errors.
- fix(register): Remove preffered language.
- Merge pull request #12 from conectlens/development
- fix(home): Fix react list unique key error.
- Merge pull request #11 from conectlens/refactor/10-shared-links
- refactor(shared-links): Remove Edge Functions and use RPC functions.
- refactor(repository): Refactor all repositories by RPC functions to avoid data leaks and improve data security.
- fix(xp): Remove xp award system completely.
- fix(repository): Use RPC in ai generation repository and fix ai models select list errors.
- fix(repository): Fix Feedback repository. Add RPC function to improve security.
- fix(contactRepository): Add fn_ops_create_contact RPC function to insert data.
- fix(error): PSQL security updates  to SELECT are applied.
- fix(error): PSQL security updates  to SELECT are applied.
- refactor(database): Remove database.types.
- Merge pull request #7 from conectlens/development
- fix(xp): Move xp system to the database to improve security and performance.
- feat: implement strict route matching in Sidebar for improved navigation accuracy
- feat: prevent app unmounting by avoiding isLoading state change during login and registration
- feat: implement URL validation utility and integrate it into generation and profile modals
- feat: enhance StarBackground component with type safety and improved options configuration
- feat: add .notes to .gitignore to exclude note files from version control
- feat: add star background with lazy loading and improve performance
- feat: Refactor routing and update paths for prompts and tags to new structure; enhance UI components and styles
- feat(public): Update vision, mission and  ecosystem manifesto.
- fix(prompts): update savePrompt to handle local state management and backend response correctly
- refactor(PromptDetailPage): optimize imports and streamline state management
- fix(header): remove console.log for lenser in Header component
- feat(admin): implement admin dashboard with analytics, user management, and feedback handling
- fix(prompts): update savePrompt to use toggleReaction for saved state management
- Merge pull request #6 from conectlens/development
- feat(auth): integrate captcha support for login, registration, and password reset flows
- Merge pull request #5 from conectlens/development
- Refactor: Update Lenser context and service methods to use handles instead of IDs
- feat(prompts): refactor usePromptDetailController and PromptDetailPage for improved analytics and state management
- fix(prompts): update copyPrompt to use toggleReaction for recording reactions
- fix(reaction): toggleReaction mutation to use reactionService and improve optimistic updates
- feat: Implement toggleReaction method in SupabaseReactionRepository and update reactionService to utilize it
- fix: Remove unnecessary method chaining in SupabaseFeedbackRepository's submitFeedback
- fix: Add missing newline at end of file in multiple components and improve text handling for better readability
- feat: Enhance Lenser repository with full and compact profile retrieval methods
- feat: Enhance thread detail tracking with analytics integration
- Refactor tag handling and validation logic
- feat(auth): Implement SessionBoundary for user session management and state reset feat(xp): Update XP repository and types to include currentLevelMaxXp refactor(socialLinks): Improve syncLinks method comments for clarity refactor(lenserStatsRow): Adjust level logic to use currentLevelMaxXp
- feat(leaderboard): Implement leaderboard feature with filters and tabs
- refactor(grant_xp): Remove grant_xp function implementation
- feat: Implement XP system with daily login rewards and profile updates
- feat(shareService): Refactor link creation to support idempotency with createOrGetSharedLink
- Merge pull request #4 from conectlens/development
- feat(theme): Enhance theme management and sidebar state persistence
- feat(actionMenu): Implement dropdown positioning and portal rendering for action menu
- feat(theme): Initialize dark theme completely.
- Merge pull request #3 from conectlens/development
- feat(settings): Enhance user display name retrieval in settings page
- feat(loginPage): Update OAuth button layout and functionality for Google and GitHub sign-in
- Merge pull request #2 from conectlens/development
- feat(waitingList): Deprecate waiting list logic and integrate with Lenser profile
- feat(threadInteraction): Optimize reaction fetching by batching user reactions and utilizing denormalized reaction totals
- feat(home): Sort top prompts by usage count for better visibility fix(settings): Update account section header and improve metadata description refactor(sidebar): Remove unnecessary background color for sidebar items fix(auth): Rename raw_user_meta_data to user_metadata for consistency fix(threads): Enhance trending tags fetching with error handling and sorting
- feat(settings): Implement feedback management in settings page with pagination and user feedback retrieval
- feat(prompts): Add updateReactionTotals method and sync reaction totals on save
- refactor(DashboardLayout): Improve modal handling and sidebar responsiveness
- refactor(tags): Refactor repositories to utilize denormalized fields for tags and author profiles
- feat(prompts): Implement usePromptDetailController for improved data handling and analytics
- refactor(thread): Clean up and optimize thread detail controller logic
- feat(context): Refactor caching mechanism for Lenser profile and improve notification fetching logic
- feat(app): Add Ecosystem, Legal, and Welcome pages with respective components and routing
- feat(auth): Implement return URL mechanism for login navigation
- feat(breadcrumbs): Improve display name formatting for better readability
- Merge pull request #1 from conectlens/development
- feat(app): Enhance content moderation with new service and policies
- feat(app): Integrate SEO strategy to update title and description by pages, fix other errors.
- fix(footer): Change the wrong title of the link in the footer.
- refactor(app): Refactor to improve performance and speed of the app.
- refactor(style): store fonts locally, add favicons of lenserfigt, upgrade tailwindcss version to 4.1.
- refactor(app): Update repositories and services for prompts, reactions, and threads to improve performance of the app.
- feat: add unified repository + react-query caching for thread and prompt lists.
- feat(initialize): Update LenserProfile page, Tag Cloud, add share link strategy and functions, update UI/UX components, fix the errors on the modals, add ai generations, ai models, or other required types for AI Generations component.
- feat(init): Initialize version 2.
- feat(init): Initialize first version.
