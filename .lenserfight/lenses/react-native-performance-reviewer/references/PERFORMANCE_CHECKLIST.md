# React Native / Expo Go Performance Diagnostic Checklist

## Files to inspect first

- `apps/mobile/src/screens/**` — screen components
- `apps/mobile/src/components/**` — shared components
- `apps/mobile/src/hooks/**` — custom hooks
- `apps/mobile/src/navigation/**` — navigator configs
- `apps/mobile/src/store/**` or `libs/**/store/**` — state managers
- `libs/**/components/src/**` — shared UI components used by mobile
- Any file changed in the current diff

## Rendering audit

- [ ] Does every component with object/array/function props use `React.memo`?
- [ ] Are all callbacks passed as props wrapped in `useCallback` with stable deps?
- [ ] Are all expensive derived values wrapped in `useMemo`?
- [ ] Are inline object/array values in JSX moved out of render?
- [ ] Do Context values avoid creating new object literals on every render?
- [ ] Are navigation screens memoized to prevent full remount on tab switch?

## Effect & lifecycle audit

- [ ] Does every `useEffect` that sets up a subscription, listener, or timer have a cleanup return?
- [ ] Are there effects with missing or stale dependencies that cause infinite loops?
- [ ] Are data-loading effects using abort controllers or cancellation tokens?
- [ ] Are there any unmounted-component `setState` calls (async effects outliving the component)?

## List & scroll audit

- [ ] Does every FlatList/SectionList have `keyExtractor`?
- [ ] Is `getItemLayout` provided when item height is fixed?
- [ ] Are `removeClippedSubviews`, `maxToRenderPerBatch`, `windowSize`, `initialNumToRender` tuned?
- [ ] Is `renderItem` stable (not re-created each render)?
- [ ] Are lists with >50 items using VirtualizedList, FlashList, or FlatList (not ScrollView)?
- [ ] Does FlashList have `estimatedItemSize` set?

## JavaScript thread audit

- [ ] Is there heavy synchronous computation (sort, filter, JSON.parse) in the render path?
- [ ] Are expensive operations deferred with `InteractionManager.runAfterInteractions`?
- [ ] Are native bridge calls inside tight loops batched?
- [ ] Is `require()` called inside render functions?

## Network & caching audit

- [ ] Are all fetch calls using abort controllers for cleanup?
- [ ] Is data deduplicated across concurrent calls to the same endpoint?
- [ ] Are `staleTime` and `gcTime` set on React Query / SWR queries?
- [ ] Are API responses >100KB paginated or field-projected?
- [ ] Is there a cached fallback when the network is unavailable?
- [ ] Is retry implemented with exponential backoff?

## Image & asset audit

- [ ] Do all `<Image>` components have explicit `width` and `height`?
- [ ] Are remote images served through a caching library (expo-image, react-native-fast-image)?
- [ ] Are source images at ≤2× the display resolution?
- [ ] Are SVGs in list items memoized?

## Animation audit

- [ ] Do all Animated API animations use `useNativeDriver: true` where possible?
- [ ] Are Reanimated worklets free of JS-thread state access?
- [ ] Do layout animations trigger only on user actions, not on every render?

## Startup & bundle audit

- [ ] Are large screen-specific modules lazily imported?
- [ ] Are all `console.log` calls guarded with `__DEV__` or a production-safe logger?
- [ ] Are unused Expo plugins removed from `app.json`?

## Memory audit

- [ ] Is there any state array or object that grows unboundedly per session?
- [ ] Are navigation stacks configured with `detachInactiveScreens` where appropriate?
- [ ] Are large data structures (image buffers, audio samples, video frames) released after use?

## Background & notification audit

- [ ] Are background fetch tasks bounded with request timeouts?
- [ ] Are push notification handlers debounced to avoid state storms?
- [ ] Are location or sensor subscriptions stopped when the screen is inactive?

## Permission audit

- [ ] Are permissions requested at the point of need rather than at app startup?

## Low-end device baseline

Target findings against these device constraints:
- **RAM:** 2GB
- **CPU:** 4-core 1.8GHz
- **Network:** Slow 3G (50ms RTT, 1Mbps)
- **Storage:** 32GB flash (slow I/O)
- **OS min:** Android 10 / iOS 14

If a finding does not affect this device class, downgrade severity accordingly.
