# web-e2e

End-to-end Playwright tests for `apps/web`. Phase 9 scope is intentionally narrow — only the **arena/battles gate** spec — so that adding Playwright doesn't inflate the sprint. Wider e2e coverage is deferred to Phase 11+.

## One-time setup

```bash
pnpm add -D -w @nx/playwright @playwright/test
pnpm exec playwright install --with-deps chromium
```

`@nx/devkit` is a transitive of any `@nx/*` plugin — `playwright.config.ts` imports `workspaceRoot` from it.

## Run locally

```bash
pnpm nx run web-e2e:e2e
```

To skip the auto-started dev server (useful when one is already running on `:4200`):

```bash
E2E_NO_SERVER=1 pnpm nx run web-e2e:e2e
```

## CI

`.github/workflows/release.yml` runs `pnpm nx run web-e2e:e2e` as a PR check. The `cli-smoke` workflow handles CLI-only validation; this project is the web equivalent.
