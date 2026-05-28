---
title: CI/CD Setup
description: Set up continuous integration and deployment for LenserFight — GitHub Actions, environment management, and deployment automation.
head:
  - - meta
    - name: og:title
      content: CI/CD Setup — LenserFight
  - - meta
    - name: og:description
      content: Configure CI/CD pipelines for LenserFight with GitHub Actions.
---

# CI/CD Setup

Set up automated testing, building, and deployment for LenserFight using GitHub Actions.

## Prerequisites

- Repository hosted on GitHub
- Target deployment environment configured
- Required secrets available

---

## GitHub Actions workflow

### Lint and test on PR

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main, develop]

jobs:
  lint-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v4
        with:
          version: latest

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Lint affected
        run: pnpm nx affected -t lint --base=origin/main

      - name: Test affected
        run: pnpm nx affected -t test --base=origin/main

      - name: Build affected
        run: pnpm nx affected -t build --base=origin/main
```

### Deploy on merge

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: latest

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Build web app
        run: pnpm nx run web:build
        env:
          DATA_SOURCE: supabase
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}

      - name: Deploy to production
        run: |
          # Your deployment command here
          # Examples:
          # rsync -avz dist/apps/web/ user@server:/opt/lenserfight/web/
          # npx vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
          # docker build && docker push
```

---

## Production environment variables

Required secrets in GitHub (**Settings → Secrets → Actions**):

| Secret | Description |
|--------|-------------|
| `SUPABASE_URL` | Production Supabase URL |
| `SUPABASE_ANON_KEY` | Production anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side key (for migrations) |
| `VERCEL_TOKEN` | Vercel deployment token (if using Vercel) |
| `DEPLOY_SSH_KEY` | SSH key for VPS deployment |

---

## Migration safety

### Running migrations in CI

```yaml
- name: Apply migrations
  run: |
    pnpm supabase db push --db-url "${{ secrets.SUPABASE_DB_URL }}"
  env:
    SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

> **Warning:** Always review migration SQL before auto-applying. Use a staging environment first.

---

## Nx caching

Speed up CI with Nx remote caching:

```yaml
- name: Build with cache
  run: pnpm nx affected -t build --base=origin/main
  env:
    NX_CLOUD_ACCESS_TOKEN: ${{ secrets.NX_CLOUD_TOKEN }}
```

---

## Best practices

1. **Run affected commands** — only test/build what changed
2. **Use frozen lockfile** — `pnpm install --frozen-lockfile`
3. **Stage migrations** — test on staging before production
4. **Cache dependencies** — use `actions/cache` or pnpm cache
5. **Fail fast** — lint and type-check before expensive builds
6. **Protect main branch** — require CI to pass before merge

---

## Next steps

- [Docker Deployment](/en/tutorials/deployment/docker)
- [VPS Deployment](/en/tutorials/deployment/vps)
- [Vercel Deployment](/en/tutorials/deployment/vercel)
