import { usePostHog } from 'posthog-react-native'
import { useCallback, useEffect, useMemo, useState } from 'react'

import type { MainTab, MobileNavigator, MobileRoute } from './types'

function routeName(route: MobileRoute): string {
  if (route.name === 'main') return `main/${route.tab}`
  return route.name
}

/** Parse a lenserfight:// deep link URL into a MobileRoute, or return null if unrecognized. */
export function parseDeepLink(url: string): MobileRoute | null {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname  // e.g. "threads" in lenserfight://threads/abc
    const parts = parsed.pathname.replace(/^\//, '').split('/')
    if (host === 'threads' && parts[0]) return { name: 'threadDetail', id: parts[0] }
    if (host === 'lenses' && parts[0]) return { name: 'lensDetail', id: parts[0] }
    if (host === 'tags' && parts[0]) return { name: 'tagDetail', slug: parts[0] }
    if (host === 'battles' && parts[0]) return { name: 'battleDetail', id: parts[0] }
    if (host === 'auth' && parts[0] === 'magic') return { name: 'magicLink' }
  } catch {
    // Not a valid URL — ignore
  }
  return null
}

export function useMobileNavigation(initialRoute: MobileRoute = { name: 'login' }): MobileNavigator {
  const [stack, setStack] = useState<MobileRoute[]>([initialRoute])
  const route = stack[stack.length - 1] ?? initialRoute
  const posthog = usePostHog()

  useEffect(() => {
    posthog?.screen(routeName(route))
  }, [posthog, route])

  const replace = useCallback((next: MobileRoute) => setStack([next]), [])
  const push = useCallback((next: MobileRoute) => setStack((current) => [...current, next]), [])

  const goBack = useCallback(() => {
    setStack((current) =>
      current.length > 1 ? current.slice(0, -1) : [{ name: 'main', tab: 'threads' }]
    )
  }, [])

  return useMemo(
    () => ({
      route,
      goLogin: () => replace({ name: 'login' }),
      goMagicLink: () => push({ name: 'magicLink' }),
      goRegister: () => push({ name: 'register' }),
      goTab: (tab: MainTab) => replace({ name: 'main', tab }),
      goThread: (id: string, title?: string) => push({ name: 'threadDetail', id, title }),
      goLens: (id: string, title?: string) => push({ name: 'lensDetail', id, title }),
      goTag: (slug: string, title?: string) => push({ name: 'tagDetail', slug, title }),
      goBattle: (id: string, title?: string) => push({ name: 'battleDetail', id, title }),
      goBack,
    }),
    [goBack, push, replace, route]
  )
}
