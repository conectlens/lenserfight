import { useSyncExternalStore } from 'react'

import { detectRuntime, type RuntimeMode } from '../runtime/detectRuntime'

/**
 * SSR-safe runtime detection. Server snapshot is always 'cloud' so the
 * first render is deterministic; the client snapshot may be different,
 * and React swaps it in without a hydration mismatch (useSyncExternalStore
 * is allowed to return a different value on client vs. server).
 */

function subscribe(): () => void {
  // Runtime mode doesn't change once detected, but we expose subscribe
  // for symmetry with useSyncExternalStore. No-op unsubscribe.
  return () => {
    /* no-op */
  }
}

function getClientSnapshot(): RuntimeMode {
  return detectRuntime()
}

function getServerSnapshot(): RuntimeMode {
  return 'cloud'
}

export function useRuntimeMode(): RuntimeMode {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot)
}
