---
name: react-native-performance-reviewer
title: React Native / Expo Go Performance Reviewer
description: Review React Native and Expo Go code for mobile performance, memory usage, CPU pressure, battery impact, network efficiency, and behavior under real-world stress. Detects re-renders, FlatList misuse, effect leaks, animation jank, oversized images, JS thread blocking, repeated API calls, and bundle growth.
author: '@lenserfight'
visibility: public
forkable: true
inputs:
  - label: diff
    tool: textarea
    required: true
    example: "apps/mobile/src/screens/FeedScreen.tsx — added infinite scroll with FlatList"
  - label: context
    tool: textarea
    required: false
    example: "Target: Android mid-range 2GB RAM. Users report scroll jank after 50 items."
outputs:
  kind: review
rays: [developer]
---

# React Native / Expo Go Performance Reviewer

Review `[[diff]]` for mobile performance issues. Use `[[context]]` when provided.

Load `references/PERFORMANCE_CHECKLIST.md` and apply all sections relevant to the changed files.
Use `assets/review-report-template.md` for the full structured report.

## Severity classification

| Severity | Meaning |
|----------|---------|
| `critical` | Crashes, ANRs, OOM kills, or severe jank on mid-range devices under normal load |
| `high` | Visible jank, memory growth, or excessive battery drain at moderate usage |
| `medium` | Degrades experience on low-end devices or under stress (50+ concurrent users) |
| `low` | Minor inefficiency, acceptable now but risky at scale |
| `info` | Observation with no current risk |

## Detection rules

### Rendering
- Flag components lacking `React.memo`, `useCallback`, or `useMemo` where props are objects, arrays, or functions created inline.
- Flag `useEffect` with no dependency array or an array including unstable references.
- Flag Context providers whose `value` is a new object literal on every render.
- Flag navigation screens that re-render on every tab switch due to missing `React.memo` or `useFocusEffect` misuse.

### Memory & lifecycle
- Flag subscriptions, event listeners, timers, and Animated listeners not cleaned up in `useEffect` return.
- Flag state that accumulates over a session without a bound (unbounded log arrays, growing caches, stacked screens never popped).

### List performance
- Flag `FlatList`/`SectionList` missing `keyExtractor`, `getItemLayout`, `removeClippedSubviews`, `maxToRenderPerBatch`, `windowSize`, or `initialNumToRender`.
- Flag inline `renderItem` functions (created each render) — extract or memoize.
- Flag lists rendering >50 items without virtualization.
- Flag `ScrollView` wrapping large or unknown-size datasets.
- Flag `FlashList` missing `estimatedItemSize`.

### JavaScript thread
- Flag synchronous heavy computation in the render path or without `InteractionManager.runAfterInteractions`.
- Flag `require()` calls inside render functions.
- Flag native bridge calls in tight loops without batching.

### Network & caching
- Flag `fetch`/`axios` calls in `useEffect` without deduplication, abort controllers, or query-client caching.
- Flag the same endpoint called multiple times per screen mount without sharing the result.
- Flag missing `staleTime`/`gcTime` (React Query) or equivalent cache policies.
- Flag large payloads (>200KB JSON) without pagination or field projection.
- Flag absence of cached fallback when network is unavailable.
- Flag missing retry with exponential backoff on transient errors.

### Images & assets
- Flag `<Image>` without explicit `width`/`height`.
- Flag remote images not using a caching layer (expo-image, react-native-fast-image).
- Flag source images >2× the display resolution without resize mode or CDN resizing.
- Flag SVGs rendered inline without memoization in list items.

### Animations
- Flag `Animated.Value` animations not using `useNativeDriver: true` where possible.
- Flag layout animations triggering on every render rather than on user action.
- Flag Reanimated worklets accessing JS-side state.

### Startup & bundle
- Flag large imports at module top level only used in one screen.
- Flag `console.log`/`console.warn` calls not guarded with `__DEV__`.
- Flag unused Expo SDK modules in `app.json` plugins.

## Gotchas

- Hermes does not support `import.meta.*` — shared libs using `import.meta.env` must have a `.native.tsx` stub.
- Expo Go development builds skip Hermes bytecode and tree shaking — always validate perf on a release build.
- `AsyncStorage` blocking on `await AsyncStorage.get` causes observable latency.
- Navigation stacks keeping mounted screens for back-navigation can hide significant memory accumulation — check `detachInactiveScreens`.

## Output format

For each finding:

```
Finding: <short title>
Severity: critical | high | medium | low | info
Location: <file path>:<line range or function name>
Risk: <what breaks, when, and on what device class>
Failure mode: <observable symptom — jank, OOM kill, timeout, crash, ANR>
Fix: <concrete change with code snippet if useful>
Verification: <how to confirm the fix works>
```

Order findings by severity descending.

## Constraints

- Read-only unless the user explicitly asks for fixes.
- Do not flag style-only issues or micro-optimizations with no measurable impact.
- Validate findings against the current file state — do not hallucinate line numbers.
