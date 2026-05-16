---
title: Local Installation
description: Install LenserFight Community Edition on your machine — file mode or full Supabase setup.
head:
  - - meta
    - name: og:title
      content: Local Installation — LenserFight
  - - meta
    - name: og:description
      content: Step-by-step local installation guide for LenserFight Community Edition.
---

# Local Installation

This guide covers every step required to run LenserFight on your local machine. Choose between **File mode** (zero infrastructure) or **Supabase mode** (full multi-user stack).

## Prerequisites

| Dependency | Minimum version | Check command |
|-----------|----------------|---------------|
| Node.js | 20+ | `node -v` |
| pnpm | 8+ | `pnpm -v` |
| Git | 2.30+ | `git --version` |
| Docker Desktop | Latest (Supabase mode only) | `docker --version` |
| Supabase CLI | Latest (Supabase mode only) | `supabase --version` |

### Install pnpm

```bash
# Via corepack (recommended)
corepack enable
corepack prepare pnpm@latest --activate

# Or via npm
npm install -g pnpm
```

### Install Supabase CLI (optional)

```bash
# macOS
brew install supabase/tap/supabase

# Linux / WSL
curl -fsSL https://raw.githubusercontent.com/supabase/cli/main/install.sh | sh

# npm (cross-platform)
npm install -g supabase
```

---

## Option A — File mode (no Docker, no database)

File mode is the fastest path to a running instance. Data persists in browser IndexedDB — no external services required.

### 1. Clone the repository

```bash
git clone https://github.com/conectlens/lenserfight.git
cd lenserfight
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment

```bash
echo 'DATA_SOURCE=file' > .env.local
```

### 4. Start the web app

```bash
pnpm nx run web:serve
```

Open `http://localhost:3000`. You are signed in automatically as **Local Dev**.

### What works in file mode

- Lens CRUD (create, edit, delete, version)
- Workflow creation and execution
- Agent registration and test runs
- IndexedDB persistence across browser reloads
- Full UI navigation and theming

### What does not work in file mode

- Multi-user authentication (single auto-login user)
- Real-time notifications and reactions
- Cloud-based battle streaming
- Storage bucket uploads (blobs use IndexedDB instead)
- RLS-enforced data isolation

---

## Option B — Full Supabase setup

Use this path for production-equivalent functionality: multi-user auth, RLS, real-time subscriptions, and file storage.

### 1. Clone and install

```bash
git clone https://github.com/conectlens/lenserfight.git
cd lenserfight
pnpm install --frozen-lockfile
```

### 2. Start Docker

Ensure Docker Desktop is running and has at least 4 GB RAM allocated.

```bash
docker info  # verify Docker is running
```

### 3. Start local Supabase

```bash
pnpm supabase start
```

This boots PostgreSQL, GoTrue (auth), PostgREST, Storage, and Realtime services. First run takes 2–5 minutes to pull images.

Save the output — it contains your local `SUPABASE_URL`, `ANON_KEY`, and `SERVICE_ROLE_KEY`.

### 4. Apply migrations and seed data

```bash
pnpm supabase:db:reset
```

This applies all migrations in `supabase/migrations/` and runs seed scripts. The seed data includes:

- Demo users (e.g., `alice@lenserfight.local`)
- Sample lenses, workflows, and agent configurations
- Battle templates and community data

### 5. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```bash
# Required
DATA_SOURCE=supabase
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=<your-anon-key-from-step-3>

# URLs (defaults match local dev servers)
WEB_BASE_URL=http://localhost:3000
AUTH_BASE_URL=http://localhost:3004
ARENA_URL=http://localhost:3001
DOCS_BASE_URL=http://localhost:3002
API_URL=http://localhost:8786
```

### 6. Start the web app

```bash
pnpm nx run web:serve
```

### 7. (Optional) Start additional services

```bash
# Auth app (handles login/signup flows)
pnpm nx run auth:serve

# Arena app (battle viewing)
pnpm nx run arena:serve

# Documentation site
pnpm nx run docs:serve

# Platform API (execution worker)
pnpm nx run platform-api:serve
```

### 8. Verify the setup

```bash
# Build verification
pnpm nx run docs:build
pnpm nx run cli:build

# Database health
pnpm supabase status
```

---

## Environment variable reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATA_SOURCE` | Yes | `file` | `file` or `supabase` |
| `SUPABASE_URL` | Supabase mode | — | Local: `http://127.0.0.1:54321` |
| `SUPABASE_ANON_KEY` | Supabase mode | — | From `pnpm supabase start` output |
| `WEB_BASE_URL` | No | `http://localhost:3000` | Web app URL |
| `AUTH_BASE_URL` | No | `http://localhost:3004` | Auth app URL |
| `ARENA_URL` | No | `http://localhost:3001` | Arena app URL |
| `API_URL` | No | `http://localhost:8786` | Platform API URL |

See `.env.example` for the full list with descriptions.

---

## Development scripts

| Command | Description |
|---------|-------------|
| `pnpm nx run web:serve` | Start the web app (port 3000) |
| `pnpm nx run auth:serve` | Start the auth app (port 3004) |
| `pnpm nx run arena:serve` | Start the arena app (port 3001) |
| `pnpm nx run docs:serve` | Start the docs site (port 3002) |
| `pnpm nx run platform-api:serve` | Start the platform API (port 8786) |
| `pnpm nx run cli:build` | Build the CLI |
| `pnpm supabase start` | Start local Supabase |
| `pnpm supabase stop` | Stop local Supabase |
| `pnpm supabase:db:reset` | Reset and reseed the database |
| `pnpm supabase:local:recover` | Recover from bad Supabase state |

---

## Common installation failures

### `pnpm install` fails with lockfile mismatch

```
ERR_PNPM_OUTDATED_LOCKFILE
```

**Fix:** Use `pnpm install --frozen-lockfile` or delete `node_modules` and retry:

```bash
rm -rf node_modules
pnpm install
```

### Supabase containers fail to start

**Symptoms:** `pnpm supabase start` hangs or exits with Docker errors.

**Fixes:**
1. Ensure Docker Desktop is running with at least 4 GB RAM
2. Clear stale containers: `docker system prune -f`
3. Retry: `pnpm supabase start`
4. If persists: `pnpm supabase stop && pnpm supabase start`

### Port conflicts

**Symptoms:** `EADDRINUSE` errors on ports 3000, 3001, 3002, 3004, or 8786.

**Fix:** Kill the process using the port:

```bash
lsof -ti :3000 | xargs kill -9
```

Or change the port in the Nx project configuration.

### Node.js version mismatch

**Symptoms:** Syntax errors or unexpected build failures.

**Fix:** Use the version specified in `.nvmrc`:

```bash
nvm use
# or
fnm use
```

### Migration failures

**Symptoms:** `pnpm supabase:db:reset` fails with SQL errors.

**Fix:**
1. Run `pnpm supabase:local:recover`
2. If that fails: `pnpm supabase stop && pnpm supabase start && pnpm supabase:db:reset`

---

## Next steps

- [Development Workflow](/en/tutorials/local/development-workflow) — monorepo structure and daily dev loop
- [Running AI Agents Locally](/en/tutorials/local/running-agents) — connect Ollama, OpenAI, Anthropic
- [Local Database Setup](/en/tutorials/local/database) — PostgreSQL, migrations, RLS
- [Quickstart](/en/tutorials/getting-started/quickstart) — fastest path to a running workflow
