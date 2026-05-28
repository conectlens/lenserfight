---
name: react-native-performance-reviewer
description: >
  Review React Native and Expo Go code changes for mobile performance, memory usage, CPU pressure,
  battery impact, network efficiency, and behavior under stressful real-world conditions. Use when
  reviewing apps/mobile, libs/* shared with Expo, or any React Native component, hook, navigation
  flow, screen, Expo module, API call, image handler, FlatList, animation, background task, push
  notification, permission flow, state manager, or native bridge usage. Activate even when the user
  only says "review this component", "check this hook", or "what's wrong" — whenever React Native or
  Expo code is in scope. Detects: unnecessary re-renders, unstable callbacks, excessive state
  updates, FlatList/ScrollView misuse, missing memoization, effect/subscription/timer leaks,
  oversized images, JS thread blocking, sync computation in render, animation jank, repeated API
  calls, poor caching, over-fetching, large payloads, slow startup paths, bundle growth, excessive
  logging, and weak offline/retry behavior.
compatibility: Designed for Claude Code, Gemini CLI, Cursor, and compatible agents operating on React Native / Expo Go codebases.
metadata:
  author: lenserfight
  version: "1.0"
---

# React Native / Expo Go Performance Reviewer

## When to activate

Any code touch on:
- `apps/mobile/**` — components, screens, hooks, navigation
- `libs/*` libraries bundled by Metro (Expo/Hermes)
- Expo modules, SDK APIs, or native bridge call sites
- AsyncStorage, SecureStore, MMKV, or SQLite usage
- Push notification handlers or background fetch tasks
- State management (Zustand, Redux, Jotai, Context)
- Network layers, query clients (React Query, SWR, Apollo)
- FlatList, SectionList, FlashList, ScrollView, VirtualizedList
- Image components, video players, camera flows
- Reanimated, Animated API, or gesture handlers

## Review workflow

1. Load `references/PERFORMANCE_CHECKLIST.md` and apply all sections relevant to the changed files.
2. Inspect the diff for the detection rules below.
3. Produce a severity-ordered finding list using the output format below.
4. Use `assets/review-report-template.md` for the full structured report.

## Severity classification

| Severity | Meaning |
|----------|---------|
| `critical` | Causes crashes, ANRs, OOM kills, or severe jank on mid-range devices under normal load |
| `high` | Visible jank, memory growth, or excessive battery drain on mid-range devices at moderate usage |
| `medium` | Degrades experience on low-end devices or under stress (50+ concurrent users) |
| `low` | Minor inefficiency, acceptable now but risky at scale |
| `info` | Observation with no current risk |

## Core detection rules

### Rendering
- Flag components lacking `React.memo`, `useCallback`, or `useMemo` where props are objects, arrays, or functions created inline.
- Flag `useEffect` with no dependency array or an array including unstable references (new object/array each render).
- Flag Context providers whose `value` is a new object literal on every render — re-renders all consumers.
- Flag navigation screens that re-render on every tab switch due to missing `React.memo` or `useFocusEffect` misuse.

### Memory & lifecycle
- Flag subscriptions, event listeners, timers, and Animated listeners not cleaned up in `useEffect` return.
- Flag state that accumulates over a session without a bound (unbounded log arrays, growing caches, stacked screens never popped).
- Flag `useRef` storing a value that updates every render (effectively a re-render vector).

### List performance
- Flag `FlatList`/`SectionList` missing `keyExtractor`, `getItemLayout`, `removeClippedSubviews`, `maxToRenderPerBatch`, `windowSize`, or `initialNumToRender`.
- Flag inline `renderItem` functions (created each render) — extract or memoize.
- Flag lists rendering >50 items without virtualization.
- Flag `ScrollView` wrapping large or unknown-size datasets.
- Flag `FlashList` missing `estimatedItemSize` (causes layout jumps).

### JavaScript thread
- Flag synchronous heavy computation (sorting large arrays, parsing large JSON, regex on large strings) in the render path or without `InteractionManager.runAfterInteractions`.
- Flag `require()` calls inside render functions.
- Flag native bridge calls in tight loops without batching.

### Network & caching
- Flag `fetch`/`axios` calls inside `useEffect` without deduplication, abort controllers, or query-client caching.
- Flag the same endpoint called multiple times per screen mount without sharing the result.
- Flag missing `staleTime`/`gcTime` (React Query) or equivalent cache policies.
- Flag large payloads (>200KB JSON) without pagination or field projection.
- Flag absence of cached fallback when the network is unavailable.
- Flag missing retry with exponential backoff on transient errors.

### Images & assets
- Flag `<Image>` without explicit `width`/`height` (causes layout recalculation).
- Flag remote images not using a caching layer (expo-image, react-native-fast-image, or equivalent).
- Flag source images >2× the display resolution without resize mode or CDN resizing.
- Flag SVGs rendered inline without memoization in list items.

### Animations
- Flag `Animated.Value` animations not using `useNativeDriver: true` where possible.
- Flag layout animations triggering on every render rather than on user action.
- Flag Reanimated worklets accessing JS-side state (breaks UI thread isolation).

### Startup & bundle
- Flag large imports at module top level only used in one screen (lazy-import instead).
- Flag `console.log`/`console.warn` calls not guarded with `__DEV__` or a production-safe logger.
- Flag unused Expo SDK modules in `app.json` plugins (inflates app binary).

### Background tasks & notifications
- Flag background fetch tasks doing uncapped network requests without timeouts.
- Flag push notification handlers updating global state on every notification without debouncing.

### Permissions
- Flag permissions requested at app startup rather than at the point of need (increases rejection rate and cold-start friction).

## Gotchas

- Hermes does not support `import.meta.*` — shared libs using `import.meta.env` must have a `.native.tsx` stub.
- `useCallback` with an empty dependency array still re-creates if the component unmounts/remounts — confirm protection via `React.memo` on the parent.
- Expo Go development builds skip Hermes bytecode and tree shaking — always validate perf claims on a release build.
- `AsyncStorage` is synchronous at the JS layer but asynchronous underneath — blocking render on `await AsyncStorage.get` causes observable latency.
- Navigation stacks that keep mounted screens for back-navigation can hide significant memory accumulation — check `detachInactiveScreens` on the Navigator.

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

## Constraints

- Read-only unless the user explicitly asks for fixes.
- Order findings by severity descending.
- Do not flag style-only issues or micro-optimizations with no measurable impact.
- Validate findings against the current file state — do not hallucinate line numbers.
