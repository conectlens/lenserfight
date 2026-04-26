import posthog from 'posthog-js'
import React, { useEffect } from 'react'

const POSTHOG_KEY = import.meta.env['VITE_POSTHOG_KEY'] as string | undefined
const POSTHOG_HOST = (import.meta.env['VITE_POSTHOG_HOST'] as string | undefined) ?? 'https://us.i.posthog.com'

/**
 * Initialises PostHog once on mount when VITE_POSTHOG_KEY is set.
 * No-op for community self-hosters that omit the key.
 * Mount this once near the root, inside BrowserRouter so page-view
 * autocapture has access to the current pathname.
 */
export const PostHogProvider: React.FC = () => {
  useEffect(() => {
    if (!POSTHOG_KEY) return
    if (posthog.__loaded) return
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: true,
      capture_pageleave: true,
      persistence: 'localStorage+cookie',
    })
  }, [])

  return null
}
