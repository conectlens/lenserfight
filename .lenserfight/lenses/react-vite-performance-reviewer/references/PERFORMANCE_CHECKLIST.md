# React / Vite Performance Diagnostic Checklist

## Files to inspect first

- `apps/web/src/routes/**` or `apps/web/src/pages/**` — route-level components
- `apps/web/src/components/**` — shared UI components
- `apps/web/src/hooks/**` — custom hooks
- `apps/web/src/store/**` or `libs/**/store/**` — state managers
- `libs/**/components/src/**` — shared UI library components
- `vite.config.ts` — build configuration
- Any file changed in the current diff

## Rendering audit

- [ ] Do all list-rendering components use `React.memo` when their props are stable?
- [ ] Are all callbacks passed as props wrapped in `useCallback`?
- [ ] Are all expensive computations wrapped in `useMemo`?
- [ ] Are inline objects, arrays, and functions in JSX moved out of render?
- [ ] Do Context values avoid creating new object literals on every render?
- [ ] Are `key` props stable and not triggering unnecessary unmount/remount?
- [ ] Are deeply nested context consumers using selector patterns to avoid over-subscription?

## Effect & lifecycle audit

- [ ] Does every `useEffect` that adds event listeners, timers, or subscriptions have a cleanup return?
- [ ] Are `AbortController` instances used for fetch calls inside effects?
- [ ] Are ResizeObserver, IntersectionObserver, MutationObserver disconnected on unmount?
- [ ] Are there effects with unstable dependencies causing re-runs on every render?

## State management audit

- [ ] Do Redux/Zustand/Jotai selectors return stable references (not new objects/arrays)?
- [ ] Is transient UI state (hover, focus, scroll) kept local rather than in global state?
- [ ] Is derived state computed in selectors or `useMemo`, not re-derived each render?

## Bundle & code splitting audit

- [ ] Are heavy components loaded with `React.lazy` + `Suspense` at route boundaries?
- [ ] Are large libraries imported from tree-shaken subpaths (not the full package root)?
- [ ] Does `vite.config.ts` define `manualChunks` for large vendor groups?
- [ ] Do output file names include content hashes for long-lived caching?
- [ ] Is the production build free of `console.log` calls?
- [ ] Are third-party scripts loaded asynchronously rather than blocking `<head>`?

## Network & caching audit

- [ ] Are all `fetch` calls inside `useEffect` using `AbortController`?
- [ ] Are shared queries deduplicated via React Query / SWR query keys?
- [ ] Are `staleTime` and `gcTime` set appropriately for each query's freshness need?
- [ ] Are API responses >100KB paginated or using field projection?
- [ ] Are static or slow-changing responses using HTTP caching headers?
- [ ] Is polling visibility-aware (paused when `document.hidden`)?
- [ ] Is retry implemented with exponential backoff and a max attempt cap?

## Asset audit

- [ ] Do all `<img>` elements have `width` and `height` to prevent CLS?
- [ ] Are images served in WebP/AVIF with appropriate `srcset`?
- [ ] Are fonts using `font-display: swap` and preload hints?
- [ ] Is non-critical CSS loaded asynchronously?
- [ ] Are SVGs in lists/tables loaded as `<img>` or sprites rather than inlined?

## List & table audit

- [ ] Are tables with >100 rows using row virtualization (TanStack Virtual, react-window)?
- [ ] Are infinite scroll lists virtualizing DOM nodes rather than accumulating them?
- [ ] Are `document.querySelector` / `getElementById` calls replaced with `useRef`?
- [ ] Are layout reads (`offsetHeight`, `getBoundingClientRect`) batched to avoid thrashing?

## Startup & LCP audit

- [ ] Are route-level heavy modules lazy-imported rather than eagerly loaded at the root?
- [ ] Are third-party analytics scripts deferred or async?
- [ ] Is the LCP candidate image preloaded in `<head>`?
- [ ] Is critical CSS inlined or prioritized?

## Low-end device / traffic baseline

Target findings against these constraints:
- **CPU:** 4-core 1.5GHz (Moto G Power class)
- **RAM:** 4GB
- **Network:** Slow 4G (100ms RTT, 4Mbps)
- **Browser:** Chrome on Android
- **Traffic:** 50+ simultaneous users

If a finding does not affect this target, downgrade severity accordingly.
