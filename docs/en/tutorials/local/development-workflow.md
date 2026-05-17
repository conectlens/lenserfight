---
title: Local Development Workflow
description: Understand the LenserFight monorepo structure, hot reload workflow, IDE configuration, and daily development patterns.
head:
  - - meta
    - name: og:title
      content: Local Development Workflow — LenserFight
  - - meta
    - name: og:description
      content: Master the LenserFight monorepo development workflow — project architecture, hot reload, debugging, and IDE setup.
---

# Local Development Workflow

This tutorial teaches you how to navigate, develop, and debug within the LenserFight Nx monorepo. By the end, you will have a productive local development environment and understand the codebase architecture.

## Prerequisites

- [Local Installation](/en/tutorials/local/installation) completed
- VS Code or WebStorm installed
- Node.js 20+ with pnpm

---

## Project architecture

LenserFight is an Nx monorepo with a layered architecture:

```
lenserfight/
├── apps/                    # Deployable applications
│   ├── web/                 # Main web app (React + Vite, port 3000)
│   ├── arena/               # Public battle arena (port 3001)
│   ├── docs/                # VitePress documentation (port 3002)
│   ├── auth/                # Authentication flows (port 3004)
│   ├── mobile/              # Expo mobile app
│   ├── cli/                 # lf CLI (citty)
│   ├── gateway/             # Trust Gateway service
│   └── worker/              # Background worker (scheduled jobs, async tasks)
├── libs/                    # Shared libraries (layered)
│   ├── features/            # Vertical feature slices (UI + logic)
│   ├── domain/              # Business logic and domain types
│   ├── data/                # Supabase repositories and caching
│   ├── api/                 # API clients
│   ├── ui/                  # Shared UI components
│   ├── shared/              # Cross-cutting utilities
│   ├── types/               # TypeScript type definitions
│   ├── infra/               # Infrastructure adapters
│   ├── adapters/            # Provider adapters
│   ├── providers/           # AI provider integrations
│   ├── plugins/             # Plugin system
│   └── utils/               # Pure utility functions
├── supabase/                # Database schema and migrations
│   ├── migrations/          # Ordered SQL migrations
│   ├── seed.sql             # Seed data
│   └── config.toml          # Supabase local config
├── docs/                    # Documentation source (VitePress srcDir)
├── scripts/                 # Build and maintenance scripts
└── tools/                   # Nx plugins and generators
```

### Layer rules

| Layer | Imports from | Never imports from |
|-------|-------------|-------------------|
| `apps/*` | `libs/*` | Other `apps/*` |
| `libs/features/*` | `domain`, `data`, `api`, `ui`, `shared`, `types` | Other `features/*` |
| `libs/domain/*` | `types`, `shared` | `data`, `api`, `features` |
| `libs/data/*` | `domain`, `types`, `shared` | `features`, `api` |
| `libs/ui/*` | `types`, `shared` | `domain`, `data`, `features` |

---

## Daily development loop

### 1. Start the development server

```bash
# Web app only (most common)
pnpm nx run web:serve

# Multiple apps in parallel
pnpm nx run-many -t serve -p web,auth,docs
```

### 2. Make changes

Edit files in `libs/` or `apps/`. Vite HMR picks up changes instantly — no manual restart needed.

### 3. Run affected checks

```bash
# Lint only changed projects
pnpm nx affected -t lint

# Test only changed projects
pnpm nx affected -t test

# Build only changed projects
pnpm nx affected -t build
```

### 4. Commit with conventional commits

```bash
git commit -m "feat(agents): add memory persistence toggle"
git commit -m "fix(workflows): resolve edge deletion crash"
```

---

## Hot reload workflow

Vite provides instant HMR for all React components. Changes to `.tsx`, `.ts`, `.css`, and `.json` files are reflected immediately.

### When HMR does not work

| Scenario | Action |
|----------|--------|
| Changed `vite.config.ts` | Restart the dev server |
| Changed `tsconfig.*.json` | Restart the dev server |
| Changed Supabase types | Run type generation, then restart |
| Changed `.env.local` | Restart the dev server |
| Added a new library | Run `pnpm nx reset` then restart |

### Debugging HMR issues

```bash
# Clear Vite cache
rm -rf node_modules/.vite

# Clear Nx cache
pnpm nx reset

# Full clean restart
rm -rf node_modules/.vite && pnpm nx run web:serve
```

---

## Recommended IDE setup

### VS Code

Install these extensions:

| Extension | Purpose |
|-----------|---------|
| **Nx Console** | Project graph, task runner, generator UI |
| **ESLint** | Inline linting |
| **Prettier** | Code formatting |
| **Tailwind CSS IntelliSense** | Class autocomplete |
| **TypeScript Nightly** | Latest TS features |
| **Error Lens** | Inline error display |

Recommended `settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "non-relative",
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

### WebStorm

1. Enable ESLint: **Settings → Languages → JavaScript → Code Quality → ESLint → Automatic**
2. Enable Prettier: **Settings → Languages → JavaScript → Prettier → On save**
3. Configure TypeScript: Point to the workspace `tsconfig.base.json`

---

## TypeScript workflow

### Path aliases

The monorepo uses TypeScript path aliases defined in `tsconfig.base.json`:

```typescript
// Instead of relative imports:
import { LensCard } from '../../../libs/ui/src/lib/LensCard'

// Use path aliases:
import { LensCard } from '@lenserfight/ui'
```

### Type checking

```bash
# Check a specific project
pnpm nx run web:typecheck

# Check all projects
pnpm nx run-many -t typecheck
```

### Generating types from Supabase

After changing database schema:

```bash
pnpm supabase gen types typescript --local > libs/types/src/lib/database.types.ts
```

---

## Linting and formatting

### ESLint

```bash
# Lint a specific project
pnpm nx run web:lint

# Lint all projects
pnpm nx run-many -t lint

# Auto-fix
pnpm nx run web:lint --fix
```

### Prettier

```bash
# Format all files
pnpm prettier --write .

# Check formatting
pnpm prettier --check .
```

Configuration files:
- `.prettierrc` — Prettier rules
- `eslint.config.js` — ESLint rules (flat config)
- `.prettierignore` — Files to skip

---

## Testing

```bash
# Run tests for a project
pnpm nx run web:test

# Run tests in watch mode
pnpm nx run web:test --watch

# Run all tests
pnpm nx run-many -t test

# Run affected tests only
pnpm nx affected -t test
```

### Test file conventions

| Pattern | Location |
|---------|----------|
| Unit tests | `*.spec.ts` / `*.spec.tsx` next to source |
| Integration tests | `*.integration.spec.ts` |
| E2E tests | `apps/web-e2e/` |

---

## Debugging

### Browser DevTools

1. Open `http://localhost:3000`
2. Open DevTools (F12)
3. Use the **React DevTools** extension for component inspection
4. Use the **Network** tab for API call debugging

### VS Code debugger

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Web App",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}",
      "sourceMaps": true
    }
  ]
}
```

### Node.js debugging (worker)

```bash
node --inspect-brk dist/apps/worker/main.js
```

Then attach VS Code debugger to port 9229.

---

## Nx project graph

Visualize dependencies between projects:

```bash
pnpm nx graph
```

This opens an interactive graph in your browser showing how apps and libs depend on each other.

---

## Common patterns

### Creating a new feature

1. Identify the correct `libs/features/` slice (or create a new one)
2. Add components in `src/lib/components/`
3. Add domain logic in `libs/domain/` if it is reusable
4. Add data access in `libs/data/` if it touches Supabase
5. Export public API from the library's `index.ts`

### Adding a new page to the web app

1. Create the page component in the relevant feature library
2. Add the route in `apps/web/src/app/router/`
3. Add navigation link if needed

### Adding a new database table

1. Create a migration: `pnpm supabase migration new <name>`
2. Write SQL in `supabase/migrations/<timestamp>_<name>.sql`
3. Apply: `pnpm supabase:db:reset`
4. Regenerate types: `pnpm supabase gen types typescript --local`
5. Add repository in `libs/data/`

---

## Next steps

- [Running AI Agents Locally](/en/tutorials/local/running-agents) — connect local and cloud models
- [Workflow Builder](/en/tutorials/local/workflow-builder) — canvas development and custom nodes
- [Local Database](/en/tutorials/local/database) — PostgreSQL, migrations, RLS
