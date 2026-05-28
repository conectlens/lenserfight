---
title: Build Failures
description: Diagnose and fix build failures, hydration errors, and edge runtime issues in LenserFight.
head:
  - - meta
    - name: og:title
      content: Build Failures — LenserFight Troubleshooting
  - - meta
    - name: og:description
      content: Fix build failures, hydration errors, and edge runtime issues.
---

# Build Failures

Diagnosis and resolution guide for build-time and runtime errors in LenserFight.

---

## TypeScript compilation errors

### Symptoms

- `TS2xxx` errors during `nx build` or `nx typecheck`
- IDE shows red squiggly lines
- Build exits with non-zero code

### Root cause

Type mismatches, missing imports, or stale type definitions after schema changes.

### Diagnosis

```bash
# Check a specific project
pnpm nx run web:typecheck

# Check all projects
pnpm nx run-many -t typecheck
```

### Fixes

1. **Regenerate Supabase types** after schema changes:
   ```bash
   pnpm supabase gen types typescript --local > libs/types/src/lib/database.types.ts
   ```

2. **Clear TypeScript cache:**
   ```bash
   rm -rf tmp/
   pnpm nx reset
   ```

3. **Update path aliases** if libraries were added or renamed — check `tsconfig.base.json`

### Prevention

- Run `typecheck` in CI before merging
- Auto-generate types in CI after migration changes

---

## Vite build failures

### Symptoms

- `vite build` exits with errors
- `[vite]: Rollup failed to resolve import`
- Chunks too large warnings

### Root cause

Missing dependencies, circular imports, or misconfigured externals.

### Diagnosis

```bash
# Verbose build
pnpm nx run web:build --verbose

# Check dependency graph
pnpm nx graph
```

### Fixes

| Error | Fix |
|-------|-----|
| `Cannot resolve module` | Install missing dependency or fix import path |
| `Circular dependency` | Restructure imports; use lazy loading |
| `Chunk size warning` | Configure `manualChunks` in `vite.config.ts` |
| `Top-level await` | Ensure target supports it; wrap in async function |

### Prevention

- Enforce dependency boundaries with Nx module boundaries
- Run `nx affected -t build` on every PR

---

## Hydration errors

### Symptoms

- Console warning: `Hydration failed because the initial UI does not match`
- UI flashes or jumps on page load
- `Text content does not match server-rendered HTML`

### Root cause

Server-rendered HTML differs from client-rendered HTML, typically caused by:
- Date/time formatting differences
- Random value generation
- Browser-specific APIs used during SSR
- Conditional rendering based on `window` or `document`

### Diagnosis

1. Open browser DevTools → Console
2. Look for hydration mismatch warnings
3. Identify the component causing the mismatch

### Fixes

1. **Wrap browser-only code:**
   ```tsx
   const [mounted, setMounted] = useState(false);
   useEffect(() => setMounted(true), []);
   if (!mounted) return null;
   ```

2. **Avoid dynamic values in initial render:**
   ```tsx
   // Bad: different on server vs client
   const id = Math.random().toString(36);
   
   // Good: stable across renders
   const id = useId();
   ```

3. **Use `suppressHydrationWarning`** for intentionally dynamic content:
   ```tsx
   <time suppressHydrationWarning>{new Date().toLocaleString()}</time>
   ```

### Prevention

- Test with SSR enabled in development
- Avoid `window`/`document` access outside `useEffect`

---

## ESLint / Prettier failures

### Symptoms

- `nx lint` fails with style violations
- CI lint check fails
- Files not formatted correctly

### Fixes

```bash
# Auto-fix ESLint issues
pnpm nx run web:lint --fix

# Format all files
pnpm prettier --write .

# Check formatting without modifying
pnpm prettier --check .
```

### Prevention

- Enable format-on-save in your IDE
- Add pre-commit hooks with Husky + lint-staged

---

## Nx cache issues

### Symptoms

- Build produces stale output
- Tests pass locally but fail in CI
- `nx affected` shows no affected projects despite changes

### Fixes

```bash
# Clear Nx cache
pnpm nx reset

# Clear all caches
rm -rf node_modules/.vite tmp/ .nx/cache
pnpm nx reset
```

### Prevention

- Use `--skip-nx-cache` when debugging suspicious cache hits
- Clear cache after major branch merges

---

## Next steps

- [Auth Issues](/en/tutorials/troubleshooting/auth-issues) — authentication debugging
- [Database Issues](/en/tutorials/troubleshooting/database-issues) — connection and migration failures
- [Workflow Issues](/en/tutorials/troubleshooting/workflow-issues) — execution and canvas problems
