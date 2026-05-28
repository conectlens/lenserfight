# Architecture Map

A one-page guide to where things live in the LenserFight monorepo.

## Layer overview

| Layer | Path | Responsibility |
|---|---|---|
| App | `apps/web/` | Entry point, routing, provider composition. No domain logic. |
| Feature | `libs/features/*` | Vertical slices (battles, profile, home, lenserboard). Pages, hooks, feature components. |
| Data | `libs/data/*` | Repositories, Supabase client, React Query wrappers, caching strategy. |
| Domain | `libs/domain/*` | Business types, invariants, pure logic. No I/O. |
| UI | `libs/ui/*` | Reusable components, forms, layout, theme tokens. No feature imports. |
| Infra | `libs/infra/*` | Analytics, moderation, storage adapters. |
| Shared | `libs/shared/*` | Error handling, auth guards, utilities shared across feature boundaries. |
| DB | `supabase/` | Migrations, RLS policies, SQL functions, pgTAP tests. |

**Import direction:** `feature` → `data` → `domain`; `feature` → `ui`; never reverse.

## Layer summaries

**`apps/web/`** — The React application shell. It composes providers (auth, query client, theme, helmet), declares routes, and renders feature pages. If you are adding a new page, register it here.

**`libs/features/*`** — One directory per product area. Each feature exports its pages via `src/index.ts`. Feature code may import from `data`, `domain`, `ui`, `shared`, and `utils` — never from another feature.

**`libs/data/*`** — All Supabase queries live here. Repositories call RPCs and map results to domain types. React Query hooks (`useQuery`, `useInfiniteQuery`) are defined here or in the feature that owns the query.

**`libs/domain/*`** — Pure TypeScript: types, enums, validation helpers, business rules. No React, no Supabase imports. The source of truth for what a `Battle`, `Lenser`, or `XPEvent` is.

**`supabase/`** — Schema lives in `migrations/`. Functions and triggers live inline in migrations. Tests in `supabase/tests/` run with pgTAP. Do not edit merged migration files — always add a new file.

## "Where does X live?" lookup

| Contribution target | Where to touch |
|---|---|
| New column on an existing table | New migration in `supabase/migrations/` + pgTAP test in `supabase/tests/` |
| New Supabase RPC | Migration (function definition) + `libs/data/repositories/src/lib/` caller + type in `libs/domain/` |
| New battle field in UI | Migration → repository → domain type → feature component in `libs/features/battles/` |
| New page / route | Feature page in `libs/features/<area>/src/lib/pages/` → register route in `apps/web/src/app/` |
| New reusable component | `libs/ui/components/src/lib/` → export from `src/index.ts` |
| New CLI command | `apps/cli/src/commands/` + spec file in same directory |
| i18n / translation string | `apps/web/public/locales/` for forum; `docs/` locale directories for docs |
| SDK surface | `libs/sdk/src/lib/` → export from `src/index.ts` |
