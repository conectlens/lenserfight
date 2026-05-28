---
name: react-vite-performance-reviewer
description: >
  Review React and Vite web app code changes for browser performance, memory usage, CPU pressure,
  bundle size, network cost, rendering speed, hydration cost, and behavior under high traffic, slow
  devices, weak networks, and large datasets. Use when reviewing apps/web, libs/* used by the web
  app, or any React component, hook, route, Vite config, code split boundary, dynamic import, asset,
  state manager, API call, form, table, chart, animation, or third-party library. Activate when the
  user says "review", "check perf", "slow page", "heavy bundle", or whenever React/Vite browser code
  is in scope. Detects: unnecessary re-renders, unstable props/callbacks, context churn, missing
  memoization, memory leaks, large bundle growth, unused dependencies, inefficient asset loading,
  render-blocking resources, over-fetching, repeated network requests, poor cache strategy, large
  JSON payloads, expensive sync computations, layout thrashing, slow startup paths, and weak
  error/retry behavior.
compatibility: Designed for Claude Code, Gemini CLI, Cursor, and compatible agents operating on React/Vite web codebases.
metadata:
  author: lenserfight
  version: "1.0"
---

# React / Vite Performance Reviewer

## When to activate

Any code touch on:
- `apps/web/**` — components, routes, hooks, layouts
- `libs/*` libraries bundled by Vite
- `vite.config.ts` or `vite.config.js` — build configuration
- Code split boundaries, dynamic imports, lazy routes
- State management (Zustand, Redux Toolkit, Jotai, Context API)
- Network layers (React Query, SWR, Apollo, tRPC, fetch wrappers)
- Forms (React Hook Form, Formik), tables (TanStack Table), charts
- Animations (Framer Motion, CSS transitions, Web Animations API)
- Third-party library additions or upgrades
- Asset handling (images, fonts, SVGs, CSS)

## Review workflow

1. Load `references/PERFORMANCE_CHECKLIST.md` and apply all sections relevant to the changed files.
2. Inspect the diff for the detection rules below.
3. Produce a severity-ordered finding list using the output format below.
4. Use `assets/review-report-template.md` for the full structured report.

## Severity classification

| Severity | Meaning |
|----------|---------|
| `critical` | Causes browser OOM crash, hang, or complete render failure under normal traffic |
| `high` | Visible jank or +1s LCP/TTI regression under moderate load (10+ concurrent tabs, slow 4G) |
| `medium` | Degrades experience on low-end devices or under high traffic (50+ concurrent users) |
| `low` | Minor inefficiency, acceptable now but risky at scale |
| `info` | Observation with no current risk |

## Core detection rules

### Rendering
- Flag components that re-render on every parent render when their props haven't changed — check for `React.memo` absence.
- Flag inline function/object/array props in JSX that produce a new reference each render (`onClick={() => …}`, `style={{ margin: 8 }}`).
- Flag `useEffect` with unstable dependencies (objects/arrays/functions created inside the component without memoization).
- Flag Context providers whose `value` is a new object on every render — use `useMemo` for the value or split the context.
- Flag deeply nested context consumers subscribing to a large context object when only one field is needed (use selector pattern or split context).
- Flag `key` changes on list items that are not actually replaced — causes unnecessary unmount/remount.

### Memory leaks
- Flag event listeners, timers (`setInterval`/`setTimeout`), and subscriptions registered in `useEffect` without cleanup.
- Flag ResizeObserver, IntersectionObserver, and MutationObserver instances not disconnected on unmount.
- Flag large data structures (chart datasets, blob URLs, canvas references) not released on component unmount.
- Flag `useRef` holding DOM references or closures that capture growing data.

### State management
- Flag Redux/Zustand/Jotai selectors returning new object/array references on every store update (causes re-render when data is unchanged).
- Flag excessive global state for transient UI concerns (hover, focus, scroll position) that should be local.
- Flag derived state recalculated on every render that should live in `useMemo` or a selector.

### Bundle & build
- Flag third-party imports that pull in the full package rather than tree-shaken named exports (`import _ from 'lodash'` vs `import { debounce } from 'lodash-es'`).
- Flag large libraries with smaller alternatives for the actual usage (moment.js → date-fns, lodash → native methods).
- Flag components loading synchronously at the route level but only conditionally visible — use `React.lazy` + `Suspense`.
- Flag Vite config without `build.rollupOptions.output.manualChunks` for large vendor dependency groups.
- Flag assets served without content hashes in file names (prevents long-lived caching).
- Flag `console.log` calls not removed in the production build.
- Flag third-party scripts loaded synchronously in `<head>` rather than deferred or async.

### Network & caching
- Flag `fetch`/`axios` calls in `useEffect` without `AbortController` cleanup.
- Flag the same API endpoint fetched in multiple sibling components without shared query-key deduplication.
- Flag missing `staleTime` on React Query queries that do not need fresh data on every mount.
- Flag responses >100KB without pagination, field selection, or compression.
- Flag missing HTTP cache headers on static or slow-changing API responses.
- Flag polling without backoff or visibility-aware pausing (`document.hidden`).
- Flag absence of retry logic with exponential backoff on transient network errors.

### Assets
- Flag `<img>` elements without `width`/`height` attributes (causes cumulative layout shift).
- Flag images not using modern formats (WebP, AVIF) or missing `srcset` for responsive delivery.
- Flag render-blocking fonts without `font-display: swap` or preload hints.
- Flag non-critical CSS imported in JS that could be asynchronously loaded.
- Flag SVGs inlined in list/table items (prefer `<img>` or sprite sheet).

### List & table rendering
- Flag tables rendering >100 rows without windowing (TanStack Virtual, react-window, react-virtualized).
- Flag infinite scroll implementations that accumulate DOM nodes rather than virtualizing.
- Flag `document.querySelector`/`getElementById` in React event handlers — use `useRef`.
- Flag layout reads (`offsetHeight`, `scrollTop`, `getBoundingClientRect`) interleaved with DOM writes in the same synchronous block (layout thrashing).

### Startup & LCP
- Flag heavy imports at the app root only needed on a specific route — lazy-import instead.
- Flag third-party analytics or chat scripts loaded synchronously in `<head>`.
- Flag missing `<link rel="preload">` for the LCP candidate image.

## Gotchas

- Vite dev mode does not tree-shake — always validate bundle impact on a production build (`pnpm nx run web:build --configuration=production`).
- React 18 Strict Mode double-invokes effects in development — do not rely on dev behavior to confirm cleanup correctness.
- `useCallback`/`useMemo` have a cost — flag only when re-render cost is measurable, not for every cheap computation.
- Context re-renders propagate synchronously — a Provider high in the tree with a frequently updated value can silently re-render expensive subtrees.
- Vite pre-bundles CJS deps with esbuild in dev but uses Rollup for production — bundle shape can differ; always check production builds for size regressions.
- `VITE_*` env vars are inlined at build time — secrets must never be placed in `VITE_*` vars as they appear in the client bundle.

## Output format

For each finding:

```
Finding: <short title>
Severity: critical | high | medium | low | info
Location: <file path>:<line range or function name>
Risk: <what breaks, when, and under what traffic/device condition>
Failure mode: <observable symptom — jank, OOM, slow LCP, layout shift, network waterfall>
Fix: <concrete change with code snippet if useful>
Verification: <how to confirm — bundle analysis, profiler, Lighthouse>
```

## Constraints

- Read-only unless the user explicitly asks for fixes.
- Order findings by severity descending.
- Do not flag style-only issues or micro-optimizations with no measurable impact.
- Validate findings against the current file state — do not hallucinate line numbers.
