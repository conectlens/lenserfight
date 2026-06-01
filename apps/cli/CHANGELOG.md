## 0.17.0 (2026-06-01)

This was a version bump only for cli to align it with other projects, there were no code changes.

## 0.16.0 (2026-06-01)

### 🚀 Features

- integrate AI-driven content generation into CLI and UI with support for lenses, battles, and workflows ([e4610bf8f](https://github.com/conectlens/lenserfight/commit/e4610bf8f))

### ❤️ Thank You

- ÖMER FARUK COŞKUN

## 0.15.0 (2026-05-31)

### 🚀 Features

- add comprehensive unit test coverage and standardize RPC parameter names across CLI commands ([e16baacd7](https://github.com/conectlens/lenserfight/commit/e16baacd7))

### ❤️ Thank You

- ÖMER FARUK COŞKUN

## 0.14.0 (2026-05-31)

### 🚀 Features

- add workflow slug support for user-friendly referencing in CLI and database functions ([1b8cb7bd7](https://github.com/conectlens/lenserfight/commit/1b8cb7bd7))

### 🩹 Fixes

- improve package manager detection for Homebrew-managed npm and default to npm-global as a fallback ([ecac3edda](https://github.com/conectlens/lenserfight/commit/ecac3edda))

### ❤️ Thank You

- ÖMER FARUK COŞKUN

## 0.13.0 (2026-05-31)

### 🚀 Features

- update battle creation command schema to require title, slug, and task parameters ([dcf615152](https://github.com/conectlens/lenserfight/commit/dcf615152))

### 🩹 Fixes

- improve input handling with input locking and better escape sequence filtering in CLI dashboard ([de8621334](https://github.com/conectlens/lenserfight/commit/de8621334))
- display full date and time in action log rows instead of time only ([b0812dfba](https://github.com/conectlens/lenserfight/commit/b0812dfba))

### ❤️ Thank You

- ÖMER FARUK COŞKUN

## 0.12.2 (2026-05-31)

### 🚀 Features

- **battles:** end-to-end battle finalization — migration, mode-aware winner, MCP tool, worker, and UI ([8581b9eaa](https://github.com/conectlens/lenserfight/commit/8581b9eaa))

### ❤️ Thank You

- Claude Sonnet 4.6
- ÖMER FARUK COŞKUN

## 0.12.1 (2026-05-31)

### 🩹 Fixes

- **cli:** close privacy regression and update correctness bugs ([ad314fcac](https://github.com/conectlens/lenserfight/commit/ad314fcac))

### ❤️ Thank You

- Claude Sonnet 4.6
- ÖMER FARUK COŞKUN

## 0.12.0 (2026-05-29)

### 🚀 Features

- **cli:** resolve AI lensers via RPC in update and catalog ([a9983cf72](https://github.com/conectlens/lenserfight/commit/a9983cf72))

### ❤️ Thank You

- Cursor @cursoragent
- Ömer Faruk Coşkun

## 0.11.0 (2026-05-29)

### 🚀 Features

- **cli:** add agents workspace hub with kill command and TUI tabs ([a9f5d752a](https://github.com/conectlens/lenserfight/commit/a9f5d752a))
- **cli:** add execute history and clarify execution status output ([160a0f978](https://github.com/conectlens/lenserfight/commit/160a0f978))
- **cli:** add executions and agent-runs data-services facades ([46ad0fd39](https://github.com/conectlens/lenserfight/commit/46ad0fd39))
- **cli:** route feed and dashboard through data-services facade ([05c1d67c6](https://github.com/conectlens/lenserfight/commit/05c1d67c6))

### 🩹 Fixes

- **cli:** resolve workflows build and add agents/workflows docs ([323631750](https://github.com/conectlens/lenserfight/commit/323631750))
- **cli:** mask secrets and resolve configure env from config ([f93e0d832](https://github.com/conectlens/lenserfight/commit/f93e0d832))

### ❤️ Thank You

- Cursor @cursoragent
- Ömer Faruk Coşkun

## 0.10.0 (2026-05-29)

### 🚀 Features

- **cli:** add execute/configure hubs and expand TUI dashboard ([60fad3025](https://github.com/conectlens/lenserfight/commit/60fad3025))
- **cli:** split lenser commands into human, ai, find, and list ([c42e3be04](https://github.com/conectlens/lenserfight/commit/c42e3be04))
- **cli:** use hosted Supabase defaults and fix cloud health probes ([35ed9f4d0](https://github.com/conectlens/lenserfight/commit/35ed9f4d0))

### ❤️ Thank You

- Cursor @cursoragent
- Ömer Faruk Coşkun

## 0.9.0 (2026-05-29)

### 🚀 Features

- implement sync command to manage file-to-Supabase workspace synchronization and runtime backend orchestration ([928b92c5c](https://github.com/conectlens/lenserfight/commit/928b92c5c))
- implement `lf use` command for persistent mode switching and add auth aliases ([17a8e921d](https://github.com/conectlens/lenserfight/commit/17a8e921d))

### ❤️ Thank You

- Ömer Faruk Coşkun

## 0.8.0 (2026-05-29)

### 🚀 Features

- implement battle series listing with database RPCs and associated UI components ([4c2738ca5](https://github.com/conectlens/lenserfight/commit/4c2738ca5))

### ❤️ Thank You

- Ömer Faruk Coşkun

## 0.7.0 (2026-05-29)

### 🚀 Features

- unify battle type derivation, standardize execution lifecycle states, and update CLI project config defaults to cloud mode ([ed83dcf89](https://github.com/conectlens/lenserfight/commit/ed83dcf89))
- standardize execution lifecycle states and integrate automation configuration into database and battle APIs. ([8272f08cc](https://github.com/conectlens/lenserfight/commit/8272f08cc))

### ❤️ Thank You

- Ömer Faruk Coşkun

## 0.6.0 (2026-05-29)

This was a version bump only for cli to align it with other projects, there were no code changes.

## 0.5.1 (2026-05-29)

This was a version bump only for cli to align it with other projects, there were no code changes.

## 0.5.0 (2026-05-28)

### 🚀 Features

- add apps/cli/tsconfig.json ([dc99e3f42](https://github.com/conectlens/lenserfight/commit/dc99e3f42))
- add apps/cli/tsconfig.app.json ([b2ee3db2c](https://github.com/conectlens/lenserfight/commit/b2ee3db2c))
- add apps/cli/src/utils/supabase-client.ts ([7c76c04b3](https://github.com/conectlens/lenserfight/commit/7c76c04b3))
- add apps/cli/src/utils/output.ts ([50f4fc9c5](https://github.com/conectlens/lenserfight/commit/50f4fc9c5))
- add apps/cli/src/utils/local-battle-storage.ts ([68dc85a5d](https://github.com/conectlens/lenserfight/commit/68dc85a5d))
- add apps/cli/src/utils/local-battle-storage.spec.ts ([afa12ba8c](https://github.com/conectlens/lenserfight/commit/afa12ba8c))
- add apps/cli/src/utils/local-battle-paths.spec.ts ([eb4ea5b90](https://github.com/conectlens/lenserfight/commit/eb4ea5b90))
- add apps/cli/src/utils/local-battle-engine.ts ([4794a55d5](https://github.com/conectlens/lenserfight/commit/4794a55d5))
- add apps/cli/src/utils/local-battle-engine.spec.ts ([f68f6ded9](https://github.com/conectlens/lenserfight/commit/f68f6ded9))
- add apps/cli/src/utils/battle-stream-broadcaster.ts ([74555e6d7](https://github.com/conectlens/lenserfight/commit/74555e6d7))
- add apps/cli/src/utils/auth-recovery.ts ([4bfaf8f00](https://github.com/conectlens/lenserfight/commit/4bfaf8f00))
- add apps/cli/src/utils/api.spec.ts ([97039433f](https://github.com/conectlens/lenserfight/commit/97039433f))
- add apps/cli/src/tui/runtime-telemetry.ts ([6bd3c29b0](https://github.com/conectlens/lenserfight/commit/6bd3c29b0))
- add apps/cli/src/tui/rooms.ts ([0693f3a85](https://github.com/conectlens/lenserfight/commit/0693f3a85))
- add apps/cli/src/tui/labyrinth.ts ([9a1c7c5f2](https://github.com/conectlens/lenserfight/commit/9a1c7c5f2))
- add apps/cli/src/tui/dashboard.spec.ts ([c68e341d8](https://github.com/conectlens/lenserfight/commit/c68e341d8))
- add apps/cli/src/lib/telemetry.ts ([763300d65](https://github.com/conectlens/lenserfight/commit/763300d65))
- add apps/cli/src/lib/safety/types.ts ([9132ec72a](https://github.com/conectlens/lenserfight/commit/9132ec72a))
- add apps/cli/src/lib/safety/index.ts ([29a49f14a](https://github.com/conectlens/lenserfight/commit/29a49f14a))
- add apps/cli/src/lib/safety/guard.ts ([801419de5](https://github.com/conectlens/lenserfight/commit/801419de5))
- add apps/cli/src/lib/safety/audit.ts ([4c27097a1](https://github.com/conectlens/lenserfight/commit/4c27097a1))
- add apps/cli/src/lib/redact.ts ([9015167e4](https://github.com/conectlens/lenserfight/commit/9015167e4))
- add apps/cli/src/lib/redact.spec.ts ([e3deb92d0](https://github.com/conectlens/lenserfight/commit/e3deb92d0))
- add apps/cli/src/lib/onboarding/steps/verify-workspace.ts ([dd1f6a5ba](https://github.com/conectlens/lenserfight/commit/dd1f6a5ba))
- add apps/cli/src/lib/onboarding/steps/start-services.ts ([9bff64c08](https://github.com/conectlens/lenserfight/commit/9bff64c08))
- add apps/cli/src/lib/onboarding/steps/prerequisites.ts ([5a2c123ad](https://github.com/conectlens/lenserfight/commit/5a2c123ad))
- add apps/cli/src/lib/onboarding/steps/configure-project.ts ([ccb017b0b](https://github.com/conectlens/lenserfight/commit/ccb017b0b))
- add apps/cli/src/lib/onboarding/state.ts ([43d471350](https://github.com/conectlens/lenserfight/commit/43d471350))
- add apps/cli/src/lib/onboarding/schema.ts ([59656138c](https://github.com/conectlens/lenserfight/commit/59656138c))
- add apps/cli/src/lib/onboarding/journey.ts ([588c10bca](https://github.com/conectlens/lenserfight/commit/588c10bca))
- add apps/cli/src/lib/onboarding/detect.ts ([741ab6b47](https://github.com/conectlens/lenserfight/commit/741ab6b47))
- add apps/cli/src/lib/exec-context.ts ([16b247e51](https://github.com/conectlens/lenserfight/commit/16b247e51))
- add apps/cli/src/lib/exec-context.spec.ts ([55f5102e8](https://github.com/conectlens/lenserfight/commit/55f5102e8))
- add apps/cli/src/lib/combine-seeds.ts ([e8ba45ab5](https://github.com/conectlens/lenserfight/commit/e8ba45ab5))
- add apps/cli/src/commands/whats-new.ts ([25913e1e6](https://github.com/conectlens/lenserfight/commit/25913e1e6))
- add apps/cli/src/commands/validate.ts ([c217d32d8](https://github.com/conectlens/lenserfight/commit/c217d32d8))
- add apps/cli/src/commands/top.ts ([67e22106f](https://github.com/conectlens/lenserfight/commit/67e22106f))
- add apps/cli/src/commands/template.ts ([2c052e892](https://github.com/conectlens/lenserfight/commit/2c052e892))
- add apps/cli/src/commands/team.ts ([77c5b09d2](https://github.com/conectlens/lenserfight/commit/77c5b09d2))
- add apps/cli/src/commands/team.spec.ts ([8359bc59d](https://github.com/conectlens/lenserfight/commit/8359bc59d))
- add apps/cli/src/commands/status.ts ([c0726ec48](https://github.com/conectlens/lenserfight/commit/c0726ec48))
- add apps/cli/src/commands/setup.ts ([cbfd95dad](https://github.com/conectlens/lenserfight/commit/cbfd95dad))
- add apps/cli/src/commands/seed.ts ([e99a5d89f](https://github.com/conectlens/lenserfight/commit/e99a5d89f))
- add apps/cli/src/commands/security.ts ([19c4a1cee](https://github.com/conectlens/lenserfight/commit/19c4a1cee))
- add apps/cli/src/commands/security.spec.ts ([8149d3d3b](https://github.com/conectlens/lenserfight/commit/8149d3d3b))
- add apps/cli/src/commands/schedule.spec.ts ([2007a5bb5](https://github.com/conectlens/lenserfight/commit/2007a5bb5))
- add apps/cli/src/commands/run.ts ([85e45c873](https://github.com/conectlens/lenserfight/commit/85e45c873))
- add apps/cli/src/commands/run.spec.ts ([20551bbed](https://github.com/conectlens/lenserfight/commit/20551bbed))
- add apps/cli/src/commands/rubric.ts ([158d96b0e](https://github.com/conectlens/lenserfight/commit/158d96b0e))
- add apps/cli/src/commands/report.ts ([c74033b33](https://github.com/conectlens/lenserfight/commit/c74033b33))
- add apps/cli/src/commands/providers.ts ([3f7de0cf7](https://github.com/conectlens/lenserfight/commit/3f7de0cf7))
- add apps/cli/src/commands/profile.spec.ts ([87cd66ab4](https://github.com/conectlens/lenserfight/commit/87cd66ab4))
- add apps/cli/src/commands/policy.ts ([adf4fa1f9](https://github.com/conectlens/lenserfight/commit/adf4fa1f9))
- add apps/cli/src/commands/models.ts ([154beb6f8](https://github.com/conectlens/lenserfight/commit/154beb6f8))
- add apps/cli/src/commands/migrate-terminology.ts ([2c6f52757](https://github.com/conectlens/lenserfight/commit/2c6f52757))
- add apps/cli/src/commands/memory.ts ([3a747ae8c](https://github.com/conectlens/lenserfight/commit/3a747ae8c))
- add apps/cli/src/commands/lenses.ts ([2d0dd0387](https://github.com/conectlens/lenserfight/commit/2d0dd0387))
- add apps/cli/src/commands/lenses.spec.ts ([af4504e93](https://github.com/conectlens/lenserfight/commit/af4504e93))
- add apps/cli/src/commands/leaderboard.ts ([5226b4f85](https://github.com/conectlens/lenserfight/commit/5226b4f85))
- add apps/cli/src/commands/kill-switch.ts ([b6e0efaec](https://github.com/conectlens/lenserfight/commit/b6e0efaec))
- add apps/cli/src/commands/invite.ts ([a902acd00](https://github.com/conectlens/lenserfight/commit/a902acd00))
- add apps/cli/src/commands/inspect.ts ([f92797b3c](https://github.com/conectlens/lenserfight/commit/f92797b3c))
- add apps/cli/src/commands/inspect.spec.ts ([dc950520a](https://github.com/conectlens/lenserfight/commit/dc950520a))
- add apps/cli/src/commands/import.ts ([8c9235000](https://github.com/conectlens/lenserfight/commit/8c9235000))
- add apps/cli/src/commands/gateway.spec.ts ([e292412a5](https://github.com/conectlens/lenserfight/commit/e292412a5))
- add apps/cli/src/commands/feed.ts ([20b562d53](https://github.com/conectlens/lenserfight/commit/20b562d53))
- add apps/cli/src/commands/export.ts ([86e60b3ab](https://github.com/conectlens/lenserfight/commit/86e60b3ab))
- add apps/cli/src/commands/execution.spec.ts ([a5361a298](https://github.com/conectlens/lenserfight/commit/a5361a298))
- add apps/cli/src/commands/evaluate.ts ([52533798f](https://github.com/conectlens/lenserfight/commit/52533798f))
- add apps/cli/src/commands/dev.ts ([8b5b8f4f4](https://github.com/conectlens/lenserfight/commit/8b5b8f4f4))
- add apps/cli/src/commands/dark-launch.ts ([9553c520a](https://github.com/conectlens/lenserfight/commit/9553c520a))
- add apps/cli/src/commands/connectors.ts ([d6f2acd3c](https://github.com/conectlens/lenserfight/commit/d6f2acd3c))
- add apps/cli/src/commands/connectors.spec.ts ([237c10044](https://github.com/conectlens/lenserfight/commit/237c10044))
- add apps/cli/src/commands/connect.ts ([66e57e15d](https://github.com/conectlens/lenserfight/commit/66e57e15d))
- add apps/cli/src/commands/config.ts ([4328d2ed9](https://github.com/conectlens/lenserfight/commit/4328d2ed9))
- add apps/cli/src/commands/config-webhook-secret.ts ([55ec8c321](https://github.com/conectlens/lenserfight/commit/55ec8c321))
- add apps/cli/src/commands/config-local-battle-key.ts ([107ab3142](https://github.com/conectlens/lenserfight/commit/107ab3142))
- add apps/cli/src/commands/completion.spec.ts ([f0b3d61f0](https://github.com/conectlens/lenserfight/commit/f0b3d61f0))
- add apps/cli/src/commands/communities.ts ([7311bf082](https://github.com/conectlens/lenserfight/commit/7311bf082))
- add apps/cli/src/commands/byok.ts ([e4e00628f](https://github.com/conectlens/lenserfight/commit/e4e00628f))
- add apps/cli/src/commands/byok.spec.ts ([f6ef3679c](https://github.com/conectlens/lenserfight/commit/f6ef3679c))
- add apps/cli/src/commands/budget.ts ([a5cae3339](https://github.com/conectlens/lenserfight/commit/a5cae3339))
- add apps/cli/src/commands/battle-moderation.ts ([9a4589856](https://github.com/conectlens/lenserfight/commit/9a4589856))
- add apps/cli/src/commands/battle-moderation.spec.ts ([aa87a54fd](https://github.com/conectlens/lenserfight/commit/aa87a54fd))
- add apps/cli/src/commands/automation.ts ([5bef15f36](https://github.com/conectlens/lenserfight/commit/5bef15f36))
- add apps/cli/src/commands/automation.spec.ts ([fd3737257](https://github.com/conectlens/lenserfight/commit/fd3737257))
- add apps/cli/src/commands/approval.ts ([0ef6c976a](https://github.com/conectlens/lenserfight/commit/0ef6c976a))
- add apps/cli/src/commands/approval.spec.ts ([88b27c5db](https://github.com/conectlens/lenserfight/commit/88b27c5db))
- add apps/cli/src/commands/analytics.ts ([fc1f8fe83](https://github.com/conectlens/lenserfight/commit/fc1f8fe83))
- add apps/cli/src/commands/analytics.spec.ts ([809a89f40](https://github.com/conectlens/lenserfight/commit/809a89f40))
- add apps/cli/src/commands/ai.ts ([db8ed0286](https://github.com/conectlens/lenserfight/commit/db8ed0286))
- add apps/cli/src/commands/admin.ts ([13a14c239](https://github.com/conectlens/lenserfight/commit/13a14c239))
- add apps/cli/src/commands/admin.spec.ts ([f57449763](https://github.com/conectlens/lenserfight/commit/f57449763))
- add apps/cli/src/commands/__tests__/battle.e2e.spec.ts ([8d9eedbd8](https://github.com/conectlens/lenserfight/commit/8d9eedbd8))
- add apps/cli/src/assets/ ([386cc16c8](https://github.com/conectlens/lenserfight/commit/386cc16c8))
- add apps/cli/src/adapters/ ([50c55fd47](https://github.com/conectlens/lenserfight/commit/50c55fd47))
- add apps/cli/jest.config.cts ([8dd025208](https://github.com/conectlens/lenserfight/commit/8dd025208))
- add apps/cli/eslint.config.mjs ([6fc507deb](https://github.com/conectlens/lenserfight/commit/6fc507deb))
- update CLI to default to cloud mode and automatically persist public Supabase credentials to device config ([59316ed38](https://github.com/conectlens/lenserfight/commit/59316ed38))
- expand SDK with new client modules for agents, lenses, and protocols, including supporting types and database migrations. ([f74e0ab78](https://github.com/conectlens/lenserfight/commit/f74e0ab78))
- implement Lenserfight SDK clients, enforce RLS on workflow schedules, and add database migration guards for phase 2. ([05cc205c7](https://github.com/conectlens/lenserfight/commit/05cc205c7))
- expand SDK with Protocol, Agent, and Lens clients, reorganize types, and migrate migration guards to separate directory. ([c2f351dea](https://github.com/conectlens/lenserfight/commit/c2f351dea))
- restrict CLI auth to local mode, migrate docs home to Vitepress layout, and optimize i18n routing. ([790d07bf5](https://github.com/conectlens/lenserfight/commit/790d07bf5))
- **cli:** add platform command and execution status subcommand ([2551b061a](https://github.com/conectlens/lenserfight/commit/2551b061a))
- introduce route-based architecture with modularized routing, Auth-based RouteGuard, and DashboardFrame layout. ([1e1da3184](https://github.com/conectlens/lenserfight/commit/1e1da3184))
- add apps/cli/llms.txt ([b0defa666](https://github.com/conectlens/lenserfight/commit/b0defa666))
- add ANSI utility unit tests and update validate command to use ai_vs_ai contender structure ([6d2c739c0](https://github.com/conectlens/lenserfight/commit/6d2c739c0))
- add apps/cli/src/utils/recovery-guidance.ts ([50cc4067a](https://github.com/conectlens/lenserfight/commit/50cc4067a))
- add apps/cli/src/utils/recovery-guidance.spec.ts ([9c218abb8](https://github.com/conectlens/lenserfight/commit/9c218abb8))
- add apps/cli/src/utils/error-taxonomy.ts ([ac1818438](https://github.com/conectlens/lenserfight/commit/ac1818438))
- add apps/cli/src/utils/error-taxonomy.spec.ts ([e275168ef](https://github.com/conectlens/lenserfight/commit/e275168ef))
- add apps/cli/src/utils/error-reporter.spec.ts ([2954e58a1](https://github.com/conectlens/lenserfight/commit/2954e58a1))
- add apps/cli/src/utils/docs-registry.ts ([043a4f69a](https://github.com/conectlens/lenserfight/commit/043a4f69a))
- add apps/cli/src/utils/docs-registry.spec.ts ([e6e596602](https://github.com/conectlens/lenserfight/commit/e6e596602))
- add apps/cli/src/commands/whats-new.spec.ts ([67b28b214](https://github.com/conectlens/lenserfight/commit/67b28b214))
- add apps/cli/src/commands/validate.spec.ts ([04c542449](https://github.com/conectlens/lenserfight/commit/04c542449))
- add apps/cli/src/commands/template.spec.ts ([6789ba8da](https://github.com/conectlens/lenserfight/commit/6789ba8da))
- add apps/cli/src/commands/tag.spec.ts ([ebe169f61](https://github.com/conectlens/lenserfight/commit/ebe169f61))
- add apps/cli/src/commands/report.spec.ts ([7ba7c744f](https://github.com/conectlens/lenserfight/commit/7ba7c744f))
- add apps/cli/src/commands/memory.spec.ts ([c9759b496](https://github.com/conectlens/lenserfight/commit/c9759b496))
- add apps/cli/src/commands/media.spec.ts ([f3f7f98cf](https://github.com/conectlens/lenserfight/commit/f3f7f98cf))
- add apps/cli/src/commands/lenser.spec.ts ([fb5fbc410](https://github.com/conectlens/lenserfight/commit/fb5fbc410))
- add apps/cli/src/commands/lens.spec.ts ([e638aa6d9](https://github.com/conectlens/lenserfight/commit/e638aa6d9))
- add apps/cli/src/commands/leaderboard.spec.ts ([5b725c7ab](https://github.com/conectlens/lenserfight/commit/5b725c7ab))
- add apps/cli/src/commands/kill-switch.spec.ts ([049a538a8](https://github.com/conectlens/lenserfight/commit/049a538a8))
- add apps/cli/src/commands/feed.spec.ts ([686f2cabe](https://github.com/conectlens/lenserfight/commit/686f2cabe))
- add apps/cli/src/commands/evaluate.spec.ts ([19bb10ed9](https://github.com/conectlens/lenserfight/commit/19bb10ed9))
- add apps/cli/src/commands/docs.ts ([ae39ab283](https://github.com/conectlens/lenserfight/commit/ae39ab283))
- add apps/cli/src/commands/docs.spec.ts ([62387d3c5](https://github.com/conectlens/lenserfight/commit/62387d3c5))
- add apps/cli/src/commands/config.spec.ts ([fa43d3cb9](https://github.com/conectlens/lenserfight/commit/fa43d3cb9))
- add apps/cli/src/commands/budget.spec.ts ([a93084014](https://github.com/conectlens/lenserfight/commit/a93084014))
- implement text-to-video execution runner and expand CLI test coverage, documentation, and error reporting utilities. ([ccfb584d3](https://github.com/conectlens/lenserfight/commit/ccfb584d3))
- **cli:** add examples and env commands, i18n module, expand spec kinds ([a7215cc99](https://github.com/conectlens/lenserfight/commit/a7215cc99))
- **types:** add apiVersion to AutomationObjectFrontmatter with validation ([859cdda8b](https://github.com/conectlens/lenserfight/commit/859cdda8b))
- **cli/spec:** add lf spec command for spec file governance ([78d7eb549](https://github.com/conectlens/lenserfight/commit/78d7eb549))
- **update:** implement self-update mechanism for CLI and web ([03e6d0ab4](https://github.com/conectlens/lenserfight/commit/03e6d0ab4))
- **auth:** support username/handle login alongside email ([713b04538](https://github.com/conectlens/lenserfight/commit/713b04538))
- transition to unified Nx release workflow with independent project groups and automated npm publishing ([614017142](https://github.com/conectlens/lenserfight/commit/614017142))
- **battle-governance:** add benchmark game registry, generated challenge types, and V2 validator extensions ([7a39c51d9](https://github.com/conectlens/lenserfight/commit/7a39c51d9))
- **cli:** expand onboard and doctor commands with improved detection and UX ([fd548e4fa](https://github.com/conectlens/lenserfight/commit/fd548e4fa))
- add CLI battle commands, update DB seed password logic, and improve documentation generation tool ([182790428](https://github.com/conectlens/lenserfight/commit/182790428))
- add CLI subcommands, implement alias arguments for schedules, and improve auth and doc generation security ([d8b1fb4a9](https://github.com/conectlens/lenserfight/commit/d8b1fb4a9))
- add public wrapper function for listing tools and update CLI command to utilize it ([66eafe006](https://github.com/conectlens/lenserfight/commit/66eafe006))

### 🩹 Fixes

- resolve device login code uniqueness collisions and remove adapter-connector from npm release workflow ([4f6f0fdfd](https://github.com/conectlens/lenserfight/commit/4f6f0fdfd))
- **cli:** resolve jest.config.cts not being loaded by Jest 29 ([c94a88bf8](https://github.com/conectlens/lenserfight/commit/c94a88bf8))
- **cli/auth:** reject private/Tailscale IPs in buildAuthAppUrl ([252470d54](https://github.com/conectlens/lenserfight/commit/252470d54))
- **cli:** gateway identity init subcommand, battle next-steps hint, PGRST106 error classification ([0fb879dda](https://github.com/conectlens/lenserfight/commit/0fb879dda))

### ❤️ Thank You

- Claude Sonnet 4.6
- Ömer Faruk Coşkun

## 0.4.0 (2026-05-28)

### 🚀 Features

- update CLI to default to cloud mode and automatically persist public Supabase credentials to device config ([d95c8e56](https://github.com/conectlens/lenserfight/commit/d95c8e56))

### ❤️ Thank You

- Ömer Faruk Coşkun

## 0.3.2 (2026-05-28)

### 🩹 Fixes

- resolve device login code uniqueness collisions and remove adapter-connector from npm release workflow ([e2abdf5c](https://github.com/conectlens/lenserfight/commit/e2abdf5c))

### ❤️ Thank You

- Ömer Faruk Coşkun

## 1.1.0 (2026-05-28)

This was a version bump only for cli to align it with other projects, there were no code changes.

## 0.3.0 (2026-05-28)

### 🚀 Features

- expand SDK with new client modules for agents, lenses, and protocols, including supporting types and database migrations. ([32d99a40](https://github.com/conectlens/lenserfight/commit/32d99a40))
- implement Lenserfight SDK clients, enforce RLS on workflow schedules, and add database migration guards for phase 2. ([7d6e7e2d](https://github.com/conectlens/lenserfight/commit/7d6e7e2d))
- expand SDK with Protocol, Agent, and Lens clients, reorganize types, and migrate migration guards to separate directory. ([037bad85](https://github.com/conectlens/lenserfight/commit/037bad85))
- restrict CLI auth to local mode, migrate docs home to Vitepress layout, and optimize i18n routing. ([ed51c859](https://github.com/conectlens/lenserfight/commit/ed51c859))
- **cli:** add platform command and execution status subcommand ([6b693afb](https://github.com/conectlens/lenserfight/commit/6b693afb))
- introduce route-based architecture with modularized routing, Auth-based RouteGuard, and DashboardFrame layout. ([06fb94ce](https://github.com/conectlens/lenserfight/commit/06fb94ce))
- add apps/cli/llms.txt ([bd6b9e9d](https://github.com/conectlens/lenserfight/commit/bd6b9e9d))
- add ANSI utility unit tests and update validate command to use ai_vs_ai contender structure ([aa22b31e](https://github.com/conectlens/lenserfight/commit/aa22b31e))
- add apps/cli/src/utils/recovery-guidance.ts ([a88104a0](https://github.com/conectlens/lenserfight/commit/a88104a0))
- add apps/cli/src/utils/recovery-guidance.spec.ts ([97bfc0f4](https://github.com/conectlens/lenserfight/commit/97bfc0f4))
- add apps/cli/src/utils/error-taxonomy.ts ([5c9f8782](https://github.com/conectlens/lenserfight/commit/5c9f8782))
- add apps/cli/src/utils/error-taxonomy.spec.ts ([c86f6699](https://github.com/conectlens/lenserfight/commit/c86f6699))
- add apps/cli/src/utils/error-reporter.spec.ts ([81621aab](https://github.com/conectlens/lenserfight/commit/81621aab))
- add apps/cli/src/utils/docs-registry.ts ([6f7fdc59](https://github.com/conectlens/lenserfight/commit/6f7fdc59))
- add apps/cli/src/utils/docs-registry.spec.ts ([1ffc1f51](https://github.com/conectlens/lenserfight/commit/1ffc1f51))
- add apps/cli/src/commands/whats-new.spec.ts ([e00f99ea](https://github.com/conectlens/lenserfight/commit/e00f99ea))
- add apps/cli/src/commands/validate.spec.ts ([8620a008](https://github.com/conectlens/lenserfight/commit/8620a008))
- add apps/cli/src/commands/template.spec.ts ([0d2d87e4](https://github.com/conectlens/lenserfight/commit/0d2d87e4))
- add apps/cli/src/commands/tag.spec.ts ([cddb3f36](https://github.com/conectlens/lenserfight/commit/cddb3f36))
- add apps/cli/src/commands/report.spec.ts ([43618aa1](https://github.com/conectlens/lenserfight/commit/43618aa1))
- add apps/cli/src/commands/memory.spec.ts ([a80d318d](https://github.com/conectlens/lenserfight/commit/a80d318d))
- add apps/cli/src/commands/media.spec.ts ([a3ae0066](https://github.com/conectlens/lenserfight/commit/a3ae0066))
- add apps/cli/src/commands/lenser.spec.ts ([93eef4ad](https://github.com/conectlens/lenserfight/commit/93eef4ad))
- add apps/cli/src/commands/lens.spec.ts ([bc5503e8](https://github.com/conectlens/lenserfight/commit/bc5503e8))
- add apps/cli/src/commands/leaderboard.spec.ts ([3db00c39](https://github.com/conectlens/lenserfight/commit/3db00c39))
- add apps/cli/src/commands/kill-switch.spec.ts ([43592149](https://github.com/conectlens/lenserfight/commit/43592149))
- add apps/cli/src/commands/feed.spec.ts ([0e23fd66](https://github.com/conectlens/lenserfight/commit/0e23fd66))
- add apps/cli/src/commands/evaluate.spec.ts ([834dc844](https://github.com/conectlens/lenserfight/commit/834dc844))
- add apps/cli/src/commands/docs.ts ([881fd29d](https://github.com/conectlens/lenserfight/commit/881fd29d))
- add apps/cli/src/commands/docs.spec.ts ([f36db311](https://github.com/conectlens/lenserfight/commit/f36db311))
- add apps/cli/src/commands/config.spec.ts ([ce9b835c](https://github.com/conectlens/lenserfight/commit/ce9b835c))
- add apps/cli/src/commands/budget.spec.ts ([76767c5b](https://github.com/conectlens/lenserfight/commit/76767c5b))
- implement text-to-video execution runner and expand CLI test coverage, documentation, and error reporting utilities. ([8a375b82](https://github.com/conectlens/lenserfight/commit/8a375b82))
- **cli:** add examples and env commands, i18n module, expand spec kinds ([493668aa](https://github.com/conectlens/lenserfight/commit/493668aa))
- **types:** add apiVersion to AutomationObjectFrontmatter with validation ([da8a330f](https://github.com/conectlens/lenserfight/commit/da8a330f))
- **cli/spec:** add lf spec command for spec file governance ([c8c8edaa](https://github.com/conectlens/lenserfight/commit/c8c8edaa))
- **update:** implement self-update mechanism for CLI and web ([e9bb63c6](https://github.com/conectlens/lenserfight/commit/e9bb63c6))
- **auth:** support username/handle login alongside email ([d8b76ed9](https://github.com/conectlens/lenserfight/commit/d8b76ed9))
- transition to unified Nx release workflow with independent project groups and automated npm publishing ([237fe7d8](https://github.com/conectlens/lenserfight/commit/237fe7d8))
- **battle-governance:** add benchmark game registry, generated challenge types, and V2 validator extensions ([927fe5be](https://github.com/conectlens/lenserfight/commit/927fe5be))
- **cli:** expand onboard and doctor commands with improved detection and UX ([a0759720](https://github.com/conectlens/lenserfight/commit/a0759720))
- add CLI battle commands, update DB seed password logic, and improve documentation generation tool ([303f0e2c](https://github.com/conectlens/lenserfight/commit/303f0e2c))
- add CLI subcommands, implement alias arguments for schedules, and improve auth and doc generation security ([bfb3b547](https://github.com/conectlens/lenserfight/commit/bfb3b547))
- add public wrapper function for listing tools and update CLI command to utilize it ([fafbc0a8](https://github.com/conectlens/lenserfight/commit/fafbc0a8))
- add ProfileCompletionBanner, implement battle automation step, and include share link on empty following page ([bb398bae](https://github.com/conectlens/lenserfight/commit/bb398bae))
- add apps/cli/src/commands/admin.spec.ts ([48cb7c59](https://github.com/conectlens/lenserfight/commit/48cb7c59))
- **cli:** register admin command in cli entry ([3add7892](https://github.com/conectlens/lenserfight/commit/3add7892))
- **cli:** add admin command ([2314b2d0](https://github.com/conectlens/lenserfight/commit/2314b2d0))
- **cli:** update workflow command ([93a95abe](https://github.com/conectlens/lenserfight/commit/93a95abe))
- **cli:** update battle command ([c00291a3](https://github.com/conectlens/lenserfight/commit/c00291a3))
- add apps/cli/src/commands/security.ts ([a1412a68](https://github.com/conectlens/lenserfight/commit/a1412a68))
- add apps/cli/src/commands/security.spec.ts ([9bf1d9a3](https://github.com/conectlens/lenserfight/commit/9bf1d9a3))
- add apps/cli/src/commands/byok.spec.ts ([ff2ea58b](https://github.com/conectlens/lenserfight/commit/ff2ea58b))
- add apps/cli/src/commands/__tests__/ ([9f995e56](https://github.com/conectlens/lenserfight/commit/9f995e56))
- add apps/cli/src/commands/gateway.spec.ts ([5f425e47](https://github.com/conectlens/lenserfight/commit/5f425e47))
- support custom stream URL generation via adapter optional method ([74906b59](https://github.com/conectlens/lenserfight/commit/74906b59))
- add optional buildStreamUrl support to stream adapters for dynamic endpoint generation ([3c94f662](https://github.com/conectlens/lenserfight/commit/3c94f662))
- enable dynamic stream URL construction via optional adapter methods ([b06335ed](https://github.com/conectlens/lenserfight/commit/b06335ed))
- **cli:** rename colens references to workflow, add list/create/export subcommands and templates ([7858d2de](https://github.com/conectlens/lenserfight/commit/7858d2de))
- **cli:** add starter template support and add-member hint to team create command ([fbfcad8d](https://github.com/conectlens/lenserfight/commit/fbfcad8d))
- **cli:** add policy set subcommand for uploading or updating agent policy config ([bac73958](https://github.com/conectlens/lenserfight/commit/bac73958))
- **cli:** add memory create-profile subcommand for creating AI lenser memory profiles ([85a8dba8](https://github.com/conectlens/lenserfight/commit/85a8dba8))
- **cli:** add --no-browser flag and already-authenticated guard to login ([979b20a3](https://github.com/conectlens/lenserfight/commit/979b20a3))
- **cli:** add migrate-terminology command for renaming legacy object types ([4c32f52e](https://github.com/conectlens/lenserfight/commit/4c32f52e))
- **cli:** register new commands and update CLI entry point ([2b48f0f5](https://github.com/conectlens/lenserfight/commit/2b48f0f5))
- **cli:** update workflow command for new portable object types ([8cdb5df8](https://github.com/conectlens/lenserfight/commit/8cdb5df8))
- **cli:** update validate command for new portable object types ([c70442b8](https://github.com/conectlens/lenserfight/commit/c70442b8))
- **cli:** update template command for new portable object types ([040e0ba2](https://github.com/conectlens/lenserfight/commit/040e0ba2))
- **cli:** update export command for new portable object types ([bfb0387d](https://github.com/conectlens/lenserfight/commit/bfb0387d))
- improve Ollama error messages with actionable troubleshooting steps ([2e7410b9](https://github.com/conectlens/lenserfight/commit/2e7410b9))
- support user-friendly identifiers for profile and runner commands and improve Ollama error messaging ([67696c1c](https://github.com/conectlens/lenserfight/commit/67696c1c))
- improve CLI lenser identification by adding username support and helper resolution utilities ([2ff551fd](https://github.com/conectlens/lenserfight/commit/2ff551fd))
- implement flexible identifier resolution and schema-based API routing for CLI commands ([4b8d8103](https://github.com/conectlens/lenserfight/commit/4b8d8103))
- implement lens CLI commands and restructure analytics infrastructure with multi-provider support ([192fb1c2](https://github.com/conectlens/lenserfight/commit/192fb1c2))
- add developer examples, documentation tutorials, and associated scoring/lens configurations. ([a0d87b10](https://github.com/conectlens/lenserfight/commit/a0d87b10))
- expand documentation and add new example workflows, lenses, connectors, and scoring plugins ([b8bded1f](https://github.com/conectlens/lenserfight/commit/b8bded1f))
- add BYOK configuration section, media access logging, and a MediaGallery component with management hooks ([a351f82a](https://github.com/conectlens/lenserfight/commit/a351f82a))
- add BYOK management section, echo provider, media gallery component, and associated hooks and tests ([9b3d9f83](https://github.com/conectlens/lenserfight/commit/9b3d9f83))
- add CLI media management tools, implement EchoProvider, and introduce BYOK section in agent workspace ([7857fd7d](https://github.com/conectlens/lenserfight/commit/7857fd7d))
- implement MediaGallery UI, add media management CLI commands, and introduce Echo execution provider for local testing. ([0fb1bf16](https://github.com/conectlens/lenserfight/commit/0fb1bf16))
- add media info, play, and manifest commands to CLI, and create UI media component library with audio/video players ([d0e43314](https://github.com/conectlens/lenserfight/commit/d0e43314))
- **cli:** add media list and download commands ([e08b0788](https://github.com/conectlens/lenserfight/commit/e08b0788))
- add media management CLI commands, implement pgTAP test runner, and update cron monitoring to support optional tasks ([f3d44e16](https://github.com/conectlens/lenserfight/commit/f3d44e16))
- add legacy SSE route support, update docs with local installation guides, and improve project build configurations. ([8fd7caf4](https://github.com/conectlens/lenserfight/commit/8fd7caf4))
- **cli:** implement lf top runtime telemetry dashboard ([4d6165d3](https://github.com/conectlens/lenserfight/commit/4d6165d3))
- replace mandatory human voting in local battles with AI auto-judge ([6282ba29](https://github.com/conectlens/lenserfight/commit/6282ba29))
- implement automated AI battle judging, support manual override flags, and add rate limit error handling ([5870a01b](https://github.com/conectlens/lenserfight/commit/5870a01b))
- integrate standardized safety assertions across CLI destructive and administrative commands ([4f18008e](https://github.com/conectlens/lenserfight/commit/4f18008e))
- implement centralized safety guard system for high-risk CLI commands ([2083b7a5](https://github.com/conectlens/lenserfight/commit/2083b7a5))
- implement centralized safety guard system with audit and confirmation policies across destructive CLI commands ([028a1d4a](https://github.com/conectlens/lenserfight/commit/028a1d4a))
- implement interactive labyrinth TUI for CLI onboarding and navigation ([6140f6ee](https://github.com/conectlens/lenserfight/commit/6140f6ee))
- update approval TUI commands and validation flags for enhanced filtering ([fa9b29f2](https://github.com/conectlens/lenserfight/commit/fa9b29f2))
- implement interactive command prompting in TUI to allow argument entry before execution ([e640facb](https://github.com/conectlens/lenserfight/commit/e640facb))
- implement synchronous command bar and main dashboard rendering in TUI ([528a32d9](https://github.com/conectlens/lenserfight/commit/528a32d9))
- add command catalog, autocomplete suggestions, and sub-dashboard keybindings to TUI ([947baa2a](https://github.com/conectlens/lenserfight/commit/947baa2a))
- implement validateSubcommand helper to enforce required CLI flags and add corresponding unit tests ([a0b1d5b0](https://github.com/conectlens/lenserfight/commit/a0b1d5b0))
- improve documentation with OG metadata, new operational pages, and simplified URL redirects ([157d3684](https://github.com/conectlens/lenserfight/commit/157d3684))
- implement platform flags, launch runbook, and associated deployment infrastructure tools ([c0ca05e3](https://github.com/conectlens/lenserfight/commit/c0ca05e3))
- add --local and --debug global flags to CLI ([618e995a](https://github.com/conectlens/lenserfight/commit/618e995a))
- relicense to MIT, add Chainabit positioning, and clean all repo URLs ([39e08b98](https://github.com/conectlens/lenserfight/commit/39e08b98))
- expand CLI reference documentation and implement gateway precondition probes ([ea2332cd](https://github.com/conectlens/lenserfight/commit/ea2332cd))
- **cli/gateway:** refactor to subcommand pattern with device and runner management ([59305f7a](https://github.com/conectlens/lenserfight/commit/59305f7a))
- **cli/battle:** BYOK key management, workflow dispatch, schedule and force-transition commands ([3df275f1](https://github.com/conectlens/lenserfight/commit/3df275f1))
- **phase-ae:** platform kill switch CLI commands and admin UI ([25b61044](https://github.com/conectlens/lenserfight/commit/25b61044))
- implement battle invite management and user onboarding journey tracking ([3ff46449](https://github.com/conectlens/lenserfight/commit/3ff46449))
- enable configurable auth base URL via VITE_AUTH_BASE_URL environment variable ([49c52960](https://github.com/conectlens/lenserfight/commit/49c52960))
- add ANSI escape sequences for alternate screen buffer toggling and integrate into dashboard TUI ([bc75ce81](https://github.com/conectlens/lenserfight/commit/bc75ce81))
- add official soundtrack section to arena home page and refactor CLI to use centralized Supabase client ([532879b7](https://github.com/conectlens/lenserfight/commit/532879b7))
- scaffold arena application, localize content, and enhance CLI command testing and functionality ([923877f3](https://github.com/conectlens/lenserfight/commit/923877f3))
- implement notification system, tournament brackets, and lenserboard data repository ([d14644b5](https://github.com/conectlens/lenserfight/commit/d14644b5))
- implement local battle execution engine, CLI subcommands, and comprehensive documentation for local-first workflows ([d3309e21](https://github.com/conectlens/lenserfight/commit/d3309e21))
- implement agent analytics dashboard, CLI summary command, and supporting repository and hooks ([fc59a42b](https://github.com/conectlens/lenserfight/commit/fc59a42b))
- **cli:** wire connector commands to typed contracts and scope-error mapping ([353e2663](https://github.com/conectlens/lenserfight/commit/353e2663))
- **cli:** add --dry-run to lf run exec with credentialless unit tests ([82f4fb60](https://github.com/conectlens/lenserfight/commit/82f4fb60))
- **cli:** add automation workspace commands and battle run subcommand ([b161dce0](https://github.com/conectlens/lenserfight/commit/b161dce0))
- implement agent approval workflow with RPC-backed decisions and new management UI components ([5b99e065](https://github.com/conectlens/lenserfight/commit/5b99e065))
- implement CLI commands for managing agent approval workflows, execution, scheduling, and team operations ([693d308e](https://github.com/conectlens/lenserfight/commit/693d308e))
- implement AI catalog and agent workspace infrastructure with multi-mode sidebar support and updated dev server configuration ([87a37fe1](https://github.com/conectlens/lenserfight/commit/87a37fe1))
- overhaul CLI onboarding, add platform API, storage observability, and env-driven Ollama config ([d0f9777a](https://github.com/conectlens/lenserfight/commit/d0f9777a))
- add local file storage tutorial, document AI agent integration, and update installation guide with non-Docker setup options. ([db754210](https://github.com/conectlens/lenserfight/commit/db754210))
- add local file storage adapter support, introduce API key authentication, and update documentation with new storage and integration guides. ([c8162c8b](https://github.com/conectlens/lenserfight/commit/c8162c8b))
- add local file storage mode, AI agent integration guides, and CLI lens migration utilities ([f8b51c57](https://github.com/conectlens/lenserfight/commit/f8b51c57))
- **cli:** add communities, connectors, lenses, connect, and invite commands ([a2308dfe](https://github.com/conectlens/lenserfight/commit/a2308dfe))
- implement seed manifest system with automated database reset workflows and recovery scripts ([7b57dee8](https://github.com/conectlens/lenserfight/commit/7b57dee8))
- add CLI setup wizard, improve README, fix TypeScript exports ([45333a6b](https://github.com/conectlens/lenserfight/commit/45333a6b))
- add chmod and npm link targets to cli project configuration ([39d4430e](https://github.com/conectlens/lenserfight/commit/39d4430e))
- implement browser-based device login flow and add run exec command for direct prompt execution ([cfa2933a](https://github.com/conectlens/lenserfight/commit/cfa2933a))
- add device approval flow, update documentation, and configure VitePress favicons and assets ([1f5c9d45](https://github.com/conectlens/lenserfight/commit/1f5c9d45))
- Implement atomic lens creation, update, and version management using new RPCs, refactoring repository and CLI usage, and updating documentation. ([dbc7ad78](https://github.com/conectlens/lenserfight/commit/dbc7ad78))
- Introduce "Lenses" domain and "Arena" battle features, deprecating "Prompts" and updating related documentation and components. ([58275431](https://github.com/conectlens/lenserfight/commit/58275431))
- Introduce prompt versioning with resource attachments, expand AI model provider integrations, and add CLI prompt management. ([47a4628b](https://github.com/conectlens/lenserfight/commit/47a4628b))
- introduce `apiFetch` utility with automatic camelCase to snake_case key transformation for request bodies and optional snake_case to camelCase for response bodies. ([c74b3305](https://github.com/conectlens/lenserfight/commit/c74b3305))
- Add repo-performance-guard and app-specific performance skills with guidelines for Supabase query and rendering optimization. ([4dfeda3a](https://github.com/conectlens/lenserfight/commit/4dfeda3a))
- Add repo-performance-guard and app-specific performance skills with guidelines for Supabase query and rendering optimization. ([a506414f](https://github.com/conectlens/lenserfight/commit/a506414f))
- Introduce a shared error handling library with global context and UI for consistent error display across applications. ([64ed8791](https://github.com/conectlens/lenserfight/commit/64ed8791))
- Introduce a shared error handling library with global context and UI for consistent error display across applications. ([4afb6fcd](https://github.com/conectlens/lenserfight/commit/4afb6fcd))
- Introduce new CLI commands and comprehensive documentation, update data repositories, and adjust various UI pages. ([041e61a5](https://github.com/conectlens/lenserfight/commit/041e61a5))
- Introduce new CLI commands and comprehensive documentation, update data repositories, and adjust various UI pages. ([0380a038](https://github.com/conectlens/lenserfight/commit/0380a038))
- Add a new `register` command to the CLI for user registration, including utility functions for user creation, handle generation, and profile management. ([4780b0fe](https://github.com/conectlens/lenserfight/commit/4780b0fe))
- Add a new `register` command to the CLI for user registration, including utility functions for user creation, handle generation, and profile management. ([f8480906](https://github.com/conectlens/lenserfight/commit/f8480906))
- **cli:** Update CLI and docs. ([dcdf4c1b](https://github.com/conectlens/lenserfight/commit/dcdf4c1b))
- **cli:** Update CLI and docs. ([94948a2d](https://github.com/conectlens/lenserfight/commit/94948a2d))
- **app:** Add new features and migrations. ([2f7f11f9](https://github.com/conectlens/lenserfight/commit/2f7f11f9))
- **app:** Add new features and migrations. ([bc19a715](https://github.com/conectlens/lenserfight/commit/bc19a715))
- **battle:** Battle and docs. ([e8e1c1a3](https://github.com/conectlens/lenserfight/commit/e8e1c1a3))
- **battle:** Battle and docs. ([1e57f530](https://github.com/conectlens/lenserfight/commit/1e57f530))
- Scaffold new `arena` and `cli` applications, and remove the `docs` application. ([821e7033](https://github.com/conectlens/lenserfight/commit/821e7033))
- Scaffold new `arena` and `cli` applications, and remove the `docs` application. ([8cf04201](https://github.com/conectlens/lenserfight/commit/8cf04201))

### 🩹 Fixes

- **cli:** resolve jest.config.cts not being loaded by Jest 29 ([3d8d8042](https://github.com/conectlens/lenserfight/commit/3d8d8042))
- **cli/auth:** reject private/Tailscale IPs in buildAuthAppUrl ([afc5fcdd](https://github.com/conectlens/lenserfight/commit/afc5fcdd))
- **cli:** gateway identity init subcommand, battle next-steps hint, PGRST106 error classification ([3e2e0cb4](https://github.com/conectlens/lenserfight/commit/3e2e0cb4))
- **cli:** broaden rate-limit detection to match battle_rate_limit message strings ([ef93b250](https://github.com/conectlens/lenserfight/commit/ef93b250))
- **cli:** show usage hints and template generation guidance when no files found on validate ([0d14af3d](https://github.com/conectlens/lenserfight/commit/0d14af3d))
- **cli:** show full UUID in lenser list and unwrap array response from fn_runner_get in lenser view ([065a5946](https://github.com/conectlens/lenserfight/commit/065a5946))
- **cli:** pass required RPC params (p_params, p_tag_ids, p_parent_lens_id, p_forked_from_execution_id) on lens create ([6690f0b8](https://github.com/conectlens/lenserfight/commit/6690f0b8))
- **cli:** show usage hints and template generation guidance when no files found on import ([3a05c0b2](https://github.com/conectlens/lenserfight/commit/3a05c0b2))
- **cli:** default battle run path to ~/.lenserfight/PRIVATE_BATTLE.md with file-not-found guidance ([1a0428f1](https://github.com/conectlens/lenserfight/commit/1a0428f1))
- **cli:** Seeding forcely using --force ([55471d1b](https://github.com/conectlens/lenserfight/commit/55471d1b))
- **cli:** Seeding forcely using --force ([b9ee43c9](https://github.com/conectlens/lenserfight/commit/b9ee43c9))
- **cli:** Local directory for cli. ([265e26aa](https://github.com/conectlens/lenserfight/commit/265e26aa))
- **cli:** Local directory for cli. ([09861739](https://github.com/conectlens/lenserfight/commit/09861739))
- **cli:** Do not require slug. ([2f7d6d10](https://github.com/conectlens/lenserfight/commit/2f7d6d10))
- **cli:** Do not require slug. ([929bff70](https://github.com/conectlens/lenserfight/commit/929bff70))

### ❤️ Thank You

- Claude Opus 4.6 (1M context)
- Claude Opus 4.7
- Claude Sonnet 4.6
- Ömer Faruk Coşkun