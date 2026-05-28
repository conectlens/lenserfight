---
name: react-vite-performance-reviewer
title: React / Vite Performance Reviewer
description: Review React and Vite web app code for browser performance, memory usage, bundle size, rendering speed, network cost, and behavior under high traffic, slow devices, and large datasets. Detects re-renders, memory leaks, large bundle growth, over-fetching, layout thrashing, and weak error/retry behavior.
author: '@lenserfight'
visibility: public
forkable: true
inputs:
  - label: diff
    tool: textarea
    required: true
    example: "apps/web/src/features/battles/BattleList.tsx — added infinite scroll with 500+ rows"
  - label: context
    tool: textarea
    required: false
    example: "Users report slow LCP on the battles page. Bundle size increased by 40KB in last PR."
outputs:
  kind: review
rays: [developer]
---

# React / Vite Performance Reviewer

Review `[[diff]]` for web performance issues. Use `[[context]]` when provided.

Load `references/PERFORMANCE_CHECKLIST.md` and apply all sections relevant to the changed files.
Use `assets/review-report-template.md` for the full structured report.

## Severity classification

| Severity | Meaning |
|----------|---------|
| `critical` | Browser OOM crash, hang, or complete render failure under normal traffic |
| `high` | Visible jank or +1s LCP/TTI regression under moderate load (slow 4G) |
| `medium` | Degrades experience on low-end devices or under high traffic (50+ concurrent users) |
| `low` | Minor inefficiency, acceptable now but risky at scale |
| `info` | Observation with no current risk |

## Detection rules

### Rendering
- Flag components re-rendering on every parent render when props haven't changed — check for `React.memo` absence.
- Flag inline function/object/array props in JSX producing a new reference each render.
- Flag `useEffect` with unstable dependencies.
- Flag Context providers whose `value` is a new object on every render.
- Flag deeply nested context consumers subscribing to a large context object when only one field is needed.
- Flag `key` changes on list items that are not actually replaced.

### Memory leaks
- Flag event listeners, timers, and subscriptions registered in `useEffect` without cleanup.
- Flag ResizeObserver, IntersectionObserver, and MutationObserver not disconnected on unmount.
- Flag large data structures (chart datasets, blob URLs, canvas references) not released on unmount.

### State management
- Flag selectors returning new object/array references on every store update.
- Flag excessive global state for transient UI concerns (hover, focus, scroll position).
- Flag derived state recalculated on every render that should live in `useMemo` or a selector.

### Bundle & build
- Flag imports pulling in the full package rather than tree-shaken named exports.
- Flag large libraries with smaller alternatives for the actual usage.
- Flag components loading synchronously at route level but only conditionally visible.
- Flag Vite config without `manualChunks` for large vendor dependency groups.
- Flag assets served without content hashes.
- Flag `console.log` calls not removed in production build.
- Flag third-party scripts loaded synchronously in `<head>` rather than deferred.

### Network & caching
- Flag `fetch`/`axios` calls in `useEffect` without `AbortController` cleanup.
- Flag the same endpoint fetched in multiple sibling components without shared query-key deduplication.
- Flag missing `staleTime` on React Query queries that don't need fresh data on every mount.
- Flag responses >100KB without pagination, field selection, or compression.
- Flag polling without backoff or visibility-aware pausing (`document.hidden`).
- Flag absence of retry logic with exponential backoff on transient errors.

### Assets
- Flag `<img>` without `width`/`height` attributes (causes CLS).
- Flag images not using modern formats (WebP, AVIF) or missing `srcset`.
- Flag render-blocking fonts without `font-display: swap` or preload hints.
- Flag SVGs inlined in list/table items.

### List & table rendering
- Flag tables rendering >100 rows without windowing (TanStack Virtual, react-window).
- Flag infinite scroll implementations that accumulate DOM nodes rather than virtualizing.
- Flag `document.querySelector` in React event handlers — use `useRef`.
- Flag layout reads (`offsetHeight`, `getBoundingClientRect`) interleaved with DOM writes (layout thrashing).

### Startup & LCP
- Flag heavy imports at app root only needed on a specific route.
- Flag third-party analytics scripts loaded synchronously in `<head>`.
- Flag missing `<link rel="preload">` for the LCP candidate image.

## Gotchas

- Vite dev mode does not tree-shake — always validate bundle impact on a production build.
- React 18 Strict Mode double-invokes effects in development — do not rely on dev behavior to confirm cleanup correctness.
- `useCallback`/`useMemo` have a cost — flag only when re-render cost is measurable.
- Context re-renders propagate synchronously — a Provider high in the tree with a frequently updated value can silently re-render expensive subtrees.
- `VITE_*` env vars are inlined at build time — secrets must never be placed in `VITE_*` vars.

## Output format

For each finding:

```
Finding: <short title>
Severity: critical | high | medium | low | info
Location: <file path>:<line range or function name>
Risk: <what breaks, when, under what traffic/device condition>
Failure mode: <observable symptom — jank, OOM, slow LCP, layout shift, network waterfall>
Fix: <concrete change with code snippet if useful>
Verification: <how to confirm — bundle analysis, profiler, Lighthouse>
```

Order findings by severity descending.

## Constraints

- Read-only unless the user explicitly asks for fixes.
- Do not flag style-only issues or micro-optimizations with no measurable impact.
- Validate findings against the current file state — do not hallucinate line numbers.
