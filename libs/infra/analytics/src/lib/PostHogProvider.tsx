import posthog from 'posthog-js'
import React, { useEffect } from 'react'

const PUBLIC_POSTHOG_PROJECT_TOKEN = import.meta.env['PUBLIC_POSTHOG_PROJECT_TOKEN'] as string | undefined
const PUBLIC_POSTHOG_HOST = (import.meta.env['PUBLIC_POSTHOG_HOST'] as string | undefined) ?? 'https://us.i.posthog.com'

/**
 * Initialises PostHog once on mount when PUBLIC_POSTHOG_PROJECT_TOKEN is set.
 * No-op for community self-hosters that omit the key.
 * Mount this once near the root, inside BrowserRouter so page-view
 * autocapture has access to the current pathname.
 */
export const PostHogProvider: React.FC = () => {
  useEffect(() => {
    if (!PUBLIC_POSTHOG_PROJECT_TOKEN) return
    if (posthog.__loaded) return
    posthog.init(PUBLIC_POSTHOG_PROJECT_TOKEN, {
      api_host: PUBLIC_POSTHOG_HOST,
      capture_pageview: true,
      capture_pageleave: true,
      persistence: 'localStorage+cookie',
    })
  }, [])

  return null
}
